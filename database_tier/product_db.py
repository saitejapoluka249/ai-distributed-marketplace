import threading
import json
import sqlite3
from common.protocol import send_msg, recv_msg
from common.tcp_base import TCPServer

DB_NAME = "products.db"
db_lock = threading.Lock()

def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS items (
            item_id TEXT PRIMARY KEY,
            name TEXT,
            category INTEGER,
            keywords TEXT,     -- Comma separated string
            condition TEXT,
            price REAL,
            quantity INTEGER,
            seller TEXT,
            fb_up INTEGER DEFAULT 0,
            fb_down INTEGER DEFAULT 0
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS category_counters (
            category_id INTEGER PRIMARY KEY,
            count INTEGER DEFAULT 1
        )
    ''')
    
    conn.commit()
    conn.close()

def get_db_connection():
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
            
            if req_type == "REGISTER_ITEM":
                name, item_category, keywds, item_condition, price, qty, seller = parts[1], int(parts[2]), parts[3], parts[4], float(parts[5]), int(parts[6]), parts[7]
                
                with db_lock: 
                    cursor.execute("SELECT count FROM category_counters WHERE category_id = ?", (item_category,))
                    row = cursor.fetchone()
                    if row:
                        count = row[0]
                    else:
                        count = 1
                        cursor.execute("INSERT INTO category_counters (category_id, count) VALUES (?, ?)", (item_category, count))
                    
                    item_id = f"{item_category}.{count}"
                    
                    cursor.execute('''
                        INSERT INTO items (item_id, name, category, keywords, condition, price, quantity, seller)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (item_id, name, item_category, keywds, item_condition, price, qty, seller))
                    
                    cursor.execute("UPDATE category_counters SET count = count + 1 WHERE category_id = ?", (item_category,))
                    db_conn.commit()

                send_msg(conn, f"SUCCESS|{item_id}")

            elif req_type == "GET_SELLER_ITEMS":
                seller_name = parts[1]
                cursor.execute("SELECT item_id, name, price, quantity FROM items WHERE seller = ?", (seller_name,))
                rows = cursor.fetchall()
                
                my_items = []
                for r in rows:
                    my_items.append(f"ID:{r[0]} | {r[1]} (${r[2]}) Qty:{r[3]}")
                
                if my_items:
                    send_msg(conn, "SUCCESS|" + "\n".join(my_items))
                else:
                    send_msg(conn, "SUCCESS|No items found.")

            elif req_type == "GET_ITEM": 
                item_id = parts[1]
                cursor.execute("SELECT * FROM items WHERE item_id = ?", (item_id,))
                r = cursor.fetchone()
                
                if r:
                    item_data = {
                        "name": r[1], "category": r[2], "keywords": r[3].split(","), 
                        "condition": r[4], "price": r[5], "quantity": r[6], 
                        "seller": r[7], "feedback": {"up": r[8], "down": r[9]}
                    }
                    send_msg(conn, f"SUCCESS|{json.dumps(item_data)}")
                else:
                    send_msg(conn, "FAIL|Item not found")

            elif req_type == "SEARCH": 
                item_category, keyword_strings = int(parts[1]), parts[2]
                search_kws = keyword_strings.split(",")
                
                cursor.execute("SELECT item_id, name, keywords, price FROM items WHERE category = ?", (item_category,))
                rows = cursor.fetchall()
                
                results = []
                for r in rows:
                    i_id, i_name, i_kws, i_price = r[0], r[1], r[2], r[3]
                    match = False
                    for sk in search_kws:
                        if sk in i_name or sk in i_kws:
                            match = True
                            break
                    if match:
                        results.append(f"{i_id}: {i_name} (${i_price})")
                
                send_msg(conn, "SUCCESS|" + ";".join(results))

            elif req_type == "UPDATE_PRICE": 
                item_id, price = parts[1], float(parts[2])
                with db_lock:
                    cursor.execute("UPDATE items SET price = ? WHERE item_id = ?", (price, item_id))
                    if cursor.rowcount > 0:
                        db_conn.commit()
                        send_msg(conn, "SUCCESS")
                    else:
                        send_msg(conn, "FAIL|Item not found")

            elif req_type == "UPDATE_QTY": 
                item_id, qty_remove = parts[1], int(parts[2])
                with db_lock:
                    cursor.execute("SELECT quantity FROM items WHERE item_id = ?", (item_id,))
                    row = cursor.fetchone()
                    if row:
                        current_qty = row[0]
                        if current_qty >= qty_remove:
                            new_qty = current_qty - qty_remove
                            cursor.execute("UPDATE items SET quantity = ? WHERE item_id = ?", (new_qty, item_id))
                            db_conn.commit()
                            send_msg(conn, f"SUCCESS|New Qty: {new_qty}")
                        else:
                            send_msg(conn, "FAIL|Insufficient Quantity")
                    else:
                        send_msg(conn, "FAIL|Item not found")
            
            elif req_type == "ITEM_FEEDBACK": 
                item_id, type_ = parts[1], parts[2]
                col = "fb_up" if type_ == "up" else "fb_down"
                with db_lock:
                    if type_ == "up":
                        cursor.execute("UPDATE items SET fb_up = fb_up + 1 WHERE item_id = ?", (item_id,))
                    else:
                        cursor.execute("UPDATE items SET fb_down = fb_down + 1 WHERE item_id = ?", (item_id,))
                    db_conn.commit()
                send_msg(conn, "SUCCESS")

    except Exception as e:
        print(f"DB Error: {e}")
    finally:
        db_conn.close()
        conn.close()

def main():
    init_db()
    server = TCPServer.start_listening(5002)
    print("[DATABASE] Product DB (SQL) running on 5002...")
    while True:
        conn, addr = server.accept()
        threading.Thread(target=handle_client, args=(conn, addr), daemon=True).start()

if __name__ == "__main__":
    main()