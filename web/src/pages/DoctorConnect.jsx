import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Star, Calendar, Video, MessageCircle, Loader2, Users, X, MapPinned, Building2, Award, Clock, User, BookOpen } from 'lucide-react';
import { useSelector } from 'react-redux';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';
import { fetchApiWithFallback } from '../lib/api';

// Status badge styling config
const statusBadgeConfig = {
  none: { text: 'No Request Sent', classes: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700' },
  pending: { text: 'Pending Approval', classes: 'bg-amber-50 text-amber-600 border-amber-100 animate-pulse dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30' },
  accepted: { text: 'Accepted', classes: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30' },
  rejected: { text: 'Rejected', classes: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30' },
  completed: { text: 'Completed', classes: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30' }
};

const DoctorCard = ({ doctor, onBook, onViewDetails, apptInfo, navigate }) => {
  const status = apptInfo?.status || 'none';

  return (
    <Card className="flex flex-col gap-5 group hover:border-primary/50 transition-all duration-300 p-6 rounded-xl bg-white dark:bg-zinc-900 border-slate-100 dark:border-zinc-800 shadow-sm hover:shadow-xl hover:shadow-primary/5">
      <div className="flex gap-5">
        <div className="w-24 h-24 rounded-xl bg-primary/10 relative overflow-hidden flex items-center justify-center text-primary font-black text-3xl shrink-0">
          {doctor.name.charAt(0)}
          <div className={`absolute bottom-2 right-2 w-4 h-4 rounded-full border-4 border-white dark:border-zinc-900 ${doctor.status === 'online' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
        </div>
        <div className="flex-1 py-1 min-w-0">
          <h3 className="font-black text-xl text-slate-900 dark:text-white group-hover:text-primary transition-colors truncate">{doctor.name}</h3>
          <p className="text-sm text-primary font-bold tracking-wide uppercase mt-0.5">{doctor.specialty}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-zinc-800 px-3 py-1 rounded-full border border-slate-100 dark:border-zinc-700 w-fit">
              <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
              <span className="text-xs font-black text-slate-900 dark:text-white">{doctor.rating}</span>
            </div>
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${statusBadgeConfig[status].classes}`}>
              {statusBadgeConfig[status].text}
            </span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mt-auto">
        <Button 
          variant="outline" 
          className="rounded-xl h-12 text-xs font-bold border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800"
          onClick={() => onViewDetails(doctor)}
        >
          View Profile
        </Button>
        {status === 'pending' ? (
          <Button 
            variant="primary" 
            className="rounded-xl h-12 text-xs font-bold gap-2 opacity-65 cursor-not-allowed bg-amber-500 border-amber-500 hover:bg-amber-500 hover:text-white"
            disabled
          >
            Pending Approval
          </Button>
        ) : status === 'accepted' ? (
          <Button 
            variant="primary" 
            className="rounded-xl h-12 text-xs font-bold shadow-md gap-2 bg-emerald-500 hover:bg-emerald-600 border-none"
            onClick={() => navigate(`/chat/${apptInfo.appt.id}`)}
          >
            <MessageCircle className="w-4 h-4" />
            Chat Now
          </Button>
        ) : (
          <Button 
            variant="primary" 
            className="rounded-xl h-12 text-xs font-bold shadow-md gap-2"
            onClick={() => onBook(doctor)}
          >
            <Calendar className="w-4 h-4" />
            Book Now
          </Button>
        )}
      </div>
    </Card>
  );
};

const DoctorDetailsModal = ({ doctor, onClose, onBook, apptInfo, navigate }) => {
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

  const status = apptInfo?.status || 'none';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-4xl rounded-xl overflow-hidden shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 flex flex-col md:flex-row h-full max-h-[90vh]">
        
        {/* Left Side: Doctor Info */}
        <div className="w-full md:w-[45%] p-8 md:p-10 flex flex-col border-r border-slate-100 dark:border-zinc-800 overflow-y-auto custom-scrollbar bg-white dark:bg-zinc-900">
          <div className="relative mb-8">
            <div className="w-32 h-32 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-5xl shadow-2xl shadow-primary/10">
              {doctor.name.charAt(0)}
            </div>
            <button onClick={onClose} className="md:hidden absolute top-0 right-0 p-3 bg-white dark:bg-zinc-800 rounded-full shadow-lg text-slate-500">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-2 mb-8">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white leading-tight">{doctor.name}</h2>
            <p className="text-primary font-black tracking-widest uppercase text-sm">{doctor.specialty}</p>
          </div>

          <div className="space-y-6 flex-1">
            <div className="p-5 rounded-xl border border-slate-100 dark:border-zinc-800 shadow-sm flex items-center gap-4 bg-slate-50 dark:bg-zinc-800/40">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Specialty</p>
                <p className="font-bold text-slate-900 dark:text-white">{doctor.specialty || 'General'}</p>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-slate-100 dark:border-zinc-800 shadow-sm bg-slate-50 dark:bg-zinc-800/40">
              <div className="flex items-center gap-3 mb-6 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Professional Bio</p>
                  <p className="text-xs text-slate-500 whitespace-pre-wrap">{doctor.bio || 'No biography available.'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 mb-6 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800 mb-1">Education Details</p>
                  {typeof doctor.education === 'object' && doctor.education !== null ? (
                    <div className="grid grid-cols-2 gap-y-2 mt-2">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">University</p>
                        <p className="text-xs font-semibold text-slate-700">{doctor.education.universityName}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">Location</p>
                        <p className="text-xs font-semibold text-slate-700">{doctor.education.collegeLocation}</p>
                      </div>
                      <div className="col-span-2 mt-1">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Duration</p>
                        <p className="text-xs font-semibold text-slate-700">{doctor.education.startYear} - {doctor.education.endYear} ({doctor.education.duration} Years)</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">{doctor.education || 'Not specified'}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-slate-100 dark:border-zinc-800 shadow-sm flex items-center gap-4 bg-slate-50 dark:bg-zinc-800/40">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center text-blue-500">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Clinic Name</p>
                <p className="font-bold text-slate-900 dark:text-white">{doctor.hospital}</p>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-slate-100 dark:border-zinc-800 shadow-sm flex items-start gap-4 bg-slate-50 dark:bg-zinc-800/40">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-500 shrink-0">
                <MapPinned className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Location</p>
                <p className="font-bold text-sm leading-relaxed text-slate-900 dark:text-white">{doctor.address || 'Location Details Pending'}</p>
              </div>
            </div>
          </div>

          {status === 'pending' ? (
            <Button disabled className="mt-8 rounded-[1.5rem] h-16 text-lg font-black gap-3 opacity-65 cursor-not-allowed bg-amber-500 border-amber-500 hover:bg-amber-500">
              Pending Approval
            </Button>
          ) : status === 'accepted' ? (
            <Button onClick={() => { onClose(); navigate(`/chat/${apptInfo.appt.id}`); }} className="mt-8 rounded-[1.5rem] h-16 text-lg font-black shadow-md gap-3 bg-emerald-500 hover:bg-emerald-600 border-none">
              <MessageCircle className="w-6 h-6" />
              Chat Now
            </Button>
          ) : (
            <Button onClick={() => onBook(doctor)} className="mt-8 rounded-[1.5rem] h-16 text-lg font-black shadow-md gap-3">
              <Calendar className="w-6 h-6" />
              Book Appointment
            </Button>
          )}
        </div>

        {/* Right Side: Reviews */}
        <div className="flex-1 p-10 flex flex-col relative overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-zinc-900/50">
          <button onClick={onClose} className="hidden md:block absolute top-10 right-10 p-2 text-slate-400 hover:text-primary transition-colors">
            <X className="w-8 h-8" />
          </button>

          <div className="mb-8">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Patient Feedback</h3>
            <div className="flex items-center gap-2">
              <div className="flex">
                {[1,2,3,4,5].map(n => <Star key={n} className="w-4 h-4 text-yellow-400 fill-yellow-400" />)}
              </div>
              <span className="text-sm font-bold text-slate-500 dark:text-slate-400">Based on {reviews.length} actual visits</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-6 pr-4 mb-8 custom-scrollbar">
            {reviews.length > 0 ? reviews.map(r => (
              <div key={r.id} className="animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-black text-primary">
                      {r.patient_name.charAt(0)}
                    </div>
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{r.patient_name}</span>
                  </div>
                  <div className="flex gap-0.5">
                    {[...Array(r.rating)].map((_, i) => <Star key={i} className="w-3 h-3 text-yellow-400 fill-yellow-400" />)}
                  </div>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-350 leading-relaxed bg-white dark:bg-zinc-950 p-4 rounded-xl border border-slate-100 dark:border-zinc-800">
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

          <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border border-slate-100 dark:border-zinc-800 mt-auto">
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
                  className="flex-1 bg-slate-50 dark:bg-zinc-900 border-none rounded-xl px-6 py-4 text-sm focus:ring-4 focus:ring-primary/10 outline-none transition-all text-slate-900 dark:text-white"
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

// Booking Notes Dialog Modal
const BookingNotesModal = ({ doctor, onClose, onConfirm }) => {
  const [notes, setNotes] = useState('');
  
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-xl overflow-hidden shadow-2xl p-8 space-y-6 animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-zinc-800">
        <div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">Request Appointment</h3>
          <p className="text-slate-500 text-sm mt-1">Consultation with {doctor.name}</p>
        </div>
        
        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-wider text-slate-400">
            Do you have any notes or concerns for the doctor? (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe symptoms, emergencies, special requests, or health concerns..."
            className="w-full h-32 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-slate-900 dark:text-white resize-none shadow-inner"
          />
        </div>
        
        <div className="flex gap-4">
          <Button
            variant="outline"
            className="flex-1 rounded-xl h-12 text-sm font-bold border-slate-200 dark:border-zinc-700"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            className="flex-1 rounded-xl h-12 text-sm font-bold shadow-md"
            onClick={() => onConfirm(notes)}
          >
            Book Now
          </Button>
        </div>
      </div>
    </div>
  );
};

const DoctorConnect = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [bookingDoctor, setBookingDoctor] = useState(null);
  const [activeTab, setActiveTab] = useState('connect');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await fetchApiWithFallback('/doctors/public-profiles');
      if (data.doctors) {
        setDoctors(data.doctors);
      }

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

    const apptChannel = supabase
      .channel('realtime:patient_appointments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(apptChannel);
    };
  }, [fetchData]);

  // Find latest appointment details for a specific doctor
  const getDoctorAppointmentInfo = (doctorId) => {
    const userAppts = appointments.filter(a => a.doctor_id === doctorId);
    if (userAppts.length === 0) return { status: 'none', appt: null };
    
    // Sort to get the latest created appointment
    const latest = userAppts.reduce((latest, current) => {
      return new Date(current.created_at) > new Date(latest.created_at) ? current : latest;
    }, userAppts[0]);
    return { status: latest.status, appt: latest };
  };

  const handleBookAppointment = async (doctor, notes = '') => {
    if (!user) return;
    
    const sentDate = new Date().toISOString();

    try {
      const { error } = await supabase.from('appointments').insert([{
        user_id: user.id,
        doctor_id: doctor.id,
        doctor_name: doctor.name,
        specialization: doctor.specialty,
        appointment_date: sentDate,
        status: 'pending',
        notes: notes.trim() || null
      }]);
      
      if (error) throw error;
      alert(`Booking request submitted to ${doctor.name}!`);
      setBookingDoctor(null);
      fetchData();
    } catch (err) { 
      console.error(err);
      alert('Failed to submit request.');
    }
  };

  const filteredDoctors = doctors.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) || 
    d.specialty.toLowerCase().includes(search.toLowerCase())
  );

  const filteredAppointments = appointments.filter(appt => {
    if (statusFilter === 'all') return true;
    return appt.status === statusFilter;
  });

  const sortedAppointments = [...filteredAppointments].sort((a, b) => {
    if (sortBy === 'date_desc') {
      return new Date(b.appointment_date) - new Date(a.appointment_date);
    }
    if (sortBy === 'date_asc') {
      return new Date(a.appointment_date) - new Date(b.appointment_date);
    }
    if (sortBy === 'completed_first') {
      if (a.status === 'completed' && b.status !== 'completed') return -1;
      if (a.status !== 'completed' && b.status === 'completed') return 1;
      return new Date(b.appointment_date) - new Date(a.appointment_date);
    }
    if (sortBy === 'rejected_first') {
      if (a.status === 'rejected' && b.status !== 'rejected') return -1;
      if (a.status !== 'rejected' && b.status === 'rejected') return 1;
      return new Date(b.appointment_date) - new Date(a.appointment_date);
    }
    return 0;
  });

  return (
    <div className="p-10 max-w-7xl mx-auto space-y-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tight">Doctor Connect</h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 mt-3 font-medium">Find and consult with top-tier medical specialists.</p>
        </div>
        {activeTab === 'connect' && (
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
            <input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search specialties or names..."
              className="w-full pl-14 pr-6 py-5 rounded-xl border-2 border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:ring-8 focus:ring-primary/5 focus:border-primary outline-none transition-all text-slate-900 dark:text-white text-lg font-bold"
            />
          </div>
        )}
      </div>

      {/* Sliding Tabs */}
      <div className="flex justify-start">
        <div className="relative flex p-1.5 bg-slate-100/80 dark:bg-zinc-800/80 backdrop-blur-md rounded-2xl w-full sm:w-[420px] border border-slate-200/50 dark:border-zinc-700/50 shadow-inner">
          <div 
            className={`absolute top-1.5 bottom-1.5 left-1.5 rounded-xl bg-white dark:bg-zinc-900 shadow-md transition-all duration-300 ease-out ${
              activeTab === 'connect' ? 'w-[calc(50%-6px)] translate-x-0' : 'w-[calc(50%-6px)] translate-x-full'
            }`}
          />
          <button
            onClick={() => setActiveTab('connect')}
            className={`relative z-10 flex-1 py-3 text-center text-sm font-black transition-colors duration-300 rounded-xl flex items-center justify-center gap-2 ${
              activeTab === 'connect' 
                ? 'text-primary dark:text-white' 
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Doctor Connect
          </button>
          <button
            onClick={() => setActiveTab('visits')}
            className={`relative z-10 flex-1 py-3 text-center text-sm font-black transition-colors duration-300 rounded-xl flex items-center justify-center gap-2 ${
              activeTab === 'visits' 
                ? 'text-primary dark:text-white' 
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Visited
            {appointments.length > 0 && (
              <span className={`ml-1.5 px-2 py-0.5 text-xs rounded-full transition-colors duration-300 font-bold ${
                activeTab === 'visits' 
                  ? 'bg-primary/10 text-primary dark:bg-zinc-800 dark:text-zinc-200' 
                  : 'bg-slate-200 text-slate-600 dark:bg-zinc-700 dark:text-zinc-400'
              }`}>
                {appointments.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-10">
          {[1,2,3].map(i => <div key={i} className="h-64 rounded-xl bg-slate-100 dark:bg-zinc-800 animate-pulse" />)}
        </div>
      ) : activeTab === 'connect' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredDoctors.length > 0 ? (
            filteredDoctors.map((doc) => {
              const apptInfo = getDoctorAppointmentInfo(doc.id);
              return (
                <DoctorCard 
                  key={doc.id} 
                  doctor={doc} 
                  onBook={setBookingDoctor} 
                  onViewDetails={setSelectedDoctor}
                  apptInfo={apptInfo}
                  navigate={navigate}
                />
              );
            })
          ) : (
            <div className="col-span-full py-20 text-center bg-white dark:bg-zinc-900 rounded-[3.5rem] border-4 border-dashed border-slate-200 dark:border-zinc-800">
              <Users className="w-20 h-20 text-slate-200 dark:text-zinc-700 mx-auto mb-6" />
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">No Specialists Found</h3>
              <p className="text-slate-500 mt-2">Try searching for a different specialty or name.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 dark:border-zinc-800/80 pb-6">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-4">
              Your Scheduled Visits
              <span className="px-4 py-1 bg-primary/10 text-primary text-sm rounded-full">{filteredAppointments.length}</span>
            </h2>
            
            {/* Sort & Filter Controls */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Filter Pills */}
              <div className="flex flex-wrap gap-1.5 bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-xl">
                {[
                  { value: 'all', label: 'All' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'rejected', label: 'Rejected' },
                  { value: 'accepted', label: 'Accepted' },
                  { value: 'pending', label: 'Pending' }
                ].map((pill) => (
                  <button
                    key={pill.value}
                    onClick={() => setStatusFilter(pill.value)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                      statusFilter === pill.value
                        ? 'bg-white dark:bg-zinc-900 text-primary dark:text-white shadow-sm font-black'
                        : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200'
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">Sort</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-slate-50 dark:bg-zinc-900 border-2 border-slate-100 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 dark:text-zinc-350 outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all cursor-pointer"
                >
                  <option value="date_desc">Newest First</option>
                  <option value="date_asc">Oldest First</option>
                  <option value="completed_first">Completed First</option>
                  <option value="rejected_first">Rejected First</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {sortedAppointments.length > 0 ? sortedAppointments.map((appt) => (
              <Card key={appt.id} className="flex flex-col md:flex-row items-center justify-between gap-8 p-10 rounded-xl border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <div className="flex items-center gap-8">
                  <div className="p-6 bg-primary/10 rounded-xl text-center min-w-[120px] shadow-inner">
                    <span className="block text-primary font-black text-4xl leading-none">{new Date(appt.appointment_date).getDate()}</span>
                    <span className="block text-primary text-[12px] uppercase font-black tracking-[0.3em] mt-2 opacity-60">
                      {new Date(appt.appointment_date).toLocaleString('default', { month: 'short' })}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-black text-2xl text-slate-900 dark:text-white">Consultation with {appt.doctor_name}</h4>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-bold">
                        <Clock className="w-4 h-4" />
                        {new Date(appt.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-zinc-700" />
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-bold">
                        <Video className="w-4 h-4" />
                        Tele-Consultation
                      </div>
                    </div>
                    <span className={`inline-block mt-4 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      appt.status === 'accepted' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' :
                      appt.status === 'rejected' ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400' :
                      'bg-amber-100 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400'
                    }`}>
                      {appt.status}
                    </span>
                  </div>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                  {appt.status === 'accepted' ? (
                    <Button onClick={() => navigate(`/chat/${appt.id}`)} className="flex-1 md:flex-none rounded-xl h-14 px-10 font-black shadow-md">Join Chat</Button>
                  ) : (
                    <div className="text-sm font-medium text-slate-400 italic">Waiting for approval to connect chat</div>
                  )}
                </div>
              </Card>
            )) : (
              <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-[3.5rem] border-4 border-dashed border-slate-200 dark:border-zinc-800">
                <Calendar className="w-16 h-16 text-slate-200 dark:text-zinc-700 mx-auto mb-6" />
                <p className="text-xl font-black text-slate-400">No appointments scheduled</p>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedDoctor && (
        <DoctorDetailsModal 
          doctor={selectedDoctor} 
          onClose={() => setSelectedDoctor(null)} 
          onBook={(doc) => { setBookingDoctor(doc); setSelectedDoctor(null); }}
          apptInfo={getDoctorAppointmentInfo(selectedDoctor.id)}
          navigate={navigate}
        />
      )}

      {bookingDoctor && (
        <BookingNotesModal 
          doctor={bookingDoctor}
          onClose={() => setBookingDoctor(null)}
          onConfirm={(notes) => handleBookAppointment(bookingDoctor, notes)}
        />
      )}
    </div>
  );
};

export default DoctorConnect;
