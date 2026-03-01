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
        fb_up INTEGER DEFAULT 0, fb_down INTEGER DEFAULT 0,
        image_url TEXT DEFAULT '')''') # ADDED image_url HERE
    cursor.execute('''CREATE TABLE IF NOT EXISTS category_counters (
        category_id INTEGER PRIMARY KEY, count INTEGER DEFAULT 1)''')
    cursor.execute('''CREATE TABLE IF NOT EXISTS item_reviews (
        item_id TEXT, reviewer TEXT, stars INTEGER, review_text TEXT)''')
    cursor.execute('''CREATE TABLE IF NOT EXISTS seller_reviews (
        seller TEXT, reviewer TEXT, stars INTEGER, review_text TEXT)''')
    cursor.execute('''CREATE TABLE IF NOT EXISTS promos (
        code TEXT PRIMARY KEY, target_type TEXT, target_val TEXT, 
        discount_pct REAL, seller TEXT)''')
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
        # ADDED image_url to INSERT
        self._execute("INSERT INTO items (item_id, name, category, keywords, condition, price, quantity, seller, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                      (item_id, request.name, request.category, request.keywords, request.condition, request.price, request.quantity, request.seller, request.image_url), commit=True)
        self._execute("UPDATE category_counters SET count = count + 1 WHERE category_id = ?", (request.category,), commit=True)
        return ecommerce_pb2.ItemResponse(success=True, item_id=item_id)
    

    def GetItem(self, request, context):
        r = self._execute("SELECT * FROM items WHERE item_id = ?", (request.id,), fetch_one=True)
        if r:
            rev_rows = self._execute("SELECT reviewer, stars, review_text FROM item_reviews WHERE item_id = ?", (request.id,), fetch_all=True)
            reviews_list = [ecommerce_pb2.Review(reviewer=rv[0], stars=rv[1], text=rv[2]) for rv in rev_rows]
            avg = sum([rv[1] for rv in rev_rows]) / len(rev_rows) if rev_rows else 0.0

            # r[10] is the new image_url column!
            return ecommerce_pb2.ItemResponse(success=True, item_id=r[0], name=r[1], price=r[5], quantity=r[6], seller=r[7], fb_up=r[8], fb_down=r[9], condition=r[4], reviews=reviews_list, avg_rating=avg, image_url=r[10])
        return ecommerce_pb2.ItemResponse(success=False)
    
    def GetSellerPromos(self, request, context):
        # Fetch all promos for this specific seller
        rows = self._execute("SELECT code, target_type, target_val, discount_pct FROM promos WHERE seller = ?", (request.query,), fetch_all=True)
        
        promos_list = []
        for r in rows:
            promos_list.append(ecommerce_pb2.PromoResponse(
                success=True, code=r[0], target_type=r[1], target_val=r[2], discount_pct=r[3], seller=request.query
            ))
            
        return ecommerce_pb2.PromoListResponse(success=True, promos=promos_list)
    

    def CreatePromo(self, request, context):
        if request.target_type == "ITEM":
            row = self._execute("SELECT 1 FROM items WHERE item_id = ? AND seller = ?", (request.target_val, request.seller), fetch_one=True)
            if not row: 
                return ecommerce_pb2.ResponseMsg(success=False, message="You do not own this item.")
        
        try:
            self._execute("INSERT INTO promos (code, target_type, target_val, discount_pct, seller) VALUES (?, ?, ?, ?, ?)",
                          (request.code, request.target_type, request.target_val, request.discount_pct, request.seller), commit=True)
            return ecommerce_pb2.ResponseMsg(success=True, message="Promo code created successfully!")
        except sqlite3.IntegrityError:
            return ecommerce_pb2.ResponseMsg(success=False, message="That promo code word is already taken.")

    def GetPromo(self, request, context):
        row = self._execute("SELECT target_type, target_val, discount_pct, seller FROM promos WHERE code = ?", (request.code,), fetch_one=True)
        if row:
            return ecommerce_pb2.PromoResponse(success=True, target_type=row[0], target_val=row[1], discount_pct=row[2], seller=row[3])
        return ecommerce_pb2.PromoResponse(success=False, message="Invalid Promo Code")
    
    
    def GetSellerStats(self, request, context):
        seller_username = request.query 
        exists = self._execute("SELECT 1 FROM items WHERE seller = ? LIMIT 1", (seller_username,), fetch_one=True)
        if not exists: 
            return ecommerce_pb2.RatingResponse(status="FAIL", message="Seller not found.")
        
        # 1. Fetch Seller Reviews
        seller_revs = self._execute("SELECT reviewer, stars, review_text FROM seller_reviews WHERE seller = ?", (seller_username,), fetch_all=True)
        seller_list = []
        seller_stars = 0
        if seller_revs:
            for rv in seller_revs:
                seller_list.append(ecommerce_pb2.Review(reviewer=rv[0], stars=rv[1], text=rv[2]))
                seller_stars += rv[1]
        seller_avg = (seller_stars / len(seller_revs)) if seller_revs else 0.0

        # 2. Fetch Item Reviews
        item_revs = self._execute("""
            SELECT r.reviewer, r.stars, r.review_text, i.name 
            FROM item_reviews r 
            JOIN items i ON r.item_id = i.item_id 
            WHERE i.seller = ?
        """, (seller_username,), fetch_all=True)
        item_list = []
        item_stars = 0
        if item_revs:
            for rv in item_revs:
                formatted_text = f"[Item: {rv[3]}] {rv[2]}" 
                item_list.append(ecommerce_pb2.Review(reviewer=rv[0], stars=rv[1], text=formatted_text))
                item_stars += rv[1]
        item_avg = (item_stars / len(item_revs)) if item_revs else 0.0

        # 3. Return them separately!
        return ecommerce_pb2.RatingResponse(
            avg_rating=seller_avg, 
            reviews=seller_list,
            item_avg_rating=item_avg, 
            item_reviews=item_list,
            status="SUCCESS", 
            message=""
        )
    
    def SearchItems(self, request, context):
        kw = f"%{request.keywords}%"
        
        count_query = "SELECT COUNT(*) FROM items WHERE category = ? AND (name LIKE ? OR keywords LIKE ?) AND price >= ? AND price <= ?"
        params = [request.category, kw, kw, request.min_price, request.max_price]
        total_items = self._execute(count_query, tuple(params), fetch_one=True)[0]
        
        total_pages = (total_items + request.limit - 1) // request.limit if total_items > 0 else 1
        offset = (request.page - 1) * request.limit
        
        query = "SELECT item_id, name, price, quantity, image_url FROM items WHERE category = ? AND (name LIKE ? OR keywords LIKE ?) AND price >= ? AND price <= ? LIMIT ? OFFSET ?"
        params.extend([request.limit, offset])
        rows = self._execute(query, tuple(params), fetch_all=True)
        
        # We append | IMG:url to the end of the string
        results = [f"ID: {r[0]} | {r[1]} | ${r[2]} | Available: {r[3]} | IMG: {r[4]}" for r in rows]
        
        return ecommerce_pb2.SearchResponse(
            item_lines=results, total_pages=total_pages, current_page=request.page
        )

    def GetSellerItems(self, request, context):
        # Fetch image_url here too
        rows = self._execute("SELECT item_id, name, price, quantity, image_url FROM items WHERE seller = ?", (request.query,), fetch_all=True)
        results = [f"ID:{r[0]} | {r[1]} (${r[2]}) Qty:{r[3]} | IMG:{r[4]}" for r in rows]
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
        self._execute("INSERT INTO item_reviews (item_id, reviewer, stars, review_text) VALUES (?, ?, ?, ?)",
                      (request.target_id, request.reviewer, request.stars, request.text), commit=True)
        return ecommerce_pb2.Empty()
    
    def UpdateSellerFeedback(self, request, context):
        self._execute("INSERT INTO seller_reviews (seller, reviewer, stars, review_text) VALUES (?, ?, ?, ?)",
                      (request.target_id, request.reviewer, request.stars, request.text), commit=True)
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