from common.tcp_base import TCPClient

def start():
    # 1. Setup Persistent Connection
    client = TCPClient('localhost', 8000)
    try:
        client.connect()
    except Exception as e:
        print(f"[-] Could not connect to Seller Server: {e}")
        return

    sid = None 
    
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
        
        choice = input("Select: ")
        msg = None

        # --- Input Logic ---
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
            name = input("Item Name (max 32 chars): ")
            cat = input("Category (Int): ")
            kws = input("Keywords (max 5, comma sep): ")
            cond = input("Condition (New/Used): ")
            price = input("Price: ")
            qty = input("Quantity: ")
            msg = f"REGISTER_ITEM|{sid}|{name}|{cat}|{kws}|{cond}|{price}|{qty}"
        elif choice == "4":
            if not sid: print("Login first!"); continue
            iid = input("Item ID: ")
            price = input("New Price: ")
            msg = f"CHANGE_PRICE|{sid}|{iid}|{price}"
        elif choice == "5":
            if not sid: print("Login first!"); continue
            iid = input("Item ID: ")
            qty = input("Quantity to REMOVE: ")
            msg = f"UPDATE_UNITS|{sid}|{iid}|{qty}"
        elif choice == "6":
            if not sid: print("Login first!"); continue
            msg = f"DISPLAY_ITEMS|{sid}"
        elif choice == "7":
            if not sid: print("Login first!"); continue
            msg = f"GET_RATING|{sid}"
        elif choice == "8":
            if sid: 
                msg = f"LOGOUT|{sid}"
            else:
                break
        else:
            print("Invalid choice.")
            continue

        if not msg and choice == "8": break

        # --- Clean Communication Block ---
        if msg:
            # Use the Persistent Class Method
            resp = client.send_receive(msg)

            # Handle Connection Loss
            if not resp or "FAIL|Connection Error" in resp:
                print("[-] Server Disconnected.")
                break

            # Handle Responses
            if choice == "2" and "SUCCESS" in resp:
                sid = resp.split("|")[1]
                print(f"[+] Logged in. Session ID: {sid}")
            elif choice == "6" and "SUCCESS" in resp:
                print("--- My Items ---")
                # Clean up the output if it's JSON or list
                print(resp.replace("SUCCESS|", "")) 
            elif choice == "7" and "SUCCESS" in resp:
                print("Rating:", resp.replace("SUCCESS|", ""))
            elif choice == "8":
                sid = None
                print("Logged out.")
                break
            else:
                print("Server:", resp)

    client.close()

if __name__ == "__main__":
    start()