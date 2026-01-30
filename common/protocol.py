import socket

HEADER = 64
FORMAT = 'utf-8'

def send_msg(sock, msg):
    """Sends a message with a length header."""
    message = msg.encode(FORMAT)
    msg_length = len(message)
    send_length = str(msg_length).encode(FORMAT)
    send_length += b' ' * (HEADER - len(send_length))
    sock.send(send_length)
    sock.send(message)

def recv_msg(sock):
    """Receives a message using the length header."""
    try:
        msg_length = sock.recv(HEADER).decode(FORMAT)
        if not msg_length: return None
        msg_length = int(msg_length)
        msg = sock.recv(msg_length).decode(FORMAT)
        return msg
    except:
        return None