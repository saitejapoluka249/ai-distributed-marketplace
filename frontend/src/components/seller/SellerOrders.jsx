import { useState, useEffect } from 'react';

const SELLER_URL = 'http://localhost:7001';

export default function SellerOrders({ sessionId }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${SELLER_URL}/orders?sess_id=${sessionId}`);
      const data = await response.json();
      if (data.status === 'SUCCESS') {
        setOrders(data.orders);
      }
    } catch (err) {
      console.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId) fetchOrders();
  }, [sessionId]);

  const handleUpdateStatus = async (orderId, currentStatus) => {
    // Determine the next logical status
    let nextStatus = '';
    if (currentStatus === 'PROCESSING') nextStatus = 'SHIPPED';
    else if (currentStatus === 'SHIPPED') nextStatus = 'DELIVERED';
    else return; // If delivered, do nothing

    if (!window.confirm(`Are you sure you want to mark this order as ${nextStatus}?`)) return;

    try {
      const response = await fetch(`${SELLER_URL}/orders`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sess_id: sessionId, order_id: orderId, status: nextStatus })
      });
      const data = await response.json();
      
      if (data.status === 'SUCCESS') {
        fetchOrders(); // Refresh the list to show the new status!
      } else {
        alert(`❌ Error: ${data.message}`);
      }
    } catch (err) {
      alert("Connection error.");
    }
  };

  // Helper to render beautiful professional badges
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'PROCESSING':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">Processing</span>;
      case 'SHIPPED':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">Shipped</span>;
      case 'DELIVERED':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Delivered</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Control Bar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
          </div>
          <h2 className="text-lg font-bold text-slate-800">Order Fulfillment</h2>
        </div>
        <button onClick={fetchOrders} className="text-sm font-bold text-teal-600 hover:text-teal-800 flex items-center gap-1 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          Refresh Data
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Order ID</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Item Details</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Total Value</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Fulfillment Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="6" className="py-12 text-center text-slate-500 font-medium">Loading orders...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan="6" className="py-12 text-center text-slate-500 font-medium">No orders found.</td></tr>
              ) : (
                orders.map((order, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6 text-xs font-mono text-slate-500 w-32 truncate" title={order.order_id}>
                      {order.order_id.substring(0, 8)}...
                    </td>
                    <td className="py-4 px-6 text-sm font-bold text-slate-900">{order.buyer}</td>
                    <td className="py-4 px-6">
                      <p className="text-sm font-bold text-slate-900">{order.item}</p>
                      <p className="text-xs text-slate-500">Qty: {order.qty}</p>
                    </td>
                    <td className="py-4 px-6 text-sm font-bold text-slate-900">${parseFloat(order.total).toFixed(2)}</td>
                    <td className="py-4 px-6">{renderStatusBadge(order.status)}</td>
                    <td className="py-4 px-6 text-right">
                      {order.status === 'PROCESSING' && (
                        <button 
                          onClick={() => handleUpdateStatus(order.order_id, order.status)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                        >
                          Mark as Shipped
                        </button>
                      )}
                      {order.status === 'SHIPPED' && (
                        <button 
                          onClick={() => handleUpdateStatus(order.order_id, order.status)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                        >
                          Mark Delivered
                        </button>
                      )}
                      {order.status === 'DELIVERED' && (
                        <span className="text-xs font-bold text-slate-400 flex items-center justify-end gap-1">
                          <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                          Completed
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}