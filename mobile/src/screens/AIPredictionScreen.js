import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  Alert, 
  Platform, 
  Dimensions,
  Modal,
  FlatList
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
  AlertCircle,
  Search,
  X,
  Plus,
  ChevronDown
} from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useSelector } from 'react-redux';
import { fetchApiWithFallback } from '../lib/api';

const { width } = Dimensions.get('window');

const CANONICAL_SYMPTOMS = [
  // Core Dataset Symptoms
  "Blurred Vision", "Cold Hands and Feet", "Cough", "Dark Urine", "Daytime Sleepiness", 
  "Difficulty Falling Asleep", "Dizziness", "Dry Mouth", "Extreme Thirst", "Facial Pain", 
  "Fatigue", "Fever", "Frequent Urination", "Headache", "Increased Thirst", 
  "Irritability", "Nasal Congestion", "Nausea", "Pale Skin", "Reduced Sense of Smell", 
  "Runny Nose", "Sensitivity to Light", "Severe Headache", "Shortness of Breath", 
  "Sore Throat", "Throbbing Head", "Vomiting", "Waking up frequently", "Weakness", "Weight Loss",
  // Expanded Clinical Symptoms
  "Sneezing", "Wheezing", "Loss of Taste", "Hoarseness", "Ear Pressure",
  "Chills", "Night Sweats", "Body Aches", "Muscle Pain", "Joint Pain", "Swollen Lymph Nodes",
  "Abdominal Pain", "Loss of Appetite", "Diarrhea", "Constipation", "Bloating",
  "Brain Fog", "Neck Stiffness", "Scalp Sensitivity", "Chest Pain", "Rapid Heartbeat", "Fainting",
  "Restlessness", "Anxiety", "Morning Exhaustion"
];

const POPULAR_SYMPTOMS = ["Fever", "Headache", "Fatigue", "Cough", "Sore Throat", "Nausea"];

const SYMPTOM_FRIENDLY_MAP = {
  "Diarrhea": "Loose Motion / Watery Stools",
  "Nausea": "Feeling Sick / Vomiting Sensation",
  "Fatigue": "Extreme Tiredness / Low Energy",
  "Fever": "High Temperature / Chills",
  "Cough": "Dry or Wet Cough",
  "Runny Nose": "Excess Mucus / Nasal Discharge",
  "Sore Throat": "Pain When Swallowing",
  "Nasal Congestion": "Blocked Nose",
  "Shortness of Breath": "Difficulty Breathing",
  "Headache": "Head Pain",
  "Severe Headache": "Intense Head Pain",
  "Throbbing Head": "Pulsating Headache",
  "Dizziness": "Lightheadedness / Unsteadiness",
  "Blurred Vision": "Unclear / Hazy Sight",
  "Cold Hands and Feet": "Chilly Extremities",
  "Dark Urine": "Concentrated / Deep Yellow Urine",
  "Daytime Sleepiness": "Drowsiness During Day",
  "Difficulty Falling Asleep": "Trouble Sleeping / Insomnia",
  "Dry Mouth": "Lack of Saliva",
  "Extreme Thirst": "Unquenchable Thirst",
  "Increased Thirst": "Drinking More Water Than Usual",
  "Facial Pain": "Sinus Pain / Cheek Pressure",
  "Frequent Urination": "Peeing Very Often",
  "Irritability": "Mood Swings / Easily Annoyed",
  "Pale Skin": "Loss of Normal Skin Color",
  "Reduced Sense of Smell": "Loss of Smell / Anosmia",
  "Sensitivity to Light": "Eye Discomfort in Light",
  "Vomiting": "Throwing Up",
  "Waking up frequently": "Broken Sleep",
  "Weakness": "Lack of Physical Strength",
  "Weight Loss": "Unintended Loss of Weight",
  "Sneezing": "Frequent Sneezes",
  "Wheezing": "Whistling Sound When Breathing",
  "Loss of Taste": "Inability to Taste Food",
  "Hoarseness": "Raspy or Scratchy Voice",
  "Ear Pressure": "Fullness in Ears",
  "Chills": "Cold Shivering",
  "Night Sweats": "Excessive Sweating While Sleeping",
  "Body Aches": "General Muscle Soreness",
  "Muscle Pain": "Myalgia / Sore Muscles",
  "Joint Pain": "Stiff or Aching Joints",
  "Swollen Lymph Nodes": "Swollen Glands in Neck",
  "Abdominal Pain": "Stomach Ache / Stomach Pain",
  "Loss of Appetite": "Not Feeling Hungry",
  "Constipation": "Difficulty Passing Stool",
  "Bloating": "Swollen / Gassy Stomach",
  "Brain Fog": "Lack of Focus / Mental Fatigue",
  "Neck Stiffness": "Hard to Turn Neck",
  "Scalp Sensitivity": "Tender Scalp",
  "Chest Pain": "Tightness / Pain in Chest",
  "Rapid Heartbeat": "Heart Palpitations",
  "Fainting": "Blackout / Loss of Consciousness",
  "Restlessness": "Unable to Sit Still",
  "Anxiety": "Nervousness / Worry",
  "Morning Exhaustion": "Waking Up Tired"
};

const getSymptomLabel = (symptom) => {
  const friendly = SYMPTOM_FRIENDLY_MAP[symptom];
  return friendly ? `${symptom} (${friendly})` : symptom;
};

const SYMPTOM_CATEGORY_MAP = {
  "Cough": "Respiratory", "Runny Nose": "Respiratory", "Sore Throat": "Respiratory", "Nasal Congestion": "Respiratory", "Shortness of Breath": "Respiratory", "Sneezing": "Respiratory", "Wheezing": "Respiratory", "Loss of Taste": "Respiratory", "Hoarseness": "Respiratory", "Reduced Sense of Smell": "Respiratory",
  "Headache": "Neurological", "Severe Headache": "Neurological", "Throbbing Head": "Neurological", "Dizziness": "Neurological", "Sensitivity to Light": "Neurological", "Facial Pain": "Neurological", "Brain Fog": "Neurological", "Neck Stiffness": "Neurological", "Scalp Sensitivity": "Neurological",
  "Fatigue": "Systemic", "Fever": "Systemic", "Weakness": "Systemic", "Pale Skin": "Systemic", "Cold Hands and Feet": "Systemic", "Weight Loss": "Systemic", "Chills": "Systemic", "Night Sweats": "Systemic", "Body Aches": "Systemic", "Muscle Pain": "Systemic", "Joint Pain": "Systemic", "Swollen Lymph Nodes": "Systemic",
  "Nausea": "Digestive", "Vomiting": "Digestive", "Dry Mouth": "Digestive", "Extreme Thirst": "Digestive", "Increased Thirst": "Digestive", "Frequent Urination": "Digestive", "Dark Urine": "Digestive", "Blurred Vision": "Digestive", "Abdominal Pain": "Digestive", "Loss of Appetite": "Digestive", "Diarrhea": "Digestive", "Constipation": "Digestive", "Bloating": "Digestive",
  "Chest Pain": "Urgent", "Rapid Heartbeat": "Urgent", "Fainting": "Urgent",
  "Daytime Sleepiness": "Sleep & Mood", "Difficulty Falling Asleep": "Sleep & Mood", "Waking up frequently": "Sleep & Mood", "Irritability": "Sleep & Mood", "Restlessness": "Sleep & Mood", "Anxiety": "Sleep & Mood", "Morning Exhaustion": "Sleep & Mood"
};

const AIPredictionScreen = () => {
  const { user } = useSelector((state) => state.auth);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdownModal, setShowDropdownModal] = useState(false);
  const [customText, setCustomText] = useState('');
  const scrollViewRef = useRef(null);

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

  const toggleSymptom = (symptom) => {
    if (selectedSymptoms.includes(symptom)) {
      setSelectedSymptoms(selectedSymptoms.filter(s => s !== symptom));
    } else {
      setSelectedSymptoms([...selectedSymptoms, symptom]);
    }
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

    if (selectedSymptoms.length === 1 && !customText.trim()) {
      Alert.alert('Notes Required', 'When selecting only one symptom, providing additional notes/details is required for an accurate AI prediction.');
      return;
    }

    const symptomsQuery = combinedList.join(', ');

    setLoading(true);
    setResult(null);

    try {
      const data = await fetchApiWithFallback('/ai/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          symptoms: symptomsQuery,
          behavioralData: behavioralData,
          userId: user?.id,
          userName: user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0],
          userEmail: user?.email,
          notes: customText.trim() || null
        }),
      });

      setResult(data);

      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Prediction failed:', error);
      Alert.alert('Prediction Error', error.message || 'Could not connect to the diagnostic engine. Please make sure the backend server is running on port 5001.');
    } finally {
      setLoading(false);
    }
  };

  const averages = {
    steps: Math.round(behavioralData.reduce((acc, d) => acc + (d.steps || 0), 0) / (behavioralData.length || 1)),
    water: Math.round(behavioralData.reduce((acc, d) => acc + (d.water_ml || 0), 0) / (behavioralData.length || 1)),
    sleep: (behavioralData.reduce((acc, d) => acc + (d.sleep_hours || 0), 0) / (behavioralData.length || 1)).toFixed(1)
  };

  const filteredOptions = CANONICAL_SYMPTOMS.filter(s => {
    const term = searchTerm.toLowerCase();
    const label = getSymptomLabel(s).toLowerCase();
    return s.toLowerCase().includes(term) || label.includes(term);
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContent}>
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
        {behavioralData.length === 0 ? (
          <View style={styles.noMetricsBanner}>
            <AlertCircle size={20} color="#d97706" style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.noMetricsTitle}>No 7-Day Health Metrics Logged</Text>
              <Text style={styles.noMetricsSub}>
                Diagnostic engine will analyze your symptoms strictly. Log daily steps, sleep, and water to unlock lifestyle-contextualized predictions.
              </Text>
            </View>
          </View>
        ) : (
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
        )}

        {/* Symptom Selection Box */}
        <View style={styles.inputCard}>
          <Text style={styles.sectionTitle}>Select & Type Symptoms</Text>

          {/* Selected Symptoms Chips Area */}
          {selectedSymptoms.length > 0 && (
            <View style={styles.chipsContainer}>
              {selectedSymptoms.map((symptom) => (
                <TouchableOpacity 
                  key={symptom} 
                  style={styles.chip}
                  onPress={() => removeSymptom(symptom)}
                >
                  <Text style={styles.chipText}>{getSymptomLabel(symptom)}</Text>
                  <X size={14} color="#1d4ed8" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Trigger Dropdown Button */}
          <TouchableOpacity 
            style={styles.dropdownTrigger}
            onPress={() => setShowDropdownModal(true)}
          >
            <Search size={18} color="#64748b" style={{ marginRight: 8 }} />
            <Text style={styles.dropdownTriggerText}>
              {selectedSymptoms.length === 0 
                ? "Tap to select symptoms from list..." 
                : `${selectedSymptoms.length} symptom(s) selected - Tap to add more`}
            </Text>
            <ChevronDown size={18} color="#64748b" />
          </TouchableOpacity>

          {/* Quick Select Tags */}
          <Text style={styles.quickLabel}>Popular Symptoms:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickScroll}>
            {POPULAR_SYMPTOMS.map((symptom) => {
              const isSelected = selectedSymptoms.includes(symptom);
              return (
                <TouchableOpacity
                  key={symptom}
                  style={[styles.quickTag, isSelected && styles.quickTagSelected]}
                  onPress={() => toggleSymptom(symptom)}
                >
                  <Text style={[styles.quickTagText, isSelected && styles.quickTagTextSelected]}>
                    {isSelected ? '✓ ' : '+ '}{getSymptomLabel(symptom)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Custom Notes */}
          <Text style={styles.quickLabel}>
            Additional Notes {selectedSymptoms.length === 1 ? '(Required for 1 symptom)' : '(Optional)'}:
          </Text>
          {selectedSymptoms.length === 1 && (
            <View style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a', borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
              <AlertCircle size={16} color="#d97706" style={{ marginRight: 8 }} />
              <Text style={{ flex: 1, fontSize: 12, color: '#92400e', fontWeight: '600' }}>
                Since only 1 symptom is selected, please describe additional notes (onset, duration, severity) to ensure accurate AI diagnosis.
              </Text>
            </View>
          )}
          <TextInput
            multiline
            numberOfLines={3}
            placeholder={selectedSymptoms.length === 1 
              ? "REQUIRED: Describe your symptom (e.g. Started 2 days ago, high temp 102F)..." 
              : "e.g. Symptoms started 2 days ago..."}
            placeholderTextColor="#94a3b8"
            style={[
              styles.customTextInput,
              selectedSymptoms.length === 1 && !customText.trim() && { borderColor: '#fca5a5', backgroundColor: '#fff5f5' }
            ]}
            value={customText}
            onChangeText={setCustomText}
          />

          {/* Action Row */}
          <View style={styles.actionRow}>
            {selectedSymptoms.length > 0 && (
              <TouchableOpacity 
                style={styles.clearBtn}
                onPress={() => { setSelectedSymptoms([]); setCustomText(''); }}
              >
                <Text style={styles.clearBtnText}>Clear All</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={[
                styles.predictBtn, 
                ((selectedSymptoms.length === 0 && !customText.trim()) || (selectedSymptoms.length === 1 && !customText.trim()) || loading) && styles.predictBtnDisabled
              ]}
              disabled={(selectedSymptoms.length === 0 && !customText.trim()) || (selectedSymptoms.length === 1 && !customText.trim()) || loading}
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

      {/* Symptom Selection Modal */}
      <Modal
        visible={showDropdownModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDropdownModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Symptoms</Text>
              <TouchableOpacity onPress={() => setShowDropdownModal(false)}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchBox}>
              <Search size={18} color="#64748b" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search symptoms (e.g. Loose Motion, Fever)..."
                placeholderTextColor="#94a3b8"
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
              {searchTerm.length > 0 && (
                <TouchableOpacity onPress={() => setSearchTerm('')}>
                  <X size={18} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const isSelected = selectedSymptoms.includes(item);
                const category = SYMPTOM_CATEGORY_MAP[item] || 'Clinical';
                return (
                  <TouchableOpacity
                    style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                    onPress={() => toggleSymptom(item)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                      <Text style={[styles.modalItemText, isSelected && styles.modalItemTextSelected]}>
                        {getSymptomLabel(item)}
                      </Text>
                      <View style={[
                        styles.catBadge,
                        category === 'Urgent' && styles.catUrgent,
                        category === 'Respiratory' && styles.catResp,
                        category === 'Neurological' && styles.catNeuro,
                        category === 'Digestive' && styles.catDig,
                        category === 'Sleep & Mood' && styles.catSleep
                      ]}>
                        <Text style={styles.catBadgeText}>{category}</Text>
                      </View>
                    </View>
                    {isSelected ? (
                      <CheckCircle2 size={20} color="#1d4ed8" />
                    ) : (
                      <Plus size={20} color="#94a3b8" />
                    )}
                  </TouchableOpacity>
                );
              }}
            />

            <TouchableOpacity 
              style={styles.modalDoneBtn}
              onPress={() => setShowDropdownModal(false)}
            >
              <Text style={styles.modalDoneBtnText}>Done ({selectedSymptoms.length} Selected)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  noMetricsBanner: { backgroundColor: '#fffbeb', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#fde68a', marginBottom: 20, flexDirection: 'row', alignItems: 'flex-start' },
  noMetricsTitle: { fontSize: 14, fontWeight: 'bold', color: '#92400e', marginBottom: 2 },
  noMetricsSub: { fontSize: 12, color: '#b45309', lineHeight: 16 },
  contextCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 20, elevation: 2 },
  contextHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  contextTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  contextGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  contextItem: { alignItems: 'center', flex: 1 },
  contextIconContainer: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  contextLabel: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  contextVal: { fontSize: 14, fontWeight: 'bold', color: '#0f172a' },
  inputCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 20, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 16 },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, gap: 6 },
  chipText: { color: '#1d4ed8', fontWeight: 'bold', fontSize: 13 },
  dropdownTrigger: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, padding: 14, marginBottom: 16 },
  dropdownTriggerText: { flex: 1, fontSize: 14, color: '#0f172a', fontWeight: '500' },
  quickLabel: { fontSize: 12, fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 },
  quickScroll: { marginBottom: 16 },
  quickTag: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8 },
  quickTagSelected: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
  quickTagText: { fontSize: 12, fontWeight: 'bold', color: '#475569' },
  quickTagTextSelected: { color: '#fff' },
  customTextInput: { backgroundColor: '#f8fafc', borderRadius: 14, padding: 12, fontSize: 14, color: '#0f172a', minHeight: 70, textAlignVertical: 'top', borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  clearBtn: { paddingHorizontal: 14, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: '#fca5a5', backgroundColor: '#fef2f2' },
  clearBtnText: { color: '#dc2626', fontWeight: 'bold', fontSize: 13 },
  predictBtn: { flex: 1, backgroundColor: '#1d4ed8', height: 52, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, elevation: 3 },
  predictBtnDisabled: { opacity: 0.6 },
  predictBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  resultsContainer: { marginBottom: 20 },
  predictionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9' },
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
  briefingCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#f1f5f9', marginTop: 8, marginBottom: 20, borderLeftWidth: 4, borderLeftColor: '#1d4ed8', elevation: 2 },
  briefingHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  briefingTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  briefingText: { fontSize: 15, color: '#334155', lineHeight: 22, fontStyle: 'italic' },
  recContainer: { marginBottom: 20 },
  recRow: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#f1f5f9' },
  recText: { fontSize: 15, fontWeight: 'bold', color: '#0f172a', flex: 1 },
  disclaimer: { backgroundColor: '#fef3c7', borderRadius: 16, padding: 16, flexDirection: 'row', gap: 12, borderWidth: 1, borderColor: '#fde68a' },
  disclaimerText: { fontSize: 12, color: '#b45309', flex: 1, fontWeight: '600', lineHeight: 18 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  modalSearchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, paddingHorizontal: 12, height: 48, marginBottom: 16 },
  modalSearchInput: { flex: 1, fontSize: 14, color: '#0f172a' },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalItemSelected: { backgroundColor: '#f0f9ff' },
  modalItemText: { fontSize: 15, fontWeight: '600', color: '#334155' },
  modalItemTextSelected: { color: '#1d4ed8', fontWeight: 'bold' },
  catBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: '#f1f5f9' },
  catBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#475569' },
  catUrgent: { backgroundColor: '#ffe4e6' },
  catResp: { backgroundColor: '#e0f2fe' },
  catNeuro: { backgroundColor: '#f3e8ff' },
  catDig: { backgroundColor: '#fef3c7' },
  catSleep: { backgroundColor: '#e0e7ff' },
  modalDoneBtn: { backgroundColor: '#1d4ed8', height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  modalDoneBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});

export default AIPredictionScreen;
