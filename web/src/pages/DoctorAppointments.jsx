import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, CheckCircle2, XCircle, Search, Filter, MoreVertical, MessageCircle } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';

const DoctorAppointments = () => {
 const { user } = useSelector((state) => state.auth);
 const navigate = useNavigate();

 const [appointments, setAppointments] = useState([]);
 const [loading, setLoading] = useState(true);
 const [filter, setFilter] = useState('all'); // all, upcoming, completed

 useEffect(() => {
 const fetchAppointments = async () => {
 if (!user) return;
 setLoading(true);
 try {
 const { data, error } = await supabase
 .from('appointments')
 .select('*')
 .eq('doctor_id', user.id)
 .order('appointment_date', { ascending: true });

 if (data) setAppointments(data);
 } catch (err) {
 console.error('Error fetching appointments:', err);
 } finally {
 setLoading(false);
 }
 };

 fetchAppointments();
 }, [user]);

 const updateStatus = async (id, status) => {
 try {
 const { error } = await supabase
 .from('appointments')
 .update({ status })
 .eq('id', id);
 
 if (!error) {
 setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
 }
 } catch (err) {
 console.error('Error updating status:', err);
 }
 };

 const filtered = appointments.filter(a => {
 if (filter === 'upcoming') return a.status === 'pending' || a.status === 'upcoming';
 if (filter === 'completed') return a.status === 'completed';
 return true;
 });

 return (
 <div className="p-8 max-w-7xl mx-auto space-y-8">
 <div className="flex justify-between items-end">
 <div>
 <h1 className="text-3xl font-bold text-slate-900">Appointments</h1>
 <p className="text-slate-500">Manage your consultation schedule and patient requests.</p>
 </div>
 <div className="flex bg-slate-100 p-1 rounded-xl">
 {['all', 'upcoming', 'completed'].map((f) => (
 <button
 key={f}
 onClick={() => setFilter(f)}
 className={`px-6 py-2 rounded-xl text-sm font-bold transition-all capitalize ${
 filter === f ? 'bg-white text-primary shadow-sm' : 'text-slate-500'
 }`}
 >
 {f}
 </button>
 ))}
 </div>
 </div>

 <Card className="p-0 overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-left border-collapse">
 <thead className="bg-white">
 <tr>
 <th className="p-6 text-xs font-bold uppercase tracking-wider text-slate-400">Patient</th>
 <th className="p-6 text-xs font-bold uppercase tracking-wider text-slate-400">Date & Time</th>
 <th className="p-6 text-xs font-bold uppercase tracking-wider text-slate-400">Status</th>
 <th className="p-6 text-xs font-bold uppercase tracking-wider text-slate-400 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 ">
 {loading ? (
 [1,2,3].map(i => (
 <tr key={i} className="animate-pulse">
 <td colSpan="4" className="p-8 h-20 bg-slate-50/30"></td>
 </tr>
 ))
 ) : filtered.length > 0 ? (
 filtered.map((appt) => (
 <tr key={appt.id} className="hover:bg-slate-50 :bg-zinc-800/50 transition-all">
 <td className="p-6">
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-400 text-sm">
 {appt.patient_name?.charAt(0) || 'P'}
 </div>
 <p className="font-bold">{appt.patient_name || 'Anonymous'}</p>
 </div>
 </td>
 <td className="p-6">
 <div className="flex flex-col">
 <span className="font-medium">{new Date(appt.appointment_date).toLocaleDateString()}</span>
 <span className="text-sm text-slate-500">{new Date(appt.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
 </div>
 </td>
 <td className="p-6">
 <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
 appt.status === 'completed' ? 'bg-emerald-100 text-emerald-600' :
 appt.status === 'cancelled' ? 'bg-red-100 text-red-600' :
 'bg-blue-100 text-blue-600'
 }`}>
 {appt.status}
 </span>
 </td>
 <td className="p-6 text-right">
 <div className="flex justify-end gap-3">
 {appt.status === 'scheduled' || appt.status === 'pending' ? (
 <Button 
 variant="primary" 
 size="sm" 
 className="rounded-xl px-6 h-10 shadow-lg shadow-emerald-500/20 bg-emerald-500 hover:bg-emerald-600 border-none"
 onClick={() => updateStatus(appt.id, 'accepted')}
 >
 Accept
 </Button>
 ) : appt.status === 'accepted' ? (
 <>
 <Button 
 variant="primary" 
 size="sm" 
 className="rounded-xl px-6 h-10 shadow-md gap-2"
 onClick={() => navigate(`/chat/${appt.id}`)}
 >
 <MessageCircle className="w-4 h-4" />
 Chat
 </Button>
 <Button 
 variant="outline" 
 size="sm" 
 className="rounded-xl border-emerald-100 text-emerald-600 hover:bg-emerald-50 h-10 w-10 p-0 flex items-center justify-center"
 onClick={() => updateStatus(appt.id, 'completed')}
 >
 <CheckCircle2 className="w-4 h-4" />
 </Button>
 </>
 ) : null}
 
 <Button variant="outline" size="sm" className="rounded-xl border-slate-100 text-slate-400 h-10 w-10 p-0 flex items-center justify-center">
 <MoreVertical className="w-4 h-4" />
 </Button>
 </div>
 </td>

 </tr>
 ))
 ) : (
 <tr>
 <td colSpan="4" className="p-20 text-center text-slate-400">
 <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-10" />
 <p>No appointments found.</p>
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </Card>
 </div>
 );
};

export default DoctorAppointments;




