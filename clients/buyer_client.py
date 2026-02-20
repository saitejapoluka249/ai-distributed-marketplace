import requests
import json
import re 
import sys

#BASE_URL = "http://localhost:5003"
BASE_URL = "34.63.228.8"

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
    print("14. Purchase History")
    
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
            cat = get_input("Cat ID (1=Electronics, 2=Books...): ", int, "Category must be a number.")
            kw = get_input("Keywords (comma separated): ")
            r = requests.get(f"{BASE_URL}/search", params={"category": cat, "keywords": kw})
            d = handle_response(r)
            if d: 
                print("\n--- SEARCH RESULTS ---")
                items = d.get("items", [])
                if not items: print("No items found.")
                for line in items: print(line)

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
            if d: 
                print("\n" + "="*50)
                print(f"{'ID':<10} {'Name':<20} {'Price':<10} {'Qty':<5} {'Total':<10}")
                print("-" * 50)
                for item in d.get("cart", []):
                    print(f"{item['id']:<10} {item['name']:<20} ${item['price']:<9} {item['qty']:<5} ${item['item_total']:<10}")
                print("-" * 50)
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
                    print("[-] Error: Your Cart is Empty!")
                    continue
            print("\n--- ENTER PAYMENT DETAILS ---")
            
            name = get_input("Name on Card: ", str, regex=r"^[a-zA-Z\s\-\']+$", error_msg="Name cannot contain numbers or symbols.")
            
            cc = get_input("Card Num (16 digits): ", str, regex=r"^\d{16}$", error_msg="Card must be 16 digits.")
            
            exp = get_input("Expiry (MM/YY): ", str, regex=r"^(0[1-9]|1[0-2])\/\d{2}$", error_msg="Format must be MM/YY (e.g. 12/26)")
            
            cvv = get_input("CVV (3 digits): ", str, regex=r"^\d{3}$", error_msg="CVV must be 3 digits.")
            
            data = {"sess_id": sess_id, "name": name, "cc_number": cc, "exp_date": exp, "sec_code": cvv}
            r = requests.post(f"{BASE_URL}/purchase", json=data)
            d = handle_response(r)
            if d and d['status'] == "SUCCESS": print(f"[+] {d.get('message')}")

        elif c == "10":
            if sess_id: requests.post(f"{BASE_URL}/logout", json={"sess_id": sess_id}); sess_id = None
            print("[+] Logged out.")
            break

        elif c == "11":
            if not sess_id: print("[-] Login First!"); continue
            iid = get_input("Item ID: ", str, regex=r"^\d+\.\d+$")
            r = requests.get(f"{BASE_URL}/item", params={"item_id": iid})
            d = handle_response(r)
            if d: print(f"DETAILS: {d}")

        elif c == "12":
            if not sess_id: print("[-] Login First!"); continue
            iid = get_input("Item ID: ", str, regex=r"^\d+\.\d+$")
            t = get_input("Type (up/down): ", str, regex=r"^(up|down)$", error_msg="Type must be 'up' or 'down'")
            r = requests.post(f"{BASE_URL}/feedback/item", json={"item_id": iid, "type": t})
            handle_response(r)

        elif c == "13":
            if not sess_id: print("[-] Login First!"); continue
            seller = get_input("Seller Username: ")
            r = requests.get(f"{BASE_URL}/rating/seller", params={"seller_id": seller})
            data = handle_response(r)
            if data:
                if data.get('status') == "SUCCESS":
                    print(f"\n--- RATING FOR {seller} ---")
                    print(f"Thumbs Up:   {data['up']}")
                    print(f"Thumbs Down: {data['down']}")
                else:
                    print(f"[-] Error: {data.get('message', 'Seller not found')}")

        elif c == "14":
            if not sess_id: print("[-] Login First!"); continue
            r = requests.get(f"{BASE_URL}/history", params={"sess_id": sess_id})
            d = handle_response(r)
            if d: print(d.get('history'))

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