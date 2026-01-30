import threading
import uuid
import json
from common.protocol import send_msg, recv_msg
from common.tcp_base import TCPServer, TCPClient

# REMOVED GLOBAL CONNECTIONS HERE to prevent race conditions

def handle_client(conn, addr):
    # --- FIX: Create unique DB connections for THIS specific thread ---
    # This ensures 100 threads can talk to the DB in parallel without mixing data.
    cust_db = TCPClient('localhost', 5001)
    cust_db.connect()
    
    prod_db = TCPClient('localhost', 5002)
    prod_db.connect()
    # ------------------------------------------------------------------

    print(f"[NEW CONNECTION] {addr}")

    try:
        while True:
            # We still use recv_msg(conn) because 'conn' is a raw socket from the user
            msg = recv_msg(conn)
            if not msg: break
            
            parts = msg.split("|")
            cmd = parts[0]

            if cmd == "CREATE_ACCOUNT":
                # Use the local 'cust_db', not the global one
                resp = cust_db.send_receive(f"REGISTER|BUYER|{parts[1]}|{parts[2]}")
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

            elif cmd == "SEARCH":
                sid = parts[1]
                user_resp = cust_db.send_receive(f"VALIDATE_SESSION|{sid}")
                if "FAIL" in user_resp:
                    send_msg(conn, "FAIL|Login First")
                    continue
                resp = prod_db.send_receive(f"SEARCH|{parts[2]}|{parts[3]}")
                send_msg(conn, resp)

            elif cmd == "ADD_TO_CART":
                sid, iid, qty = parts[1], parts[2], int(parts[3])
                user_resp = cust_db.send_receive(f"VALIDATE_SESSION|{sid}")
                if "FAIL" in user_resp:
                    send_msg(conn, "FAIL")
                    continue
                prod_resp = prod_db.send_receive(f"GET_ITEM|{iid}")
                if "FAIL" in prod_resp:
                    send_msg(conn, "FAIL|Item does not exist")
                    continue
                
                item_data = json.loads(prod_resp.split("|")[1])
                if int(item_data['quantity']) >= qty:
                    cust_db.send_receive(f"CART_OP|{sid}|add|{iid}|{qty}")
                    send_msg(conn, "SUCCESS")
                else:
                    send_msg(conn, "FAIL|Not enough stock")

            elif cmd == "REMOVE_FROM_CART":
                sid, iid, qty = parts[1], parts[2], parts[3]
                user_resp = cust_db.send_receive(f"VALIDATE_SESSION|{sid}")
                if "FAIL" in user_resp:
                    send_msg(conn, "FAIL")
                    continue
                cust_db.send_receive(f"CART_OP|{sid}|remove|{iid}|{qty}")
                send_msg(conn, "SUCCESS")

            elif cmd == "CLEAR_CART":
                sid = parts[1]
                user_resp = cust_db.send_receive(f"VALIDATE_SESSION|{sid}")
                if "FAIL" in user_resp:
                    send_msg(conn, "FAIL")
                    continue
                cust_db.send_receive(f"CART_OP|{sid}|clear|0|0")
                send_msg(conn, "SUCCESS")

            elif cmd == "DISPLAY_CART":
                sid = parts[1]
                user_resp = cust_db.send_receive(f"VALIDATE_SESSION|{sid}")
                if "FAIL" in user_resp:
                    send_msg(conn, "FAIL|Login First")
                    continue
                data_resp = cust_db.send_receive(f"GET_CART|{sid}")
                send_msg(conn, data_resp)

            elif cmd == "PROVIDE_FEEDBACK":
                sid = parts[1]
                user_resp = cust_db.send_receive(f"VALIDATE_SESSION|{sid}")
                if "FAIL" in user_resp:
                    send_msg(conn, "FAIL|Login First")
                    continue
                iid, type_ = parts[2], parts[3]
                resp = prod_db.send_receive(f"ITEM_FEEDBACK|{iid}|{type_}")
                item_resp = prod_db.send_receive(f"GET_ITEM|{iid}")
                if "SUCCESS" in item_resp:
                    item_data = json.loads(item_resp.split("|")[1])
                    seller_name = item_data['seller']
                    cust_db.send_receive(f"UPDATE_FEEDBACK|{seller_name}|{type_}")
                send_msg(conn, resp)

            elif cmd == "GET_SELLER_RATING":
                sid = parts[1]
                user_resp = cust_db.send_receive(f"VALIDATE_SESSION|{sid}")
                if "FAIL" in user_resp:
                    send_msg(conn, "FAIL|Login First")
                    continue
                seller_id = parts[2]
                resp = cust_db.send_receive(f"GET_USER_DATA|{seller_id}")
                if "SUCCESS" in resp:
                    data = json.loads(resp.split("|")[1])
                    if data.get('role') == "SELLER":
                        send_msg(conn, resp)
                    else:
                        send_msg(conn, "FAIL|User is not a Seller")
                else:
                    send_msg(conn, resp)

            elif cmd == "SAVE_CART":
                sid = parts[1]
                user_resp = cust_db.send_receive(f"VALIDATE_SESSION|{sid}")
                if "FAIL" in user_resp:
                    send_msg(conn, "FAIL|Login First")
                    continue
                resp = cust_db.send_receive(f"SAVE_CART|{sid}")
                send_msg(conn, resp)

            elif cmd == "GET_HISTORY":
                sid = parts[1]
                user_resp = cust_db.send_receive(f"VALIDATE_SESSION|{sid}")
                if "FAIL" in user_resp:
                    send_msg(conn, "FAIL|Login First")
                    continue
                username = user_resp.split("|")[1]
                resp = cust_db.send_receive(f"GET_USER_DATA|{username}")
                send_msg(conn, resp)

    finally:
        # Cleanup: Close this thread's unique DB connections
        cust_db.close()
        prod_db.close()
        conn.close()

def main():
    server = TCPServer.start_listening(8001)
    print("[APP SERVER] Buyer Server listening on 8001...")
    while True:
        conn, addr = server.accept()
        threading.Thread(target=handle_client, args=(conn, addr), daemon=True).start()

if __name__ == "__main__":
    main()