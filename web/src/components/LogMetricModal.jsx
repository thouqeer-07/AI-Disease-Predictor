import React, { useState } from 'react';
import { X, Droplets, Footprints, Moon, Flame, Save } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { supabase } from '../lib/supabase';
import { useSelector } from 'react-redux';

const LogMetricModal = ({ isOpen, onClose, onSave, initialType = 'water' }) => {
  const { user } = useSelector((state) => state.auth);
  const [metricType, setMetricType] = useState(initialType);
  const [values, setValues] = useState({ water: '', steps: '', sleep: '', calories: '' });
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setMetricType(initialType);
      setValues({ water: '', steps: '', sleep: '', calories: '' });
    }
  }, [isOpen, initialType]);

  const metrics = [
    { id: 'water', label: 'Water', icon: Droplets, unit: 'L', color: 'text-blue-500', bg: 'bg-blue-50' },
    { id: 'steps', label: 'Steps', icon: Footprints, unit: 'steps', color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { id: 'sleep', label: 'Sleep', icon: Moon, unit: 'hrs', color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { id: 'calories', label: 'Calories', icon: Flame, unit: 'kcal', color: 'text-orange-500', bg: 'bg-orange-50' },
  ];

  const handleInputChange = (val) => {
    setValues((prev) => ({
      ...prev,
      [metricType]: val
    }));
  };

  const METRIC_LIMITS = {
    sleep: { min: 0, max: 24, label: 'Sleep', unit: 'hrs', hint: 'Sleep hours must be between 0 and 24 hrs per day.' },
    water: { min: 0, max: 15, label: 'Water', unit: 'L', hint: 'Water intake must be between 0 and 15 L per day.' },
    steps: { min: 0, max: 100000, label: 'Steps', unit: 'steps', hint: 'Step count must be between 0 and 100,000 steps per day.' },
    calories: { min: 0, max: 10000, label: 'Calories', unit: 'kcal', hint: 'Calories must be between 0 and 10,000 kcal per day.' }
  };

  const activeMetric = metrics.find(m => m.id === metricType);
  const activeLimit = METRIC_LIMITS[metricType];
  const activeValue = values[metricType] || '';

  const filledCount = Object.values(values).filter(v => v.trim() !== '' && !isNaN(parseFloat(v))).length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    // Validate number limits
    for (const type of Object.keys(values)) {
      const valStr = values[type]?.trim();
      if (valStr && !isNaN(parseFloat(valStr))) {
        const num = parseFloat(valStr);
        const limit = METRIC_LIMITS[type];
        if (limit && (num < limit.min || num > limit.max)) {
          alert(`Invalid entry for ${limit.label}! Value must be between ${limit.min} and ${limit.max} ${limit.unit}.`);
          return;
        }
      }
    }

    const recordsToInsert = [];
    const now = new Date().toISOString();

    Object.keys(values).forEach((type) => {
      const valStr = values[type]?.trim();
      if (valStr && !isNaN(parseFloat(valStr))) {
        recordsToInsert.push({
          user_id: user.id,
          metric_type: type,
          value: { current: parseFloat(valStr) },
          recorded_at: now,
        });
      }
    });

    if (recordsToInsert.length === 0) {
      alert('Please enter a value for at least one metric.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('health_metrics').insert(recordsToInsert);

      if (error) throw error;
      
      onSave();
      onClose();
      setValues({ water: '', steps: '', sleep: '', calories: '' });
    } catch (error) {
      console.error('Error logging metrics:', error.message);
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
          <div>
            <h2 className="text-xl font-bold text-slate-900">Quick Log</h2>
            <p className="text-xs text-slate-400 font-medium">Log multiple health metrics at once</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Metric Selector */}
          <div className="grid grid-cols-4 gap-3">
            {metrics.map((m) => {
              const val = values[m.id]?.trim();
              const hasVal = val !== '' && !isNaN(parseFloat(val));
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMetricType(m.id)}
                  className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    metricType === m.id 
                      ? `border-primary ${m.bg}` 
                      : 'border-transparent bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  {hasVal && (
                    <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 bg-emerald-500 text-white text-[9px] font-bold rounded-full shadow-sm">
                      ✓
                    </span>
                  )}
                  <m.icon className={`w-6 h-6 ${metricType === m.id ? m.color : 'text-slate-400'}`} />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{m.label}</span>
                  {hasVal && (
                    <span className="text-[9px] font-black text-emerald-600 truncate max-w-full">
                      {val} {m.unit}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Value Input */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-slate-700 ml-1">
                Enter {activeMetric?.label} ({activeMetric?.unit})
              </label>
              <span className="text-xs font-semibold text-slate-400">
                Max: {activeLimit?.max} {activeLimit?.unit}
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="any"
                min={activeLimit?.min}
                max={activeLimit?.max}
                value={activeValue}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="0.00"
                className={`w-full px-4 py-4 text-2xl font-bold rounded-xl border bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-slate-900 ${
                  activeValue && (parseFloat(activeValue) < activeLimit?.min || parseFloat(activeValue) > activeLimit?.max)
                    ? 'border-rose-400 ring-rose-100'
                    : 'border-slate-200'
                }`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                {activeMetric?.unit}
              </span>
            </div>
            {activeValue && (parseFloat(activeValue) < activeLimit?.min || parseFloat(activeValue) > activeLimit?.max) && (
              <p className="text-xs text-rose-500 font-bold ml-1">
                ⚠️ Value must be between {activeLimit?.min} and {activeLimit?.max} {activeLimit?.unit}.
              </p>
            )}
          </div>

          <Button type="submit" className="w-full py-4 text-lg gap-2" disabled={loading}>
            {loading ? 'Saving Logs...' : (
              <>
                <Save className="w-5 h-5" />
                {filledCount > 1 ? `Save All ${filledCount} Logs` : 'Save Log'}
              </>
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default LogMetricModal;




