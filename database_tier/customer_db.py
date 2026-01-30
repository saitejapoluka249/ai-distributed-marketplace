import threading
import json
import time 
import copy 
from common.protocol import send_msg, recv_msg
from common.tcp_base import TCPServer

users = {}   
sessions = {} 

def create_seller(username, password, uid):
    return {
        "password": password,
        "role": "SELLER",
        "id": uid, 
        "feedback": {"up": 0, "down": 0}, 
        "items_sold": 0 
    }

def create_buyer(username, password, uid):
    return {
        "password": password,
        "role": "BUYER",
        "id": uid, 
        "items_purchased": 0, 
        "saved_cart": [], 
        "purchase_history": [] 
    }

user_id_counter = 100

def handle_client(conn, addr):
    global user_id_counter
    while True:
        msg = recv_msg(conn)
        if not msg: break
        
        parts = msg.split("|")
        cmd = parts[0]
        
        if cmd == "REGISTER":
            role, user, pwd = parts[1], parts[2], parts[3]
            if user in users:
                send_msg(conn, "FAIL|User exists")
            else:
                uid = user_id_counter
                user_id_counter += 1
                if role == "SELLER":
                    users[user] = create_seller(user, pwd, uid)
                else:
                    users[user] = create_buyer(user, pwd, uid)
                send_msg(conn, f"SUCCESS|{uid}")

        elif cmd == "LOGIN":
            user, pwd = parts[1], parts[2]
            if users.get(user) and users[user]['password'] == pwd:
                send_msg(conn, "SUCCESS")
            else:
                send_msg(conn, "FAIL|Invalid credentials")
        
        elif cmd == "SAVE_SESSION":
            sid, user = parts[1], parts[2]
            session_data = {
                "user": user,
                "last_active": time.time()
            }
            
            if users[user]['role'] == "BUYER":
                session_data['cart'] = copy.deepcopy(users[user]['saved_cart'])
            
            sessions[sid] = session_data
            send_msg(conn, "SUCCESS")

        elif cmd == "VALIDATE_SESSION":
            sid = parts[1]
            if sid in sessions:
                if (time.time() - sessions[sid]['last_active']) > 300: 
                    del sessions[sid] 
                    send_msg(conn, "FAIL|Session Expired")
                else:
                    sessions[sid]['last_active'] = time.time()
                    send_msg(conn, f"SUCCESS|{sessions[sid]['user']}")
            else:
                send_msg(conn, "FAIL|Invalid Session")

        elif cmd == "LOGOUT":
            sid = parts[1]
            if sid in sessions:
                del sessions[sid]
            send_msg(conn, "SUCCESS")

        elif cmd == "SAVE_CART":
            sid = parts[1]
            if sid in sessions:
                user = sessions[sid]['user']
                users[user]['saved_cart'] = copy.deepcopy(sessions[sid]['cart'])
                send_msg(conn, "SUCCESS")
            else:
                send_msg(conn, "FAIL")

        elif cmd == "GET_CART": 
            sid = parts[1]
            if sid in sessions:
                cart_data = {"cart": sessions[sid].get('cart', [])}
                send_msg(conn, f"SUCCESS|{json.dumps(cart_data)}")
            else:
                send_msg(conn, "FAIL")

        elif cmd == "GET_USER_DATA":
            target = parts[1]
            found = None
            if target in users: found = users[target]
            else:
                try:
                    tid = int(target)
                    for u in users.values(): 
                        if u['id'] == tid: found = u; break
                except: pass
            if found: send_msg(conn, f"SUCCESS|{json.dumps(found)}")
            else: send_msg(conn, "FAIL|User not found")

        elif cmd == "CART_OP":
            sid, op = parts[1], parts[2]
            
            if sid in sessions:
                cart = sessions[sid].get('cart', []) 
                
                if op == "add":
                    item_id, qty = parts[3], int(parts[4])
                    cart.append({'id': item_id, 'qty': qty})
                
                elif op == "remove":
                    item_id, qty = parts[3], int(parts[4])
                    new_cart = []
                    for item in cart:
                        if item['id'] == item_id and qty > 0:
                             if item['qty'] > qty:
                                 item['qty'] -= qty
                                 new_cart.append(item)
                                 qty = 0
                             else: qty -= item['qty']
                        else: new_cart.append(item)
                    cart = new_cart
                
                elif op == "clear":
                    cart = []
                
                sessions[sid]['cart'] = cart 
                send_msg(conn, "SUCCESS")
            else:
                send_msg(conn, "FAIL")
                
        elif cmd == "UPDATE_FEEDBACK":
            target, type_ = parts[1], parts[2]
            if target in users:
                if type_ == "up": users[target]['feedback']['up'] += 1
                elif type_ == "down": users[target]['feedback']['down'] += 1
                send_msg(conn, "SUCCESS")
            else: send_msg(conn, "FAIL")

    conn.close()

def main():
    server = TCPServer.start_listening(5001)
    print("[DATABASE] Customer DB online on 5001...")
    while True:
        conn, addr = server.accept()
        threading.Thread(target=handle_client, args=(conn, addr), daemon=True).start()

if __name__ == "__main__":
    main()