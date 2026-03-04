import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ReviewModal from './ReviewModal'; 
import TrackOrderModal from './TrackOrderModal'; // <-- NEW: Import the Tracking Modal

const BASE_URL = 'http://localhost:7003';

export default function Orders({ sessionId }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Review Modal State
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewTargetId, setReviewTargetId] = useState('');
  const [reviewTargetType, setReviewTargetType] = useState('item');

  // Tracking Modal State
  const [trackingOrder, setTrackingOrder] = useState(null); // <-- NEW: Track order state

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch(`${BASE_URL}/orders?sess_id=${sessionId}`);
        const data = await response.json();
        if (data.status === 'SUCCESS') setOrders(data.orders);
        else setError(data.message || 'Failed to load orders.');
      } catch (err) {
        setError('Cannot connect to the backend server.');
      } finally {
        setLoading(false);
      }
    };
    if (sessionId) fetchOrders();
  }, [sessionId]);

  const openReview = (type, id) => {
    setReviewTargetType(type);
    setReviewTargetId(id);
    setIsReviewOpen(true);
  };

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300 } } };

  // Helper to render the colored status badge
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'PROCESSING': return <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800">Processing</span>;
      case 'SHIPPED': return <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">Shipped</span>;
      case 'DELIVERED': return <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">Delivered</span>;
      default: return <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  if (error) return <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center font-bold">{error}</div>;

  if (orders.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm mt-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">No orders yet</h3>
        <p className="text-gray-500">When you purchase items, they will securely appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-4 relative">
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid gap-6">
        {orders.map((order) => (
          <motion.div key={order.order_id} variants={itemVariants} className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col shadow-sm hover:shadow-md transition-shadow">
            
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center w-full">
              {/* Left side: Order Info & Image */}
              <div className="flex items-center gap-5 flex-1 w-full">
                <div className="w-16 h-16 shrink-0 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden border border-gray-200">
                  {order.image_url ? (
                    <img src={order.image_url} alt={order.item} className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-gray-900">{order.item}</h4>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                    <span className="font-medium">Qty: {order.qty}</span>
                    <span className="font-medium">Seller: {order.seller}</span>
                  </div>
                  <div className="mt-2 text-xs font-mono text-gray-400">ID: {order.order_id}</div>
                  <div className="mt-1 text-xs text-gray-400">Date: {order.timestamp}</div>
                </div>
              </div>

              {/* Right side: Price & Status & Track Button */}
              <div className="flex flex-col items-start sm:items-end justify-between sm:gap-2 border-t sm:border-t-0 border-gray-100 pt-4 sm:pt-0 w-full sm:w-auto">
                <span className="text-2xl font-black text-gray-900">${order.total}</span>
                
                <div className="flex flex-col items-end gap-2 mt-2">
                  {renderStatusBadge(order.status)}
                  
                  {/* The Track Package Button (Shows for ALL statuses) */}
                  {(order.status === 'PROCESSING' || order.status === 'SHIPPED' || order.status === 'DELIVERED') && (
                    <button 
                      onClick={() => setTrackingOrder(order)}
                      className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors border border-indigo-100 shadow-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                      Track Package
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS: Only show if DELIVERED */}
            <div className="mt-6 pt-4 border-t border-gray-100 flex gap-3 sm:justify-end items-center">
              {order.status === 'DELIVERED' ? (
                <>
                  <button 
                    onClick={() => openReview('item', order.item_id)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-bold rounded-xl transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    Review Item
                  </button>
                  <button 
                    onClick={() => openReview('seller', order.seller)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 text-sm font-bold rounded-xl transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                    Review Seller
                  </button>
                </>
              ) : (
                <p className="text-sm text-gray-500 italic flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                  Reviews unlock after delivery
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Render the Review Modal */}
      <ReviewModal 
        isOpen={isReviewOpen} 
        onClose={() => setIsReviewOpen(false)} 
        targetId={reviewTargetId} 
        targetType={reviewTargetType}
        sessionId={sessionId}
      />

      {/* Render the Tracking Map Modal */}
      <TrackOrderModal 
        isOpen={!!trackingOrder} 
        onClose={() => setTrackingOrder(null)} 
        order={trackingOrder} 
      />
    </div>
  );
}