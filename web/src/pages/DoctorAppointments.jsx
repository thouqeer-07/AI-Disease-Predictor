import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, CheckCircle2, MessageCircle } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';
import ScheduleAppointmentModal from '../components/ScheduleAppointmentModal';

const DoctorAppointments = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, upcoming, completed
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState(null);

  useEffect(() => {
    const fetchAppointments = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select('*, profiles:user_id(full_name)')
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

    const channel = supabase
      .channel('realtime:doctor_appointments')
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

  const scheduleAppointment = async (id, dateStr) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: 'accepted',
          appointment_date: dateStr
        })
        .eq('id', id);
      
      if (!error) {
        setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'accepted', appointment_date: dateStr } : a));
      }
    } catch (err) {
      console.error('Error scheduling appointment:', err);
    }
  };

  const handleAcceptClick = (appt) => {
    setSelectedAppt(appt);
    setScheduleModalOpen(true);
  };

  const filtered = appointments.filter(a => {
    if (filter === 'upcoming') return a.status === 'pending' || a.status === 'accepted' || a.status === 'scheduled';
    if (filter === 'completed') return a.status === 'completed';
    return true;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Appointments</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage your consultation schedule and patient requests.</p>
        </div>
        <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl">
          {['all', 'upcoming', 'completed'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all capitalize cursor-pointer ${
                filter === f ? 'bg-white dark:bg-zinc-900 text-primary shadow-sm' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <Card className="p-0 overflow-hidden border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white dark:bg-zinc-900 border-b border-slate-100 dark:border-zinc-800">
              <tr>
                <th className="p-6 text-xs font-bold uppercase tracking-wider text-slate-400">Patient</th>
                <th className="p-6 text-xs font-bold uppercase tracking-wider text-slate-400">Details & Notes</th>
                <th className="p-6 text-xs font-bold uppercase tracking-wider text-slate-400">Date & Time</th>
                <th className="p-6 text-xs font-bold uppercase tracking-wider text-slate-400">Status</th>
                <th className="p-6 text-xs font-bold uppercase tracking-wider text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
              {loading ? (
                [1,2,3].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan="5" className="p-8 h-20 bg-slate-50/30 dark:bg-zinc-900/30"></td>
                  </tr>
                ))
              ) : filtered.length > 0 ? (
                filtered.map((appt) => (
                  <tr key={appt.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-all">
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                          {(appt.profiles?.full_name || 'P').charAt(0)}
                        </div>
                        <p className="font-bold text-slate-900 dark:text-white">{appt.profiles?.full_name || 'Anonymous'}</p>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex flex-col gap-1 max-w-xs">
                        <span className="text-xs text-primary font-bold uppercase tracking-wide">{appt.specialization || 'Consultation'}</span>
                        {appt.notes ? (
                          <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-zinc-950 p-3 rounded-lg border border-slate-100 dark:border-zinc-800/80 italic break-words">
                            "{appt.notes}"
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No note provided</span>
                        )}
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex flex-col text-slate-900 dark:text-white">
                        <span className="font-medium">{new Date(appt.appointment_date).toLocaleDateString()}</span>
                        <span className="text-sm text-slate-500 dark:text-slate-400">{new Date(appt.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        appt.status === 'completed' ? 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30' :
                        appt.status === 'rejected' ? 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30' :
                        appt.status === 'accepted' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30' :
                        appt.status === 'cancelled' ? 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700' :
                        'bg-amber-50 text-amber-600 border-amber-100 animate-pulse dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30'
                      }`}>
                        {appt.status}
                      </span>
                    </td>
                    <td className="p-6 text-right">
                      <div className="flex justify-end gap-3">
                        {appt.status === 'pending' || appt.status === 'scheduled' ? (
                          <div className="flex gap-2">
                            <Button 
                              variant="primary" 
                              size="sm" 
                              className="rounded-xl px-4 h-10 bg-emerald-500 hover:bg-emerald-600 border-none text-white shadow-md font-bold"
                              onClick={() => handleAcceptClick(appt)}
                            >
                              Accept
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="rounded-xl px-4 h-10 border border-rose-200 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-bold"
                              onClick={() => updateStatus(appt.id, 'rejected')}
                            >
                              Reject
                            </Button>
                          </div>
                        ) : appt.status === 'accepted' ? (
                          <>
                            <Button 
                              variant="primary" 
                              size="sm" 
                              className="rounded-xl px-6 h-10 shadow-md gap-2 font-bold"
                              onClick={() => navigate(`/chat/${appt.id}`)}
                            >
                              <MessageCircle className="w-4 h-4" />
                              Chat
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="rounded-xl border-emerald-100 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 h-10 w-10 p-0 flex items-center justify-center"
                              onClick={() => updateStatus(appt.id, 'completed')}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400 italic">None</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="p-20 text-center text-slate-400">
                    <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-10" />
                    <p>No appointments found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <ScheduleAppointmentModal
        isOpen={scheduleModalOpen}
        onClose={() => {
          setScheduleModalOpen(false);
          setSelectedAppt(null);
        }}
        appointment={selectedAppt}
        onConfirm={scheduleAppointment}
      />
    </div>
  );
};

export default DoctorAppointments;
