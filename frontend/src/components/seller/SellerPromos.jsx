import { useState, useEffect } from 'react';

const SELLER_URL = 'http://localhost:7001';

export default function SellerPromos({ sessionId }) {
  const [targetType, setTargetType] = useState('ITEM');
  const [targetVal, setTargetVal] = useState('');
  const [code, setCode] = useState('');
  const [discount, setDiscount] = useState('');
  const [loading, setLoading] = useState(false);
  
  // We rename this from recentPromos to activePromos because they are real now!
  const [activePromos, setActivePromos] = useState([]);

  // NEW: Fetch historical promos from the database
  const fetchPromos = async () => {
    try {
      const response = await fetch(`${SELLER_URL}/promo?sess_id=${sessionId}`);
      const data = await response.json();
      if (data.status === 'SUCCESS') {
        setActivePromos(data.promos);
      }
    } catch (err) {
      console.error("Failed to fetch promos");
    }
  };

  // Run on mount
  useEffect(() => {
    if (sessionId) fetchPromos();
  }, [sessionId]);

  const handleCreatePromo = async (e) => {
    e.preventDefault();
    if (!code || !targetVal || !discount || discount <= 0 || discount > 100) {
      alert("Please fill out all fields correctly. Discount must be between 1 and 100.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${SELLER_URL}/promo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sess_id: sessionId,
          target_type: targetType,
          target_val: targetVal,
          code: code.toUpperCase(),
          discount: parseFloat(discount)
        })
      });
      const data = await response.json();
      
      if (data.status === 'SUCCESS') {
        alert("✅ Promotion Campaign Created!");
        setCode(''); setTargetVal(''); setDiscount('');
        fetchPromos(); // NEW: Instantly refresh the table from the DB
      } else {
        alert(`❌ Error: ${data.message}`);
      }
    } catch (err) { alert("Connection error."); } 
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path></svg>
          </div>
          <h2 className="text-lg font-bold text-slate-800">Campaign Manager</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-fit">
          <div className="p-5 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-slate-800">Create New Discount</h3>
          </div>
          <form onSubmit={handleCreatePromo} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Promo Code Word</label>
              <input required type="text" placeholder="e.g. SUMMER25" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none uppercase placeholder:normal-case" value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Discount Percentage (%)</label>
              <input required type="number" min="1" max="100" placeholder="25" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Target Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => { setTargetType('ITEM'); setTargetVal(''); }} className={`py-2 text-sm font-bold rounded-lg border transition-all ${targetType === 'ITEM' ? 'bg-teal-50 border-teal-500 text-teal-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>Specific Item</button>
                <button type="button" onClick={() => { setTargetType('CATEGORY'); setTargetVal(''); }} className={`py-2 text-sm font-bold rounded-lg border transition-all ${targetType === 'CATEGORY' ? 'bg-teal-50 border-teal-500 text-teal-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>Entire Category</button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{targetType === 'ITEM' ? 'Target Item ID' : 'Target Category Number'}</label>
              <input required type="text" placeholder={targetType === 'ITEM' ? "e.g. 1.1" : "e.g. 1"} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none" value={targetVal} onChange={(e) => setTargetVal(e.target.value)} />
              {targetType === 'ITEM' && <p className="text-xs text-slate-400 mt-1 italic">Note: You must own the item to discount it.</p>}
            </div>
            <button type="submit" disabled={loading} className="w-full mt-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white font-bold py-3 rounded-xl shadow-md transition-colors">
              {loading ? 'Activating...' : 'Activate Campaign'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-fit">
          <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800">Active Campaigns</h3>
            <button onClick={fetchPromos} className="text-xs font-bold text-teal-600 hover:text-teal-800 flex items-center gap-1">
               <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
               Refresh
            </button>
          </div>
          <div className="p-0">
            {activePromos.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <p className="font-medium text-sm">No campaigns active right now.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="py-3 px-5 text-xs font-bold text-slate-500 uppercase">Promo Code</th>
                    <th className="py-3 px-5 text-xs font-bold text-slate-500 uppercase">Discount</th>
                    <th className="py-3 px-5 text-xs font-bold text-slate-500 uppercase">Target Details</th>
                    <th className="py-3 px-5 text-xs font-bold text-slate-500 uppercase text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activePromos.map((promo, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3 px-5 font-mono font-bold text-teal-700">{promo.code}</td>
                      <td className="py-3 px-5 font-bold text-slate-900">{promo.pct}% OFF</td>
                      <td className="py-3 px-5"><span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded">{promo.type}: {promo.target}</span></td>
                      <td className="py-3 px-5 text-right"><span className="text-xs font-bold text-emerald-600 flex items-center justify-end gap-1">Active</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}