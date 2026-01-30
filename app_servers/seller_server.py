import threading
import uuid
import json
from common.protocol import send_msg, recv_msg
from common.tcp_base import TCPServer, TCPClient

# REMOVED GLOBAL CONNECTIONS to prevent race conditions

def handle_client(conn, addr):
    # --- FIX: Create unique DB connections for THIS specific thread ---
    # This ensures every seller gets their own private "phone line" to the DBs.
    cust_db = TCPClient('localhost', 5001)
    cust_db.connect()
    
    prod_db = TCPClient('localhost', 5002)
    prod_db.connect()
    # ------------------------------------------------------------------

    print(f"[NEW SELLER CONNECTION] {addr}")

    try:
        while True:
            # Receive request from the Seller Client
            msg = recv_msg(conn)
            if not msg: break
            
            parts = msg.split("|")
            cmd = parts[0]

            if cmd == "CREATE_ACCOUNT": 
                # Use local 'cust_db'
                resp = cust_db.send_receive(f"REGISTER|SELLER|{parts[1]}|{parts[2]}")
                send_msg(conn, resp)

            elif cmd == "LOGIN": 
                resp = cust_db.send_receive(f"LOGIN|{parts[1]}|{parts[2]}")
                if "SUCCESS" in resp:
                    sid = str(uuid.uuid4())
                    cust_db.send_receive(f"SAVE_SESSION|{sid}|{parts[1]}")
                    send_msg(conn, f"SUCCESS|{sid}")
                else:
                    send_msg(conn, resp)

            elif cmd == "LOGOUT": 
                sid = parts[1]
                cust_db.send_receive(f"LOGOUT|{sid}")
                send_msg(conn, "SUCCESS")

            elif cmd == "GET_RATING": 
                sid = parts[1]
                user_resp = cust_db.send_receive(f"VALIDATE_SESSION|{sid}")
                if "FAIL" in user_resp:
                    send_msg(conn, "FAIL|Login First")
                    continue
                username = user_resp.split("|")[1]
                data_resp = cust_db.send_receive(f"GET_USER_DATA|{username}")
                if "SUCCESS" in data_resp:
                    json_str = data_resp.split("|")[1]
                    user_data = json.loads(json_str)
                    fb = user_data['feedback'] 
                    send_msg(conn, f"SUCCESS|Thumbs Up: {fb['up']}, Thumbs Down: {fb['down']}")
                else:
                    send_msg(conn, "FAIL|Could not fetch data")

            elif cmd == "REGISTER_ITEM": 
                # Parsing all parts safely
                sid, name, cat, kws, cond, price, qty = parts[1], parts[2], parts[3], parts[4], parts[5], parts[6], parts[7]
                
                user_resp = cust_db.send_receive(f"VALIDATE_SESSION|{sid}")
                if "FAIL" in user_resp:
                    send_msg(conn, "FAIL|Login First") 
                    continue
                seller_name = user_resp.split("|")[1]

                # Validation Logic
                if len(name) > 32:
                    send_msg(conn, "FAIL|Name too long (>32 chars)")
                    continue
                if len(kws.split(",")) > 5:
                    send_msg(conn, "FAIL|Too many keywords (Max 5)")
                    continue
                if cond not in ["New", "Used"]:
                    send_msg(conn, "FAIL|Condition must be 'New' or 'Used'")
                    continue

                # Use local 'prod_db'
                db_msg = f"REGISTER_ITEM|{name}|{cat}|{kws}|{cond}|{price}|{qty}|{seller_name}"
                resp = prod_db.send_receive(db_msg)
                send_msg(conn, resp)

            elif cmd == "CHANGE_PRICE": 
                sid, iid, price = parts[1], parts[2], parts[3]
                user_resp = cust_db.send_receive(f"VALIDATE_SESSION|{sid}")
                if "FAIL" in user_resp:
                    send_msg(conn, "FAIL|Login First")
                    continue
                resp = prod_db.send_receive(f"UPDATE_PRICE|{iid}|{price}")
                send_msg(conn, resp)
                
            elif cmd == "UPDATE_UNITS": 
                sid, iid, qty = parts[1], parts[2], parts[3]
                user_resp = cust_db.send_receive(f"VALIDATE_SESSION|{sid}")
                if "FAIL" in user_resp:
                    send_msg(conn, "FAIL|Login First")
                    continue
                resp = prod_db.send_receive(f"UPDATE_QTY|{iid}|{qty}")
                send_msg(conn, resp)

            elif cmd == "DISPLAY_ITEMS":  
                sid = parts[1]
                user_resp = cust_db.send_receive(f"VALIDATE_SESSION|{sid}")
                if "FAIL" in user_resp:
                    send_msg(conn, "FAIL|Login First")
                    continue
                username = user_resp.split("|")[1]
                resp = prod_db.send_receive(f"GET_SELLER_ITEMS|{username}")
                send_msg(conn, resp)

    finally:
        # CLEANUP: Crucial for passing the 100/100 test
        # We must close the DB connections when the seller disconnects
        cust_db.close()
        prod_db.close()
        conn.close()

def main():
    # Use TCPServer with high backlog for concurrent load
    server = TCPServer.start_listening(8000)
    print("[APP SERVER] Seller Server listening on 8000...")
    while True:
        conn, addr = server.accept()
        threading.Thread(target=handle_client, args=(conn, addr), daemon=True).start()

if __name__ == "__main__":
    main()