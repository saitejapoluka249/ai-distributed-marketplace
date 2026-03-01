import { useState, useEffect } from 'react';

const SELLER_URL = 'http://localhost:7001';

export default function SellerReviews({ sessionId }) {
  const [ratingData, setRatingData] = useState({ 
    seller_avg: 0, seller_reviews: [], 
    item_avg: 0, item_reviews: [] 
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRatings = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${SELLER_URL}/rating?sess_id=${sessionId}`);
        const data = await response.json();
        
        if (data.status === 'SUCCESS') {
          setRatingData({
            seller_avg: data.seller_avg || 0,
            seller_reviews: data.seller_reviews || [],
            item_avg: data.item_avg || 0,
            item_reviews: data.item_reviews || []
          });
        }
      } catch (err) {
        console.error("Failed to fetch store ratings");
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) fetchRatings();
  }, [sessionId]);

  const renderStars = (rating) => {
    const safeRating = rating || 0; 
    return [...Array(5)].map((_, index) => {
      const isFull = safeRating >= index + 1;
      const isHalf = !isFull && safeRating >= index + 0.5;

      return (
        <div key={index} className="relative w-5 h-5 flex-shrink-0">
          <svg className="absolute top-0 left-0 w-5 h-5 text-slate-200" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          {(isFull || isHalf) && (
            <svg className="absolute top-0 left-0 h-5 w-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20" style={{ clipPath: isHalf ? 'inset(0 50% 0 0)' : 'none' }}>
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          )}
        </div>
      );
    });
  };

  if (loading) return <div className="text-slate-500 font-medium py-10">Loading performance data...</div>;

  return (
    <div className="space-y-6 max-w-7xl">
      
      {/* Top Banner: Two Separate Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Direct Seller Rating Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Direct Seller Rating</h2>
            <p className="text-xs text-slate-500 mt-1">Feedback on your shipping & service.</p>
          </div>
          <div className="bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl flex items-center gap-4">
            <div className="text-center">
              <p className="text-3xl font-black text-slate-800">{ratingData.seller_avg.toFixed(1)}</p>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex">{renderStars(ratingData.seller_avg)}</div>
              <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">{ratingData.seller_reviews.length} Ratings</p>
            </div>
          </div>
        </div>

        {/* Product Rating Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Product Quality Rating</h2>
            <p className="text-xs text-slate-500 mt-1">Feedback specifically on the items you sell.</p>
          </div>
          <div className="bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl flex items-center gap-4">
            <div className="text-center">
              <p className="text-3xl font-black text-slate-800">{ratingData.item_avg.toFixed(1)}</p>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex">{renderStars(ratingData.item_avg)}</div>
              <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">{ratingData.item_reviews.length} Ratings</p>
            </div>
          </div>
        </div>

      </div>

      {/* Two-Column Review Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Column 1: Seller Feedback */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-fit">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
            <h3 className="font-bold text-slate-800">Seller Feedback Log</h3>
          </div>
          <div className="p-4 flex flex-col gap-3">
            {ratingData.seller_reviews.length === 0 ? (
              <p className="text-sm text-slate-500 italic text-center py-4">No seller feedback yet.</p>
            ) : (
              ratingData.seller_reviews.map((rev, idx) => (
                <div key={idx} className="border border-slate-100 bg-slate-50/50 rounded-xl p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-sm text-slate-800">{rev.user}</span>
                    <div className="flex scale-75 origin-top-right">{renderStars(rev.stars)}</div>
                  </div>
                  <p className="text-slate-600 text-sm">"{rev.review}"</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2: Product Feedback */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-fit">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <svg className="w-5 h-5 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
            <h3 className="font-bold text-slate-800">Product Feedback Log</h3>
          </div>
          <div className="p-4 flex flex-col gap-3">
            {ratingData.item_reviews.length === 0 ? (
              <p className="text-sm text-slate-500 italic text-center py-4">No product feedback yet.</p>
            ) : (
              ratingData.item_reviews.map((rev, idx) => (
                <div key={idx} className="border border-slate-100 bg-slate-50/50 rounded-xl p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-sm text-slate-800">{rev.user}</span>
                    <div className="flex scale-75 origin-top-right">{renderStars(rev.stars)}</div>
                  </div>
                  {/* Notice how the Python backend automatically added the [Item Name] to the string! */}
                  <p className="text-slate-600 text-sm">"{rev.review}"</p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}