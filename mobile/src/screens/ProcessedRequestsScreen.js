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
  TextInput,
  RefreshControl,
  Modal,
  Image
} from 'react-native';
import { Clock, Check, X, Trash2, Search, Eye, ShieldCheck, Mail, Phone, MapPin, Building2, BookOpen } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { fetchApiWithFallback } from '../lib/api';

const ProcessedRequestsScreen = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'approved', 'rejected'
  const [deletingId, setDeletingId] = useState(null);
  
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchProcessedRecords = useCallback(async () => {
    try {
      const { data: inqs, error } = await supabase
        .from('inquiries')
        .select('*')
        .eq('subject', 'doctor_application')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const parsed = (inqs || []).map(inq => {
        let payload = {};
        try { payload = JSON.parse(inq.message); } catch (e) {}
        return {
          id: inq.id,
          status: inq.status,
          created_at: inq.created_at,
          ...payload
        };
      }).filter(app => app.fullName && app.email && app.status !== 'new');

      setRecords(parsed);
    } catch (err) {
      console.error('Error fetching processed requests:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProcessedRecords();

    const channel = supabase
      .channel('realtime:processed_requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inquiries' }, () => {
        fetchProcessedRecords();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchProcessedRecords]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProcessedRecords();
  };

  const handleDeleteRecord = async (id, doctorName) => {
    Alert.alert(
      'Delete Record',
      `Are you sure you want to remove the record for ${doctorName || 'this request'} from the registry?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(id);
            try {
              const data = await fetchApiWithFallback('/admin/delete-application', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
              });

              Alert.alert('Success', data.message || 'Record deleted successfully.');
              fetchProcessedRecords();
            } catch (err) {
              console.warn('API delete fallback, direct Supabase delete:', err);
              try {
                const { error } = await supabase
                  .from('inquiries')
                  .delete()
                  .eq('id', id);

                if (error) throw error;
                Alert.alert('Success', 'Record deleted successfully.');
                fetchProcessedRecords();
              } catch (subErr) {
                Alert.alert('Error', 'Failed to delete record: ' + subErr.message);
              }
            } finally {
              setDeletingId(null);
            }
          }
        }
      ]
    );
  };

  const openDetailsModal = (record) => {
    setSelectedRecord(record);
    setModalVisible(true);
  };

  const filteredRecords = records.filter(rec => {
    const isApproved = rec.status === 'resolved' || rec.status === 'read';
    const isRejected = rec.status === 'urgent' || rec.status === 'rejected';

    if (filterStatus === 'approved' && !isApproved) return false;
    if (filterStatus === 'rejected' && !isRejected) return false;

    const term = searchTerm.toLowerCase();
    const nameMatch = (rec.fullName || '').toLowerCase().includes(term);
    const emailMatch = (rec.email || '').toLowerCase().includes(term);
    const specMatch = (rec.specialty || '').toLowerCase().includes(term);

    return nameMatch || emailMatch || specMatch;
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.headerIconContainer}>
            <Clock size={24} color="#1d4ed8" />
          </View>
          <View>
            <Text style={styles.title}>Processed Requests</Text>
            <Text style={styles.subtitle}>Registry of reviewed doctor applications</Text>
          </View>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {[
            { id: 'all', label: `All (${records.length})` },
            { id: 'approved', label: `Approved (${records.filter(r => r.status === 'resolved' || r.status === 'read').length})` },
            { id: 'rejected', label: `Rejected (${records.filter(r => r.status !== 'resolved' && r.status !== 'read').length})` }
          ].map(f => (
            <TouchableOpacity
              key={f.id}
              style={[styles.filterChip, filterStatus === f.id && styles.filterChipActive]}
              onPress={() => setFilterStatus(f.id)}
            >
              <Text style={[styles.filterChipText, filterStatus === f.id && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Search size={18} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by doctor, email or specialty..."
            placeholderTextColor="#94a3b8"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1d4ed8']} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#1d4ed8" style={{ marginVertical: 40 }} />
        ) : filteredRecords.length > 0 ? (
          filteredRecords.map(item => {
            const isApproved = item.status === 'resolved' || item.status === 'read';
            return (
              <View key={item.id} style={styles.recordCard}>
                <TouchableOpacity 
                  style={styles.recordCardContent}
                  onPress={() => openDetailsModal(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>
                      {(item.fullName || 'D').slice(0, 2).toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.infoContainer}>
                    <Text style={styles.doctorName}>{item.fullName}</Text>
                    <Text style={styles.metaText}>
                      {item.specialty || 'General'} • {item.email}
                    </Text>
                    {item.licenseNumber ? (
                      <Text style={styles.subMetaText}>License: {item.licenseNumber}</Text>
                    ) : null}
                  </View>
                </TouchableOpacity>

                <View style={styles.actionColumn}>
                  {isApproved ? (
                    <View style={[styles.statusBadge, styles.statusBadgeApproved]}>
                      <Check size={14} color="#15803d" />
                      <Text style={styles.statusApprovedText}>Approved</Text>
                    </View>
                  ) : (
                    <View style={[styles.statusBadge, styles.statusBadgeRejected]}>
                      <X size={14} color="#b91c1c" />
                      <Text style={styles.statusRejectedText}>Rejected</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteRecord(item.id, item.fullName)}
                    disabled={deletingId === item.id}
                  >
                    {deletingId === item.id ? (
                      <ActivityIndicator size="small" color="#ef4444" />
                    ) : (
                      <Trash2 size={18} color="#94a3b8" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Clock size={48} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No Processed Records Found</Text>
            <Text style={styles.emptySub}>
              {searchTerm ? 'No matching request records found for your query.' : 'Approved and rejected doctor registration requests will appear here.'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Details Modal */}
      {selectedRecord && (
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Request Details</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseBtn}>
                  <X size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <View style={styles.modalDoctorHeader}>
                  <View style={styles.largeAvatarCircle}>
                    <Text style={styles.largeAvatarText}>
                      {(selectedRecord.fullName || 'D').slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalDoctorName}>{selectedRecord.fullName}</Text>
                    <Text style={styles.modalSpecialty}>{selectedRecord.specialty}</Text>
                    <View style={{ flexDirection: 'row', marginTop: 6 }}>
                      {selectedRecord.status === 'resolved' || selectedRecord.status === 'read' ? (
                        <View style={[styles.statusBadge, styles.statusBadgeApproved]}>
                          <Check size={14} color="#15803d" />
                          <Text style={styles.statusApprovedText}>Approved</Text>
                        </View>
                      ) : (
                        <View style={[styles.statusBadge, styles.statusBadgeRejected]}>
                          <X size={14} color="#b91c1c" />
                          <Text style={styles.statusRejectedText}>Rejected</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <View style={styles.modalRow}>
                    <Mail size={18} color="#94a3b8" />
                    <View>
                      <Text style={styles.modalLabel}>Email</Text>
                      <Text style={styles.modalValue}>{selectedRecord.email}</Text>
                    </View>
                  </View>

                  <View style={styles.modalRow}>
                    <Phone size={18} color="#94a3b8" />
                    <View>
                      <Text style={styles.modalLabel}>Phone</Text>
                      <Text style={styles.modalValue}>{selectedRecord.phoneNumber || 'N/A'}</Text>
                    </View>
                  </View>

                  <View style={styles.modalRow}>
                    <ShieldCheck size={18} color="#94a3b8" />
                    <View>
                      <Text style={styles.modalLabel}>License Number</Text>
                      <Text style={styles.modalValue}>{selectedRecord.licenseNumber || 'N/A'}</Text>
                    </View>
                  </View>

                  <View style={styles.modalRow}>
                    <Building2 size={18} color="#94a3b8" />
                    <View>
                      <Text style={styles.modalLabel}>Hospital / Clinic</Text>
                      <Text style={styles.modalValue}>{selectedRecord.hospitalName || 'N/A'}</Text>
                      {selectedRecord.hospitalAddress ? (
                        <Text style={styles.modalSubValue}>{selectedRecord.hospitalAddress}</Text>
                      ) : null}
                    </View>
                  </View>
                </View>

                {selectedRecord.documentPhoto ? (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Uploaded Document</Text>
                    <Image
                      source={{ uri: selectedRecord.documentPhoto }}
                      style={styles.documentPreviewImage}
                      resizeMode="cover"
                    />
                  </View>
                ) : null}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  headerIconContainer: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f1f5f9' },
  filterChipActive: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe' },
  filterChipText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  filterChipTextActive: { color: '#1d4ed8', fontWeight: 'bold' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: '#e2e8f0' },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: '#0f172a' },
  content: { padding: 16, paddingBottom: 40 },
  recordCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9', elevation: 1 },
  recordCardContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: 'bold', color: '#1d4ed8' },
  infoContainer: { flex: 1 },
  doctorName: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  metaText: { fontSize: 13, color: '#64748b', marginTop: 2 },
  subMetaText: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  actionColumn: { alignItems: 'flex-end', gap: 10 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusBadgeApproved: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0' },
  statusBadgeRejected: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
  statusApprovedText: { fontSize: 12, fontWeight: 'bold', color: '#15803d' },
  statusRejectedText: { fontSize: 12, fontWeight: 'bold', color: '#b91c1c' },
  deleteBtn: { padding: 6, borderRadius: 8, backgroundColor: '#f8fafc' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 40 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginTop: 12 },
  emptySub: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 6, maxWidth: 280 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', paddingBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  modalCloseBtn: { padding: 4 },
  modalBody: { padding: 20 },
  modalDoctorHeader: { flexDirection: 'row', gap: 16, alignItems: 'center', marginBottom: 20 },
  largeAvatarCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  largeAvatarText: { fontSize: 22, fontWeight: 'bold', color: '#1d4ed8' },
  modalDoctorName: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  modalSpecialty: { fontSize: 14, color: '#64748b', marginTop: 2 },
  modalSection: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  modalSectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#0f172a', marginBottom: 12 },
  modalRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  modalLabel: { fontSize: 11, fontWeight: 'bold', color: '#94a3b8', uppercase: true },
  modalValue: { fontSize: 14, fontWeight: '600', color: '#0f172a', marginTop: 2 },
  modalSubValue: { fontSize: 13, color: '#64748b', marginTop: 2 },
  documentPreviewImage: { width: '100%', height: 200, borderRadius: 12 }
});

export default ProcessedRequestsScreen;
