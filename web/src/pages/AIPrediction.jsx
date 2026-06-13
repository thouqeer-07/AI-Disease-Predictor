import React, { useState, useEffect, useCallback } from 'react';
import { Stethoscope, Activity, Brain, Shield, AlertCircle, Loader2, Calendar, Droplets, Zap, Moon, CheckCircle2, ArrowRight, TrendingUp, Info } from 'lucide-react';
import { useSelector } from 'react-redux';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';

const AIPrediction = () => {
 const { user } = useSelector((state) => state.auth);
 const [symptoms, setSymptoms] = useState('');
 const [behavioralData, setBehavioralData] = useState([]);
 const [loading, setLoading] = useState(false);
 const [fetchingLogs, setFetchingLogs] = useState(true);
 const [result, setResult] = useState(null);

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

 const handlePredict = async () => {
 if (!symptoms.trim()) return;
 setLoading(true);
 setResult(null);

 try {
 const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/ai/predict`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ 
 symptoms,
 behavioralData: behavioralData
 }),
 });

 const data = await response.json();
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
 <div className="bg-primary/10 px-5 py-2 rounded-xl flex items-center gap-3 border border-primary/20">
 <Shield className="w-5 h-5 text-primary" />
 <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Engine 2.5 Active</span>
 </div>
 </div>

 {/* 7-Day Lifestyle Summary Bar */}
 <Card className="p-4 bg-white border-slate-100 rounded-xl">
 <div className="flex flex-col md:flex-row items-center gap-6">
 <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-100 ">
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

 {/* Main Row: Input & Podium */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
 {/* Symptoms Section */}
 <div className="bg-white p-8 rounded-xl border-2 border-slate-100 shadow-sm flex flex-col gap-6">
 <div className="flex justify-between items-center px-2">
 <h3 className="text-xl font-black text-slate-900">Describe Your Symptoms</h3>
 <div className="flex items-center gap-2 text-slate-400">
 <Info className="w-4 h-4" />
 <span className="text-[10px] font-black uppercase tracking-widest">Be Detailed</span>
 </div>
 </div>
 <textarea 
 value={symptoms}
 onChange={(e) => setSymptoms(e.target.value)}
 placeholder="e.g. Sharp headache behind eyes, sensitivity to light, and slight nausea since morning..."
 className="flex-1 min-h-[220px] bg-slate-50 border-none rounded-xl p-8 text-xl focus:ring-4 focus:ring-primary/10 transition-all outline-none text-slate-900 resize-none shadow-inner"
 />
            <Button 
              onClick={handlePredict} 
              disabled={loading || !symptoms.trim()}
              className="h-16 rounded-xl text-lg font-black shadow-md gap-4 group"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Stethoscope className="w-6 h-6 group-hover:rotate-12 transition-transform" />}
              Analyze Conditions
            </Button>
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
 <div className="h-full bg-white rounded-xl border-4 border-dashed border-slate-200 border-slate-100 flex flex-col items-center justify-center p-12 text-center group">
 <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
 <ArrowRight className="w-10 h-10 text-slate-200" />
 </div>
 <h4 className="text-xl font-black text-slate-300">Ready for Diagnostic</h4>
 <p className="text-sm mt-2 text-slate-400 max-w-[250px]">Enter symptoms to see the top 3 AI predictions.</p>
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




