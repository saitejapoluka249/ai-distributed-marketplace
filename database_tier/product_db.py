import grpc
from concurrent import futures
import json
import sqlite3
import threading

import ecommerce_pb2
import ecommerce_pb2_grpc

import os
from dotenv import load_dotenv

load_dotenv()

PRODUCT_DB_PORT = os.getenv("PRODUCT_DB_PORT", "60052")

DB_NAME = "products.db"
db_lock = threading.Lock()

def get_db_connection(): return sqlite3.connect(DB_NAME)

def init_db():
    conn = get_db_connection()
    conn.execute("PRAGMA journal_mode=WAL")
    cursor = conn.cursor()
    cursor.execute('''CREATE TABLE IF NOT EXISTS items (
        item_id TEXT PRIMARY KEY, name TEXT, category INTEGER, keywords TEXT,
        condition TEXT, price REAL, quantity INTEGER, seller TEXT,
        fb_up INTEGER DEFAULT 0, fb_down INTEGER DEFAULT 0)''')
    cursor.execute('''CREATE TABLE IF NOT EXISTS category_counters (
        category_id INTEGER PRIMARY KEY, count INTEGER DEFAULT 1)''')
    conn.commit()
    conn.close()

class ProductService(ecommerce_pb2_grpc.ProductServiceServicer):
    
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
        except Exception as e: print(f"DB Error: {e}")
        finally: conn.close()
        return res

    def RegisterItem(self, request, context):
        row = self._execute("SELECT count FROM category_counters WHERE category_id = ?", (request.category,), fetch_one=True)
        count = row[0] if row else 1
        if not row: self._execute("INSERT INTO category_counters (category_id, count) VALUES (?, ?)", (request.category, 1), commit=True)
        
        item_id = f"{request.category}.{count}"
        self._execute("INSERT INTO items (item_id, name, category, keywords, condition, price, quantity, seller) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                      (item_id, request.name, request.category, request.keywords, request.condition, request.price, request.quantity, request.seller), commit=True)
        self._execute("UPDATE category_counters SET count = count + 1 WHERE category_id = ?", (request.category,), commit=True)
        return ecommerce_pb2.ItemResponse(success=True, item_id=item_id)

    def GetItem(self, request, context):
        r = self._execute("SELECT * FROM items WHERE item_id = ?", (request.id,), fetch_one=True)
        if r:
            return ecommerce_pb2.ItemResponse(success=True, item_id=r[0], name=r[1], price=r[5], quantity=r[6], seller=r[7], fb_up=r[8], fb_down=r[9], condition=r[4])
        return ecommerce_pb2.ItemResponse(success=False)
    
    def GetSellerStats(self, request, context):

        seller_username = request.query 
        exists = self._execute("SELECT 1 FROM items WHERE seller = ? LIMIT 1", (seller_username,), fetch_one=True)
        if not exists:
            return ecommerce_pb2.RatingResponse(
            up=0, 
            down=0, 
            status="FAIL", 
            message="Seller not found."
        )
        row = self._execute("SELECT SUM(fb_up), SUM(fb_down) FROM items WHERE seller = ?", (seller_username,), fetch_one=True)
    
        total_up = row[0] if row[0] is not None else 0
        total_down = row[1] if row[1] is not None else 0
    
        return ecommerce_pb2.RatingResponse(up=total_up, down=total_down, status="SUCCESS", message="")

    def SearchItems(self, request, context):
        kws = request.keywords.split(",")
        rows = self._execute("SELECT item_id, name, keywords, price, quantity FROM items WHERE category = ?", (request.category,), fetch_all=True)
        results = []
        for r in rows:
            if any(k in r[1] or k in r[2] for k in kws):
                results.append(f"ID: {r[0]} | {r[1]} | ${r[3]} | Available: {r[4]}")
        return ecommerce_pb2.SearchResponse(item_lines=results)

    def GetSellerItems(self, request, context):
        rows = self._execute("SELECT item_id, name, price, quantity FROM items WHERE seller = ?", (request.query,), fetch_all=True)
        results = [f"ID:{r[0]} | {r[1]} (${r[2]}) Qty:{r[3]}" for r in rows]
        return ecommerce_pb2.SearchResponse(item_lines=results)

    def UpdatePrice(self, request, context):
        self._execute("UPDATE items SET price = ? WHERE item_id = ?", (request.new_price, request.item_id), commit=True)
        return ecommerce_pb2.ResponseMsg(success=True)

    def UpdateQty(self, request, context):
        row = self._execute("SELECT quantity FROM items WHERE item_id = ?", (request.item_id,), fetch_one=True)
        if row and row[0] >= request.qty_change:
            self._execute("UPDATE items SET quantity = quantity - ? WHERE item_id = ?", (request.qty_change, request.item_id), commit=True)
            return ecommerce_pb2.ResponseMsg(success=True)
        return ecommerce_pb2.ResponseMsg(success=False, message="Insufficient Stock")

    def UpdateItemFeedback(self, request, context):
        if request.type == "up": self._execute("UPDATE items SET fb_up = fb_up + 1 WHERE item_id = ?", (request.target_id,), commit=True)
        else: self._execute("UPDATE items SET fb_down = fb_down + 1 WHERE item_id = ?", (request.target_id,), commit=True)
        return ecommerce_pb2.Empty()

def serve():
    init_db()
    server = grpc.server(
        futures.ThreadPoolExecutor(max_workers=100),
        options=[
            ('grpc.max_concurrent_streams', 200),
            ('grpc.max_receive_message_length', 16 * 1024 * 1024),
        ]
    )
    ecommerce_pb2_grpc.add_ProductServiceServicer_to_server(ProductService(), server)
    server.add_insecure_port(f"[::]:{PRODUCT_DB_PORT}")
    print("Product DB (gRPC) running on 60052...")
    server.start()
    server.wait_for_termination()

if __name__ == '__main__':
    serve()