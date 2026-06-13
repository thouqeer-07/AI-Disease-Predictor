import React, { useState, useEffect, useCallback } from 'react';
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
  Alert
} from 'react-native';
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
  TrendingUp
} from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');

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
  const [doctorStats, setDoctorStats] = useState({ totalPatients: 0, todayAppointments: 0, pendingReviews: 0, experience: 0 });
  
  // Quick Log Modal State
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [activeLogType, setActiveLogType] = useState('water');
  const [logValue, setLogValue] = useState('');
  const [loggingStat, setLoggingStat] = useState(false);

  // 30-Day Lifestyle Logs State
  const [weeklyBehavioral, setWeeklyBehavioral] = useState([]);
  const [activeMetricTab, setActiveMetricTab] = useState('water');

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
        const { data: appts } = await supabase
          .from('appointments')
          .select('*')
          .eq('doctor_id', user.id)
          .order('appointment_date', { ascending: true });

        const currentAppts = appts || [];
        setAppointments(currentAppts);

        const meta = user.user_metadata || {};
        const todayStr = new Date().toISOString().split('T')[0];
        const todayAppts = currentAppts.filter(a => a.appointment_date?.startsWith(todayStr));
        const uniquePatients = new Set(currentAppts.map(a => a.user_id)).size;

        setDoctorStats({
          totalPatients: uniquePatients || 0,
          todayAppointments: todayAppts.length,
          pendingReviews: currentAppts.filter(a => a.status === 'pending' || a.status === 'upcoming').length,
          experience: meta.experience_years || 0
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
        day: new Date(t.recorded_at).toLocaleDateString('en-US', { day: 'numeric' }),
        month: new Date(t.recorded_at).toLocaleDateString('en-US', { month: 'short' }),
        score: t.score
      })) : [];
      setTrends(formattedTrends);

      // 4. Fetch Accepted Appointments
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

    } catch (error) {
      console.error('Error fetching mobile dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenLog = (type) => {
    setActiveLogType(type);
    setLogValue('');
    setLogModalOpen(true);
  };

  const handleSaveLog = async () => {
    if (!logValue || loggingStat) return;
    setLoggingStat(true);

    try {
      const { error } = await supabase.from('health_metrics').insert([
        {
          user_id: user.id,
          metric_type: activeLogType,
          value: { current: parseFloat(logValue) },
          recorded_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      setLogModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error logging metric:', error);
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
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchData}>
          <Activity size={24} color="#1d4ed8" />
        </TouchableOpacity>
      </View>

      {isDoctor ? (
        <>
          {/* Doctor Stats Grid */}
          <View style={styles.statsGrid}>
            <StatCard title="Total Patients" value={doctorStats.totalPatients} unit="" icon={Users} color="#1d4ed8" />
            <StatCard title="Today's Appts" value={doctorStats.todayAppointments} unit="" icon={Clock} color="#10b981" />
            <StatCard title="Pending Reports" value={doctorStats.pendingReviews} unit="" icon={FileText} color="#ea580c" />
            <StatCard title="Experience" value={doctorStats.experience} unit="Yrs" icon={TrendingUp} color="#4f46e5" />
          </View>

          {/* Doctor Appointments List */}
          <View style={styles.listCard}>
            <View style={styles.cardHeaderRow}>
              <Calendar size={20} color="#1d4ed8" />
              <Text style={styles.listCardTitle}>Upcoming Consultations</Text>
            </View>
            {appointments.length > 0 ? (
              appointments.map((appt) => (
                <View key={appt.id} style={styles.apptItem}>
                  <View style={styles.apptMain}>
                    <Text style={styles.apptName}>Patient: {appt.patient_name || 'Anonymous'}</Text>
                    <Text style={styles.apptDate}>
                      {new Date(appt.appointment_date).toLocaleDateString()} at {new Date(appt.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <View style={styles.statusRow}>
                      <Text style={[styles.apptStatusBadge, appt.status === 'accepted' ? styles.statusAccepted : styles.statusPending]}>
                        {appt.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.chatActionBtn} onPress={() => navigation.navigate('Chat', { appointmentId: appt.id })}>
                    <MessageSquare size={18} color="#1d4ed8" />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No appointments scheduled.</Text>
            )}
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
                <Text style={styles.sosBannerSubtitle}>Hold for 3s to alert guardians</Text>
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
              {/* Visual Dial Gauge Representation */}
              <View style={styles.dialOuter}>
                <View style={[styles.dialInner, { transform: [{ rotate: `${(dailyScore.score / 100) * 360}deg` }] }]}>
                  <View style={styles.dialPointer} />
                </View>
                <View style={styles.dialCenter}>
                  <Text style={styles.dialCenterText}>{dailyScore.score}</Text>
                </View>
              </View>
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
                      {new Date(appt.appointment_date).toLocaleDateString()} at {new Date(appt.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
        </>
      )}

      {/* Quick Log Modal */}
      <Modal visible={logModalOpen} transparent animationType="slide" onRequestClose={() => setLogModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Log {activeLogType.toUpperCase()}</Text>
            <Text style={styles.modalLabel}>Enter new activity stats below:</Text>
            
            <TextInput
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor="#94a3b8"
              value={logValue}
              onChangeText={setLogValue}
              style={styles.modalInput}
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setLogModalOpen(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleSaveLog} disabled={loggingStat}>
                <Text style={styles.modalSaveText}>{loggingStat ? 'Saving...' : 'Save Log'}</Text>
              </TouchableOpacity>
            </View>
          </View>
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
