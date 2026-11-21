import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  Modal
} from 'react-native';
import { Calendar, MessageSquare, Check, X } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { supabase } from '../lib/supabase';
import { fetchApiWithFallback } from '../lib/api';

const DoctorAppointmentsScreen = ({ navigation }) => {
  const { user } = useSelector(state => state.auth);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // all / upcoming / completed
  const [selectedPatientModal, setSelectedPatientModal] = useState(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let apptRes = null;
      try {
        apptRes = await fetchApiWithFallback(`/doctors/my-appointments?doctorId=${user.id}`);
      } catch (e) {}

      if (apptRes && apptRes.appointments) {
        setAppointments(apptRes.appointments);
      } else {
        const doctorName = user.user_metadata?.full_name || '';
        let query = supabase.from('appointments').select('*');
        if (doctorName) {
          query = query.or(`doctor_id.eq.${user.id},doctor_name.ilike.%${doctorName}%`);
        } else {
          query = query.eq('doctor_id', user.id);
        }

        const { data: rawAppts, error } = await query.order('appointment_date', { ascending: true });

        if (error) throw error;

        let mergedAppts = rawAppts || [];
        const userIds = [...new Set(mergedAppts.map(a => a.user_id).filter(Boolean))];
        if (userIds.length > 0) {
          const { data: profs } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', userIds);
          
          mergedAppts = mergedAppts.map(a => {
            const p = profs?.find(prof => prof.id === a.user_id);
            return {
              ...a,
              profiles: p ? { full_name: p.full_name } : { full_name: a.patient_name || 'Patient' }
            };
          });
        }
        setAppointments(mergedAppts);
      }
    } catch (err) {
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();

    const apptSub = supabase
      .channel('realtime:mobile_doctor_appts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(apptSub);
    };
  }, [fetchData]);

  const handleRejectAppt = async (id) => {
    Alert.alert('Reject Appointment', 'Are you sure you want to reject this appointment request?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: async () => {
        try {
          await supabase.from('appointments').update({ status: 'rejected' }).eq('id', id);
          fetchData();
        } catch (e) {
          console.error(e);
        }
      }}
    ]);
  };

  const handleAcceptAppt = async (id) => {
    Alert.alert('Accept Appointment', 'Accept and schedule for Tomorrow at 10:00 AM?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Accept', onPress: async () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);
        try {
          await supabase.from('appointments').update({ status: 'accepted', appointment_date: tomorrow.toISOString() }).eq('id', id);
          fetchData();
        } catch (e) {
          console.error(e);
        }
      }}
    ]);
  };

  const upcomingList = appointments.filter(a => a.status === 'accepted' || a.status === 'scheduled' || a.status === 'pending');
  const completedList = appointments.filter(a => a.status === 'completed');

  let currentList = appointments;
  if (activeTab === 'upcoming') currentList = upcomingList;
  else if (activeTab === 'completed') currentList = completedList;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Appointments</Text>
        <Text style={styles.subtitle}>Manage your consultation schedule.</Text>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'all' && styles.tabBtnActive]} 
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
            All ({appointments.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'upcoming' && styles.tabBtnActive]} 
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>
            Upcoming ({upcomingList.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'completed' && styles.tabBtnActive]} 
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>
            Done ({completedList.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        {loading ? (
          <ActivityIndicator size="large" color="#1d4ed8" style={{ marginTop: 50 }} />
        ) : currentList.length > 0 ? (
          currentList.map(appt => {
            const name = appt.profiles?.full_name || appt.patient_name || 'Anonymous';
            return (
              <View key={appt.id} style={styles.card}>
                <View style={styles.cardMain}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{name.charAt(0)}</Text>
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.name}>{name}</Text>
                    <Text style={styles.date}>
                      {appt.appointment_date 
                        ? new Date(appt.appointment_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) 
                        : 'TBD (Pending)'}
                    </Text>
                    <View style={styles.badgeRow}>
                      <Text style={[styles.badge, appt.status === 'accepted' ? styles.badgeAccepted : styles.badgePending]}>
                        {appt.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.actionsRow}>
                  <TouchableOpacity 
                    style={styles.profileBtn} 
                    onPress={async () => {
                      try {
                        let pData = null;
                        try {
                          pData = await fetchApiWithFallback(`/doctors/patient-details/${appt.user_id}`);
                        } catch(e) {}

                        if (pData) {
                          setSelectedPatientModal({
                            ...pData,
                            appointment_date: appt.appointment_date,
                            notes: appt.notes
                          });
                        } else {
                          const { data: prof } = await supabase.from('profiles').select('*').eq('id', appt.user_id).maybeSingle();
                          setSelectedPatientModal({
                            full_name: prof?.full_name || name,
                            phone_number: prof?.phone_number || 'N/A',
                            dob: prof?.medical_history?.dob || 'Not Specified',
                            gender: prof?.gender || 'Not Specified',
                            blood_group: prof?.blood_group || 'N/A',
                            weight_kg: prof?.weight_kg || 'N/A',
                            height_cm: prof?.height_cm || 'N/A',
                            appointment_date: appt.appointment_date,
                            notes: appt.notes
                          });
                        }
                      } catch (e) {
                        setSelectedPatientModal({
                          full_name: name,
                          appointment_date: appt.appointment_date,
                          notes: appt.notes
                        });
                      }
                    }}
                  >
                    <Text style={styles.profileBtnText}>View Patient Details</Text>
                  </TouchableOpacity>

                  {appt.status === 'pending' ? (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => handleRejectAppt(appt.id)}>
                        <X size={16} color="#ef4444" />
                        <Text style={styles.rejectBtnText}>Decline</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, styles.acceptBtn]} onPress={() => handleAcceptAppt(appt.id)}>
                        <Check size={16} color="#10b981" />
                        <Text style={styles.acceptBtnText}>Accept</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.chatBtn} onPress={() => navigation.navigate('ConsultationChat', { appointmentId: appt.id })}>
                      <MessageSquare size={16} color="#1d4ed8" />
                      <Text style={styles.chatBtnText}>Message Patient</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No {activeTab} appointments found.</Text>
          </View>
        )}
      </ScrollView>

      {/* Patient Details Modal */}
      <Modal visible={!!selectedPatientModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20, maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#0f172a' }}>Patient Profile</Text>
              <TouchableOpacity onPress={() => setSelectedPatientModal(null)}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {selectedPatientModal && (
              <ScrollView space={{ gap: 12 }}>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#0f172a' }}>{selectedPatientModal.full_name}</Text>
                <Text style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>{selectedPatientModal.phone_number}</Text>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  <View style={{ width: '47%', backgroundColor: '#f8fafc', padding: 10, borderRadius: 10 }}>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#94a3b8', uppercase: true }}>Date of Birth</Text>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#0f172a', marginTop: 2 }}>{selectedPatientModal.dob || 'Not Specified'}</Text>
                  </View>
                  <View style={{ width: '47%', backgroundColor: '#f8fafc', padding: 10, borderRadius: 10 }}>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#94a3b8', uppercase: true }}>Age</Text>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#0f172a', marginTop: 2 }}>{selectedPatientModal.age || 'N/A'}</Text>
                  </View>
                  <View style={{ width: '47%', backgroundColor: '#f8fafc', padding: 10, borderRadius: 10 }}>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#94a3b8', uppercase: true }}>Gender</Text>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#0f172a', marginTop: 2 }}>{selectedPatientModal.gender || 'Not Specified'}</Text>
                  </View>
                  <View style={{ width: '47%', backgroundColor: '#f8fafc', padding: 10, borderRadius: 10 }}>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#94a3b8', uppercase: true }}>Blood Group</Text>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#0f172a', marginTop: 2 }}>{selectedPatientModal.blood_group || 'N/A'}</Text>
                  </View>
                  <View style={{ width: '47%', backgroundColor: '#f8fafc', padding: 10, borderRadius: 10 }}>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#94a3b8', uppercase: true }}>Weight</Text>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#0f172a', marginTop: 2 }}>{selectedPatientModal.weight_kg ? `${selectedPatientModal.weight_kg} kg` : 'N/A'}</Text>
                  </View>
                  <View style={{ width: '47%', backgroundColor: '#f8fafc', padding: 10, borderRadius: 10 }}>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#94a3b8', uppercase: true }}>Height</Text>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#0f172a', marginTop: 2 }}>{selectedPatientModal.height_cm ? `${selectedPatientModal.height_cm} cm` : 'N/A'}</Text>
                  </View>
                  <View style={{ width: '100%', backgroundColor: '#f8fafc', padding: 10, borderRadius: 10 }}>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#94a3b8', uppercase: true }}>Appointment Sent Date</Text>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#0f172a', marginTop: 2 }}>
                      {selectedPatientModal.appointment_date ? new Date(selectedPatientModal.appointment_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                    </Text>
                  </View>
                  {selectedPatientModal.diseases ? (
                    <View style={{ width: '100%', backgroundColor: '#f8fafc', padding: 10, borderRadius: 10 }}>
                      <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#94a3b8', uppercase: true }}>Diseases / Conditions</Text>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#0f172a', marginTop: 2 }}>{selectedPatientModal.diseases}</Text>
                    </View>
                  ) : null}
                  {selectedPatientModal.drugs ? (
                    <View style={{ width: '100%', backgroundColor: '#f8fafc', padding: 10, borderRadius: 10 }}>
                      <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#94a3b8', uppercase: true }}>Current Medications</Text>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#0f172a', marginTop: 2 }}>{selectedPatientModal.drugs}</Text>
                    </View>
                  ) : null}
                  {selectedPatientModal.notes ? (
                    <View style={{ width: '100%', backgroundColor: '#eff6ff', padding: 10, borderRadius: 10 }}>
                      <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#3b82f6', uppercase: true }}>Patient Note</Text>
                      <Text style={{ fontSize: 13, color: '#1e40af', marginTop: 2, italic: true }}>"{selectedPatientModal.notes}"</Text>
                    </View>
                  ) : null}
                </View>
              </ScrollView>
            )}

            <TouchableOpacity 
              style={{ marginTop: 20, backgroundColor: '#1d4ed8', paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}
              onPress={() => setSelectedPatientModal(null)}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingBottom: 15 },
  title: { fontSize: 28, fontWeight: '900', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  tabsContainer: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 15 },
  tabBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, backgroundColor: '#e2e8f0', borderRadius: 12 },
  tabBtnActive: { backgroundColor: '#1d4ed8' },
  tabText: { color: '#64748b', fontWeight: 'bold', fontSize: 13 },
  tabTextActive: { color: '#ffffff' },
  listContent: { paddingHorizontal: 20, paddingBottom: 40, gap: 16 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#f1f5f9', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
  cardMain: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: '#d97706' },
  info: { flex: 1, marginLeft: 14 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  date: { fontSize: 13, color: '#64748b', marginTop: 2, fontWeight: '500' },
  badgeRow: { marginTop: 6, flexDirection: 'row' },
  badge: { fontSize: 10, fontWeight: '900', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  badgePending: { backgroundColor: '#fef3c7', color: '#d97706' },
  badgeAccepted: { backgroundColor: '#d1fae5', color: '#059669' },
  actionsRow: { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12, gap: 10 },
  profileBtn: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#f1f5f9', borderRadius: 8, alignItems: 'center' },
  profileBtnText: { color: '#334155', fontWeight: 'bold', fontSize: 12 },
  actionButtons: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, height: 40, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1 },
  rejectBtn: { borderColor: '#fca5a5', backgroundColor: '#fef2f2' },
  rejectBtnText: { color: '#ef4444', fontWeight: 'bold', fontSize: 13 },
  acceptBtn: { borderColor: '#6ee7b7', backgroundColor: '#ecfdf5' },
  acceptBtnText: { color: '#10b981', fontWeight: 'bold', fontSize: 13 },
  chatBtn: { height: 40, borderRadius: 10, backgroundColor: '#eff6ff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  chatBtnText: { color: '#1d4ed8', fontWeight: 'bold', fontSize: 14 },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 15 }
});

export default DoctorAppointmentsScreen;
