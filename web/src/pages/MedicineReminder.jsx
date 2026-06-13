import React, { useState, useEffect, useCallback } from 'react';
import { Pill, Plus, Clock, CheckCircle2, AlertTriangle, Calendar as CalendarIcon, Loader2, Activity, ArrowRight, Zap } from 'lucide-react';

import { useSelector } from 'react-redux';
import { Card, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';
import AddMedicineModal from '../components/AddMedicineModal';

const MedicineItem = ({ medicine, onUpdate }) => {
 const [loading, setLoading] = useState(false);
 const isTaken = medicine.logs && medicine.logs.some(log => {
 const logDate = new Date(log.taken_at).toDateString();
 const today = new Date().toDateString();
 return logDate === today;
 });

 const handleMarkAsTaken = async () => {
 setLoading(true);
 try {
 const { error } = await supabase.from('medication_logs').insert([
 {
 user_id: medicine.user_id,
 medication_id: medicine.id,
 status: 'taken',
 taken_at: new Date().toISOString()
 }
 ]);

 if (error) throw error;
 
 await supabase.from('medications')
 .update({ stock_count: Math.max(0, medicine.stock_count - 1) })
 .eq('id', medicine.id);

 onUpdate();
 } catch (error) {
 console.error('Error marking as taken:', error.message);
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="flex items-center justify-between p-6 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all group">
 <div className="flex items-center gap-5">
 <div className={`p-4 rounded-xl transition-colors ${isTaken ? 'bg-emerald-100 text-emerald-600' : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white'}`}>
 <Pill className="w-6 h-6" />
 </div>
 <div>
 <h4 className="font-bold text-lg text-slate-900">{medicine.name}</h4>
 <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
 <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {medicine.time.slice(0, 5)}</span>
 <span className="w-1 h-1 rounded-full bg-slate-300" />
 <span>{medicine.dosage}</span>
 </div>
 </div>
 </div>
 <div className="flex items-center gap-3">
 {isTaken ? (
 <div className="bg-emerald-50 px-4 py-2 rounded-xl flex items-center gap-2 text-emerald-600 font-bold text-sm border border-emerald-100 ">
 <CheckCircle2 className="w-4 h-4" />
 Done
 </div>
 ) : (
 <Button 
 variant="primary" 
 size="sm" 
 className="rounded-xl px-6 h-11 text-xs font-bold shadow-md"
 onClick={handleMarkAsTaken}
 disabled={loading}
 >
 {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Mark as Taken'}
 </Button>
 )}
 </div>
 </div>
 );
};

const MedicineReminder = () => {
 const { user } = useSelector((state) => state.auth);
 const [medications, setMedications] = useState([]);
 const [loading, setLoading] = useState(true);
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [streak, setStreak] = useState(0);

 const fetchMedications = useCallback(async () => {
 if (!user) return;
 setLoading(true);

 try {
 const { data, error } = await supabase
 .from('medications')
 .select(`
 *,
 logs:medication_logs(id, taken_at)
 `)
 .eq('user_id', user.id)
 .eq('is_active', true);

 if (error) throw error;
 setMedications(data || []);

 const todayStr = new Date().toDateString();
 const takenTodayCount = data?.filter(m => 
 m.logs?.some(log => new Date(log.taken_at).toDateString() === todayStr)
 ).length;
 
 setStreak(takenTodayCount > 0 ? 1 : 0);
 } catch (error) {
 console.error('Error fetching medications:', error.message);
 } finally {
 setLoading(false);
 }
 }, [user]);

 useEffect(() => {
 fetchMedications();
 }, [fetchMedications]);

 const lowStockMeds = medications.filter(m => m.stock_count <= 5);

 return (
 <div className="p-10 max-w-7xl mx-auto space-y-12">
 <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
 <div>
 <h1 className="text-5xl font-black text-slate-900 tracking-tight">Medicine Reminders</h1>
 <p className="text-lg text-slate-500 mt-3 font-medium">Your personalized medication schedule and health streaks.</p>
 </div>
 <Button className="rounded-xl h-14 px-8 font-black gap-3 shadow-md" onClick={() => setIsModalOpen(true)}>
 <Plus className="w-6 h-6" />
 Add Medicine
 </Button>
 </div>

 {loading ? (
 <div className="flex flex-col items-center justify-center py-32 gap-6">
 <Loader2 className="w-12 h-12 text-primary animate-spin" />
 <p className="text-xl font-bold text-slate-400">Fetching your schedule...</p>
 </div>
 ) : (
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
 <div className="lg:col-span-2 space-y-10">
 <div className="flex items-center justify-between bg-white p-6 rounded-xl border border-slate-100">
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
 <CalendarIcon className="w-6 h-6" />
 </div>
 <h2 className="text-2xl font-black text-slate-900 tracking-tight">Today's Schedule</h2>
 </div>
 <span className="text-sm font-black text-primary bg-white px-5 py-2 rounded-xl shadow-sm border border-slate-100 uppercase tracking-widest">
 {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
 </span>
 </div>
 
 {medications.length > 0 ? (
 <div className="grid grid-cols-1 gap-4">
 {medications.map((med) => (
 <MedicineItem key={med.id} medicine={med} onUpdate={fetchMedications} />
 ))}
 </div>
 ) : (
 <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[3.5rem] border-4 border-dashed border-slate-200 border-slate-100 text-center px-10">
 <div className="relative mb-8">
 <div className="w-24 h-24 bg-white rounded-xl flex items-center justify-center shadow-xl">
 <Pill className="w-12 h-12 text-slate-300" />
 </div>
 <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg border-4 border-slate-50 ">
 <Plus className="w-6 h-6" />
 </div>
 </div>
 <h3 className="text-2xl font-black text-slate-900">No Medicines Tracked</h3>
 <p className="text-slate-500 mt-3 max-w-[320px] font-medium leading-relaxed">
 Start your journey to better health by adding your daily medication schedule.
 </p>
 <Button 
 variant="outline" 
 className="mt-10 rounded-xl h-14 px-10 font-black border-2 hover:bg-primary hover:text-white hover:border-primary transition-all group" 
 onClick={() => setIsModalOpen(true)}
 >
 Start Adding
 <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
 </Button>
 </div>
 )}
 </div>

 <div className="space-y-8">
            <Card className="border-slate-100 rounded-xl p-8 overflow-hidden relative shadow-md">
              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Live Tracking</span>
                </div>
                <div>
                  <p className="text-5xl font-black leading-none text-slate-900">{streak} Day</p>
                  <p className="text-xl font-bold text-slate-500 mt-2">Health Streak!</p>
                </div>
                <p className="text-sm font-medium text-slate-400 leading-relaxed">Consistency is the secret to wellbeing. Keep it going!</p>
              </div>
              <Activity className="absolute -right-8 -bottom-8 w-48 h-48 text-slate-50 -rotate-12" />
            </Card>

 {lowStockMeds.length > 0 && (
 <Card className="p-8 rounded-xl border-2 border-orange-50 ">
 <h3 className="text-lg font-black flex items-center gap-3 text-orange-500 mb-6">
 <AlertTriangle className="w-5 h-5" />
 Refill Alerts
 </h3>
 <div className="space-y-4">
 {lowStockMeds.map(med => (
 <div key={med.id} className="p-5 rounded-xl bg-orange-50 border border-orange-100 group hover:shadow-lg hover:shadow-orange-500/10 transition-all">
 <p className="font-bold text-orange-950 ">{med.name} is low</p>
 <p className="text-xs text-orange-700 mt-1 font-medium">{med.stock_count} doses remaining</p>
 <Button variant="primary" size="sm" className="mt-4 w-full h-10 rounded-xl bg-orange-500 hover:bg-orange-600 text-white border-none font-bold text-xs">
 Order Refill
 </Button>
 </div>
 ))}
 </div>
 </Card>
 )}
 </div>
 </div>
 )}

 <AddMedicineModal 
 isOpen={isModalOpen} 
 onClose={() => setIsModalOpen(false)} 
 onSave={fetchMedications} 
 />
 </div>
 );
};

export default MedicineReminder;




