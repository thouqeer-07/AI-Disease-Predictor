import React, { useState, useEffect } from 'react';
import { Search, User, Calendar, MessageSquare, MessageCircle, Clock, ArrowRight } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';
import { fetchApiWithFallback } from '../lib/api';

const DoctorPatients = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('active'); // active / completed
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
            .order('appointment_date', { ascending: false });

          if (error) throw error;

          let mergedAppts = rawAppts || [];
          const userIds = [...new Set(mergedAppts.map(a => a.user_id).filter(Boolean))];
          if (userIds.length > 0) {
            const { data: profs } = await supabase
              .from('profiles')
              .select('id, full_name, phone_number')
              .in('id', userIds);
            
            mergedAppts = mergedAppts.map(a => {
              const p = profs?.find(prof => prof.id === a.user_id);
              return {
                ...a,
                profiles: p ? { full_name: p.full_name, phone_number: p.phone_number } : { full_name: a.patient_name || 'Patient' }
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
                    <span>Appt Date: {appt.appointment_date ? new Date(appt.appointment_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</span>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-100"
                      onClick={() => handleViewPatientDetails(appt)}
                    >
                      View Profile
                    </Button>
                    {activeTab === 'active' && (
                      <Button 
                        variant="primary" 
                        size="sm" 
                        className="w-full rounded-xl shadow-md gap-2 text-xs font-bold"
                        onClick={() => navigate(`/chat/${appt.id}`)}
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Chat
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full p-16 text-center text-slate-400">
            <User className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-semibold text-slate-600 dark:text-slate-300">No {activeTab} patient records found</p>
          </div>
        )}
      </div>

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
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Appointment Date</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                    {selectedPatientModal.appointment_date ? new Date(selectedPatientModal.appointment_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                  </p>
                </div>
                {selectedPatientModal.diseases && (
                  <div className="col-span-2 p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Diseases / Conditions</p>
                    <p className="text-sm text-slate-800 dark:text-slate-200 font-medium">{selectedPatientModal.diseases}</p>
                  </div>
                )}
                {selectedPatientModal.drugs && (
                  <div className="col-span-2 p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-100 dark:border-zinc-800">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Current Medications</p>
                    <p className="text-sm text-slate-800 dark:text-slate-200 font-medium">{selectedPatientModal.drugs}</p>
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
    </div>
  );
};

export default DoctorPatients;
