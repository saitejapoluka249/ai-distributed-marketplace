import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BASE_URL = 'http://localhost:7003';

export default function ReviewModal({ isOpen, onClose, targetId, targetType, sessionId }) {
  const [stars, setStars] = useState(0);
  const [hoverStars, setHoverStars] = useState(0);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (stars === 0) {
      setMessage('❌ Please select a star rating.');
      return;
    }

    setLoading(true);
    setMessage('');

    const endpoint = targetType === 'item' ? '/feedback/item' : '/feedback/seller';
    const payload = {
      sess_id: sessionId,
      stars: stars,
      text: text,
      ...(targetType === 'item' ? { item_id: targetId } : { seller_id: targetId })
    };

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      
      if (data.status === 'SUCCESS') {
        setMessage('🎉 Review submitted successfully!');
        setTimeout(() => {
          onClose(); // Close modal automatically after 1.5 seconds
          // Reset state for next time
          setStars(0);
          setText('');
          setMessage('');
        }, 1500);
      } else {
        setMessage(`❌ Error: ${data.message}`);
      }
    } catch (err) {
      setMessage('❌ Connection Error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Dark Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white relative">
              <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 rounded-full transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
              <h3 className="text-2xl font-bold tracking-tight mb-1">Leave a Review</h3>
              <p className="text-indigo-100 text-sm">
                You are reviewing the {targetType === 'item' ? 'product' : 'seller'}: <span className="font-bold text-white">{targetId}</span>
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
              
              {/* Interactive Stars */}
              <div className="flex flex-col items-center">
                <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Tap to Rate</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onMouseEnter={() => setHoverStars(num)}
                      onMouseLeave={() => setHoverStars(0)}
                      onClick={() => setStars(num)}
                      className="focus:outline-none transition-transform hover:scale-110"
                    >
                      <svg 
                        className={`w-10 h-10 ${num <= (hoverStars || stars) ? 'text-yellow-400 drop-shadow-md' : 'text-gray-200'}`} 
                        fill="currentColor" 
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>

              {/* Written Feedback Input */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Written Feedback</label>
                <textarea
                  required
                  rows="4"
                  placeholder="What did you think about this purchase?"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white px-4 py-3 outline-none transition-all resize-none"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                ></textarea>
              </div>

              {message && (
                <div className={`text-sm text-center p-3 rounded-xl font-bold ${message.includes('🎉') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-4 rounded-xl shadow-lg transition-colors flex justify-center items-center"
              >
                {loading ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}