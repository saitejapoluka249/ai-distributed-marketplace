import requests
import json
import re
import sys

BASE_URL = "http://localhost:7001"
sess_id = None

def get_input(prompt, data_type=str, error_msg="Invalid input", regex=None):
    while True:
        value = input(prompt).strip()
        if not value: print("[-] Input cannot be empty."); continue
        try:
            if data_type == int:
                converted = int(value)
                if converted < 0: print("[-] Must be positive."); continue
                return converted
            elif data_type == float:
                converted = float(value)
                if converted < 0: print("[-] Must be positive."); continue
                return converted
        except ValueError:
            print(f"[-] {error_msg}"); continue

        if regex and not re.match(regex, value):
            print(f"[-] {error_msg}"); continue
        return value

def handle_response(response):
    global sess_id
    try:
        data = response.json()
    except:
        print("[-] Server Error."); return None

    if data.get("status") == "FAIL":
        print(f"[-] Error: {data.get('message')}")
        if data.get("message") == "Login First":
            print("[-] Logged out."); sess_id = None
        return None
    return data

while True:
    print("\n--- SELLER MENU (REST) ---")
    print(f"Status: {'[ACTIVE]' if sess_id else '[OFFLINE]'}")
    print("1. Create Account")
    print("2. Login")
    print("3. Register Item")
    print("4. My Items")
    print("5. Update Price")
    print("6. Remove Stock")
    print("7. My Rating")
    print("8. Logout")
    
    c = input("Choice: ")
    
    try:
        if c == "1":
            u = get_input("User: "); p = get_input("Pass: ")
            r = requests.post(f"{BASE_URL}/create_account", json={"username": u, "password": p})
            d = handle_response(r)
            if d and d['status'] == "SUCCESS": print(f"[+] Account Created. ID: {d.get('uid')}")

        elif c == "2":
            u = get_input("User: "); p = get_input("Pass: ")
            r = requests.post(f"{BASE_URL}/login", json={"username": u, "password": p})
            d = handle_response(r)
            if d and d['status'] == "SUCCESS": sess_id = d['sess_id']; print("[+] Logged In")

        elif c == "3":
            if not sess_id: print("[-] Login First!"); continue
            data = {
                "sess_id": sess_id,
                "name": get_input("Name: "),
                "category": get_input("Cat ID: ", int, "Must be a number"),
                "keywords": get_input("Keywords: "),
                "condition": get_input("Condition (New/Used): ", str, regex=r"^(New|Used)$", error_msg="Enter 'New' or 'Used'"),
                "price": get_input("Price: ", float, "Must be number"),
                "quantity": get_input("Qty: ", int, "Must be integer")
            }
            r = requests.post(f"{BASE_URL}/items", json=data)
            d = handle_response(r)
            if d and d['status'] == "SUCCESS": print(f"[+] Item Registered! ID: {d.get('item_id')}")

        elif c == "4":
            if not sess_id: print("[-] Login First!"); continue
            r = requests.get(f"{BASE_URL}/items", params={"sess_id": sess_id})
            d = handle_response(r)
            if d: 
                print("\n--- YOUR ITEMS ---")
                for item in d.get("items", []): print(item)

        elif c == "5":
            if not sess_id: print("[-] Login First!"); continue
            iid = get_input("Item ID: ", str, regex=r"^\d+\.\d+$")
            p = get_input("New Price: ", float)
            r = requests.put(f"{BASE_URL}/items", json={"sess_id": sess_id, "item_id": iid, "price": p})
            d = handle_response(r)
            if d and d['status'] == "SUCCESS": print("[+] Price Updated")

        elif c == "6":
            if not sess_id: print("[-] Login First!"); continue
            iid = get_input("Item ID: ", str, regex=r"^\d+\.\d+$")
            q = get_input("Qty to remove: ", int)
            r = requests.post(f"{BASE_URL}/update_qty", json={"sess_id": sess_id, "item_id": iid, "qty": q})
            d = handle_response(r)
            if d and d['status'] == "SUCCESS": print("[+] Stock Updated")

        elif c == "7":
            if not sess_id: print("[-] Login First!"); continue
            r = requests.get(f"{BASE_URL}/rating", params={"sess_id": sess_id})
            d = handle_response(r)
            if d: print(f"Rating: {d}")

        elif c == "8":
            if sess_id: requests.post(f"{BASE_URL}/logout", json={"sess_id": sess_id}); sess_id = None
            print("[+] Logged Out")
            break

    except KeyboardInterrupt:
        print("\n\n[!] Force Exit Detected (Ctrl+C).")
        if sess_id:
            print("[*] Attempting to clean up seller session...")
            try:
                requests.post(f"{BASE_URL}/logout", json={"sess_id": sess_id}, timeout=2)
                print("[+] Session Logged Out Successfully.")
            except:
                print("[-] Could not tell Server we are leaving.")
        print("Goodbye Seller!")
        sys.exit(0)

    except Exception as e:
        print(f"[-] Connection Error: {e}")