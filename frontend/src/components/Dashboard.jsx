import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ItemModal from './ItemModal';

const BASE_URL = 'http://localhost:7003';

export default function Dashboard({ sessionId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedItemId, setSelectedItemId] = useState(null);
const [isModalOpen, setIsModalOpen] = useState(false);

  const [category, setCategory] = useState('1'); 
  const [keywords, setKeywords] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchItems = async (targetPage = 1) => {
    setLoading(true);
    setError('');
    
    const searchCat = category.trim() === '' ? '1' : category;
    
    try {
      const response = await fetch(
        `${BASE_URL}/search?category=${searchCat}&keywords=${keywords}&page=${targetPage}&limit=8`
      );
      const data = await response.json();

      if (data.status === 'SUCCESS') {
        const parsedItems = data.items.map(itemStr => {
          const parts = itemStr.split(' | ');
          return {
            id: parts[0].replace('ID:', '').trim(),
            name: parts[1].trim(),
            price: parts[2].trim(),
            available: parts[3].replace('Available:', '').trim()
          };
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
    fetchItems();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchItems(1);
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
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
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
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
          
          {/* Category Integer Input */}
          <div className="w-full md:w-32">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Category ID</label>
            <input
              type="number"
              min="1"
              required
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white px-4 py-3 outline-none transition-all"
              placeholder="e.g., 1"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>

          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Search Keywords</label>
            <input
              type="text"
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white px-4 py-3 outline-none transition-all"
              placeholder="e.g., Laptop, Mouse..."
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
            />
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
            <p className="text-gray-500 mt-2">Try adjusting your search keywords or category ID.</p>
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
                  <div className="h-32 bg-gradient-to-tr from-indigo-100 to-purple-50 relative overflow-hidden flex items-center justify-center">
                    <svg className="w-12 h-12 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <div className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-bold text-indigo-700">
                      ID: {item.id}
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">{item.name}</h3>
                    <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-4">
                      {item.price}
                    </p>
                    </div>
                    
                    <div className="mt-auto">
                   <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                     <span className="flex items-center gap-1">
                       <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                       {item.available} in stock
                     </span>
                   </div>

                   {/* NEW: Two buttons side by side */}
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
                </motion.div>
              ))}
            </motion.div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-10">
                <button 
                  onClick={() => fetchItems(page - 1)}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm font-medium text-gray-600 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
                  Page {page} of {totalPages}
                </span>
                <button 
                  onClick={() => fetchItems(page + 1)}
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
      {/* Item Details Modal rendered securely outside the grid */}
   <ItemModal 
     isOpen={isModalOpen} 
     onClose={() => setIsModalOpen(false)} 
     itemId={selectedItemId} 
     sessionId={sessionId} 
   />
    </div>
  );
}