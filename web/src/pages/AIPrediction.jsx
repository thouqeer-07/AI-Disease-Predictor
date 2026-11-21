import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Stethoscope, Activity, Brain, Shield, AlertCircle, Loader2, Calendar, Droplets, Zap, Moon, CheckCircle2, ArrowRight, TrendingUp, Info, Search, X, Plus, ChevronDown } from 'lucide-react';
import { useSelector } from 'react-redux';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';
import { fetchApiWithFallback } from '../lib/api';

const CANONICAL_SYMPTOMS = [
  "Blurred Vision", "Cold Hands and Feet", "Cough", "Dark Urine", "Daytime Sleepiness", 
  "Difficulty Falling Asleep", "Dizziness", "Dry Mouth", "Extreme Thirst", "Facial Pain", 
  "Fatigue", "Fever", "Frequent Urination", "Headache", "Increased Thirst", 
  "Irritability", "Nasal Congestion", "Nausea", "Pale Skin", "Reduced Sense of Smell", 
  "Runny Nose", "Sensitivity to Light", "Severe Headache", "Shortness of Breath", 
  "Sore Throat", "Throbbing Head", "Vomiting", "Waking up frequently", "Weakness", "Weight Loss"
];

const POPULAR_SYMPTOMS = ["Fever", "Headache", "Fatigue", "Cough", "Sore Throat", "Dizziness", "Nausea", "Runny Nose"];

const AIPrediction = () => {
  const { user } = useSelector((state) => state.auth);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [customText, setCustomText] = useState('');
  
  const [behavioralData, setBehavioralData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingLogs, setFetchingLogs] = useState(true);
  const [result, setResult] = useState(null);

  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchBehavioralLogs = useCallback(async () => {
    if (!user) return;
    setFetchingLogs(true);
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('health_metrics')
        .select('*')
        .eq('user_id', user.id)
        .gte('recorded_at', sevenDaysAgo.toISOString())
        .order('recorded_at', { ascending: false });

      if (error) throw error;

      const logsByDate = {};
      data?.forEach(log => {
        const date = new Date(log.recorded_at).toISOString().split('T')[0];
        if (!logsByDate[date]) {
          logsByDate[date] = { date, steps: 0, water_ml: 0, sleep_hours: 0, calories_burned: 0 };
        }
        const val = parseFloat(log.value?.current) || 0;
        if (log.metric_type === 'steps') logsByDate[date].steps += val;
        if (log.metric_type === 'water') logsByDate[date].water_ml += val;
        if (log.metric_type === 'sleep') logsByDate[date].sleep_hours = Math.max(logsByDate[date].sleep_hours, val);
        if (log.metric_type === 'calories') logsByDate[date].calories_burned += val;
      });

      setBehavioralData(Object.values(logsByDate));
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setFetchingLogs(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBehavioralLogs();
  }, [fetchBehavioralLogs]);

  const toggleSymptom = (symptom) => {
    if (selectedSymptoms.includes(symptom)) {
      setSelectedSymptoms(selectedSymptoms.filter(s => s !== symptom));
    } else {
      setSelectedSymptoms([...selectedSymptoms, symptom]);
    }
    setSearchTerm('');
  };

  const removeSymptom = (symptom) => {
    setSelectedSymptoms(selectedSymptoms.filter(s => s !== symptom));
  };

  const handlePredict = async () => {
    const combinedList = [...selectedSymptoms];
    if (customText.trim()) {
      combinedList.push(customText.trim());
    }

    if (combinedList.length === 0) return;

    const symptomsQuery = combinedList.join(', ');

    setLoading(true);
    setResult(null);

    try {
      const data = await fetchApiWithFallback('/ai/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          symptoms: symptomsQuery,
          behavioralData: behavioralData
        }),
      });

      setResult(data);
    } catch (error) {
      console.error('Prediction failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const averages = {
    steps: Math.round(behavioralData.reduce((acc, d) => acc + (d.steps || 0), 0) / (behavioralData.length || 1)),
    water: Math.round(behavioralData.reduce((acc, d) => acc + (d.water_ml || 0), 0) / (behavioralData.length || 1)),
    sleep: (behavioralData.reduce((acc, d) => acc + (d.sleep_hours || 0), 0) / (behavioralData.length || 1)).toFixed(1)
  };

  const filteredOptions = CANONICAL_SYMPTOMS.filter(s => 
    s.toLowerCase().includes(searchTerm.toLowerCase()) && !selectedSymptoms.includes(s)
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10 animate-in fade-in duration-500">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Brain className="w-10 h-10 text-primary" />
            AI Diagnostic Hub
          </h1>
          <p className="text-lg text-slate-500 mt-1 font-medium">Precision analysis of clinical symptoms and lifestyle logs.</p>
        </div>
      </div>

      {/* 7-Day Lifestyle Summary Bar */}
      {behavioralData.length === 0 ? (
        <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex items-center justify-between gap-4 text-amber-900 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 font-bold shrink-0">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold">No 7-Day Health Metrics Logged</h4>
              <p className="text-xs text-amber-700 font-medium">Diagnostic engine will analyze your symptoms strictly. Log daily steps, sleep, and water to unlock lifestyle-contextualized predictions.</p>
            </div>
          </div>
        </div>
      ) : (
        <Card className="p-4 bg-white border-slate-100 rounded-xl">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-100">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span className="text-sm font-black text-slate-900 whitespace-nowrap">7-Day Context</span>
            </div>
            
            <div className="grid grid-cols-3 gap-6 flex-1 px-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500"><Zap className="w-4 h-4" /></div>
                <span className="text-xs font-black text-slate-900">{averages.steps.toLocaleString()} <span className="text-slate-400 font-medium lowercase">steps</span></span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500"><Droplets className="w-4 h-4" /></div>
                <span className="text-xs font-black text-slate-900">{averages.water.toLocaleString()} <span className="text-slate-400 font-medium lowercase">ml</span></span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500"><Moon className="w-4 h-4" /></div>
                <span className="text-xs font-black text-slate-900">{averages.sleep} <span className="text-slate-400 font-medium lowercase">hrs</span></span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2 text-emerald-500 text-[10px] font-black uppercase tracking-widest bg-emerald-50 px-4 py-2 rounded-xl">
              <CheckCircle2 className="w-3 h-3" />
              Health Logs Synced
            </div>
          </div>
        </Card>
      )}

      {/* Main Row: Input & Podium */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Symptoms Section */}
        <div className="bg-white p-8 rounded-xl border-2 border-slate-100 shadow-sm flex flex-col gap-6">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-xl font-black text-slate-900">Select & Type Your Symptoms</h3>
            <div className="flex items-center gap-2 text-slate-400">
              <Info className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Multi-Select Dropdown</span>
            </div>
          </div>

          {/* Interactive Searchable Dropdown Input */}
          <div className="relative" ref={dropdownRef}>
            <div 
              className="min-h-[56px] bg-slate-50 border-2 border-slate-200 rounded-xl p-3 flex flex-wrap items-center gap-2 cursor-text focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all"
              onClick={() => setDropdownOpen(true)}
            >
              {selectedSymptoms.map((symptom) => (
                <span 
                  key={symptom} 
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary font-bold text-sm rounded-lg border border-primary/20 animate-in zoom-in-95"
                >
                  {symptom}
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeSymptom(symptom); }}
                    className="hover:bg-primary/20 rounded-md p-0.5 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}

              <input 
                type="text"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setDropdownOpen(true); }}
                onFocus={() => setDropdownOpen(true)}
                placeholder={selectedSymptoms.length === 0 ? "Type to search symptoms (e.g. Fever, Cough)..." : "Add more symptoms..."}
                className="flex-1 min-w-[200px] bg-transparent border-none outline-none text-slate-900 placeholder:text-slate-400 font-medium text-sm"
              />

              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </div>

            {/* Dropdown Options Popup */}
            {dropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-slate-100">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((symptom) => (
                    <button
                      key={symptom}
                      type="button"
                      onClick={() => toggleSymptom(symptom)}
                      className="w-full text-left px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-primary/5 hover:text-primary transition-colors flex items-center justify-between"
                    >
                      <span>{symptom}</span>
                      <Plus className="w-4 h-4 text-slate-400" />
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-slate-400 font-medium text-center">
                    No matching clinical symptoms found. Type below to add custom notes.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Select Tags */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quick Select Common Symptoms:</span>
            <div className="flex flex-wrap gap-2">
              {POPULAR_SYMPTOMS.map((symptom) => {
                const isSelected = selectedSymptoms.includes(symptom);
                return (
                  <button
                    key={symptom}
                    type="button"
                    onClick={() => toggleSymptom(symptom)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      isSelected 
                        ? 'bg-primary text-white border-primary shadow-sm' 
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}{symptom}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Text Notes */}
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Additional Details / Custom Notes (Optional):</span>
            <textarea 
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="e.g. Symptoms started 2 days ago after exposure to cold weather..."
              className="w-full min-h-[90px] bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary/10 transition-all outline-none text-slate-900 resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-4">
            {selectedSymptoms.length > 0 && (
              <button 
                type="button"
                onClick={() => { setSelectedSymptoms([]); setCustomText(''); }}
                className="px-4 py-3 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors"
              >
                Clear All
              </button>
            )}
            
            <Button 
              onClick={handlePredict} 
              disabled={loading || (selectedSymptoms.length === 0 && !customText.trim())}
              className="flex-1 h-14 rounded-xl text-lg font-black shadow-md gap-4 group"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Stethoscope className="w-6 h-6 group-hover:rotate-12 transition-transform" />}
              Analyze Conditions
            </Button>
          </div>
        </div>

        {/* Top 3 Conditions Section */}
        <div className="h-full">
          {result ? (
            <Card className="h-full p-8 bg-white border border-slate-100 rounded-xl shadow-md flex flex-col justify-between animate-in zoom-in-95 duration-500">
              <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-6 px-4">Top 3 Potential Conditions</h4>
              <div className="space-y-4 flex-1 flex flex-col justify-center">
                {result.topPredictions.map((p, i) => (
                  <div key={i} className={`flex items-center justify-between p-5 rounded-xl border-2 transition-all ${i === 0 ? 'bg-primary/5 border-primary/20' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-lg ${i === 0 ? 'bg-primary text-white' : 'bg-slate-200 text-slate-500'}`}>
                        {i + 1}
                      </div>
                      <span className={`text-lg font-black ${i === 0 ? 'text-slate-900' : 'text-slate-400'}`}>{p.condition}</span>
                    </div>
                    <span className={`text-xl font-black ${i === 0 ? 'text-primary' : 'text-slate-900'}`}>{p.probability}</span>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <div className="h-full bg-white rounded-xl border-4 border-dashed border-slate-200 flex flex-col items-center justify-center p-12 text-center group">
              <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
                <ArrowRight className="w-10 h-10 text-slate-200" />
              </div>
              <h4 className="text-xl font-black text-slate-300">Ready for Diagnostic</h4>
              <p className="text-sm mt-2 text-slate-400 max-w-[250px]">Select or type symptoms to see the top 3 AI predictions.</p>
            </div>
          )}
        </div>
      </div>

      {/* FULL WIDTH ANALYSIS - THE MAIN BRIEFING */}
      {result && (
        <div className="space-y-8 animate-in slide-in-from-bottom-10 duration-700">
          <Card className="p-10 bg-white border border-primary/10 rounded-xl shadow-md relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-primary" />
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Activity className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-black text-slate-900 tracking-tight uppercase">Clinical Briefing for #1 Prediction</h4>
            </div>
            <p className="text-lg font-medium text-slate-700 leading-relaxed italic pl-8 ml-2 border-l-4 border-primary/20">
              "{result.topExplanation}"
            </p>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {result.recommendations.map((r, i) => (
              <div key={i} className="flex items-center gap-4 bg-white p-6 rounded-xl border border-slate-100 group hover:shadow-lg transition-all">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0 group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <span className="text-sm font-black text-slate-900 leading-tight">{r}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-6 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-4 max-w-4xl mx-auto shadow-sm">
        <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-1" />
        <p className="text-xs text-amber-700 font-bold leading-relaxed">
          AI Analysis Disclaimer: These insights are based on pattern recognition from behavioral and symptom data. They are for educational purposes and do not constitute a formal medical diagnosis. Please consult a doctor for official medical advice.
        </p>
      </div>
    </div>
  );
};

export default AIPrediction;
