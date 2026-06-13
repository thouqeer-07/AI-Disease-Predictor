import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  Alert, 
  ActivityIndicator 
} from 'react-native';
import { UserCircle, Mail, Phone, Heart, Shield, LogOut, Award, Star, MapPin, Trash2 } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { supabase } from '../lib/supabase';

const ProfileScreen = () => {
  const { user } = useSelector((state) => state.auth);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const metadata = user?.user_metadata || {};
  const fullName = metadata.full_name || 'User';
  const role = metadata.role || 'patient';
  const phoneNumber = metadata.phone_number || 'N/A';
  const gender = metadata.gender || 'N/A';

  const handleLogout = async () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Log Out', 
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            try {
              const { error } = await supabase.auth.signOut();
              if (error) throw error;
            } catch (error) {
              console.error('Error logging out:', error);
              Alert.alert('Error', 'Failed to log out. Please try again.');
            } finally {
              setLoggingOut(false);
            }
          }
        }
      ]
    );
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'CRITICAL WARNING',
      'This will PERMANENTLY DELETE your entire AuraHealth account, including medical history, chat consultations, and logs. This action CANNOT be undone. Are you absolutely sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete Account', 
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'Are you 100% sure you want to delete your account? This will wipe all data immediately.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete Permanently',
                  style: 'destructive',
                  onPress: async () => {
                    setDeleting(true);
                    try {
                      const { error } = await supabase.rpc('delete_user_account');
                      if (error) throw error;
                      
                      Alert.alert(
                        'Deleted',
                        'Your account and all associated data have been permanently deleted.',
                        [
                          {
                            text: 'OK',
                            onPress: async () => {
                              await supabase.auth.signOut();
                            }
                          }
                        ]
                      );
                    } catch (error) {
                      console.error('Error deleting account:', error);
                      Alert.alert('Error', 'Failed to delete account: ' + (error.message || error));
                    } finally {
                      setDeleting(false);
                    }
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* User Card Header */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.avatarContainer}>
            <UserCircle size={80} color="#1d4ed8" />
          </View>
          <Text style={styles.userName}>{fullName}</Text>
          <View style={[styles.roleBadge, role === 'doctor' ? styles.roleBadgeDoctor : styles.roleBadgePatient]}>
            <Text style={[styles.roleBadgeText, role === 'doctor' ? styles.roleBadgeTextDoctor : styles.roleBadgeTextPatient]}>
              {role.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Contact Info Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>Personal Details</Text>
          
          <View style={styles.infoRow}>
            <Mail size={20} color="#94a3b8" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Email Address</Text>
              <Text style={styles.infoValue}>{user?.email || 'N/A'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Phone size={20} color="#94a3b8" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Phone Number</Text>
              <Text style={styles.infoValue}>{phoneNumber}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Heart size={20} color="#94a3b8" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Gender</Text>
              <Text style={styles.infoValue}>{gender.charAt(0).toUpperCase() + gender.slice(1)}</Text>
            </View>
          </View>
        </View>

        {/* Doctor-Specific Details Card */}
        {role === 'doctor' && (
          <View style={styles.detailsCard}>
            <Text style={styles.cardTitle}>Professional Credentials</Text>
            
            <View style={styles.infoRow}>
              <Award size={20} color="#94a3b8" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Specialty</Text>
                <Text style={styles.infoValue}>{metadata.specialty || 'N/A'}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Shield size={20} color="#94a3b8" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Medical License ID</Text>
                <Text style={styles.infoValue}>{metadata.license_number || 'N/A'}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Star size={20} color="#94a3b8" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Experience</Text>
                <Text style={styles.infoValue}>{metadata.experience_years ? `${metadata.experience_years} Years` : 'N/A'}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <MapPin size={20} color="#94a3b8" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Hospital / Clinic</Text>
                <Text style={styles.infoValue}>{metadata.hospital_name || 'N/A'}</Text>
                {metadata.hospital_address && (
                  <Text style={styles.infoValueSub}>{metadata.hospital_address}</Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Action Button Card */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity 
            style={styles.logoutBtn} 
            onPress={handleLogout}
            disabled={loggingOut || deleting}
          >
            {loggingOut ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <LogOut size={20} color="#fff" />
                <Text style={styles.logoutBtnText}>Log Out Account</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.deleteBtn} 
            onPress={handleDeleteAccount}
            disabled={loggingOut || deleting}
          >
            {deleting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Trash2 size={20} color="#fff" />
                <Text style={styles.deleteBtnText}>Delete Account</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 40 },
  profileHeaderCard: { backgroundColor: '#fff', borderRadius: 24, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, marginBottom: 20 },
  avatarContainer: { marginBottom: 12 },
  userName: { fontSize: 22, fontWeight: 'bold', color: '#0f172a' },
  roleBadge: { marginTop: 10, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12 },
  roleBadgePatient: { backgroundColor: '#eff6ff' },
  roleBadgeDoctor: { backgroundColor: '#f0fdf4' },
  roleBadgeText: { fontSize: 11, fontWeight: 'bold' },
  roleBadgeTextPatient: { color: '#1d4ed8' },
  roleBadgeTextDoctor: { color: '#10b981' },
  detailsCard: { backgroundColor: '#fff', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#f1f5f9', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, marginBottom: 20 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  infoTextContainer: { flex: 1 },
  infoLabel: { fontSize: 11, fontWeight: 'bold', color: '#94a3b8', uppercase: true, letterSpacing: 0.5 },
  infoValue: { fontSize: 15, fontWeight: 'bold', color: '#334155', marginTop: 2 },
  infoValueSub: { fontSize: 13, color: '#64748b', marginTop: 4 },
  actionButtonsContainer: { gap: 12, marginTop: 10 },
  logoutBtn: { backgroundColor: '#1e293b', height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, elevation: 2, shadowColor: '#1e293b', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  logoutBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  deleteBtn: { backgroundColor: '#ef4444', height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, elevation: 4, shadowColor: '#ef4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  deleteBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});

export default ProfileScreen;
