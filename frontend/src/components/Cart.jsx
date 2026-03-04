import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';

import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetinaUrl,
  iconUrl: iconUrl,
  shadowUrl: shadowUrl,
});

function LocationMarker({ position, setPosition, onLocationFound }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      onLocationFound(e.latlng.lat, e.latlng.lng);
    },
  });
  return position === null ? null : <Marker position={position}></Marker>;
}

function MapPanner({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 15);
  }, [center, map]);
  return null;
}

const BASE_URL = 'http://localhost:7003';

export default function Cart({ isOpen, onClose, sessionId }) {
  const [cart, setCart] = useState([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoMsg, setPromoMsg] = useState('');
  const [suggestedPromos, setSuggestedPromos] = useState([]); 
  const [tax, setTax] = useState(0);
  const [finalBilled, setFinalBilled] = useState(0);
  
  // DEFAULT TO SAN JOSE, CA
  const [mapPosition, setMapPosition] = useState(null);
  const [mapCenter, setMapCenter] = useState([37.3382, -121.8863]); 
  const [isLocating, setIsLocating] = useState(false);
  
  const [orderComplete, setOrderComplete] = useState(false);
  const [completedOrderId, setCompletedOrderId] = useState('');
  
  const [isCheckout, setIsCheckout] = useState(false);
  const [paymentData, setPaymentData] = useState({ 
    name: '', cc: '', exp: '', cvv: '', 
    street: '', city: '', state: '', zip: '', phone: ''
  });
  const [checkoutMsg, setCheckoutMsg] = useState('');

  // --- THE COMPLETE 50-STATE TAX ENGINE ---
  const STATE_TAX_RATES = {
    'AL': 0.0400, 'AK': 0.0000, 'AZ': 0.0560, 'AR': 0.0650, 'CA': 0.0725, 
    'CO': 0.0290, 'CT': 0.0635, 'DE': 0.0000, 'FL': 0.0600, 'GA': 0.0400, 
    'HI': 0.0400, 'ID': 0.0600, 'IL': 0.0625, 'IN': 0.0700, 'IA': 0.0600, 
    'KS': 0.0650, 'KY': 0.0600, 'LA': 0.0445, 'ME': 0.0550, 'MD': 0.0600, 
    'MA': 0.0625, 'MI': 0.0600, 'MN': 0.0688, 'MS': 0.0700, 'MO': 0.0423, 
    'MT': 0.0000, 'NE': 0.0550, 'NV': 0.0685, 'NH': 0.0000, 'NJ': 0.0663, 
    'NM': 0.0513, 'NY': 0.0400, 'NC': 0.0475, 'ND': 0.0500, 'OH': 0.0575, 
    'OK': 0.0450, 'OR': 0.0000, 'PA': 0.0600, 'RI': 0.0700, 'SC': 0.0600, 
    'SD': 0.0450, 'TN': 0.0700, 'TX': 0.0625, 'UT': 0.0610, 'VT': 0.0600, 
    'VA': 0.0530, 'WA': 0.0650, 'WV': 0.0600, 'WI': 0.0500, 'WY': 0.0400,
    'DC': 0.0600
  };

  // --- REVERSE MAPPER (Turns "Texas" into "TX") ---
  const STATE_NAME_TO_CODE = {
    "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR", "California": "CA",
    "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE", "Florida": "FL", "Georgia": "GA",
    "Hawaii": "HI", "Idaho": "ID", "Illinois": "IL", "Indiana": "IN", "Iowa": "IA",
    "Kansas": "KS", "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
    "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS",
    "Missouri": "MO", "Montana": "MT", "Nebraska": "NE", "Nevada": "NV", "New Hampshire": "NH",
    "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY", "North Carolina": "NC",
    "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK", "Oregon": "OR", "Pennsylvania": "PA",
    "Rhode Island": "RI", "South Carolina": "SC", "South Dakota": "SD", "Tennessee": "TN",
    "Texas": "TX", "Utah": "UT", "Vermont": "VT", "Virginia": "VA", "Washington": "WA",
    "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY", "District of Columbia": "DC"
  };

  // --- DYNAMIC LIVE TAX MATH ---
  const currentStateCode = paymentData.state.trim().toUpperCase();
  
  // Check if they actually selected a real state from the dropdown yet
  const hasValidState = currentStateCode && STATE_TAX_RATES[currentStateCode] !== undefined;
  
  // Tax is strictly 0 until they select a real state!
  const currentTaxRate = hasValidState ? STATE_TAX_RATES[currentStateCode] : 0; 
  const liveTaxAmount = (grandTotal * currentTaxRate).toFixed(2);
  const liveFinalBilled = (parseFloat(grandTotal) + parseFloat(liveTaxAmount)).toFixed(2);

  const fetchCart = async (promo = '') => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/cart?sess_id=${sessionId}&promo=${promo}`);
      const data = await response.json();
      if (data.status === 'SUCCESS') {
        setCart(data.cart);
        setGrandTotal(data.grand_total);
        setTax(data.tax);
        setFinalBilled(data.final_billed);
        setPromoMsg(data.promo_msg || '');
        setSuggestedPromos(data.suggested_promos || []);
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
      setOrderComplete(false); 
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
      // --- TWO-PASS GEOCODING ---
      let finalLat = mapPosition ? mapPosition.lat : null;
      let finalLng = mapPosition ? mapPosition.lng : null;

      if (!finalLat || !finalLng) {
        const fullParts = [];
        if (paymentData.street) fullParts.push(paymentData.street);
        if (paymentData.city) fullParts.push(paymentData.city);
        if (paymentData.state) fullParts.push(paymentData.state);
        if (paymentData.zip) fullParts.push(paymentData.zip);
        
        try {
          const fullRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullParts.join(', '))}`);
          const fullData = await fullRes.json();
          
          if (fullData && fullData.length > 0) {
            finalLat = parseFloat(fullData[0].lat);
            finalLng = parseFloat(fullData[0].lon);
          } else {
            console.warn("Exact street not found, falling back to City/State level...");
            const cityStateParts = [];
            if (paymentData.city) cityStateParts.push(paymentData.city);
            if (paymentData.state) cityStateParts.push(paymentData.state);
            
            const cityStateRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityStateParts.join(', '))}`);
            const cityStateData = await cityStateRes.json();
            
            if (cityStateData && cityStateData.length > 0) {
              finalLat = parseFloat(cityStateData[0].lat);
              finalLng = parseFloat(cityStateData[0].lon);
            } else {
              // San Jose Fallback
              finalLat = 37.3382; 
              finalLng = -121.8863;
            }
          }
        } catch (err) {
          finalLat = 37.3382;
          finalLng = -121.8863;
        }
      }
      // -------------------------------------

      const response = await fetch(`${BASE_URL}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sess_id: sessionId,
          name: paymentData.name,
          cc_number: paymentData.cc,
          exp_date: paymentData.exp,
          sec_code: paymentData.cvv,
          promo: promoCode,
          street: paymentData.street,
          city: paymentData.city,
          state: paymentData.state,
          zip: paymentData.zip,
          phone: paymentData.phone,
          lat: finalLat,
          lng: finalLng
        })
      });
      
      const data = await response.json();
      
      if (data.status === 'SUCCESS') {
        setCompletedOrderId(data.order_id || 'Generating...'); 
        setOrderComplete(true);
        
        setPromoCode('');
        setPromoMsg('');
        setPaymentData({ 
          name: '', cc: '', exp: '', cvv: '', 
          street: '', city: '', state: '', zip: '', phone: '' 
        });
        setMapPosition(null);
        setMapCenter([37.3382, -121.8863]); 

        fetchCart(''); 
        window.dispatchEvent(new Event('refreshMarketplace')); 
      } else {
        setCheckoutMsg(`❌ Error: ${data.message}`);
      }
    } catch (err) {
      setCheckoutMsg("❌ Connection Error.");
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = async (lat, lng) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await response.json();
      
      if (data.address) {
        const road = data.address.road || '';
        const houseNumber = data.address.house_number || '';
        const rawState = data.address.state || '';
        
        // Translates full state name from map to 2-letter code
        const mappedStateCode = STATE_NAME_TO_CODE[rawState] || rawState.substring(0, 2).toUpperCase();
        
        setPaymentData(prev => ({
          ...prev,
          street: `${houseNumber} ${road}`.trim(),
          city: data.address.city || data.address.town || data.address.village || '',
          state: mappedStateCode,
          zip: data.address.postcode || ''
        }));
      }
    } catch (error) {
      console.error("Failed to geocode location.");
    }
  };

  const handleGetLiveLocation = () => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setMapCenter([latitude, longitude]);
        setMapPosition({ lat: latitude, lng: longitude });
        handleMapClick(latitude, longitude);
        setIsLocating(false);
      },
      (err) => {
        alert("Please allow location access in your browser to use GPS.");
        setIsLocating(false);
      }
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
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
                {isCheckout && !orderComplete ? 'Secure Checkout' : 'Your Cart'}
              </h2>
              <div className="flex items-center gap-2">
                {!isCheckout && cart.length > 0 && !orderComplete && (
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
              
              {/* === THE ANIMATED SUCCESS SCREEN === */}
              {orderComplete ? (
                <div className="h-full flex flex-col items-center justify-center text-center pb-20">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6"
                  >
                    <motion.svg 
                      className="w-12 h-12 text-green-600" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <motion.path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth="3" 
                        d="M5 13l4 4L19 7"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                      />
                    </motion.svg>
                  </motion.div>
                  
                  <motion.h2 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-3xl font-black text-gray-900 mb-2"
                  >
                    Payment Successful!
                  </motion.h2>
                  
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-gray-500 mb-8"
                  >
                    Thank you for your purchase. Your order has been placed and a receipt has been sent to your email.
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="bg-white border border-gray-200 rounded-xl p-4 w-full mb-8 shadow-sm"
                  >
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Order Reference</p>
                    <p className="font-mono text-indigo-600 font-bold text-sm truncate">{completedOrderId}</p>
                  </motion.div>

                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    onClick={onClose} // Just close the cart!
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-4 rounded-xl shadow-lg transition-colors"
                  >
                    Continue Shopping
                  </motion.button>
                </div>

              /* === NORMAL CART / CHECKOUT UI === */
              ) : loading && !isCheckout ? (
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
                /* EXPANDED CHECKOUT VIEW */
                <form id="checkout-form" onSubmit={handlePurchase} className="space-y-6">
                  
                  {/* Shipping Section */}
                  <div>
                    <h3 className="font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4">1. Shipping Address</h3>
                    
                    {/* THE INTERACTIVE MAP */}
                    <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="flex justify-between items-center mb-3">
                        <p className="text-sm font-bold text-slate-700">Drop a pin or use GPS to auto-fill your address</p>
                        <button 
                          type="button" 
                          onClick={handleGetLiveLocation}
                          disabled={isLocating}
                          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-xs font-bold rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                          {isLocating ? 'Locating...' : 'Use My GPS'}
                        </button>
                      </div>
                      
                      <div className="h-64 w-full rounded-lg overflow-hidden border border-slate-300 shadow-inner z-0 relative">
                        <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                          <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; OpenStreetMap contributors'
                          />
                          <LocationMarker position={mapPosition} setPosition={setMapPosition} onLocationFound={handleMapClick} />
                          <MapPanner center={mapCenter} />
                        </MapContainer>
                      </div>
                    </div>

                    {/* THE MANUAL TEXT BOXES (Hybrid Approach) */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
                        <input required type="text" value={paymentData.name} onChange={e => setPaymentData({...paymentData, name: e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none bg-white" placeholder="Enter your full name"/>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Street Address</label>
                        <input required type="text" value={paymentData.street} 
                          onChange={e => {
                            setPaymentData({...paymentData, street: e.target.value});
                            setMapPosition(null); 
                          }} 
                          className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none bg-white" placeholder="123 Main St, Apt 4B"/>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">City</label>
                          <input required type="text" value={paymentData.city} 
                            onChange={e => {
                              setPaymentData({...paymentData, city: e.target.value});
                              setMapPosition(null); 
                            }} 
                            className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none bg-white" placeholder="Enter city"/>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          
                          {/* THE NEW STATE DROPDOWN MENU */}
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">State</label>
                            <select 
                              required 
                              value={paymentData.state} 
                              onChange={e => {
                                setPaymentData({...paymentData, state: e.target.value});
                                setMapPosition(null); 
                              }} 
                              className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none bg-white appearance-none cursor-pointer"
                            >
                              <option value="" disabled>Select State</option>
                              {Object.entries(STATE_NAME_TO_CODE).map(([fullName, code]) => (
                                <option key={code} value={code}>{code} - {fullName}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Zip</label>
                            <input required type="text" value={paymentData.zip} 
                              onChange={e => {
                                setPaymentData({...paymentData, zip: e.target.value});
                                setMapPosition(null); 
                              }} 
                              className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none bg-white" placeholder="Zip Code"/>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone Number</label>
                        <input required type="tel" value={paymentData.phone} onChange={e => setPaymentData({...paymentData, phone: e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none bg-white" placeholder="(555) 000-0000"/>
                      </div>
                    </div>
                  </div>
                  {/* Payment Section */}
                  <div>
                    <h3 className="font-bold text-gray-900 border-b border-gray-200 pb-2 mb-4">2. Payment Details</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Card Number (16 Digits)</label>
                        <input required type="text" maxLength="16" onChange={e => setPaymentData({...paymentData, cc: e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50" placeholder="1234 5678 1234 5678"/>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Expiry (MM/YY)</label>
                          <input required type="text" placeholder="12/25" onChange={e => setPaymentData({...paymentData, exp: e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50"/>
                        </div>
                        <div className="w-24">
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CVV</label>
                          <input required type="text" maxLength="3" placeholder="123" onChange={e => setPaymentData({...paymentData, cvv: e.target.value})} className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none bg-gray-50"/>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              )}
            </div>

            {/* THE NEW DYNAMIC TAX FOOTER */}
            {!orderComplete && cart.length > 0 && !checkoutMsg && (
              <div className="p-6 border-t border-gray-100 bg-gray-50">

<div className="space-y-2 mb-6">
                  <div className="flex justify-between text-gray-500 text-sm">
                    <span>Subtotal</span>
                    <span>${parseFloat(grandTotal).toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between text-gray-500 text-sm items-center">
                    <span className="flex items-center gap-1">
                      {hasValidState ? `State Tax (${currentStateCode})` : 'Tax'}
                      {hasValidState && (
                        <span className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded font-bold">
                          {(currentTaxRate * 100).toFixed(2)}%
                        </span>
                      )}
                    </span>
                    {/* Shows "Calculated at checkout" until they pick a state! */}
                    <span className={hasValidState ? 'text-gray-900' : 'text-gray-400 italic'}>
                      {hasValidState ? `$${liveTaxAmount}` : 'Calculated at checkout'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-gray-200 mt-2">
                    <span className="text-gray-900 font-bold">
                      Total {hasValidState ? 'Billed' : 'Estimated'}
                    </span>
                    <span className="text-3xl font-black text-gray-900">${liveFinalBilled}</span>
                  </div>
                </div>

                {!isCheckout ? (
                  <button onClick={() => setIsCheckout(true)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg transition-colors">
                    Proceed to Checkout
                  </button>
                ) : (
                  <button form="checkout-form" type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-lg transition-colors flex justify-center items-center gap-2">
                    {loading ? 'Processing...' : `Pay $${liveFinalBilled}`}
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