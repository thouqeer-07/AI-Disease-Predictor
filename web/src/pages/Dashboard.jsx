import React, { useState, useEffect, useCallback } from 'react';
import { 
 Activity, 
 Droplets, 
 Moon, 
 Footprints, 
 Flame, 
 Heart, 
 Brain,
 TrendingUp,
 CircleAlert as AlertCircle,
 Plus,
 MessageCircle,
 Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { 
 AreaChart, 
 Area, 
 XAxis, 
 YAxis, 
 CartesianGrid, 
 Tooltip, 
 ResponsiveContainer 
} from 'recharts';
import { useSelector } from 'react-redux';
import { Card, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';
import LogMetricModal from '../components/LogMetricModal';

const StatCard = ({ title, value, unit, icon: Icon, color, loading, onAdd }) => (
 <Card className="flex flex-col gap-2 relative overflow-hidden group border-slate-100 hover:border-primary/20">
 {loading && (
 <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center">
 <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
 </div>
 )}
 <div className="flex justify-between items-start">
 <div className={`p-2.5 rounded-lg ${color}`}>
 <Icon className="w-5 h-5" />
 </div>
 <button 
 onClick={onAdd}
 className="p-1.5 rounded-lg bg-slate-50 text-slate-400 hover:bg-primary hover:text-white transition-all opacity-0 group-hover:opacity-100"
 >
 <Plus className="w-4 h-4" />
 </button>
 </div>
 <p className="text-slate-500 text-sm font-medium mt-1">{title}</p>
 <div className="flex items-baseline gap-1">
 <span className="text-2xl font-bold text-slate-900">{value}</span>
 <span className="text-slate-400 text-sm font-medium">{unit}</span>
 </div>
 </Card>
);


const getTabColor = (tab) => {
  if (tab === 'water') return '#3b82f6';
  if (tab === 'steps') return '#10b981';
  if (tab === 'sleep') return '#6366f1';
  return '#f97316';
};

const getTabUnit = (tab) => {
  if (tab === 'water') return 'L';
  if (tab === 'steps') return 'steps';
  if (tab === 'sleep') return 'hrs';
  return 'kcal';
};

const Dashboard = () => {
 const { user } = useSelector((state) => state.auth);
 const [modalConfig, setModalConfig] = useState({ isOpen: false, type: 'water' });
 const [loading, setLoading] = useState(true);

 const [metrics, setMetrics] = useState({
 water: '0',
 steps: '0',
 sleep: '0',
 calories: '0'
 });
 const [appointments, setAppointments] = useState([]);
 const [trends, setTrends] = useState([]);
 const [insights, setInsights] = useState([]);
 const [dailyScore, setDailyScore] = useState({ score: 0, label: 'No Data' });
 const [weeklyBehavioral, setWeeklyBehavioral] = useState([]);
 const [activeMetricTab, setActiveMetricTab] = useState('water');
 const navigate = useNavigate();


  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      // 1. Fetch Today's Metrics
      const { data: metricsData } = await supabase
        .from('health_metrics')
        .select('metric_type, value, recorded_at')
        .eq('user_id', user.id)
        .gte('recorded_at', todayStart.toISOString())
        .lte('recorded_at', todayEnd.toISOString())
        .order('recorded_at', { ascending: false });

      const todayMetrics = { water: 0, steps: 0, sleep: 0, calories: 0 };
      metricsData?.forEach(m => {
        const type = m.metric_type;
        const val = parseFloat(m.value?.current) || 0;
        if (type === 'water') todayMetrics.water += val;
        else if (type === 'steps') todayMetrics.steps += val;
        else if (type === 'sleep') todayMetrics.sleep = Math.max(todayMetrics.sleep, val);
        else if (type === 'calories') todayMetrics.calories += val;
      });

      const formattedMetrics = {
        water: parseFloat(todayMetrics.water.toFixed(2)).toString(),
        steps: Math.round(todayMetrics.steps).toString(),
        sleep: parseFloat(todayMetrics.sleep.toFixed(1)).toString(),
        calories: Math.round(todayMetrics.calories).toString()
      };
      setMetrics(formattedMetrics);

      // 2. Calculate Today's Daily Health Score & Upsert
      const waterPct = Math.min(100, (todayMetrics.water / 2.5) * 100);
      const stepsPct = Math.min(100, (todayMetrics.steps / 10000) * 100);
      const sleepPct = Math.min(100, (todayMetrics.sleep / 8) * 100);
      const caloriesPct = Math.min(100, (todayMetrics.calories / 2000) * 100);

      let hasLoggedToday = metricsData && metricsData.length > 0;
      let calculatedScore = 0;
      let calculatedLabel = 'No Data';

      if (hasLoggedToday) {
        calculatedScore = Math.round((waterPct + stepsPct + sleepPct + caloriesPct) / 4);
        if (calculatedScore === 0) {
          calculatedLabel = 'No Data';
        } else if (calculatedScore < 40) {
          calculatedLabel = 'Need Attention';
        } else if (calculatedScore < 70) {
          calculatedLabel = 'Good Progress';
        } else if (calculatedScore < 90) {
          calculatedLabel = 'Very Active';
        } else {
          calculatedLabel = 'Excellent Health';
        }

        // Upsert to daily_scores
        const { data: existingScores } = await supabase
          .from('daily_scores')
          .select('id')
          .eq('user_id', user.id)
          .gte('recorded_at', todayStart.toISOString())
          .lte('recorded_at', todayEnd.toISOString());

        if (existingScores && existingScores.length > 0) {
          await supabase
            .from('daily_scores')
            .update({
              score: calculatedScore,
              label: calculatedLabel
            })
            .eq('id', existingScores[0].id);
        } else {
          await supabase
            .from('daily_scores')
            .insert([
              {
                user_id: user.id,
                score: calculatedScore,
                label: calculatedLabel,
                recorded_at: new Date().toISOString()
              }
            ]);
        }
      }
      setDailyScore({ score: calculatedScore, label: calculatedLabel });

      // 3. Fetch Trends (Latest 30 days of scores)
      const { data: trendsData } = await supabase
        .from('daily_scores')
        .select('recorded_at, score')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(30);
      
      const formattedTrends = trendsData ? [...trendsData].reverse().map(t => ({
        day: new Date(t.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        score: t.score
      })) : [];
      setTrends(formattedTrends);

      // 4. Fetch Accepted Appointments for Chat
      const { data: apptData } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'accepted')
        .order('appointment_date', { ascending: true });
      
      setAppointments(apptData || []);

      // 5. Generate and Fetch Daily Insights
      const { data: todayInsights } = await supabase
        .from('insights')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', todayStart.toISOString())
        .lte('created_at', todayEnd.toISOString());

      if (!todayInsights || todayInsights.length === 0) {
        let type = 'info';
        let content = '';

        if (!hasLoggedToday) {
          type = 'info';
          content = 'Welcome to AuraHealth! Start logging your water, steps, or sleep today to begin your health tracking analysis.';
        } else if (todayMetrics.steps < 3000) {
          type = 'warning';
          content = 'Your activity level is currently low. A brisk 10-minute walk can instantly boost your energy and focus.';
        } else if (todayMetrics.water < 1.0) {
          type = 'warning';
          content = 'Remember to stay hydrated! Drinking water regularly helps maintain concentration and healthy energy levels.';
        } else if (todayMetrics.steps >= 8000) {
          type = 'success';
          content = 'Outstanding step count today! You are maintaining an active and healthy lifestyle.';
        } else if (todayMetrics.water >= 2.0) {
          type = 'success';
          content = 'Superb hydration today! Your body has the fluid it needs to perform at its best.';
        } else {
          type = 'info';
          content = 'Great job tracking your daily stats. Consistency is the secret to building long-term healthy habits.';
        }

        await supabase
          .from('insights')
          .insert([
            {
              user_id: user.id,
              type,
              content,
              created_at: new Date().toISOString()
            }
          ]);
      }

      const { data: insightsData } = await supabase
        .from('insights')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);
      
      setInsights(insightsData || []);

      // 6. Fetch 30-Day Behavioral Data (Water, Steps, Sleep, Calories)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
      thirtyDaysAgo.setHours(0, 0, 0, 0);

      const { data: weeklyMetricsData } = await supabase
        .from('health_metrics')
        .select('*')
        .eq('user_id', user.id)
        .gte('recorded_at', thirtyDaysAgo.toISOString())
        .order('recorded_at', { ascending: true });

      const weeklyLogs = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayName = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        weeklyLogs.push({
          date: dateStr,
          day: dayName,
          water: 0,
          steps: 0,
          sleep: 0,
          calories: 0
        });
      }

      weeklyMetricsData?.forEach(log => {
        const dateStr = new Date(log.recorded_at).toISOString().split('T')[0];
        const val = parseFloat(log.value?.current) || 0;
        const dayObj = weeklyLogs.find(w => w.date === dateStr);
        if (dayObj) {
          if (log.metric_type === 'water') dayObj.water += val;
          else if (log.metric_type === 'steps') dayObj.steps += val;
          else if (log.metric_type === 'sleep') dayObj.sleep = Math.max(dayObj.sleep, val);
          else if (log.metric_type === 'calories') dayObj.calories += val;
        }
      });

      setWeeklyBehavioral(weeklyLogs);

    } catch (error) {
      console.error('Error fetching dashboard data:', error.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

 useEffect(() => {
 fetchData();
 }, [fetchData]);

 return (
 <div className="p-8 max-w-7xl mx-auto">
 {/* Header */}
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
 <div>
 <h1 className="text-3xl font-bold text-slate-900 m-0">
 AuraHealth Dashboard
 </h1>
 <p className="text-slate-500 mt-1">
 Welcome back, {user?.user_metadata?.full_name?.split(' ')[0] || 'User'}. Here's your health summary.
 </p>
 </div>
 <Button 
 variant="primary" 
 className="rounded-lg px-6 gap-2"
 onClick={() => setModalConfig({ isOpen: true, type: 'water' })}
 >
 <Plus className="w-5 h-5" />
 Quick Log
 </Button>

 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 {/* Main Stats */}
 <div className="lg:col-span-2 flex flex-col gap-8">
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
 <StatCard title="Water" value={metrics.water} unit="L" icon={Droplets} color="bg-blue-100 text-blue-600" loading={loading} onAdd={() => setModalConfig({ isOpen: true, type: 'water' })} />
 <StatCard title="Steps" value={Number(metrics.steps).toLocaleString()} unit="steps" icon={Footprints} color="bg-emerald-100 text-emerald-600" loading={loading} onAdd={() => setModalConfig({ isOpen: true, type: 'steps' })} />
 <StatCard title="Sleep" value={metrics.sleep} unit="hrs" icon={Moon} color="bg-indigo-100 text-indigo-600" loading={loading} onAdd={() => setModalConfig({ isOpen: true, type: 'sleep' })} />
 <StatCard title="Calories" value={Number(metrics.calories).toLocaleString()} unit="kcal" icon={Flame} color="bg-orange-100 text-orange-600" loading={loading} onAdd={() => setModalConfig({ isOpen: true, type: 'calories' })} />
 </div>



  {/* Charts Row */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
    {/* Analytics Chart */}
    <Card className="h-[400px]">
      <CardHeader title="Health Trends" subtitle="30-day performance score" icon={TrendingUp} />
      <div className="h-[300px] w-full">
        {trends.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trends}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} minTickGap={15} />
              <YAxis hide />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '12px', 
                  border: '1px solid #e2e8f0', 
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                  backgroundColor: '#fff' 
                }} 
              />
              <Area type="monotone" dataKey="score" stroke="#1d4ed8" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400">
            No trend data available yet. Start logging to see results!
          </div>
        )}
      </div>
    </Card>

    {/* Behavioral Trends Chart */}
    <Card className="h-[400px] flex flex-col justify-between">
      <div className="flex flex-col gap-4 h-full">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 leading-none">Lifestyle Trends</h3>
            <p className="text-sm text-slate-500 mt-1">30-day behavioral history</p>
          </div>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold shrink-0">
            {['water', 'steps', 'sleep', 'calories'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveMetricTab(tab)}
                className={`px-2 py-0.5 rounded-md transition-all uppercase text-[9px] tracking-wider font-bold ${
                  activeMetricTab === tab 
                    ? 'bg-white text-primary shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="h-[270px] w-full flex-1 mt-2">
          {weeklyBehavioral.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyBehavioral}>
                <defs>
                  <linearGradient id="colorBehavior" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={getTabColor(activeMetricTab)} stopOpacity={0.15}/>
                    <stop offset="95%" stopColor={getTabColor(activeMetricTab)} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} minTickGap={15} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: '1px solid #e2e8f0', 
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                    backgroundColor: '#fff' 
                  }} 
                  formatter={(value) => [`${value} ${getTabUnit(activeMetricTab)}`, activeMetricTab.toUpperCase()]}
                />
                <Area type="monotone" dataKey={activeMetricTab} stroke={getTabColor(activeMetricTab)} strokeWidth={3} fillOpacity={1} fill="url(#colorBehavior)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400">
              No behavioral data logged yet.
            </div>
          )}
        </div>
      </div>
    </Card>
  </div>
 </div>

 {/* Sidebar */}
 <div className="flex flex-col gap-8">
 {/* Health Score */}
 <Card className="flex flex-col items-center text-center">
 <h3 className="text-lg font-semibold mb-4">Daily Health Score</h3>
 <div className="relative w-40 h-40 flex items-center justify-center">
 <svg className="w-full h-full transform -rotate-90">
 <circle cx="80" cy="80" r="70" fill="transparent" stroke="currentColor" strokeWidth="12" className="text-slate-100 " />
 <circle
 cx="80" cy="80" r="70" fill="transparent" stroke="currentColor" strokeWidth="12"
 strokeDasharray={440}
 strokeDashoffset={440 - (440 * (dailyScore.score || 0)) / 100}
 strokeLinecap="round"
 className="text-primary transition-all duration-1000"
 />
 </svg>
 <div className="absolute flex flex-col items-center">
 <span className="text-4xl font-bold">{dailyScore.score}</span>
 <span className="text-xs text-slate-500">{dailyScore.label}</span>
 </div>
 </div>
 </Card>

 {/* Upcoming Consultations */}
 {appointments.length > 0 && (
 <Card>
 <CardHeader title="Upcoming Consultations" icon={Calendar} />
 <div className="flex flex-col gap-4">
 {appointments.map((appt) => (
 <div key={appt.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100 group hover:border-primary/50 transition-all duration-300">
 <div className="flex justify-between items-start mb-3">
 <div>
 <p className="font-bold text-slate-900 group-hover:text-primary transition-colors">Dr. {appt.doctor_name}</p>
 <p className="text-xs text-slate-500">
 {new Date(appt.appointment_date).toLocaleDateString()} at {new Date(appt.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
 </p>
 </div>
 <div className="p-2 bg-white border border-slate-100 rounded-lg group-hover:border-primary/20 transition-colors">
 <MessageCircle className="w-4 h-4 text-primary" />
 </div>
 </div>
 <Button 
 variant="primary" 
 className="w-full rounded-lg py-2 text-xs font-bold"
 onClick={() => navigate(`/chat/${appt.id}`)}
 >
 Start Chat
 </Button>
 </div>
 ))}
 </div>
 </Card>
 )}

 {/* AI Insights */}

 <Card>
 <CardHeader title="AI Insights" icon={Brain} />
 <div className="flex flex-col gap-4">
 {insights.length > 0 ? insights.map((insight) => (
 <div key={insight.id} className={`flex gap-3 p-3 rounded-xl border ${
 insight.type === 'warning' ? 'bg-orange-50 border-orange-100' :
 insight.type === 'success' ? 'bg-emerald-50 border-emerald-100' :
 'bg-blue-50 border-blue-100'
 }`}>
 {insight.type === 'warning' ? <AlertCircle className="w-5 h-5 text-orange-600 shrink-0" /> :
 insight.type === 'success' ? <TrendingUp className="w-5 h-5 text-emerald-600 shrink-0" /> :
 <Brain className="w-5 h-5 text-blue-600 shrink-0" />}
 <p className={`text-sm ${
 insight.type === 'warning' ? 'text-orange-800 ' :
 insight.type === 'success' ? 'text-emerald-800 ' :
 'text-blue-800 '
 }`}>
 {insight.content}
 </p>
 </div>
 )) : (
 <p className="text-sm text-slate-400 text-center py-4">No AI insights generated yet.</p>
 )}
 </div>
 <Button variant="outline" className="w-full mt-6 text-sm">
 View Detailed Analysis
 </Button>
 </Card>
 </div>
 </div>

 <LogMetricModal 
 isOpen={modalConfig.isOpen} 
 initialType={modalConfig.type}
 onClose={() => setModalConfig({ ...modalConfig, isOpen: false })} 
 onSave={() => {
 setModalConfig({ ...modalConfig, isOpen: false });
 setTimeout(fetchData, 500);
 }} 
 />

 </div>
 );
};


export default Dashboard;






