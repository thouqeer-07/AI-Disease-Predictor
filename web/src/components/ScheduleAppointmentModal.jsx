import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Save } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { supabase } from '../lib/supabase';

const ScheduleAppointmentModal = ({ isOpen, onClose, appointment, onConfirm }) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && appointment) {
      // Default to current appointment date or tomorrow
      const dateObj = appointment.appointment_date 
        ? new Date(appointment.appointment_date) 
        : new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      setSelectedDate(`${year}-${month}-${day}`);
      
      const hours = String(dateObj.getHours()).padStart(2, '0');
      const minutes = String(dateObj.getMinutes()).padStart(2, '0');
      setSelectedTime(`${hours}:${minutes}`);
    }
  }, [isOpen, appointment]);

  if (!isOpen || !appointment) return null;

  const patientName = appointment.profiles?.full_name || appointment.patient_name || 'Anonymous Patient';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime) return;

    setLoading(true);
    try {
      const combinedDateTime = new Date(`${selectedDate}T${selectedTime}`);
      const isoString = combinedDateTime.toISOString();

      // Check for conflicting appointments
      const { data: conflicting, error: conflictErr } = await supabase
        .from('appointments')
        .select('*, profiles:user_id(full_name)')
        .eq('doctor_id', appointment.doctor_id)
        .eq('appointment_date', isoString)
        .in('status', ['accepted', 'scheduled'])
        .neq('id', appointment.id);

      if (conflictErr) throw conflictErr;

      if (conflicting && conflicting.length > 0) {
        const conflictNames = conflicting.map(c => c.profiles?.full_name || c.patient_name || 'Another Patient').join(', ');
        alert(`Conflict detected: You already have a scheduled appointment at this time with ${conflictNames}. Please choose another time.`);
        setLoading(false);
        return;
      }

      await onConfirm(appointment.id, isoString);
      onClose();
    } catch (error) {
      console.error('Error confirming schedule:', error);
      alert('Error: Failed to schedule appointment due to a server error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="w-full max-w-md p-0 overflow-hidden shadow-2xl border-none bg-white dark:bg-zinc-900">
        <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-blue-50/50 dark:bg-zinc-800/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-xl text-white">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Schedule Appointment</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">For {patientName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Select Date</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="date"
                required
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Select Time</label>
            <div className="relative">
              <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="time"
                required
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 rounded-xl py-3 border-slate-200 dark:border-zinc-800 dark:text-zinc-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl py-3 gap-2 bg-blue-600 hover:bg-blue-700 text-white border-none shadow-md font-bold"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Scheduling...' : 'Accept & Schedule'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ScheduleAppointmentModal;
