import React, { useState, useEffect, useCallback } from 'react';
import { Search, MapPin, Star, Calendar, Video, MessageCircle, Loader2, Users, X, MapPinned, Building2, Award, Clock, StarHalf } from 'lucide-react';
import { useSelector } from 'react-redux';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';

const DoctorCard = ({ doctor, onBook, onViewDetails }) => (
 <Card className="flex flex-col gap-5 group hover:border-primary/50 transition-all duration-300 p-6 rounded-xl bg-white border-slate-100 shadow-sm hover:shadow-xl hover:shadow-primary/5">
 <div className="flex gap-5">
 <div className="w-24 h-24 rounded-xl bg-primary/10 relative overflow-hidden flex items-center justify-center text-primary font-black text-3xl">
 {doctor.name.charAt(0)}
 <div className={`absolute bottom-2 right-2 w-4 h-4 rounded-full border-4 border-white ${doctor.status === 'online' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
 </div>
 <div className="flex-1 py-1">
 <h3 className="font-black text-xl text-slate-900 group-hover:text-primary transition-colors">{doctor.name}</h3>
 <p className="text-sm text-primary font-bold tracking-wide uppercase mt-0.5">{doctor.specialty}</p>
 <div className="flex items-center gap-1.5 mt-2 bg-slate-50 w-fit px-3 py-1 rounded-full border border-slate-100">
 <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
 <span className="text-xs font-black text-slate-900">{doctor.rating}</span>
 <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">({doctor.reviewsCount} Reviews)</span>
 </div>
 </div>
 </div>
 
 <div className="grid grid-cols-2 gap-4 mt-auto">
 <Button 
 variant="outline" 
 className="rounded-xl h-12 text-xs font-bold border-slate-200 border-slate-100 hover:bg-slate-50 :bg-zinc-800"
 onClick={() => onViewDetails(doctor)}
 >
 View Profile
 </Button>
 <Button 
 variant="primary" 
 className="rounded-xl h-12 text-xs font-bold shadow-md gap-2"
 onClick={() => onBook(doctor)}
 >
 <Calendar className="w-4 h-4" />
 Book Now
 </Button>
 </div>
 </Card>
);

const DoctorDetailsModal = ({ doctor, onClose, onBook }) => {
 const { user } = useSelector((state) => state.auth);
 const [reviews, setReviews] = useState([]);
 const [newComment, setNewComment] = useState('');
 const [newRating, setNewRating] = useState(5);
 const [submitting, setSubmitting] = useState(false);

 const fetchReviews = useCallback(async () => {
 const { data } = await supabase
 .from('reviews')
 .select('*')
 .eq('doctor_id', doctor.id)
 .order('created_at', { ascending: false });
 setReviews(data || []);
 }, [doctor.id]);

 useEffect(() => {
 fetchReviews();
 }, [fetchReviews]);

 const handleAddReview = async () => {
 if (!newComment.trim()) return;
 setSubmitting(true);
 try {
 const { error } = await supabase.from('reviews').insert([
 {
 doctor_id: doctor.id,
 patient_id: user.id,
 patient_name: user.user_metadata?.full_name || 'Anonymous Patient',
 rating: newRating,
 comment: newComment
 }
 ]);
 if (!error) {
 setNewComment('');
 fetchReviews();
 }
 } finally {
 setSubmitting(false);
 }
 };

 return (
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
 <div className="bg-white w-full max-w-4xl rounded-xl overflow-hidden shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 flex flex-col md:flex-row h-full max-h-[90vh]">
 
 {/* Left Side: Doctor Info (Scrollable on Mobile, Fixed-ish on Desktop) */}
 <div className="w-full md:w-[45%] bg-white p-8 md:p-10 flex flex-col border-r border-slate-100 overflow-y-auto custom-scrollbar">

 <div className="relative mb-8">
 <div className="w-32 h-32 rounded-xl bg-white flex items-center justify-center text-primary font-black text-5xl shadow-2xl shadow-primary/10">
 {doctor.name.charAt(0)}
 </div>
 <button onClick={onClose} className="md:hidden absolute top-0 right-0 p-3 bg-white rounded-full shadow-lg">
 <X className="w-6 h-6" />
 </button>
 </div>

 <div className="space-y-2 mb-8">
 <h2 className="text-3xl font-black text-slate-900 leading-tight">{doctor.name}</h2>
 <p className="text-primary font-black tracking-widest uppercase text-sm">{doctor.specialty}</p>
 </div>

 <div className="space-y-6 flex-1">
 <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
 <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
 <Award className="w-6 h-6" />
 </div>
 <div>
 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Experience</p>
 <p className="font-bold text-slate-900">{doctor.experience} Years of Practice</p>
 </div>
 </div>

 <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
 <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
 <Building2 className="w-6 h-6" />
 </div>
 <div>
 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Clinic Name</p>
 <p className="font-bold text-slate-900">{doctor.hospital}</p>
 </div>
 </div>

 <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-start gap-4">
 <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
 <MapPinned className="w-6 h-6" />
 </div>
 <div>
 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Location</p>
 <p className="font-bold text-sm leading-relaxed text-slate-900">{doctor.address || 'Location Details Pending'}</p>
 </div>
 </div>
 </div>

 <Button onClick={() => onBook(doctor)} className="mt-8 rounded-[1.5rem] h-16 text-lg font-black shadow-md gap-3">
 <Calendar className="w-6 h-6" />
 Book Appointment
 </Button>
 </div>

 {/* Right Side: Reviews */}
 <div className="flex-1 p-10 flex flex-col relative">
 <button onClick={onClose} className="hidden md:block absolute top-10 right-10 p-2 text-slate-400 hover:text-primary transition-colors">
 <X className="w-8 h-8" />
 </button>

 <div className="mb-8">
 <h3 className="text-2xl font-black text-slate-900 mb-2">Patient Feedback</h3>
 <div className="flex items-center gap-2">
 <div className="flex">
 {[1,2,3,4,5].map(n => <Star key={n} className="w-4 h-4 text-yellow-400 fill-yellow-400" />)}
 </div>
 <span className="text-sm font-bold text-slate-500">Based on {reviews.length} actual visits</span>
 </div>
 </div>

 <div className="flex-1 overflow-y-auto space-y-6 pr-4 mb-8 custom-scrollbar">
 {reviews.length > 0 ? reviews.map(r => (
 <div key={r.id} className="animate-in fade-in slide-in-from-right-4 duration-500">
 <div className="flex justify-between items-center mb-2">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-primary">
 {r.patient_name.charAt(0)}
 </div>
 <span className="font-bold text-sm text-slate-900">{r.patient_name}</span>
 </div>
 <div className="flex gap-0.5">
 {[...Array(r.rating)].map((_, i) => <Star key={i} className="w-3 h-3 text-yellow-400 fill-yellow-400" />)}
 </div>
 </div>
 <p className="text-sm text-slate-600 text-slate-500 leading-relaxed bg-white p-4 rounded-xl border border-slate-100">
 {r.comment}
 </p>
 </div>
 )) : (
 <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
 <MessageCircle className="w-16 h-16 mb-4" />
 <p className="font-bold">Be the first to leave a review</p>
 <p className="text-sm">Help other patients by sharing your experience.</p>
 </div>
 )}
 </div>

 <div className="bg-white p-6 rounded-xl border border-slate-100">
 <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 text-center">Write a Review</p>
 <div className="flex flex-col gap-4">
 <div className="flex justify-center gap-3">
 {[1,2,3,4,5].map(n => (
 <button key={n} onClick={() => setNewRating(n)} className={`transition-transform hover:scale-125 ${newRating >= n ? 'text-yellow-400' : 'text-slate-300'}`}>
 <Star className={`w-8 h-8 ${newRating >= n ? 'fill-current' : ''}`} />
 </button>
 ))}
 </div>
 <div className="flex gap-3">
 <input 
 value={newComment}
 onChange={(e) => setNewComment(e.target.value)}
 placeholder="Tell us about your visit..."
 className="flex-1 bg-white border-none rounded-xl px-6 py-4 text-sm focus:ring-4 focus:ring-primary/10 outline-none transition-all text-slate-900"
 />
 <Button onClick={handleAddReview} disabled={submitting} className="rounded-xl px-8 font-black">
 {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Post'}
 </Button>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
};

const DoctorConnect = () => {
 const { user } = useSelector((state) => state.auth);
 const [doctors, setDoctors] = useState([]);
 const [appointments, setAppointments] = useState([]);
 const [loading, setLoading] = useState(true);
 const [search, setSearch] = useState('');
 const [selectedDoctor, setSelectedDoctor] = useState(null);

 const fetchData = useCallback(async () => {
 if (!user) return;
 setLoading(true);
 try {
 // Fetch data separately to avoid JOIN issues
 const { data: profileData } = await supabase
 .from('profiles')
 .select('*')
 .eq('role', 'doctor');

 const { data: infoData } = await supabase
 .from('doctors')
 .select('*');

 const formattedDoctors = (profileData || []).map(profile => {
 const info = (infoData || []).find(i => i.id === profile.id);
 return {
 id: profile.id,
 name: profile.full_name || 'Dr. Medical Professional',
 specialty: info?.specialty || 'General Physician',
 hospital: info?.hospital_name || 'AuraHealth Clinic',
 address: info?.hospital_address || 'Clinic Address Pending',
 experience: info?.experience_years || 0,
 rating: 4.9,
 reviewsCount: 24,
 status: 'online'
 };
 });

 setDoctors(formattedDoctors);

 const { data: apptData } = await supabase
 .from('appointments')
 .select('*')
 .eq('user_id', user.id)
 .order('appointment_date', { ascending: true });
 setAppointments(apptData || []);
 } catch (error) {
 console.error('Error:', error);
 } finally {
 setLoading(false);
 }
 }, [user]);

 useEffect(() => {
 fetchData();
 }, [fetchData]);

 const handleBookAppointment = async (doctor) => {
 if (!user) return;
 const tomorrow = new Date();
 tomorrow.setDate(tomorrow.getDate() + 1);
 tomorrow.setHours(10, 0, 0, 0);

 try {
 const { error } = await supabase.from('appointments').insert([{
 user_id: user.id,
 doctor_id: doctor.id,
 doctor_name: doctor.name,
 specialization: doctor.specialty,
 appointment_date: tomorrow.toISOString(),
 status: 'scheduled'
 }]);
 if (error) throw error;
 alert(`Successfully booked with ${doctor.name}!`);
 fetchData();
 } catch (err) { console.error(err); }
 };

 const filteredDoctors = doctors.filter(d => 
 d.name.toLowerCase().includes(search.toLowerCase()) || 
 d.specialty.toLowerCase().includes(search.toLowerCase())
 );

 return (
 <div className="p-10 max-w-7xl mx-auto space-y-12">
 <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
 <div>
 <h1 className="text-5xl font-black text-slate-900 tracking-tight">Doctor Connect</h1>
 <p className="text-lg text-slate-500 mt-3 font-medium">Find and consult with top-tier medical specialists.</p>
 </div>
 <div className="relative w-full md:w-96 group">
 <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
 <input 
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 placeholder="Search specialties or names..."
 className="w-full pl-14 pr-6 py-5 rounded-xl border-2 border-slate-100 bg-white focus:ring-8 focus:ring-primary/5 focus:border-primary outline-none transition-all text-slate-900 text-lg font-bold"
 />
 </div>
 </div>

 {loading ? (
 <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-10">
 {[1,2,3].map(i => <div key={i} className="h-64 rounded-xl bg-slate-100 animate-pulse" />)}
 </div>
 ) : (
 <>
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
 {filteredDoctors.length > 0 ? (
 filteredDoctors.map((doc) => (
 <DoctorCard key={doc.id} doctor={doc} onBook={handleBookAppointment} onViewDetails={setSelectedDoctor} />
 ))
 ) : (
 <div className="col-span-full py-20 text-center bg-white rounded-[3.5rem] border-4 border-dashed border-slate-200 border-slate-100">
 <Users className="w-20 h-20 text-slate-200 mx-auto mb-6" />
 <h3 className="text-2xl font-black text-slate-900">No Specialists Found</h3>
 <p className="text-slate-500 mt-2">Try searching for a different specialty or name.</p>
 </div>
 )}
 </div>

 <div className="space-y-8">
 <h2 className="text-3xl font-black text-slate-900 flex items-center gap-4">
 Your Scheduled Visits
 <span className="px-4 py-1 bg-primary/10 text-primary text-sm rounded-full">{appointments.length}</span>
 </h2>
 <div className="grid grid-cols-1 gap-6">
 {appointments.length > 0 ? appointments.map((appt) => (
 <Card key={appt.id} className="flex flex-col md:flex-row items-center justify-between gap-8 p-10 rounded-xl border-slate-100 bg-white bg-white">
 <div className="flex items-center gap-8">
 <div className="p-6 bg-primary/10 rounded-xl text-center min-w-[120px] shadow-inner">
 <span className="block text-primary font-black text-4xl leading-none">{new Date(appt.appointment_date).getDate()}</span>
 <span className="block text-primary text-[12px] uppercase font-black tracking-[0.3em] mt-2 opacity-60">
 {new Date(appt.appointment_date).toLocaleString('default', { month: 'short' })}
 </span>
 </div>
 <div>
 <h4 className="font-black text-2xl text-slate-900">Consultation with {appt.doctor_name}</h4>
 <div className="flex items-center gap-4 mt-2">
 <div className="flex items-center gap-2 text-slate-500 font-bold">
 <Clock className="w-4 h-4" />
 {new Date(appt.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
 </div>
 <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
 <div className="flex items-center gap-2 text-slate-500 font-bold">
 <Video className="w-4 h-4" />
 Tele-Consultation
 </div>
 </div>
 <span className="inline-block mt-4 px-4 py-1.5 bg-emerald-100 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">
 {appt.status}
 </span>
 </div>
 </div>
 <div className="flex gap-4 w-full md:w-auto">
 <Button variant="outline" className="flex-1 md:flex-none rounded-xl h-14 px-10 font-black border-2">Reschedule</Button>
 <Button className="flex-1 md:flex-none rounded-xl h-14 px-10 font-black shadow-md">Join Meeting</Button>
 </div>
 </Card>
 )) : (
 <div className="text-center py-20 bg-white rounded-[3.5rem] border-4 border-dashed border-slate-200 border-slate-100">
 <Calendar className="w-16 h-16 text-slate-200 mx-auto mb-6" />
 <p className="text-xl font-black text-slate-400">No appointments scheduled</p>
 </div>
 )}
 </div>
 </div>
 </>
 )}

 {selectedDoctor && (
 <DoctorDetailsModal 
 doctor={selectedDoctor} 
 onClose={() => setSelectedDoctor(null)} 
 onBook={(doc) => { handleBookAppointment(doc); setSelectedDoctor(null); }}
 />
 )}
 </div>
 );
};

export default DoctorConnect;




