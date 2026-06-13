import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  ActivityIndicator, 
  Alert,
  Dimensions
} from 'react-native';
import { 
  Pill, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar as CalendarIcon, 
  Zap, 
  ArrowRight,
  X,
  Save
} from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');

const MedicineItem = ({ medicine, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const isTaken = medicine.logs && medicine.logs.some(log => {
    const logDate = new Date(log.taken_at).toDateString();
    const today = new Date().toDateString();
    return logDate === today;
  });

  const handleMarkAsTaken = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from('medication_logs').insert([
        {
          user_id: medicine.user_id,
          medication_id: medicine.id,
          status: 'taken',
          taken_at: new Date().toISOString()
        }
      ]);

      if (error) throw error;
      
      await supabase.from('medications')
        .update({ stock_count: Math.max(0, medicine.stock_count - 1) })
        .eq('id', medicine.id);

      onUpdate();
    } catch (error) {
      console.error('Error marking medication taken:', error);
      Alert.alert('Error', 'Failed to log dose. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.medCard}>
      <View style={styles.medInfo}>
        <View style={[styles.medIcon, isTaken ? styles.medIconTaken : styles.medIconActive]}>
          <Pill size={24} color={isTaken ? '#10b981' : '#1d4ed8'} />
        </View>
        <View style={styles.medDetails}>
          <Text style={styles.medName}>{medicine.name}</Text>
          <View style={styles.medTimeRow}>
            <Clock size={12} color="#94a3b8" />
            <Text style={styles.medTime}>{medicine.time.slice(0, 5)}</Text>
            <View style={styles.dividerDot} />
            <Text style={styles.medDosage}>{medicine.dosage}</Text>
          </View>
        </View>
      </View>
      <View>
        {isTaken ? (
          <View style={styles.doneBadge}>
            <CheckCircle2 size={16} color="#10b981" />
            <Text style={styles.doneText}>Done</Text>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.takeBtn}
            onPress={handleMarkAsTaken}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.takeBtnText}>Take</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const MedicineScreen = () => {
  const { user } = useSelector((state) => state.auth);
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [streak, setStreak] = useState(0);

  // Form State
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [time, setTime] = useState('08:00');
  const [stockCount, setStockCount] = useState('30');
  const [savingMed, setSavingMed] = useState(false);

  const fetchMedications = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('medications')
        .select(`
          *,
          logs:medication_logs(id, taken_at)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) throw error;
      setMedications(data || []);

      const todayStr = new Date().toDateString();
      const takenTodayCount = data?.filter(m => 
        m.logs?.some(log => new Date(log.taken_at).toDateString() === todayStr)
      ).length;
      
      setStreak(takenTodayCount > 0 ? 1 : 0);
    } catch (error) {
      console.error('Error fetching medications:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMedications();
  }, [fetchMedications]);

  const handleAddMedication = async () => {
    if (!name || !dosage || !time || !stockCount) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setSavingMed(true);

    try {
      const { error } = await supabase.from('medications').insert([
        {
          user_id: user.id,
          name,
          dosage,
          time: time + ':00',
          stock_count: parseInt(stockCount) || 30,
          is_active: true
        }
      ]);

      if (error) throw error;

      setIsModalOpen(false);
      setName('');
      setDosage('');
      setTime('08:00');
      setStockCount('30');
      fetchMedications();
    } catch (error) {
      console.error('Error adding medication:', error);
      Alert.alert('Error', 'Failed to save medication. Please try again.');
    } finally {
      setSavingMed(false);
    }
  };

  const lowStockMeds = medications.filter(m => m.stock_count <= 5);

  if (loading && medications.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1d4ed8" />
        <Text style={styles.loadingText}>Loading medication list...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Medications</Text>
          <Text style={styles.subtitle}>Log schedules and track dosage stocks</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setIsModalOpen(true)}>
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Streak Dashboard Card */}
      <View style={styles.streakCard}>
        <View style={styles.streakInfo}>
          <View style={styles.streakTag}>
            <Zap size={14} color="#1d4ed8" />
            <Text style={styles.streakTagText}>HEALTH STREAK</Text>
          </View>
          <Text style={styles.streakValue}>{streak} Day</Text>
          <Text style={styles.streakSubtitle}>Consistency is the secret to wellbeing.</Text>
        </View>
        <CalendarIcon size={64} color="rgba(255,255,255,0.12)" style={styles.streakBackdrop} />
      </View>

      {/* Today Schedule List Header */}
      <View style={styles.scheduleHeader}>
        <CalendarIcon size={20} color="#1d4ed8" />
        <Text style={styles.scheduleTitle}>Today's Schedule</Text>
        <View style={styles.dateBadge}>
          <Text style={styles.dateBadgeText}>
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        </View>
      </View>

      {/* Medications Listings */}
      {medications.length > 0 ? (
        <View style={styles.medsList}>
          {medications.map((med) => (
            <MedicineItem key={med.id} medicine={med} onUpdate={fetchMedications} />
          ))}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Pill size={48} color="#94a3b8" style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>No Medicines Tracked</Text>
          <Text style={styles.emptyText}>
            Start your journey to better health by adding your daily medication schedule.
          </Text>
          <TouchableOpacity style={styles.startBtn} onPress={() => setIsModalOpen(true)}>
            <Text style={styles.startBtnText}>Add Medication</Text>
            <ArrowRight size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Low Stock Alerts */}
      {lowStockMeds.length > 0 && (
        <View style={styles.alertCard}>
          <View style={styles.alertHeaderRow}>
            <AlertTriangle size={20} color="#f97316" />
            <Text style={styles.alertCardTitle}>Refill Alerts</Text>
          </View>
          {lowStockMeds.map((med) => (
            <View key={med.id} style={styles.alertItem}>
              <View style={styles.alertTextContent}>
                <Text style={styles.alertName}>{med.name} is low</Text>
                <Text style={styles.alertRemaining}>{med.stock_count} doses remaining</Text>
              </View>
              <TouchableOpacity style={styles.refillBtn}>
                <Text style={styles.refillBtnText}>Order</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Add Medication Modal */}
      <Modal visible={isModalOpen} transparent animationType="slide" onRequestClose={() => setIsModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Add Medication</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setIsModalOpen(false)}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Medicine Name</Text>
                <TextInput
                  placeholder="e.g. Vitamin D3"
                  placeholderTextColor="#94a3b8"
                  value={name}
                  onChangeText={setName}
                  style={styles.modalInput}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Dosage</Text>
                  <TextInput
                    placeholder="e.g. 1 capsule"
                    placeholderTextColor="#94a3b8"
                    value={dosage}
                    onChangeText={setDosage}
                    style={styles.modalInput}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Time (HH:MM)</Text>
                  <TextInput
                    placeholder="e.g. 08:00"
                    placeholderTextColor="#94a3b8"
                    value={time}
                    onChangeText={setTime}
                    style={styles.modalInput}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Initial Stock Count</Text>
                <TextInput
                  placeholder="e.g. 30"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={stockCount}
                  onChangeText={setStockCount}
                  style={styles.modalInput}
                />
              </View>

              <TouchableOpacity 
                style={styles.saveBtn} 
                onPress={handleAddMedication}
                disabled={savingMed}
              >
                {savingMed ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Save size={20} color="#fff" />
                    <Text style={styles.saveBtnText}>Save Medication</Text>
                  </>
                )}
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
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 4 },
  addBtn: { backgroundColor: '#1d4ed8', padding: 10, borderRadius: 14, elevation: 2 },
  streakCard: { backgroundColor: '#fff', borderRadius: 24, padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#f1f5f9', elevation: 2, overflow: 'hidden' },
  streakInfo: { flex: 1 },
  streakTag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#eff6ff', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 12 },
  streakTagText: { fontSize: 10, fontWeight: 'bold', color: '#1d4ed8' },
  streakValue: { fontSize: 32, fontWeight: '900', color: '#0f172a' },
  streakSubtitle: { fontSize: 12, color: '#64748b', marginTop: 4 },
  streakBackdrop: { position: 'absolute', right: -12, bottom: -12, color: '#f1f5f9' },
  scheduleHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  scheduleTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  dateBadge: { marginLeft: 'auto', backgroundColor: '#fff', borderWidth: 1, borderColor: '#f1f5f9', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4 },
  dateBadgeText: { fontSize: 12, fontWeight: 'bold', color: '#1d4ed8' },
  medsList: { gap: 12, marginBottom: 24 },
  medCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, borderWidth: 1, borderColor: '#f1f5f9' },
  medInfo: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  medIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  medIconActive: { backgroundColor: '#eff6ff' },
  medIconTaken: { backgroundColor: '#f0fdf4' },
  medDetails: { flex: 1 },
  medName: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  medTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  medTime: { fontSize: 12, color: '#64748b', fontWeight: 'bold' },
  dividerDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1' },
  medDosage: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  doneBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#d1fae5', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  doneText: { fontSize: 12, fontWeight: 'bold', color: '#10b981' },
  takeBtn: { backgroundColor: '#1d4ed8', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, minWidth: 64, alignItems: 'center' },
  takeBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: 24, borderStyle: 'dashed', borderWidth: 2, borderColor: '#cbd5e1', padding: 24, marginVertical: 12 },
  emptyIcon: { marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  emptyText: { fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 6, lineHeight: 18 },
  startBtn: { backgroundColor: '#1d4ed8', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 16 },
  startBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  alertCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, borderWidth: 1, borderColor: '#fff7ed' },
  alertHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  alertCardTitle: { fontSize: 18, fontWeight: 'bold', color: '#f97316' },
  alertItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff7ed', padding: 14, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#ffedd5' },
  alertTextContent: { flex: 1 },
  alertName: { fontSize: 15, fontWeight: 'bold', color: '#7c2d12' },
  alertRemaining: { fontSize: 12, color: '#c2410c', marginTop: 4, fontWeight: '600' },
  refillBtn: { backgroundColor: '#f97316', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  refillBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  loadingText: { fontSize: 15, color: '#64748b', marginTop: 12 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.4)' },
  modalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 24, width: width - 40, elevation: 10 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  closeBtn: { padding: 4 },
  form: { gap: 16 },
  formRow: { flexDirection: 'row', gap: 12 },
  inputGroup: { gap: 8 },
  inputLabel: { fontSize: 14, fontWeight: 'bold', color: '#475569', marginLeft: 2 },
  modalInput: { backgroundColor: '#f8fafc', borderRadius: 16, height: 50, fontSize: 15, paddingHorizontal: 16, color: '#0f172a', borderWidth: 1, borderColor: '#e2e8f0' },
  saveBtn: { backgroundColor: '#1d4ed8', height: 52, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});

export default MedicineScreen;
