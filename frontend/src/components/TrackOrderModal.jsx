import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix for Leaflet's default marker icons
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetinaUrl,
  iconUrl: iconUrl,
  shadowUrl: shadowUrl,
});

// A custom icon for the Warehouse
const warehouseIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-black.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom Icon for the Delivery Truck
const truckIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/709/709733.png', 
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

// Helper to zoom the map to fit the route perfectly
function RouteFitter({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [50, 50] });
  }, [bounds, map]);
  return null;
}

export default function TrackOrderModal({ isOpen, onClose, order }) {
  if (!isOpen || !order) return null;

  // The Warehouse is in Boulder, CO
  const warehouseLocation = [40.0150, -105.2705]; 
  
  // The REAL destination from the database (Fallback to Denver if missing)
  const destinationLocation = [order.lat || 39.7392, order.lng || -104.9903]; 
  
  const routeBounds = [warehouseLocation, destinationLocation];

  // MATHEMATICAL MAGIC: Calculate where the truck is right now!
  let truckLocation = warehouseLocation; // Default: still at warehouse (PROCESSING)
  if (order.status === 'SHIPPED') {
    // Halfway point between warehouse and home!
    truckLocation = [
      (warehouseLocation[0] + destinationLocation[0]) / 2,
      (warehouseLocation[1] + destinationLocation[1]) / 2
    ];
  } else if (order.status === 'DELIVERED') {
    // It arrived!
    truckLocation = destinationLocation;
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Dark Background Overlay */}
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">Track Your Package</h3>
              <p className="text-sm text-gray-500 font-medium">Order ID: <span className="font-mono text-indigo-600">{order.order_id.substring(0, 8).toUpperCase()}</span></p>
            </div>
            <button onClick={onClose} className="p-2 bg-white rounded-full hover:bg-gray-200 transition-colors shadow-sm">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>

          {/* Map Area */}
          <div className="h-96 w-full bg-gray-100 relative z-0">
            <MapContainer bounds={routeBounds} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />
              
              {/* Origin Marker */}
              <Marker position={warehouseLocation} icon={warehouseIcon}>
                <Popup className="font-bold text-gray-900">DistributedStore Hub</Popup>
              </Marker>
              
              {/* Destination Marker */}
              <Marker position={destinationLocation}>
                <Popup className="font-bold text-gray-900">Your Delivery Address</Popup>
              </Marker>

              {/* THE MOVING TRUCK! */}
              <Marker position={truckLocation} icon={truckIcon}>
                <Popup className="font-bold text-blue-600">Current Package Location</Popup>
              </Marker>

              {/* The Route Line */}
              <Polyline 
                positions={routeBounds} 
                color="#4f46e5" 
                weight={4} 
                dashArray="10, 10" 
                className="animate-pulse"
              />
              
              <RouteFitter bounds={routeBounds} />
            </MapContainer>

            {/* Floating Status Badge */}
            <div className="absolute top-4 left-4 z-[1000] bg-white/90 backdrop-blur px-4 py-2 rounded-xl shadow-lg border border-gray-200 flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
              </span>
              <span className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                {order.status === 'SHIPPED' ? 'In Transit' : order.status}
              </span>
            </div>
          </div>

          {/* Footer Details */}
          <div className="p-6 bg-white flex items-center gap-4">
            <div className="w-16 h-16 shrink-0 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center overflow-hidden p-2">
              {order.image_url ? (
                <img src={order.image_url} alt="Item" className="w-full h-full object-contain" />
              ) : (
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
              )}
            </div>
            <div>
              <h4 className="font-bold text-gray-900">{order.item}</h4>
              <p className="text-sm text-gray-500">Sold by {order.seller} • Qty: {order.qty}</p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}