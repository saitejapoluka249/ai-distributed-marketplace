import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const BASE_URL = 'http://localhost:7003';

export default function Wishlist({ sessionId }) {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchWishlist = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/wishlist?sess_id=${sessionId}`);
      const data = await response.json();
      
      if (data.status === 'SUCCESS') {
        setWishlist(data.wishlist || []);
      } else {
        setError(data.message || 'Failed to load wishlist.');
      }
    } catch (err) {
      setError('Cannot connect to the backend server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId) fetchWishlist();
  }, [sessionId]);

  const handleMoveToCart = async (itemId) => {
    try {
      const response = await fetch(`${BASE_URL}/wishlist/move_to_cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sess_id: sessionId, item_id: itemId })
      });
      const data = await response.json();
      if (data.status === 'SUCCESS') {
        fetchWishlist(); 
        alert("🎉 Item moved to Cart!");
      } else {
        alert(`❌ Error: ${data.message}`);
      }
    } catch (err) {
      alert("❌ Connection Error.");
    }
  };

  const handleRemove = async (itemId) => {
    try {
      const response = await fetch(`${BASE_URL}/wishlist`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sess_id: sessionId, item_id: itemId })
      });
      if ((await response.json()).status === 'SUCCESS') {
        fetchWishlist(); // Refresh wishlist
      }
    } catch (err) {
      alert("❌ Connection Error.");
    }
  };

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { opacity: 0, scale: 0.95 }, show: { opacity: 1, scale: 1, transition: { type: "spring" } } };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div></div>;
  if (error) return <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center font-bold">{error}</div>;

  if (wishlist.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm mt-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-pink-50 mb-6">
          <svg className="w-10 h-10 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Your wishlist is empty</h3>
        <p className="text-gray-500 max-w-sm mx-auto">Save items you like while browsing the marketplace so you can easily find them later.</p>
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
      {wishlist.map((item) => (
        <motion.div key={item.id} variants={itemVariants} className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col shadow-sm hover:shadow-xl transition-all relative overflow-hidden group">
          
          {/* Decorative background blur */}
          <div className="absolute top-[-20%] right-[-20%] w-32 h-32 bg-pink-100 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
          
          <div className="relative z-10 flex-1">
            <div className="flex justify-between items-start mb-4">
              <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg border border-gray-200">ID: {item.id}</span>
              <button onClick={() => handleRemove(item.id)} className="text-gray-400 hover:text-red-500 transition-colors bg-white p-1 rounded-full shadow-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </button>
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-2">{item.name}</h3>
            <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-500 mb-4">${item.price}</p>
            
            <p className={`text-sm font-bold flex items-center gap-1 mb-6 ${item.qty_available > 0 ? 'text-green-600' : 'text-red-500'}`}>
              {item.qty_available > 0 ? `In Stock (${item.qty_available} left)` : 'Currently Out of Stock'}
            </p>
          </div>

          <button 
            onClick={() => handleMoveToCart(item.id)}
            disabled={item.qty_available <= 0}
            className="relative z-10 w-full bg-gray-900 hover:bg-black disabled:bg-gray-300 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
            {item.qty_available > 0 ? 'Move to Cart' : 'Unavailable'}
          </button>
        </motion.div>
      ))}
    </motion.div>
  );
}