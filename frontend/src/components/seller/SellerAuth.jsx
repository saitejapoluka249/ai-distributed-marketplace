import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SELLER_URL = 'http://localhost:7001';

export default function SellerAuth({ onLoginSuccess, switchToBuyer }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const endpoint = isLogin ? '/login' : '/create_account';
    try {
      const response = await fetch(`${SELLER_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();

      if (data.status === 'SUCCESS') {
        if (isLogin) {
          // If they were logging in, take them to the Dashboard!
          onLoginSuccess(data.sess_id, username, 'SELLER');
        } else {
          // If they were registering, show a success message and slide to Login!
          alert("🎉 Store registered successfully! You can now sign in.");
          setIsLogin(true); // Slide over to the Sign In tab
          setPassword(''); // Clear the password box for security
        }
      } else {
        setError(data.message || 'Authentication failed.');
      }
    } catch (err) {
      setError('Cannot connect to the Seller Server.');
    } finally {
      setLoading(false);
    }
  };

  // Smooth sliding animation when switching between Login & Register
  const formVariants = {
    hidden: { opacity: 0, x: isLogin ? -30 : 30 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } },
    exit: { opacity: 0, x: isLogin ? 30 : -30, transition: { duration: 0.3 } }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      
      {/* 1. Animated Floating Background Orbs */}
      <motion.div 
        animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-teal-600 rounded-full mix-blend-screen filter blur-[120px] opacity-20 pointer-events-none"
      />
      <motion.div 
        animate={{ scale: [1, 1.5, 1], x: [0, -50, 0], y: [0, 50, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-emerald-700 rounded-full mix-blend-screen filter blur-[150px] opacity-20 pointer-events-none"
      />

      {/* 2. Animated Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="flex justify-center text-teal-400 mb-6"
        >
          <div className="p-4 bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-700/50 shadow-2xl shadow-teal-900/20">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
            </svg>
          </div>
        </motion.div>
        
        <motion.h2 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-4xl font-extrabold text-white tracking-tight"
        >
          Seller Portal
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="mt-2 text-center text-sm text-slate-400"
        >
          Manage your inventory and fulfill orders with precision.
        </motion.p>
      </div>

      {/* 3. The Glassmorphism Auth Card */}
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.6, type: "spring" }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10"
      >
        <div className="bg-slate-900/60 backdrop-blur-2xl py-8 px-4 shadow-[0_0_50px_rgba(20,184,166,0.1)] sm:rounded-3xl sm:px-10 border border-slate-700/50 overflow-hidden">
          
          {/* Custom Toggle Switch */}
          <div className="flex bg-slate-950/50 rounded-xl p-1 mb-8 border border-slate-800 shadow-inner">
            <button
              onClick={() => {setIsLogin(true); setError('');}}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 ${isLogin ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/50' : 'text-slate-400 hover:text-white'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => {setIsLogin(false); setError('');}}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 ${!isLogin ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50' : 'text-slate-400 hover:text-white'}`}
            >
              Register Store
            </button>
          </div>

          {/* Form Content with Slide Transitions */}
          <AnimatePresence mode="wait">
            <motion.form 
              key={isLogin ? "login" : "register"}
              variants={formVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-5" 
              onSubmit={handleSubmit}
            >
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  {isLogin ? 'Store Name / Username' : 'Choose Store Name'}
                </label>
                <input 
                  required type="text" 
                  className="block w-full px-4 py-3.5 bg-slate-950/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-600 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all shadow-inner" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  placeholder="Enter username"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  {isLogin ? 'Admin Password' : 'Create Admin Password'}
                </label>
                <input 
                  required type="password" 
                  className="block w-full px-4 py-3.5 bg-slate-950/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-600 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all shadow-inner" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="••••••••"
                />
              </div>

              {/* Error Message Animation */}
              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, marginTop: 0 }} 
                    animate={{ opacity: 1, height: 'auto', marginTop: 16 }} 
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 p-3.5 rounded-xl font-bold flex items-center gap-2 shadow-inner">
                      <svg className="w-5 h-5 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      {error}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit" 
                disabled={loading} 
                className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-[0_10px_20px_rgba(20,184,166,0.2)] text-sm font-bold text-white bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 focus:ring-offset-slate-900 transition-all disabled:opacity-50 mt-6"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Authenticating...
                  </div>
                ) : isLogin ? 'Access Dashboard' : 'Launch New Store'}
              </motion.button>
            </motion.form>
          </AnimatePresence>

          {/* Footer Back Button */}
          <div className="mt-8 border-t border-slate-800 pt-6">
            <button 
              onClick={switchToBuyer} 
              className="group text-sm text-slate-400 hover:text-teal-400 transition-colors flex items-center justify-center gap-2 w-full font-medium"
            >
              <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
              Return to Buyer Marketplace
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}