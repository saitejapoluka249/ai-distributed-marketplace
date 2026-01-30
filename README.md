# Distributed Marketplace System

## Project Description

This is a multi-threaded distributed marketplace system where multiple buyers and sellers can interact simultaneously. I built this system to demonstrate how distributed components communicate over a network using raw TCP sockets. The system allows users to create accounts, login, search for items, rate sellers, and manage a shopping cart in real-time.

## System Design

The system follows a 3-tier architecture with the following components:

1. **Client Tier (clients/):**
* `buyer_client.py`: Provides a menu interface for buyers to search, add items to cart, and make purchases.
* `seller_client.py`: Allows sellers to register new items, update stock, and check their ratings.


2. **Application Tier (app_servers/):**
* `buyer_server.py` and `seller_server.py`: These servers act as middleware. They handle business logic (like verifying passwords or checking stock) and manage communication between the clients and the databases.


3. **Database Tier (database_tier/):**
* `customer_db.py`: Stores user accounts, sessions, and cart data.
* `product_db.py`: Stores item details, prices, and inventory counts.



## Key Technical Features

* **Concurrency:** The system uses Python's `threading` module to handle multiple concurrent client connections without blocking.
* **Persistent Connections:** To improve performance, I implemented persistent TCP connections. This means the client establishes a connection once and reuses it for multiple requests, significantly reducing network overhead.
* **Custom Protocol:** All communication uses a custom application-level protocol defined in `common/protocol.py`, which uses fixed-length headers to ensure reliable message delivery.

## How to Run the System

To run the full system, open 5 separate terminal windows and execute the files in the following order:

**1. Start the Databases:**
`python3 database_tier/customer_db.py`
`python3 database_tier/product_db.py`

**2. Start the App Servers:**
`python3 app_servers/buyer_server.py`
`python3 app_servers/seller_server.py`

**3. Run the Evaluation Script:**
`python3 evaluation.py`

*(Note: Make sure you are in the root directory DistributedMarketplaceProject before running these commands.)*

## Current Status

The system is fully functional.

* **Features Working:** Account registration, login/logout, item search, cart management (add/remove/clear), and feedback submission.
* **Performance:** The system passes the load test with 100 concurrent buyers and 100 concurrent sellers.
* **Limitations:** The database is currently in-memory (using Python dictionaries). If the database scripts are stopped, the data is lost.
