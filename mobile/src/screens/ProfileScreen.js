import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { 
  User, 
  Phone, 
  Heart, 
  Scale, 
  Ruler, 
  Calendar, 
  ShieldCheck, 
  Save, 
  LogOut, 
  Trash2, 
  BookOpen,
  FileText
} from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { supabase } from '../lib/supabase';

const ProfileScreen = () => {
  const { user } = useSelector((state) => state.auth);
  const metaRole = user?.user_metadata?.role || 'patient';

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    full_name: user?.user_metadata?.full_name || '',
    age: user?.user_metadata?.age ? String(user.user_metadata.age) : '',
    weight_kg: user?.user_metadata?.weight_kg ? String(user.user_metadata.weight_kg) : '',
    height_cm: user?.user_metadata?.height_cm ? String(user.user_metadata.height_cm) : '',
    blood_group: user?.user_metadata?.blood_group || '',
    phone_number: user?.user_metadata?.phone_number || '',
    gender: user?.user_metadata?.gender || '',
    // Doctor specific
    specialty: '',
    license_number: '',
    hospital_name: '',
    hospital_address: '',
    dob: '',
    bio: user?.user_metadata?.bio || '',
    education: user?.user_metadata?.education || {
      universityName: '',
      startYear: '',
      endYear: '',
      duration: '',
      collegeLocation: ''
    }
  });

  const handleChange = (name, value) => {
    if (['universityName', 'startYear', 'endYear', 'duration', 'collegeLocation'].includes(name)) {
      setFormData(prev => ({
        ...prev,
        education: { ...(prev.education || {}), [name]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  useEffect(() => {
    const fetchFullProfile = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        // 1. Fetch from profiles table
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        // 2. Fetch from doctors table (if doctor)
        let doctorData = null;
        if (metaRole === 'doctor') {
          const { data } = await supabase
            .from('doctors')
            .select('*')
            .eq('id', user.id)
            .single();
          doctorData = data;
        }

        // 3. Fallback to user_metadata and normalize education, bio, dob
        const meta = user.user_metadata || {};

        const getEduVal = (eduObj, keyCamel, keySnake) => {
          if (!eduObj || typeof eduObj !== 'object') return '';
          return eduObj[keyCamel] || eduObj[keySnake] || '';
        };

        let rawEdu = meta.education || {};
        if (doctorData?.education) {
          try {
            rawEdu = typeof doctorData.education === 'string' ? JSON.parse(doctorData.education) : doctorData.education;
          } catch (e) {}
        } else if (profileData?.medical_history) {
          try {
            const parsedMed = typeof profileData.medical_history === 'string' ? JSON.parse(profileData.medical_history) : profileData.medical_history;
            if (parsedMed?.education) rawEdu = parsedMed.education;
          } catch (e) {}
        }

        const normalizedEdu = {
          universityName: getEduVal(rawEdu, 'universityName', 'university_name'),
          startYear: getEduVal(rawEdu, 'startYear', 'start_year'),
          endYear: getEduVal(rawEdu, 'endYear', 'end_year'),
          duration: getEduVal(rawEdu, 'duration', 'duration'),
          collegeLocation: getEduVal(rawEdu, 'collegeLocation', 'college_location')
        };

        let fetchedDob = doctorData?.dob || meta.dob || meta.dateOfBirth || meta.dob_string || '';
        if (!fetchedDob && profileData?.medical_history) {
          try {
            const parsedMed = typeof profileData.medical_history === 'string' ? JSON.parse(profileData.medical_history) : profileData.medical_history;
            if (parsedMed?.dob) fetchedDob = parsedMed.dob;
          } catch (e) {}
        }

        let fetchedBio = doctorData?.bio || meta.bio || '';
        if (!fetchedBio && profileData?.medical_history) {
          try {
            const parsedMed = typeof profileData.medical_history === 'string' ? JSON.parse(profileData.medical_history) : profileData.medical_history;
            if (parsedMed?.bio) fetchedBio = parsedMed.bio;
          } catch (e) {}
        }

        // 4. Fallback to inquiries application payload if dob or education is missing
        if ((!fetchedDob || !normalizedEdu.universityName) && user?.email) {
          try {
            const { data: matchedInqs } = await supabase
              .from('inquiries')
              .select('message')
              .eq('subject', 'doctor_application')
              .ilike('message', `%${user.email}%`);

            if (matchedInqs && matchedInqs.length > 0) {
              for (const inq of matchedInqs) {
                if (inq.message) {
                  try {
                    const parsedInq = typeof inq.message === 'string' ? JSON.parse(inq.message) : inq.message;
                    if (!fetchedDob && (parsedInq.dob || parsedInq.dateOfBirth)) {
                      fetchedDob = parsedInq.dob || parsedInq.dateOfBirth;
                    }
                    if (!fetchedBio && parsedInq.bio) {
                      fetchedBio = parsedInq.bio;
                    }
                    if (!normalizedEdu.universityName && parsedInq.education) {
                      const inqEdu = parsedInq.education;
                      normalizedEdu.universityName = getEduVal(inqEdu, 'universityName', 'university_name');
                      normalizedEdu.startYear = getEduVal(inqEdu, 'startYear', 'start_year');
                      normalizedEdu.endYear = getEduVal(inqEdu, 'endYear', 'end_year');
                      normalizedEdu.duration = getEduVal(inqEdu, 'duration', 'duration');
                      normalizedEdu.collegeLocation = getEduVal(inqEdu, 'collegeLocation', 'college_location');
                    }
                  } catch (e) {}
                }
              }
            }
          } catch (e) {}
        }

        setFormData(prev => ({
          ...prev,
          full_name: profileData?.full_name || meta.full_name || prev.full_name,
          phone_number: profileData?.phone_number || meta.phone_number || prev.phone_number,
          gender: profileData?.gender || meta.gender || prev.gender,
          age: profileData?.age ? String(profileData.age) : meta.age ? String(meta.age) : prev.age,
          weight_kg: profileData?.weight_kg ? String(profileData.weight_kg) : meta.weight_kg ? String(meta.weight_kg) : prev.weight_kg,
          height_cm: profileData?.height_cm ? String(profileData.height_cm) : meta.height_cm ? String(meta.height_cm) : prev.height_cm,
          blood_group: profileData?.blood_group || meta.blood_group || prev.blood_group,
          // Doctor fields
          specialty: doctorData?.specialty || meta.specialty || '',
          license_number: doctorData?.license_number || meta.license_number || '',
          hospital_name: doctorData?.hospital_name || meta.hospital_name || '',
          hospital_address: doctorData?.hospital_address || meta.hospital_address || '',
          dob: fetchedDob,
          bio: fetchedBio,
          education: normalizedEdu
        }));
      } catch (err) {
        console.error('Error fetching full profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFullProfile();
  }, [metaRole, user?.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Update Auth user_metadata
      const { data: authData, error: authError } = await supabase.auth.updateUser({
        data: formData
      });
      if (authError) throw authError;

      if (authData?.user) {
        dispatch(setUser(authData.user));
      }

      // 2. Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          gender: formData.gender,
          age: formData.age ? parseInt(formData.age, 10) : null,
          weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
          height_cm: formData.height_cm ? parseFloat(formData.height_cm) : null,
          blood_group: formData.blood_group,
          phone_number: formData.phone_number,
          medical_history: JSON.stringify({
            dob: formData.dob,
            bio: formData.bio,
            education: formData.education
          })
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // 3. Update doctors table if doctor
      if (metaRole === 'doctor') {
        const { error: doctorError } = await supabase
          .from('doctors')
          .update({
            specialty: formData.specialty,
            license_number: formData.license_number,
            hospital_name: formData.hospital_name,
            hospital_address: formData.hospital_address,
            bio: formData.bio,
            education: JSON.stringify(formData.education)
          })
          .eq('id', user.id);

        if (doctorError) throw doctorError;
      }

      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Update error:', error);
      Alert.alert('Error', 'Error updating profile: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

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
          onPress: async () => {
            setDeleting(true);
            try {
              const currentUserId = user?.id;
              const currentUserEmail = user?.email;

              // 1. Try Backend API for complete auth & database deletion
              try {
                if (currentUserId) {
                  await fetchApiWithFallback('/admin/delete-patient', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: currentUserId })
                  });
                }
              } catch (apiErr) {
                console.log('Backend delete notice, executing direct Supabase cascade delete:', apiErr.message);
              }

              // 2. Direct Supabase Cascade Cleanup across all tables
              if (currentUserId) {
                await supabase.from('doctors').delete().eq('id', currentUserId);
                await supabase.from('profiles').delete().eq('id', currentUserId);
                await supabase.from('emergency_contacts').delete().eq('user_id', currentUserId);
                await supabase.from('sos_logs').delete().eq('user_id', currentUserId);
                await supabase.from('inquiries').delete().eq('user_id', currentUserId);
              }

              if (currentUserEmail) {
                const cleanEmail = currentUserEmail.trim().toLowerCase();
                await supabase.from('doctors').delete().ilike('email', cleanEmail);
                await supabase.from('profiles').delete().ilike('email', cleanEmail);
                
                const { data: inqs } = await supabase.from('inquiries').select('*');
                for (const inq of (inqs || [])) {
                  try {
                    const payload = JSON.parse(inq.message);
                    if (payload.email && payload.email.trim().toLowerCase() === cleanEmail) {
                      await supabase.from('inquiries').delete().eq('id', inq.id);
                    }
                  } catch (e) {}
                }
              }

              // Try RPC fallback if available
              try { await supabase.rpc('delete_user_account'); } catch (e) {}

              Alert.alert('Deleted', 'Your account and all associated data have been permanently deleted.');
              await supabase.auth.signOut();
            } catch (error) {
              console.error('Deletion error:', error);
              Alert.alert('Error', 'Error deleting account: ' + error.message);
            } finally {
              setDeleting(false);
            }
          }
        }
      ]
    );
  };

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const genders = ['male', 'female', 'other'];

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content}>
          {/* Settings Header */}
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Settings</Text>
            <Text style={styles.subtitle}>Manage your health profile and account preferences.</Text>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#1d4ed8" style={{ marginVertical: 40 }} />
          ) : (
            <>
              {/* Card 1: Personal Information */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <User size={20} color="#1d4ed8" />
                  <Text style={styles.cardHeaderTitle}>Personal Information</Text>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Full Name</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.full_name}
                    onChangeText={(val) => handleChange('full_name', val)}
                    placeholder="Enter full name"
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Gender</Text>
                  <View style={styles.chipRow}>
                    {genders.map((g) => (
                      <TouchableOpacity
                        key={g}
                        style={[styles.chip, formData.gender === g && styles.chipActive]}
                        onPress={() => handleChange('gender', g)}
                      >
                        <Text style={[styles.chipText, formData.gender === g && styles.chipTextActive]}>
                          {g.charAt(0).toUpperCase() + g.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Phone Number</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.phone_number}
                    onChangeText={(val) => handleChange('phone_number', val)}
                    placeholder="Enter phone number"
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Card 2: Role-Based Section (Medical Credentials OR Health Metrics) */}
              {metaRole === 'doctor' ? (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <ShieldCheck size={20} color="#1d4ed8" />
                    <Text style={styles.cardHeaderTitle}>Medical Credentials</Text>
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Specialty</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.specialty}
                      onChangeText={(val) => handleChange('specialty', val)}
                      placeholder="e.g. Cardiology, Neurology..."
                      placeholderTextColor="#94a3b8"
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>License Number</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.license_number}
                      onChangeText={(val) => handleChange('license_number', val)}
                      placeholder="Enter medical license number"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Hospital Name</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.hospital_name}
                      onChangeText={(val) => handleChange('hospital_name', val)}
                      placeholder="Hospital or clinic name"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Date of Birth</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.dob}
                      onChangeText={(val) => handleChange('dob', val)}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Hospital Address</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.hospital_address}
                      onChangeText={(val) => handleChange('hospital_address', val)}
                      placeholder="Hospital address"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Professional Bio</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={formData.bio}
                      onChangeText={(val) => handleChange('bio', val)}
                      placeholder="Write brief bio..."
                      placeholderTextColor="#94a3b8"
                      multiline
                      numberOfLines={4}
                    />
                  </View>

                  <Text style={styles.subSectionHeader}>Education Details</Text>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>University Name</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.education?.universityName || ''}
                      onChangeText={(val) => handleChange('universityName', val)}
                      placeholder="University name"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>College Location</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.education?.collegeLocation || ''}
                      onChangeText={(val) => handleChange('collegeLocation', val)}
                      placeholder="College location"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>

                  <View style={styles.rowTwoCol}>
                    <View style={[styles.fieldGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Start Year</Text>
                      <TextInput
                        style={styles.input}
                        value={formData.education?.startYear ? String(formData.education.startYear) : ''}
                        onChangeText={(val) => handleChange('startYear', val)}
                        placeholder="e.g. 2012"
                        placeholderTextColor="#94a3b8"
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={[styles.fieldGroup, { flex: 1 }]}>
                      <Text style={styles.label}>End Year</Text>
                      <TextInput
                        style={styles.input}
                        value={formData.education?.endYear ? String(formData.education.endYear) : ''}
                        onChangeText={(val) => handleChange('endYear', val)}
                        placeholder="e.g. 2018"
                        placeholderTextColor="#94a3b8"
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Duration (Years)</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.education?.duration ? String(formData.education.duration) : ''}
                      onChangeText={(val) => handleChange('duration', val)}
                      placeholder="e.g. 6"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Heart size={20} color="#1d4ed8" />
                    <Text style={styles.cardHeaderTitle}>Health Metrics</Text>
                  </View>

                  <View style={styles.rowTwoCol}>
                    <View style={[styles.fieldGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Age</Text>
                      <TextInput
                        style={styles.input}
                        value={formData.age}
                        onChangeText={(val) => handleChange('age', val)}
                        placeholder="Age"
                        placeholderTextColor="#94a3b8"
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={[styles.fieldGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Weight (kg)</Text>
                      <TextInput
                        style={styles.input}
                        value={formData.weight_kg}
                        onChangeText={(val) => handleChange('weight_kg', val)}
                        placeholder="Weight (kg)"
                        placeholderTextColor="#94a3b8"
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <View style={styles.rowTwoCol}>
                    <View style={[styles.fieldGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Height (cm)</Text>
                      <TextInput
                        style={styles.input}
                        value={formData.height_cm}
                        onChangeText={(val) => handleChange('height_cm', val)}
                        placeholder="Height (cm)"
                        placeholderTextColor="#94a3b8"
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Blood Group</Text>
                    <View style={styles.chipGrid}>
                      {bloodGroups.map((bg) => (
                        <TouchableOpacity
                          key={bg}
                          style={[styles.bloodChip, formData.blood_group === bg && styles.bloodChipActive]}
                          onPress={() => handleChange('blood_group', bg)}
                        >
                          <Text style={[styles.bloodChipText, formData.blood_group === bg && styles.bloodChipTextActive]}>
                            {bg}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              )}

              {/* Save Changes Button */}
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Save size={18} color="#fff" />
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Legal Terms & Privacy Policy Navigation */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f8fafc',
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  paddingVertical: 14,
                  borderRadius: 14,
                  marginBottom: 12,
                  gap: 8
                }}
                onPress={() => navigation.navigate('TermsPrivacy', { tab: 'terms' })}
              >
                <FileText size={16} color="#1d4ed8" />
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#1d4ed8' }}>Terms of Service & Privacy Policy</Text>
              </TouchableOpacity>

              {/* Action Buttons Row */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.logoutBtn}
                  onPress={handleLogout}
                  disabled={loggingOut || deleting}
                >
                  {loggingOut ? (
                    <ActivityIndicator size="small" color="#64748b" />
                  ) : (
                    <>
                      <LogOut size={16} color="#64748b" />
                      <Text style={styles.logoutBtnText}>Logout</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={handleDeleteAccount}
                  disabled={loggingOut || deleting}
                >
                  {deleting ? (
                    <ActivityIndicator size="small" color="#ef4444" />
                  ) : (
                    <>
                      <Trash2 size={16} color="#ef4444" />
                      <Text style={styles.deleteBtnText}>Delete Account</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 40 },
  headerContainer: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#f1f5f9', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, marginBottom: 20 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  cardHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  subSectionHeader: { fontSize: 15, fontWeight: 'bold', color: '#0f172a', marginTop: 12, marginBottom: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6 },
  input: { height: 48, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 16, fontSize: 15, color: '#0f172a' },
  textArea: { height: 96, paddingVertical: 12, textAlignVertical: 'top' },
  rowTwoCol: { flexDirection: 'row', gap: 12 },
  chipRow: { flexDirection: 'row', gap: 10 },
  chip: { flex: 1, height: 44, borderRadius: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  chipActive: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  chipText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  chipTextActive: { color: '#1d4ed8' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bloodChip: { width: '23%', height: 40, borderRadius: 10, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  bloodChipActive: { backgroundColor: '#eff6ff', borderColor: '#1d4ed8' },
  bloodChipText: { fontSize: 13, fontWeight: 'bold', color: '#64748b' },
  bloodChipTextActive: { color: '#1d4ed8' },
  saveBtn: { backgroundColor: '#1d4ed8', height: 52, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4, marginBottom: 16, elevation: 2 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  actionRow: { flexDirection: 'row', gap: 12 },
  logoutBtn: { flex: 1, height: 48, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  logoutBtnText: { color: '#64748b', fontSize: 14, fontWeight: 'bold' },
  deleteBtn: { flex: 1, height: 48, borderRadius: 12, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  deleteBtnText: { color: '#ef4444', fontSize: 14, fontWeight: 'bold' }
});

export default ProfileScreen;
