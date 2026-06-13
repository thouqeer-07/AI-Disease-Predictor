import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView, 
  ActivityIndicator, 
  Alert, 
  Platform, 
  Dimensions 
} from 'react-native';
import { 
  Brain, 
  Activity, 
  TrendingUp, 
  Droplets, 
  Zap, 
  Moon, 
  CheckCircle2, 
  ArrowRight, 
  AlertCircle 
} from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useSelector } from 'react-redux';

const { width } = Dimensions.get('window');

const AIPredictionScreen = () => {
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
        if (log.metric_type === 'water') logsByDate[date].water_ml += (val * 1000); // L to ml for display
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

    const API_URL = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://localhost:5000/api');

    try {
      const response = await fetch(`${API_URL}/ai/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          symptoms,
          behavioralData: behavioralData
        }),
      });

      if (!response.ok) throw new Error('Failed to fetch prediction');
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Prediction failed:', error);
      Alert.alert('Prediction Error', 'Could not connect to the diagnostic engine. Please make sure the backend server is running.');
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
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Section */}
        <View style={styles.header}>
          <View>
            <View style={styles.titleRow}>
              <Brain size={32} color="#1d4ed8" />
              <Text style={styles.title}>AI Diagnostic Hub</Text>
            </View>
            <Text style={styles.subtitle}>Symptom analysis and lifestyle diagnostics</Text>
          </View>
        </View>

        {/* 7-Day Lifestyle Context Card */}
        <View style={styles.contextCard}>
          <View style={styles.contextHeader}>
            <TrendingUp size={18} color="#1d4ed8" />
            <Text style={styles.contextTitle}>7-Day Context Summary</Text>
          </View>
          <View style={styles.contextGrid}>
            <View style={styles.contextItem}>
              <View style={[styles.contextIconContainer, { backgroundColor: '#ffedd5' }]}>
                <Zap size={16} color="#ea580c" />
              </View>
              <Text style={styles.contextLabel}>Steps</Text>
              <Text style={styles.contextVal}>{averages.steps.toLocaleString()}</Text>
            </View>

            <View style={styles.contextItem}>
              <View style={[styles.contextIconContainer, { backgroundColor: '#e0f2fe' }]}>
                <Droplets size={16} color="#0284c7" />
              </View>
              <Text style={styles.contextLabel}>Water</Text>
              <Text style={styles.contextVal}>{averages.water} ml</Text>
            </View>

            <View style={styles.contextItem}>
              <View style={[styles.contextIconContainer, { backgroundColor: '#e0e7ff' }]}>
                <Moon size={16} color="#4f46e5" />
              </View>
              <Text style={styles.contextLabel}>Sleep</Text>
              <Text style={styles.contextVal}>{averages.sleep} h</Text>
            </View>
          </View>
        </View>

        {/* Symptom Description Area */}
        <View style={styles.inputCard}>
          <Text style={styles.sectionTitle}>Describe Your Symptoms</Text>
          <TextInput
            multiline
            numberOfLines={6}
            placeholder="e.g. Sharp headache behind eyes, sensitivity to light, and slight nausea since morning..."
            placeholderTextColor="#94a3b8"
            style={styles.textInput}
            value={symptoms}
            onChangeText={setSymptoms}
          />
          <TouchableOpacity 
            style={[styles.predictBtn, (!symptoms.trim() || loading) && styles.predictBtnDisabled]}
            disabled={!symptoms.trim() || loading}
            onPress={handlePredict}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text style={styles.predictBtnText}>Analyze Conditions</Text>
                <ArrowRight size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Results podium */}
        {result && (
          <View style={styles.resultsContainer}>
            <Text style={styles.sectionTitle}>Top 3 Potential Conditions</Text>
            {result.topPredictions?.map((p, i) => (
              <View key={i} style={[styles.predictionRow, i === 0 && styles.predictionRowPrimary]}>
                <View style={styles.predictionLeft}>
                  <View style={[styles.rankBadge, i === 0 ? styles.rankBadgePrimary : styles.rankBadgeSecondary]}>
                    <Text style={[styles.rankText, i === 0 && styles.rankTextPrimary]}>{i + 1}</Text>
                  </View>
                  <Text style={[styles.conditionName, i === 0 && styles.conditionNamePrimary]}>{p.condition}</Text>
                </View>
                <Text style={[styles.probability, i === 0 && styles.probabilityPrimary]}>{p.probability}</Text>
              </View>
            ))}

            {/* Clinical Briefing */}
            {result.topExplanation && (
              <View style={styles.briefingCard}>
                <View style={styles.briefingHeader}>
                  <Activity size={20} color="#1d4ed8" />
                  <Text style={styles.briefingTitle}>Clinical Briefing</Text>
                </View>
                <Text style={styles.briefingText}>"{result.topExplanation}"</Text>
              </View>
            )}

            {/* Actionable Recommendations */}
            {result.recommendations && (
              <View style={styles.recContainer}>
                <Text style={styles.sectionTitle}>Actionable Advice</Text>
                {result.recommendations.map((r, i) => (
                  <View key={i} style={styles.recRow}>
                    <CheckCircle2 size={20} color="#10b981" />
                    <Text style={styles.recText}>{r}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* AI Disclaimer */}
        <View style={styles.disclaimer}>
          <AlertCircle size={20} color="#b45309" />
          <Text style={styles.disclaimerText}>
            AI Analysis Disclaimer: These insights are based on pattern recognition from behavioral and symptom logs. They are for educational purposes and do not constitute formal medical advice.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  contextCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, borderStyle: 'solid', borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  contextHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  contextTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  contextGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  contextItem: { alignItems: 'center', flex: 1 },
  contextIconContainer: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  contextLabel: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  contextVal: { fontSize: 14, fontWeight: 'bold', color: '#0f172a' },
  inputCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, borderStyle: 'solid', borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 16 },
  textInput: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, fontSize: 16, color: '#0f172a', minHeight: 120, textAlignVertical: 'top', borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16 },
  predictBtn: { backgroundColor: '#1d4ed8', height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, elevation: 4, shadowColor: '#1d4ed8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  predictBtnDisabled: { opacity: 0.7 },
  predictBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  resultsContainer: { marginBottom: 20 },
  predictionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderStyle: 'solid', borderWidth: 1, borderColor: '#f1f5f9' },
  predictionRowPrimary: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  predictionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  rankBadge: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rankBadgePrimary: { backgroundColor: '#1d4ed8' },
  rankBadgeSecondary: { backgroundColor: '#e2e8f0' },
  rankText: { fontSize: 14, fontWeight: 'bold', color: '#64748b' },
  rankTextPrimary: { color: '#fff' },
  conditionName: { fontSize: 16, fontWeight: 'bold', color: '#64748b', flex: 1 },
  conditionNamePrimary: { color: '#1e3a8a' },
  probability: { fontSize: 16, fontWeight: 'bold', color: '#64748b' },
  probabilityPrimary: { color: '#1d4ed8', fontWeight: 'bold' },
  briefingCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, borderStyle: 'solid', borderWidth: 1, borderColor: '#f1f5f9', marginTop: 8, marginBottom: 20, borderLeftWidth: 4, borderLeftColor: '#1d4ed8', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  briefingHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  briefingTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  briefingText: { fontSize: 15, color: '#334155', lineHeight: 22, fontStyle: 'italic' },
  recContainer: { marginBottom: 20 },
  recRow: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, borderStyle: 'solid', borderWidth: 1, borderColor: '#f1f5f9' },
  recText: { fontSize: 15, fontWeight: 'bold', color: '#0f172a', flex: 1 },
  disclaimer: { backgroundColor: '#fef3c7', borderRadius: 16, padding: 16, flexDirection: 'row', gap: 12, borderStyle: 'solid', borderWidth: 1, borderColor: '#fde68a' },
  disclaimerText: { fontSize: 12, color: '#b45309', flex: 1, fontWeight: '600', lineHeight: 18 }
});

export default AIPredictionScreen;
