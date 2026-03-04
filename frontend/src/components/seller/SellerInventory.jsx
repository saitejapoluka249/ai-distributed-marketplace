import { useState, useEffect } from 'react';

const SELLER_URL = 'http://localhost:7001';

export default function SellerInventory({ sessionId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // New Item Form State
  const [newItem, setNewItem] = useState({ name: '', category: '1', keywords: '', condition: 'New', price: '', quantity: '', image_url: '' });
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewItem({...newItem, image_url: reader.result}); // Converts file to Base64 string!
      };
      reader.readAsDataURL(file);
    }
  };
  const [formLoading, setFormLoading] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${SELLER_URL}/items?sess_id=${sessionId}`);
      const data = await response.json();
      
      if (data.status === 'SUCCESS') {
        const parsedItems = data.items.map(itemStr => {
          // If the backend actually sends JSON objects, return them directly
          if (typeof itemStr === 'object') return itemStr; 
          
          // The exact format your Python code sends: "ID:1.1 | Wireless Mouse ($25.0) Qty:100"
          // We use Regex to slice out the exact values!
          const match = itemStr.match(/ID:\s*([\d\.]+)\s*\|\s*(.*?)\s*\(\$([\d\.]+)\)\s*Qty:\s*(\d+)\s*\|\s*IMG:\s*(.*)/i);
          
          if (match) {
            return {
              id: match[1], name: match[2].trim(), price: match[3], qty: match[4],
              image: match[5] && match[5] !== "None" ? match[5] : null,
              category: match[1].split('.')[0] 
            };
          }

          // Safety fallback just in case a string comes back completely malformed
          return {
            id: 'N/A', name: 'Parsing Error', price: '0', qty: '0', category: 'N/A'
          };
        });
        
        setItems(parsedItems);
      }
    } catch (err) {
      console.error("Failed to fetch inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId) fetchItems();
  }, [sessionId]);

  const handleAddItem = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const response = await fetch(`${SELLER_URL}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sess_id: sessionId, ...newItem })
      });
      const data = await response.json();
      if (data.status === 'SUCCESS') {
        alert(`✅ Product Added! ID: ${data.item_id}`);
        setIsAddModalOpen(false);
        setNewItem({ name: '', category: '1', keywords: '', condition: 'New', price: '', quantity: '' });
        fetchItems(); // Refresh table
      } else {
        alert(`❌ Error: ${data.message}`);
      }
    } catch (err) { alert("Connection error."); }
    setFormLoading(false);
  };

  const handleUpdatePrice = async (itemId) => {
    const newPrice = prompt("Enter new price for this item:");
    if (!newPrice || isNaN(newPrice) || Number(newPrice) < 0) return;
    
    try {
      const response = await fetch(`${SELLER_URL}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sess_id: sessionId, item_id: itemId, price: newPrice })
      });
      if ((await response.json()).status === 'SUCCESS') {
        alert("✅ Price Updated!");
        fetchItems();
      }
    } catch (err) { alert("Connection error."); }
  };

  const handleAddStock = async (itemId) => {
    const stockToAdd = prompt("How many MORE items are you adding to stock?");
    if (!stockToAdd || isNaN(stockToAdd) || Number(stockToAdd) <= 0) return;

    try {
      const response = await fetch(`${SELLER_URL}/update_qty`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sess_id: sessionId, item_id: itemId, qty: stockToAdd })
      });
      if ((await response.json()).status === 'SUCCESS') {
        alert("✅ Stock Added!");
        fetchItems();
      }
    } catch (err) { alert("Connection error."); }
  };

  return (
    <div className="space-y-6">
      {/* Top Control Bar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
          </div>
          <h2 className="text-lg font-bold text-slate-800">Product Database</h2>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          Add New Product
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Item ID</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Product Info</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Stock</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Price</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="5" className="py-12 text-center text-slate-500 font-medium">Loading inventory...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan="5" className="py-12 text-center text-slate-500 font-medium">No items found. Click 'Add New Product' to start.</td></tr>
              ) : (
                items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6 text-sm font-mono text-slate-500">{item.id}</td>
                    <td className="py-4 px-6">
                      <p className="text-sm font-bold text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-400">Category {item.category}</p>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${Number(item.qty) > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {item.qty} in stock
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm font-bold text-slate-900">${parseFloat(item.price).toFixed(2)}</td>
                    <td className="py-4 px-6 flex justify-end gap-2">
                      <button onClick={() => handleAddStock(item.id)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors">
                        + Add Stock
                      </button>
                      <button onClick={() => handleUpdatePrice(item.id)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors">
                        Edit Price
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD ITEM MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">List New Product</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <form onSubmit={handleAddItem} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Product Name</label>
                <input required type="text" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="e.g. Wireless Mouse" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Replace the number input with this Select Dropdown */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Product Category</label>
                <select 
                  required
                  value={newItem.category}
                  onChange={e => setNewItem({...newItem, category: Number(e.target.value)})}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50 appearance-none font-medium text-gray-700"
                >
                  <option value="" disabled>Select a category...</option>
                  <option value={1}>💻 Electronics & Laptops</option>
                  <option value={2}>🎮 Video Games & Consoles</option>
                  <option value={3}>⌚ Watches & Jewelry</option>
                  <option value={4}>👕 Clothing & Shoes</option>
                  <option value={5}>🏠 Home & Kitchen</option>
                  <option value={6}>🚴 Sports & Outdoors</option>
                </select>
              </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Condition</label>
                  <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none" value={newItem.condition} onChange={e => setNewItem({...newItem, condition: e.target.value})}>
                    <option value="New">New</option>
                    <option value="Used">Used</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Initial Stock Qty</label>
                  <input required type="number" min="1" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Price (USD)</label>
                  <input required type="number" min="0.01" step="0.01" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Search Keywords</label>
                <input required type="text" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 outline-none" value={newItem.keywords} onChange={e => setNewItem({...newItem, keywords: e.target.value})} placeholder="e.g. electronics, mouse, wireless" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Product Photo</label>
                <input 
                  type="file" accept="image/*" 
                  onChange={handleImageUpload} 
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 transition-colors"
                />
                {newItem.image_url && (
                  <img src={newItem.image_url} alt="Preview" className="mt-3 h-24 w-24 object-cover rounded-xl border border-slate-200 shadow-sm" />
                )}
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button type="submit" disabled={formLoading} className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white font-bold py-3 rounded-xl shadow-md transition-colors">
                  {formLoading ? 'Registering Item...' : 'Save to Inventory Database'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}