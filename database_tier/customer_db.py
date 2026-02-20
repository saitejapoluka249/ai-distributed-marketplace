import grpc
from concurrent import futures
import time
import json
import sqlite3
import threading

import ecommerce_pb2
import ecommerce_pb2_grpc

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
        username TEXT UNIQUE, password TEXT, role TEXT,
        feedback_up INTEGER DEFAULT 0, feedback_down INTEGER DEFAULT 0,
        saved_cart TEXT DEFAULT '[]', cart_version INTEGER DEFAULT 0,
        purchase_history TEXT DEFAULT '[]')''')
    cursor.execute('''CREATE TABLE IF NOT EXISTS sessions (
        sess_id TEXT PRIMARY KEY, username TEXT, last_active REAL,
        current_cart TEXT DEFAULT '[]', cart_version INTEGER DEFAULT 0)''')
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
        uid = self._execute("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", 
                            (request.username, request.password, request.role), commit=True)
        if uid:
            return ecommerce_pb2.RegisterResponse(success=True, message="Created", user_id=uid)
        return ecommerce_pb2.RegisterResponse(success=False, message="User exists")

    def Login(self, request, context):
        row = self._execute(
        "SELECT id FROM users WHERE username = ? AND password = ? AND role = ?", 
        (request.username, request.password, request.role), 
        fetch_one=True
        )
        if row:
            return ecommerce_pb2.LoginResponse(success=True, message="Login Success")
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

    def ValidateSession(self, request, context):
        row = self._execute("SELECT username, last_active FROM sessions WHERE sess_id = ?", (request.sess_id,), fetch_one=True)
        if row:
            if (time.time() - row[1]) > 300: 
                self._execute("DELETE FROM sessions WHERE sess_id = ?", (request.sess_id,), commit=True)
                return ecommerce_pb2.ValidateResponse(success=False, username="")
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
    

    def AddPurchasedItems(self, request, context):
        row = self._execute("SELECT purchase_history FROM users WHERE username = ?", (request.username,), fetch_one=True)
        if row:
            history = json.loads(row[0])
            new_items = json.loads(request.items_json)
            history.extend(new_items)
            
            self._execute("UPDATE users SET purchase_history = ? WHERE username = ?", (json.dumps(history), request.username), commit=True)
        return ecommerce_pb2.Empty()

    def GetUserData(self, request, context):
        if request.query.isdigit():
            row = self._execute("SELECT * FROM users WHERE id = ?", (int(request.query),), fetch_one=True)
        else:
            row = self._execute("SELECT * FROM users WHERE username = ?", (request.query,), fetch_one=True)
        
        if row:
            return ecommerce_pb2.UserResponse(success=True, id=row[0], role=row[3], fb_up=row[4], fb_down=row[5], purchase_history_json=row[8])
        return ecommerce_pb2.UserResponse(success=False)

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
    server.add_insecure_port('[::]:50051')
    print("Customer DB (gRPC) running on 50051...")
    server.start()
    server.wait_for_termination()

if __name__ == '__main__':
    serve()