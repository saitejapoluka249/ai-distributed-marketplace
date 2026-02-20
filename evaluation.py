import requests
import threading
import time
import uuid
import statistics

# --- CONFIGURATION (UPDATE THESE IPs) ---
BUYER_SERVER_URL = "http://10.128.0.4:5003"
SELLER_SERVER_URL = "http://10.128.0.5:5001"

NUMBER_OF_REQUESTS_PER_CLIENT = 1000  
NUMBER_OF_RUNS = 10                  

def run_buyer_session(bot_id, latencies, lock):
    """Simulates a RESTful buyer bot performing 1000 searches."""
    session = requests.Session() 
    username = f"b_bot_{bot_id}_{uuid.uuid4().hex[:4]}"
    password = "pass"
    
    try:
        # 1. Create Account
        session.post(f"{BUYER_SERVER_URL}/create_account", json={"username": username, "password": password})
        
        # 2. Login
        login_resp = session.post(f"{BUYER_SERVER_URL}/login", json={"username": username, "password": password})
        data = login_resp.json()
        
        if data.get("status") != "SUCCESS":
            print(f"Buyer {bot_id} Login Failed: {data}")
            return
            
        # 3. Perform 1000 API Calls (Search Items)
        for _ in range(NUMBER_OF_REQUESTS_PER_CLIENT):
            start = time.perf_counter()
            
            # Calling your GET /search route
            resp = session.get(f"{BUYER_SERVER_URL}/search", params={"category": 1, "keywords": "test"})
            
            end = time.perf_counter()
            
            if resp.status_code == 200 and resp.json().get("status") == "SUCCESS":
                with lock:
                    latencies.append(end - start)
            else:
                break
                
    except Exception as e:
        pass # Ignore connection drops during heavy load to keep calculating averages

def run_seller_session(bot_id, latencies, lock):
    """Simulates a RESTful seller bot performing 1000 rating checks."""
    session = requests.Session()
    username = f"s_bot_{bot_id}_{uuid.uuid4().hex[:4]}"
    password = "pass"
    
    try:
        # 1. Create Account
        session.post(f"{SELLER_SERVER_URL}/create_account", json={"username": username, "password": password})
        
        # 2. Login
        login_resp = session.post(f"{SELLER_SERVER_URL}/login", json={"username": username, "password": password})
        data = login_resp.json()
        
        if data.get("status") != "SUCCESS":
            print(f"Seller {bot_id} Login Failed: {data}")
            return
            
        sess_id = data.get("sess_id")

        # 3. Perform 1000 API Calls (Get Rating)
        for _ in range(NUMBER_OF_REQUESTS_PER_CLIENT):
            start = time.perf_counter()
            
            # Calling your GET /rating route
            resp = session.get(f"{SELLER_SERVER_URL}/rating", params={"sess_id": sess_id})
            
            end = time.perf_counter()
            
            # Your seller rating route returns {"up": X, "down": Y}, so we just check status_code 200
            if resp.status_code == 200:
                with lock:
                    latencies.append(end - start)
            else:
                break

    except Exception as e:
        pass

def run_experiment(num_buyers, num_sellers, run_idx):
    """Executes a single run of concurrent users."""
    latencies = []
    lock = threading.Lock()
    threads = []
    
    start_wall_time = time.perf_counter()
    
    for i in range(num_buyers):
        t = threading.Thread(target=run_buyer_session, args=(i, latencies, lock))
        threads.append(t)
    for i in range(num_sellers):
        t = threading.Thread(target=run_seller_session, args=(i, latencies, lock))
        threads.append(t)
        
    for t in threads: t.start()
    for t in threads: t.join()
        
    end_wall_time = time.perf_counter()
    
    total_duration = end_wall_time - start_wall_time
    total_ops = len(latencies)
    
    avg_latency = (sum(latencies) / total_ops) * 1000 if total_ops > 0 else 0
    throughput = total_ops / total_duration if total_duration > 0 else 0
    
    print(f"   Run {run_idx+1}: {avg_latency:.2f} ms | {throughput:.2f} ops/sec")
    return avg_latency, throughput

def evaluate_scenario(num_buyers, num_sellers):
    """Averages metrics over 10 runs for a specific scenario."""
    print(f"\n" + "="*60)
    print(f"SCENARIO: {num_buyers} Buyers & {num_sellers} Sellers")
    print(f"Target: {num_buyers+num_sellers} clients x {NUMBER_OF_REQUESTS_PER_CLIENT} calls")
    print("="*60)
    
    run_latencies = []
    run_throughputs = []
    
    for i in range(NUMBER_OF_RUNS):
        lat, thr = run_experiment(num_buyers, num_sellers, i)
        run_latencies.append(lat)
        run_throughputs.append(thr)
        time.sleep(1) # Let the servers breathe between runs
        
    final_avg_lat = statistics.mean(run_latencies)
    final_avg_thr = statistics.mean(run_throughputs)
    
    print(f"-"*60)
    print(f"FINAL AVERAGE >> Latency: {final_avg_lat:.2f} ms | Throughput: {final_avg_thr:.2f} ops/sec")
    print(f"-"*60)

if __name__ == "__main__":
    # Scenario 1
    #evaluate_scenario(1, 1)
    
    # Scenario 2
    evaluate_scenario(10, 10)
    
    # Scenario 3
    # evaluate_scenario(100, 100)