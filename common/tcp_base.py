import socket
from common.protocol import send_msg, recv_msg

class TCPClient:
    def __init__(self, host, port, timeout=30):
        self.addr = (host, port)
        self.timeout = timeout
        self.sock = None 

    def connect(self):
        """Open the persistent pipe."""
        if not self.sock:
            self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.sock.settimeout(self.timeout)
            self.sock.connect(self.addr)

    def send_receive(self, msg):
        """Send and receive over the open pipe."""
        try:
            send_msg(self.sock, msg)
            return recv_msg(self.sock)
        except Exception as e:
            return f"FAIL|{e}"

    def close(self):
        """Close the pipe."""
        if self.sock:
            self.sock.close()
            self.sock = None

class TCPServer:
    @staticmethod
    def start_listening(port, backlog=500):
        server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server.bind(('0.0.0.0', port))
        server.listen(backlog)
        return server