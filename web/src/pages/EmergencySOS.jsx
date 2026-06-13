import React, { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, MapPin, Phone, Users, History, AlertCircle, Plus, Loader2, MessageSquare, MessageCircle, Trash2 } from 'lucide-react';
import { useSelector } from 'react-redux';
import { Card, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';
import AddGuardianModal from '../components/AddGuardianModal';

const EmergencySOS = () => {
  const { user } = useSelector((state) => state.auth);
  const [guardians, setGuardians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);

  // 3-second hold timer effect
  useEffect(() => {
    let interval = null;
    if (isHolding && !sosLoading) {
      const startTime = Date.now();
      interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const pct = Math.min(100, (elapsed / 3000) * 100);
        setHoldProgress(pct);

        if (elapsed >= 3000) {
          clearInterval(interval);
          setIsHolding(false);
          setHoldProgress(0);
          handleTriggerSOS();
        }
      }, 30);
    } else {
      setHoldProgress(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isHolding, sosLoading]);

 const fetchData = useCallback(async () => {
 if (!user) return;
 setLoading(true);

 try {
 // 1. Fetch Guardians
 const { data: contactData } = await supabase
 .from('emergency_contacts')
 .select('*')
 .eq('user_id', user.id)
 .eq('is_active', true);
 
 setGuardians(contactData || []);

 // 2. Fetch Recent Alerts (from insights table with type 'emergency')
 const { data: alertData } = await supabase
 .from('insights')
 .select('*')
 .eq('user_id', user.id)
 .eq('type', 'emergency')
 .order('created_at', { ascending: false })
 .limit(5);
 
 setRecentAlerts(alertData || []);
 } catch (error) {
 console.error('Error fetching SOS data:', error);
 } finally {
 setLoading(false);
 }
 }, [user]);

 useEffect(() => {
 fetchData();
 }, [fetchData]);

  const handleTriggerSOS = async () => {
    if (!user || sosLoading) return;

    setSosLoading(true);
    try {
      let locationString = 'Web Browser (Online)';
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            locationString = `https://google.com/maps?q=${latitude},${longitude}`;
            await callBackendSOS(locationString);
          },
          async () => {
            await callBackendSOS(locationString);
          }
        );
      } else {
        await callBackendSOS(locationString);
      }
    } catch (error) {
      console.error('SOS Error:', error);
      alert('Error activating SOS: ' + error.message);
      setSosLoading(false);
    }
  };

  const callBackendSOS = async (loc) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/sos/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          location: loc
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to alert guardians');

      let alertMsg = 'EMERGENCY SOS ALERT ACTIVATED!\n\n';
      if (data.twilioConfigured) {
        alertMsg += `Successfully notified ${data.contactsCount} guardian(s) via background SMS/WhatsApp.`;
      } else {
        alertMsg += `Logged in database, but Twilio is not configured on the server.\nGuardians: ${guardians.map(g => g.name).join(', ')}`;
      }
      alert(alertMsg);
      fetchData();
    } catch (error) {
      console.error('SOS API Call Error:', error);
      alert('SOS logged, but background notifications failed: ' + error.message);
      fetchData();
    } finally {
      setSosLoading(false);
    }
  };

  const handleDeleteGuardian = async (guardianId) => {
    const confirmed = window.confirm("Are you sure you want to remove this emergency contact?");
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('emergency_contacts')
        .delete()
        .eq('id', guardianId);

      if (error) throw error;
      alert('Contact removed successfully.');
      fetchData();
    } catch (error) {
      console.error('Error deleting guardian:', error);
      alert('Error deleting guardian: ' + error.message);
    }
  };

 return (
 <div className="p-8 max-w-5xl mx-auto">
 <div className="mb-10 flex flex-col sm:flex-row justify-between items-start gap-4">
 <div>
 <h1 className="text-3xl font-bold text-slate-900">Emergency SOS</h1>
 <p className="text-slate-500 mt-1">Instantly notify your guardians and medical services.</p>
 </div>
 <div className="px-4 py-2 bg-emerald-100 text-emerald-600 rounded-full flex items-center gap-2 font-bold text-sm border border-emerald-200 ">
 <div className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
 Location Live
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
  <Card className="lg:col-span-2 p-10 flex flex-col items-center justify-center text-center border-red-100 bg-red-50/30 select-none">
  <button 
  onMouseDown={() => setIsHolding(true)}
  onMouseUp={() => setIsHolding(false)}
  onMouseLeave={() => setIsHolding(false)}
  onTouchStart={() => setIsHolding(true)}
  onTouchEnd={() => setIsHolding(false)}
  disabled={sosLoading}
  className={`w-56 h-56 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-95 relative outline-none ${
  sosLoading ? 'bg-slate-400 cursor-not-allowed' : isHolding ? 'bg-red-600' : 'bg-red-500 hover:bg-red-600 shadow-red-500/40'
  }`}
  >
  {sosLoading ? (
  <Loader2 className="w-16 h-16 text-white animate-spin" />
  ) : (
  <div className="w-48 h-48 rounded-full border-4 border-white/30 flex items-center justify-center">
  <ShieldAlert size={100} color="#fff" />
  </div>
  )}
  {/* Progress SVG Overlay */}
  {!sosLoading && isHolding && (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <svg className="w-56 h-56 transform -rotate-90">
        <circle
          cx="112"
          cy="112"
          r="108"
          stroke="rgba(255, 255, 255, 0.4)"
          strokeWidth="6"
          fill="transparent"
        />
        <circle
          cx="112"
          cy="112"
          r="108"
          stroke="#ffffff"
          strokeWidth="6"
          fill="transparent"
          strokeDasharray={2 * Math.PI * 108}
          strokeDashoffset={2 * Math.PI * 108 * (1 - holdProgress / 100)}
          className="transition-all duration-75 ease-out"
        />
      </svg>
    </div>
  )}
  </button>
  <h2 className="text-2xl font-black text-red-600 mt-8 uppercase tracking-tighter min-h-[36px]">
  {sosLoading ? 'Sending Alerts...' : isHolding ? `Hold for ${((3000 - (holdProgress * 30)) / 1000).toFixed(1)}s` : 'Press & Hold SOS'}
  </h2>
  <p className="text-red-700/60 mt-2 font-medium">Hold the button for 3 seconds to trigger emergency help.</p>
  </Card>

 <div className="space-y-6">
 <Card className="relative overflow-hidden">
 <div className="flex justify-between items-center mb-4">
 <h3 className="font-bold flex items-center gap-2 text-slate-900">
 <Users className="w-5 h-5 text-primary" />
 Guardians
 </h3>
 <Button 
 variant="outline" 
 size="sm" 
 className="rounded-xl px-3 py-1 h-8 gap-1 text-xs"
 onClick={() => setIsModalOpen(true)}
 >
 <Plus className="w-3 h-3" /> Add
 </Button>
 </div>
 
 <div className="space-y-3">
 {loading ? (
 <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
  ) : guardians.length > 0 ? guardians.map((g) => (
  <div key={g.id} className="p-4 rounded-xl bg-white border border-slate-100 shadow-sm flex flex-col gap-3 relative">
    {/* Top Row: Info & Delete */}
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold uppercase shrink-0">
          {g.name.slice(0, 2)}
        </div>
        <div>
          <h4 className="font-bold text-sm text-slate-900">{g.name}</h4>
          <p className="text-[10px] text-slate-500">{g.relationship}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{g.phone_number}</p>
        </div>
      </div>
      <button onClick={() => handleDeleteGuardian(g.id)} title="Delete Guardian" className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer border-none outline-none">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>

    {/* Bottom Row: Communication Actions */}
    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-50">
      <a href={`tel:${g.phone_number}`} className="flex items-center justify-center gap-1.5 py-2 text-xs font-medium bg-slate-50 text-slate-700 hover:bg-slate-100 rounded-lg transition-all text-center">
        <Phone className="w-3.5 h-3.5" /> Call
      </a>
      <a href={`https://wa.me/${g.phone_number}?text=${encodeURIComponent(`EMERGENCY ALERT: ${user?.user_metadata?.full_name || 'User'} has activated their AuraHealth SOS. Please check on them immediately!`)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 py-2 text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-all text-center">
        <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
      </a>
      <a href={`sms:${g.phone_number}?body=${encodeURIComponent(`EMERGENCY ALERT: Please check on me immediately!`)}`} className="flex items-center justify-center gap-1.5 py-2 text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-all text-center">
        <MessageSquare className="w-3.5 h-3.5" /> SMS
      </a>
    </div>
  </div>
  )) : (
 <p className="text-sm text-slate-400 text-center py-6">No guardians added yet.</p>
 )}
 </div>
 </Card>

 <Card>
 <CardHeader title="Nearby Hospitals" icon={MapPin} />
 <div className="space-y-3">
 <div className="p-4 rounded-xl bg-white border border-slate-100">
 <h4 className="font-bold text-sm text-slate-900">City General Hospital</h4>
 <p className="text-[10px] text-slate-500 mt-0.5">1.2 km away • Emergency 24/7</p>
 <Button variant="outline" size="sm" className="mt-3 w-full rounded-xl text-[10px] h-8">Navigate</Button>
 </div>
 </div>
 </Card>
 </div>
 </div>

 <div className="mt-12">
 <h2 className="text-xl font-bold mb-6 text-slate-900">Recent Alerts</h2>
 {recentAlerts.length > 0 ? (
 <div className="space-y-4">
 {recentAlerts.map((alert) => (
 <div key={alert.id} className="p-5 rounded-xl bg-white border border-slate-100 flex items-center justify-between shadow-sm">
 <div className="flex items-center gap-4">
 <div className="p-3 bg-red-100 rounded-xl text-red-600">
 <History className="w-5 h-5" />
 </div>
 <div>
 <p className="font-bold text-slate-900 text-sm">{alert.content}</p>
 <p className="text-xs text-slate-500 mt-0.5">
 {new Date(alert.created_at).toLocaleString()} • Location: Home
 </p>
 </div>
 </div>
 <div className="px-3 py-1 bg-slate-100 text-slate-600 text-slate-500 rounded-full text-[10px] font-bold">Logged</div>
 </div>
 ))}
 </div>
 ) : (
 <p className="text-slate-400 italic">No recent emergency alerts.</p>
 )}
 </div>

 <AddGuardianModal 
 isOpen={isModalOpen} 
 onClose={() => setIsModalOpen(false)} 
 onSave={fetchData} 
 />
 </div>
 );
};

export default EmergencySOS;





