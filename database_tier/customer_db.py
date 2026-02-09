import threading
import json
import time 
import sqlite3
from common.protocol import send_msg, recv_msg
from common.tcp_base import TCPServer

DB_NAME = "customers.db"
db_lock = threading.Lock() 

def init_db():
    """Initialize the SQL database with required tables."""
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            role TEXT,
            feedback_up INTEGER DEFAULT 0,
            feedback_down INTEGER DEFAULT 0,
            items_traded INTEGER DEFAULT 0,
            saved_cart TEXT DEFAULT '[]',   -- Storing JSON string
            cart_version INTEGER DEFAULT 0,
            purchase_history TEXT DEFAULT '[]'
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            sess_id TEXT PRIMARY KEY,
            username TEXT,
            last_active REAL,
            current_cart TEXT DEFAULT '[]',
            cart_version INTEGER DEFAULT 0
        )
    ''')
    
    conn.commit()
    conn.close()

def get_db_connection():
    """Helper to get a connection object."""
    return sqlite3.connect(DB_NAME)

def handle_client(conn, addr):
    db_conn = get_db_connection()
    cursor = db_conn.cursor()

    try:
        while True:
            msg = recv_msg(conn)
            if not msg: break
            
            parts = msg.split("|")
            req_type = parts[0]
            
            if req_type == "REGISTER":
                role, user, pwd = parts[1], parts[2], parts[3]
                try:
                    with db_lock:
                        cursor.execute("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", 
                                     (user, pwd, role))
                        db_conn.commit()
                        uid = cursor.lastrowid
                    send_msg(conn, f"SUCCESS|{uid}")
                except sqlite3.IntegrityError:
                    send_msg(conn, "FAIL|User exists")

            elif req_type == "LOGIN":
                user, pwd = parts[1], parts[2]
                cursor.execute("SELECT password FROM users WHERE username = ?", (user,))
                row = cursor.fetchone()
                if row and row[0] == pwd:
                    send_msg(conn, "SUCCESS")
                else:
                    send_msg(conn, "FAIL|Invalid credentials")
            
            elif req_type == "SAVE_SESSION":
                sess_id, user = parts[1], parts[2]
                
                cursor.execute("SELECT role, saved_cart, cart_version FROM users WHERE username = ?", (user,))
                user_row = cursor.fetchone()
                
                cart_json = "[]"
                cart_ver = 0
                
                if user_row:
                    role = user_row[0]
                    if role == "BUYER":
                        cart_json = user_row[1]
                        cart_ver = user_row[2]

                with db_lock:
                    cursor.execute("INSERT OR REPLACE INTO sessions (sess_id, username, last_active, current_cart, cart_version) VALUES (?, ?, ?, ?, ?)",
                                   (sess_id, user, time.time(), cart_json, cart_ver))
                    db_conn.commit()
                
                send_msg(conn, "SUCCESS")

            elif req_type == "VALIDATE_SESSION":
                sess_id = parts[1]
                cursor.execute("SELECT username, last_active FROM sessions WHERE sess_id = ?", (sess_id,))
                row = cursor.fetchone()
                
                if row:
                    username, last_active = row
                    if (time.time() - last_active) > 300: # 5 Mins
                        with db_lock:
                            cursor.execute("DELETE FROM sessions WHERE sess_id = ?", (sess_id,))
                            db_conn.commit()
                        send_msg(conn, "FAIL|Session Expired")
                    else:
                        with db_lock:
                            cursor.execute("UPDATE sessions SET last_active = ? WHERE sess_id = ?", (time.time(), sess_id))
                            db_conn.commit()
                        send_msg(conn, f"SUCCESS|{username}")
                else:
                    send_msg(conn, "FAIL|Invalid Session")

            elif req_type == "LOGOUT":
                sess_id = parts[1]
                with db_lock:
                    cursor.execute("DELETE FROM sessions WHERE sess_id = ?", (sess_id,))
                    db_conn.commit()
                send_msg(conn, "SUCCESS")

            elif req_type == "SAVE_CART":
                sess_id = parts[1]
                
                cursor.execute("SELECT username, current_cart FROM sessions WHERE sess_id = ?", (sess_id,))
                row = cursor.fetchone()
                
                if row:
                    username, sess_cart_json = row
                    
                    with db_lock:
                        cursor.execute("SELECT cart_version FROM users WHERE username = ?", (username,))
                        ver_row = cursor.fetchone()
                        new_ver = (ver_row[0] if ver_row else 0) + 1

                        cursor.execute("UPDATE users SET saved_cart = ?, cart_version = ? WHERE username = ?", 
                                       (sess_cart_json, new_ver, username))
                        
                        cursor.execute("UPDATE sessions SET cart_version = ? WHERE sess_id = ?", (new_ver, sess_id))
                        db_conn.commit()
                        
                    send_msg(conn, "SUCCESS")
                else:
                    send_msg(conn, "FAIL")

            elif req_type == "GET_CART":
                sess_id = parts[1]
                cursor.execute("SELECT username, current_cart, cart_version FROM sessions WHERE sess_id = ?", (sess_id,))
                sess_row = cursor.fetchone()
                
                if sess_row:
                    username, sess_cart_json, sess_ver = sess_row
                    
                    cursor.execute("SELECT saved_cart, cart_version FROM users WHERE username = ?", (username,))
                    user_row = cursor.fetchone()
                    
                    final_cart_json = sess_cart_json
                    
                    if user_row:
                        saved_cart_json, saved_ver = user_row
                        if saved_ver > sess_ver:
                            final_cart_json = saved_cart_json
                            with db_lock:
                                cursor.execute("UPDATE sessions SET current_cart = ?, cart_version = ? WHERE sess_id = ?", 
                                               (final_cart_json, saved_ver, sess_id))
                                db_conn.commit()

                    send_msg(conn, f"SUCCESS|{json.dumps({'cart': json.loads(final_cart_json)})}")
                else:
                    send_msg(conn, "FAIL")

            elif req_type == "GET_USER_DATA":
                target = parts[1]
                if target.isdigit():
                    cursor.execute("SELECT * FROM users WHERE id = ?", (int(target),))
                else:
                    cursor.execute("SELECT * FROM users WHERE username = ?", (target,))
                
                row = cursor.fetchone()
                if row:
                    user_data = {
                        "id": row[0],
                        "role": row[3],
                        "feedback": {"up": row[4], "down": row[5]},
                        "items_traded": row[6],
                        "purchase_history": json.loads(row[9])
                    }
                    send_msg(conn, f"SUCCESS|{json.dumps(user_data)}")
                else:
                    send_msg(conn, "FAIL|User not found")

            elif req_type == "CART_OP":
                sess_id, op = parts[1], parts[2]
                
                cursor.execute("SELECT current_cart FROM sessions WHERE sess_id = ?", (sess_id,))
                row = cursor.fetchone()
                
                if row:
                    cart = json.loads(row[0])
                    
                    if op == "add":
                        item_id, qty = parts[3], int(parts[4])
                        found = False
                        for item in cart:
                            if item['id'] == item_id:
                                item['qty'] += qty
                                found = True
                                break
                        if not found:
                            cart.append({'id': item_id, 'qty': qty})
                    
                    elif op == "remove":
                        item_id, qty = parts[3], int(parts[4])
                        current_total = 0
                        for item in cart:
                             if item['id'] == item_id: current_total += item['qty']

                        if qty > current_total:
                             pass 
                        else:
                            new_cart = []
                            for item in cart:
                                if item['id'] == item_id and qty > 0:
                                     if item['qty'] > qty:
                                         item['qty'] -= qty
                                         new_cart.append(item)
                                         qty = 0
                                     else: 
                                         qty -= item['qty']
                                else:
                                    new_cart.append(item)
                            cart = new_cart
                    
                    elif op == "clear":
                        cart = []
                    
                    with db_lock:
                        cursor.execute("UPDATE sessions SET current_cart = ? WHERE sess_id = ?", 
                                       (json.dumps(cart), sess_id))
                        db_conn.commit()
                        
                    send_msg(conn, "SUCCESS")
                else:
                    send_msg(conn, "FAIL")
                    
            elif req_type == "UPDATE_FEEDBACK":
                target, type_ = parts[1], parts[2]
                col = "feedback_up" if type_ == "up" else "feedback_down"
                with db_lock:
                    if type_ == "up":
                        cursor.execute("UPDATE users SET feedback_up = feedback_up + 1 WHERE username = ?", (target,))
                    else:
                        cursor.execute("UPDATE users SET feedback_down = feedback_down + 1 WHERE username = ?", (target,))
                    db_conn.commit()
                send_msg(conn, "SUCCESS")

    except Exception as e:
        print(f"DB Error: {e}")
    finally:
        db_conn.close()
        conn.close()

def main():
    init_db() 
    server = TCPServer.start_listening(5001)
    print("[DATABASE] Customer DB (SQL) running on 5001...")
    while True:
        conn, addr = server.accept()
        threading.Thread(target=handle_client, args=(conn, addr), daemon=True).start()

if __name__ == "__main__":
    main()