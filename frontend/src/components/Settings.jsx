import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const BASE_URL = 'http://localhost:7003';

export default function Settings({ sessionId }) {
  const [profile, setProfile] = useState({ username: '', email: '', photo_url: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

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

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile({ ...profile, photo_url: reader.result });
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
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-100">
          <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden border-2 border-indigo-50">
            {profile.photo_url ? (
              <img src={profile.photo_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-indigo-500">{profile.username.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Account Settings</h2>
            <p className="text-gray-500 text-sm mt-1">Manage your profile and notification preferences.</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Username</label>
            <input type="text" disabled value={profile.username} className="w-full bg-gray-100 border border-gray-200 text-gray-500 rounded-xl px-4 py-3 cursor-not-allowed" />
            <p className="text-xs text-gray-400 mt-1">Usernames cannot be changed.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Email Address</label>
            <input 
              type="email" 
              value={profile.email} 
              onChange={(e) => setProfile({...profile, email: e.target.value})} 
              placeholder="you@example.com"
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white px-4 py-3 outline-none transition-all" 
            />
            <p className="text-xs text-gray-400 mt-1">We'll use this to send your order confirmation receipts.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Profile Photo</label>
            <input 
              type="file" accept="image/*" 
              onChange={handleImageUpload} 
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-colors"
            />
          </div>

          {message && (
            <div className={`p-4 rounded-xl text-sm font-bold text-center ${message.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {message}
            </div>
          )}

          <div className="pt-4">
            <button type="submit" disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-4 px-8 rounded-xl shadow-lg shadow-indigo-200 transition-colors">
              {saving ? 'Saving...' : 'Save Profile Settings'}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}