# AI-Powered Distributed E-Commerce Marketplace

A robust, highly scalable 3-tier distributed e-commerce platform built with Python. This project demonstrates modern distributed systems architecture, utilizing RESTful APIs for the application tier, gRPC for microservice communication, and distributed caching to handle high-throughput traffic.

## 🏗 System Architecture

This system follows a strict 3-tier distributed design:

1. **Client Tier:** Command-line interfaces (Buyer & Seller) simulating frontend consumers.
2. **Application Tier:** Flask RESTful servers acting as middleware, handling business logic, authentication parsing, and caching.
3. **Database Tier:** gRPC Python servers managing concurrent database connections using SQLite in Write-Ahead Logging (WAL) mode for thread-safe operations.

## ✨ Advanced Features

### 🚀 Scalability & Performance

- **Database Pagination:** Engineered SQL-level pagination (`LIMIT` and `OFFSET`) and advanced price filtering to efficiently handle massive datasets without consuming excess server memory.

### 🔐 Security & Authentication

- **Cryptographic Hashing:** Transitioned from plain-text storage to secure `bcrypt` password hashing with dynamic salting.
- **Credential Validation:** Enforced strict password complexity requirements at the application layer before reaching the database.
- **Session Management:** Secure, stateful session tracking bridging the REST and gRPC boundaries.

### 🛒 Complex Business Logic

- **Dynamic Promo Code Engine:** Built a secure discount system allowing sellers to generate single-item or category-wide promo codes. The backend dynamically recalculates cart totals at the exact moment of checkout to prevent client-side tampering.
- **Order Tracking & Fulfillment:** Replaced simple purchase logs with a stateful order management system (`PROCESSING`, `SHIPPED`, `DELIVERED`), complete with distinct buyer and seller tracking dashboards.
- **Cross-Entity Data Movement:** Developed a Wishlist ("Save for Later") system that safely transfers items between the User Database and the active Shopping Cart state.
- **Advanced Review System:** Upgraded binary up/down votes to a relational text-and-star review system for both Products and Sellers, including real-time average aggregation.

## 🛠 Technology Stack

- **Language:** Python 3.x
- **RPC Framework:** gRPC & Protocol Buffers (`protobuf`)
- **REST Framework:** Flask
- **Caching:** Redis
- **Security:** bcrypt, Flask-Limiter
- **Database:** SQLite3 (WAL Mode for concurrency)

## ⚙️ Installation & Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/saitejapoluka249/ai-distributed-marketplace.git
   cd ai-distributed-marketplace

   ```

2. **Set up the virtual environment:**

   ```bash
   python3 -m venv venv_ai_marketplace
   source venv_ai_marketplace/bin/activate
   pip install -r requirements.txt

   ```

3. **Compile the Protocol Buffers:**

```bash
python3 -m grpc_tools.protoc -I. --python_out=. --grpc_python_out=. ecommerce.proto

```

## 🚀 Running the System

You must start the servers from the bottom tier up. Open a separate terminal for each step (ensure your virtual environment is activated in each).

**1. Start the Database Tier (gRPC):**

```bash
python3 -m database_tier.customer_db
python3 -m database_tier.product_db

```

**2. Start the Financial Tier (SOAP):**

```bash
python3 financial_service.py

```

**3. Start the Application Tier (Flask REST):**

```bash
python3 -m app_servers.buyer_server
python3 -m app_servers.seller_server

```

**4. Run the Clients:**

```bash
python3 -m clients.buyer_client
python3 -m clients.seller_client

```

## 🔮 Future Roadmap

- **Phase 2 (Frontend UI):** Replace the CLI clients with a modern Web UI (HTML/CSS/JS) communicating with the existing Flask REST APIs.
- **Phase 3 (Gen AI Injection):** Integrate Large Language Models (LLMs) to provide semantic search, AI-generated product descriptions, and personalized shopping recommendations.
