import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  TextInput
} from 'react-native';
import { Search, ArrowRight, Mail } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { supabase } from '../lib/supabase';

const DoctorInquiriesScreen = ({ navigation }) => {
  const { user } = useSelector(state => state.auth);
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inquiries')
        .select('*')
        .eq('doctor_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInquiries(data || []);
    } catch (err) {
      console.error('Error fetching inquiries:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredInquiries = inquiries.filter(i => 
    i.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.subject?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Patient Inquiries</Text>
        <Text style={styles.subtitle}>Review questions and consultation requests.</Text>
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search inquiries..."
          placeholderTextColor="#94a3b8"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        {loading ? (
          <ActivityIndicator size="large" color="#1d4ed8" style={{ marginTop: 50 }} />
        ) : filteredInquiries.length > 0 ? (
          filteredInquiries.map(inquiry => {
            const isUrgent = inquiry.status === 'urgent';
            return (
              <TouchableOpacity key={inquiry.id} style={styles.card} activeOpacity={0.7}>
                <View style={styles.cardMain}>
                  <View style={[styles.avatar, isUrgent && styles.avatarUrgent]}>
                    <Text style={[styles.avatarText, isUrgent && styles.avatarTextUrgent]}>
                      {inquiry.patient_name?.charAt(0) || 'P'}
                    </Text>
                  </View>
                  <View style={styles.info}>
                    <View style={styles.nameRow}>
                      <Text style={styles.name} numberOfLines={1}>{inquiry.patient_name}</Text>
                      {isUrgent && (
                        <View style={styles.urgentBadge}>
                          <Text style={styles.urgentText}>URGENT</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.subject} numberOfLines={2}>{inquiry.subject}</Text>
                    <Text style={styles.date}>
                      {new Date(inquiry.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </Text>
                  </View>
                  <ArrowRight size={20} color="#cbd5e1" />
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Mail size={48} color="#e2e8f0" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyText}>No inquiries found.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingBottom: 15 },
  title: { fontSize: 28, fontWeight: '900', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 20, paddingHorizontal: 16, height: 50, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 15 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: '#0f172a' },
  listContent: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#f1f5f9', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
  cardMain: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  avatarUrgent: { backgroundColor: '#fef2f2' },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: '#1d4ed8' },
  avatarTextUrgent: { color: '#ef4444' },
  info: { flex: 1, marginLeft: 14, marginRight: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', flexShrink: 1 },
  urgentBadge: { backgroundColor: '#fee2e2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  urgentText: { color: '#ef4444', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  subject: { fontSize: 14, color: '#334155', fontWeight: '500', marginBottom: 6, lineHeight: 20 },
  date: { fontSize: 12, color: '#94a3b8' },
  emptyState: { padding: 40, alignItems: 'center', marginTop: 20 },
  emptyText: { color: '#94a3b8', fontSize: 15 }
});

export default DoctorInquiriesScreen;
