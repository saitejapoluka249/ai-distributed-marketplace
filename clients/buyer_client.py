import requests
import json
import re 
import sys

BASE_URL = "http://localhost:7003"
sess_id = None

def get_input(prompt, data_type=str, error_msg="Invalid input", regex=None):
    """
    Forces the user to enter valid data.
    - data_type: int, float, or str
    - regex: Optional pattern to match (e.g., for Dates or Cards)
    """
    while True:
        value = input(prompt).strip()
        if not value:
            print("[-] Input cannot be empty.")
            continue
        
        try:
            if data_type == int:
                converted = int(value)
                if converted < 0: 
                    print("[-] Number must be positive.")
                    continue
                return converted
            elif data_type == float:
                converted = float(value)
                if converted < 0:
                    print("[-] Number must be positive.")
                    continue
                return converted
        except ValueError:
            print(f"[-] {error_msg}")
            continue

        if regex and not re.match(regex, value):
            print(f"[-] {error_msg}")
            continue
            
        return value

def handle_response(response):
    global sess_id
    try:
        data = response.json()
    except:
        print(f"\n[-] CRITICAL SERVER ERROR: The server crashed or returned invalid data.")
        print(f"[-] Status Code: {response.status_code}")
        return None

    if data.get("status") == "FAIL":
        print(f"[-] Error: {data.get('message')}")
        if data.get("message") == "Login First":
            print("[-] Session Expired. You have been logged out.")
            sess_id = None
        return None
    return data

while True:
    print("\n" + "="*30)
    print("   BUYER MENU (REST)")
    print("="*30)
    print(f"Status: {'[ACTIVE]' if sess_id else '[OFFLINE]'}")
    print("1.  Create Account")
    print("2.  Login")
    print("3.  Search Items")
    print("4.  Add to Cart")
    print("5.  Remove from Cart")
    print("6.  Clear Cart")
    print("7.  Display Cart")
    print("8.  Save Cart")
    print("9.  Make Purchase (SOAP)")
    print("10. Logout")
    print("11. Get Item Details")
    print("12. Leave Feedback (Item)")
    print("13. Get Seller Rating")
    print("14. My Orders")
    print("15. Leave Feedback (Seller)")
    print("16. Add to Wishlist")
    print("17. My Wishlist")
    
    c = input("\nChoice: ")
    
    try:
        if c == "1":
            u = get_input("Username: ")
            p = get_input("Password: ")
            r = requests.post(f"{BASE_URL}/create_account", json={"username": u, "password": p})
            d = handle_response(r)
            if d and d['status'] == "SUCCESS":
                print(f"[+] Account Created Successfully! ID: {d.get('uid')}")
            
        elif c == "2":
            u = get_input("Username: ")
            p = get_input("Password: ")
            r = requests.post(f"{BASE_URL}/login", json={"username": u, "password": p})
            d = handle_response(r)
            if d and d['status'] == "SUCCESS": 
                sess_id = d['sess_id']
                print("[+] Logged In Successfully")

        elif c == "3":
            if not sess_id: print("[-] Login First!"); continue
            cat = get_input("Cat ID (1=Electronics, 2=Books...): ", int, "Must be a number.")
            kw = get_input("Keywords: ")
            
            min_p_input = input("Min Price (Press Enter to skip): ").strip()
            max_p_input = input("Max Price (Press Enter to skip): ").strip()
            
            min_p = float(min_p_input) if min_p_input else 0.0
            max_p = float(max_p_input) if max_p_input else 9999999.0
            
            current_page = 1
            
            while True:
                r = requests.get(f"{BASE_URL}/search", params={
                    "category": cat, "keywords": kw, 
                    "min_price": min_p, "max_price": max_p, 
                    "page": current_page
                })
                d = handle_response(r)
                
                if d and d.get('status') == 'SUCCESS':
                    print(f"\n--- SEARCH RESULTS (Page {d['current_page']} of {d['total_pages']}) ---")
                    items = d.get("items", [])
                    if not items: 
                        print("No items found.")
                        break
                        
                    for line in items: 
                        print(line)
                    
                    if current_page < d['total_pages']:
                        ans = input("\nPress 'N' for Next Page, or 'Q' to quit search: ").strip().lower()
                        if ans == 'n':
                            current_page += 1
                        else:
                            break
                    else:
                        print("\n[End of Results]")
                        break
                else:
                    break

        elif c == "4":
            if not sess_id: print("[-] Login First!"); continue
            iid = get_input("Item ID (e.g., 1.1): ", str, regex=r"^\d+\.\d+$", error_msg="Format must be Category.ID (e.g. 1.1)")
            qty = get_input("Qty: ", int, "Qty must be a number.")
            r = requests.post(f"{BASE_URL}/cart", json={"sess_id": sess_id, "item_id": iid, "qty": qty})
            d = handle_response(r)
            if d and d['status'] == "SUCCESS": print("[+] Item Added to Cart")

        elif c == "5":
            if not sess_id: print("[-] Login First!"); continue
            iid = get_input("Item ID: ", str, regex=r"^\d+\.\d+$")
            qty = get_input("Qty to remove: ", int)
            r = requests.delete(f"{BASE_URL}/cart", json={"sess_id": sess_id, "item_id": iid, "qty": qty})
            d = handle_response(r)
            if d and d['status'] == "SUCCESS": print("[+] Item Removed")

        elif c == "6":
            if not sess_id: print("[-] Login First!"); continue
            r = requests.put(f"{BASE_URL}/cart", json={"sess_id": sess_id})
            d = handle_response(r)
            if d and d['status'] == "SUCCESS": print("[+] Cart Cleared")

        elif c == "7":
            if not sess_id: print("[-] Login First!"); continue
            
            r = requests.get(f"{BASE_URL}/cart", params={"sess_id": sess_id})
            d = handle_response(r)
            if d and d.get('status') == 'SUCCESS': 
                print("\n" + "="*60)
                print(f"{'ID':<6} {'Name':<15} {'Price':<8} {'Qty':<4} {'Total':<10}")
                print("-" * 60)
                
                cart_items = d.get("cart", [])
                if not cart_items:
                    print("Your Cart is Empty!")
                else:
                    for item in cart_items:
                        print(f"{item['id']:<6} {item['name']:<15} ${item['price']:<7} {item['qty']:<4} ${item['item_total']:<10}")
                
                print("-" * 60)
                print(f"GRAND TOTAL: ${d.get('grand_total', 0)}")

        elif c == "8":
            if not sess_id: print("[-] Login First!"); continue
            r = requests.post(f"{BASE_URL}/save_cart", json={"sess_id": sess_id})
            d = handle_response(r)
            if d and d['status'] == "SUCCESS": print("[+] Cart Saved")


        elif c == "9": 
            if not sess_id: print("[-] Login First!"); continue
            
            r_check = requests.get(f"{BASE_URL}/cart", params={"sess_id": sess_id})
            if r_check.status_code == 200:
                cart_data = r_check.json()
                if not cart_data.get('cart', []): 
                    print("[-] Error: Your Cart is Empty!"); continue
            
            print("\n--- SECURE CHECKOUT ---")
            
            promo = input("Enter Promo Code (or press Enter to skip): ").strip()
            
            r_preview = requests.get(f"{BASE_URL}/cart", params={"sess_id": sess_id, "promo": promo})
            d_preview = handle_response(r_preview)
            
            if d_preview and d_preview.get('status') == 'SUCCESS':
                if d_preview.get('promo_msg'):
                    print(f"[*] {d_preview['promo_msg']}")
                
                final_total = d_preview.get('grand_total', 0)
                print(f"[*] AMOUNT DUE: ${final_total}")
                print("-" * 30)
                
                print("--- ENTER PAYMENT DETAILS ---")
                name = get_input("Name on Card: ", str, regex=r"^[a-zA-Z\s\-\']+$", error_msg="No numbers/symbols.")
                cc = get_input("Card Num: ", str, regex=r"^\d{16}$", error_msg="Must be 16 digits.")
                exp = get_input("Expiry (MM/YY): ", str, regex=r"^(0[1-9]|1[0-2])\/\d{2}$", error_msg="Format MM/YY")
                cvv = get_input("CVV: ", str, regex=r"^\d{3}$", error_msg="Must be 3 digits.")
                
                data = {"sess_id": sess_id, "name": name, "cc_number": cc, "exp_date": exp, "sec_code": cvv, "promo": promo}
                r = requests.post(f"{BASE_URL}/purchase", json=data)
                d = handle_response(r)
                if d and d.get('status') == "SUCCESS": 
                    print(f"\n[+] {d.get('message')}")

        elif c == "10":
            if sess_id: requests.post(f"{BASE_URL}/logout", json={"sess_id": sess_id}); sess_id = None
            print("[+] Logged out.")
            break

        elif c == "11":
            if not sess_id: print("[-] Login First!"); continue
            iid = get_input("Item ID: ", str, regex=r"^\d+\.\d+$")
            r = requests.get(f"{BASE_URL}/item", params={"item_id": iid})
            d = handle_response(r)
            if d: 
                print(f"\n--- {d['name']} ---")
                print(f"Price: ${d['price']} | In Stock: {d['quantity']}")
                print(f"Seller: {d['seller']}")
                print(f"Average Rating: {d['rating']} / 5.0")
                print("\n--- REVIEWS ---")
                if not d['reviews']: print("No reviews yet.")
                for rev in d['reviews']:
                    print(f"[{rev['stars']} Stars] {rev['user']}: {rev['review']}")

        elif c == "12":
            if not sess_id: print("[-] Login First!"); continue
            iid = get_input("Item ID: ", str, regex=r"^\d+\.\d+$")
            stars = get_input("Stars (1-5): ", int, "Must be a number", regex=r"^[1-5]$")
            text = get_input("Write your review: ")
            
            r = requests.post(f"{BASE_URL}/feedback/item", json={"sess_id": sess_id, "item_id": iid, "stars": stars, "text": text})
            d = handle_response(r)
            if d and d['status'] == 'SUCCESS': print(f"[+] {d['message']}")

        elif c == "13":
            if not sess_id: print("[-] Login First!"); continue
            seller = get_input("Seller Username: ")
            r = requests.get(f"{BASE_URL}/rating/seller", params={"seller_id": seller})
            data = handle_response(r)
            if data and data.get('status') == "SUCCESS":
                print(f"\n--- RATING FOR {seller} ---")
                print(f"Average Rating: {data['avg_rating']} / 5.0")
                print("\n--- SELLER REVIEWS ---")
                if not data['reviews']: print("No reviews yet.")
                for rev in data['reviews']:
                    print(f"[{rev['stars']} Stars] {rev['user']}: {rev['review']}")
            else:
                print(f"[-] Error: {data.get('message', 'Seller not found')}")

        elif c == "14":
            if not sess_id: print("[-] Login First!"); continue
            r = requests.get(f"{BASE_URL}/orders", params={"sess_id": sess_id})
            d = handle_response(r)
            if d and d.get('status') == 'SUCCESS': 
                print("\n--- MY ORDERS ---")
                if not d['orders']: print("No orders yet.")
                for o in d['orders']:
                    print(f"[{o['status']}] Order ID: {o['order_id']}")
                    print(f"    Item: {o['item']} (Qty: {o['qty']}) | Total: ${o['total']} | Seller: {o['seller']}\n")

        elif c == "15":
            if not sess_id: 
                print("[-] Login First!")
                continue
            seller = get_input("Seller Username: ")
            stars = get_input("Stars (1-5): ", int, "Must be a number", regex=r"^[1-5]$")
            text = get_input("Write your review: ")
            
            r = requests.post(f"{BASE_URL}/feedback/seller", json={
                "sess_id": sess_id, 
                "seller_id": seller, 
                "stars": stars, 
                "text": text
            })
            
            d = handle_response(r)
            if d and d.get('status') == 'SUCCESS': 
                print(f"[+] {d['message']}")

        elif c == "16":
            if not sess_id: print("[-] Login First!"); continue
            iid = get_input("Item ID: ", str, regex=r"^\d+\.\d+$")
            r = requests.post(f"{BASE_URL}/wishlist", json={"sess_id": sess_id, "item_id": iid})
            d = handle_response(r)
            if d and d.get('status') == 'SUCCESS': print(f"[+] {d['message']}")

        elif c == "17":
            if not sess_id: print("[-] Login First!"); continue
            r = requests.get(f"{BASE_URL}/wishlist", params={"sess_id": sess_id})
            d = handle_response(r)
            if d and d.get('status') == 'SUCCESS':
                print("\n--- MY WISHLIST ---")
                items = d.get('wishlist', [])
                if not items:
                    print("Your wishlist is empty.")
                    continue
                    
                for item in items:
                    print(f"ID: {item['id']} | {item['name']} | ${item['price']} | In Stock: {item['qty_available']}")
                
                print("\nOptions: [M]ove item to Cart, [R]emove item, [Q]uit to menu")
                ans = get_input("> ", str, regex=r"^[mM|rR|qQ]$").lower()
                
                if ans == 'm':
                    iid = get_input("Item ID to move: ", str, regex=r"^\d+\.\d+$")
                    r2 = requests.post(f"{BASE_URL}/wishlist/move_to_cart", json={"sess_id": sess_id, "item_id": iid})
                    d2 = handle_response(r2)
                    if d2 and d2.get('status') == 'SUCCESS': print(f"[+] {d2['message']}")
                
                elif ans == 'r':
                    iid = get_input("Item ID to remove: ", str, regex=r"^\d+\.\d+$")
                    r2 = requests.delete(f"{BASE_URL}/wishlist", json={"sess_id": sess_id, "item_id": iid})
                    d2 = handle_response(r2)
                    if d2 and d2.get('status') == 'SUCCESS': print(f"[+] {d2['message']}")

    except KeyboardInterrupt:
        print("\n\n[!] Force Exit Detected (Ctrl+C).")
        
        if sess_id:
            print("[*] Attempting to clean up session...")
            try:
                requests.post(f"{BASE_URL}/logout", json={"sess_id": sess_id}, timeout=2)
                print("[+] Session Logged Out Successfully.")
            except:
                print("[-] Could not tell Server we are leaving (Server might be down).")
        
        print("Goodbye!")
        sys.exit(0)

    except Exception as e:
        print(f"[-] Connection Error: {e}")