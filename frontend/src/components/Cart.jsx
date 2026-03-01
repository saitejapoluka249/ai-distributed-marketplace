import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BASE_URL = 'http://localhost:7003';

export default function Cart({ isOpen, onClose, sessionId }) {
  const [cart, setCart] = useState([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoMsg, setPromoMsg] = useState('');
  const [suggestedPromos, setSuggestedPromos] = useState([]); // <-- NEW STATE
  
  const [isCheckout, setIsCheckout] = useState(false);
  const [paymentData, setPaymentData] = useState({ name: '', cc: '', exp: '', cvv: '' });
  const [checkoutMsg, setCheckoutMsg] = useState('');

  const fetchCart = async (promo = '') => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/cart?sess_id=${sessionId}&promo=${promo}`);
      const data = await response.json();
      if (data.status === 'SUCCESS') {
        setCart(data.cart);
        setGrandTotal(data.grand_total);
        setPromoMsg(data.promo_msg || '');
        setSuggestedPromos(data.suggested_promos || []); // <-- ADD THIS LINE
      }
    } catch (err) {
      console.error("Failed to fetch cart");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCart(promoCode);
      setIsCheckout(false);
      setCheckoutMsg('');
    }
  }, [isOpen]);

  const handleApplyPromo = (e) => {
    e.preventDefault();
    fetchCart(promoCode);
  };

  const handleRemove = async (itemId, qty) => {
    try {
      await fetch(`${BASE_URL}/cart`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sess_id: sessionId, item_id: itemId, qty })
      });
      fetchCart(promoCode); 
    } catch (err) {
      console.error("Failed to remove item");
    }
  };

  const handleClearCart = async () => {
    try {
      await fetch(`${BASE_URL}/cart`, {
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sess_id: sessionId })
      });
      fetchCart();
    } catch (err) { console.error("Failed to clear cart"); }
  };

  const handlePurchase = async (e) => {
    e.preventDefault();
    setLoading(true);
    setCheckoutMsg('');
    
    try {
      const response = await fetch(`${BASE_URL}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sess_id: sessionId,
          name: paymentData.name,
          cc_number: paymentData.cc,
          exp_date: paymentData.exp,
          sec_code: paymentData.cvv,
          promo: promoCode
        })
      });
      const data = await response.json();
      
      if (data.status === 'SUCCESS') {
        setCheckoutMsg(`🎉 ${data.message}`);
        setCart([]);
        setGrandTotal(0);
      } else {
        setCheckoutMsg(`❌ Error: ${data.message}`);
      }
    } catch (err) {
      setCheckoutMsg("❌ Connection Error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Dark overlay background */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Slide-out Drawer */}
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
          >
      {/* Header */}
      <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50">
              <h2 className="text-2xl font-bold text-gray-900">
                {isCheckout ? 'Secure Checkout' : 'Your Cart'}
              </h2>
              <div className="flex items-center gap-2">
                {!isCheckout && cart.length > 0 && (
                  <button 
                    onClick={handleClearCart} 
                    className="text-xs font-bold text-red-600 hover:text-red-800 bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Clear Cart
                  </button>
                )}
                <button onClick={onClose} className="p-2 bg-white rounded-full hover:bg-gray-200 transition-colors shadow-sm ml-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading && !isCheckout ? (
                <div className="text-center text-gray-500 py-10">Loading cart...</div>
              ) : cart.length === 0 && !checkoutMsg ? (
                <div className="text-center text-gray-500 py-10">Your cart is empty.</div>
              ) : checkoutMsg ? (
                <div className={`p-4 rounded-xl font-medium text-center ${checkoutMsg.includes('🎉') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {checkoutMsg}
                </div>
              ) : !isCheckout ? (
                /* CART VIEW */
                <div className="space-y-6">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center border-b border-gray-100 pb-4">
                      <div>
                        <h4 className="font-bold text-gray-900">{item.name}</h4>
                        <p className="text-sm text-gray-500">Qty: {item.qty} × ${item.price}</p>
                        {item.discount_applied > 0 && (
                          <p className="text-xs font-bold text-green-600">Discount: -${item.discount_applied}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-indigo-600">${item.item_total}</p>
                        <button onClick={() => handleRemove(item.id, item.qty)} className="text-xs text-red-500 hover:underline mt-1">Remove</button>
                      </div>
                    </div>
                  ))}

                {/* Promo Code Section */}
              <form onSubmit={handleApplyPromo} className="flex gap-2 pt-4 border-t border-gray-100">
                <input 
                  type="text" 
                  placeholder="Promo Code" 
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none uppercase"
                />
                <button type="submit" className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 transition">Apply</button>
              </form>
              {promoMsg && <p className={`text-sm font-bold ${promoMsg.includes('Invalid') ? 'text-red-500' : 'text-green-600'}`}>{promoMsg}</p>}

              {/* PROMO SUGGESTIONS BOX */}
              {suggestedPromos && suggestedPromos.length > 0 && (
                <div className="mt-4 bg-teal-50 border border-teal-100 rounded-xl p-4">
                  <p className="text-xs font-bold text-teal-800 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path></svg>
                    Available Offers
                  </p>
                  <ul className="space-y-1">
                    {suggestedPromos.map((msg, i) => (
                      <li key={i} className="text-sm font-medium text-teal-700 flex items-start gap-2">
                        <span className="text-teal-400 mt-0.5">•</span>
                        {msg}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
                </div>
              ) : (
                /* CHECKOUT VIEW */
                <form id="checkout-form" onSubmit={handlePurchase} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name on Card</label>
                    <input required type="text" onChange={e => setPaymentData({...paymentData, name: e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="John Doe"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Card Number (16 Digits)</label>
                    <input required type="text" maxLength="16" onChange={e => setPaymentData({...paymentData, cc: e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="1234567812345678"/>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Expiry (MM/YY)</label>
                      <input required type="text" placeholder="12/25" onChange={e => setPaymentData({...paymentData, exp: e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"/>
                    </div>
                    <div className="w-24">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CVV</label>
                      <input required type="text" maxLength="3" placeholder="123" onChange={e => setPaymentData({...paymentData, cvv: e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"/>
                    </div>
                  </div>
                </form>
              )}
            </div>

            {/* Footer with Total and Action Button */}
            {cart.length > 0 && !checkoutMsg && (
              <div className="p-6 border-t border-gray-100 bg-gray-50">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-gray-600 font-medium">Grand Total</span>
                  <span className="text-3xl font-black text-gray-900">${grandTotal}</span>
                </div>
                {!isCheckout ? (
                  <button onClick={() => setIsCheckout(true)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg transition-colors">
                    Proceed to Checkout
                  </button>
                ) : (
                  <button form="checkout-form" type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-lg transition-colors flex justify-center items-center gap-2">
                    {loading ? 'Processing...' : `Pay $${grandTotal}`}
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}