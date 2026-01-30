import threading
import json
from common.protocol import send_msg, recv_msg
from common.tcp_base import TCPServer

items = {} 
id_counters = {} 

def handle_client(conn, addr):
    while True:
        msg = recv_msg(conn)
        if not msg: break
        
        parts = msg.split("|")
        req_type = parts[0]
        
        if req_type == "REGISTER_ITEM":
            name, item_category, keywds, item_condition, price, qty, seller = parts[1], parts[2], parts[3], parts[4], parts[5], parts[6], parts[7]
            
            if item_category not in id_counters: id_counters[item_category] = 1
            item_id = f"{item_category}.{id_counters[item_category]}"
            id_counters[item_category] += 1
            
            items[item_id] = {
                "name": name, 
                "category": int(item_category),
                "keywords": keywds.split(","), 
                "condition": item_condition, 
                "price": float(price),
                "quantity": int(qty),
                "seller": seller,
                "feedback": {"up": 0, "down": 0} 
            }
            send_msg(conn, f"SUCCESS|{item_id}")

        elif req_type == "GET_SELLER_ITEMS":
            seller_name = parts[1]
            my_items = []
            for item_id, data in items.items():
                if data['seller'] == seller_name:
                    my_items.append(f"ID:{item_id} | {data['name']} (${data['price']}) Qty:{data['quantity']}")
            if my_items:
                send_msg(conn, "SUCCESS|" + "\n".join(my_items))
            else:
                send_msg(conn, "SUCCESS|No items found.")

        elif req_type == "GET_ITEM": 
            item_id = parts[1]
            if item_id in items:
                send_msg(conn, f"SUCCESS|{json.dumps(items[item_id])}")
            else:
                send_msg(conn, "FAIL|Item not found")

        elif req_type == "SEARCH": 
            item_category, keyword_strings = int(parts[1]), parts[2]
            search_keywords = keyword_strings.split(",")
            results = []
            
            for item_id, data in items.items():
                if data['category'] == item_category:
                    match = False
                    for sk in search_keywords:
                        if sk in data['name'] or sk in data['keywords']:
                            match = True
                            break
                    if match:
                        results.append(f"{item_id}: {data['name']} (${data['price']})")
            
            send_msg(conn, "SUCCESS|" + ";".join(results))

        elif req_type == "UPDATE_PRICE": 
            item_id, price = parts[1], parts[2]
            if item_id in items:
                items[item_id]['price'] = float(price)
                send_msg(conn, "SUCCESS")
            else: send_msg(conn, "FAIL|Item not found")

        elif req_type == "UPDATE_QTY": 
            item_id, qty_to_be_remove = parts[1], int(parts[2])
            if item_id in items:
                if items[item_id]['quantity'] >= qty_to_be_remove:
                    items[item_id]['quantity'] -= qty_to_be_remove
                    send_msg(conn, f"SUCCESS|New Qty: {items[item_id]['quantity']}")
                else:
                    send_msg(conn, "FAIL|Insufficient Quantity")
            else: send_msg(conn, "FAIL|Item not found")
            
        elif req_type == "ITEM_FEEDBACK": 
            item_id, type_ = parts[1], parts[2]
            if item_id in items:
                if type_ == "up": items[item_id]['feedback']['up'] += 1
                else: items[item_id]['feedback']['down'] += 1
                send_msg(conn, "SUCCESS")
            else: send_msg(conn, "FAIL")

    conn.close()

def main():
    server = TCPServer.start_listening(5002)
    print("[DATABASE] Product DB running on 5002...")
    while True:
        conn, addr = server.accept()
        threading.Thread(target=handle_client, args=(conn, addr), daemon=True).start()

if __name__ == "__main__":
    main()