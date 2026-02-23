from spyne import Application, rpc, ServiceBase, Unicode
from spyne.protocol.soap import Soap11
from spyne.server.wsgi import WsgiApplication
from wsgiref.simple_server import make_server
import random
import re

class FinancialService(ServiceBase):
    @rpc(Unicode, Unicode, Unicode, Unicode, _returns=Unicode)
    def process_payment(ctx, name, cc_number, exp_date, sec_code):
        print(f"[SOAP] Received Payment Request for {name}...")
        
        if not re.match(r"^[a-zA-Z\s\-\']+$", str(name)):
            return "ERROR: Invalid Name (Cannot contain numbers or symbols)"
        if not re.match(r"^\d{16}$", str(cc_number)):
            return "ERROR: Invalid Credit Card (Must be exactly 16 digits)"
        if not re.match(r"^(0[1-9]|1[0-2])\/\d{2}$", str(exp_date)):
            return "ERROR: Invalid Expiry Date (Format must be MM/YY)"
        if not re.match(r"^\d{3}$", str(sec_code)):
            return "ERROR: Invalid CVV (Must be exactly 3 digits)"

        if random.random() < 0.90:
            print("[SOAP] Result: SUCCESS")
            return "SUCCESS"
        else:
            print("[SOAP] Result: FAIL (Random 10% rejection)")
            return "FAIL: Transaction Declined by Bank"

application = Application([FinancialService], 'tns.financial',
                          in_protocol=Soap11(validator='lxml'),
                          out_protocol=Soap11())

wsgi_app = WsgiApplication(application)

if __name__ == '__main__':
    print("Financial Service (SOAP) running on 9003...")
    server = make_server('0.0.0.0', 9003, wsgi_app)
    server.serve_forever()