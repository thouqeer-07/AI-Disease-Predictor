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
import { Activity, Book, MapPin, Building, Calendar, FileText } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useSelector, useDispatch } from 'react-redux';
import { setUser } from '../store/slices/authSlice';

const DoctorOnboardingScreen = ({ navigation }) => {
  const { user } = useSelector(state => state.auth);
  const dispatch = useDispatch();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    bio: '',
    universityName: '',
    startYear: '',
    endYear: '',
    duration: '',
    collegeLocation: ''
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCompleteProfile = async () => {
    if (!formData.bio.trim() || !formData.universityName.trim() || !formData.startYear.trim() || !formData.endYear.trim() || !formData.duration.trim() || !formData.collegeLocation.trim()) {
      Alert.alert('Incomplete Fields', 'Please fill in all details before proceeding.');
      return;
    }

    const startY = parseInt(formData.startYear.trim(), 10);
    const endY = parseInt(formData.endYear.trim(), 10);

    if (isNaN(startY) || isNaN(endY)) {
      Alert.alert('Invalid Years', 'Please enter valid numeric 4-digit years for Start Year and End Year.');
      return;
    }

    if (startY === endY) {
      Alert.alert('Invalid Duration', 'Start Year and End Year cannot be the same year.');
      return;
    }

    if (endY < startY) {
      Alert.alert('Invalid Duration', 'End Year cannot be earlier than Start Year.');
      return;
    }

    if (endY - startY < 4) {
      Alert.alert('Invalid Degree Duration', `The duration between Start Year (${startY}) and End Year (${endY}) must be at least 4 years for a medical degree.`);
      return;
    }
    
    setLoading(true);
    try {
      const education = {
        university_name: formData.universityName.trim(),
        start_year: formData.startYear.trim(),
        end_year: formData.endYear.trim(),
        duration: formData.duration.trim(),
        college_location: formData.collegeLocation.trim()
      };

      // 1. Update doctors table in Supabase
      try {
        await supabase
          .from('doctors')
          .update({
            bio: formData.bio.trim(),
            education: JSON.stringify(education)
          })
          .eq('id', user.id);
      } catch (docErr) {
        console.warn('Doctors table update notice:', docErr.message);
      }

      // 2. Update profiles table in Supabase
      try {
        await supabase
          .from('profiles')
          .update({
            medical_history: JSON.stringify({ bio: formData.bio.trim(), education })
          })
          .eq('id', user.id);
      } catch (profErr) {
        console.warn('Profiles table update notice:', profErr.message);
      }

      // 3. Update Supabase Auth user metadata
      const { data, error } = await supabase.auth.updateUser({
        data: {
          bio: formData.bio.trim(),
          education: education,
          onboarded: true
        }
      });

      if (error) throw error;

      if (data?.user) {
        dispatch(setUser(data.user));
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'An error occurred saving your profile.');
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
          <View style={styles.header}>
            <Text style={styles.title}>Complete Your Profile</Text>
            <Text style={styles.subtitle}>Please provide your professional background</Text>
          </View>

          <View style={styles.form}>
            {/* Bio */}
            <Text style={styles.sectionTitle}>Professional Bio</Text>
            <View style={[styles.inputContainer, styles.bioContainer]}>
              <FileText size={20} color="#94a3b8" style={styles.inputIcon} />
              <TextInput 
                placeholder="Write a short professional bio..."
                placeholderTextColor="#94a3b8"
                style={[styles.input, styles.bioInput]}
                multiline
                numberOfLines={4}
                value={formData.bio}
                onChangeText={(val) => handleInputChange('bio', val)}
              />
            </View>

            {/* Education Details */}
            <Text style={styles.sectionTitle}>Education Details</Text>
            
            <View style={styles.inputContainer}>
              <Building size={20} color="#94a3b8" style={styles.inputIcon} />
              <TextInput 
                placeholder="University Name"
                placeholderTextColor="#94a3b8"
                style={styles.input}
                value={formData.universityName}
                onChangeText={(val) => handleInputChange('universityName', val)}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputContainer, styles.halfInput]}>
                <Calendar size={20} color="#94a3b8" style={styles.inputIcon} />
                <TextInput 
                  placeholder="Start Year"
                  placeholderTextColor="#94a3b8"
                  style={styles.input}
                  keyboardType="numeric"
                  value={formData.startYear}
                  onChangeText={(val) => handleInputChange('startYear', val)}
                />
              </View>
              <View style={[styles.inputContainer, styles.halfInput]}>
                <Calendar size={20} color="#94a3b8" style={styles.inputIcon} />
                <TextInput 
                  placeholder="End Year"
                  placeholderTextColor="#94a3b8"
                  style={styles.input}
                  keyboardType="numeric"
                  value={formData.endYear}
                  onChangeText={(val) => handleInputChange('endYear', val)}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputContainer, styles.halfInput]}>
                <Book size={20} color="#94a3b8" style={styles.inputIcon} />
                <TextInput 
                  placeholder="Duration (e.g. 5 yrs)"
                  placeholderTextColor="#94a3b8"
                  style={styles.input}
                  value={formData.duration}
                  onChangeText={(val) => handleInputChange('duration', val)}
                />
              </View>
              <View style={[styles.inputContainer, styles.halfInput]}>
                <MapPin size={20} color="#94a3b8" style={styles.inputIcon} />
                <TextInput 
                  placeholder="College Location"
                  placeholderTextColor="#94a3b8"
                  style={styles.input}
                  value={formData.collegeLocation}
                  onChangeText={(val) => handleInputChange('collegeLocation', val)}
                />
              </View>
            </View>

            <TouchableOpacity 
              style={styles.submitBtn}
              onPress={handleCompleteProfile}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Save & Proceed to Dashboard</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  keyboardView: { flex: 1 },
  content: { padding: 24, paddingBottom: 40, flexGrow: 1, justifyContent: 'center' },
  header: { marginBottom: 32, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '900', color: '#0f172a', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#64748b', textAlign: 'center' },
  form: { gap: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#334155', marginTop: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, height: 56, paddingHorizontal: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  bioContainer: { height: 120, alignItems: 'flex-start', paddingTop: 16 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 15, color: '#0f172a', height: '100%' },
  bioInput: { textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  halfInput: { flex: 1 },
  submitBtn: { backgroundColor: '#1d4ed8', borderRadius: 16, height: 56, alignItems: 'center', justifyContent: 'center', marginTop: 24, shadowColor: '#1d4ed8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});

export default DoctorOnboardingScreen;
