import React, { useState } from 'react';
import { X, Pill, Save, Clock } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { supabase } from '../lib/supabase';
import { useSelector } from 'react-redux';

const AddMedicineModal = ({ isOpen, onClose, onSave }) => {
 const { user } = useSelector((state) => state.auth);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState(null);
 const [formData, setFormData] = useState({
 name: '',
 dosage: '',
 time: '08:00',
 stock_count: '30'
 });

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
 const { error: insertError } = await supabase.from('medications').insert([
 {
 user_id: user.id,
 name: formData.name,
 dosage: formData.dosage,
 time: formData.time + ':00',
 stock_count: parseInt(formData.stock_count) || 30,
 is_active: true
 },
 ]);

 if (insertError) throw insertError;
 
 onSave();
 onClose();
 setFormData({ name: '', dosage: '', time: '08:00', stock_count: '30' });
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
 <h2 className="text-xl font-bold text-slate-900">Add Medication</h2>
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

 <div className="grid grid-cols-2 gap-4">
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
 <label className="text-sm font-medium text-slate-700 ml-1">Time</label>
 <div className="relative">
 <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
 <input
 name="time"
 type="time"
 required
 value={formData.time}
 onChange={handleInputChange}
 className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-100 bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-slate-900"
 />
 </div>
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
 {loading ? 'Adding...' : (
 <>
 <Save className="w-5 h-5" />
 Save Medication
 </>
 )}
 </Button>
 </form>
 </Card>
 </div>
 );
};

export default AddMedicineModal;




