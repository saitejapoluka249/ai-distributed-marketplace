from flask import Flask, request, jsonify
import grpc
import ecommerce_pb2
import ecommerce_pb2_grpc
import json
import re
import os
from dotenv import load_dotenv
from zeep import Client as SoapClient 

load_dotenv()

app = Flask(__name__)

BUYER_SERVER_HOST = os.getenv("BUYER_SERVER_HOST", "0.0.0.0")
BUYER_SERVER_PORT = int(os.getenv("BUYER_SERVER_PORT", 7003))

CUSTOMER_DB_ADDR = f"{os.getenv('CUSTOMER_DB_HOST')}:{os.getenv('CUSTOMER_DB_PORT')}"
PRODUCT_DB_ADDR  = f"{os.getenv('PRODUCT_DB_HOST')}:{os.getenv('PRODUCT_DB_PORT')}"

channel_options = [
    ('grpc.max_concurrent_streams', 200),
    ('grpc.keepalive_time_ms', 10000),
    ('grpc.keepalive_timeout_ms', 5000),
]
cust_channel = grpc.insecure_channel(CUSTOMER_DB_ADDR,options=channel_options)
cust_stub = ecommerce_pb2_grpc.CustomerServiceStub(cust_channel)
prod_channel = grpc.insecure_channel(PRODUCT_DB_ADDR,options=channel_options)
prod_stub = ecommerce_pb2_grpc.ProductServiceStub(prod_channel)


def is_valid_qty(q):
    try: return int(q) > 0
    except: return False

def is_valid_string(s):
    return s and isinstance(s, str) and len(s.strip()) > 0

def is_strong_password(password):
    if len(password) < 8: return False, "Password must be at least 8 characters."
    if not any(c.isupper() for c in password): return False, "Password needs at least one uppercase letter."
    if not any(c.islower() for c in password): return False, "Password needs at least one lowercase letter."
    if not any(c.isdigit() for c in password): return False, "Password needs at least one number."
    return True, ""

@app.route('/create_account', methods=['POST'])
def create_account():
    data = request.json
    if not is_valid_string(data.get('username')) or not is_valid_string(data.get('password')):
        return jsonify({"status": "FAIL", "message": "Username/Password cannot be empty"})
    
    is_valid, msg = is_strong_password(data['password'])
    if not is_valid:
        return jsonify({"status": "FAIL", "message": msg})

    resp = cust_stub.Register(ecommerce_pb2.RegisterRequest(username=data['username'], password=data['password'], role='BUYER'))
    if resp.success: return jsonify({"status": "SUCCESS", "uid": resp.user_id})
    return jsonify({"status": "FAIL", "message": resp.message})

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    if not is_valid_string(data.get('username')) or not is_valid_string(data.get('password')):
        return jsonify({"status": "FAIL", "message": "Missing Credentials"})
    resp = cust_stub.Login(ecommerce_pb2.LoginRequest(username=data['username'], password=data['password'], role='BUYER'))
    if resp.success:
        import uuid
        sess_id = str(uuid.uuid4())
        cust_stub.SaveSession(ecommerce_pb2.SessionRequest(sess_id=sess_id, username=data['username']))
        return jsonify({"status": "SUCCESS", "sess_id": sess_id})
    return jsonify({"status": "FAIL", "message": resp.message})

@app.route('/logout', methods=['POST'])
def logout():
    cust_stub.Logout(ecommerce_pb2.SessionRequest(sess_id=request.json.get('sess_id', '')))
    return jsonify({"status": "SUCCESS"})

@app.route('/search', methods=['GET'])
def search():
    try:
        cat = int(request.args.get('category', 0))
        kw = request.args.get('keywords', '')
        
        min_p = float(request.args.get('min_price', 0.0))
        max_p = float(request.args.get('max_price', 9999999.0))
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 5)) 
        
        resp = prod_stub.SearchItems(ecommerce_pb2.SearchRequest(
            category=cat, keywords=kw, min_price=min_p, max_price=max_p, page=page, limit=limit
        ))
        
        return jsonify({
            "status": "SUCCESS", 
            "items": list(resp.item_lines),
            "current_page": resp.current_page,
            "total_pages": resp.total_pages
        })
    except ValueError:
        return jsonify({"status": "FAIL", "message": "Invalid search parameters."})

@app.route('/item', methods=['GET'])
def get_item():
    item_id = request.args.get('item_id')
    resp = prod_stub.GetItem(ecommerce_pb2.IDRequest(id=item_id))
    if resp.success:
        reviews = [{"user": r.reviewer, "stars": r.stars, "review": r.text} for r in resp.reviews]
        return jsonify({
            "status": "SUCCESS", "name": resp.name, "price": resp.price,
            "category": resp.item_id.split('.')[0], 
            "rating": round(resp.avg_rating, 1),
            "reviews": reviews,                 
            "quantity": resp.quantity, "seller": resp.seller
        })
    return jsonify({"status": "FAIL", "message": "Item not found"})

@app.route('/feedback/item', methods=['POST'])
def item_feedback():
    data = request.json
    sess_id = data.get('sess_id')
    valid = cust_stub.ValidateSession(ecommerce_pb2.SessionRequest(sess_id=sess_id))
    if not valid.success: return jsonify({"status": "FAIL", "message": "Login First"})

    prod_stub.UpdateItemFeedback(ecommerce_pb2.FeedbackRequest(
        target_id=data['item_id'], 
        stars=int(data['stars']), 
        text=data['text'],
        reviewer=valid.username 
    ))
    return jsonify({"status": "SUCCESS", "message": "Review added!"})

@app.route('/rating/seller', methods=['GET'])
def seller_rating():
    seller_id = request.args.get('seller_id')
    resp = prod_stub.GetSellerStats(ecommerce_pb2.UserRequest(query=seller_id))
    reviews = [{"user": r.reviewer, "stars": r.stars, "review": r.text} for r in resp.reviews]
    return jsonify({
        "status": resp.status,
        "avg_rating": round(resp.avg_rating, 1),
        "reviews": reviews,
        "message": resp.message
    })

@app.route('/wishlist', methods=['GET', 'POST', 'DELETE'])
def manage_wishlist():
    sess_id = request.args.get('sess_id') or request.json.get('sess_id')
    valid = cust_stub.ValidateSession(ecommerce_pb2.SessionRequest(sess_id=sess_id))
    if not valid.success: return jsonify({"status": "FAIL", "message": "Login First"})

    if request.method == 'GET':
        resp = cust_stub.GetWishlist(ecommerce_pb2.SessionRequest(sess_id=sess_id))
        if not resp.success: return jsonify({"status": "FAIL"})
        
        item_ids = json.loads(resp.wishlist_json)
        enriched_wishlist = []
        
        for iid in item_ids:
            p_resp = prod_stub.GetItem(ecommerce_pb2.IDRequest(id=iid))
            if p_resp.success:
                enriched_wishlist.append({"id": iid, "name": p_resp.name, "price": p_resp.price, "qty_available": p_resp.quantity})
        return jsonify({"status": "SUCCESS", "wishlist": enriched_wishlist})

    if request.method == 'POST':
        iid = request.json.get('item_id')
        p_resp = prod_stub.GetItem(ecommerce_pb2.IDRequest(id=iid))
        if not p_resp.success: return jsonify({"status": "FAIL", "message": "Invalid Item ID"})
        
        resp = cust_stub.AddToWishlist(ecommerce_pb2.WishlistItemRequest(sess_id=sess_id, item_id=iid))
        return jsonify({"status": "SUCCESS", "message": resp.message}) if resp.success else jsonify({"status": "FAIL", "message": resp.message})

    if request.method == 'DELETE':
        iid = request.json.get('item_id')
        resp = cust_stub.RemoveFromWishlist(ecommerce_pb2.WishlistItemRequest(sess_id=sess_id, item_id=iid))
        return jsonify({"status": "SUCCESS", "message": resp.message}) if resp.success else jsonify({"status": "FAIL", "message": resp.message})

@app.route('/wishlist/move_to_cart', methods=['POST'])
def move_to_cart():
    data = request.json
    sess_id = data.get('sess_id')
    iid = data.get('item_id')

    valid = cust_stub.ValidateSession(ecommerce_pb2.SessionRequest(sess_id=sess_id))
    if not valid.success: return jsonify({"status": "FAIL", "message": "Login First"})

    p_resp = prod_stub.GetItem(ecommerce_pb2.IDRequest(id=iid))
    if not p_resp.success or p_resp.quantity < 1:
        return jsonify({"status": "FAIL", "message": "Item is out of stock! Cannot move to cart."})

    cust_stub.RemoveFromWishlist(ecommerce_pb2.WishlistItemRequest(sess_id=sess_id, item_id=iid))
    
    cust_stub.AddToCart(ecommerce_pb2.CartItemRequest(sess_id=sess_id, item_id=iid, qty=1))
    
    return jsonify({"status": "SUCCESS", "message": "Item moved from Wishlist to Cart!"})

@app.route('/feedback/seller', methods=['POST'])
def seller_feedback():
    data = request.json
    sess_id = data.get('sess_id')
    valid = cust_stub.ValidateSession(ecommerce_pb2.SessionRequest(sess_id=sess_id))
    if not valid.success: return jsonify({"status": "FAIL", "message": "Login First"})

    prod_stub.UpdateSellerFeedback(ecommerce_pb2.FeedbackRequest(
        target_id=data['seller_id'], 
        stars=int(data['stars']), 
        text=data['text'],
        reviewer=valid.username
    ))
    return jsonify({"status": "SUCCESS", "message": "Seller reviewed!"})

@app.route('/history', methods=['GET'])
def get_history():
    sess_id = request.args.get('sess_id')
    valid = cust_stub.ValidateSession(ecommerce_pb2.SessionRequest(sess_id=sess_id))
    if not valid.success: return jsonify({"status": "FAIL", "message": "Login First"})
    resp = cust_stub.GetUserData(ecommerce_pb2.UserRequest(query=valid.username))
    if resp.success:
        return jsonify({"status": "SUCCESS", "history": json.loads(resp.purchase_history_json)})
    return jsonify({"status": "FAIL"})

@app.route('/cart', methods=['GET', 'POST', 'DELETE', 'PUT'])
def manage_cart():
    sess_id = request.args.get('sess_id') or request.json.get('sess_id')
    valid = cust_stub.ValidateSession(ecommerce_pb2.SessionRequest(sess_id=sess_id))
    if not valid.success: return jsonify({"status": "FAIL", "message": "Login First"})
    
    if request.method == 'GET':
        promo_code = request.args.get('promo', '').upper()
        promo_type, promo_val, promo_pct, promo_seller, promo_msg = None, None, 0.0, None, ""
        
        if promo_code:
            pr_resp = prod_stub.GetPromo(ecommerce_pb2.PromoGetRequest(code=promo_code))
            if pr_resp.success:
                promo_type, promo_val, promo_pct, promo_seller = pr_resp.target_type, pr_resp.target_val, pr_resp.discount_pct, pr_resp.seller
                promo_msg = f"Code Applied! ({promo_pct}% off eligible items)"
            else:
                promo_msg = "Invalid Promo Code"

        resp = cust_stub.GetCart(ecommerce_pb2.SessionRequest(sess_id=sess_id))
        raw_cart = json.loads(resp.cart_json)
        enriched_cart = []
        grand_total = 0.0
        
        for item in raw_cart:
            p_resp = prod_stub.GetItem(ecommerce_pb2.IDRequest(id=item['id']))
            if p_resp.success:
                discount_amount = 0
                if promo_code and p_resp.seller == promo_seller:
                    if promo_type == "ITEM" and item['id'] == promo_val:
                        discount_amount = (p_resp.price * (promo_pct / 100.0)) * item['qty']
                    elif promo_type == "CATEGORY" and item['id'].split('.')[0] == promo_val:
                        discount_amount = (p_resp.price * (promo_pct / 100.0)) * item['qty']
                
                item_total = (p_resp.price * item['qty']) - discount_amount
                grand_total += item_total
                enriched_cart.append({
                    "id": item['id'], "name": p_resp.name, "price": p_resp.price, 
                    "qty": item['qty'], "item_total": round(item_total, 2),
                    "discount_applied": round(discount_amount, 2)
                })
            else: 
                enriched_cart.append({"id": item['id'], "name": "UNKNOWN", "qty": item['qty'], "price": 0, "item_total": 0, "discount_applied": 0})
                
        return jsonify({"status": "SUCCESS", "cart": enriched_cart, "grand_total": round(grand_total, 2), "promo_msg": promo_msg})
    
    if request.method == 'POST': 
        item_id = request.json.get('item_id')
        qty_to_add = request.json.get('qty')
        if not is_valid_qty(qty_to_add): return jsonify({"status": "FAIL", "message": "Quantity must be a positive number"})
        qty_to_add = int(qty_to_add)
        
        item_resp = prod_stub.GetItem(ecommerce_pb2.IDRequest(id=item_id))
        if not item_resp.success: return jsonify({"status": "FAIL", "message": "Item ID Invalid"})
        
        cart_resp = cust_stub.GetCart(ecommerce_pb2.SessionRequest(sess_id=sess_id))
        current_cart = json.loads(cart_resp.cart_json)
        existing_qty = sum(i['qty'] for i in current_cart if i['id'] == item_id)
        
        if (existing_qty + qty_to_add) > item_resp.quantity:
            return jsonify({"status": "FAIL", "message": f"Stock Limit Exceeded! Max: {item_resp.quantity}"})
        
        cust_stub.AddToCart(ecommerce_pb2.CartItemRequest(sess_id=sess_id, item_id=item_id, qty=qty_to_add))
        return jsonify({"status": "SUCCESS"})

    if request.method == 'DELETE': 
        qty = request.json.get('qty')
        if not is_valid_qty(qty): return jsonify({"status": "FAIL", "message": "Invalid Quantity"})
        cust_stub.RemoveFromCart(ecommerce_pb2.CartItemRequest(sess_id=sess_id, item_id=request.json['item_id'], qty=int(qty)))
        return jsonify({"status": "SUCCESS"})

    if request.method == 'PUT': 
        cust_stub.ClearCart(ecommerce_pb2.SessionRequest(sess_id=sess_id))
        return jsonify({"status": "SUCCESS"})

@app.route('/save_cart', methods=['POST'])
def save_cart():
    cust_stub.SaveCart(ecommerce_pb2.SessionRequest(sess_id=request.json.get('sess_id')))
    return jsonify({"status": "SUCCESS"})

@app.route('/orders', methods=['GET'])
def get_orders():
    sess_id = request.args.get('sess_id')
    valid = cust_stub.ValidateSession(ecommerce_pb2.SessionRequest(sess_id=sess_id))
    if not valid.success: return jsonify({"status": "FAIL", "message": "Login First"})
    
    resp = cust_stub.GetBuyerOrders(ecommerce_pb2.UserRequest(query=valid.username))
    orders = [{"order_id": o.order_id, "seller": o.seller, "item": o.item_name, "qty": o.qty, "total": o.total_price, "status": o.status} for o in resp.orders]
    
    return jsonify({"status": "SUCCESS", "orders": orders})

@app.route('/purchase', methods=['POST'])
def make_purchase():
    data = request.json
    sess_id = data.get('sess_id')
    
    cart_resp = cust_stub.GetCart(ecommerce_pb2.SessionRequest(sess_id=sess_id))

    cart_list = json.loads(cart_resp.cart_json)
    
    if not cart_list:  
        return jsonify({"status": "FAIL", "message": "Cart is Empty! Add items first."})
    
    valid = cust_stub.ValidateSession(ecommerce_pb2.SessionRequest(sess_id=sess_id))
    if not valid.success: return jsonify({"status": "FAIL", "message": "Login First"})
    
    try:
        soap_client = SoapClient('http://localhost:9003/?wsdl')
        result = soap_client.service.process_payment(data['name'], data['cc_number'], data['exp_date'], data['sec_code'])
        
        if result == "SUCCESS":
            import uuid
            cart_resp = cust_stub.GetCart(ecommerce_pb2.SessionRequest(sess_id=sess_id))
            cart = json.loads(cart_resp.cart_json)
            
            promo_code = data.get('promo', '').upper()
            promo_type, promo_val, promo_pct, promo_seller = None, None, 0.0, None
            if promo_code:
                pr_resp = prod_stub.GetPromo(ecommerce_pb2.PromoGetRequest(code=promo_code))
                if pr_resp.success:
                    promo_type, promo_val, promo_pct, promo_seller = pr_resp.target_type, pr_resp.target_val, pr_resp.discount_pct, pr_resp.seller

            order_items = []
            total_savings = 0.0 
            
            for item in cart:
                p_resp = prod_stub.GetItem(ecommerce_pb2.IDRequest(id=item['id']))
                if p_resp.quantity < item['qty']: 
                    return jsonify({"status": "FAIL", "message": f"Stock changed! {p_resp.name} is out of stock."})
                
                discount_amount = 0
                if promo_code and p_resp.seller == promo_seller:
                    if promo_type == "ITEM" and item['id'] == promo_val:
                        discount_amount = (p_resp.price * (promo_pct / 100.0)) * item['qty']
                    elif promo_type == "CATEGORY" and item['id'].split('.')[0] == promo_val:
                        discount_amount = (p_resp.price * (promo_pct / 100.0)) * item['qty']
                
                total_savings += discount_amount 
                final_price = (p_resp.price * item['qty']) - discount_amount
                
                order_items.append(ecommerce_pb2.Order(
                    order_id=str(uuid.uuid4()), buyer=valid.username, seller=p_resp.seller,
                    item_id=item['id'], item_name=p_resp.name, qty=item['qty'],
                    total_price=round(final_price, 2), status="PROCESSING"
                ))
            
            for item in cart:
                prod_stub.UpdateQty(ecommerce_pb2.UpdateQtyRequest(item_id=item['id'], qty_change=item['qty']))
            cust_stub.PlaceOrder(ecommerce_pb2.PlaceOrderRequest(buyer=valid.username, items=order_items))
            cust_stub.ClearCart(ecommerce_pb2.SessionRequest(sess_id=sess_id))
            cust_stub.SaveCart(ecommerce_pb2.SessionRequest(sess_id=sess_id))
            
            success_msg = "Payment Approved & Orders Created!"
            if total_savings > 0:
                success_msg = f"Payment Approved! Promo Applied: You saved ${round(total_savings, 2)}!"
            elif promo_code:
                success_msg = f"Payment Approved. (Note: Promo '{promo_code}' was invalid or did not apply to your items)."
                
            return jsonify({"status": "SUCCESS", "message": success_msg})
        
        else:
            return jsonify({"status": "FAIL", "message": result})
            
    except Exception as e:
        return jsonify({"status": "FAIL", "message": f"SOAP Service Error: {str(e)}"})

if __name__ == '__main__':
    print("Buyer Server (REST) running on 7003...")
    app.run(
        host=BUYER_SERVER_HOST,
        port=BUYER_SERVER_PORT,
        threaded=True
    )