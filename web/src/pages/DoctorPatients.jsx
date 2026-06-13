import React, { useState, useEffect } from 'react';
import { Search, User, Mail, Calendar, ArrowRight, Filter } from 'lucide-react';
import { useSelector } from 'react-redux';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';

const DoctorPatients = () => {
 const { user } = useSelector((state) => state.auth);
 const [patients, setPatients] = useState([]);
 const [loading, setLoading] = useState(true);
 const [searchTerm, setSearchTerm] = useState('');

 useEffect(() => {
 const fetchPatients = async () => {
 if (!user) return;
 setLoading(true);
 try {
 // Fetch unique patients from appointments
 const { data, error } = await supabase
 .from('appointments')
 .select('user_id, patient_name, appointment_date')
 .eq('doctor_id', user.id)
 .order('appointment_date', { ascending: false });

 if (data) {
 // Unique by user_id
 const uniquePatients = Array.from(new Set(data.map(a => a.user_id)))
 .map(id => {
 const latest = data.find(a => a.user_id === id);
 return {
 id,
 name: latest.patient_name || 'Anonymous Patient',
 lastVisit: new Date(latest.appointment_date).toLocaleDateString(),
 totalVisits: data.filter(a => a.user_id === id).length
 };
 });
 setPatients(uniquePatients);
 }
 } catch (err) {
 console.error('Error fetching patients:', err);
 } finally {
 setLoading(false);
 }
 };

 fetchPatients();
 }, [user]);

 const filteredPatients = patients.filter(p => 
 p.name.toLowerCase().includes(searchTerm.toLowerCase())
 );

 return (
 <div className="p-8 max-w-7xl mx-auto space-y-8">
 <div>
 <h1 className="text-3xl font-bold text-slate-900">Patient Directory</h1>
 <p className="text-slate-500">View and manage your patient records and medical histories.</p>
 </div>

 <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
 <div className="relative flex-1 w-full">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
 <input 
 type="text"
 placeholder="Search patients by name..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-primary/20 outline-none transition-all text-slate-900"
 />
 </div>
 <Button variant="outline" className="rounded-xl gap-2 h-12">
 <Filter className="w-4 h-4" />
 Filter
 </Button>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {loading ? (
 [1,2,3].map(i => <div key={i} className="h-48 rounded-xl bg-slate-100 animate-pulse" />)
 ) : filteredPatients.length > 0 ? (
 filteredPatients.map(p => (
 <Card key={p.id} className="group hover:border-primary/30 transition-all cursor-pointer">
 <div className="flex items-start justify-between mb-4">
 <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xl">
 {p.name.charAt(0)}
 </div>
 <div className="text-right">
 <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Total Visits</span>
 <p className="text-lg font-bold text-primary">{p.totalVisits}</p>
 </div>
 </div>
 <h3 className="text-lg font-bold mb-1">{p.name}</h3>
 <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
 <Calendar className="w-4 h-4" />
 <span>Last visit: {p.lastVisit}</span>
 </div>
 <Button variant="outline" className="w-full rounded-xl group-hover:bg-primary group-hover:text-white transition-all gap-2">
 View History
 <ArrowRight className="w-4 h-4" />
 </Button>
 </Card>
 ))
 ) : (
 <div className="col-span-full py-20 text-center text-slate-400">
 <User className="w-16 h-16 mx-auto mb-4 opacity-10" />
 <p>No patients found matching your search.</p>
 </div>
 )}
 </div>
 </div>
 );
};

export default DoctorPatients;




