import { useState } from 'react';
import { motion } from 'framer-motion';

const BASE_URL = 'http://localhost:7003';

export default function Auth({ onLoginSuccess, switchToSeller }) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isLoginMode ? '/login' : '/create_account';
    
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await response.json();

      if (data.status === 'SUCCESS') {
        if (isLoginMode) {
          onLoginSuccess(data.sess_id, username);
        } else {
          setIsLoginMode(true);
          setError('Account created! Please log in.');
        }
      } else {
        setError(data.message || 'An error occurred');
      }
    } catch (err) {
      setError('Cannot connect to server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white font-sans text-gray-900 overflow-hidden">
      
      {/* LEFT SIDE - Animated Branding & Hero */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0f172a] relative items-center justify-center overflow-hidden">
        
        {/* Animated Floating Orbs */}
        <motion.div 
          animate={{ y: [0, -40, 0], scale: [1, 1.1, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/40 rounded-full blur-[100px] mix-blend-screen"
        />
        <motion.div 
          animate={{ y: [0, 40, 0], scale: [1, 1.2, 1], rotate: [0, -90, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/40 rounded-full blur-[100px] mix-blend-screen"
        />
        <motion.div 
          animate={{ x: [0, 50, 0], y: [0, 50, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[30%] left-[30%] w-[300px] h-[300px] bg-blue-500/30 rounded-full blur-[80px] mix-blend-screen"
        />
        
        {/* Glassmorphism Card with Slide-Up Animation */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 w-full max-w-lg p-12 backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl shadow-2xl text-center"
        >
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 5 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 mb-8 shadow-lg shadow-indigo-500/30"
          >
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
          </motion.div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight mb-4">
            DistributedStore
          </h1>
          <p className="text-lg text-slate-300 font-medium leading-relaxed">
            A high-performance, 3-tier distributed marketplace powered by <span className="text-indigo-400 font-bold">Python</span>, <span className="text-purple-400 font-bold">gRPC</span>, <span className="text-blue-400 font-bold">SOAP</span>, <span className="text-pink-400 font-bold">REST</span>, and <span className="text-cyan-400 font-bold">React</span>.
          </p>
        </motion.div>
      </div>

      {/* RIGHT SIDE - Form with Staggered Entrance Animations */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 md:p-16 relative">
        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
          className="w-full max-w-md"
        >
          
          <div className="text-center lg:text-left mb-10">
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
              {isLoginMode ? 'Welcome back' : 'Create an account'}
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              {isLoginMode ? 'Enter your credentials to access the marketplace.' : 'Join the next-generation distributed system.'}
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                  </svg>
                </div>
                <input
                  type="text"
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl text-gray-900 bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all duration-200"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                  </svg>
                </div>
                <input
                  type="password"
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl text-gray-900 bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all duration-200"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`text-sm text-center p-3 rounded-xl font-medium ${error.includes('created') ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}
              >
                {error}
              </motion.div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 transition-colors"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                isLoginMode ? 'Sign in' : 'Create account'
              )}
            </motion.button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              {isLoginMode ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => { setIsLoginMode(!isLoginMode); setError(''); }}
                className="font-bold text-indigo-600 hover:text-indigo-500 hover:underline transition-all"
              >
                {isLoginMode ? "Sign up" : "Sign in"}
              </button>
            </p>
          </div>

          <div className="mt-6 border-t border-gray-100 pt-4 text-center">
            <button 
              onClick={switchToSeller}
              className="text-sm font-bold text-gray-500 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2 w-full"
            >
              Access Seller Portal
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </button>
          </div>

        </motion.div>
      </div>
    </div>
  );
}