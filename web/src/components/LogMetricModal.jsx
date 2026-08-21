import React, { useState } from 'react';
import { X, Droplets, Footprints, Moon, Flame, Save } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { supabase } from '../lib/supabase';
import { useSelector } from 'react-redux';

const LogMetricModal = ({ isOpen, onClose, onSave, initialType = 'water' }) => {

 const { user } = useSelector((state) => state.auth);
 const [metricType, setMetricType] = useState(initialType);
 const [value, setValue] = useState('');
 const [loading, setLoading] = useState(false);

 React.useEffect(() => {
 if (isOpen) {
 setMetricType(initialType);
 setValue('');
 }
 }, [isOpen, initialType]);


 const metrics = [
 { id: 'water', label: 'Water', icon: Droplets, unit: 'L', color: 'text-blue-500', bg: 'bg-blue-50' },
 { id: 'steps', label: 'Steps', icon: Footprints, unit: 'steps', color: 'text-emerald-500', bg: 'bg-emerald-50' },
 { id: 'sleep', label: 'Sleep', icon: Moon, unit: 'hrs', color: 'text-indigo-500', bg: 'bg-indigo-50' },
 { id: 'calories', label: 'Calories', icon: Flame, unit: 'kcal', color: 'text-orange-500', bg: 'bg-orange-50' },
 ];

 const handleSubmit = async (e) => {
 e.preventDefault();
 if (!value || !user) return;

 setLoading(true);
 try {
 const { error } = await supabase.from('health_metrics').insert([
 {
 user_id: user.id,
 metric_type: metricType,
 value: { current: parseFloat(value) },
 recorded_at: new Date().toISOString(),
 },
 ]);

 if (error) throw error;
 
 onSave();
 onClose();
 setValue('');
 } catch (error) {
 console.error('Error logging metric:', error.message);
 alert(`Failed to log data: ${error.message}. Please make sure the 'health_metrics' table is correctly set up.`);
 } finally {

 setLoading(false);
 }
 };

 if (!isOpen) return null;

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
 <Card className="w-full max-w-md p-0 overflow-hidden shadow-2xl border-none">
 <div className="p-6 border-b border-slate-100 flex justify-between items-center">
 <h2 className="text-xl font-bold text-slate-900">Quick Log</h2>
 <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
 <X className="w-5 h-5 text-slate-500" />
 </button>
 </div>

 <form onSubmit={handleSubmit} className="p-6 space-y-6">
 {/* Metric Selector */}
 <div className="grid grid-cols-4 gap-3">
 {metrics.map((m) => (
 <button
 key={m.id}
 type="button"
 onClick={() => setMetricType(m.id)}
 className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
 metricType === m.id 
 ? `border-primary ${m.bg}` 
 : 'border-transparent bg-slate-50 hover:bg-slate-100'
 }`}
 >
 <m.icon className={`w-6 h-6 ${metricType === m.id ? m.color : 'text-slate-400'}`} />
 <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{m.label}</span>
 </button>
 ))}
 </div>

 {/* Value Input */}
 <div className="space-y-2">
 <label className="text-sm font-medium text-slate-700 ml-1">
 Enter Value ({metrics.find(m => m.id === metricType)?.unit})
 </label>
 <div className="relative">
 <input
 type="number"
 step="any"
 required
 value={value}
 onChange={(e) => setValue(e.target.value)}
 placeholder="0.00"
 className="w-full px-4 py-4 text-2xl font-bold rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-slate-900"
 />
 <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
 {metrics.find(m => m.id === metricType)?.unit}
 </span>
 </div>
 </div>

 <Button type="submit" className="w-full py-4 text-lg gap-2" disabled={loading}>
 {loading ? 'Saving...' : (
 <>
 <Save className="w-5 h-5" />
 Log Daily Stats
 </>
 )}
 </Button>
 </form>
 </Card>
 </div>
 );
};

export default LogMetricModal;




