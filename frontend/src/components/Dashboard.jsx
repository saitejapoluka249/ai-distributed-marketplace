import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ItemModal from './ItemModal';

const BASE_URL = 'http://localhost:7003';

// --- The Category Translation Dictionary ---
export const CATEGORY_MAP = {
  0: "All Categories",
  1: "💻 Electronics & Laptops",
  2: "🎮 Video Games & Consoles",
  3: "⌚ Watches & Jewelry",
  4: "👕 Clothing & Shoes",
  5: "🏠 Home & Kitchen",
  6: "🚴 Sports & Outdoors"
};

export default function Dashboard({ sessionId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [category, setCategory] = useState(0); 
  const [keywords, setKeywords] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // --- NEW: LIVE SEARCH STATE ---
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const fetchItems = async (targetPage = 1, targetCategory = category, currentKeywords = keywords) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(
        `${BASE_URL}/search?category=${targetCategory}&keywords=${currentKeywords}&page=${targetPage}&limit=8`
      );
      const data = await response.json();

      if (data.status === 'SUCCESS') {
        const parsedItems = data.items.map(itemStr => {
          const match = itemStr.match(/ID:\s*([\d\.]+)\s*\|\s*(.*?)\s*\|\s*\$([\d\.]+)\s*\|\s*Available:\s*(\d+)(?:\s*\|\s*IMG:\s*(.*))?/i);
          if (match) {
            return {
              id: match[1],
              name: match[2].trim(),
              price: match[3],
              available: match[4],
              image: match[5] && match[5].trim() !== "None" ? match[5].trim() : null,
              category: match[1].split('.')[0]
            };
          }
          return { id: 'N/A', name: 'Unknown', price: '0', available: '0', image: null, category: '0' };
        });
        setItems(parsedItems);
        setTotalPages(data.total_pages);
        setPage(data.current_page);
      } else {
        setError(data.message || 'Failed to load items.');
      }
    } catch (err) {
      setError('Cannot connect to the backend server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems(1, 0, ''); 

    const handleRefresh = () => fetchItems(page, category, keywords);
    window.addEventListener('refreshMarketplace', handleRefresh);

    return () => window.removeEventListener('refreshMarketplace', handleRefresh);
  }, []);

  // --- NEW: THE LIVE SEARCH DEBOUNCE EFFECT ---
  useEffect(() => {
    // Only search if they've typed at least 2 letters
    if (keywords.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const fetchLiveSuggestions = async () => {
      try {
        // Fetch a small limit (10) for the dropdown
        const res = await fetch(`${BASE_URL}/search?category=${category}&keywords=${keywords}&page=1&limit=10`);
        const data = await res.json();
        
        if (data.status === 'SUCCESS' && data.items.length > 0) {
          const parsed = data.items.map(itemStr => {
            const match = itemStr.match(/ID:\s*([\d\.]+)\s*\|\s*(.*?)\s*\|\s*\$([\d\.]+)/i);
            return match ? { id: match[1], name: match[2].trim(), price: match[3] } : null;
          }).filter(Boolean);
          setSuggestions(parsed);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (err) {
        console.error("Live search failed", err);
      }
    };

    const timeoutId = setTimeout(() => {
      fetchLiveSuggestions();
    }, 300); 

    return () => clearTimeout(timeoutId);
  }, [keywords, category]);

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    setShowSuggestions(false); 
    fetchItems(1, category, keywords);
  };

  const handleAddToCart = async (itemId) => {
    try {
      const response = await fetch(`${BASE_URL}/cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sess_id: sessionId, item_id: itemId, qty: 1 })
      });
      const data = await response.json();
      if (data.status === 'SUCCESS') {
        alert("Added to cart! Open the Cart to checkout.");
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert("Failed to connect to server.");
    }
  };

  const openItemDetails = (id) => {
    setSelectedItemId(id);
    setIsModalOpen(true);
    setShowSuggestions(false); 
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300 } }
  };

  return (
    <div className="flex flex-col gap-8">
      
      {/* Search & Filter Bar */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
      >
        {/* Clickable Category Pills */}
        <div className="flex overflow-x-auto gap-2 pb-4 mb-4 border-b border-gray-100 hide-scrollbar">
          {Object.entries(CATEGORY_MAP).map(([catId, catName]) => (
            <button
              key={catId}
              onClick={() => {
                setCategory(Number(catId));
                fetchItems(1, Number(catId), keywords); 
              }}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all ${
                category === Number(catId) 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {catName}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 mt-4 relative">
          <div className="flex-1 relative">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Search Keywords</label>
            <input
              type="text"
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white px-4 py-3 outline-none transition-all"
              placeholder="e.g., Laptop, Mouse..."
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} 
            />

            {/* --- NEW: ELASTIC-SEARCH STYLE DROPDOWN --- */}
            <AnimatePresence>
              {showSuggestions && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute z-50 w-full mt-2 bg-white border border-gray-200 shadow-2xl rounded-xl overflow-hidden"
                >
                  <ul className="max-h-60 overflow-y-auto">
                    {suggestions.map(item => (
                      <li 
                        key={item.id}
                        onMouseDown={() => openItemDetails(item.id)}
                        className="px-4 py-3 border-b border-gray-50 hover:bg-indigo-50 cursor-pointer flex justify-between items-center transition-colors group"
                      >
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-800 group-hover:text-indigo-700">{item.name}</span>
                          <span className="text-xs text-gray-400">ID: {item.id}</span>
                        </div>
                        <span className="font-black text-indigo-600">${item.price}</span>
                      </li>
                    ))}
                  </ul>
                  <div 
                    onMouseDown={handleSearch} 
                    className="px-4 py-2 bg-gray-50 text-xs font-bold text-center text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer transition-colors"
                  >
                    View all results for "{keywords}"
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl shadow-md transition-colors h-[50px]"
            >
              Search
            </button>
          </div>
        </form>
      </motion.div>

      {/* Main Content Area */}
      <div>
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center font-medium border border-red-100">
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <svg className="mx-auto h-16 w-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
            </svg>
            <h3 className="text-xl font-bold text-gray-900">No items found</h3>
            <p className="text-gray-500 mt-2">Try adjusting your search keywords or category.</p>
          </div>
        ) : (
          <>
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  variants={itemVariants}
                  whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)" }}
                  className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col transition-all duration-300"
                >
                  
                  {/* Image Render Block */}
                  <div className="h-48 bg-gray-100 flex items-center justify-center relative overflow-hidden group-hover:opacity-90 transition-opacity">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    )}

                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg shadow-sm border border-gray-100">
                      <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
                        {CATEGORY_MAP[item.category] || "Other"}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold text-indigo-700">
                      ID: {item.id}
                    </div>
                    {Number(item.available) < 5 && Number(item.available) > 0 && (
                      <div className="absolute bottom-3 left-3 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1 animate-pulse">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
                        Only {item.available} left
                      </div>
                    )}
                  </div>

                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">{item.name}</h3>
                    <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-4">
                      ${item.price}
                    </p>
                    
                    <div className="mt-auto">
                      <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                          {item.available} in stock
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <button 
                          onClick={() => openItemDetails(item.id)}
                          className="flex-1 bg-white border-2 border-indigo-100 hover:border-indigo-600 hover:text-indigo-600 text-gray-700 font-bold py-2.5 rounded-xl transition-colors duration-200 text-sm"
                        >
                          View Details
                        </button>
                        <button 
                          onClick={() => handleAddToCart(item.id)}
                          className="flex-1 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 font-bold py-2.5 rounded-xl transition-colors duration-200 text-sm"
                        >
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-10">
                <button 
                  onClick={() => fetchItems(page - 1, category, keywords)}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm font-medium text-gray-600 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
                  Page {page} of {totalPages}
                </span>
                <button 
                  onClick={() => fetchItems(page + 1, category, keywords)}
                  disabled={page === totalPages}
                  className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <ItemModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        itemId={selectedItemId} 
        sessionId={sessionId} 
      />
    </div>
  );
}