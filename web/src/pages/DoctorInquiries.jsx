import React, { useState, useEffect, useCallback } from 'react';
import { Mail, MessageSquare, Search, Filter, ArrowRight, User } from 'lucide-react';
import { useSelector } from 'react-redux';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';

const DoctorInquiries = () => {
 const { user } = useSelector((state) => state.auth);
 const [searchTerm, setSearchTerm] = useState('');
 const [inquiries, setInquiries] = useState([]);
 const [loading, setLoading] = useState(true);
 
 const fetchInquiries = useCallback(async () => {
 if (!user) return;
 setLoading(true);
 try {
 const { data, error } = await supabase
 .from('inquiries')
 .select('*')
 .eq('doctor_id', user.id)
 .order('created_at', { ascending: false });

 if (data) setInquiries(data);
 } catch (err) {
 console.error('Error fetching inquiries:', err);
 } finally {
 setLoading(false);
 }
 }, [user]);

 useEffect(() => {
 fetchInquiries();
 }, [fetchInquiries]);

 const filteredInquiries = inquiries.filter(i => 
 i.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
 i.subject?.toLowerCase().includes(searchTerm.toLowerCase())
 );

 return (
 <div className="p-8 max-w-7xl mx-auto space-y-8">
 <div>
 <h1 className="text-3xl font-bold text-slate-900">Patient Inquiries</h1>
 <p className="text-slate-500">Review and respond to patient questions and consultation requests.</p>
 </div>

 <div className="flex gap-4 items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
 <div className="relative flex-1">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
 <input 
 type="text"
 placeholder="Search inquiries..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-primary/20 outline-none transition-all text-slate-900"
 />
 </div>
 <Button variant="outline" className="rounded-xl gap-2 h-12">
 <Filter className="w-4 h-4" />
 Sort
 </Button>
 </div>

 <div className="space-y-4">
 {loading ? (
 [1,2,3].map(i => <div key={i} className="h-24 rounded-xl bg-slate-100 animate-pulse" />)
 ) : filteredInquiries.length > 0 ? (
 filteredInquiries.map((inquiry) => (
 <Card key={inquiry.id} className="p-0 overflow-hidden hover:border-primary/30 transition-all cursor-pointer group">
 <div className="p-6 flex items-center justify-between">
 <div className="flex items-center gap-4">
 <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
 inquiry.status === 'urgent' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
 }`}>
 {inquiry.patient_name?.charAt(0) || 'P'}
 </div>
 <div>
 <div className="flex items-center gap-2">
 <h3 className="font-bold">{inquiry.patient_name}</h3>
 {inquiry.status === 'urgent' && (
 <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold uppercase tracking-wider">Urgent</span>
 )}
 {inquiry.status === 'new' && (
 <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 text-[10px] font-bold uppercase tracking-wider">New</span>
 )}
 </div>
 <p className="text-sm font-medium text-slate-900">{inquiry.subject}</p>
 <p className="text-xs text-slate-400">{new Date(inquiry.created_at).toLocaleString()}</p>
 </div>
 </div>
 <div className="flex items-center gap-3">
 <Button variant="ghost" className="text-slate-400 group-hover:text-primary transition-colors">
 <ArrowRight className="w-5 h-5" />
 </Button>
 </div>
 </div>
 </Card>
 ))
 ) : (
 <div className="py-20 text-center text-slate-400">
 <Mail className="w-16 h-16 mx-auto mb-4 opacity-10" />
 <p>No pending inquiries at the moment.</p>
 </div>
 )}
 </div>
 </div>
 );
};

export default DoctorInquiries;




