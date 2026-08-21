import React, { useState, useEffect } from 'react';
import { Search, User, Calendar, MessageSquare, MessageCircle, Clock, ArrowRight } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';

const DoctorPatients = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('active'); // active / completed

  useEffect(() => {
    const fetchAppointments = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select('*, profiles:user_id(full_name, email, phone_number)')
          .eq('doctor_id', user.id)
          .order('appointment_date', { ascending: false });

        if (data) setAppointments(data);
      } catch (err) {
        console.error('Error fetching appointments:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();

    const channel = supabase
      .channel('realtime:doctor_patients')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        () => {
          fetchAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Filter based on active vs completed
  const activeCases = appointments.filter(a => a.status === 'accepted' || a.status === 'scheduled');
  const completedCases = appointments.filter(a => a.status === 'completed');

  const currentList = activeTab === 'active' ? activeCases : completedCases;

  const filteredList = currentList.filter(appt => {
    const name = appt.profiles?.full_name || 'Anonymous';
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Patient Directory</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">View and manage your patient records and consultation history.</p>
        </div>

        {/* Active vs Completed Tabs */}
        <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl shrink-0 border border-slate-200/50 dark:border-zinc-700/50">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'active' 
                ? 'bg-white dark:bg-zinc-900 text-primary shadow-sm' 
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Active ({activeCases.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'completed' 
                ? 'bg-white dark:bg-zinc-900 text-primary shadow-sm' 
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            Completed ({completedCases.length})
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="flex gap-4 items-center bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-100 dark:border-zinc-800 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text"
            placeholder={activeTab === 'active' ? "Search active patients..." : "Search completed history..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border-none focus:ring-2 focus:ring-primary/20 outline-none transition-all text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Patients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="h-60 rounded-xl bg-slate-100 dark:bg-zinc-800 animate-pulse" />)
        ) : filteredList.length > 0 ? (
          filteredList.map((appt) => {
            const patientName = appt.profiles?.full_name || 'Anonymous Patient';
            const email = appt.profiles?.email || 'No email';
            const phone = appt.profiles?.phone_number || 'No phone';

            return (
              <Card key={appt.id} className="group hover:border-primary/30 transition-all flex flex-col justify-between h-full bg-white dark:bg-zinc-900 border-slate-100 dark:border-zinc-800">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                      {patientName.charAt(0)}
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                      appt.status === 'completed' 
                        ? 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30' 
                        : 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30'
                    }`}>
                      {appt.status}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold mb-1 text-slate-900 dark:text-white truncate">{patientName}</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 truncate">{email} • {phone}</p>
                  
                  {/* Case Notes */}
                  <div className="mb-6 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chief Complaint</span>
                    {appt.notes ? (
                      <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-zinc-950 p-3 rounded-lg border border-slate-100 dark:border-zinc-800/80 italic line-clamp-2">
                        "{appt.notes}"
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No notes provided</p>
                    )}
                  </div>
                </div>

                <div className="space-y-4 mt-auto">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>Appt: {appt.appointment_date ? new Date(appt.appointment_date).toLocaleDateString() : 'N/A'} at {appt.appointment_date ? new Date(appt.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                  </div>

                  {activeTab === 'active' ? (
                    <Button 
                      variant="primary" 
                      className="w-full rounded-xl group-hover:bg-primary group-hover:text-white transition-all gap-2 py-3 font-bold"
                      onClick={() => navigate(`/chat/${appt.id}`)}
                    >
                      <MessageCircle className="w-4 h-4" />
                      Chat Now
                      <ArrowRight className="w-4 h-4 ml-auto" />
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="w-full rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all gap-2 py-3 border-slate-200 dark:border-zinc-700 font-bold"
                      onClick={() => navigate(`/chat/${appt.id}`)}
                    >
                      <Clock className="w-4 h-4" />
                      View Chat History
                      <ArrowRight className="w-4 h-4 ml-auto" />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full py-20 text-center bg-white dark:bg-zinc-900 border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-[2.5rem]">
            <User className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-zinc-700" />
            <p className="font-bold text-slate-600 dark:text-slate-400">No patients found</p>
            <p className="text-sm text-slate-400">There are no consultations matching this filter.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorPatients;
