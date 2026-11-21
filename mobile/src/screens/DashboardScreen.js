import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions, 
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Animated
} from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { 
  Activity, 
  Droplets, 
  Moon, 
  Footprints, 
  Flame, 
  Brain,
  Plus,
  Calendar,
  MessageSquare,
  AlertCircle,
  Users,
  ShieldAlert,
  Clock,
  FileText,
  TrendingUp,
  Bell,
  Video,
  X
} from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const CircularProgress = ({ score }) => {
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const size = 96;
  const strokeWidth = 9;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: Math.min(Math.max(score || 0, 0), 100),
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [score]);

  const strokeDashoffset = animatedProgress.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          {/* Background Track Circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255, 255, 255, 0.2)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Animated Progress Circle */}
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#ffffff"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </G>
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#fff', fontWeight: '900', fontSize: 24 }}>{score || 0}%</Text>
      </View>
    </View>
  );
};

const StatCard = ({ title, value, unit, icon: Icon, color, onAdd }) => (
  <View style={styles.statCard}>
    <View style={styles.statCardTop}>
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <Icon size={20} color={color} />
      </View>
      {onAdd ? (
        <TouchableOpacity onPress={onAdd} style={styles.addBtn}>
          <Plus size={16} color="#94a3b8" />
        </TouchableOpacity>
      ) : null}
    </View>
    <Text style={styles.statTitle}>{title}</Text>
    <View style={styles.statValueContainer}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statUnit}>{unit}</Text>
    </View>
  </View>
);

const DashboardScreen = ({ navigation }) => {
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({ water: '0', steps: '0', sleep: '0', calories: '0' });
  const [trends, setTrends] = useState([]);
  const [insights, setInsights] = useState([]);
  const [dailyScore, setDailyScore] = useState({ score: 0, label: 'No Data' });
  const [appointments, setAppointments] = useState([]);
  const [apptsModalOpen, setApptsModalOpen] = useState(false);
  const [doctorStats, setDoctorStats] = useState({ totalPatients: 0, todayAppointments: 0, pendingReviews: 0, experience: 0 });
  
  // Quick Log Modal State
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [activeLogType, setActiveLogType] = useState('water');
  const [logValues, setLogValues] = useState({ water: '', steps: '', sleep: '', calories: '' });
  const [loggingStat, setLoggingStat] = useState(false);

  // 30-Day Lifestyle Logs State
  const [weeklyBehavioral, setWeeklyBehavioral] = useState([]);
  const [activeMetricTab, setActiveMetricTab] = useState('water');
  const [lowStockMeds, setLowStockMeds] = useState([]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const role = user?.user_metadata?.role || 'patient';

    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      if (role === 'doctor') {
        const meta = user.user_metadata || {};
        if (!meta.bio || !meta.education) {
          navigation.replace('DoctorOnboarding');
          return;
        }

        const { data: rawAppts } = await supabase
          .from('appointments')
          .select('*')
          .eq('doctor_id', user.id)
          .order('appointment_date', { ascending: true });

        let currentAppts = rawAppts || [];
        const userIds = [...new Set(currentAppts.map(a => a.user_id).filter(Boolean))];
        if (userIds.length > 0) {
          const { data: profs } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', userIds);
          
          currentAppts = currentAppts.map(a => {
            const p = profs?.find(prof => prof.id === a.user_id);
            return {
              ...a,
              profiles: p ? { full_name: p.full_name } : { full_name: a.patient_name || 'Patient' }
            };
          });
        }
        setAppointments(currentAppts);

        const todayStr = new Date().toISOString().split('T')[0];
        const todayAppts = currentAppts.filter(a => a.appointment_date?.startsWith(todayStr));
        const uniquePatients = new Set(currentAppts.map(a => a.user_id)).size;

        setDoctorStats({
          totalPatients: uniquePatients || 0,
          todayAppointments: todayAppts.length,
          pendingReviews: currentAppts.filter(a => a.status === 'pending' || a.status === 'upcoming').length,
          completed: currentAppts.filter(a => a.status === 'completed').length
        });

        setLoading(false);
        return;
      }

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
      const stepsPct = Math.min(100, (todayMetrics.steps / 5000) * 100);
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
        day: new Date(t.recorded_at).toLocaleDateString('en-US', { day: 'numeric' }),
        month: new Date(t.recorded_at).toLocaleDateString('en-US', { month: 'short' }),
        score: t.score
      })) : [];
      setTrends(formattedTrends);

      // 4. Fetch All Appointments for User
      const { data: apptData } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', user.id)
        .order('appointment_date', { ascending: false });
      
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
        const dayLabel = d.toLocaleDateString('en-US', { day: 'numeric' });
        weeklyLogs.push({
          date: dateStr,
          day: dayLabel,
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

      // 7. Fetch Low Stock Medications
      const { data: medsData } = await supabase
        .from('medications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .lte('stock_count', 5);
      
      setLowStockMeds(medsData || []);

    } catch (error) {
      console.error('Error fetching mobile dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();

    const dashSub = supabase
      .channel('realtime:mobile_dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'health_metrics' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medications' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(dashSub);
    };
  }, [fetchData]);

  const handleOpenLog = (type) => {
    setActiveLogType(type);
    if (!logModalOpen) {
      setLogValues({ water: '', steps: '', sleep: '', calories: '' });
    }
    setLogModalOpen(true);
  };

  const handleSaveLog = async () => {
    if (loggingStat || !user) return;

    const METRIC_LIMITS = {
      sleep: { min: 0, max: 24, label: 'Sleep', unit: 'h' },
      water: { min: 0, max: 15, label: 'Water', unit: 'L' },
      steps: { min: 0, max: 100000, label: 'Steps', unit: 'steps' },
      calories: { min: 0, max: 10000, label: 'Calories', unit: 'kcal' }
    };

    for (const type of Object.keys(logValues)) {
      const valStr = logValues[type]?.trim();
      if (valStr && !isNaN(parseFloat(valStr))) {
        const num = parseFloat(valStr);
        const limit = METRIC_LIMITS[type];
        if (limit && (num < limit.min || num > limit.max)) {
          Alert.alert('Invalid Entry', `${limit.label} must be between ${limit.min} and ${limit.max} ${limit.unit}.`);
          return;
        }
      }
    }

    const recordsToInsert = [];
    const now = new Date().toISOString();

    Object.keys(logValues).forEach((type) => {
      const valStr = logValues[type]?.trim();
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
      Alert.alert('No Values Entered', 'Please enter a value for at least one metric.');
      return;
    }

    setLoggingStat(true);

    try {
      const { error } = await supabase.from('health_metrics').insert(recordsToInsert);

      if (error) throw error;

      setLogModalOpen(false);
      setLogValues({ water: '', steps: '', sleep: '', calories: '' });
      fetchData();
    } catch (error) {
      console.error('Error logging metrics:', error);
      Alert.alert('Error', 'Failed to log stats. Please try again.');
    } finally {
      setLoggingStat(false);
    }
  };

  const getMetricMax = (tab) => {
    if (tab === 'water') return 3.0; // 3 Liters
    if (tab === 'steps') return 12000; // 12,000 steps
    if (tab === 'sleep') return 10.0; // 10 hours
    return 3000; // 3,000 kcal
  };

  const getMetricColor = (tab) => {
    if (tab === 'water') return '#0284c7';
    if (tab === 'steps') return '#10b981';
    if (tab === 'sleep') return '#4f46e5';
    return '#ea580c';
  };

  const getMetricUnit = (tab) => {
    if (tab === 'water') return 'L';
    if (tab === 'steps') return '';
    if (tab === 'sleep') return 'h';
    return 'kcal';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1d4ed8" />
        <Text style={styles.loadingText}>Fetching portal data...</Text>
      </View>
    );
  }

  const role = user?.user_metadata?.role || 'patient';
  const isDoctor = role === 'doctor';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{isDoctor ? 'Doctor Portal' : 'Good Morning,'}</Text>
          <Text style={styles.userName}>
            {isDoctor ? `Dr. ${user?.user_metadata?.full_name || 'User'}` : (user?.user_metadata?.full_name || 'User')}
          </Text>
          {isDoctor && user?.user_metadata?.specialty && (
            <Text style={styles.doctorSpecialtyText}>
              {user.user_metadata.specialty} • {user.user_metadata.hospital_name || 'AuraHealth Partner'}
            </Text>
          )}
        </View>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          {!isDoctor && (
            <TouchableOpacity 
              style={[styles.refreshBtn, { position: 'relative' }]} 
              onPress={() => setApptsModalOpen(true)}
            >
              <Calendar size={22} color="#1d4ed8" />
              {appointments.length > 0 && (
                <View style={{
                  position: 'absolute', top: -4, right: -4, 
                  backgroundColor: '#1d4ed8', borderRadius: 10, minWidth: 18, height: 18, 
                  justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#f8fafc',
                  paddingHorizontal: 3
                }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{appointments.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {!isDoctor && lowStockMeds.length > 0 && (
            <TouchableOpacity 
              style={[styles.refreshBtn, { position: 'relative' }]} 
              onPress={() => {
                Alert.alert(
                  'Refill Alerts', 
                  `${lowStockMeds.length} medication(s) are running low. Please check the Refill Alerts section below.`
                );
              }}
            >
              <Bell size={22} color="#ea580c" />
              <View style={{
                position: 'absolute', top: -6, right: -6, 
                backgroundColor: '#ef4444', borderRadius: 10, width: 20, height: 20, 
                justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#f8fafc'
              }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{lowStockMeds.length}</Text>
              </View>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.refreshBtn} onPress={fetchData}>
            <Activity size={22} color="#1d4ed8" />
          </TouchableOpacity>
        </View>
      </View>

      {isDoctor ? (
        <>
          {/* Doctor Stats Grid */}
          <View style={styles.statsGrid}>
            <StatCard title="Total Patients" value={doctorStats.totalPatients} unit="" icon={Users} color="#1d4ed8" />
            <StatCard title="Today's Appts" value={doctorStats.todayAppointments} unit="" icon={Clock} color="#10b981" />
            <StatCard title="Pending Reports" value={doctorStats.pendingReviews} unit="" icon={FileText} color="#ea580c" />
            <StatCard title="Completed" value={doctorStats.completed} unit="" icon={TrendingUp} color="#4f46e5" />
          </View>

        </>
      ) : (
        <>
          {/* Emergency SOS Banner */}
          <TouchableOpacity 
            style={styles.sosBanner} 
            onPress={() => navigation.navigate('EmergencySOS')}
          >
            <View style={styles.sosBannerLeft}>
              <View style={styles.sosBannerIconContainer}>
                <ShieldAlert size={20} color="#fff" />
              </View>
              <View style={styles.sosBannerTextContainer}>
                <Text style={styles.sosBannerTitle}>EMERGENCY SOS</Text>
                <Text style={styles.sosBannerSubtitle}>Double tap to alert guardians</Text>
              </View>
            </View>
            <View style={styles.sosBannerRight}>
              <Text style={styles.sosBannerActionText}>Trigger</Text>
            </View>
          </TouchableOpacity>

          {/* Health Score Circular Dial */}
          <View style={styles.scoreCard}>
            <View style={styles.scoreInfo}>
              <Text style={styles.scoreTitle}>Health Score</Text>
              <Text style={styles.scoreDesc}>{dailyScore.label}</Text>
              <Text style={styles.scoreValue}>{dailyScore.score}%</Text>
            </View>
            <View style={styles.dialContainer}>
              <CircularProgress score={dailyScore.score} />
            </View>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <StatCard title="Water" value={metrics.water} unit="L" icon={Droplets} color="#0284c7" onAdd={() => handleOpenLog('water')} />
            <StatCard title="Steps" value={Number(metrics.steps).toLocaleString()} unit="" icon={Footprints} color="#1d4ed8" onAdd={() => handleOpenLog('steps')} />
            <StatCard title="Sleep" value={metrics.sleep} unit="h" icon={Moon} color="#4f46e5" onAdd={() => handleOpenLog('sleep')} />
            <StatCard title="Calories" value={Number(metrics.calories).toLocaleString()} unit="kcal" icon={Flame} color="#ea580c" onAdd={() => handleOpenLog('calories')} />
          </View>

          {/* Health Trends Graph (Custom Native Scrollable sparkline graph) */}
          <View style={styles.trendsCard}>
            <Text style={styles.trendsTitle}>30-Day Health Trends</Text>
            <Text style={styles.trendsSubtitle}>Daily score performance breakdown</Text>
            {trends.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartScroll}>
                {trends.map((t, i) => (
                  <View key={i} style={styles.barCol}>
                    <View style={styles.barOuter}>
                      <View style={[styles.barInner, { height: `${t.score}%`, backgroundColor: t.score > 70 ? '#10b981' : t.score > 40 ? '#1d4ed8' : '#ef4444' }]} />
                    </View>
                    <Text style={styles.barLabel}>{t.day}</Text>
                    <Text style={styles.barLabelSub}>{t.month}</Text>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.emptyText}>No historic scores logged yet. Start quick logging stats!</Text>
            )}
          </View>

          {/* Lifestyle & Behavioral Trends Graph (Toggled Category bar chart) */}
          <View style={styles.trendsCard}>
            <View style={styles.chartHeader}>
              <View>
                <Text style={styles.trendsTitle}>Lifestyle Trends</Text>
                <Text style={styles.trendsSubtitle}>30-day activity tracking</Text>
              </View>
              <View style={styles.tabBar}>
                {['water', 'steps', 'sleep', 'calories'].map(tab => (
                  <TouchableOpacity 
                    key={tab} 
                    style={[styles.tabButton, activeMetricTab === tab && styles.tabButtonActive]}
                    onPress={() => setActiveMetricTab(tab)}
                  >
                    <Text style={[styles.tabBtnText, activeMetricTab === tab && styles.tabBtnTextActive]}>{tab[0].toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            {weeklyBehavioral.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartScroll}>
                {weeklyBehavioral.map((b, i) => {
                  const val = b[activeMetricTab] || 0;
                  const max = getMetricMax(activeMetricTab);
                  const heightPct = Math.min(100, (val / max) * 100);
                  return (
                    <View key={i} style={styles.barCol}>
                      <View style={styles.barOuter}>
                        <View style={[styles.barInner, { height: `${heightPct}%`, backgroundColor: getMetricColor(activeMetricTab) }]} />
                      </View>
                      <Text style={styles.barLabel}>{b.day}</Text>
                      <Text style={[styles.barValueLabel, { color: getMetricColor(activeMetricTab) }]}>{parseFloat(val.toFixed(1))}</Text>
                    </View>
                  );
                })}
              </ScrollView>
            ) : (
              <Text style={styles.emptyText}>No behavioral data available.</Text>
            )}
          </View>

          {/* Consultations Card */}
          {appointments.length > 0 && (
            <View style={styles.listCard}>
              <View style={styles.cardHeaderRow}>
                <Calendar size={20} color="#1d4ed8" />
                <Text style={styles.listCardTitle}>Upcoming Consultations</Text>
              </View>
              {appointments.map((appt) => (
                <View key={appt.id} style={styles.apptItem}>
                  <View style={styles.apptMain}>
                    <Text style={styles.apptName}>Dr. {appt.doctor_name}</Text>
                    <Text style={styles.apptDate}>
                      {new Date(appt.appointment_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.chatActionBtn} onPress={() => navigation.navigate('Chat', { appointmentId: appt.id })}>
                    <MessageSquare size={18} color="#1d4ed8" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* AI Insights Card */}
          <View style={styles.listCard}>
            <View style={styles.cardHeaderRow}>
              <Brain size={20} color="#1d4ed8" />
              <Text style={styles.listCardTitle}>AI Insights</Text>
            </View>
            {insights.length > 0 ? insights.map((insight) => (
              <View key={insight.id} style={[
                styles.insightRow, 
                insight.type === 'warning' && styles.insightRowWarning,
                insight.type === 'success' && styles.insightRowSuccess
              ]}>
                <AlertCircle size={18} color={insight.type === 'warning' ? '#ea580c' : insight.type === 'success' ? '#10b981' : '#1d4ed8'} />
                <Text style={[
                  styles.insightText,
                  insight.type === 'warning' && styles.insightTextWarning,
                  insight.type === 'success' && styles.insightTextSuccess
                ]}>{insight.content}</Text>
              </View>
            )) : (
              <Text style={styles.emptyText}>No AI recommendations logged today.</Text>
            )}
          </View>

          {/* Refill Alerts Card */}
          {lowStockMeds.length > 0 && (
            <View style={[styles.listCard, { borderColor: '#ffedd5', backgroundColor: '#fff7ed', borderWidth: 1 }]}>
              <View style={styles.cardHeaderRow}>
                <AlertCircle size={20} color="#ea580c" />
                <Text style={[styles.listCardTitle, { color: '#ea580c' }]}>Refill Alerts</Text>
              </View>
              {lowStockMeds.map((med) => (
                <View key={med.id} style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderColor: '#ffedd5', borderWidth: 1 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#7c2d12' }}>{med.name}</Text>
                    <Text style={{ fontSize: 12, color: '#c2410c', marginTop: 2, fontWeight: '600' }}>{med.stock_count} doses remaining</Text>
                  </View>
                  <TouchableOpacity 
                    style={{ backgroundColor: '#ea580c', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}
                    onPress={async () => {
                      try {
                        const { error } = await supabase
                          .from('medications')
                          .update({ stock_count: med.stock_count + 30 })
                          .eq('id', med.id);
                        if (error) throw error;
                        fetchData();
                      } catch (err) {
                        console.error('Error adding stock:', err.message);
                      }
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>+30 Stock</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

        </>
      )}

      {/* Quick Log Modal */}
      <Modal visible={logModalOpen} transparent animationType="slide" onRequestClose={() => setLogModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Quick Log Health Stats</Text>
            <Text style={styles.modalLabel}>Select metric tab below to log multiple stats at once:</Text>
            
            {/* Metric Selector Tabs */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 14 }}>
              {[
                { id: 'water', label: 'Water', unit: 'L' },
                { id: 'steps', label: 'Steps', unit: '' },
                { id: 'sleep', label: 'Sleep', unit: 'h' },
                { id: 'calories', label: 'Calories', unit: 'kcal' }
              ].map((m) => {
                const val = logValues[m.id]?.trim();
                const hasVal = val !== '' && !isNaN(parseFloat(val));
                const isActive = activeLogType === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => setActiveLogType(m.id)}
                    style={{
                      flex: 1,
                      marginHorizontal: 3,
                      paddingVertical: 10,
                      borderRadius: 12,
                      alignItems: 'center',
                      borderWidth: 2,
                      borderColor: isActive ? '#1d4ed8' : '#f1f5f9',
                      backgroundColor: isActive ? '#eff6ff' : '#f8fafc',
                      position: 'relative'
                    }}
                  >
                    {hasVal && (
                      <View style={{ position: 'absolute', top: -4, right: -4, backgroundColor: '#10b981', borderRadius: 8, paddingHorizontal: 4, paddingVertical: 1 }}>
                        <Text style={{ color: '#fff', fontSize: 9, fontWeight: 'bold' }}>✓</Text>
                      </View>
                    )}
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: isActive ? '#1d4ed8' : '#64748b' }}>{m.label}</Text>
                    {hasVal && (
                      <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#10b981', marginTop: 2 }}>{val} {m.unit}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {(() => {
              const maxLimits = { sleep: 24, water: 15, steps: 100000, calories: 10000 };
              const currentVal = parseFloat(logValues[activeLogType] || '0');
              const maxVal = maxLimits[activeLogType] || 24;
              const isInvalid = currentVal < 0 || currentVal > maxVal;

              return (
                <>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#475569' }}>
                      Enter {activeLogType.toUpperCase()} ({getMetricUnit(activeLogType) || 'count'}):
                    </Text>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#94a3b8' }}>
                      Max: {maxVal} {getMetricUnit(activeLogType)}
                    </Text>
                  </View>

                  <TextInput
                    keyboardType="numeric"
                    placeholder="0.00"
                    placeholderTextColor="#94a3b8"
                    value={logValues[activeLogType] || ''}
                    onChangeText={(val) => setLogValues(prev => ({ ...prev, [activeLogType]: val }))}
                    style={[
                      styles.modalInput,
                      isInvalid && { borderColor: '#ef4444', borderWidth: 2 }
                    ]}
                  />

                  {isInvalid && (
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#ef4444', marginTop: -8, marginBottom: 12 }}>
                      ⚠️ {activeLogType.toUpperCase()} must be between 0 and {maxVal} {getMetricUnit(activeLogType)}.
                    </Text>
                  )}
                </>
              );
            })()}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setLogModalOpen(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleSaveLog} disabled={loggingStat}>
                <Text style={styles.modalSaveText}>
                  {loggingStat 
                    ? 'Saving...' 
                    : Object.values(logValues).filter(v => v.trim() !== '' && !isNaN(parseFloat(v))).length > 1 
                    ? `Save All (${Object.values(logValues).filter(v => v.trim() !== '' && !isNaN(parseFloat(v))).length})` 
                    : 'Save Log'
                  }
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Scheduled Doctor Appointments Modal */}
      <Modal
        visible={apptsModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setApptsModalOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#fff' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center' }}>
                <Calendar size={20} color="#1d4ed8" />
              </View>
              <View>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#0f172a' }}>Scheduled Appointments</Text>
                <Text style={{ fontSize: 12, color: '#64748b' }}>Track your consultations and status</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setApptsModalOpen(false)} style={{ padding: 6 }}>
              <X size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
            {appointments.length > 0 ? (
              appointments.map((appt) => {
                const apptDateObj = new Date(appt.appointment_date || appt.created_at || Date.now());
                const dayNum = apptDateObj.getDate();
                const monthShort = apptDateObj.toLocaleString('default', { month: 'short' }).toUpperCase();
                const timeFormatted = apptDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const docDisplayName = appt.doctor_name || 'Specialist Doctor';

                return (
                  <View key={appt.id} style={{ backgroundColor: '#fff', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#f1f5f9', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }}>
                    <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                      <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#dbeafe' }}>
                        <Text style={{ fontSize: 24, fontWeight: '900', color: '#1d4ed8' }}>{dayNum}</Text>
                        <Text style={{ fontSize: 10, fontWeight: '900', color: '#1d4ed8', letterSpacing: 1 }}>{monthShort}</Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0f172a' }}>Consultation with {docDisplayName}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          <Clock size={14} color="#64748b" />
                          <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '600' }}>{timeFormatted}</Text>
                          <Text style={{ color: '#cbd5e1' }}>•</Text>
                          <Video size={14} color="#64748b" />
                          <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '600' }}>Tele-Consultation</Text>
                        </View>

                        <View style={{ marginTop: 8, flexDirection: 'row' }}>
                          <View style={[
                            { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
                            appt.status === 'accepted' ? { backgroundColor: '#d1fae5' } :
                            appt.status === 'rejected' ? { backgroundColor: '#ffe4e6' } :
                            appt.status === 'completed' ? { backgroundColor: '#dbeafe' } :
                            { backgroundColor: '#fef3c7' }
                          ]}>
                            <Text style={[
                              { fontSize: 10, fontWeight: 'bold' },
                              appt.status === 'accepted' ? { color: '#059669' } :
                              appt.status === 'rejected' ? { color: '#e11d48' } :
                              appt.status === 'completed' ? { color: '#1d4ed8' } :
                              { color: '#d97706' }
                            ]}>
                              {appt.status.toUpperCase()}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f8fafc' }}>
                      {appt.status === 'accepted' ? (
                        <TouchableOpacity 
                          style={{ backgroundColor: '#2563eb', height: 44, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                          onPress={() => {
                            setApptsModalOpen(false);
                            navigation.navigate('ConsultationChat', { appointmentId: appt.id });
                          }}
                        >
                          <MessageSquare size={16} color="#fff" style={{ marginRight: 6 }} />
                          <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>Join Chat</Text>
                        </TouchableOpacity>
                      ) : (
                        <Text style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
                          {appt.status === 'pending' ? 'Waiting for doctor approval to connect chat' : `Status: ${appt.status}`}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Calendar size={40} color="#cbd5e1" style={{ marginBottom: 12 }} />
                <Text style={{ fontSize: 14, color: '#94a3b8', textAlign: 'center' }}>No scheduled doctor appointments found.</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting: { fontSize: 16, color: '#64748b' },
  userName: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  refreshBtn: { padding: 8, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  scoreCard: { backgroundColor: '#1d4ed8', borderRadius: 24, padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  scoreInfo: { flex: 1 },
  scoreTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 16 },
  scoreDesc: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginVertical: 4 },
  scoreValue: { color: '#fff', fontSize: 36, fontWeight: '900' },
  dialContainer: { width: 90, height: 90, justifyContent: 'center', alignItems: 'center' },
  dialOuter: { width: 80, height: 80, borderRadius: 40, borderWidth: 6, borderColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  dialInner: { position: 'absolute', width: 68, height: 68, justifyContent: 'center', alignItems: 'center' },
  dialPointer: { position: 'absolute', top: -3, width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  dialCenter: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#1e40af', justifyContent: 'center', alignItems: 'center' },
  dialCenterText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  statCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, width: (width - 52) / 2, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
  statCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  iconContainer: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  addBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
  statTitle: { fontSize: 14, color: '#64748b', marginBottom: 4 },
  statValueContainer: { flexDirection: 'row', alignItems: 'baseline' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  statUnit: { fontSize: 12, color: '#94a3b8', marginLeft: 4 },
  trendsCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
  trendsTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  trendsSubtitle: { fontSize: 12, color: '#64748b', marginTop: 4, marginBottom: 16 },
  chartScroll: { paddingBottom: 4 },
  barCol: { width: 32, alignItems: 'center', marginRight: 16 },
  barOuter: { height: 120, width: 10, backgroundColor: '#f1f5f9', borderRadius: 5, justifyContent: 'flex-end', overflow: 'hidden' },
  barInner: { width: 10, borderRadius: 5 },
  barLabel: { fontSize: 11, fontWeight: 'bold', color: '#64748b', marginTop: 8 },
  barLabelSub: { fontSize: 9, color: '#94a3b8' },
  barValueLabel: { fontSize: 9, fontWeight: 'bold', marginTop: 4 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  tabBar: { flexDirection: 'row', gap: 4, backgroundColor: '#f1f5f9', padding: 2, borderRadius: 8 },
  tabButton: { width: 26, height: 26, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  tabButtonActive: { backgroundColor: '#fff', elevation: 1 },
  tabBtnText: { fontSize: 11, fontWeight: 'bold', color: '#64748b' },
  tabBtnTextActive: { color: '#1d4ed8' },
  listCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  listCardTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  apptItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: 14, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  apptMain: { flex: 1 },
  apptName: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  apptDate: { fontSize: 12, color: '#64748b', marginTop: 4 },
  chatActionBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  insightRow: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: '#eff6ff', padding: 14, borderRadius: 16, marginBottom: 12 },
  insightRowWarning: { backgroundColor: '#fff7ed' },
  insightRowSuccess: { backgroundColor: '#f0fdf4' },
  insightText: { fontSize: 14, color: '#1e3a8a', flex: 1, fontWeight: '500', lineHeight: 20 },
  insightTextWarning: { color: '#7c2d12' },
  insightTextSuccess: { color: '#065f46' },
  emptyText: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginVertical: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  loadingText: { fontSize: 16, color: '#64748b', marginTop: 12 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.4)' },
  modalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 24, width: width - 40, elevation: 10 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginBottom: 6 },
  modalLabel: { fontSize: 14, color: '#64748b', marginBottom: 16 },
  modalInput: { backgroundColor: '#f8fafc', borderRadius: 16, height: 56, fontSize: 20, fontWeight: 'bold', paddingHorizontal: 20, color: '#0f172a', borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 20, textAlign: 'center' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  modalCancel: { flex: 1, height: 50, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  modalCancelText: { fontSize: 15, fontWeight: 'bold', color: '#64748b' },
  modalSave: { flex: 1, height: 50, borderRadius: 12, backgroundColor: '#1d4ed8', alignItems: 'center', justifyContent: 'center' },
  modalSaveText: { fontSize: 15, fontWeight: 'bold', color: '#fff' },
  doctorSpecialtyText: { fontSize: 13, color: '#94a3b8', marginTop: 4, fontWeight: '500' },
  statusRow: { flexDirection: 'row', marginTop: 6 },
  apptStatusBadge: { fontSize: 10, fontWeight: 'bold', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' },
  statusAccepted: { backgroundColor: '#f0fdf4', color: '#10b981' },
  statusPending: { backgroundColor: '#fef2f2', color: '#ef4444' },
  sosBanner: { backgroundColor: '#fef2f2', borderRadius: 20, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#fee2e2', marginBottom: 20, elevation: 2, shadowColor: '#ef4444', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 },
  sosBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sosBannerIconContainer: { backgroundColor: '#ef4444', width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sosBannerTextContainer: {},
  sosBannerTitle: { fontSize: 13, fontWeight: '900', color: '#ef4444', letterSpacing: 0.5 },
  sosBannerSubtitle: { fontSize: 11, color: '#b91c1c', marginTop: 2, opacity: 0.7, fontWeight: '500' },
  sosBannerRight: { backgroundColor: '#fee2e2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  sosBannerActionText: { color: '#ef4444', fontSize: 11, fontWeight: 'bold' }
});

export default DashboardScreen;
