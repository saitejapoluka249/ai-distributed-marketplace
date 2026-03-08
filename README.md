# 🌐 AI-Powered Distributed Marketplace

An enterprise-grade, distributed e-commerce platform built with Python gRPC microservices, a React frontend, and cutting-edge Generative AI features.

This project goes beyond by implementing **Agentic AI workflows**, **Semantic "Vibe" Search**, **Interactive Live Maps**, and **Distributed System Architecture**.

---

## ✨ Elite Generative AI Features

This platform leverages OpenAI's `gpt-4o-mini` to provide a next-generation shopping experience.

- 🤖 **Agentic Shopping Assistant ("Nova"):** A persistent, context-aware chatbot that doesn't just talk—it takes action. Nova uses **RAG (Retrieval-Augmented Generation)** to read live inventory, analyze the user's cart, securely fetch order history, and dynamically inject "Add to Cart" UI buttons directly into the chat stream.
- 🧠 **Semantic "Vibe" Search:** Standard SQL searches fail if exact keywords don't match. Our AI toggle allows users to search by intent (e.g., _"Beach vacation essentials"_). The backend LLM scans the inventory and returns products that match the _vibe_ of the query.
- ✍️ **AI Product Descriptions:** Sellers don't need to write marketing copy. When a buyer views an item, the AI dynamically generates an Amazon-style, 3-bullet-point "About this item" pitch.
- 📊 **Review Summarizer (AI Insights):** Instead of reading dozens of reviews, the AI analyzes all feedback for a product (or a seller) and generates a single, concise paragraph highlighting the consensus pros and cons.
- 🚀 **Seller AI Co-Pilot:** Sellers simply type what they want to sell (e.g., _"A used PS5"_), and the AI auto-fills the product form with an SEO-optimized title, the correct database category ID, searchable keywords, and a competitive market price.

---

## 🏗️ System Architecture

The backend is completely decoupled, simulating a real-world enterprise architecture.

- **gRPC Microservices:** The database layer is split into specialized gRPC servers (`product_db.py` and `customer_db.py`) handling high-performance, concurrent RPC calls.
- **SOAP Financial Gateway:** Payment processing is simulated through an XML-based SOAP service (`financial_service.py`), demonstrating interoperability between legacy banking protocols and modern REST APIs.
- **REST API Gateways:** Flask servers (`buyer_server.py` and `seller_server.py`) act as the middleman, taking HTTP requests from the React frontend and translating them into gRPC and SOAP calls.
- **Concurrency & Locking:** SQLite databases use `threading.Lock()` and `WAL` journal modes to ensure thread-safe operations across hundreds of concurrent user requests.

---

## 🛒 Core Marketplace Features

- 📍 **Interactive Map Checkout:** During checkout, buyers can use an integrated interactive map to drop a pin on their exact delivery location. This captures precise latitude and longitude coordinates to ensure accurate state tax calculation and flawless delivery routing.
- 🗺️ **Live Order Tracking with Maps:** When an order is shipped, buyers can click "Track Order" to open an interactive Leaflet.js Map. The system plots the Seller's coordinates and the Buyer's coordinates, and dynamically draws the optimal driving route between them!
- 📧 **Automated SMTP Emails:** The system generates beautiful, HTML-formatted email receipts upon checkout and sends automated status updates when sellers mark items as "Shipped" or "Delivered".
- 🎟️ **Context-Aware Promos:** Sellers can generate promo codes for specific items or entire categories. The backend mathematically validates if a user's cart qualifies for a discount before applying it (or before the AI recommends it).
- 🇺🇸 **State Tax Engine:** An integrated tax calculator automatically applies the correct US state sales tax (e.g., 7.25% for CA, 0% for OR) during the checkout process based on the user's map location.
- ❤️ **Wishlist & Cart Management:** Users can save items for later, move them directly to their cart, and checkout with full inventory validation to prevent overselling.
- 🖼️ **Multi-Image Carousels:** Products support multi-image uploads. The React frontend cleanly parses the image data to build interactive, hoverable image carousels for the product details page.

---

## 💻 Tech Stack Overview

- **Frontend:** React, Vite, Tailwind CSS, Framer Motion, Leaflet.js (Maps)
- **API Gateways:** Python, Flask, Flask-CORS
- **Microservices:** gRPC, Protocol Buffers (Protobuf), Zeep (SOAP)
- **Database:** SQLite3
- **AI Integration:** OpenAI API (`gpt-4o-mini`)

---

## ⚙️ Installation & Setup

1. **Clone the repository:**

```bash
git clone https://github.com/saitejapoluka249/ai-distributed-marketplace.git
cd ai-distributed-marketplace

```

2. **Set up the Python backend environment:**

```bash
python3 -m venv venv_ai_marketplace
source venv_ai_marketplace/bin/activate
pip install -r requirements.txt

```

3. **Compile the Protocol Buffers:**

```bash
python -m grpc_tools.protoc -I. --python_out=. --grpc_python_out=. ecommerce.proto

```

4. **Set up the React Frontend:**

```bash
cd frontend
npm install

```

## 🚀 Running the System

You must start the servers from the bottom tier up. Open a separate terminal for each step.

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
_(Note: Ensure you have added your Google App Password to the `SENDER_PASSWORD` variable in both servers if you wish to test live email routing)._

```bash
python3 -m app_servers.buyer_server
python3 -m app_servers.seller_server

```

**4. Start the Frontend Application:**

```bash
cd frontend
npm run dev

```

_Note: Ensure you have an `.env` file in your root directory containing your `OPENAI_API_KEY`, `SENDER_EMAIL`, and `SENDER_PASSWORD`._
