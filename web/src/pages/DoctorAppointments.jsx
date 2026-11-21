import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, CheckCircle2, MessageCircle } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';
import { fetchApiWithFallback } from '../lib/api';
import ScheduleAppointmentModal from '../components/ScheduleAppointmentModal';

const DoctorAppointments = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, upcoming, completed
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [selectedPatientModal, setSelectedPatientModal] = useState(null);

  const handleViewPatientDetails = async (appt) => {
    try {
      const data = await fetchApiWithFallback(`/doctors/patient-details/${appt.user_id}`);
      setSelectedPatientModal({
        ...data,
        appointment_date: appt.appointment_date,
        appointmentNotes: appt.notes
      });
    } catch (e) {
      setSelectedPatientModal({
        full_name: appt.profiles?.full_name || appt.patient_name || 'Patient',
        appointment_date: appt.appointment_date,
        appointmentNotes: appt.notes
      });
    }
  };

  useEffect(() => {
    const fetchAppointments = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const res = await fetchApiWithFallback(`/doctors/my-appointments?doctorId=${user.id}`);
        if (res && res.appointments) {
          setAppointments(res.appointments);
        } else {
          const { data: rawAppts, error } = await supabase
            .from('appointments')
            .select('*')
            .eq('doctor_id', user.id)
            .order('appointment_date', { ascending: true });

          if (error) throw error;

          let mergedAppts = rawAppts || [];
          const userIds = [...new Set(mergedAppts.map(a => a.user_id).filter(Boolean))];
          if (userIds.length > 0) {
            const { data: profs } = await supabase
              .from('profiles')
              .select('id, full_name')
              .in('id', userIds);
            
            mergedAppts = mergedAppts.map(a => {
              const p = profs?.find(prof => prof.id === a.user_id);
              return {
                ...a,
                profiles: p ? { full_name: p.full_name } : { full_name: a.patient_name || 'Patient' }
              };
            });
          }
          setAppointments(mergedAppts);
        }
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
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {new Date(appt.appointment_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
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
                      <div className="flex justify-end gap-2 items-center">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl px-3 h-9 text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-100"
                          onClick={() => handleViewPatientDetails(appt)}
                        >
                          View Patient
                        </Button>
                        {appt.status === 'pending' || appt.status === 'scheduled' ? (
                          <div className="flex gap-2">
                            <Button 
                              variant="primary" 
                              size="sm" 
                              className="rounded-xl px-4 h-9 bg-emerald-500 hover:bg-emerald-600 border-none text-white shadow-md font-bold text-xs"
                              onClick={() => handleAcceptClick(appt)}
                            >
                              Accept
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="rounded-xl px-3 h-9 border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs"
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
                              className="rounded-xl px-4 h-9 shadow-md gap-2 font-bold text-xs"
                              onClick={() => navigate(`/chat/${appt.id}`)}
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              Chat
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="rounded-xl border-emerald-100 text-emerald-600 hover:bg-emerald-50 h-9 w-9 p-0 flex items-center justify-center"
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
      
      {/* Patient Details Modal */}
      {selectedPatientModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100 dark:border-zinc-800">
            <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-slate-50 dark:bg-zinc-950">
              <h3 className="font-bold text-xl text-slate-900 dark:text-white">Patient Profile</h3>
              <button 
                onClick={() => setSelectedPatientModal(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-500 flex items-center justify-center font-bold text-lg"
              >
                &times;
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="flex items-center gap-4 border-b border-slate-100 dark:border-zinc-800 pb-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold">
                  {selectedPatientModal.full_name ? selectedPatientModal.full_name.charAt(0) : 'P'}
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white">{selectedPatientModal.full_name}</h4>
                  <p className="text-sm text-slate-500">{selectedPatientModal.email} • {selectedPatientModal.phone_number}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date of Birth</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{selectedPatientModal.dob || 'Not Specified'}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Age</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{selectedPatientModal.age || 'N/A'}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gender</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm capitalize">{selectedPatientModal.gender || 'Not Specified'}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Blood Group</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{selectedPatientModal.blood_group || 'N/A'}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Weight</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{selectedPatientModal.weight_kg ? `${selectedPatientModal.weight_kg} kg` : 'N/A'}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Height</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{selectedPatientModal.height_cm ? `${selectedPatientModal.height_cm} cm` : 'N/A'}</p>
                </div>
                <div className="col-span-2 p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Appointment Sent Date</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                    {selectedPatientModal.appointment_date ? new Date(selectedPatientModal.appointment_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                  </p>
                </div>
                {selectedPatientModal.diseases && (
                  <div className="col-span-2 p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Diseases / Conditions</p>
                    <p className="text-sm text-slate-800 dark:text-slate-200">{selectedPatientModal.diseases}</p>
                  </div>
                )}
                {selectedPatientModal.drugs && (
                  <div className="col-span-2 p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Current Medications</p>
                    <p className="text-sm text-slate-800 dark:text-slate-200">{selectedPatientModal.drugs}</p>
                  </div>
                )}
                {selectedPatientModal.appointmentNotes && (
                  <div className="col-span-2 p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30">
                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-1">Patient Appointment Note</p>
                    <p className="text-sm text-indigo-900 dark:text-indigo-200 italic">"{selectedPatientModal.appointmentNotes}"</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-zinc-800 flex justify-end">
              <Button onClick={() => setSelectedPatientModal(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

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
