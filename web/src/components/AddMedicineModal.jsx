import React, { useState } from 'react';
import { X, Pill, Save, Clock } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { supabase } from '../lib/supabase';
import { useSelector } from 'react-redux';

const AddMedicineModal = ({ isOpen, onClose, onSave, initialData = null }) => {
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    hour: '08',
    minute: '00',
    ampm: 'AM',
    stock_count: '30'
  });

  React.useEffect(() => {
    if (initialData && isOpen) {
      // Parse time (e.g. "14:30:00")
      let [hStr, mStr] = initialData.time.split(':');
      let hInt = parseInt(hStr, 10);
      let ampm = 'AM';
      if (hInt >= 12) {
        ampm = 'PM';
        if (hInt > 12) hInt -= 12;
      } else if (hInt === 0) {
        hInt = 12;
      }

      setFormData({
        name: initialData.name,
        dosage: initialData.dosage,
        hour: hInt.toString().padStart(2, '0'),
        minute: mStr,
        ampm: ampm,
        stock_count: initialData.stock_count.toString()
      });
    } else if (!isOpen) {
      setFormData({ name: '', dosage: '', hour: '08', minute: '00', ampm: 'AM', stock_count: '30' });
    }
  }, [initialData, isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setError('You must be logged in to add medicines.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Convert 12h to 24h format for database
      let h = parseInt(formData.hour, 10);
      if (formData.ampm === 'PM' && h < 12) h += 12;
      if (formData.ampm === 'AM' && h === 12) h = 0;
      const formattedTime = `${h.toString().padStart(2, '0')}:${formData.minute}:00`;

      if (initialData) {
        const { error: updateError } = await supabase.from('medications').update({
          name: formData.name,
          dosage: formData.dosage,
          time: formattedTime,
          stock_count: parseInt(formData.stock_count) || 0
        }).eq('id', initialData.id);
        
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from('medications').insert([
          {
            user_id: user.id,
            name: formData.name,
            dosage: formData.dosage,
            time: formattedTime,
            stock_count: parseInt(formData.stock_count) || 30,
            is_active: true
          },
        ]);

        if (insertError) throw insertError;
      }
      
      // Request notification permission if not granted
      if ('Notification' in window && Notification.permission !== 'granted') {
        await Notification.requestPermission();
      }

      onSave();
      onClose();
    } catch (err) {
      console.error('Error adding medicine:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="w-full max-w-md p-0 overflow-hidden shadow-2xl border-none">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-primary/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg text-white">
              <Pill className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">{initialData ? 'Edit Medication' : 'Add Medication'}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex items-center gap-2">
              <span className="font-bold">Error:</span> {error}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 ml-1">Medicine Name</label>
            <input
              name="name"
              type="text"
              required
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g., Vitamin D3"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-slate-900"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 ml-1">Dosage</label>
            <input
              name="dosage"
              type="text"
              required
              value={formData.dosage}
              onChange={handleInputChange}
              placeholder="e.g., 1000 IU"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-slate-900"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 ml-1">Time (AM/PM)</label>
            <div className="flex gap-2">
              <select
                name="hour"
                value={formData.hour}
                onChange={handleInputChange}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-slate-900"
              >
                {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
              <span className="flex items-center text-slate-400 font-bold">:</span>
              <select
                name="minute"
                value={formData.minute}
                onChange={handleInputChange}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-slate-900"
              >
                {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <select
                name="ampm"
                value={formData.ampm}
                onChange={handleInputChange}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-slate-900 font-bold"
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 ml-1">Initial Stock Count</label>
            <input
              name="stock_count"
              type="number"
              required
              value={formData.stock_count}
              onChange={handleInputChange}
              placeholder="30"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-slate-900"
            />
          </div>

          <Button type="submit" className="w-full py-4 text-lg gap-2 mt-4" disabled={loading}>
            {loading ? 'Saving...' : (
              <>
                <Save className="w-5 h-5" />
                {initialData ? 'Save Changes' : 'Save Medication'}
              </>
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default AddMedicineModal;
