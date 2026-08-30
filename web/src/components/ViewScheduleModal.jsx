import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { supabase } from '../lib/supabase';

const ViewScheduleModal = ({ isOpen, onClose, doctorId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch all scheduled/accepted appointments for this doctor
  const fetchScheduledAppointments = async () => {
    if (!doctorId) return;
    setLoading(true);
    try {
      const { data: rawAppts, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('doctor_id', doctorId)
        .in('status', ['accepted', 'scheduled'])
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
    } catch (err) {
      console.error('Error fetching calendar appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchScheduledAppointments();
    }
  }, [isOpen, doctorId]);

  if (!isOpen) return null;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Generate calendar days
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const days = [];
  // Add empty spaces for days of the week before start of the month
  for (let i = 0; i < firstDayIndex; i++) {
    days.push(null);
  }
  // Add days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }

  // Group appointments by date string (YYYY-MM-DD)
  const getApptsForDate = (date) => {
    if (!date) return [];
    
    // Format cell date as YYYY-MM-DD using local timezone values to avoid UTC offset shifts
    const localYear = date.getFullYear();
    const localMonth = String(date.getMonth() + 1).padStart(2, '0');
    const localDay = String(date.getDate()).padStart(2, '0');
    const dateStr = `${localYear}-${localMonth}-${localDay}`;
    
    return appointments.filter(appt => {
      if (!appt.appointment_date) return false;
      const apptDateObj = new Date(appt.appointment_date);
      const apptYear = apptDateObj.getFullYear();
      const apptMonth = String(apptDateObj.getMonth() + 1).padStart(2, '0');
      const apptDay = String(apptDateObj.getDate()).padStart(2, '0');
      const apptDateStr = `${apptYear}-${apptMonth}-${apptDay}`;
      return apptDateStr === dateStr;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="w-full max-w-4xl p-0 overflow-hidden shadow-2xl border-none bg-white dark:bg-zinc-900 flex flex-col h-[85vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-slate-50/50 dark:bg-zinc-800/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-xl text-white">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Doctor Consultation Schedule</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">View upcoming scheduled appointments</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Navigation & Controls */}
        <div className="p-4 bg-white dark:bg-zinc-900 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrevMonth} className="p-2 h-9 w-9 rounded-lg">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white min-w-[140px] text-center">
              {monthNames[month]} {year}
            </h3>
            <Button variant="outline" size="sm" onClick={handleNextMonth} className="p-2 h-9 w-9 rounded-lg">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())} className="text-xs font-semibold text-primary">
            Today
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/30 dark:bg-zinc-950/20">
          {loading ? (
            <div className="h-full flex items-center justify-center text-slate-400">
              <span className="animate-pulse">Loading schedule...</span>
            </div>
          ) : (
            <div className="h-full flex flex-col min-h-[450px]">
              {/* Day names */}
              <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold uppercase tracking-wider text-slate-400">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="py-2">{d}</div>
                ))}
              </div>

              {/* Grid Cells */}
              <div className="grid grid-cols-7 gap-2 flex-1 auto-rows-fr">
                {days.map((date, idx) => {
                  const dayAppts = getApptsForDate(date);
                  const isToday = date && date.toDateString() === new Date().toDateString();

                  return (
                    <div
                      key={idx}
                      className={`min-h-[80px] p-2 rounded-xl border flex flex-col gap-1 transition-all ${
                        !date 
                          ? 'bg-transparent border-transparent' 
                          : isToday 
                            ? 'bg-primary/5 border-primary/30 dark:bg-primary/10 dark:border-primary/40' 
                            : 'bg-white dark:bg-zinc-900 border-slate-100 dark:border-zinc-800'
                      }`}
                    >
                      {date && (
                        <>
                          <span className={`text-xs font-bold ${
                            isToday ? 'text-primary' : 'text-slate-500 dark:text-slate-400'
                          }`}>
                            {date.getDate()}
                          </span>
                          <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar max-h-[100px]">
                            {dayAppts.map(appt => (
                              <div
                                key={appt.id}
                                className="p-1 px-1.5 text-[9px] font-bold rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/20 truncate"
                                title={`Dr. Consultation\nPatient: ${appt.profiles?.full_name || appt.patient_name || 'Anonymous'}\nTime: ${new Date(appt.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                              >
                                <span className="font-extrabold mr-1">
                                  {new Date(appt.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {appt.profiles?.full_name || appt.patient_name || 'Anonymous'}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ViewScheduleModal;
