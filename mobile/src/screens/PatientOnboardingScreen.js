import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { HeartPulse, Calendar, User, Scale, Ruler, Pill, Activity, ShieldCheck } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useSelector, useDispatch } from 'react-redux';
import { setUser } from '../store/slices/authSlice';

import DatePickerModal from '../components/DatePickerModal';

const PatientOnboardingScreen = ({ navigation }) => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [formData, setFormData] = useState({
    gender: user?.user_metadata?.gender || 'male',
    dob: user?.user_metadata?.dob || '',
    age: user?.user_metadata?.age ? String(user.user_metadata.age) : '',
    weight: user?.user_metadata?.weight_kg ? String(user.user_metadata.weight_kg) : '',
    height: user?.user_metadata?.height_cm ? String(user.user_metadata.height_cm) : '',
    bloodGroup: user?.user_metadata?.blood_group || 'O+',
    drugs: '',
    diseases: ''
  });

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const genders = ['male', 'female', 'other'];

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCompleteProfile = async () => {
    if (!formData.age.trim() || !formData.weight.trim() || !formData.height.trim() || !formData.bloodGroup) {
      Alert.alert('Incomplete Data', 'Please fill in your Age, Weight, Height, and Blood Group to complete your health profile.');
      return;
    }

    setLoading(true);
    try {
      const medicalHistoryData = {
        dob: formData.dob.trim(),
        drugs: formData.drugs.trim() || 'None',
        diseases: formData.diseases.trim() || 'None'
      };

      // 1. Update Supabase profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          gender: formData.gender,
          age: parseInt(formData.age, 10),
          weight_kg: parseFloat(formData.weight),
          height_cm: parseFloat(formData.height),
          blood_group: formData.bloodGroup,
          medical_history: JSON.stringify(medicalHistoryData)
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // 2. Synchronize Supabase Auth user metadata
      const { data: authData, error: authError } = await supabase.auth.updateUser({
        data: {
          gender: formData.gender,
          age: parseInt(formData.age, 10),
          weight_kg: parseFloat(formData.weight),
          height_cm: parseFloat(formData.height),
          blood_group: formData.bloodGroup,
          dob: formData.dob.trim(),
          drugs: formData.drugs.trim() || 'None',
          diseases: formData.diseases.trim() || 'None',
          health_onboarded: true
        }
      });

      if (authError) throw authError;

      if (authData?.user) {
        dispatch(setUser(authData.user));
      }
    } catch (err) {
      console.error('Patient onboarding error:', err);
      Alert.alert('Error', err.message || 'An error occurred while saving your health data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
            <View style={{ flex: 1 }}>
              <View style={styles.iconCircle}>
                <HeartPulse size={36} color="#1d4ed8" />
              </View>
              <Text style={styles.title}>Complete Your Health Profile</Text>
              <Text style={styles.subtitle}>
                Please provide your vital health metrics so our AI can accurately analyze your health predictions.
              </Text>
            </View>
            <TouchableOpacity onPress={async () => { await supabase.auth.signOut(); }} style={{ padding: 10, backgroundColor: '#fee2e2', borderRadius: 8 }}>
              <Text style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 12 }}>Logout</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formCard}>
            {/* Gender Selection */}
            <Text style={styles.label}>Gender</Text>
            <View style={styles.genderRow}>
              {genders.map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.genderBtn, formData.gender === g && styles.genderBtnActive]}
                  onPress={() => handleInputChange('gender', g)}
                >
                  <Text style={[styles.genderText, formData.gender === g && styles.genderTextActive]}>
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Date of Birth */}
            <Text style={styles.label}>Date of Birth</Text>
            <TouchableOpacity
              style={styles.inputBox}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.8}
            >
              <Calendar size={20} color="#1d4ed8" style={styles.icon} />
              <Text style={[styles.input, { paddingVertical: 12, color: formData.dob ? '#0f172a' : '#94a3b8', fontWeight: formData.dob ? '700' : '400' }]}>
                {formData.dob ? `DOB: ${formData.dob}` : 'Select Date of Birth (DD-MM-YYYY)'}
              </Text>
            </TouchableOpacity>

            {/* Age & Blood Group */}
            <View style={styles.row}>
              <View style={[styles.flex1, { marginRight: 8 }]}>
                <Text style={styles.label}>Age (Years) *</Text>
                <View style={styles.inputBox}>
                  <User size={20} color="#94a3b8" style={styles.icon} />
                  <TextInput
                    placeholder="e.g. 28"
                    placeholderTextColor="#94a3b8"
                    keyboardType="number-pad"
                    style={styles.input}
                    value={formData.age}
                    onChangeText={(val) => handleInputChange('age', val)}
                  />
                </View>
              </View>

              <View style={[styles.flex1, { marginLeft: 8 }]}>
                <Text style={styles.label}>Blood Group *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 2 }}>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {bloodGroups.map((bg) => (
                      <TouchableOpacity
                        key={bg}
                        style={[styles.chip, formData.bloodGroup === bg && styles.chipActive]}
                        onPress={() => handleInputChange('bloodGroup', bg)}
                      >
                        <Text style={[styles.chipText, formData.bloodGroup === bg && styles.chipTextActive]}>
                          {bg}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>

            {/* Weight & Height */}
            <View style={styles.row}>
              <View style={[styles.flex1, { marginRight: 8 }]}>
                <Text style={styles.label}>Weight (kg) *</Text>
                <View style={styles.inputBox}>
                  <Scale size={20} color="#94a3b8" style={styles.icon} />
                  <TextInput
                    placeholder="e.g. 70"
                    placeholderTextColor="#94a3b8"
                    keyboardType="decimal-pad"
                    style={styles.input}
                    value={formData.weight}
                    onChangeText={(val) => handleInputChange('weight', val)}
                  />
                </View>
              </View>

              <View style={[styles.flex1, { marginLeft: 8 }]}>
                <Text style={styles.label}>Height (cm) *</Text>
                <View style={styles.inputBox}>
                  <Ruler size={20} color="#94a3b8" style={styles.icon} />
                  <TextInput
                    placeholder="e.g. 175"
                    placeholderTextColor="#94a3b8"
                    keyboardType="decimal-pad"
                    style={styles.input}
                    value={formData.height}
                    onChangeText={(val) => handleInputChange('height', val)}
                  />
                </View>
              </View>
            </View>

            {/* Current Medications */}
            <Text style={styles.label}>Current Medications / Drugs</Text>
            <View style={styles.inputBox}>
              <Pill size={20} color="#94a3b8" style={styles.icon} />
              <TextInput
                placeholder="e.g. Metformin 500mg, Aspirin (or None)"
                placeholderTextColor="#94a3b8"
                style={styles.input}
                value={formData.drugs}
                onChangeText={(val) => handleInputChange('drugs', val)}
              />
            </View>

            {/* Pre-existing Medical Conditions */}
            <Text style={styles.label}>Pre-existing Medical Conditions</Text>
            <View style={styles.inputBox}>
              <Activity size={20} color="#94a3b8" style={styles.icon} />
              <TextInput
                placeholder="e.g. Asthma, Hypertension, Diabetes (or None)"
                placeholderTextColor="#94a3b8"
                style={styles.input}
                value={formData.diseases}
                onChangeText={(val) => handleInputChange('diseases', val)}
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.disabledBtn]}
              onPress={handleCompleteProfile}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ShieldCheck size={22} color="#ffffff" />
                  <Text style={styles.submitText}>Save & Proceed to Dashboard</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <DatePickerModal
        visible={showDatePicker}
        currentDate={formData.dob}
        onConfirm={(val) => handleInputChange('dob', val)}
        onClose={() => setShowDatePicker(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  content: {
    padding: 20,
    paddingBottom: 40
  },
  header: {
    alignItems: 'center',
    marginVertical: 16
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#dbeafe'
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 12
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginTop: 14,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4
  },
  genderBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    alignItems: 'center'
  },
  genderBtnActive: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8'
  },
  genderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569'
  },
  genderTextActive: {
    color: '#ffffff'
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  flex1: {
    flex: 1
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 4
  },
  icon: {
    marginRight: 10
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500'
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc'
  },
  chipActive: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8'
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569'
  },
  chipTextActive: {
    color: '#ffffff'
  },
  submitBtn: {
    backgroundColor: '#1d4ed8',
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: '#1d4ed8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4
  },
  disabledBtn: {
    opacity: 0.7
  },
  submitText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold'
  }
});

export default PatientOnboardingScreen;
