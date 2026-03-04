import grpc
from concurrent import futures
import time
import json
import sqlite3
import threading

import ecommerce_pb2
import ecommerce_pb2_grpc
import os
import bcrypt
from dotenv import load_dotenv

load_dotenv()

CUSTOMER_DB_PORT = os.getenv("CUSTOMER_DB_PORT", "60051")

DB_NAME = "customers.db"
db_lock = threading.Lock()

def get_db_connection():
    return sqlite3.connect(DB_NAME)

def init_db():
    conn = get_db_connection()
    conn.execute("PRAGMA journal_mode=WAL")
    cursor = conn.cursor()
    cursor.execute('''CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            username TEXT UNIQUE, 
            password TEXT, 
            role TEXT,
            feedback_up INTEGER DEFAULT 0, 
            feedback_down INTEGER DEFAULT 0,
            saved_cart TEXT DEFAULT '[]', 
            cart_version INTEGER DEFAULT 0,
            purchase_history TEXT DEFAULT '[]',
            wishlist TEXT DEFAULT '[]',
            email TEXT DEFAULT '',
            photo_url TEXT DEFAULT ''
        )''')
    cursor.execute('''CREATE TABLE IF NOT EXISTS sessions (
        sess_id TEXT PRIMARY KEY, username TEXT, last_active REAL,
        current_cart TEXT DEFAULT '[]', cart_version INTEGER DEFAULT 0)''')
    cursor.execute('''CREATE TABLE IF NOT EXISTS orders (
            order_id TEXT PRIMARY KEY, buyer TEXT, seller TEXT, 
            item_id TEXT, item_name TEXT, qty INTEGER, 
            total_price REAL, status TEXT, timestamp TEXT,
            lat REAL, lng REAL)''') 
    conn.commit()
    conn.close()

class CustomerService(ecommerce_pb2_grpc.CustomerServiceServicer):
    
    def _execute(self, query, params=(), fetch_one=False, fetch_all=False, commit=False):
        conn = get_db_connection()
        cursor = conn.cursor()
        res = None
        try:
            with db_lock:
                cursor.execute(query, params)
                if commit: conn.commit()
                if fetch_one: res = cursor.fetchone()
                if fetch_all: res = cursor.fetchall()
                if commit and not fetch_one and not fetch_all: res = cursor.lastrowid
        except Exception as e:
            print(f"DB Error: {e}")
        finally:
            conn.close()
        return res

    def Register(self, request, context):
        print(f"[REGISTER] {request.username}")
        
        salt = bcrypt.gensalt()
        hashed_pw = bcrypt.hashpw(request.password.encode('utf-8'), salt).decode('utf-8')
        
        uid = self._execute("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", 
                            (request.username, hashed_pw, request.role), commit=True)
        if uid:
            return ecommerce_pb2.RegisterResponse(success=True, message="Created", user_id=uid)
        return ecommerce_pb2.RegisterResponse(success=False, message="User exists")

    def Login(self, request, context):
        row = self._execute(
            "SELECT id, password FROM users WHERE username = ? AND role = ?", 
            (request.username, request.role), 
            fetch_one=True
        )
        
        if row:
            stored_hash = row[1].encode('utf-8')
            try:
                if bcrypt.checkpw(request.password.encode('utf-8'), stored_hash):
                    return ecommerce_pb2.LoginResponse(success=True, message="Login Success")
            except ValueError:
                pass
                
        return ecommerce_pb2.LoginResponse(success=False, message="Invalid Credentials or Wrong Account Type")

    def SaveSession(self, request, context):
        user_row = self._execute("SELECT role, saved_cart, cart_version FROM users WHERE username = ?", (request.username,), fetch_one=True)
        cart_json = "[]"
        cart_ver = 0
        if user_row and user_row[0] == "BUYER":
            cart_json = user_row[1]
            cart_ver = user_row[2]

        self._execute("INSERT OR REPLACE INTO sessions (sess_id, username, last_active, current_cart, cart_version) VALUES (?, ?, ?, ?, ?)",
                      (request.sess_id, request.username, time.time(), cart_json, cart_ver), commit=True)
        return ecommerce_pb2.Empty()
    

    def PlaceOrder(self, request, context):
        import time
        for item in request.items:
            self._execute("INSERT INTO orders (order_id, buyer, seller, item_id, item_name, qty, total_price, status, timestamp, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                          (item.order_id, item.buyer, item.seller, item.item_id, item.item_name, item.qty, item.total_price, item.status, item.timestamp, item.lat, item.lng), commit=True)
        return ecommerce_pb2.ResponseMsg(success=True, message="Order Placed")

    def GetBuyerOrders(self, request, context):
        rows = self._execute("SELECT order_id, buyer, seller, item_id, item_name, qty, total_price, status, timestamp, lat, lng FROM orders WHERE buyer = ?", (request.query,), fetch_all=True) 
        
        orders = [ecommerce_pb2.Order(
            order_id=r[0], buyer=r[1], seller=r[2], item_id=r[3], 
            item_name=r[4], qty=r[5], total_price=r[6], status=r[7],
            timestamp=r[8] if r[8] else "Unknown",
            lat=r[9] if r[9] else 0.0, lng=r[10] if r[10] else 0.0 # NEW
        ) for r in rows]
        return ecommerce_pb2.OrderResponse(success=True, orders=orders)

    def GetSellerOrders(self, request, context):
        rows = self._execute("SELECT order_id, buyer, seller, item_id, item_name, qty, total_price, status, timestamp, lat, lng FROM orders WHERE seller = ?", (request.query,), fetch_all=True) 
        
        orders = [ecommerce_pb2.Order(
            order_id=r[0], buyer=r[1], seller=r[2], item_id=r[3], 
            item_name=r[4], qty=r[5], total_price=r[6], status=r[7],
            timestamp=r[8] if r[8] else "Unknown",
            lat=r[9] if r[9] else 0.0, lng=r[10] if r[10] else 0.0 # NEW
        ) for r in rows]
        return ecommerce_pb2.OrderResponse(success=True, orders=orders)

    def UpdateOrderStatus(self, request, context):
        row = self._execute("SELECT 1 FROM orders WHERE order_id = ?", (request.order_id,), fetch_one=True)
        if not row:
            return ecommerce_pb2.ResponseMsg(success=False, message="Invalid Order ID. Order not found.")
        
        self._execute("UPDATE orders SET status = ? WHERE order_id = ?", (request.new_status, request.order_id), commit=True)
        return ecommerce_pb2.ResponseMsg(success=True, message="Order status updated successfully!")
    

    def ValidateSession(self, request, context):
        row = self._execute("SELECT username FROM sessions WHERE sess_id = ?", (request.sess_id,), fetch_one=True)
        if row:
            self._execute("UPDATE sessions SET last_active = ? WHERE sess_id = ?", (time.time(), request.sess_id), commit=True)
            return ecommerce_pb2.ValidateResponse(success=True, username=row[0])
            
        return ecommerce_pb2.ValidateResponse(success=False, username="")

    def Logout(self, request, context):
        self._execute("DELETE FROM sessions WHERE sess_id = ?", (request.sess_id,), commit=True)
        return ecommerce_pb2.Empty()

    def GetCart(self, request, context):
        sess_row = self._execute("SELECT username, current_cart, cart_version FROM sessions WHERE sess_id = ?", (request.sess_id,), fetch_one=True)
        if not sess_row: return ecommerce_pb2.CartResponse(success=False, cart_json="[]")
        
        username, sess_cart, sess_ver = sess_row
        user_row = self._execute("SELECT saved_cart, cart_version FROM users WHERE username = ?", (username,), fetch_one=True)
        
        if user_row:
            saved_cart, saved_ver = user_row
            if saved_ver > sess_ver:
                sess_cart = saved_cart
                self._execute("UPDATE sessions SET current_cart = ?, cart_version = ? WHERE sess_id = ?", (sess_cart, saved_ver, request.sess_id), commit=True)
        
        return ecommerce_pb2.CartResponse(success=True, cart_json=sess_cart)

    def AddToCart(self, request, context):
        row = self._execute("SELECT current_cart FROM sessions WHERE sess_id = ?", (request.sess_id,), fetch_one=True)
        if row:
            cart = json.loads(row[0])
            found = False
            for item in cart:
                if item['id'] == request.item_id:
                    item['qty'] += request.qty
                    found = True
                    break
            if not found: cart.append({'id': request.item_id, 'qty': request.qty})
            self._execute("UPDATE sessions SET current_cart = ? WHERE sess_id = ?", (json.dumps(cart), request.sess_id), commit=True)
            return ecommerce_pb2.ResponseMsg(success=True)
        return ecommerce_pb2.ResponseMsg(success=False, message="Invalid Session")

    def RemoveFromCart(self, request, context):
        row = self._execute("SELECT current_cart FROM sessions WHERE sess_id = ?", (request.sess_id,), fetch_one=True)
        if row:
            cart = json.loads(row[0])
            new_cart = []
            item_found = False
            error_msg = None

            for item in cart:
                if item['id'] == request.item_id:
                    item_found = True
                    
                    if request.qty > item['qty']:
                        error_msg = f"Cannot remove {request.qty}. You only have {item['qty']} in cart."
                        new_cart.append(item) 
                    elif request.qty == item['qty']:
                        pass 
                    else:
                        item['qty'] -= request.qty
                        new_cart.append(item)
                else:
                    new_cart.append(item)

            if not item_found:
                return ecommerce_pb2.ResponseMsg(success=False, message="Item not in cart")
            
            if error_msg:
                return ecommerce_pb2.ResponseMsg(success=False, message=error_msg)

            self._execute("UPDATE sessions SET current_cart = ? WHERE sess_id = ?", (json.dumps(new_cart), request.sess_id), commit=True)
            return ecommerce_pb2.ResponseMsg(success=True, message="Item removed")
            
        return ecommerce_pb2.ResponseMsg(success=False, message="Session Invalid")

    def ClearCart(self, request, context):
        self._execute("UPDATE sessions SET current_cart = '[]' WHERE sess_id = ?", (request.sess_id,), commit=True)
        return ecommerce_pb2.Empty()

    def SaveCart(self, request, context):
        row = self._execute("SELECT username, current_cart FROM sessions WHERE sess_id = ?", (request.sess_id,), fetch_one=True)
        if row:
            username, sess_cart = row
            ver_row = self._execute("SELECT cart_version FROM users WHERE username = ?", (username,), fetch_one=True)
            new_ver = (ver_row[0] if ver_row else 0) + 1
            
            self._execute("UPDATE users SET saved_cart = ?, cart_version = ? WHERE username = ?", (sess_cart, new_ver, username), commit=True)
            self._execute("UPDATE sessions SET cart_version = ? WHERE sess_id = ?", (new_ver, request.sess_id), commit=True)
            return ecommerce_pb2.ResponseMsg(success=True)
        return ecommerce_pb2.ResponseMsg(success=False)
    

    def GetWishlist(self, request, context):
        row = self._execute("SELECT username FROM sessions WHERE sess_id = ?", (request.sess_id,), fetch_one=True)
        if not row: return ecommerce_pb2.WishlistResponse(success=False)
        
        u_row = self._execute("SELECT wishlist FROM users WHERE username = ?", (row[0],), fetch_one=True)
        return ecommerce_pb2.WishlistResponse(success=True, wishlist_json=u_row[0] if u_row else "[]")

    def AddToWishlist(self, request, context):
        row = self._execute("SELECT username FROM sessions WHERE sess_id = ?", (request.sess_id,), fetch_one=True)
        if not row: return ecommerce_pb2.ResponseMsg(success=False, message="Invalid Session")
        
        u_row = self._execute("SELECT wishlist FROM users WHERE username = ?", (row[0],), fetch_one=True)
        w_list = json.loads(u_row[0]) if u_row and u_row[0] else []
        
        if request.item_id not in w_list:
            w_list.append(request.item_id)
            self._execute("UPDATE users SET wishlist = ? WHERE username = ?", (json.dumps(w_list), row[0]), commit=True)
            return ecommerce_pb2.ResponseMsg(success=True, message="Added to Wishlist!")
            
        return ecommerce_pb2.ResponseMsg(success=False, message="Item is already in your wishlist.")

    def RemoveFromWishlist(self, request, context):
        row = self._execute("SELECT username FROM sessions WHERE sess_id = ?", (request.sess_id,), fetch_one=True)
        if not row: return ecommerce_pb2.ResponseMsg(success=False, message="Invalid Session")
        
        u_row = self._execute("SELECT wishlist FROM users WHERE username = ?", (row[0],), fetch_one=True)
        w_list = json.loads(u_row[0]) if u_row and u_row[0] else []
        
        if request.item_id in w_list:
            w_list.remove(request.item_id)
            self._execute("UPDATE users SET wishlist = ? WHERE username = ?", (json.dumps(w_list), row[0]), commit=True)
            return ecommerce_pb2.ResponseMsg(success=True, message="Removed from Wishlist.")
            
        return ecommerce_pb2.ResponseMsg(success=False, message="Item not found in wishlist.")
    

    def AddPurchasedItems(self, request, context):
        row = self._execute("SELECT purchase_history FROM users WHERE username = ?", (request.username,), fetch_one=True)
        if row:
            history = json.loads(row[0])
            new_items = json.loads(request.items_json)
            history.extend(new_items)
            
            self._execute("UPDATE users SET purchase_history = ? WHERE username = ?", (json.dumps(history), request.username), commit=True)
        return ecommerce_pb2.Empty()

    def GetUserData(self, request, context):
        user = self._execute("SELECT id, role, email, photo_url FROM users WHERE username = ?", (request.query,), fetch_one=True)
        if user:
            orders = self._execute("SELECT item_id FROM orders WHERE buyer = ?", (request.query,), fetch_all=True)
            history = json.dumps([o[0] for o in orders])

            return ecommerce_pb2.UserResponse(
                success=True, id=user[0], role=user[1], fb_up=0, fb_down=0, 
                purchase_history_json=history,
                email=user[2], photo_url=user[3]
            )
        return ecommerce_pb2.UserResponse(success=False)
    
    def UpdateProfile(self, request, context):
        try:
            self._execute(
                "UPDATE users SET email = ?, photo_url = ? WHERE username = ?", 
                (request.email, request.photo_url, request.username), 
                commit=True
            )
            return ecommerce_pb2.ResponseMsg(success=True, message="Profile updated!")
        except Exception as e:
            return ecommerce_pb2.ResponseMsg(success=False, message=str(e))

def serve():
    init_db()
    server = grpc.server(
        futures.ThreadPoolExecutor(max_workers=100),
        options=[
            ('grpc.max_concurrent_streams', 200),
            ('grpc.max_receive_message_length', 16 * 1024 * 1024),
        ]
    )
    ecommerce_pb2_grpc.add_CustomerServiceServicer_to_server(CustomerService(), server)
    server.add_insecure_port(f"[::]:{CUSTOMER_DB_PORT}")
    print("Customer DB (gRPC) running on 60051...")
    server.start()
    server.wait_for_termination()

if __name__ == '__main__':
    serve()