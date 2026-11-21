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
  Alert,
  Image
} from 'react-native';
import { Activity, Mail, Lock, User, Shield, Phone, MapPin, Award, Calendar, AlertCircle, Upload, Eye, EyeOff } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { fetchApiWithFallback } from '../lib/api';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COUNTRY_CODES = [
  { code: '+91', flag: '🇮🇳', label: '🇮🇳 +91 (India)' },
  { code: '+1', flag: '🇺🇸', label: '🇺🇸 +1 (USA/Canada)' },
  { code: '+44', flag: '🇬🇧', label: '🇬🇧 +44 (UK)' },
  { code: '+971', flag: '🇦🇪', label: '🇦🇪 +971 (UAE)' },
  { code: '+61', flag: '🇦🇺', label: '🇦🇺 +61 (Australia)' },
  { code: '+966', flag: '🇸🇦', label: '🇸🇦 +966 (Saudi Arabia)' },
  { code: '+49', flag: '🇩🇪', label: '🇩🇪 +49 (Germany)' },
  { code: '+33', flag: '🇫🇷', label: '🇫🇷 +33 (France)' },
  { code: '+81', flag: '🇯🇵', label: '🇯🇵 +81 (Japan)' },
  { code: '+65', flag: '🇸🇬', label: '🇸🇬 +65 (Singapore)' }
];

const validateEmailRule = (email) => {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim());
};

const validatePhoneRule = (phone) => {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
};

import DatePickerModal from '../components/DatePickerModal';

const RegisterScreen = ({ navigation }) => {
  const [role, setRole] = useState('patient');
  const [doctorSubTab, setDoctorSubTab] = useState('request'); // 'request' or 'register'
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [documentFile, setDocumentFile] = useState(null);
  const [countryCode, setCountryCode] = useState('+91');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
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
    dob: ''
  });

  const [emailSuggestion, setEmailSuggestion] = useState(null);

  const checkEmailTypo = (val) => {
    let clean = val.toLowerCase().replace(/\s+/g, '');
    clean = clean.replace(/[^a-z0-9@._\-+]/g, '');
    clean = clean.replace(/\.{2,}/g, '.');

    const parts = clean.split('@');
    if (parts.length > 2) {
      clean = parts[0] + '@' + parts.slice(1).join('');
    }

    let suggestion = null;
    if (clean.includes('@')) {
      const [userPart, domainPart] = clean.split('@');
      if (domainPart && userPart.length > 0) {
        const domainMap = {
          'gma': 'gmail.com',
          'gmai': 'gmail.com',
          'gmial': 'gmail.com',
          'gamil': 'gmail.com',
          'gmaill': 'gmail.com',
          'gmal': 'gmail.com',
          'gmail.c': 'gmail.com',
          'gmail.co': 'gmail.com',
          'gmail.con': 'gmail.com',
          'gmail.cm': 'gmail.com',
          'gmail.cmo': 'gmail.com',
          'gmial.com': 'gmail.com',
          'gamil.com': 'gmail.com',
          'gmai.com': 'gmail.com',
          'gmaill.com': 'gmail.com',
          'gmal.com': 'gmail.com',
          'gmail.co': 'gmail.com',
          'gmail.con': 'gmail.com',
          'yah': 'yahoo.com',
          'yaho': 'yahoo.com',
          'yahooo': 'yahoo.com',
          'yahoo.c': 'yahoo.com',
          'yahoo.co': 'yahoo.com',
          'yahoo.con': 'yahoo.com',
          'yaho.com': 'yahoo.com',
          'yahooo.com': 'yahoo.com',
          'hot': 'hotmail.com',
          'hotm': 'hotmail.com',
          'hotmai': 'hotmail.com',
          'hotmial': 'hotmail.com',
          'hotmail.c': 'hotmail.com',
          'hotmail.co': 'hotmail.com',
          'hotmai.com': 'hotmail.com',
          'hotmial.com': 'hotmail.com',
          'out': 'outlook.com',
          'outl': 'outlook.com',
          'outlok': 'outlook.com',
          'outloo': 'outlook.com',
          'outlook.c': 'outlook.com',
          'outlook.co': 'outlook.com',
          'outlok.com': 'outlook.com',
          'outloo.com': 'outlook.com',
          'icl': 'icloud.com',
          'iclo': 'icloud.com',
          'iclod': 'icloud.com',
          'icloud.c': 'icloud.com',
          'icloud.co': 'icloud.com',
          'iclod.com': 'icloud.com'
        };
        if (domainMap[domainPart] && domainMap[domainPart] !== domainPart) {
          suggestion = `${userPart}@${domainMap[domainPart]}`;
        }
      }
    }

    return { clean, suggestion };
  };

  const handleInputChange = (field, value) => {
    if (field === 'phoneNumber') {
      const sanitized = value.replace(/\D/g, '');
      setFormData(prev => ({ ...prev, phoneNumber: sanitized }));
      return;
    }
    if (field === 'email') {
      const { clean, suggestion } = checkEmailTypo(value);
      setFormData(prev => ({ ...prev, email: clean }));
      setEmailSuggestion(suggestion);
      return;
    }
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const pickDocument = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        base64: true,
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setDocumentFile(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch (E) {
      console.log(E);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleRegister = async () => {
    setError(null);
    setLoading(true);

    try {
      // Pre-check if email already exists in DB/Auth before proceeding
      try {
        const checkRes = await fetchApiWithFallback('/patients/check-email-exists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email.trim() })
        });

        if (checkRes?.exists) {
          Alert.alert('Email Already Registered', checkRes.message || 'This email address is already registered. Please change your email ID or log in.');
          setLoading(false);
          return;
        }
      } catch (checkErr) {
        console.warn('Email pre-check notice:', checkErr);
      }

      if (role === 'doctor') {
        if (doctorSubTab === 'request') {
          // 1. Submit Verification Request
          if (!formData.fullName.trim() || !formData.email.trim() || !formData.phoneNumber.trim() || !formData.gender || !formData.specialty.trim() || !formData.licenseNumber.trim() || !formData.hospitalName.trim() || !formData.dob.trim() || !formData.hospitalAddress.trim()) {
            throw new Error('Please fill in all details.');
          }
          if (!documentFile) {
            throw new Error('Please upload a photocopy of your professional credentials/document.');
          }

          try {
            await fetchApiWithFallback('/doctors/apply', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fullName: formData.fullName,
                email: formData.email.trim(),
                phoneNumber: formData.phoneNumber,
                gender: formData.gender,
                specialty: formData.specialty,
                licenseNumber: formData.licenseNumber,
                hospitalName: formData.hospitalName,
                hospitalAddress: formData.hospitalAddress,
                dob: formData.dob,
                documentPhoto: documentFile
              })
            });
          } catch (apiErr) {
            console.log('Backend apply API notice, saving directly via Supabase client fallback:', apiErr.message);
            const appPayload = {
              fullName: formData.fullName,
              email: formData.email.trim(),
              phoneNumber: formData.phoneNumber,
              gender: formData.gender,
              specialty: formData.specialty,
              licenseNumber: formData.licenseNumber,
              hospitalName: formData.hospitalName,
              hospitalAddress: formData.hospitalAddress,
              dob: formData.dob,
              documentPhoto: documentFile
            };

            const { data: adminProf } = await supabase
              .from('profiles')
              .select('id')
              .eq('email', 'admin@aurahealth.com')
              .maybeSingle();

            const adminId = adminProf?.id || '00000000-0000-0000-0000-000000000000';

            const { error: inqErr } = await supabase
              .from('inquiries')
              .insert([{
                name: formData.fullName,
                email: formData.email,
                subject: 'doctor_application',
                message: JSON.stringify(appPayload),
                status: 'new'
              }]);

            if (inqErr) throw inqErr;
          }

          Alert.alert(
            'Request Submitted',
            'Verification request submitted successfully! Once approved, the admin will notify you via email to create your account.',
            [{ text: 'OK', onPress: () => setDoctorSubTab('register') }]
          );

          // Clear request form fields
          setFormData(prev => ({
            ...prev,
            fullName: '',
            phoneNumber: '',
            gender: '',
            specialty: '',
            licenseNumber: '',
            hospitalName: '',
            hospitalAddress: '',
            dob: ''
          }));
          setDocumentFile(null);
          return;
        } else {
          // 2. Register Approved Account
          if (!formData.email.trim() || !formData.password.trim()) {
            throw new Error('Please fill in email and password.');
          }

          let checkData = null;
          try {
            checkData = await fetchApiWithFallback('/doctors/check-approval', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: formData.email.trim() })
            });
          } catch (netErr) {
            console.log('Backend API fetch error, checking via Supabase fallback:', netErr);
          }

          // If backend API check was unsuccessful or unreachable, check directly via Supabase client
          if (!checkData || !checkData.approved) {
            const { data: inqs, error: inqErr } = await supabase
              .from('inquiries')
              .select('*')
              .eq('subject', 'doctor_application')
              .in('status', ['resolved', 'read']);

            if (!inqErr && inqs) {
              for (const inq of inqs) {
                try {
                  const payload = JSON.parse(inq.message);
                  if (payload.email && payload.email.toLowerCase() === formData.email.trim().toLowerCase()) {
                    checkData = { approved: true, details: payload };
                    break;
                  }
                } catch (e) { }
              }
            }
          }

          if (!checkData || !checkData.approved) {
            throw new Error('Your registration request is not yet approved by the administrator. Please submit a verification request first and wait for approval.');
          }

          const details = checkData.details;

          // Register in Supabase Auth using the approved payload details
          const { data, error: signUpError } = await supabase.auth.signUp({
            email: formData.email.trim(),
            password: formData.password,
            options: {
              data: {
                full_name: details.fullName,
                role: 'doctor',
                phone_number: details.phoneNumber,
                gender: details.gender,
                specialty: details.specialty,
                license_number: details.licenseNumber,
                hospital_name: details.hospitalName,
                hospital_address: details.hospitalAddress,
                dob: details.dob
              }
            }
          });

          if (signUpError) throw signUpError;

          if (data?.user) {
            // Save doctor details into SQL 'doctors' & 'profiles' tables so Admin account fetches and displays them
            try {
              await fetchApiWithFallback('/doctors/register-account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: data.user.id,
                  email: formData.email.trim(),
                  details
                })
              });
            } catch (saveErr) {
              console.warn('Doctor DB save notice:', saveErr);
            }

            try {
              await supabase.from('doctors').upsert({
                id: data.user.id,
                name: details.fullName || 'Doctor',
                specialty: details.specialty || 'General Physician',
                license_number: details.licenseNumber || '',
                hospital_name: details.hospitalName || '',
                hospital_address: details.hospitalAddress || '',
                phone_number: details.phoneNumber || ''
              });
              await supabase.from('profiles').upsert({
                id: data.user.id,
                role: 'doctor',
                full_name: details.fullName || 'Doctor',
                phone_number: details.phoneNumber || ''
              });
            } catch (clientErr) {
              console.warn('Direct doctor client insert notice:', clientErr);
            }

            try { await supabase.auth.signOut(); } catch (e) {}
            Alert.alert(
              'Registration Successful',
              'Approved doctor account successfully created! You can now log in.',
              [{ text: 'OK', onPress: () => { try { if (navigation.canGoBack()) navigation.navigate('Login'); } catch (e) { } } }]
            );
          }
          return;
        }
      }

      // 3. Patient registration directly in Supabase
      if (!formData.fullName.trim() || !formData.email.trim() || !formData.password.trim() || !formData.phoneNumber.trim() || !formData.gender) {
        throw new Error('Please fill in all personal details.');
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName.trim(),
            role: 'patient',
            phone_number: formData.phoneNumber.trim(),
            gender: formData.gender,
            dob: formData.dob ? formData.dob.trim() : '',
            is_verified: false
          }
        }
      });

      if (signUpError) throw signUpError;

      if (data?.user) {
        try {
          await supabase
            .from('profiles')
            .update({
              gender: formData.gender,
              medical_history: JSON.stringify({ dob: formData.dob ? formData.dob.trim() : '' })
            })
            .eq('id', data.user.id);
        } catch (e) { }

        try {
          await fetchApiWithFallback('/patients/send-welcome', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: formData.email.trim(),
              fullName: formData.fullName.trim()
            })
          });
        } catch (mailErr) {
          console.log('Failed to trigger patient welcome email:', mailErr);
          Alert.alert('Email Notice', 'Your account was created, but we could not reach the server to send the verification email. Ensure your phone is on the same Wi-Fi as your computer.');
        }

        // FORCE SIGN OUT to prevent auto-login and strictly enforce login/verification flow
        try { await supabase.auth.signOut(); } catch (e) {}

        Alert.alert(
          'Registration Successful',
          'Account successfully created! Please check your inbox for the 6-digit OTP.',
          [{ text: 'OK', onPress: () => { 
            try { 
              navigation.navigate('Login', { 
                requireOtp: true, 
                email: formData.email.trim() 
              }); 
            } catch (e) { } 
          } }]
        );
      }
    } catch (err) {
      let msg = err.message || 'An error occurred during registration.';
      if (msg.toLowerCase().includes('network request failed')) {
        if (role === 'doctor' && doctorSubTab === 'register') {
          msg = 'Your registration request is not yet approved by the administrator. Please submit a verification request first.';
        } else {
          msg = 'Unable to connect to network. Please check your connection and try again.';
        }
      }
      setError(msg);
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

          {/* Doctor Sub Tabs */}
          {role === 'doctor' && (
            <View style={styles.doctorSubTabs}>
              <TouchableOpacity
                style={[styles.subTab, doctorSubTab === 'request' && styles.subTabActive]}
                onPress={() => setDoctorSubTab('request')}
              >
                <Text style={[styles.subTabText, doctorSubTab === 'request' && styles.subTabTextActive]}>Request Verification</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.subTab, doctorSubTab === 'register' && styles.subTabActive]}
                onPress={() => setDoctorSubTab('register')}
              >
                <Text style={[styles.subTabText, doctorSubTab === 'register' && styles.subTabTextActive]}>Create Account</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.form}>
            {/* Show fields based on role and tab */}
            {(role === 'patient' || (role === 'doctor' && doctorSubTab === 'request')) && (
              <>
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

                <View style={styles.phoneInputRow}>
                  <TouchableOpacity
                    style={styles.countryCodePickerBtn}
                    onPress={() => setShowCountryPicker(!showCountryPicker)}
                  >
                    <Text style={styles.countryCodeText}>{countryCode}</Text>
                  </TouchableOpacity>
                  <View style={[styles.inputContainer, { flex: 1 }]}>
                    <Phone size={20} color="#94a3b8" style={styles.inputIcon} />
                    <TextInput
                      placeholder="Mobile Number"
                      placeholderTextColor="#94a3b8"
                      style={styles.input}
                      keyboardType="phone-pad"
                      maxLength={15}
                      value={formData.phoneNumber}
                      onChangeText={(val) => handleInputChange('phoneNumber', val)}
                    />
                  </View>
                </View>

                {showCountryPicker && (
                  <View style={styles.countryCodeDropdown}>
                    <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                      {COUNTRY_CODES.map(c => (
                        <TouchableOpacity
                          key={c.code}
                          style={styles.countryCodeOption}
                          onPress={() => {
                            setCountryCode(c.code);
                            setShowCountryPicker(false);
                          }}
                        >
                          <Text style={styles.countryCodeOptionText}>{c.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {formData.phoneNumber !== '' && !validatePhoneRule(formData.phoneNumber) && (
                  <Text style={styles.validationRuleError}>⚠️ Phone number must be 7 to 15 digits.</Text>
                )}

                <Text style={styles.sectionTitle}>Gender & Date of Birth</Text>
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

                <TouchableOpacity
                  style={[styles.inputContainer, { marginTop: 10 }]}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.8}
                >
                  <Calendar size={20} color="#1d4ed8" style={styles.inputIcon} />
                  <Text style={[styles.input, { paddingVertical: 12, color: formData.dob ? '#0f172a' : '#94a3b8', fontWeight: formData.dob ? '700' : '400' }]}>
                    {formData.dob ? `DOB: ${formData.dob}` : 'Select Date of Birth'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

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

            {formData.email.includes('@') && !formData.email.endsWith('.com') && !formData.email.endsWith('.org') && !formData.email.endsWith('.edu') && !formData.email.endsWith('.in') && (
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                {['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'].map(dom => {
                  const userPart = formData.email.split('@')[0] || '';
                  const fullVal = `${userPart}@${dom}`;
                  return (
                    <TouchableOpacity
                      key={dom}
                      style={{
                        backgroundColor: '#f1f5f9',
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: '#cbd5e1'
                      }}
                      onPress={() => {
                        setFormData(prev => ({ ...prev, email: fullVal }));
                        setEmailSuggestion(null);
                      }}
                    >
                      <Text style={{ fontSize: 12, color: '#1d4ed8', fontWeight: '600' }}>@{dom}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {emailSuggestion && (
              <TouchableOpacity
                style={styles.typoSuggestionBtn}
                onPress={() => {
                  setFormData(prev => ({ ...prev, email: emailSuggestion }));
                  setEmailSuggestion(null);
                }}
              >
                <Text style={styles.typoSuggestionText}>
                  💡 Did you mean <Text style={{ fontWeight: 'bold', textDecorationLine: 'underline' }}>{emailSuggestion}</Text>? (Tap to fix)
                </Text>
              </TouchableOpacity>
            )}

            {/* Password - Only for patient or doctor registering */}
            {(role === 'patient' || (role === 'doctor' && doctorSubTab === 'register')) && (
              <View style={styles.inputContainer}>
                <Lock size={20} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  placeholder="Password"
                  placeholderTextColor="#94a3b8"
                  style={styles.input}
                  secureTextEntry={!showPassword}
                  value={formData.password}
                  onChangeText={(val) => handleInputChange('password', val)}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ padding: 8 }}
                  activeOpacity={0.7}
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#1d4ed8" />
                  ) : (
                    <Eye size={20} color="#94a3b8" />
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Doctor Request Fields */}
            {role === 'doctor' && doctorSubTab === 'request' && (
              <View style={styles.doctorFieldsContainer}>
                <Text style={styles.sectionTitle}>Professional Credentials</Text>

                <View style={[styles.inputContainer, styles.doctorInput]}>
                  <Award size={20} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput
                    placeholder="Medical Specialty"
                    placeholderTextColor="#94a3b8"
                    style={styles.input}
                    value={formData.specialty}
                    onChangeText={(val) => handleInputChange('specialty', val)}
                  />
                </View>

                <View style={[styles.inputContainer, styles.doctorInput]}>
                  <Shield size={20} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput
                    placeholder="License Number"
                    placeholderTextColor="#94a3b8"
                    style={styles.input}
                    value={formData.licenseNumber}
                    onChangeText={(val) => handleInputChange('licenseNumber', val)}
                  />
                </View>

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

                <TouchableOpacity style={styles.uploadBtn} onPress={pickDocument}>
                  <Upload size={20} color="#1d4ed8" />
                  <Text style={styles.uploadBtnText}>Upload Credentials</Text>
                </TouchableOpacity>

                {documentFile && (
                  <View style={styles.previewContainer}>
                    <Text style={styles.previewText}>Document attached successfully</Text>
                  </View>
                )}
              </View>
            )}

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 12, paddingHorizontal: 10 }}>
              <Text style={{ fontSize: 12, color: '#64748b' }}>By continuing, you agree to our </Text>
              <TouchableOpacity onPress={() => navigation.navigate('TermsPrivacy', { tab: 'terms' })}>
                <Text style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 'bold' }}>Terms of Service</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 12, color: '#64748b' }}> & </Text>
              <TouchableOpacity onPress={() => navigation.navigate('TermsPrivacy', { tab: 'privacy' })}>
                <Text style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 'bold' }}>Privacy Policy</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.registerBtn}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.registerBtnText}>
                  {role === 'doctor' && doctorSubTab === 'request' ? 'Submit Request' : 'Create Account'}
                </Text>
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
    marginBottom: 16,
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
  doctorSubTabs: {
    flexDirection: 'row',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  subTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  subTabActive: {
    borderBottomColor: '#1d4ed8',
  },
  subTabText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  subTabTextActive: {
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
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderStyle: 'dashed',
    gap: 8,
  },
  uploadBtnText: {
    color: '#1d4ed8',
    fontSize: 16,
    fontWeight: '600',
  },
  previewContainer: {
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  previewText: {
    color: '#166534',
    fontSize: 14,
    fontWeight: '500',
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
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countryCodePickerBtn: {
    height: 56,
    paddingHorizontal: 14,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1d4ed8',
  },
  countryCodeDropdown: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 4,
    paddingVertical: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  countryCodeOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  countryCodeOptionText: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
  },
  validationRuleError: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '500',
    marginTop: -8,
    marginLeft: 4,
  },
  typoSuggestionBtn: {
    backgroundColor: '#eff6ff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginTop: -4,
  },
  typoSuggestionText: {
    fontSize: 13,
    color: '#1d4ed8',
  }
});

export default RegisterScreen;
