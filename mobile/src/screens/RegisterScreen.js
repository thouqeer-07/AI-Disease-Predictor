import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Activity, Mail, Lock, User, Shield, Phone, MapPin, Award, Briefcase, AlertCircle } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

const RegisterScreen = ({ navigation }) => {
  const [role, setRole] = useState('patient');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phoneNumber: '',
    gender: '',
    specialty: '',
    licenseNumber: '',
    hospitalName: '',
    hospitalAddress: '',
    experienceYears: ''
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRegister = async () => {
    setError(null);
    
    // Basic Validations
    if (!formData.fullName.trim() || !formData.email.trim() || !formData.password.trim() || !formData.phoneNumber.trim() || !formData.gender) {
      setError('Please fill in all personal details.');
      return;
    }
    
    if (role === 'doctor') {
      if (!formData.specialty.trim() || !formData.licenseNumber.trim() || !formData.hospitalName.trim() || !formData.experienceYears.trim() || !formData.hospitalAddress.trim()) {
        setError('Please fill in all professional credentials.');
        return;
      }
    }
    
    setLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName.trim(),
            role: role,
            phone_number: formData.phoneNumber.trim(),
            gender: formData.gender,
            specialty: role === 'doctor' ? formData.specialty.trim() : undefined,
            license_number: role === 'doctor' ? formData.licenseNumber.trim() : undefined,
            hospital_name: role === 'doctor' ? formData.hospitalName.trim() : undefined,
            hospital_address: role === 'doctor' ? formData.hospitalAddress.trim() : undefined,
            experience_years: role === 'doctor' ? parseInt(formData.experienceYears) || undefined : undefined
          }
        }
      });

      if (signUpError) throw signUpError;

      if (data?.user) {
        Alert.alert(
          'Registration Successful',
          'Your account has been created! Please log in to continue.',
          [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
        );
      }
    } catch (err) {
      setError(err.message || 'An error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Activity size={28} color="#fff" />
            </View>
            <Text style={styles.logoText}>AuraHealth</Text>
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join our community of healthy living</Text>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <AlertCircle size={20} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Role Picker */}
          <View style={styles.rolePicker}>
            {['patient', 'doctor'].map((r) => (
              <TouchableOpacity 
                key={r}
                onPress={() => {
                  setRole(r);
                  setError(null);
                }}
                style={[
                  styles.roleBtn,
                  role === r && styles.roleBtnActive
                ]}
              >
                <Text style={[
                  styles.roleBtnText,
                  role === r && styles.roleBtnTextActive
                ]}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.form}>
            {/* Full Name */}
            <View style={styles.inputContainer}>
              <User size={20} color="#94a3b8" style={styles.inputIcon} />
              <TextInput 
                placeholder="Full Name"
                placeholderTextColor="#94a3b8"
                style={styles.input}
                value={formData.fullName}
                onChangeText={(val) => handleInputChange('fullName', val)}
              />
            </View>

            {/* Email Address */}
            <View style={styles.inputContainer}>
              <Mail size={20} color="#94a3b8" style={styles.inputIcon} />
              <TextInput 
                placeholder="Email Address"
                placeholderTextColor="#94a3b8"
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email}
                onChangeText={(val) => handleInputChange('email', val)}
              />
            </View>

            {/* Password */}
            <View style={styles.inputContainer}>
              <Lock size={20} color="#94a3b8" style={styles.inputIcon} />
              <TextInput 
                placeholder="Password"
                placeholderTextColor="#94a3b8"
                style={styles.input}
                secureTextEntry
                value={formData.password}
                onChangeText={(val) => handleInputChange('password', val)}
              />
            </View>

            {/* Mobile Number */}
            <View style={styles.inputContainer}>
              <Phone size={20} color="#94a3b8" style={styles.inputIcon} />
              <TextInput 
                placeholder="Mobile Number"
                placeholderTextColor="#94a3b8"
                style={styles.input}
                keyboardType="phone-pad"
                value={formData.phoneNumber}
                onChangeText={(val) => handleInputChange('phoneNumber', val)}
              />
            </View>

            {/* Gender Picker */}
            <Text style={styles.sectionTitle}>Gender</Text>
            <View style={styles.genderPicker}>
              {['male', 'female', 'other'].map((g) => (
                <TouchableOpacity 
                  key={g}
                  onPress={() => handleInputChange('gender', g)}
                  style={[
                    styles.genderBtn,
                    formData.gender === g && styles.genderBtnActive
                  ]}
                >
                  <Text style={[
                    styles.genderBtnText,
                    formData.gender === g && styles.genderBtnTextActive
                  ]}>
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Doctor Specific Fields */}
            {role === 'doctor' && (
              <View style={styles.doctorFieldsContainer}>
                <Text style={styles.sectionTitle}>Professional Credentials</Text>
                
                {/* Specialty */}
                <View style={[styles.inputContainer, styles.doctorInput]}>
                  <Award size={20} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput 
                    placeholder="Medical Specialty (e.g. Cardiologist)"
                    placeholderTextColor="#94a3b8"
                    style={styles.input}
                    value={formData.specialty}
                    onChangeText={(val) => handleInputChange('specialty', val)}
                  />
                </View>

                {/* License Number */}
                <View style={[styles.inputContainer, styles.doctorInput]}>
                  <Shield size={20} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput 
                    placeholder="License Number (e.g. MC12345)"
                    placeholderTextColor="#94a3b8"
                    style={styles.input}
                    value={formData.licenseNumber}
                    onChangeText={(val) => handleInputChange('licenseNumber', val)}
                  />
                </View>

                {/* Hospital Name */}
                <View style={[styles.inputContainer, styles.doctorInput]}>
                  <Activity size={20} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput 
                    placeholder="Hospital / Clinic Name"
                    placeholderTextColor="#94a3b8"
                    style={styles.input}
                    value={formData.hospitalName}
                    onChangeText={(val) => handleInputChange('hospitalName', val)}
                  />
                </View>

                {/* Experience Years */}
                <View style={[styles.inputContainer, styles.doctorInput]}>
                  <Briefcase size={20} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput 
                    placeholder="Experience (Years)"
                    placeholderTextColor="#94a3b8"
                    style={styles.input}
                    keyboardType="numeric"
                    value={formData.experienceYears}
                    onChangeText={(val) => handleInputChange('experienceYears', val)}
                  />
                </View>

                {/* Hospital Address */}
                <View style={[styles.inputContainer, styles.doctorInput]}>
                  <MapPin size={20} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput 
                    placeholder="Hospital Full Address"
                    placeholderTextColor="#94a3b8"
                    style={styles.input}
                    value={formData.hospitalAddress}
                    onChangeText={(val) => handleInputChange('hospitalAddress', val)}
                  />
                </View>
              </View>
            )}

            <TouchableOpacity 
              style={styles.registerBtn}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.registerBtnText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.linkText}>Log In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
    alignSelf: 'center',
  },
  logoIcon: {
    backgroundColor: '#1d4ed8',
    padding: 8,
    borderRadius: 12,
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    gap: 10,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  rolePicker: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    padding: 4,
    borderRadius: 16,
    marginBottom: 24,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  roleBtnActive: {
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  roleBtnText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  roleBtnTextActive: {
    color: '#1d4ed8',
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 16,
    color: '#0f172a',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#334155',
    marginTop: 10,
    marginBottom: 4,
  },
  genderPicker: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    padding: 4,
    borderRadius: 16,
    gap: 8,
  },
  genderBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  genderBtnActive: {
    backgroundColor: '#1d4ed8',
  },
  genderBtnText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  genderBtnTextActive: {
    color: '#fff',
  },
  doctorFieldsContainer: {
    gap: 16,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 16,
  },
  doctorInput: {
    backgroundColor: '#fff',
    borderColor: '#e2e8f0',
  },
  registerBtn: {
    backgroundColor: '#1d4ed8',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    elevation: 4,
    shadowColor: '#1d4ed8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  registerBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
    marginBottom: 20,
  },
  footerText: {
    color: '#64748b',
    fontSize: 16,
  },
  linkText: {
    color: '#1d4ed8',
    fontSize: 16,
    fontWeight: 'bold',
  }
});

export default RegisterScreen;
