from flask import Flask, request, jsonify
import grpc
import ecommerce_pb2
import ecommerce_pb2_grpc
import os
from dotenv import load_dotenv
from flask_cors import CORS

load_dotenv()

app = Flask(__name__)
CORS(app)

SELLER_SERVER_HOST = os.getenv("SELLER_SERVER_HOST", "0.0.0.0")
SELLER_SERVER_PORT = int(os.getenv("SELLER_SERVER_PORT", 7001))
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

def is_valid_price(p):
    try: return float(p) >= 0
    except: return False

def is_valid_qty(q):
    try: return int(q) >= 0
    except: return False

def is_strong_password(password):
    if len(password) < 8: return False, "Password must be at least 8 characters."
    if not any(c.isupper() for c in password): return False, "Password needs at least one uppercase letter."
    if not any(c.islower() for c in password): return False, "Password needs at least one lowercase letter."
    if not any(c.isdigit() for c in password): return False, "Password needs at least one number."
    return True, ""

@app.route('/create_account', methods=['POST'])
def create_account():
    data = request.json
    if not data.get('username') or not data.get('password'):
        return jsonify({"status": "FAIL", "message": "Credentials cannot be empty"})
        
    is_valid, msg = is_strong_password(data['password'])
    if not is_valid:
        return jsonify({"status": "FAIL", "message": msg})

    resp = cust_stub.Register(ecommerce_pb2.RegisterRequest(username=data['username'], password=data['password'], role='SELLER'))
    if resp.success: return jsonify({"status": "SUCCESS", "uid": resp.user_id})
    return jsonify({"status": "FAIL", "message": resp.message})

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    resp = cust_stub.Login(ecommerce_pb2.LoginRequest(username=data['username'], password=data['password'], role='SELLER'))
    if resp.success:
        import uuid
        sess_id = str(uuid.uuid4())
        cust_stub.SaveSession(ecommerce_pb2.SessionRequest(sess_id=sess_id, username=data['username']))
        return jsonify({"status": "SUCCESS", "sess_id": sess_id})
    return jsonify({"status": "FAIL", "message": resp.message})

@app.route('/logout', methods=['POST'])
def logout():
    cust_stub.Logout(ecommerce_pb2.SessionRequest(sess_id=request.json.get('sess_id')))
    return jsonify({"status": "SUCCESS"})

@app.route('/items', methods=['POST', 'GET', 'PUT'])
def manage_items():
    sess_id = request.args.get('sess_id') or request.json.get('sess_id')
    valid = cust_stub.ValidateSession(ecommerce_pb2.SessionRequest(sess_id=sess_id))
    if not valid.success: return jsonify({"status": "FAIL", "message": "Login First"})
    
    if request.method == 'POST': 
        d = request.json
        if not is_valid_price(d.get('price')): return jsonify({"status": "FAIL", "message": "Invalid Price"})
        if not is_valid_qty(d.get('quantity')): return jsonify({"status": "FAIL", "message": "Invalid Quantity"})
        
        # ADDED image_url below
        resp = prod_stub.RegisterItem(ecommerce_pb2.ItemRequest(
            name=d['name'], category=int(d['category']), keywords=d['keywords'],
            condition=d['condition'], price=float(d['price']), quantity=int(d['quantity']),
            seller=valid.username, image_url=d.get('image_url', '')
        ))
        return jsonify({"status": "SUCCESS", "item_id": resp.item_id})

    if request.method == 'GET':
        resp = prod_stub.GetSellerItems(ecommerce_pb2.UserRequest(query=valid.username))
        return jsonify({"status": "SUCCESS", "items": list(resp.item_lines)})

    if request.method == 'PUT': 
        price = request.json.get('price')
        if not is_valid_price(price): return jsonify({"status": "FAIL", "message": "Invalid Price"})
        
        prod_stub.UpdatePrice(ecommerce_pb2.UpdatePriceRequest(item_id=request.json['item_id'], new_price=float(price)))
        return jsonify({"status": "SUCCESS"})

@app.route('/update_qty', methods=['POST'])
def update_qty():
    data = request.get_json()
    if not data: return jsonify({"status": "FAIL", "message": "No data"})

    sess_id = data.get('sess_id')
    qty = data.get('qty')

    if not is_valid_qty(qty): return jsonify({"status": "FAIL", "message": "Invalid Quantity"})

    valid = cust_stub.ValidateSession(ecommerce_pb2.SessionRequest(sess_id=sess_id))
    if not valid.success: return jsonify({"status": "FAIL", "message": "Login First"})

    resp = prod_stub.UpdateQty(ecommerce_pb2.UpdateQtyRequest(item_id=str(data.get('item_id')), qty_change=-int(qty)))
    if resp.success:
        return jsonify({"status": "SUCCESS", "message": "Stock Updated"})
    else:
        return jsonify({"status": "FAIL", "message": resp.message})
    

@app.route('/orders', methods=['GET', 'PUT'])
def manage_orders():
    sess_id = request.args.get('sess_id') or request.json.get('sess_id')
    valid = cust_stub.ValidateSession(ecommerce_pb2.SessionRequest(sess_id=sess_id))
    if not valid.success: return jsonify({"status": "FAIL", "message": "Login First"})
    
    if request.method == 'GET':
        resp = cust_stub.GetSellerOrders(ecommerce_pb2.UserRequest(query=valid.username))
        orders = [{"order_id": o.order_id, "buyer": o.buyer, "item": o.item_name, "qty": o.qty, "total": o.total_price, "status": o.status} for o in resp.orders]
        return jsonify({"status": "SUCCESS", "orders": orders})
        
    if request.method == 'PUT':
        data = request.json
        if data.get('status') not in ['PROCESSING', 'SHIPPED', 'DELIVERED']:
            return jsonify({"status": "FAIL", "message": "Invalid status."})
            
        resp = cust_stub.UpdateOrderStatus(ecommerce_pb2.OrderStatusRequest(order_id=data['order_id'], new_status=data['status']))
        
        if resp.success:
            return jsonify({"status": "SUCCESS", "message": resp.message})
        else:
            return jsonify({"status": "FAIL", "message": resp.message})
        
@app.route('/rating', methods=['GET'])
def get_rating():
    sess_id = request.args.get('sess_id')
    valid = cust_stub.ValidateSession(ecommerce_pb2.SessionRequest(sess_id=sess_id))
    if not valid.success: 
        return jsonify({"status": "FAIL", "message": "Login First"})
    
    resp = prod_stub.GetSellerStats(ecommerce_pb2.UserRequest(query=valid.username))
    
    seller_reviews = [{"user": r.reviewer, "stars": r.stars, "review": r.text} for r in resp.reviews]
    item_reviews = [{"user": r.reviewer, "stars": r.stars, "review": r.text} for r in resp.item_reviews]
    
    return jsonify({
        "status": resp.status, 
        "seller_avg": round(resp.avg_rating, 1),
        "seller_reviews": seller_reviews,
        "item_avg": round(resp.item_avg_rating, 1),
        "item_reviews": item_reviews,
        "message": resp.message
    })

@app.route('/promo', methods=['POST', 'GET'])
def manage_promo():
    # Allow passing sess_id via URL (GET) or Body (POST)
    sess_id = request.args.get('sess_id') or (request.json and request.json.get('sess_id'))
    valid = cust_stub.ValidateSession(ecommerce_pb2.SessionRequest(sess_id=sess_id))
    if not valid.success: return jsonify({"status": "FAIL", "message": "Login First"})

    if request.method == 'GET':
        resp = prod_stub.GetSellerPromos(ecommerce_pb2.UserRequest(query=valid.username))
        promos = [{"code": p.code, "type": p.target_type, "target": p.target_val, "pct": p.discount_pct} for p in resp.promos]
        return jsonify({"status": "SUCCESS", "promos": promos})

    if request.method == 'POST':
        data = request.json
        resp = prod_stub.CreatePromo(ecommerce_pb2.PromoRequest(
            seller=valid.username, 
            target_type=data['target_type'], 
            target_val=str(data['target_val']), 
            code=data['code'].upper(), 
            discount_pct=float(data['discount'])
        ))
        return jsonify({"status": "SUCCESS" if resp.success else "FAIL", "message": resp.message})

@app.route('/item', methods=['GET'])
def get_item():
    item_id = request.args.get('item_id')
    if not item_id: 
        return jsonify({"status": "FAIL", "message": "Invalid Item ID"})
        
    resp = prod_stub.GetItem(ecommerce_pb2.IDRequest(id=item_id))
    if resp.success:
        reviews = [{"user": r.reviewer, "stars": r.stars, "review": r.text} for r in resp.reviews]
        return jsonify({
            "status": "SUCCESS", 
            "name": resp.name, 
            "price": resp.price,
            "rating": round(resp.avg_rating, 1),
            "reviews": reviews,
            "quantity": resp.quantity, 
            "seller": resp.seller
        })
    return jsonify({"status": "FAIL", "message": "Item not found"})

if __name__ == '__main__':
    print("Seller Server (REST) running on 7001...")
    app.run(
        host=SELLER_SERVER_HOST,
        port=SELLER_SERVER_PORT,
        threaded=True
    )