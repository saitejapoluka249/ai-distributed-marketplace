import requests
import threading
import time
import uuid

# --- SERVER ENDPOINTS ---
BUYER_API = "http://10.128.0.10:5003"
SELLER_API = "http://10.128.0.11:5001"

REQUESTS_PER_USER = 1000
ITERATIONS = 3

def setup_client_session(user_type, index):
    """Authenticates a bot and returns an active session with its ID."""
    req_session = requests.Session()
    uid = f"{user_type}Test_{index}_{uuid.uuid4().hex[:5]}"
    base_url = BUYER_API if user_type == "buyer" else SELLER_API
    
    try:
        # Create user (ignore if already exists)
        req_session.post(f"{base_url}/create_account", json={"username": uid, "password": "123"})
    except Exception:
        pass
        
    # Login and save session token
    login_response = req_session.post(f"{base_url}/login", json={"username": uid, "password": "123"})
    if login_response.status_code == 200:
        return req_session, login_response.json().get("sess_id")
    return req_session, None

def execute_workload(user_type, req_session, session_token, latencies, thread_lock):
    """Fires 1000 requests using an established connection."""
    base_url = BUYER_API if user_type == "buyer" else SELLER_API
    
    for _ in range(REQUESTS_PER_USER):
        t_start = time.perf_counter()
        try:
            if user_type == "buyer":
                res = req_session.get(f"{base_url}/search", params={"category": 1, "keywords": "test"})
            else:
                res = req_session.get(f"{base_url}/rating", params={"sess_id": session_token})
                
            t_end = time.perf_counter()
            
            if res.status_code == 200:
                with thread_lock:
                    latencies.append(t_end - t_start)
        except Exception:
            pass

def execute_iteration(buyers_count, sellers_count, b_sessions, s_sessions, iteration_num):
    latencies = []
    thread_lock = threading.Lock()
    worker_threads = []
    
    clock_start = time.perf_counter()

    # Launching buyers
    for idx in range(buyers_count):
        session, s_id = b_sessions[idx]
        if s_id:
            th = threading.Thread(target=execute_workload, args=("buyer", session, s_id, latencies, thread_lock))
            worker_threads.append(th)
            th.start()
            # Stagger threads to prevent connection drops
            if buyers_count + sellers_count > 50:
                time.sleep(0.001)

    # Launching sellers
    for idx in range(sellers_count):
        session, s_id = s_sessions[idx]
        if s_id:
            th = threading.Thread(target=execute_workload, args=("seller", session, s_id, latencies, thread_lock))
            worker_threads.append(th)
            th.start()
            # Stagger threads to prevent connection drops
            if buyers_count + sellers_count > 50:
                time.sleep(0.001)

    for th in worker_threads:
        th.join()

    clock_end = time.perf_counter()
    
    duration = clock_end - clock_start
    successful_requests = len(latencies)
    
    mean_latency = (sum(latencies) / successful_requests) * 1000 if successful_requests > 0 else 0
    ops_per_sec = successful_requests / duration if duration > 0 else 0
    
    print(f" --> Iteration {iteration_num}/{ITERATIONS} | Latency: {mean_latency:.2f}ms | Throughput: {ops_per_sec:.2f} req/sec | Time: {duration:.2f}s")
    return mean_latency, ops_per_sec

def benchmark_scenario(b_count, s_count):
    print("\n" + "#" * 60)
    print(f"BENCHMARK: {b_count} Buyers & {s_count} Sellers")
    print(f"Total Load: {(b_count + s_count) * REQUESTS_PER_USER} requests per iteration")
    print("#" * 60)
    
    print("Initializing bot sessions... Please wait.")
    b_sessions = [setup_client_session("buyer", i) for i in range(b_count)]
    s_sessions = [setup_client_session("seller", i) for i in range(s_count)]
    print("Setup complete. Starting timers...\n")
    
    scenario_latencies = []
    scenario_throughputs = []
    
    for i in range(ITERATIONS):
        lat, thr = execute_iteration(b_count, s_count, b_sessions, s_sessions, i + 1)
        scenario_latencies.append(lat)
        scenario_throughputs.append(thr)
        time.sleep(1.5) # Brief pause between iterations
        
    overall_lat = sum(scenario_latencies) / len(scenario_latencies)
    overall_thr = sum(scenario_throughputs) / len(scenario_throughputs)
    
    print("-" * 40)
    print(f"Mean Scenario Latency    : {overall_lat:.2f} ms")
    print(f"Mean Scenario Throughput : {overall_thr:.2f} requests/second")
    print("-" * 40)
    
    return overall_lat, overall_thr

if __name__ == "__main__":
    metrics = []
    test_cases = [(1, 1), (10, 10), (100, 100)]
    
    for b, s in test_cases:
        lat, thr = benchmark_scenario(b, s)
        metrics.append((b, s, lat, thr))
        
    # Unique Summary Output
    print("\n\n" + "*" * 65)
    print("FINAL PERFORMANCE REPORT")
    print("*" * 65)
    print(f"{'Concurrency Profile':<25} | {'Response Time (ms)':<20} | {'Ops/Second':<15}")
    print("-" * 65)
    for b, s, lat, thr in metrics:
        print(f"{b} Buyers, {s} Sellers".ljust(25) + f"| {lat:<20.2f} | {thr:<15.2f}")