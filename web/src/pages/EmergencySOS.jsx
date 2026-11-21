import React, { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, MapPin, Phone, Users, History, AlertCircle, Plus, Loader2, MessageSquare, MessageCircle, Trash2, HeartPulse, Activity } from 'lucide-react';
import { useSelector } from 'react-redux';
import { Card, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';
import { fetchApiWithFallback } from '../lib/api';
import AddGuardianModal from '../components/AddGuardianModal';

const EmergencySOS = () => {
  const { user } = useSelector((state) => state.auth);
  const [guardians, setGuardians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [hospitalsLoading, setHospitalsLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [activeTab, setActiveTab] = useState('sos');

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

  const fetchNearbyHospitals = useCallback(async (lat, lng) => {
    setHospitalsLoading(true);
    setLocationError(null);
    try {
      const d = 0.072; // approx 8km bounding box delta (8 / 111 = 0.072)
      const left = lng - d;
      const right = lng + d;
      const top = lat + d;
      const bottom = lat - d;

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=hospital&format=json&viewbox=${left},${top},${right},${bottom}&bounded=1&limit=50&accept-language=en`
      );
      
      if (!response.ok) throw new Error('Nominatim query failed');
      const data = await response.json();
      
      const getDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
      };

      const mapped = (data || []).map(item => {
        const name = item.name || item.display_name.split(',')[0] || 'Hospital';
        const addressParts = item.display_name.split(',');
        const address = addressParts.length > 1 ? addressParts.slice(1).join(',').trim() : item.display_name;
        
        const hLat = parseFloat(item.lat);
        const hLng = parseFloat(item.lon);
        const dist = !isNaN(hLat) && !isNaN(hLng) ? getDistance(lat, lng, hLat, hLng) : null;

        return {
          id: item.place_id || Math.random().toString(),
          name,
          address: address || 'Address details pending',
          distance: dist ? `${dist.toFixed(1)} km away` : 'Nearby',
          rawDistance: dist || 99999,
          mapsUrl: !isNaN(hLat) && !isNaN(hLng) ? `https://google.com/maps?q=${hLat},${hLng}` : null
        };
      })
      .filter(h => h.rawDistance <= 8.0) // Strictly within 8 km
      .sort((a, b) => a.rawDistance - b.rawDistance)
      .slice(0, 5);

      setHospitals(mapped);
    } catch (error) {
      console.error('Error fetching hospitals:', error);
      setLocationError('Failed to load nearby hospitals.');
    } finally {
      setHospitalsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    const sosChannel = supabase
      .channel('realtime:emergency_sos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_contacts' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'insights' }, () => {
        fetchData();
      })
      .subscribe();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          fetchNearbyHospitals(latitude, longitude);
        },
        (error) => {
          console.error("Geolocation error:", error);
          setLocationError("Location access denied. Enable location to find nearby hospitals.");
        }
      );
    } else {
      setLocationError("Geolocation is not supported by your browser.");
    }

    return () => {
      supabase.removeChannel(sosChannel);
    };
  }, [fetchData, fetchNearbyHospitals]);

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
      const data = await fetchApiWithFallback('/sos/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          location: loc
        })
      });

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
    <div className="p-10 max-w-7xl mx-auto space-y-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-slate-200/50 dark:border-zinc-800/50 pb-8">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <HeartPulse className="w-9 h-9 text-red-500 animate-pulse" />
            Emergency SOS
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-2 font-medium">Instantly alert your trusted guardians and locate nearby emergency care facilities.</p>
        </div>
        <div className="px-4 py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center gap-2 font-black text-xs border border-emerald-500/20 shadow-sm shadow-emerald-500/5 animate-pulse">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          Location Live & Active
        </div>
      </div>

      {/* Sliding Tabs Switch */}
      <div className="relative flex p-1.5 bg-slate-100/80 dark:bg-zinc-800/80 backdrop-blur-md rounded-2xl w-full max-w-xl border border-slate-200/40 dark:border-zinc-700/40 shadow-inner">
        <div 
          className={`absolute top-1.5 bottom-1.5 left-1.5 rounded-xl bg-white dark:bg-zinc-900 shadow-md transition-all duration-300 ease-out ${
            activeTab === 'sos' 
              ? 'w-[calc(33.33%-4px)] translate-x-0' 
              : activeTab === 'hospitals' 
              ? 'w-[calc(33.33%-4px)] translate-x-full' 
              : 'w-[calc(33.33%-4px)] translate-x-[200%]'
          }`}
        />
        <button
          onClick={() => setActiveTab('sos')}
          className={`relative z-10 flex-1 py-3 text-center text-xs font-black transition-colors duration-300 rounded-xl flex items-center justify-center gap-2 ${
            activeTab === 'sos' 
              ? 'text-primary dark:text-white' 
              : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          Emergency SOS
        </button>
        <button
          onClick={() => setActiveTab('hospitals')}
          className={`relative z-10 flex-1 py-3 text-center text-xs font-black transition-colors duration-300 rounded-xl flex items-center justify-center gap-2 ${
            activeTab === 'hospitals' 
              ? 'text-primary dark:text-white' 
              : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
          }`}
        >
          <MapPin className="w-4 h-4" />
          Nearby Hospitals
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`relative z-10 flex-1 py-3 text-center text-xs font-black transition-colors duration-300 rounded-xl flex items-center justify-center gap-2 ${
            activeTab === 'logs' 
              ? 'text-primary dark:text-white' 
              : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
          }`}
        >
          <History className="w-4 h-4" />
          Recent Logs
        </button>
      </div>

      {/* Tab Content Panel */}
      <div className="pt-2">
        {activeTab === 'sos' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: SOS Card */}
            <div className="lg:col-span-2 space-y-8">
              {/* SOS Trigger Card */}
              <Card className="relative overflow-hidden p-8 border-rose-100/50 dark:border-rose-950/20 bg-rose-50/10 dark:bg-rose-950/5 shadow-2xl shadow-rose-500/5 hover:border-rose-200 dark:hover:border-rose-900/30 animate-fade-in">
                {/* Absolute radial glow behind button */}
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-red-500/10 dark:bg-red-500/5 blur-3xl pointer-events-none transition-all duration-700 scale-100 opacity-40`} />
                
                <div className="relative z-10 flex flex-col items-center justify-center py-10">
                  <button 
                    onDoubleClick={() => handleTriggerSOS()}
                    disabled={sosLoading}
                    className={`relative w-64 h-64 rounded-full flex items-center justify-center transition-all duration-300 outline-none select-none ${
                      sosLoading ? 'cursor-not-allowed scale-95' : 'active:scale-95 hover:shadow-red-500/20'
                    }`}
                  >
                    {/* Background Ring Auras */}
                    <div className={`absolute inset-0 rounded-full border-2 border-red-500/10 dark:border-red-500/20 transition-transform duration-700 animate-ping opacity-25`} />
                    <div className={`absolute inset-4 rounded-full border-2 border-red-500/20 dark:border-red-500/30 transition-all duration-300`} />
                    
                    {/* Main Glowing Circle Button */}
                    <div className={`w-48 h-48 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-300 relative border-[8px] border-white dark:border-zinc-950 ${
                      sosLoading 
                        ? 'bg-slate-400 dark:bg-zinc-700 shadow-none' 
                        : 'bg-gradient-to-tr from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 shadow-red-500/45 hover:shadow-red-500/60'
                    }`}>
                      {sosLoading ? (
                        <Loader2 className="w-14 h-14 text-white animate-spin" />
                      ) : (
                        <ShieldAlert size={72} className="text-white drop-shadow-lg" />
                      )}
                    </div>
                  </button>

                  <h2 className="text-3xl font-black text-slate-800 dark:text-white mt-10 tracking-tight text-center">
                    {sosLoading ? 'Sending Emergency Alerts...' : 'Double Click to Trigger'}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-zinc-400 mt-3 text-center max-w-md font-medium leading-relaxed">
                    Double click the button. Guardians will receive your location link instantly.
                  </p>
                </div>
              </Card>
            </div>

            {/* Right Column: Guardians */}
            <div className="lg:col-span-1 space-y-8">
              <Card className="relative overflow-hidden p-8 animate-fade-in">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-black flex items-center gap-2 text-slate-900 dark:text-white text-lg">
                    <Users className="w-5 h-5 text-primary" />
                    Trusted Guardians
                  </h3>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="rounded-xl px-4 py-1.5 h-9 gap-1.5 text-xs font-bold hover:bg-slate-50 border-slate-200 dark:border-zinc-700 shadow-sm"
                    onClick={() => setIsModalOpen(true)}
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </Button>
                </div>
                
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                  {loading ? (
                    <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-355" /></div>
                  ) : guardians.length > 0 ? guardians.map((g) => (
                    <div key={g.id} className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 shadow-sm flex flex-col gap-4 relative hover:border-slate-200 dark:hover:border-zinc-700 transition-all">
                      {/* Avatar, Info & Delete */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-primary/10 dark:bg-primary/5 text-primary dark:text-primary-400 border border-primary/20 flex items-center justify-center font-black text-sm uppercase shrink-0 shadow-inner">
                            {g.name.slice(0, 2)}
                          </div>
                          <div>
                            <h4 className="font-black text-sm text-slate-900 dark:text-white leading-tight">{g.name}</h4>
                            <span className="inline-block px-2 py-0.5 bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 text-[9px] font-black uppercase rounded mt-1">
                              {g.relationship}
                            </span>
                            <p className="text-[10px] text-slate-450 dark:text-zinc-550 mt-1 font-semibold">{g.phone_number}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDeleteGuardian(g.id)} 
                          title="Delete Guardian" 
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all cursor-pointer border-none outline-none"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Communication Actions */}
                      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 dark:border-zinc-800/80">
                        <a 
                          href={`tel:${g.phone_number}`} 
                          className="flex items-center justify-center gap-1.5 py-2 bg-slate-50 dark:bg-zinc-850 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200/50 dark:border-zinc-700/50 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-300 transition-all text-center shadow-inner"
                        >
                          <Phone className="w-3.5 h-3.5" /> Call
                        </a>
                        <a 
                          href={`https://wa.me/${g.phone_number}?text=${encodeURIComponent(`EMERGENCY ALERT: ${user?.user_metadata?.full_name || 'User'} has activated their AuraHealth SOS. Please check on them immediately!`)}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex items-center justify-center gap-1.5 py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-500 border border-emerald-500/20 hover:border-transparent rounded-xl text-xs font-bold transition-all text-center shadow-sm"
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                        </a>
                        <a 
                          href={`sms:${g.phone_number}?body=${encodeURIComponent(`EMERGENCY ALERT: Please check on me immediately!`)}`} 
                          className="flex items-center justify-center gap-1.5 py-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white dark:hover:bg-blue-500 border border-blue-500/20 hover:border-transparent rounded-xl text-xs font-bold transition-all text-center shadow-sm"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> SMS
                        </a>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-10 bg-slate-50 dark:bg-zinc-900/50 rounded-2xl border border-slate-100 dark:border-zinc-800">
                      <p className="text-sm font-semibold text-slate-400 dark:text-zinc-555">No emergency contacts added.</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'hospitals' && (
          <Card className="p-8 w-full animate-fade-in">
            <CardHeader title="Nearby Hospitals (8km Radius)" subtitle="Calculated from your live position" icon={MapPin} />
            
            <div className="space-y-4">
              {hospitalsLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="text-sm font-semibold text-slate-400 dark:text-zinc-500">Locating coordinates & searching facilities...</span>
                </div>
              ) : locationError ? (
                <div className="p-6 text-center text-sm text-slate-500 bg-slate-50 dark:bg-zinc-900/50 rounded-2xl flex flex-col gap-3 items-center border border-slate-100 dark:border-zinc-800">
                  <AlertCircle className="w-8 h-8 text-slate-400" />
                  <span className="font-bold">{locationError}</span>
                </div>
              ) : hospitals.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                  {hospitals.map((hospital) => (
                    <div key={hospital.id} className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 shadow-sm flex flex-col justify-between gap-5 hover:border-primary/40 dark:hover:border-primary/40 hover:shadow-md transition-all duration-200 group">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-black text-slate-900 dark:text-white leading-snug group-hover:text-primary transition-colors text-sm">{hospital.name}</h4>
                          <span className="px-2.5 py-1 bg-primary/10 dark:bg-zinc-800 text-primary dark:text-primary-400 text-[10px] font-black rounded-full shrink-0 border border-primary/20">
                            {hospital.distance}
                          </span>
                        </div>
                        {hospital.address && hospital.address !== 'Address details pending' && (
                          <p className="text-[11px] text-slate-450 dark:text-zinc-550 mt-2 line-clamp-2 leading-relaxed" title={hospital.address}>
                            {hospital.address}
                          </p>
                        )}
                        <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase text-rose-500 bg-rose-50 dark:bg-rose-950/20 px-2 py-0.5 rounded-md mt-3 border border-rose-100 dark:border-rose-900/30">
                          Emergency 24/7
                        </span>
                      </div>
                      {hospital.mapsUrl && (
                        <a
                          href={hospital.mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 py-2.5 bg-slate-50 dark:bg-zinc-850 hover:bg-primary hover:text-white dark:hover:bg-primary border border-slate-200/60 dark:border-zinc-700/60 hover:border-transparent rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-300 transition-all shadow-sm"
                        >
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          Navigate
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-sm text-slate-400 bg-slate-50 dark:bg-zinc-900/50 rounded-2xl border border-slate-100 dark:border-zinc-800">
                  No hospitals found within 8 km.
                </div>
              )}
            </div>
          </Card>
        )}

        {activeTab === 'logs' && (
          <Card className="p-8 w-full animate-fade-in">
            <CardHeader title="Recent Alert Log" subtitle="History of triggered emergencies" icon={History} />
            
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
               {recentAlerts.length > 0 ? (
                 recentAlerts.map((alert) => (
                   <div key={alert.id} className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 border-l-4 border-l-red-500 dark:border-l-red-500 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow">
                     <div className="flex items-start gap-4">
                       <div className="p-3 bg-red-100 dark:bg-red-950/20 rounded-xl text-red-650 dark:text-red-400 animate-pulse">
                         <History className="w-5 h-5 shrink-0 animate-spin" style={{ animationDuration: '3s' }} />
                       </div>
                       <div>
                         <p className="font-black text-slate-800 dark:text-white text-sm leading-snug">{alert.content}</p>
                         <p className="text-xs text-slate-450 dark:text-zinc-550 mt-1.5 font-semibold">
                           {new Date(alert.created_at).toLocaleString()} • Dispatch location: Web Portal
                         </p>
                       </div>
                     </div>
                     <div className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 text-slate-650 dark:text-zinc-400 rounded-full text-[10px] font-black uppercase tracking-wider w-fit self-end sm:self-center border border-slate-200/30 dark:border-zinc-700/30">
                       Logged
                     </div>
                   </div>
                 ))
               ) : (
                 <div className="p-8 text-center text-sm text-slate-400 bg-slate-50 dark:bg-zinc-900/50 rounded-2xl border border-slate-100 dark:border-zinc-800">
                   No emergency alerts have been triggered yet.
                 </div>
               )}
            </div>
          </Card>
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




