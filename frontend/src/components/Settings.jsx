import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const BASE_URL = 'http://localhost:7003';

export default function Settings({ sessionId }) {
  const [profile, setProfile] = useState({ username: '', email: '', photo_url: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`${BASE_URL}/profile?sess_id=${sessionId}`);
        const data = await response.json();
        if (data.status === 'SUCCESS') {
          setProfile({
            username: data.username,
            email: data.email || '',
            photo_url: data.photo_url || ''
          });
        }
      } catch (err) { console.error("Failed to fetch profile"); }
      finally { setLoading(false); }
    };
    if (sessionId) fetchProfile();
  }, [sessionId]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMessage('❌ Image is too large. Please select a photo under 2MB.');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result;
        
        setProfile({ ...profile, photo_url: base64String });
        
        // 3. AUTO-SAVE to the database immediately!
        setSaving(true);
        setMessage('Saving photo...');
        try {
          const response = await fetch(`${BASE_URL}/profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sess_id: sessionId,
              email: profile.email,
              photo_url: base64String 
            })
          });
          const data = await response.json();
          setMessage(data.status === 'SUCCESS' ? '✅ Profile photo saved!' : `❌ Error: ${data.message}`);
        } catch (err) {
          setMessage('❌ Failed to connect to server.');
        } finally {
          setSaving(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch(`${BASE_URL}/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sess_id: sessionId,
          email: profile.email,
          photo_url: profile.photo_url
        })
      });
      const data = await response.json();
      setMessage(data.status === 'SUCCESS' ? '✅ Profile updated successfully!' : `❌ Error: ${data.message}`);
    } catch (err) {
      setMessage('❌ Failed to connect to server.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-20 text-center text-gray-500 font-medium">Loading profile...</div>;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto pb-12">

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3">
          
          {/* Left Column: The Interactive Profile Card */}
          <div className="bg-slate-50 p-8 border-b md:border-b-0 md:border-r border-gray-100 flex flex-col items-center text-center">
            
            <div 
              className="relative group cursor-pointer mb-6 w-64 h-64 rounded-full shadow-xl transition-transform duration-300 hover:scale-105 hover:shadow-2xl border-4 border-white bg-indigo-100 overflow-hidden flex items-center justify-center shrink-0" 
              onClick={() => fileInputRef.current.click()}
              title="Click to change profile picture"
            >
              {profile.photo_url ? (
                <img src={profile.photo_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-8xl font-black text-indigo-400">{profile.username.charAt(0).toUpperCase()}</span>
              )}
              
              <div className="absolute inset-0 bg-slate-900/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm">
                <svg className="w-12 h-12 text-white mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                <span className="text-white text-sm font-bold uppercase tracking-wider">Update Photo</span>
              </div>
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                className="hidden" 
              />
            </div>

            <h3 className="text-3xl font-bold text-gray-900">{profile.username}</h3>
            <p className="text-sm text-gray-500 font-medium mb-6 mt-1">Verified Buyer</p>
            
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full shadow-inner border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Account Active
            </div>
          </div>

          {/* Right Column: The Settings Form */}
          <div className="col-span-2 p-8 md:p-12">
            <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-4 mb-6">Personal Information</h3>
            
            <form onSubmit={handleSave} className="space-y-6">
              
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Account Username</label>
                <input 
                  type="text" 
                  disabled 
                  value={profile.username} 
                  className="w-full bg-gray-100 border border-gray-200 text-gray-500 rounded-xl px-4 py-3.5 cursor-not-allowed font-medium" 
                />
                <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  Usernames are permanent and cannot be changed.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Primary Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                  </div>
                  <input 
                    type="email" 
                    value={profile.email} 
                    onChange={(e) => setProfile({...profile, email: e.target.value})} 
                    placeholder="hello@example.com"
                    className="w-full bg-white border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all pl-11 py-3.5 shadow-sm" 
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2">We use this address to send order confirmations and shipping updates.</p>
              </div>

              {message && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  className={`p-4 rounded-xl text-sm font-bold flex items-center gap-2 ${message.includes('✅') ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}
                >
                  {message}
                </motion.div>
              )}

              <div className="pt-6 border-t border-gray-100 mt-8">
                <button 
                  type="submit" 
                  disabled={saving} 
                  className="w-full md:w-auto md:px-12 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-200 transition-all flex justify-center items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Saving Changes...
                    </>
                  ) : 'Save Changes'}
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>
    </motion.div>
  );
}