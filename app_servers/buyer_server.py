from flask import Flask, request, jsonify
import grpc
import ecommerce_pb2
import ecommerce_pb2_grpc
import json
import re
import os
from dotenv import load_dotenv
from zeep import Client as SoapClient 
from flask_cors import CORS
import smtplib
from email.message import EmailMessage
import datetime
from openai import OpenAI

load_dotenv()

app = Flask(__name__)
CORS(app)

BUYER_SERVER_HOST = os.getenv("BUYER_SERVER_HOST", "0.0.0.0")
BUYER_SERVER_PORT = int(os.getenv("BUYER_SERVER_PORT", 7003))

CUSTOMER_DB_ADDR = f"{os.getenv('CUSTOMER_DB_HOST')}:{os.getenv('CUSTOMER_DB_PORT')}"
PRODUCT_DB_ADDR  = f"{os.getenv('PRODUCT_DB_HOST')}:{os.getenv('PRODUCT_DB_PORT')}"

SENDER_EMAIL = os.getenv("SENDER_EMAIL")
SENDER_PASSWORD = os.getenv("SENDER_PASSWORD")

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

def send_order_confirmation(to_email, order_items, payment_data, subtotal, discount, tax, final_billed):
    if not to_email: 
        return
        
    order_id_display = order_items[0].order_id[:8].upper()

    items_html = ""
    for item in order_items:
        items_html += f"""
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">
                <strong>{item.item_name}</strong><br>
                <span style="color: #666; font-size: 12px;">Item ID: {item.item_id} | Sold by: {item.seller}</span>
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">{item.qty}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${item.total_price}</td>
        </tr>
        """

    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #4f46e5;">DistributedStore</h2>
        <p>Hello {payment_data['name']},</p>
        <p>Thank you for your order from DistributedStore. Once your package ships, your seller will update the tracking status.</p>
        <p>Your order confirmation is below.</p>
        
        <h3 style="border-bottom: 2px solid #333; padding-bottom: 5px;">Order # {order_id_display}</h3>
        
        <table width="100%" style="margin-bottom: 20px;">
            <tr>
                <td width="50%" valign="top">
                    <strong>Shipping & Billing Address:</strong><br>
                    {payment_data['name']}<br>
                    {payment_data['street']}<br>
                    {payment_data['city']}, {payment_data['state']} {payment_data['zip']}<br>
                    T: {payment_data['phone']}
                </td>
                <td width="50%" valign="top">
                    <strong>Payment Method:</strong><br>
                    Credit Card ending in {payment_data['cc_number'][-4:]}<br><br>
                    <strong>Shipping Method:</strong><br>
                    Standard Distributed Shipping
                </td>
            </tr>
        </table>

        <h3 style="border-bottom: 2px solid #333; padding-bottom: 5px;">Items Ordered</h3>
        <table width="100%" style="border-collapse: collapse; margin-bottom: 20px;">
            {items_html}
        </table>

        <table width="100%" style="text-align: right;">
            <tr><td>Subtotal:</td><td>${subtotal}</td></tr>
            <tr><td style="color: green;">Discount Applied:</td><td style="color: green;">-${discount}</td></tr>
            <tr><td>Tax:</td><td>${tax}</td></tr>
            <tr><td><strong>Total Billed:</strong></td><td><strong>${final_billed}</strong></td></tr>
        </table>
        
        <p style="text-align: center; margin-top: 40px; font-size: 12px; color: #999;">
            © 2026 DistributedStore. All Rights Reserved.
        </p>
    </body>
    </html>
    """

    msg = EmailMessage()
    msg['Subject'] = f'DistributedStore - New Order # {order_id_display}'
    msg['From'] = SENDER_EMAIL
    msg['To'] = to_email
    msg.set_content("Please enable HTML to view this receipt.")
    msg.add_alternative(html_content, subtype='html')

    try:
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"✅ HTML RECEIPT SENT TO: {to_email}")
    except Exception as e:
        print(f"❌ Failed to send email: {e}")


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

@app.route('/chat', methods=['POST'])
def ai_chat():
    data = request.json
    user_msg = data.get('message', '')
    sess_id = data.get('sess_id', '') 
    
    if not user_msg:
        return jsonify({"status": "FAIL", "message": "No message provided."})
        
    try:
        resp = prod_stub.SearchItems(ecommerce_pb2.SearchRequest(
            category=0, keywords='', min_price=0.0, max_price=9999999.0, page=1, limit=50
        ))
        inventory_list = "\n".join([item.split('| IMG:')[0].strip() for item in resp.item_lines])
        
        username = "Guest"
        order_context = "User is not logged in. Ask them to log in to track orders."
        cart_context = "User is not logged in. Cannot see cart."
        promo_context = "No active promos available."
        
        if sess_id:
            valid = cust_stub.ValidateSession(ecommerce_pb2.SessionRequest(sess_id=sess_id))
            if valid.success:
                username = valid.username
                
                order_resp = cust_stub.GetBuyerOrders(ecommerce_pb2.UserRequest(query=username))
                if order_resp.orders:
                    recent_orders = []
                    for o in order_resp.orders[-3:]: 
                        recent_orders.append(f"Order ID: {o.order_id[:8]} | Item: {o.item_name} | Qty: {o.qty} | Status: {o.status}")
                    order_context = "USER'S RECENT ORDERS:\n" + "\n".join(recent_orders)
                else:
                    order_context = f"{username} has no recent orders."

                cart_resp = cust_stub.GetCart(ecommerce_pb2.SessionRequest(sess_id=sess_id))
                if cart_resp.success and cart_resp.cart_json:
                    cart_items = json.loads(cart_resp.cart_json)
                    if cart_items:
                        cart_details = []
                        valid_promos = [] 
                        
                        for c_item in cart_items:
                            p_resp = prod_stub.GetItem(ecommerce_pb2.IDRequest(id=c_item['id']))
                            if p_resp.success:
                                cat_id = c_item['id'].split('.')[0]
                                cart_details.append(f"- {p_resp.name} (Item ID: {c_item['id']}, Category: {cat_id}, Qty: {c_item['qty']}, Price: ${p_resp.price})")
                                
                                promo_resp = prod_stub.GetSellerPromos(ecommerce_pb2.UserRequest(query=p_resp.seller))
                                for p in promo_resp.promos:
                                    if p.target_type == 'ITEM' and p.target_val == c_item['id']:
                                        valid_promos.append(f"Code: '{p.code}' ({p.discount_pct}% off {p_resp.name})")
                                    elif p.target_type == 'CATEGORY' and p.target_val == cat_id:
                                        valid_promos.append(f"Code: '{p.code}' ({p.discount_pct}% off {p_resp.name})")
                        
                        cart_context = "USER'S CURRENT CART CONTENTS:\n" + "\n".join(cart_details)
                        
                        valid_promos = list(set(valid_promos))
                        
                        if valid_promos:
                            promo_context = "PROMO CODES 100% VALID FOR THIS CART:\n" + "\n".join(valid_promos)
                        else:
                            promo_context = "There are currently NO valid promo codes for the items in the user's cart."
                    else:
                        cart_context = "User's cart is currently empty."
                else:
                    cart_context = "User's cart is currently empty."

        system_prompt = f"""You are 'Nova', the elite AI Shopping Assistant for DistributedStore.
You help customers find products, give recommendations, track orders, and provide discounts.

CURRENT USER: {username}

ORDER HISTORY:
{order_context}

CURRENT CART CONTENTS:
{cart_context}

{promo_context}

LIVE STORE INVENTORY:
{inventory_list}

ACTIONABLE CAPABILITIES (CRITICAL):
If the user wants to buy a specific item from the inventory, you MUST generate a direct Add to Cart button in the chat.
To do this, output exactly this string format anywhere in your response:
[ADD_CART:item_id:Item Name:Price]
Example: "I recommend the iPhone. [ADD_CART:2.1:Apple iPhone 15 Pro Max:1199.00]"

RULES:
1. ONLY recommend items from the Live Store Inventory.
2. If asked about their cart, use the CURRENT CART CONTENTS to tell them exactly what they have inside it.
3. If asked about orders, use the ORDER HISTORY provided.
4. PROMOS: If the user asks for a discount, check the "PROMO CODES 100% VALID FOR THIS CART" section. If there are codes, give them to the user. If it says there are NO valid codes, politely tell the user there are no active discounts for their specific items. Do NOT invent codes.
5. CHECKOUT BOUNDARY: You CANNOT process payments, complete checkouts, or place orders. NEVER say "Let's proceed to purchase". If the user wants to pay, tell them to close the chat and click the "Cart" button at the top of their screen to securely checkout.
6. Always be concise, helpful, and use emojis."""

        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_msg}
            ]
        )
        
        ai_reply = response.choices[0].message.content
        return jsonify({"status": "SUCCESS", "reply": ai_reply})
        
    except Exception as e:
        print(f"OpenAI Error: {e}")
        return jsonify({"status": "FAIL", "message": "AI services are currently busy. Please try again."})
    
@app.route('/search/ai', methods=['GET'])
def ai_search():
    query = request.args.get('query', '')
    if not query:
        return jsonify({"status": "FAIL", "message": "No search query provided."})

    try:
        resp = prod_stub.SearchItems(ecommerce_pb2.SearchRequest(
            category=0, keywords='', min_price=0.0, max_price=9999999.0, page=1, limit=100
        ))
        
        inventory_text = ""
        for item_line in resp.item_lines:
            clean_line = item_line.split('| IMG:')[0].strip()
            inventory_text += f"{clean_line}\n"

        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        system_prompt = f"""You are an advanced semantic search engine for an e-commerce store.
The user will describe a scenario, intent, or "vibe".
Read our active inventory below:

{inventory_text}

TASK: Find the items that best match the user's scenario. 
RETURN FORMAT: You must return ONLY a comma-separated list of the Item IDs (e.g., 2.1, 14.1, 21.1). 
Do NOT return any other text, explanations, or words. If absolutely nothing matches, return NONE."""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Search Query: {query}"}
            ]
        )
        
        ai_reply = response.choices[0].message.content.strip()
        
        if ai_reply == "NONE" or not ai_reply:
            return jsonify({"status": "SUCCESS", "items": [], "current_page": 1, "total_pages": 1})

        import re
        matched_ids = re.findall(r'\d+\.\d+', ai_reply)
        
        matched_ids = list(set(matched_ids))
        
        matched_item_lines = []
        for iid in matched_ids:
            p_resp = prod_stub.GetItem(ecommerce_pb2.IDRequest(id=iid))
            if p_resp.success:
                price_str = "{:.2f}".format(float(p_resp.price)) 
                qty_str = str(int(p_resp.quantity))
                img_str = p_resp.image_url.strip() if p_resp.image_url else ""
                
                line = f"ID: {p_resp.item_id} | {p_resp.name} | ${price_str} | Available: {qty_str} | IMG: {img_str}"
                matched_item_lines.append(line)

        return jsonify({
            "status": "SUCCESS", 
            "items": matched_item_lines,
            "current_page": 1,
            "total_pages": 1
        })

    except Exception as e:
        print(f"AI Search Error: {e}")
        return jsonify({"status": "FAIL", "message": "AI Search is currently unavailable."})
    
@app.route('/seller/summary', methods=['GET'])
def get_seller_summary():
    seller_id = request.args.get('seller_id')
    if not seller_id:
        return jsonify({"status": "FAIL", "message": "Missing seller_id"})

    try:
        resp = prod_stub.GetSellerStats(ecommerce_pb2.UserRequest(query=seller_id))
        
        if not resp.reviews or len(resp.reviews) == 0:
            return jsonify({"status": "SUCCESS", "summary": "This seller has no reviews yet."})
            
        reviews_text = ""
        for r in resp.reviews:
            reviews_text += f"- {r.stars} Stars: {r.text}\n"
            
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        system_prompt = """You are an expert e-commerce analyst. 
        Read the following customer reviews about a SELLER (not a product) and write a concise, one-paragraph summary (maximum 3 sentences). 
        Highlight the main pros and cons of buying from this specific seller (e.g., shipping speed, customer service, packaging). 
        Start your response exactly with 'Customers say this seller '."""
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Reviews for Seller {seller_id}:\n{reviews_text}"}
            ]
        )
        
        return jsonify({"status": "SUCCESS", "summary": response.choices[0].message.content})
        
    except Exception as e:
        return jsonify({"status": "FAIL", "message": "Could not generate AI summary."})
    

@app.route('/item/summary', methods=['GET'])
def get_item_summary():
    item_id = request.args.get('item_id')
    if not item_id:
        return jsonify({"status": "FAIL", "message": "Missing item_id"})

    try:
        resp = prod_stub.GetItem(ecommerce_pb2.IDRequest(id=item_id))
        
        if not resp.success:
            return jsonify({"status": "FAIL", "message": "Item not found"})
            
        if not resp.reviews or len(resp.reviews) == 0:
            return jsonify({"status": "SUCCESS", "summary": "There are no reviews for this item yet."})
            
        reviews_text = ""
        for r in resp.reviews:
            reviews_text += f"- {r.stars} Stars: {r.text}\n"
            
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        system_prompt = """You are an expert e-commerce product analyst. 
        Read the following customer reviews and write a concise, one-paragraph summary (maximum 3 sentences). 
        Highlight the main pros and cons that customers agree on. 
        Start your response exactly with 'Customers say '."""
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Reviews for {resp.name}:\n{reviews_text}"}
            ]
        )
        
        summary = response.choices[0].message.content
        return jsonify({"status": "SUCCESS", "summary": summary})
        
    except Exception as e:
        print(f"OpenAI Summary Error: {e}")
        return jsonify({"status": "FAIL", "message": "Could not generate AI summary."})
    
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
            "quantity": resp.quantity, "seller": resp.seller,
            "image_url": resp.image_url
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
                    "discount_applied": round(discount_amount, 2),
                    "seller": p_resp.seller,
                    "category": item['id'].split('.')[0]
                })
            else: 
                enriched_cart.append({"id": item['id'], "name": "UNKNOWN", "qty": item['qty'], "price": 0, "item_total": 0, "discount_applied": 0})
                
        suggested_promos = []
        try:
            sellers_in_cart = set([item['seller'] for item in enriched_cart if 'seller' in item])
            
            for seller in sellers_in_cart:
                promos_resp = prod_stub.GetSellerPromos(ecommerce_pb2.UserRequest(query=seller))
                
                for p in promos_resp.promos:
                    for item in enriched_cart:
                        if item.get('seller') == seller:
                            if p.target_type == 'ITEM' and p.target_val == item['id']:
                                suggested_promos.append(f"Use code '{p.code}' for {p.discount_pct}% off {item['name']}!")
                                break 
                            elif p.target_type == 'CATEGORY' and p.target_val == item['category']:
                                suggested_promos.append(f"Use code '{p.code}' for {p.discount_pct}% off Category {p.target_val} items!")
                                break
        except Exception as e:
            print(f"Promo fetch error: {e}")
        tax = 0.0
        final_billed = round(grand_total, 2)

        return jsonify({
            "status": "SUCCESS", "cart": enriched_cart, 
            "grand_total": round(grand_total, 2), 
            "tax": tax, "final_billed": final_billed, 
            "promo_msg": promo_msg, "suggested_promos": suggested_promos
        })
    
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
        
        cust_stub.SaveCart(ecommerce_pb2.SessionRequest(sess_id=sess_id))
        
        return jsonify({"status": "SUCCESS"})

    if request.method == 'DELETE': 
        qty = request.json.get('qty')
        if not is_valid_qty(qty): return jsonify({"status": "FAIL", "message": "Invalid Quantity"})
        
        cust_stub.RemoveFromCart(ecommerce_pb2.CartItemRequest(sess_id=sess_id, item_id=request.json['item_id'], qty=int(qty)))
        
        cust_stub.SaveCart(ecommerce_pb2.SessionRequest(sess_id=sess_id))
        
        return jsonify({"status": "SUCCESS"})

    if request.method == 'PUT': 
        cust_stub.ClearCart(ecommerce_pb2.SessionRequest(sess_id=sess_id))
        
        cust_stub.SaveCart(ecommerce_pb2.SessionRequest(sess_id=sess_id))
        
        return jsonify({"status": "SUCCESS"})

@app.route('/save_cart', methods=['POST'])
def save_cart():
    cust_stub.SaveCart(ecommerce_pb2.SessionRequest(sess_id=request.json.get('sess_id')))
    return jsonify({"status": "SUCCESS"})

@app.route('/orders', methods=['GET'])
def get_orders():
    sess_id = request.args.get('sess_id')
    valid = cust_stub.ValidateSession(ecommerce_pb2.SessionRequest(sess_id=sess_id))
    if not valid.success: return jsonify({"status": "FAIL"})

    resp = cust_stub.GetBuyerOrders(ecommerce_pb2.UserRequest(query=valid.username))
    
    enriched_orders = []
    for o in resp.orders:
        p_resp = prod_stub.GetItem(ecommerce_pb2.IDRequest(id=o.item_id))
        img_url = p_resp.image_url if p_resp.success else None
        
        enriched_orders.append({
            "order_id": o.order_id, "item_id": o.item_id, "seller": o.seller, 
            "item": o.item_name, "qty": o.qty, "total": o.total_price, 
            "status": o.status, "timestamp": o.timestamp, "image_url": img_url,
            "lat": o.lat, "lng": o.lng 
        })
        
    return jsonify({"status": "SUCCESS", "orders": enriched_orders})


@app.route('/profile', methods=['GET', 'POST'])
def handle_profile():
    sess_id = request.args.get('sess_id') or (request.json and request.json.get('sess_id'))
    valid = cust_stub.ValidateSession(ecommerce_pb2.SessionRequest(sess_id=sess_id))
    if not valid.success: return jsonify({"status": "FAIL", "message": "Login First"})

    if request.method == 'GET':
        user_data = cust_stub.GetUserData(ecommerce_pb2.UserRequest(query=valid.username))
        if user_data.success:
            return jsonify({
                "status": "SUCCESS", 
                "username": valid.username,
                "email": user_data.email, 
                "photo_url": user_data.photo_url
            })
        return jsonify({"status": "FAIL"})
        
    if request.method == 'POST':
        data = request.json
        resp = cust_stub.UpdateProfile(ecommerce_pb2.UpdateProfileRequest(
            username=valid.username,
            email=data.get('email', ''),
            photo_url=data.get('photo_url', '')
        ))
        return jsonify({"status": "SUCCESS" if resp.success else "FAIL", "message": resp.message})

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

            # --- THE COMPLETE 50-STATE TAX ENGINE IN PYTHON ---
            STATE_TAX_RATES = {
                'AL': 0.0400, 'AK': 0.0000, 'AZ': 0.0560, 'AR': 0.0650, 'CA': 0.0725, 
                'CO': 0.0290, 'CT': 0.0635, 'DE': 0.0000, 'FL': 0.0600, 'GA': 0.0400, 
                'HI': 0.0400, 'ID': 0.0600, 'IL': 0.0625, 'IN': 0.0700, 'IA': 0.0600, 
                'KS': 0.0650, 'KY': 0.0600, 'LA': 0.0445, 'ME': 0.0550, 'MD': 0.0600, 
                'MA': 0.0625, 'MI': 0.0600, 'MN': 0.0688, 'MS': 0.0700, 'MO': 0.0423, 
                'MT': 0.0000, 'NE': 0.0550, 'NV': 0.0685, 'NH': 0.0000, 'NJ': 0.0663, 
                'NM': 0.0513, 'NY': 0.0400, 'NC': 0.0475, 'ND': 0.0500, 'OH': 0.0575, 
                'OK': 0.0450, 'OR': 0.0000, 'PA': 0.0600, 'RI': 0.0700, 'SC': 0.0600, 
                'SD': 0.0450, 'TN': 0.0700, 'TX': 0.0625, 'UT': 0.0610, 'VT': 0.0600, 
                'VA': 0.0530, 'WA': 0.0650, 'WV': 0.0600, 'WI': 0.0500, 'WY': 0.0400,
                'DC': 0.0600
            }
            
            user_state = data.get('state', '').strip().upper()
            # Default to 0.0 if the state is somehow missing, so it aligns with frontend math!
            tax_rate = STATE_TAX_RATES.get(user_state, 0.0) 
            
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
                
                now_str = datetime.datetime.now().strftime("%b %d, %Y at %I:%M %p")

                final_price = (p_resp.price * item['qty']) - discount_amount
                
                item_tax = final_price * tax_rate 
                final_billed_item = final_price + item_tax 

                order_items.append(ecommerce_pb2.Order(
                    order_id=str(uuid.uuid4()), buyer=valid.username, seller=p_resp.seller,
                    item_id=item['id'], item_name=p_resp.name, qty=item['qty'],
                    total_price=round(final_billed_item, 2),
                    status="PROCESSING", timestamp=now_str,
                    lat=float(data.get('lat', 37.3382)), 
                    lng=float(data.get('lng', -121.8863)) 
                ))
            
            for item in cart:
                prod_stub.UpdateQty(ecommerce_pb2.UpdateQtyRequest(item_id=item['id'], qty_change=item['qty']))
            cust_stub.PlaceOrder(ecommerce_pb2.PlaceOrderRequest(buyer=valid.username, items=order_items))
            cust_stub.ClearCart(ecommerce_pb2.SessionRequest(sess_id=sess_id))
            cust_stub.SaveCart(ecommerce_pb2.SessionRequest(sess_id=sess_id))

            user_data = cust_stub.GetUserData(ecommerce_pb2.UserRequest(query=valid.username))
            if user_data.success and user_data.email:
                cart_subtotal = round(sum(p_resp.price * item['qty'] for item in cart for p_resp in [prod_stub.GetItem(ecommerce_pb2.IDRequest(id=item['id']))] if p_resp.success), 2)
                cart_discount = round(total_savings, 2)
                
                cart_tax = round((cart_subtotal - cart_discount) * tax_rate, 2)
                cart_final_billed = round((cart_subtotal - cart_discount) + cart_tax, 2)

                send_order_confirmation(
                    user_data.email, 
                    order_items, 
                    data, 
                    cart_subtotal, 
                    cart_discount, 
                    cart_tax, 
                    cart_final_billed
                )
            
            success_msg = "Payment Approved & Orders Created!"
            if total_savings > 0:
                success_msg = f"Payment Approved! Promo Applied: You saved ${round(total_savings, 2)}!"
            elif promo_code:
                success_msg = f"Payment Approved. (Note: Promo '{promo_code}' was invalid or did not apply to your items)."
                
            return jsonify({"status": "SUCCESS", "message": success_msg,"order_id": order_items[0].order_id[:8].upper()})
        
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