import { useState } from 'react';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Cart from './components/Cart';
import Orders from './components/Orders';
import Wishlist from './components/Wishlist';

import SellerAuth from './components/seller/SellerAuth';
import SellerLayout from './components/seller/SellerLayout';

const BASE_URL = 'http://localhost:7003';

function App() {
  const [session, setSession] = useState(localStorage.getItem('sess_id') || null);
  const [username, setUsername] = useState(localStorage.getItem('username') || '');
  
  const [role, setRole] = useState(localStorage.getItem('role') || 'BUYER'); 
  
  const [currentView, setCurrentView] = useState('marketplace'); 
  const [isCartOpen, setIsCartOpen] = useState(false);

  const handleLoginSuccess = (sessId, user, userRole = 'BUYER') => {
    setSession(sessId);
    setUsername(user);
    setRole(userRole);
    localStorage.setItem('sess_id', sessId);
    localStorage.setItem('username', user);
    localStorage.setItem('role', userRole);
    setCurrentView('marketplace'); 
  };

  const handleLogout = async () => {
    if (session && role === 'BUYER') {
      try {
        await fetch(`${BASE_URL}/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sess_id: session })
        });
      } catch (error) {
        console.error("Failed to reach the server during logout", error);
      }
    }
    setSession(null);
    setUsername('');
    setRole('BUYER'); 
    localStorage.removeItem('sess_id');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
  };

  if (role === 'SELLER') {
    if (!session) {
      return (
        <SellerAuth 
          onLoginSuccess={handleLoginSuccess} 
          switchToBuyer={() => setRole('BUYER')} 
        />
      );
    }
    return (
      <SellerLayout 
        sessionId={session} 
        username={username} 
        onLogout={handleLogout} 
      />
    );
  }

  return (
    <div>
      {!session ? (
        <Auth 
          onLoginSuccess={(s, u) => handleLoginSuccess(s, u, 'BUYER')} 
          switchToSeller={() => setRole('SELLER')} 
        />
      ) : (
        <div className="min-h-screen bg-gray-50 pb-12">
          
          {/* Top Navigation Bar */}
          <nav className="bg-indigo-900 shadow-lg border-b border-indigo-700 sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
              
              <div className="flex items-center gap-8">
                {/* Logo */}
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView('marketplace')}>
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center">
                     <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                  </div>
                  <h1 className="text-white text-2xl font-bold tracking-tight hidden md:block">DistributedStore</h1>
                </div>

                {/* Nav Links */}
                <div className="flex gap-1 bg-white/5 p-1 rounded-xl backdrop-blur-sm border border-white/10 overflow-x-auto">
                  <button 
                    onClick={() => setCurrentView('marketplace')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${currentView === 'marketplace' ? 'bg-white text-indigo-900 shadow-sm' : 'text-indigo-200 hover:text-white hover:bg-white/10'}`}
                  >
                    Marketplace
                  </button>
                  <button 
                    onClick={() => setCurrentView('orders')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${currentView === 'orders' ? 'bg-white text-indigo-900 shadow-sm' : 'text-indigo-200 hover:text-white hover:bg-white/10'}`}
                  >
                    My Orders
                  </button>
                  <button 
                    onClick={() => setCurrentView('wishlist')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${currentView === 'wishlist' ? 'bg-pink-500 text-white shadow-sm' : 'text-indigo-200 hover:text-pink-300 hover:bg-white/10'}`}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"></path></svg>
                    Wishlist
                  </button>
                </div>
              </div>

              {/* Right Side Actions */}
              <div className="flex items-center gap-4 sm:gap-6">
                <span className="text-indigo-200 font-medium hidden lg:block">Welcome, {username}</span>
                
                <button 
                  onClick={() => setIsCartOpen(true)}
                  className="relative bg-white/10 hover:bg-white/20 text-white p-2 sm:px-4 sm:py-2 rounded-xl text-sm font-bold transition-all duration-200 backdrop-blur-sm border border-white/10 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                  <span className="hidden sm:block">Cart</span>
                  
                  {/* THE NOTIFICATION DOT */}
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-indigo-900"></span>
                  </span>
                </button>

                <button 
                  onClick={handleLogout}
                  className="bg-red-500/20 hover:bg-red-500/40 text-red-100 hover:text-white px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 backdrop-blur-sm border border-red-500/30"
                >
                  Logout
                </button>
              </div>

            </div>
          </nav>
          
          <main className="max-w-7xl mx-auto p-4 sm:p-8 mt-4">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
                {currentView === 'marketplace' ? 'Marketplace' : 
                 currentView === 'orders' ? 'Purchase History' : 'My Wishlist'}
              </h2>
              <p className="text-gray-500 mt-2">
                {currentView === 'marketplace' ? 'Search and discover top-tier items from distributed sellers.' : 
                 currentView === 'orders' ? 'Track the status of your recent transactions.' : 
                 'Items you have saved for later.'}
              </p>
            </div>

            {/* Render based on current view */}
            {currentView === 'marketplace' && <Dashboard sessionId={session} />}
            {currentView === 'orders' && <Orders sessionId={session} />}
            {currentView === 'wishlist' && <Wishlist sessionId={session} />}
          </main>

          <Cart 
            isOpen={isCartOpen} 
            onClose={() => setIsCartOpen(false)} 
            sessionId={session} 
          />
        </div>
      )}
    </div>
  );
}

export default App;