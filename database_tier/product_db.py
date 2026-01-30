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
        cmd = parts[0]
        
        if cmd == "REGISTER_ITEM":
            name, cat, kws, cond, price, qty, seller = parts[1], parts[2], parts[3], parts[4], parts[5], parts[6], parts[7]
            
            if cat not in id_counters: id_counters[cat] = 1
            item_id = f"{cat}.{id_counters[cat]}"
            id_counters[cat] += 1
            
            items[item_id] = {
                "name": name, 
                "category": int(cat),
                "keywords": kws.split(","), 
                "condition": cond, 
                "price": float(price),
                "quantity": int(qty),
                "seller": seller,
                "feedback": {"up": 0, "down": 0} 
            }
            send_msg(conn, f"SUCCESS|{item_id}")

        elif cmd == "GET_SELLER_ITEMS":
            seller_name = parts[1]
            my_items = []
            for iid, data in items.items():
                if data['seller'] == seller_name:
                    my_items.append(f"ID:{iid} | {data['name']} (${data['price']}) Qty:{data['quantity']}")
            if my_items:
                send_msg(conn, "SUCCESS|" + "\n".join(my_items))
            else:
                send_msg(conn, "SUCCESS|No items found.")

        elif cmd == "GET_ITEM": 
            iid = parts[1]
            if iid in items:
                send_msg(conn, f"SUCCESS|{json.dumps(items[iid])}")
            else:
                send_msg(conn, "FAIL|Item not found")

        elif cmd == "SEARCH": 
            cat, kw_str = int(parts[1]), parts[2]
            search_kws = kw_str.split(",")
            results = []
            
            for iid, data in items.items():
                if data['category'] == cat:
                    match = False
                    for sk in search_kws:
                        if sk in data['name'] or sk in data['keywords']:
                            match = True
                            break
                    if match:
                        results.append(f"{iid}: {data['name']} (${data['price']})")
            
            send_msg(conn, "SUCCESS|" + ";".join(results))

        elif cmd == "UPDATE_PRICE": 
            iid, price = parts[1], parts[2]
            if iid in items:
                items[iid]['price'] = float(price)
                send_msg(conn, "SUCCESS")
            else: send_msg(conn, "FAIL|Item not found")

        elif cmd == "UPDATE_QTY": 
            iid, qty_to_remove = parts[1], int(parts[2])
            if iid in items:
                if items[iid]['quantity'] >= qty_to_remove:
                    items[iid]['quantity'] -= qty_to_remove
                    send_msg(conn, f"SUCCESS|New Qty: {items[iid]['quantity']}")
                else:
                    send_msg(conn, "FAIL|Insufficient Quantity")
            else: send_msg(conn, "FAIL|Item not found")
            
        elif cmd == "ITEM_FEEDBACK": 
            iid, type_ = parts[1], parts[2]
            if iid in items:
                if type_ == "up": items[iid]['feedback']['up'] += 1
                else: items[iid]['feedback']['down'] += 1
                send_msg(conn, "SUCCESS")
            else: send_msg(conn, "FAIL")

    conn.close()

def main():
    server = TCPServer.start_listening(5002)
    print("[DATABASE] Product DB online on 5002...")
    while True:
        conn, addr = server.accept()
        threading.Thread(target=handle_client, args=(conn, addr), daemon=True).start()

if __name__ == "__main__":
    main()