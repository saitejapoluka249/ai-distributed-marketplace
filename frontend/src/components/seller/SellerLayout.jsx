import { useState } from 'react';
import SellerInventory from './SellerInventory';

const SELLER_URL = 'http://localhost:7001';

export default function SellerLayout({ sessionId, username, onLogout }) {
  const [currentTab, setCurrentTab] = useState('inventory'); // 'inventory', 'orders', 'promos'

  const handleLogout = async () => {
    try {
      await fetch(`${SELLER_URL}/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sess_id: sessionId })
      });
    } catch (e) { console.error("Logout failed"); }
    onLogout();
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      
      {/* Dark Professional Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shadow-xl z-20 shrink-0">
        <div className="h-20 flex items-center px-6 border-b border-slate-800 bg-slate-950">
          <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center mr-3 shadow-lg shadow-teal-500/20">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
          </div>
          <span className="text-white font-bold text-lg tracking-wide">SellerHub</span>
        </div>

        <div className="p-4 flex-1 space-y-2 overflow-y-auto">
          <p className="px-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 mt-2">Store Management</p>
          
          <button onClick={() => setCurrentTab('inventory')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentTab === 'inventory' ? 'bg-teal-500/10 text-teal-400 font-bold border border-teal-500/20' : 'hover:bg-slate-800 hover:text-white'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
            Inventory
          </button>
          
          <button onClick={() => setCurrentTab('orders')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentTab === 'orders' ? 'bg-teal-500/10 text-teal-400 font-bold border border-teal-500/20' : 'hover:bg-slate-800 hover:text-white'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
            Fulfillment Orders
          </button>

          <button onClick={() => setCurrentTab('promos')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentTab === 'promos' ? 'bg-teal-500/10 text-teal-400 font-bold border border-teal-500/20' : 'hover:bg-slate-800 hover:text-white'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path></svg>
            Promotions
          </button>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 text-teal-400 font-bold">
              {username.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white truncate">{username}</p>
              <p className="text-xs text-slate-500 truncate">Store Admin</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full py-2.5 px-4 bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 text-sm font-bold rounded-xl transition-colors border border-slate-700 hover:border-red-500/30">
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        {/* Top Header */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              {currentTab === 'inventory' && 'Inventory Management'}
              {currentTab === 'orders' && 'Order Fulfillment'}
              {currentTab === 'promos' && 'Promotional Campaigns'}
            </h1>
            <p className="text-sm text-slate-500">
              {currentTab === 'inventory' && 'Add, edit, and track your product stock.'}
              {currentTab === 'orders' && 'Process customer orders and update shipping statuses.'}
              {currentTab === 'promos' && 'Create discount codes to drive sales.'}
            </p>
          </div>
        </header>

        {/* Dynamic View Area */}
        <div className="flex-1 overflow-auto p-8">
       {currentTab === 'inventory' && <SellerInventory sessionId={sessionId} />}
       {currentTab === 'orders' && <div className="text-slate-500">Orders Component goes here...</div>}
       {currentTab === 'promos' && <div className="text-slate-500">Promos Component goes here...</div>}
     </div>
      </main>
    </div>
  );
}