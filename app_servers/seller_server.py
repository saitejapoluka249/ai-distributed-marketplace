from flask import Flask, request, jsonify
import grpc
import ecommerce_pb2
import ecommerce_pb2_grpc

app = Flask(__name__)

#cust_channel = grpc.insecure_channel('localhost:50051')
cust_channel = grpc.insecure_channel('10.128.0.2')
cust_stub = ecommerce_pb2_grpc.CustomerServiceStub(cust_channel)
#prod_channel = grpc.insecure_channel('localhost:50052')
prod_channel = grpc.insecure_channel('10.128.0.3')
prod_stub = ecommerce_pb2_grpc.ProductServiceStub(prod_channel)

def is_valid_price(p):
    try: return float(p) >= 0
    except: return False

def is_valid_qty(q):
    try: return int(q) >= 0
    except: return False

@app.route('/create_account', methods=['POST'])
def create_account():
    data = request.json
    if not data.get('username') or not data.get('password'):
        return jsonify({"status": "FAIL", "message": "Credentials cannot be empty"})
    resp = cust_stub.Register(ecommerce_pb2.RegisterRequest(username=data['username'], password=data['password'], role='SELLER'))
    if resp.success: return jsonify({"status": "SUCCESS", "uid": resp.user_id})
    return jsonify({"status": "FAIL", "message": resp.message})

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    resp = cust_stub.Login(ecommerce_pb2.LoginRequest(username=data['username'], password=data['password']))
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
        
        resp = prod_stub.RegisterItem(ecommerce_pb2.ItemRequest(
            name=d['name'], category=int(d['category']), keywords=d['keywords'],
            condition=d['condition'], price=float(d['price']), quantity=int(d['quantity']),
            seller=valid.username
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

    resp = prod_stub.UpdateQty(ecommerce_pb2.UpdateQtyRequest(item_id=str(data.get('item_id')), qty_change=int(qty)))
    if resp.success:
        return jsonify({"status": "SUCCESS", "message": "Stock Updated"})
    else:
        return jsonify({"status": "FAIL", "message": resp.message})

@app.route('/rating', methods=['GET'])
def get_rating():
    sess_id = request.args.get('sess_id')
    valid = cust_stub.ValidateSession(ecommerce_pb2.SessionRequest(sess_id=sess_id))
    
    resp = prod_stub.GetSellerStats(ecommerce_pb2.UserRequest(query=valid.username))
    
    return jsonify({"up": resp.up, "down": resp.down})

if __name__ == '__main__':
    print("Seller Server (REST) running on 5001...")
    app.run(host='0.0.0.0', port=5001, debug=True)