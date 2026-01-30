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

    print(f"[NEW ADDRESS CONECTION] {addr}")

    try:
        while True:
            msg = recv_msg(conn)
            if not msg: break
            
            parts = msg.split("|")
            req_type = parts[0]

            if req_type == "CREATE_ACCOUNT":
                resp = cust_db.send_receive(f"REGISTER|BUYER|{parts[1]}|{parts[2]}")
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

            elif req_type == "SEARCH":
                sess_id = parts[1]
                user_output = cust_db.send_receive(f"VALIDATE_SESSION|{sess_id}")
                if "FAIL" in user_output:
                    send_msg(conn, "FAIL|Login First")
                    continue
                resp = prod_db.send_receive(f"SEARCH|{parts[2]}|{parts[3]}")
                send_msg(conn, resp)

            elif req_type == "ADD_TO_CART":
                sess_id, item_id, stock_count = parts[1], parts[2], int(parts[3])
                user_output = cust_db.send_receive(f"VALIDATE_SESSION|{sess_id}")
                if "FAIL" in user_output:
                    send_msg(conn, "FAIL")
                    continue
                product_data = prod_db.send_receive(f"GET_ITEM|{item_id}")
                if "FAIL" in product_data:
                    send_msg(conn, "FAIL|Item does not exist")
                    continue
                
                item_details = json.loads(product_data.split("|")[1])
                if int(item_details['quantity']) >= stock_count:
                    cust_db.send_receive(f"CART_OP|{sess_id}|add|{item_id}|{stock_count}")
                    send_msg(conn, "SUCCESS")
                else:
                    send_msg(conn, "FAIL|Not enough stock")

            elif req_type == "REMOVE_FROM_CART":
                sess_id, item_id, stock_count = parts[1], parts[2], parts[3]
                user_output = cust_db.send_receive(f"VALIDATE_SESSION|{sess_id}")
                if "FAIL" in user_output:
                    send_msg(conn, "FAIL")
                    continue
                cust_db.send_receive(f"CART_OP|{sess_id}|remove|{item_id}|{stock_count}")
                send_msg(conn, "SUCCESS")

            elif req_type == "CLEAR_CART":
                sess_id = parts[1]
                user_output = cust_db.send_receive(f"VALIDATE_SESSION|{sess_id}")
                if "FAIL" in user_output:
                    send_msg(conn, "FAIL")
                    continue
                cust_db.send_receive(f"CART_OP|{sess_id}|clear|0|0")
                send_msg(conn, "SUCCESS")

            elif req_type == "DISPLAY_CART":
                sess_id = parts[1]
                user_output = cust_db.send_receive(f"VALIDATE_SESSION|{sess_id}")
                if "FAIL" in user_output:
                    send_msg(conn, "FAIL|Login First")
                    continue
                data_resp = cust_db.send_receive(f"GET_CART|{sess_id}")
                send_msg(conn, data_resp)

            elif req_type == "PROVIDE_FEEDBACK":
                sess_id = parts[1]
                user_output = cust_db.send_receive(f"VALIDATE_SESSION|{sess_id}")
                if "FAIL" in user_output:
                    send_msg(conn, "FAIL|Login First")
                    continue
                item_id, type_ = parts[2], parts[3]
                resp = prod_db.send_receive(f"ITEM_FEEDBACK|{item_id}|{type_}")
                item_resp = prod_db.send_receive(f"GET_ITEM|{item_id}")
                if "SUCCESS" in item_resp:
                    item_details = json.loads(item_resp.split("|")[1])
                    seller_name = item_details['seller']
                    cust_db.send_receive(f"UPDATE_FEEDBACK|{seller_name}|{type_}")
                send_msg(conn, resp)

            elif req_type == "GET_SELLER_RATING":
                sess_id = parts[1]
                user_output = cust_db.send_receive(f"VALIDATE_SESSION|{sess_id}")
                if "FAIL" in user_output:
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

            elif req_type == "SAVE_CART":
                sess_id = parts[1]
                user_output = cust_db.send_receive(f"VALIDATE_SESSION|{sess_id}")
                if "FAIL" in user_output:
                    send_msg(conn, "FAIL|Login First")
                    continue
                resp = cust_db.send_receive(f"SAVE_CART|{sess_id}")
                send_msg(conn, resp)

            elif req_type == "GET_HISTORY":
                sess_id = parts[1]
                user_output = cust_db.send_receive(f"VALIDATE_SESSION|{sess_id}")
                if "FAIL" in user_output:
                    send_msg(conn, "FAIL|Login First")
                    continue
                username = user_output.split("|")[1]
                resp = cust_db.send_receive(f"GET_USER_DATA|{username}")
                send_msg(conn, resp)

    finally:
        cust_db.close()
        prod_db.close()
        conn.close()

def main():
    server = TCPServer.start_listening(8001)
    print("[APPLICATION SERVER] Buyer Server listening on 8001...")
    while True:
        conn, addr = server.accept()
        threading.Thread(target=handle_client, args=(conn, addr), daemon=True).start()

if __name__ == "__main__":
    main()