import json
from common.tcp_base import TCPClient

def start():
    client = TCPClient('localhost', 8001)
    try:
        client.connect()
    except Exception as e:
        print(f"[-] Could not able to connect to Buyer Server: {e}")
        return

    sess_id = None 
    
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
        
        menu_option = input("Enter choice: ")
        msg = None

        if menu_option == "1":
            u = input("Username: ")
            p = input("Password: ")
            msg = f"CREATE_ACCOUNT|{u}|{p}"
        elif menu_option == "2":
            u = input("Username: ")
            p = input("Password: ")
            msg = f"LOGIN|{u}|{p}"
        elif menu_option == "3":
            if not sess_id: print("Login first!"); continue
            cat = input("Category ID (Int): ")
            kw = input("Keywords (comma sep): ")
            msg = f"SEARCH|{sess_id}|{cat}|{kw}"
        elif menu_option == "4":
            if not sess_id: print("Login first!"); continue
            iid = input("Item ID: ")
            qty = input("Quantity: ")
            msg = f"ADD_TO_CART|{sess_id}|{iid}|{qty}"
        elif menu_option == "5":
            if not sess_id: print("Login first!"); continue
            iid = input("Item ID: ")
            qty = input("Quantity to Remove: ")
            msg = f"REMOVE_FROM_CART|{sess_id}|{iid}|{qty}"
        elif menu_option == "6":
            if not sess_id: print("Login first!"); continue
            msg = f"CLEAR_CART|{sess_id}"
        elif menu_option == "7":
            if not sess_id: print("Login first!"); continue
            msg = f"DISPLAY_CART|{sess_id}"
        elif menu_option == "8":
            if not sess_id: print("Login first!"); continue
            iid = input("Item ID: ")
            vote = input("Vote (up/down): ")
            msg = f"PROVIDE_FEEDBACK|{sess_id}|{iid}|{vote}"
        elif menu_option == "9":
            if not sess_id: print("Login first!"); continue
            seller_id = input("Seller ID (Int): ")
            msg = f"GET_SELLER_RATING|{sess_id}|{seller_id}"
        elif menu_option == "10":
            if not sess_id: print("Login first!"); continue
            msg = f"GET_HISTORY|{sess_id}"
        elif menu_option == "11":
            if not sess_id: print("Login first!"); continue
            msg = f"SAVE_CART|{sess_id}"
        elif menu_option == "12":
            if sess_id: msg = f"LOGOUT|{sess_id}"
            else: break
        else:
            print("Invalid choice.")
            continue

        if not msg and menu_option == "12": break 

        if msg:
            resp = client.send_receive(msg)
            
            if not resp or "FAIL|Connection Error" in resp:
                print("[-] Server Got Disconnected.")
                break

            if menu_option == "2" and "SUCCESS" in resp:
                sess_id = resp.split("|")[1]
                print(f"[+] Login Successful! Session ID: {sess_id}")
            elif menu_option == "7" and "SUCCESS" in resp:
                try:
                    data = json.loads(resp.split("|")[1])
                    print("Your Cart:", data.get('cart', []))
                except: print("Error parsing cart.")
            elif menu_option == "9" and "SUCCESS" in resp:
                try:
                    data = json.loads(resp.split("|")[1])
                    if 'feedback' in data: print("Feedback:", data['feedback'])
                except: print("Error parsing feedback.")
            elif menu_option == "10" and "SUCCESS" in resp:
                try:
                    data = json.loads(resp.split("|")[1])
                    print("Purchase History:", data.get('purchase_history', []))
                except: print("Error parsing history.")
            elif menu_option == "12":
                sess_id = None
                print("Logged out.")
                break
            else:
                print("Server:", resp)

    client.close()

if __name__ == "__main__":
    start()