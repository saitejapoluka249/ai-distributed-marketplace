from common.tcp_base import TCPClient

def start():
    client = TCPClient('localhost', 8000)
    try:
        client.connect()
    except Exception as e:
        print(f"[-] Could not able to connect to Seller Server: {e}")
        return

    sess_id = None 
    
    while True:
        print("\n--- SELLER INTERFACE ---")
        print("1. Create Account")          
        print("2. Login")                   
        print("3. Register Item")           
        print("4. Change Item Price")       
        print("5. Update Units (Remove)")   
        print("6. Display My Items")        
        print("7. Get Seller Rating")       
        print("8. Logout")                  
        
        menu_option = input("Select: ")
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
            name = input("Item Name (max 32 chars): ")
            cat = input("Category (Int): ")
            kws = input("Keywords (max 5, comma sep): ")
            cond = input("Condition (New/Used): ")
            price = input("Price: ")
            qty = input("Quantity: ")
            msg = f"REGISTER_ITEM|{sess_id}|{name}|{cat}|{kws}|{cond}|{price}|{qty}"
        elif menu_option == "4":
            if not sess_id: print("Login first!"); continue
            iid = input("Item ID: ")
            price = input("New Price: ")
            msg = f"CHANGE_PRICE|{sess_id}|{iid}|{price}"
        elif menu_option == "5":
            if not sess_id: print("Login first!"); continue
            iid = input("Item ID: ")
            qty = input("Quantity to REMOVE: ")
            msg = f"UPDATE_UNITS|{sess_id}|{iid}|{qty}"
        elif menu_option == "6":
            if not sess_id: print("Login first!"); continue
            msg = f"DISPLAY_ITEMS|{sess_id}"
        elif menu_option == "7":
            if not sess_id: print("Login first!"); continue
            msg = f"GET_RATING|{sess_id}"
        elif menu_option == "8":
            if sess_id: 
                msg = f"LOGOUT|{sess_id}"
            else:
                break
        else:
            print("Invalid choice.")
            continue

        if not msg and menu_option == "8": break

        if msg:
            resp = client.send_receive(msg)

            if not resp or "FAIL|Connection Error" in resp:
                print("[-] Server Disconnected.")
                break

            if menu_option == "2" and "SUCCESS" in resp:
                sess_id = resp.split("|")[1]
                print(f"[+] Logged in. Session ID: {sess_id}")
            elif menu_option == "6" and "SUCCESS" in resp:
                print("--- My Items ---")
                print(resp.replace("SUCCESS|", "")) 
            elif menu_option == "7" and "SUCCESS" in resp:
                print("Rating:", resp.replace("SUCCESS|", ""))
            elif menu_option == "8":
                sess_id = None
                print("Logged out.")
                break
            else:
                print("Server:", resp)

    client.close()

if __name__ == "__main__":
    start()