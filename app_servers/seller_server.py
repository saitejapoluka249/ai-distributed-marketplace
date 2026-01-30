import threading
import uuid
import json
from common.protocol import send_msg, recv_msg
from common.tcp_base import TCPServer, TCPClient


def handle_client(conn, addr):
    cust_db = TCPClient('localhost', 5001)
    cust_db.connect()
    
    prod_db = TCPClient('localhost', 5002)
    prod_db.connect()

    print(f"[NEW SELLER CONNECTION] {addr}")

    try:
        while True:
            msg = recv_msg(conn)
            if not msg: break
            
            parts = msg.split("|")
            req_type = parts[0]

            if req_type == "CREATE_ACCOUNT": 
                resp = cust_db.send_receive(f"REGISTER|SELLER|{parts[1]}|{parts[2]}")
                send_msg(conn, resp)

            elif req_type == "LOGIN": 
                resp = cust_db.send_receive(f"LOGIN|{parts[1]}|{parts[2]}")
                if "SUCCESS" in resp:
                    sess_id = str(uuid.uuid4())
                    cust_db.send_receive(f"SAVE_SESSION|{sess_id}|{parts[1]}")
                    send_msg(conn, f"SUCCESS|{sess_id}")
                else:
                    send_msg(conn, resp)

            elif req_type == "LOGOUT": 
                sess_id = parts[1]
                cust_db.send_receive(f"LOGOUT|{sess_id}")
                send_msg(conn, "SUCCESS")

            elif req_type == "GET_RATING": 
                sess_id = parts[1]
                user_output = cust_db.send_receive(f"VALIDATE_SESSION|{sess_id}")
                if "FAIL" in user_output:
                    send_msg(conn, "FAIL|Login First")
                    continue
                username = user_output.split("|")[1]
                data_resp = cust_db.send_receive(f"GET_USER_DATA|{username}")
                if "SUCCESS" in data_resp:
                    json_str = data_resp.split("|")[1]
                    user_data = json.loads(json_str)
                    fb = user_data['feedback'] 
                    send_msg(conn, f"SUCCESS|Thumbs Up: {fb['up']}, Thumbs Down: {fb['down']}")
                else:
                    send_msg(conn, "FAIL|Could not fetch data")

            elif req_type == "REGISTER_ITEM": 
                sess_id, name, cat, kws, cond, price, qty = parts[1], parts[2], parts[3], parts[4], parts[5], parts[6], parts[7]
                
                user_output = cust_db.send_receive(f"VALIDATE_SESSION|{sess_id}")
                if "FAIL" in user_output:
                    send_msg(conn, "FAIL|Login First") 
                    continue
                seller_name = user_output.split("|")[1]

                if len(name) > 32:
                    send_msg(conn, "FAIL|Name too long (>32 chars)")
                    continue
                if len(kws.split(",")) > 5:
                    send_msg(conn, "FAIL|Too many keywords (Max 5)")
                    continue
                if cond not in ["New", "Used"]:
                    send_msg(conn, "FAIL|Condition must be 'New' or 'Used'")
                    continue

                db_msg = f"REGISTER_ITEM|{name}|{cat}|{kws}|{cond}|{price}|{qty}|{seller_name}"
                resp = prod_db.send_receive(db_msg)
                send_msg(conn, resp)

            elif req_type == "CHANGE_PRICE": 
                sess_id, item_id, price = parts[1], parts[2], parts[3]
                user_output = cust_db.send_receive(f"VALIDATE_SESSION|{sess_id}")
                if "FAIL" in user_output:
                    send_msg(conn, "FAIL|Login First")
                    continue
                resp = prod_db.send_receive(f"UPDATE_PRICE|{item_id}|{price}")
                send_msg(conn, resp)
                
            elif req_type == "UPDATE_UNITS": 
                sess_id, item_id, qty = parts[1], parts[2], parts[3]
                user_output = cust_db.send_receive(f"VALIDATE_SESSION|{sess_id}")
                if "FAIL" in user_output:
                    send_msg(conn, "FAIL|Login First")
                    continue
                resp = prod_db.send_receive(f"UPDATE_QTY|{item_id}|{qty}")
                send_msg(conn, resp)

            elif req_type == "DISPLAY_ITEMS":  
                sess_id = parts[1]
                user_output = cust_db.send_receive(f"VALIDATE_SESSION|{sess_id}")
                if "FAIL" in user_output:
                    send_msg(conn, "FAIL|Login First")
                    continue
                username = user_output.split("|")[1]
                resp = prod_db.send_receive(f"GET_SELLER_ITEMS|{username}")
                send_msg(conn, resp)

    finally:
        cust_db.close()
        prod_db.close()
        conn.close()

def main():
    server = TCPServer.start_listening(8000)
    print("[APPLICATION SERVER] Seller Server listening on 8000...")
    while True:
        conn, addr = server.accept()
        threading.Thread(target=handle_client, args=(conn, addr), daemon=True).start()

if __name__ == "__main__":
    main()