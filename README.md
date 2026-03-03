# AI-Powered Distributed E-Commerce Marketplace

A robust, highly scalable 3-tier distributed e-commerce platform. This project demonstrates modern distributed systems architecture, utilizing a React.js frontend, RESTful Flask APIs for the application tier, gRPC for microservice communication, and third-party API integrations for live geolocation and automated email notifications.

## 🏗 System Architecture

This system follows a strict, highly decoupled 3-tier distributed design:

1. **Client Tier (Frontend):** A responsive, animated Single Page Application (SPA) built with React, Tailwind CSS, and Framer Motion.
2. **Application Tier (Middleware):** Flask RESTful servers that handle business logic, session validation, third-party API routing, and payload formatting.
3. **Database Tier (Microservices):** gRPC Python servers managing concurrent database connections using SQLite in Write-Ahead Logging (WAL) mode for thread-safe operations.
4. **External Services:** Integration with Google SMTP for automated emails and OpenStreetMap (OSM) for spatial data.

## ✨ Advanced Features

### 🗺️ Smart Geolocation Checkout

- **Interactive Map Integration:** Utilizes Leaflet.js to render a live, interactive map directly on the checkout page.
- **Reverse Geocoding:** Integrates the OpenStreetMap (OSM) Nominatim API. When a user drops a pin or requests their GPS location, the system automatically translates the mathematical coordinates into a formatted physical street address to auto-fill the shipping form.

### 📧 Automated SMTP Notification Engine

- **HTML Order Receipts:** A Python `smtplib` engine that dynamically generates and blasts formatted HTML email receipts to buyers the millisecond a SOAP payment clears, including precise subtotal, tax, and discount breakdowns.
- **Event-Driven Status Updates:** When a seller updates an order to `SHIPPED` or `DELIVERED` via their dashboard, the backend intercepts the gRPC update and instantly triggers an automated email to keep the buyer informed.

### 🎨 Modern, Real-Time UI/UX

- **Framer Motion Animations:** Smooth, physics-based transitions for cart drawers, tab switching, and a custom SVG-drawing success screen upon checkout completion.
- **Real-Time Data Syncing:** Engineered custom React Event Dispatchers (`window.dispatchEvent`) so that background inventory and dashboards update instantly across the app without requiring manual browser refreshes.
- **Base64 Image Processing:** Rich user profiles and product catalogs that handle image uploads by converting files to Base64 strings for seamless gRPC transmission and database storage.

### 🛒 Complex Business Logic & Security

- **Dynamic Promo Code Engine:** Secure discount system allowing sellers to generate promo codes. The backend dynamically recalculates cart totals to prevent client-side tampering.
- **Cryptographic Hashing & Sessions:** Secure `bcrypt` password hashing with dynamic salting, and stateful session tracking bridging the REST and gRPC boundaries.
- **Order Tracking & Fulfillment:** Stateful order management system (`PROCESSING`, `SHIPPED`, `DELIVERED`), complete with distinct buyer and seller tracking dashboards with image hydration.

## 🛠 Technology Stack

- **Frontend:** React.js, Vite, Tailwind CSS, Framer Motion, React-Leaflet
- **Backend Framework:** Python 3.x, Flask (REST)
- **RPC Framework:** gRPC & Protocol Buffers (`protobuf`)
- **External APIs:** OpenStreetMap (Nominatim), built-in `smtplib` (SMTP Email)
- **Security:** bcrypt, secure Base64 encoding
- **Database:** SQLite3 (WAL Mode for high concurrency)

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
python database_tier/customer_db.py
python database_tier/product_db.py

```

**2. Start the Financial Tier (SOAP):**

```bash
python financial_service.py

```

**3. Start the Application Tier (Flask REST):**
_(Note: Ensure you have added your Google App Password to the `SENDER_PASSWORD` variable in both servers if you wish to test live email routing)._

```bash
python app_servers/buyer_server.py
python app_servers/seller_server.py

```

**4. Start the Frontend Application:**

```bash
cd frontend
npm run dev

```

## 🔮 Future Roadmap

- **Phase 3 (Gen AI Injection):** Integrate Large Language Models (LLMs) to provide semantic search, AI-generated product descriptions, and highly personalized shopping recommendations based on purchase history.
- **Containerization:** Wrap the microservices in Docker containers and orchestrate them using Kubernetes for true cloud-native deployment.
