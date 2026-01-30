import json
from common.tcp_base import TCPClient

def start():
    client = TCPClient('localhost', 8001)
    try:
        client.connect()
    except Exception as e:
        print(f"[-] Could not connect to Buyer Server: {e}")
        return

    sid = None 
    
    while True:
        print("\n=== BUYER MENU ===")
        print("1. Create Account")
        print("2. Login")
        print("3. Search Items")
        print("4. Add Item to Cart")
        print("5. Remove Item from Cart")
        print("6. Clear Cart")
        print("7. Display Cart")
        print("8. Provide Feedback")
        print("9. Get Seller Rating")
        print("10. Get Purchase History")
        print("11. Save Cart")
        print("12. Logout")
        
        choice = input("Enter choice: ")
        msg = None

        if choice == "1":
            u = input("Username: ")
            p = input("Password: ")
            msg = f"CREATE_ACCOUNT|{u}|{p}"
        elif choice == "2":
            u = input("Username: ")
            p = input("Password: ")
            msg = f"LOGIN|{u}|{p}"
        elif choice == "3":
            if not sid: print("Login first!"); continue
            cat = input("Category ID (Int): ")
            kw = input("Keywords (comma sep): ")
            msg = f"SEARCH|{sid}|{cat}|{kw}"
        elif choice == "4":
            if not sid: print("Login first!"); continue
            iid = input("Item ID: ")
            qty = input("Quantity: ")
            msg = f"ADD_TO_CART|{sid}|{iid}|{qty}"
        elif choice == "5":
            if not sid: print("Login first!"); continue
            iid = input("Item ID: ")
            qty = input("Quantity to Remove: ")
            msg = f"REMOVE_FROM_CART|{sid}|{iid}|{qty}"
        elif choice == "6":
            if not sid: print("Login first!"); continue
            msg = f"CLEAR_CART|{sid}"
        elif choice == "7":
            if not sid: print("Login first!"); continue
            msg = f"DISPLAY_CART|{sid}"
        elif choice == "8":
            if not sid: print("Login first!"); continue
            iid = input("Item ID: ")
            vote = input("Vote (up/down): ")
            msg = f"PROVIDE_FEEDBACK|{sid}|{iid}|{vote}"
        elif choice == "9":
            if not sid: print("Login first!"); continue
            seller_id = input("Seller ID (Int): ")
            msg = f"GET_SELLER_RATING|{sid}|{seller_id}"
        elif choice == "10":
            if not sid: print("Login first!"); continue
            msg = f"GET_HISTORY|{sid}"
        elif choice == "11":
            if not sid: print("Login first!"); continue
            msg = f"SAVE_CART|{sid}"
        elif choice == "12":
            if sid: msg = f"LOGOUT|{sid}"
            else: break
        else:
            print("Invalid choice.")
            continue

        if not msg and choice == "12": break 

        if msg:
            resp = client.send_receive(msg)
            
            if not resp or "FAIL|Connection Error" in resp:
                print("[-] Server Disconnected.")
                break

            if choice == "2" and "SUCCESS" in resp:
                sid = resp.split("|")[1]
                print(f"[+] Login Successful! Session ID: {sid}")
            elif choice == "7" and "SUCCESS" in resp:
                try:
                    data = json.loads(resp.split("|")[1])
                    print("Your Cart:", data.get('cart', []))
                except: print("Error parsing cart.")
            elif choice == "9" and "SUCCESS" in resp:
                try:
                    data = json.loads(resp.split("|")[1])
                    if 'feedback' in data: print("Feedback:", data['feedback'])
                except: print("Error parsing feedback.")
            elif choice == "10" and "SUCCESS" in resp:
                try:
                    data = json.loads(resp.split("|")[1])
                    print("Purchase History:", data.get('purchase_history', []))
                except: print("Error parsing history.")
            elif choice == "12":
                sid = None
                print("Logged out.")
                break
            else:
                print("Server:", resp)

    client.close()

if __name__ == "__main__":
    start()