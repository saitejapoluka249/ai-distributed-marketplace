import { useState } from 'react';
import { motion } from 'framer-motion';

const SELLER_URL = 'http://localhost:7001';

export default function SellerAuth({ onLoginSuccess, switchToBuyer }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [successMsg, setSuccessMsg] = useState(''); // NEW STATE FOR SUCCESS MESSAGES

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg(''); // Clear old success messages

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
          // If they were logging in, grant access!
          onLoginSuccess(data.sess_id, username, 'SELLER');
        } else {
          // If they were registering, show success and switch to Login view
          setSuccessMsg('✅ Store registered successfully! Please sign in below.');
          setIsLogin(true); // Switch the form back to "Sign In" mode
          setPassword(''); // Clear the password for security
        }
      } else {
        setError(data.message || 'Authentication failed.');
      }
    } catch (err) {
      setError('Cannot connect to the Seller Server (Port 7001).');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center text-teal-400 mb-4">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-white tracking-tight">Seller Portal</h2>
        <p className="mt-2 text-center text-sm text-slate-400">Manage your inventory and fulfill orders.</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-800 py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-slate-700">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-300">Store Name / Username</label>
              <input required type="text" className="mt-1 block w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-teal-500 focus:border-teal-500 transition-colors" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Admin Password</label>
              <input required type="password" className="mt-1 block w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-teal-500 focus:border-teal-500 transition-colors" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            {error && <div className="text-sm text-red-400 bg-red-900/30 border border-red-800 p-3 rounded-lg font-bold">{error}</div>}
            
            {/* NEW SUCCESS MESSAGE BOX */}
            {successMsg && <div className="text-sm text-emerald-400 bg-emerald-900/30 border border-emerald-800 p-3 rounded-lg font-bold">{successMsg}</div>}

            <button type="submit" disabled={loading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-teal-600 hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 focus:ring-offset-slate-900 transition-all disabled:opacity-50">
              {loading ? 'Authenticating...' : isLogin ? 'Access Dashboard' : 'Register Store'}
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-4 text-center">
            <button onClick={() => setIsLogin(!isLogin)} className="text-sm text-teal-400 hover:text-teal-300 font-medium transition-colors">
              {isLogin ? "Need a seller account? Register here" : "Already have a store? Sign in"}
            </button>
            <div className="border-t border-slate-700 pt-4">
              <button onClick={switchToBuyer} className="text-sm text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-2 w-full">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                Back to Buyer Marketplace
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}