import threading
import time
import random
import string
from common.tcp_base import TCPClient

BUYER_SERVER_ADDRESS = ('localhost', 8001)
SELLER_SERVER_ADDRESS = ('localhost', 8000)
NUMBER_OF_REQUESTS_PER_CLIENT = 1000  
NUMBER_OF_RUNS = 10  

def generate_random_str(length=8):
    return ''.join(random.choices(string.ascii_letters, k=length))

def run_buyer_session(client_id, latencies, lock):
    """Simulates a single buyer using the robust TCPClient."""
    client = TCPClient(BUYER_SERVER_ADDRESS[0], BUYER_SERVER_ADDRESS[1])
    try:
        client.connect()
        
        username = f"user_{client_id}_{generate_random_str()}"
        password = "password"
        
        client.send_receive(f"CREATE_ACCOUNT|{username}|{password}")
        resp = client.send_receive(f"LOGIN|{username}|{password}")
        
        if not resp or "SUCCESS" not in resp:
            client.close()
            return
        
        sid = resp.split("|")[1]
        
        for i in range(NUMBER_OF_REQUESTS_PER_CLIENT):
            start = time.perf_counter() 
            resp = client.send_receive(f"SEARCH|{sid}|1|shoes") 
            
            if not resp or "FAIL" in resp:
                break

            end = time.perf_counter()
            with lock:
                latencies.append(end - start)
                
    except Exception as e:
        print(f"Buyer {client_id} Exception: {e}")
    finally:
        client.close()

def run_seller_session(client_id, latencies, lock):
    """Simulates a single seller using the robust TCPClient."""
    client = TCPClient(SELLER_SERVER_ADDRESS[0], SELLER_SERVER_ADDRESS[1])
    try:
        client.connect()
        
        username = f"seller_{client_id}_{generate_random_str()}"
        password = "password"
        
        client.send_receive(f"CREATE_ACCOUNT|{username}|{password}")
        resp = client.send_receive(f"LOGIN|{username}|{password}")
        
        if not resp or "SUCCESS" not in resp:
            client.close()
            return

        sid = resp.split("|")[1]
        
        for i in range(NUMBER_OF_REQUESTS_PER_CLIENT):
            start = time.perf_counter()
            resp = client.send_receive(f"GET_RATING|{sid}")
            
            if not resp or "FAIL" in resp:
                break

            end = time.perf_counter()
            with lock:
                latencies.append(end - start)

    except Exception as e:
        print(f"Seller {client_id} Exception: {e}")
    finally:
        client.close()

def run_batch(num_buyers, num_sellers, run_idx):
    """Runs a single iteration of the experiment."""
    latencies = []
    lock = threading.Lock()
    threads = []
    
    start_time_global = time.perf_counter()
    
    for i in range(num_buyers):
        t = threading.Thread(target=run_buyer_session, args=(i, latencies, lock))
        threads.append(t)
        t.start()
        
    for i in range(num_sellers):
        t = threading.Thread(target=run_seller_session, args=(i, latencies, lock))
        threads.append(t)
        t.start()
        
    for t in threads:
        t.join()
        
    end_time_global = time.perf_counter()
    total_duration = end_time_global - start_time_global
    
    total_opts = len(latencies)
    average_resp_time = (sum(latencies) / total_opts) * 1000 if total_opts > 0 else 0
    throughput = total_opts / total_duration if total_duration > 0 else 0
    
    print(f"   Run {run_idx+1}: {average_resp_time:.2f} ms | {throughput:.2f} ops/sec")
    
    return average_resp_time, throughput

def run_scenarios(num_buyers, num_sellers):
    """Runs the experiment multiple times and calculates average."""
    print(f"\n=======================================================")
    print(f"SCENARIO: {num_buyers} Buyers, {num_sellers} Sellers | {NUMBER_OF_RUNS} Runs")
    print(f"=======================================================")
    
    scenarios_latency = []
    scenarios_throughput = []
    
    for i in range(NUMBER_OF_RUNS):
        lat, thr = run_batch(num_buyers, num_sellers, i)
        scenarios_latency.append(lat)
        scenarios_throughput.append(thr)
        time.sleep(1) # Short cooldown between runs
        
    avg_lat = sum(scenarios_latency) / len(scenarios_latency)
    avg_thr = sum(scenarios_throughput) / len(scenarios_throughput)
    
    print(f"-------------------------------------------------------")
    print(f"FINAL AVERAGE >> Latency: {avg_lat:.2f} ms | Throughput: {avg_thr:.2f} ops/sec")
    print(f"-------------------------------------------------------\n")

if __name__ == "__main__":
    run_scenarios(1, 1)
    
    run_scenarios(10, 10)

    run_scenarios(100, 100)