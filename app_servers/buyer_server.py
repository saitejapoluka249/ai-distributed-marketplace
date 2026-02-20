from flask import Flask, request, jsonify
import grpc
import ecommerce_pb2
import ecommerce_pb2_grpc
import json
import re
from zeep import Client as SoapClient 

app = Flask(__name__)

#cust_channel = grpc.insecure_channel('localhost:50051')
cust_channel = grpc.insecure_channel('10.128.0.2')
cust_stub = ecommerce_pb2_grpc.CustomerServiceStub(cust_channel)
#prod_channel = grpc.insecure_channel('localhost:50052')
prod_channel = grpc.insecure_channel('10.128.0.3')
prod_stub = ecommerce_pb2_grpc.ProductServiceStub(prod_channel)


def is_valid_qty(q):
    try: return int(q) > 0
    except: return False

def is_valid_string(s):
    return s and isinstance(s, str) and len(s.strip()) > 0

@app.route('/create_account', methods=['POST'])
def create_account():
    data = request.json
    if not is_valid_string(data.get('username')) or not is_valid_string(data.get('password')):
        return jsonify({"status": "FAIL", "message": "Username/Password cannot be empty"})
    resp = cust_stub.Register(ecommerce_pb2.RegisterRequest(username=data['username'], password=data['password'], role='BUYER'))
    if resp.success: return jsonify({"status": "SUCCESS", "uid": resp.user_id})
    return jsonify({"status": "FAIL", "message": resp.message})

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    if not is_valid_string(data.get('username')) or not is_valid_string(data.get('password')):
        return jsonify({"status": "FAIL", "message": "Missing Credentials"})
    resp = cust_stub.Login(ecommerce_pb2.LoginRequest(username=data['username'], password=data['password']))
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
        resp = prod_stub.SearchItems(ecommerce_pb2.SearchRequest(category=cat, keywords=kw))
        return jsonify({"status": "SUCCESS", "items": list(resp.item_lines)})
    except ValueError:
        return jsonify({"status": "FAIL", "message": "Category must be a number"})

@app.route('/item', methods=['GET'])
def get_item():
    item_id = request.args.get('item_id')
    if not is_valid_string(item_id): return jsonify({"status": "FAIL", "message": "Invalid Item ID"})
    resp = prod_stub.GetItem(ecommerce_pb2.IDRequest(id=item_id))
    if resp.success:
        return jsonify({
            "status": "SUCCESS", "name": resp.name, "price": resp.price,
            "category": resp.item_id.split('.')[0], "rating": {"up": resp.fb_up, "down": resp.fb_down},
            "quantity": resp.quantity, "seller": resp.seller
        })
    return jsonify({"status": "FAIL", "message": "Item not found"})

@app.route('/feedback/item', methods=['POST'])
def item_feedback():
    data = request.json
    if data.get('type') not in ['up', 'down']: return jsonify({"status": "FAIL", "message": "Type must be up or down"})
    prod_stub.UpdateItemFeedback(ecommerce_pb2.FeedbackRequest(target_id=data['item_id'], type=data['type']))
    return jsonify({"status": "SUCCESS"})

@app.route('/rating/seller', methods=['GET'])
def seller_rating():
    seller_id = request.args.get('seller_id')
    if not is_valid_string(seller_id): return jsonify({"status": "FAIL", "message": "Invalid Seller ID"})
    
    resp = prod_stub.GetSellerStats(ecommerce_pb2.UserRequest(query=seller_id))
    return jsonify({
        "status": resp.status,
        "up": resp.up,
        "down": resp.down,
        "message": resp.message
    })

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
        resp = cust_stub.GetCart(ecommerce_pb2.SessionRequest(sess_id=sess_id))
        raw_cart = json.loads(resp.cart_json)
        enriched_cart = []
        grand_total = 0.0
        for item in raw_cart:
            p_resp = prod_stub.GetItem(ecommerce_pb2.IDRequest(id=item['id']))
            if p_resp.success:
                item_total = p_resp.price * item['qty']
                grand_total += item_total
                enriched_cart.append({"id": item['id'], "name": p_resp.name, "price": p_resp.price, "qty": item['qty'], "item_total": item_total})
            else: enriched_cart.append({"id": item['id'], "name": "UNKNOWN", "qty": item['qty'], "price": 0, "item_total": 0})
        return jsonify({"status": "SUCCESS", "cart": enriched_cart, "grand_total": grand_total})

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
        soap_client = SoapClient('http://localhost:8003/?wsdl')
        result = soap_client.service.process_payment(data['name'], data['cc_number'], data['exp_date'], data['sec_code'])
        
        if result == "SUCCESS":
            cart_resp = cust_stub.GetCart(ecommerce_pb2.SessionRequest(sess_id=sess_id))
            cart = json.loads(cart_resp.cart_json)
            for item in cart:
                p_resp = prod_stub.GetItem(ecommerce_pb2.IDRequest(id=item['id']))
                if p_resp.quantity < item['qty']: return jsonify({"status": "FAIL", "message": f"Stock changed! {p_resp.name} is now out of stock."})
            for item in cart:
                prod_stub.UpdateQty(ecommerce_pb2.UpdateQtyRequest(item_id=item['id'], qty_change=item['qty']))
            
            cust_stub.AddPurchasedItems(ecommerce_pb2.PurchaseRequest(username=valid.username, items_json=cart_resp.cart_json))
            cust_stub.ClearCart(ecommerce_pb2.SessionRequest(sess_id=sess_id))
            cust_stub.SaveCart(ecommerce_pb2.SessionRequest(sess_id=sess_id))
            
            return jsonify({"status": "SUCCESS", "message": "Payment Approved!"})
        
        else:
            return jsonify({"status": "FAIL", "message": result})
            
    except Exception as e:
        return jsonify({"status": "FAIL", "message": f"SOAP Service Error: {str(e)}"})

if __name__ == '__main__':
    print("Buyer Server (REST) running on 5003...")
    app.run(host='0.0.0.0', port=5003, debug=True)