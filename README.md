# **README.md**

## **System Design**

This project implements a 3-tier distributed marketplace. It moves away from the raw TCP sockets used in PA1 and instead uses **gRPC** for backend communication. The system is built with:

- **Client Tier:** RESTful clients for Buyers and Sellers.
- **Application Tier:** Stateless Flask servers that handle business logic and talk to the databases via gRPC.
- **Database Tier:** gRPC servers managing SQLite databases with **Write-Ahead Logging (WAL)** to support high concurrency.

## **Technical Features & Assumptions**

- **gRPC Optimization:** Servers use 100 max workers and 200 concurrent streams to prevent network bottlenecks.
- **Persistence:** Data is stored in `.db` files on the VM disk, ensuring it is preserved if the process restarts.
- **Deployment:** All VMs are assumed to be in the same GCP region to utilize low-latency internal IP communication.

## **Current Status**

The system is fully functional and stable. It successfully handles the 200-client stress test (Scenario 3) with a throughput of over 220 ops/sec. All core features like account management, cart operations, purchasing operations, and feedback are working.

---

# **GCP Setup & Execution Guide**

To run this system on Google Cloud, follow these steps across your four VMs. Ensure you have uploaded your `DistributedSystemSetup.sh` script to the home directory of each VM first.

### **Step 1: Database Tier Setup**

**On VM 1 (customer-db):**

```bash
bash DistributedSystemSetup.sh database_tier.customer_db

```

**On VM 2 (product-db):**

```bash
bash DistributedSystemSetup.sh database_tier.product_db

```

### **Step 2: Application Tier Setup**

**On VM 3 (seller-server):**

```bash
bash DistributedSystemSetup.sh app_servers.seller_server

```

**On VM 4 (buyer-server) - You need two windows:**

- **Window A (Buyer Server):**

```bash
bash DistributedSystemSetup.sh app_servers.buyer_server

```

- **Window B (Financial SOAP Service):**
  Open a second SSH connection to the same VM and run:

```bash
cd Distributed-Marketplace-Project-Python
python3 financial_service.py

```

### **Step 3: Performance Evaluation**

Once all four servers are running and showing logs, go to your **5th VM (evaluation)** and run the benchmark:

```bash
sudo apt update -y
sudo apt install git python3-pip -y
git clone https://github.com/saitejapoluka249/Distributed-Marketplace-Project-Python.git
cd Distributed-Marketplace-Project-Python/
pip3 install requests --break-system-packages
python3 evaluation.py

```
