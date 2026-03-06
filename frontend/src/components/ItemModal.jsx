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

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [aiDescription, setAiDescription] = useState('');
  const [loadingDesc, setLoadingDesc] = useState(false);
  
  useEffect(() => {
    if (isOpen && itemId) {
      setLoading(true);
      setError('');
      setItemData(null);
      setAiSummary('');
      setAiDescription('');
      setCurrentImageIndex(0);

      const fetchItemDetails = async () => {
        try {
          const response = await fetch(`${BASE_URL}/item?item_id=${itemId}`);
          const data = await response.json();
          if (data.status === 'SUCCESS') {
            setItemData(data);
            
            // 1. Fetch AI Review Summary
            if (data.reviews && data.reviews.length > 0) {
              setLoadingSummary(true);
              fetch(`${BASE_URL}/item/summary?item_id=${itemId}`)
                .then(res => res.json())
                .then(summaryData => { if (summaryData.status === 'SUCCESS') setAiSummary(summaryData.summary); })
                .finally(() => setLoadingSummary(false));
            }

            setLoadingDesc(true);
            fetch(`${BASE_URL}/item/description?item_id=${itemId}`)
              .then(res => res.json())
              .then(descData => { if (descData.status === 'SUCCESS') setAiDescription(descData.description); })
              .finally(() => setLoadingDesc(false));

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
    } catch (err) { alert("❌ Connection Error."); } 
    finally { setAddingToCart(false); }
  };

  const renderStars = (rating) => {
    const safeRating = rating || 0; 
    return [...Array(5)].map((_, index) => {
      const isFull = safeRating >= index + 1;
      const isHalf = !isFull && safeRating >= index + 0.5;
      return (
        <div key={index} className="relative w-5 h-5 flex-shrink-0">
          <svg className="absolute top-0 left-0 w-5 h-5 text-gray-200" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
          {(isFull || isHalf) && (
            <svg className="absolute top-0 left-0 h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20" style={{ clipPath: isHalf ? 'inset(0 50% 0 0)' : 'none' }}>
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          )}
        </div>
      );
    });
  };

  const images = itemData?.image_url ? itemData.image_url.split('|||') : [];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-gray-600 z-50">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-24"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>
              ) : error ? (
                <div className="text-center text-red-500 py-12 font-bold">{error}</div>
              ) : itemData && (
                <div className="flex flex-col md:flex-row h-full">
                  
                  {/* LEFT SIDE: AMAZON STYLE IMAGE CAROUSEL */}
                  <div className="w-full md:w-1/2 p-6 md:p-8 bg-white border-r border-gray-100 flex flex-col group">
                    <div className="relative w-full aspect-square flex items-center justify-center rounded-2xl overflow-hidden bg-white mb-4">
                      {images.length > 0 ? (
                        <>
                          <img src={images[currentImageIndex]} className="w-full h-full object-contain p-4" alt="Product" />
                          {images.length > 1 && (
                            <>
                              <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => (prev - 1 + images.length) % images.length); }} className="absolute left-2 bg-white/90 border border-gray-200 text-gray-800 p-2 rounded-full shadow-md hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => (prev + 1) % images.length); }} className="absolute right-2 bg-white/90 border border-gray-200 text-gray-800 p-2 rounded-full shadow-md hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                              </button>
                            </>
                          )}
                        </>
                      ) : (
                         <div className="text-gray-400 font-medium">No Image Provided</div>
                      )}
                    </div>
                    
                    {/* Thumbnail Strip */}
                    {images.length > 1 && (
                      <div className="flex justify-center gap-3 mt-auto overflow-x-auto pb-2">
                        {images.map((img, idx) => (
                          <div 
                            key={idx} 
                            onMouseEnter={() => setCurrentImageIndex(idx)}
                            className={`w-14 h-14 rounded-lg cursor-pointer flex-shrink-0 border-2 overflow-hidden transition-all ${currentImageIndex === idx ? 'border-indigo-600 ring-2 ring-indigo-100' : 'border-gray-200 hover:border-indigo-300'}`}
                          >
                            <img src={img} className="w-full h-full object-cover" alt={`Thumb ${idx}`} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* RIGHT SIDE: PRODUCT DETAILS */}
                  <div className="w-full md:w-1/2 p-6 md:p-8 bg-gray-50 flex flex-col">
                    <div className="mb-2 text-sm text-indigo-600 font-bold uppercase tracking-wider">Category {itemData.category}</div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight mb-2">{itemData.name}</h2>
                    
                    <div className="flex items-center gap-4 mb-6">
                      <div className="flex items-center gap-1">
                        <div className="flex">{renderStars(itemData.rating)}</div>
                        <span className="text-sm font-medium text-gray-600">({itemData.rating})</span>
                      </div>
                      <span className="text-gray-300">|</span>
                      <button onClick={() => setIsSellerModalOpen(true)} className="text-sm text-indigo-600 font-bold hover:underline">
                        Visit the {itemData.seller} Store
                      </button>
                    </div>

                    <div className="border-t border-b border-gray-200 py-4 mb-6">
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg text-gray-600 align-top mt-1">$</span>
                        <span className="text-4xl font-bold text-gray-900">{itemData.price}</span>
                      </div>
                      <p className={`text-sm font-bold mt-2 ${itemData.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {itemData.quantity > 0 ? `In Stock (${itemData.quantity} available)` : 'Currently unavailable.'}
                      </p>
                    </div>

                    {/* --- AI GENERATED 'ABOUT THIS ITEM' --- */}
                    <div className="mb-8">
                      <h3 className="text-base font-bold text-gray-900 mb-3">About this item <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded ml-2">✨ AI Generated</span></h3>
                      {loadingDesc ? (
                        <div className="space-y-2 animate-pulse">
                          <div className="h-4 bg-gray-200 rounded w-full"></div>
                          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                          <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                          {aiDescription || "No description available."}
                        </div>
                      )}
                    </div>

                    {/* AI Review Summary (From Path B) */}
                    {itemData.reviews && itemData.reviews.length > 0 && (
                      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6">
                        <h4 className="font-bold text-indigo-900 text-sm mb-2 flex items-center gap-2">✨ AI Review Insights</h4>
                        {loadingSummary ? (
                          <span className="text-xs text-indigo-400">Analyzing reviews...</span>
                        ) : (
                          <p className="text-xs text-indigo-800 leading-relaxed">{aiSummary}</p>
                        )}
                      </div>
                    )}

                  </div>
                </div>
              )}
            </div>

            {/* Bottom Action Bar */}
            {itemData && (
              <div className="p-4 bg-white border-t border-gray-100 flex justify-end gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
                <button 
                  onClick={async () => {
                    try {
                      const r = await fetch(`${BASE_URL}/wishlist`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sess_id: sessionId, item_id: itemId }) });
                      const d = await r.json(); alert(d.status === 'SUCCESS' ? "💖 Added to Wishlist!" : `ℹ️ ${d.message}`);
                    } catch(e) { alert("❌ Error connecting to server."); }
                  }}
                  className="px-6 py-3 rounded-full bg-pink-50 text-pink-600 font-bold hover:bg-pink-100 transition-colors"
                >
                  Save
                </button>
                <button 
                  onClick={handleAddToCart} disabled={addingToCart || itemData.quantity <= 0}
                  className="px-8 py-3 rounded-full bg-yellow-400 hover:bg-yellow-500 disabled:bg-gray-300 text-gray-900 font-bold shadow-md transition-colors flex items-center gap-2"
                >
                  {addingToCart ? 'Processing...' : itemData.quantity > 0 ? 'Add to Cart' : 'Out of Stock'}
                </button>
              </div>
            )}
          </motion.div>
          <SellerModal isOpen={isSellerModalOpen} onClose={() => setIsSellerModalOpen(false)} sellerId={itemData?.seller} />
        </div>
      )}
    </AnimatePresence>
  );
}