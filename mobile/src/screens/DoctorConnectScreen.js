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
  Modal,
  Platform
} from 'react-native';
import { Search, Star, Calendar, MessageCircle, X, MapPin, Award, Building2, User, BookOpen } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { supabase } from '../lib/supabase';

const DoctorConnectScreen = ({ navigation }) => {
  const { user } = useSelector(state => state.auth);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [booking, setBooking] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch verified doctors directly from Supabase DB
      let docs = [];
      const { data: doctorData, error: docErr } = await supabase
        .from('doctors')
        .select('*');

      if (!docErr && doctorData && doctorData.length > 0) {
        docs = doctorData;
      } else {
        const { data: profileDocs } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'doctor');
        docs = profileDocs || [];
      }

      // Fetch user's appointments directly from Supabase DB
      const { data: appts, error: apptsError } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', user.id);
        
      if (apptsError) throw apptsError;

      setDoctors(docs);
      setAppointments(appts || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getAppointmentStatus = (doctorId) => {
    const appt = appointments.find(a => a.doctor_id === doctorId);
    return appt ? { status: appt.status, appt } : { status: 'none', appt: null };
  };

  const handleBook = async (doctor) => {
    Alert.alert(
      'Book Appointment',
      `Send a consultation request to Dr. ${doctor.full_name || doctor.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setBooking(true);
            try {
              const { error } = await supabase.from('appointments').insert([
                {
                  user_id: user.id,
                  doctor_id: doctor.id,
                  status: 'pending',
                  appointment_date: new Date().toISOString().split('T')[0],
                  appointment_time: '10:00',
                  doctor_name: doctor.full_name || doctor.name
                }
              ]);
              if (error) throw error;
              Alert.alert('Success', 'Appointment request sent successfully');
              fetchData();
            } catch (err) {
              Alert.alert('Error', err.message);
            } finally {
              setBooking(false);
            }
          }
        }
      ]
    );
  };

  const openProfile = (doctor) => {
    setSelectedDoctor(doctor);
    setModalVisible(true);
  };

  const renderStatusBadge = (status) => {
    switch(status) {
      case 'pending': return <View style={[styles.badge, styles.badgePending]}><Text style={styles.badgeTextPending}>PENDING</Text></View>;
      case 'accepted': return <View style={[styles.badge, styles.badgeAccepted]}><Text style={styles.badgeTextAccepted}>ACCEPTED</Text></View>;
      case 'rejected': return <View style={[styles.badge, styles.badgeRejected]}><Text style={styles.badgeTextRejected}>REJECTED</Text></View>;
      default: return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Find a Specialist</Text>
          <Text style={styles.subtitle}>Book a consultation with verified doctors</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#1d4ed8" style={{ marginTop: 50 }} />
        ) : doctors.length > 0 ? (
          <View style={styles.list}>
            {doctors.map(doctor => {
              const { status, appt } = getAppointmentStatus(doctor.id);
              return (
                <View key={doctor.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{doctor.full_name?.charAt(0) || 'D'}</Text>
                    </View>
                    <View style={styles.info}>
                      <Text style={styles.docName}>{doctor.full_name}</Text>
                      <Text style={styles.docSpecialty}>{doctor.specialty || 'General Practitioner'}</Text>
                      <View style={styles.ratingRow}>
                        <Star size={14} color="#fbbf24" fill="#fbbf24" />
                        <Text style={styles.ratingText}>5.0</Text>
                        {renderStatusBadge(status)}
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.viewBtn} onPress={() => openProfile(doctor)}>
                      <Text style={styles.viewBtnText}>View Profile</Text>
                    </TouchableOpacity>
                    
                    {status === 'pending' ? (
                      <TouchableOpacity style={[styles.bookBtn, styles.pendingBtn]} disabled>
                        <Text style={styles.pendingBtnText}>Pending</Text>
                      </TouchableOpacity>
                    ) : status === 'accepted' ? (
                      <TouchableOpacity style={[styles.bookBtn, styles.chatBtn]} onPress={() => navigation.navigate('ConsultationChat', { appointmentId: appt.id })}>
                        <MessageCircle size={16} color="#fff" />
                        <Text style={styles.bookBtnText}>Chat Now</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity style={styles.bookBtn} onPress={() => handleBook(doctor)} disabled={booking}>
                        <Calendar size={16} color="#fff" />
                        <Text style={styles.bookBtnText}>Book Now</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No verified doctors available right now.</Text>
          </View>
        )}
      </ScrollView>

      {/* Doctor Profile Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView style={styles.modalContainer}>
          {selectedDoctor && (
            <ScrollView contentContainerStyle={styles.modalContent}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
              
              <View style={styles.modalHeader}>
                <View style={[styles.avatar, styles.modalAvatar]}>
                  <Text style={styles.modalAvatarText}>{selectedDoctor.full_name?.charAt(0) || 'D'}</Text>
                </View>
                <Text style={styles.modalName}>{selectedDoctor.full_name}</Text>
                <Text style={styles.modalSpecialty}>{selectedDoctor.specialty}</Text>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <User size={20} color="#1d4ed8" />
                  <Text style={styles.sectionTitle}>Professional Bio</Text>
                </View>
                <Text style={styles.sectionBody}>{selectedDoctor.bio || 'No biography available.'}</Text>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <BookOpen size={20} color="#1d4ed8" />
                  <Text style={styles.sectionTitle}>Education Details</Text>
                </View>
                {selectedDoctor.education ? (
                  <View style={styles.educationGrid}>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridLabel}>University</Text>
                      <Text style={styles.gridValue}>{selectedDoctor.education.university_name || selectedDoctor.education.universityName}</Text>
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridLabel}>Location</Text>
                      <Text style={styles.gridValue}>{selectedDoctor.education.college_location || selectedDoctor.education.collegeLocation}</Text>
                    </View>
                    <View style={[styles.gridItem, { width: '100%' }]}>
                      <Text style={styles.gridLabel}>Duration</Text>
                      <Text style={styles.gridValue}>
                        {selectedDoctor.education.start_year || selectedDoctor.education.startYear} - {selectedDoctor.education.end_year || selectedDoctor.education.endYear} ({selectedDoctor.education.duration})
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.sectionBody}>Not specified</Text>
                )}
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Building2 size={20} color="#1d4ed8" />
                  <Text style={styles.sectionTitle}>Hospital / Clinic</Text>
                </View>
                <Text style={styles.sectionBody}>{selectedDoctor.hospital_name}</Text>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MapPin size={20} color="#1d4ed8" />
                  <Text style={styles.sectionTitle}>Location</Text>
                </View>
                <Text style={styles.sectionBody}>{selectedDoctor.hospital_address || 'Not specified'}</Text>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '900', color: '#0f172a' },
  subtitle: { fontSize: 15, color: '#64748b', marginTop: 4 },
  list: { gap: 16 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#f1f5f9', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: { width: 60, height: 60, borderRadius: 16, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 24, fontWeight: 'black', color: '#1d4ed8' },
  info: { flex: 1, marginLeft: 16 },
  docName: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  docSpecialty: { fontSize: 13, color: '#1d4ed8', fontWeight: 'bold', marginTop: 2, textTransform: 'uppercase' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  ratingText: { fontSize: 13, fontWeight: 'bold', color: '#475569' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginLeft: 8 },
  badgePending: { backgroundColor: '#fef3c7' },
  badgeTextPending: { color: '#d97706', fontSize: 10, fontWeight: 'bold' },
  badgeAccepted: { backgroundColor: '#d1fae5' },
  badgeTextAccepted: { color: '#059669', fontSize: 10, fontWeight: 'bold' },
  badgeRejected: { backgroundColor: '#ffe4e6' },
  badgeTextRejected: { color: '#e11d48', fontSize: 10, fontWeight: 'bold' },
  cardActions: { flexDirection: 'row', gap: 12 },
  viewBtn: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  viewBtnText: { color: '#475569', fontSize: 14, fontWeight: 'bold' },
  bookBtn: { flex: 1, height: 44, borderRadius: 12, backgroundColor: '#1d4ed8', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  bookBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  pendingBtn: { backgroundColor: '#f59e0b' },
  pendingBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  chatBtn: { backgroundColor: '#10b981' },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 15 },
  
  // Modal Styles
  modalContainer: { flex: 1, backgroundColor: '#f8fafc' },
  modalContent: { padding: 24, paddingBottom: 60 },
  closeBtn: { alignSelf: 'flex-end', padding: 8, backgroundColor: '#fff', borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  modalHeader: { alignItems: 'center', marginBottom: 32, marginTop: 10 },
  modalAvatar: { width: 100, height: 100, borderRadius: 32, marginBottom: 16 },
  modalAvatarText: { fontSize: 40, fontWeight: '900' },
  modalName: { fontSize: 26, fontWeight: '900', color: '#0f172a', textAlign: 'center' },
  modalSpecialty: { fontSize: 14, color: '#1d4ed8', fontWeight: 'bold', textTransform: 'uppercase', marginTop: 4, letterSpacing: 1 },
  section: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  sectionBody: { fontSize: 14, color: '#475569', lineHeight: 22 },
  educationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  gridItem: { width: '45%' },
  gridLabel: { fontSize: 11, color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 },
  gridValue: { fontSize: 14, color: '#334155', fontWeight: '500' }
});

export default DoctorConnectScreen;
