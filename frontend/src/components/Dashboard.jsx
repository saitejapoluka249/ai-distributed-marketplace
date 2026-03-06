import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ItemModal from './ItemModal';
import Chatbot from './Chatbot';

const BASE_URL = 'http://localhost:7003';

export const CATEGORY_MAP = {
  0: "All Departments",
  1: "💻 Electronics",
  2: "📱 Cell Phones & Accessories",
  3: "📺 TV & Video",
  4: "👟 Shoes & Sneakers",
  5: "📷 Cameras & Photo",
  6: "🎧 Audio & Headphones",
  7: "🏠 Home & Kitchen",
  8: "🛏️ Furniture",
  9: "🛠️ Tools & Home Improvement",
  10: "🌱 Patio, Lawn & Garden",
  11: "🐶 Pet Supplies",
  12: "👕 Men's Clothing",
  13: "👗 Women's Clothing",
  14: "🎮 Video Games",
  15: "⌚ Watches & Jewelry",
  16: "👜 Luggage & Travel",
  17: "💄 Beauty & Personal Care",
  18: "💊 Health & Household",
  19: "👶 Baby Products",
  20: "🧸 Toys & Games",
  21: "⚽ Sports & Outdoors",
  22: "🚗 Automotive",
  23: "📚 Books",
  24: "🎵 Musical Instruments",
  25: "🏢 Office Products",
  26: "🍎 Grocery & Gourmet Food"
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

  // Live Search State
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [isAiSearch, setIsAiSearch] = useState(false);

  const fetchItems = async (targetPage = 1, targetCategory = category, currentKeywords = keywords) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(
        `${BASE_URL}/search?category=${targetCategory}&keywords=${currentKeywords}&page=${targetPage}&limit=12`
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

  // --- LIVE SEARCH DEBOUNCE EFFECT ---
  useEffect(() => {
    if (keywords.trim().length < 2 || isAiSearch) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const fetchLiveSuggestions = async () => {
      try {
        const res = await fetch(`${BASE_URL}/search?category=${category}&keywords=${keywords}&page=1&limit=6`);
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
  }, [keywords, category, isAiSearch]);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    setShowSuggestions(false); 
    setLoading(true);
    setError('');

    try {
      let url = '';
      
      if (isAiSearch && keywords.trim() !== '') {
        url = `${BASE_URL}/search/ai?query=${encodeURIComponent(keywords)}`;
      } else {
        url = `${BASE_URL}/search?category=${category}&keywords=${encodeURIComponent(keywords)}&page=1&limit=12`;
      }

      const response = await fetch(url);
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
        setError(data.message || 'Failed to search items.');
      }
    } catch (err) {
      setError('Cannot connect to the backend server for search.');
    } finally {
      setLoading(false);
    }
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
        window.dispatchEvent(new Event('refreshMarketplace')); 
        alert("✅ Item successfully added to your cart!"); 
      } else {
        alert(`❌ Error: ${data.message}`);
      }
    } catch (err) {
      alert("❌ Failed to connect to server.");
    }
  };

  const openItemDetails = (id) => {
    setSelectedItemId(id);
    setIsModalOpen(true);
    setShowSuggestions(false); 
  };

  const formatPrice = (priceStr) => {
    const num = parseFloat(priceStr);
    if (isNaN(num)) return { dollars: "0", cents: "00" };
    const [dollars, cents] = num.toFixed(2).split('.');
    return { dollars, cents };
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      
      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 mt-2">
        <form 
          onSubmit={handleSearch} 
          className={`flex w-full h-12 md:h-14 rounded-xl border-2 transition-all relative z-50 bg-white ${
            isAiSearch 
              ? 'border-purple-300 focus-within:border-purple-600 focus-within:ring-4 focus-within:ring-purple-100' 
              : 'border-indigo-100 focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-100'
          }`}
        >
          {/* Category Dropdown - Disabled if AI is searching! */}
          <div className={`relative bg-gray-50 border-r border-gray-200 transition-colors hidden sm:block rounded-l-lg ${isAiSearch ? 'opacity-50' : 'hover:bg-gray-100'}`}>
            <select
              value={category}
              onChange={(e) => {
                const newCat = Number(e.target.value);
                setCategory(newCat);
                fetchItems(1, newCat, keywords);
              }}
              disabled={isAiSearch}
              className="h-full py-2 pl-4 pr-8 bg-transparent text-sm font-bold text-gray-700 outline-none appearance-none cursor-pointer w-40 truncate disabled:cursor-not-allowed"
            >
              {Object.entries(CATEGORY_MAP).map(([catId, catName]) => (
                <option key={catId} value={catId}>{catName}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>

          {/* Search Input */}
          <div className="flex-1 relative flex">
            <input
              type="text"
              className="w-full h-full py-2 px-4 text-gray-900 outline-none text-base bg-transparent placeholder-gray-400"
              placeholder={isAiSearch ? "Describe what you need (e.g., 'Beach trip essentials')" : "Search products..."}
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} 
            />

            {/* AI Toggle Button inside the input bar */}
            <div className="flex items-center pr-2">
              <button
                type="button"
                onClick={() => setIsAiSearch(!isAiSearch)}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all ${
                  isAiSearch 
                    ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' 
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-purple-600'
                }`}
                title="Toggle AI Semantic Search"
              >
                ✨ <span className="hidden sm:inline">{isAiSearch ? 'AI Active' : 'AI Search'}</span>
              </button>
            </div>

            {/* LIVE AUTOCOMPLETE DROPDOWN */}
            <AnimatePresence>
              {showSuggestions && !isAiSearch && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                  className="absolute top-full left-0 w-full mt-2 bg-white border border-gray-200 shadow-2xl rounded-xl overflow-hidden z-[100]"
                >
                  <ul className="max-h-80 overflow-y-auto">
                    {suggestions.map(item => (
                      <li 
                        key={item.id}
                        onMouseDown={() => openItemDetails(item.id)}
                        className="px-5 py-3 border-b border-gray-50 hover:bg-indigo-50 cursor-pointer flex items-center justify-between transition-colors group"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <svg className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                          <span className="font-medium text-gray-800 group-hover:text-indigo-700 truncate">{item.name}</span>
                        </div>
                        <span className="font-bold text-gray-600 ml-4">${item.price}</span>
                      </li>
                    ))}
                  </ul>
                  <div 
                    onMouseDown={handleSearch} 
                    className="px-5 py-3 bg-gray-50 text-sm font-bold text-center text-indigo-600 hover:bg-indigo-100 cursor-pointer transition-colors"
                  >
                    View all results for "{keywords}"
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Search Button */}
          <button
            type="submit"
            className={`text-white px-6 sm:px-10 font-bold flex items-center justify-center transition-colors rounded-r-lg sm:rounded-none ${
              isAiSearch ? 'bg-purple-600 hover:bg-purple-700' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            <svg className="w-5 h-5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <span className="hidden sm:block">Search</span>
          </button>
        </form>
      </div>

      {/* --- MAIN PRODUCT GRID --- */}
      <div>
        {loading ? (
          <div className="flex justify-center items-center py-32">
            <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${isAiSearch ? 'border-purple-600' : 'border-indigo-600'}`}></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center font-medium border border-red-100">{error}</div>
        ) : items.length === 0 ? (
          <div className="text-center py-32 bg-white rounded-3xl border border-gray-100 shadow-sm mt-4">
            <h3 className="text-2xl font-bold text-gray-900">No items found</h3>
            <p className="text-gray-500 mt-2">Try adjusting your search or browsing a different category.</p>
          </div>
        ) : (
          <>
            <motion.div 
              initial="hidden" animate="show"
              variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {items.map((item) => {
                const { dollars, cents } = formatPrice(item.price);
                return (
                  <motion.div
                    key={item.id}
                    variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                    className="bg-white rounded-2xl overflow-hidden flex flex-col group border border-gray-200 hover:border-indigo-300 hover:shadow-xl transition-all duration-300"
                  >
                    
                    <div 
                      onClick={() => openItemDetails(item.id)}
                      className="h-56 bg-gray-50 flex items-center justify-center relative overflow-hidden cursor-pointer p-4"
                    >
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                      )}

                      <div className="absolute top-3 left-3 bg-white/95 backdrop-blur px-2 py-1 rounded shadow-sm border border-gray-100">
                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-wider">
                          {CATEGORY_MAP[item.category]?.replace(/[^a-zA-Z &]/g, '') || "OTHER"}
                        </span>
                      </div>

                      {Number(item.available) < 5 && Number(item.available) > 0 && (
                        <div className="absolute bottom-3 left-3 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1">
                          Only {item.available} left
                        </div>
                      )}
                    </div>

                    <div className="p-5 flex-1 flex flex-col bg-white">
                      
                      <h3 
                        onClick={() => openItemDetails(item.id)}
                        className="text-base font-medium text-gray-900 line-clamp-2 cursor-pointer hover:text-indigo-600 transition-colors leading-snug mb-1"
                      >
                        {item.name}
                      </h3>
                      
                      <div className="flex items-start mt-2 mb-4">
                        <span className="text-sm font-bold text-gray-900 mt-1">$</span>
                        <span className="text-3xl font-black text-gray-900 tracking-tight">{dollars}</span>
                        <span className="text-sm font-bold text-gray-900 mt-1">{cents}</span>
                      </div>
                      
                      <div className="mt-auto">
                        <button 
                          onClick={() => handleAddToCart(item.id)}
                          className="w-full bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-100 hover:border-indigo-600 font-bold py-2.5 rounded-full transition-all duration-200 text-sm flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>

            {totalPages > 1 && !isAiSearch && (
              <div className="flex justify-center items-center gap-4 mt-12 pb-8">
                <button 
                  onClick={() => fetchItems(page - 1, category, keywords)}
                  disabled={page === 1}
                  className="px-5 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm"
                >
                  Previous
                </button>
                <span className="text-sm font-bold text-gray-500">
                  Page {page} of {totalPages}
                </span>
                <button 
                  onClick={() => fetchItems(page + 1, category, keywords)}
                  disabled={page === totalPages}
                  className="px-5 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm"
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
      <Chatbot sessionId={sessionId} />
    </div>
  );
}