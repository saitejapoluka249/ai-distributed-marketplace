import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BASE_URL = 'http://localhost:7003';

export default function SellerModal({ isOpen, onClose, sellerId }) {
  const [sellerData, setSellerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && sellerId) {
      setLoading(true);
      setError('');
      
      const fetchSeller = async () => {
        try {
          const response = await fetch(`${BASE_URL}/rating/seller?seller_id=${sellerId}`);
          const data = await response.json();
          if (data.status === 'SUCCESS') {
            setSellerData(data);
          } else {
            setError(data.message || 'Failed to load seller details.');
          }
        } catch (err) {
          setError('Cannot connect to backend server.');
        } finally {
          setLoading(false);
        }
      };
      fetchSeller();
    }
  }, [isOpen, sellerId]);

  const renderStars = (rating) => {
    return [...Array(5)].map((_, index) => {
      const isFull = rating >= index + 1;
      const isHalf = !isFull && rating >= index + 0.5;

      return (
        <div key={index} className="relative w-5 h-5">
          {/* 1. The Background Gray Star (Empty) */}
          <svg className="absolute top-0 left-0 w-5 h-5 text-gray-200" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          
          {/* 2. The Foreground Yellow Star (Full or perfectly cut in half!) */}
          {(isFull || isHalf) && (
            <svg 
              className="absolute top-0 left-0 h-5 w-5 text-yellow-400" 
              fill="currentColor" 
              viewBox="0 0 20 20"
              style={{ clipPath: isHalf ? 'inset(0 50% 0 0)' : 'none' }} 
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          )}
        </div>
      );
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white flex justify-between items-center">
              <h3 className="text-2xl font-bold">Seller Profile</h3>
              <button onClick={onClose} className="p-2 bg-white/20 hover:bg-white/40 rounded-full transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div></div>
              ) : error ? (
                <div className="text-center text-red-500 font-bold bg-red-50 p-4 rounded-xl">{error}</div>
              ) : sellerData && (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
                    <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center border-2 border-purple-200">
                      <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-gray-900">{sellerId}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex">{renderStars(sellerData.avg_rating || 0)}</div>
                        <span className="text-sm font-bold text-gray-500">({sellerData.avg_rating || "New"} / 5.0)</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Customer Feedback</h3>
                    {(!sellerData.reviews || sellerData.reviews.length === 0) ? (
                      <p className="text-gray-500 italic text-sm">This seller has no reviews yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {sellerData.reviews.map((rev, idx) => (
                          <div key={idx} className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-bold text-sm text-gray-900">{rev.user}</span>
                              <div className="flex">{renderStars(rev.stars)}</div>
                            </div>
                            <p className="text-gray-600 text-sm">{rev.review}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}