import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  TextInput,
  Modal
} from 'react-native';
import { Search, MessageSquare, Clock, ArrowRight, X, FileText, Activity, Brain, Pill, User } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { supabase } from '../lib/supabase';

const DoctorPatientsScreen = ({ navigation }) => {
  const { user } = useSelector(state => state.auth);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('active'); // active / completed

  // Selected Patient Details Modal State
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [patientDataLoading, setPatientDataLoading] = useState(false);
  const [patientMetrics, setPatientMetrics] = useState([]);
  const [patientPredictions, setPatientPredictions] = useState([]);
  const [patientMeds, setPatientMeds] = useState([]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*, profiles:user_id(full_name, email, phone_number)')
        .eq('doctor_id', user.id)
        .order('appointment_date', { ascending: false });

      if (error) throw error;
      setAppointments(data || []);
    } catch (err) {
      console.error('Error fetching patients:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openPatientModal = async (appt) => {
    setSelectedAppt(appt);
    setModalVisible(true);
    setPatientDataLoading(true);

    const patientId = appt.user_id;

    try {
      // 1. Fetch Patient 7-Day Metrics
      const { data: metrics } = await supabase
        .from('health_metrics')
        .select('*')
        .eq('user_id', patientId)
        .order('created_at', { ascending: false })
        .limit(7);

      // 2. Fetch Recent AI Predictions
      const { data: predictions } = await supabase
        .from('ai_predictions')
        .select('*')
        .eq('user_id', patientId)
        .order('created_at', { ascending: false })
        .limit(3);

      // 3. Fetch Active Medications
      const { data: meds } = await supabase
        .from('medications')
        .select('*')
        .eq('user_id', patientId);

      setPatientMetrics(metrics || []);
      setPatientPredictions(predictions || []);
      setPatientMeds(meds || []);
    } catch (err) {
      console.error('Error loading patient medical sheet:', err);
    } finally {
      setPatientDataLoading(false);
    }
  };

  const activeCases = appointments.filter(a => a.status === 'accepted' || a.status === 'scheduled');
  const completedCases = appointments.filter(a => a.status === 'completed');

  const currentList = activeTab === 'active' ? activeCases : completedCases;
  
  const filteredList = currentList.filter(appt => {
    const name = appt.profiles?.full_name || appt.patient_name || 'Anonymous';
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Patient Directory</Text>
        <Text style={styles.subtitle}>View and manage your consultation history.</Text>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'active' && styles.tabBtnActive]} 
          onPress={() => setActiveTab('active')}
        >
          <MessageSquare size={16} color={activeTab === 'active' ? '#1d4ed8' : '#64748b'} />
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
            Active ({activeCases.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'completed' && styles.tabBtnActive]} 
          onPress={() => setActiveTab('completed')}
        >
          <Clock size={16} color={activeTab === 'completed' ? '#1d4ed8' : '#64748b'} />
          <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>
            Completed ({completedCases.length})
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder={activeTab === 'active' ? "Search active patients..." : "Search completed history..."}
          placeholderTextColor="#94a3b8"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        {loading ? (
          <ActivityIndicator size="large" color="#1d4ed8" style={{ marginTop: 50 }} />
        ) : filteredList.length > 0 ? (
          filteredList.map(appt => {
            const name = appt.profiles?.full_name || appt.patient_name || 'Anonymous';
            return (
              <TouchableOpacity key={appt.id} style={styles.card} onPress={() => openPatientModal(appt)} activeOpacity={0.8}>
                <View style={styles.cardHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{name.charAt(0)}</Text>
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.name}>{name}</Text>
                    <Text style={styles.date}>
                      {activeTab === 'active' ? 'Next appt:' : 'Last visit:'} {new Date(appt.appointment_date).toLocaleDateString()}
                    </Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.chatBtn} 
                    onPress={() => navigation.navigate('ConsultationChat', { appointmentId: appt.id })}
                  >
                    <MessageSquare size={18} color="#1d4ed8" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No {activeTab} patients found.</Text>
          </View>
        )}
      </ScrollView>

      {/* Patient Medical Sheet Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView style={styles.modalContainer}>
          {selectedAppt && (
            <ScrollView contentContainerStyle={styles.modalScroll}>
              <View style={styles.modalTopBar}>
                <Text style={styles.modalTitle}>Patient Medical Record</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                  <X size={22} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View style={styles.patientProfileHeader}>
                <View style={styles.patientAvatarBig}>
                  <Text style={styles.patientAvatarText}>
                    {(selectedAppt.profiles?.full_name || selectedAppt.patient_name || 'P').charAt(0)}
                  </Text>
                </View>
                <Text style={styles.patientNameBig}>
                  {selectedAppt.profiles?.full_name || selectedAppt.patient_name || 'Anonymous Patient'}
                </Text>
                <Text style={styles.patientContactSub}>
                  {selectedAppt.profiles?.email || 'Email not shared'} • {selectedAppt.profiles?.phone_number || 'Phone not shared'}
                </Text>
              </View>

              {patientDataLoading ? (
                <ActivityIndicator size="large" color="#1d4ed8" style={{ marginVertical: 40 }} />
              ) : (
                <>
                  {/* 7-Day Lifestyle Metrics */}
                  <View style={styles.sheetSection}>
                    <View style={styles.sheetSectionHeader}>
                      <Activity size={18} color="#1d4ed8" />
                      <Text style={styles.sheetSectionTitle}>Recent Health Metrics</Text>
                    </View>
                    {patientMetrics.length > 0 ? (
                      <View style={styles.metricsGrid}>
                        {patientMetrics.slice(0, 4).map((m, idx) => (
                          <View key={m.id || idx} style={styles.metricCard}>
                            <Text style={styles.metricLabel}>{new Date(m.created_at || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric' })}</Text>
                            <Text style={styles.metricValue}>Steps: {m.steps || 0}</Text>
                            <Text style={styles.metricSub}>Sleep: {m.sleep || 0}h | Hydration: {m.water || 0}ml</Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.emptySubtext}>No recent health metrics logged.</Text>
                    )}
                  </View>

                  {/* Recent AI Predictions */}
                  <View style={styles.sheetSection}>
                    <View style={styles.sheetSectionHeader}>
                      <Brain size={18} color="#1d4ed8" />
                      <Text style={styles.sheetSectionTitle}>AI Disease Predictions</Text>
                    </View>
                    {patientPredictions.length > 0 ? (
                      patientPredictions.map((pred, idx) => (
                        <View key={pred.id || idx} style={styles.predCard}>
                          <Text style={styles.predCondition}>{pred.predicted_condition || pred.disease || 'Condition Analysis'}</Text>
                          <Text style={styles.predDetails}>
                            Symptoms: {Array.isArray(pred.symptoms) ? pred.symptoms.join(', ') : (pred.symptoms || 'N/A')}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.emptySubtext}>No previous AI diagnostic reports.</Text>
                    )}
                  </View>

                  {/* Active Medications */}
                  <View style={styles.sheetSection}>
                    <View style={styles.sheetSectionHeader}>
                      <Pill size={18} color="#1d4ed8" />
                      <Text style={styles.sheetSectionTitle}>Active Medications</Text>
                    </View>
                    {patientMeds.length > 0 ? (
                      patientMeds.map((med, idx) => (
                        <View key={med.id || idx} style={styles.medCard}>
                          <Text style={styles.medName}>{med.name} ({med.dosage})</Text>
                          <Text style={styles.medTime}>Schedule: {med.timing || med.time} • Stock: {med.stock_count || med.stock || 'N/A'}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.emptySubtext}>No active prescription medications.</Text>
                    )}
                  </View>

                  <TouchableOpacity 
                    style={styles.openChatBtn}
                    onPress={() => {
                      setModalVisible(false);
                      navigation.navigate('ConsultationChat', { appointmentId: selectedAppt.id });
                    }}
                  >
                    <MessageSquare size={18} color="#ffffff" />
                    <Text style={styles.openChatBtnText}>Open Consultation Chat</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingBottom: 10 },
  title: { fontSize: 28, fontWeight: '900', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  tabsContainer: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 15 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, backgroundColor: '#e2e8f0', borderRadius: 12 },
  tabBtnActive: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe' },
  tabText: { color: '#64748b', fontWeight: 'bold', fontSize: 14 },
  tabTextActive: { color: '#1d4ed8' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 20, paddingHorizontal: 16, height: 50, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 15 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: '#0f172a' },
  listContent: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#f1f5f9', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: '#d97706' },
  info: { flex: 1, marginLeft: 14 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  date: { fontSize: 13, color: '#64748b', marginTop: 4 },
  chatBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 15 },

  modalContainer: { flex: 1, backgroundColor: '#ffffff' },
  modalScroll: { padding: 20 },
  modalTopBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  closeBtn: { padding: 6, borderRadius: 10, backgroundColor: '#f1f5f9' },
  patientProfileHeader: { alignItems: 'center', marginBottom: 24 },
  patientAvatarBig: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  patientAvatarText: { fontSize: 26, fontWeight: 'bold', color: '#1d4ed8' },
  patientNameBig: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  patientContactSub: { fontSize: 13, color: '#64748b', marginTop: 4 },
  sheetSection: { marginBottom: 20, backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  sheetSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sheetSectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#0f172a' },
  metricsGrid: { gap: 8 },
  metricCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  metricLabel: { fontSize: 11, fontWeight: 'bold', color: '#64748b' },
  metricValue: { fontSize: 14, fontWeight: 'bold', color: '#0f172a', marginTop: 2 },
  metricSub: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  predCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 8 },
  predCondition: { fontSize: 14, fontWeight: 'bold', color: '#1d4ed8' },
  predDetails: { fontSize: 12, color: '#64748b', marginTop: 4 },
  medCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 8 },
  medName: { fontSize: 14, fontWeight: 'bold', color: '#0f172a' },
  medTime: { fontSize: 12, color: '#64748b', marginTop: 2 },
  emptySubtext: { fontSize: 13, color: '#94a3b8', fontStyle: 'italic' },
  openChatBtn: { height: 50, borderRadius: 14, backgroundColor: '#1d4ed8', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 10 },
  openChatBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 }
});

export default DoctorPatientsScreen;
