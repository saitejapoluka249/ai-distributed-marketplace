import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SellerModal from './SellerModal';

const BASE_URL = 'http://localhost:7003';

export default function ItemModal({ isOpen, onClose, itemId, sessionId }) {
  const [itemData, setItemData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addingToCart, setAddingToCart] = useState(false);
  const [isSellerModalOpen, setIsSellerModalOpen] = useState(false);

  const [aiSummary, setAiSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  
  useEffect(() => {
    if (isOpen && itemId) {
      setLoading(true);
      setError('');
      setItemData(null);
      setAiSummary(''); 

      const fetchItemDetails = async () => {
        try {
          const response = await fetch(`${BASE_URL}/item?item_id=${itemId}`);
          const data = await response.json();
          if (data.status === 'SUCCESS') {
            setItemData(data);
            
            if (data.reviews && data.reviews.length > 0) {
              setLoadingSummary(true);
              try {
                const summaryRes = await fetch(`${BASE_URL}/item/summary?item_id=${itemId}`);
                const summaryData = await summaryRes.json();
                if (summaryData.status === 'SUCCESS') {
                  setAiSummary(summaryData.summary);
                }
              } catch (e) {
                console.error("Failed to load AI summary");
              } finally {
                setLoadingSummary(false);
              }
            }

          } else {
            setError(data.message || 'Failed to load item details.');
          }
        } catch (err) {
          setError('Cannot connect to the backend server.');
        } finally {
          setLoading(false);
        }
      };

      fetchItemDetails();
    }
  }, [isOpen, itemId]);

  const handleAddToCart = async () => {
    setAddingToCart(true);
    try {
      const response = await fetch(`${BASE_URL}/cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sess_id: sessionId, item_id: itemId, qty: 1 })
      });
      const data = await response.json();
      if (data.status === 'SUCCESS') {
        alert("🎉 Item added to cart successfully!");
        onClose(); 
      } else {
        alert(`❌ Error: ${data.message}`);
      }
    } catch (err) {
      alert("❌ Connection Error.");
    } finally {
      setAddingToCart(false);
    }
  };

  const renderStars = (rating) => {
    const safeRating = rating || 0; 

    return [...Array(5)].map((_, index) => {
      const isFull = safeRating >= index + 1;
      const isHalf = !isFull && safeRating >= index + 0.5;

      return (
        <div key={index} className="relative w-5 h-5 flex-shrink-0">
          <svg className="absolute top-0 left-0 w-5 h-5 text-gray-200" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header / Banner Area */}
            <div className="h-16 sm:h-20 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 relative flex items-center justify-center shrink-0">
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 rounded-full backdrop-blur-sm transition-colors text-white z-10"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 sm:p-8 flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
                  <p className="text-gray-500 font-medium">Loading item details...</p>
                </div>
              ) : error ? (
                <div className="text-center text-red-500 py-12 bg-red-50 rounded-xl font-bold">{error}</div>
              ) : itemData && (
                <div className="space-y-8">
                  
                  {/* Product Image Panel */}
                  <div className="w-full bg-gray-50 flex flex-col justify-center items-center border border-gray-100 rounded-2xl p-4 min-h-[300px] relative overflow-hidden">
                    {itemData.image_url ? (
                       <img src={itemData.image_url} alt={itemData.name} className="w-full h-full object-cover rounded-xl shadow-sm absolute inset-0" />
                    ) : (
                       <>
                         <div className="w-24 h-24 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
                            <svg className="w-12 h-12 text-indigo-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                         </div>
                         <span className="text-gray-400 font-medium text-sm">No Image Provided</span>
                       </>
                    )}
                  </div>

                  {/* Title & Price Section */}
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider rounded-md">Category {itemData.category}</span>
                        <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-md">ID: {itemId}</span>
                      </div>
                      <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">{itemData.name}</h2>
                      <div className="flex items-center gap-2 mt-3">
                        <div className="flex">{renderStars(itemData.rating)}</div>
                        <span className="text-sm font-medium text-gray-500">({itemData.rating} / 5.0)</span>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">${itemData.price}</p>
                      <p className={`text-sm font-bold mt-1 flex items-center sm:justify-end gap-1 ${itemData.quantity > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {itemData.quantity > 0 ? (
                          <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg> {itemData.quantity} in stock</>
                        ) : 'Out of stock'}
                      </p>
                    </div>
                  </div>

                  {/* Seller Info Box */}
                  <div className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-bold uppercase">Sold by</p>
                        <button 
                          onClick={() => setIsSellerModalOpen(true)}
                          className="text-sm font-bold text-indigo-600 hover:text-indigo-800 hover:underline transition-all text-left"
                        >
                          {itemData.seller}
                        </button>
                      </div>
                    </div>
                  </div>

{/* --- NEW: AI INSIGHTS SUMMARIZER --- */}
{itemData.reviews && itemData.reviews.length > 0 && (
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-5 mb-6 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                        <h4 className="font-black text-indigo-900 tracking-tight">AI Insights</h4>
                      </div>
                      {loadingSummary ? (
                        <div className="flex items-center gap-2 text-indigo-400 text-sm font-medium animate-pulse">
                          Generating summary based on {itemData.reviews.length} reviews...
                        </div>
                      ) : (
                        <p className="text-sm text-indigo-900/80 leading-relaxed font-medium">
                          {aiSummary}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Reviews Section */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Customer Reviews</h3>
                    {(!itemData.reviews || itemData.reviews.length === 0) ? (
                      <p className="text-gray-500 italic text-sm py-4">No reviews yet. Be the first to review this item after purchasing!</p>
                    ) : (
                      <div className="space-y-4">
                        {itemData.reviews.map((rev, idx) => (
                          <div key={idx} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-bold text-sm text-gray-900">{rev.user}</span>
                              <div className="flex">{renderStars(rev.stars)}</div>
                            </div>
                            <p className="text-gray-600 text-sm leading-relaxed">{rev.review}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>

            {/* Footer Action Area */}
            {itemData && (
              <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-4 shrink-0">
                <button 
                  onClick={async () => {
                    try {
                      const r = await fetch(`${BASE_URL}/wishlist`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sess_id: sessionId, item_id: itemId })
                      });
                      const d = await r.json();
                      alert(d.status === 'SUCCESS' ? "💖 Added to Wishlist!" : `ℹ️ ${d.message}`);
                    } catch(e) { alert("❌ Error connecting to server."); }
                  }}
                  className="w-14 h-14 shrink-0 bg-white border-2 border-pink-100 hover:border-pink-500 hover:bg-pink-50 text-pink-500 rounded-xl flex items-center justify-center transition-all shadow-sm"
                  title="Save to Wishlist"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                </button>
                <button 
                  onClick={handleAddToCart}
                  disabled={addingToCart || itemData.quantity <= 0}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                >
                  {addingToCart ? 'Processing...' : itemData.quantity > 0 ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                      Add to Cart
                    </>
                  ) : 'Out of Stock'}
                </button>
              </div>
            )}
          </motion.div>
          <SellerModal 
            isOpen={isSellerModalOpen} 
            onClose={() => setIsSellerModalOpen(false)} 
            sellerId={itemData?.seller} 
          />
        </div>
      )}
    </AnimatePresence>
  );
}