import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { Mail, ArrowLeft, KeyRound, CheckCircle } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

const ResetPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) {
      Alert.alert('Validation Error', 'Please enter your registered email address.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'aurahealth://reset-password'
      });

      if (error) throw error;
      setSent(true);
    } catch (err) {
      console.error('Reset Password error:', err);
      Alert.alert('Error', err.message || 'Failed to send password reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ArrowLeft size={20} color="#0f172a" />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <KeyRound size={32} color="#1d4ed8" />
            </View>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              Enter your email address and we will send you instructions to reset your password.
            </Text>
          </View>

          {sent ? (
            <View style={styles.successCard}>
              <CheckCircle size={48} color="#10b981" />
              <Text style={styles.successTitle}>Email Sent!</Text>
              <Text style={styles.successMessage}>
                We have dispatched a password reset link to <Text style={{ fontWeight: 'bold' }}>{email}</Text>. Please check your inbox.
              </Text>
              <TouchableOpacity 
                style={styles.primaryBtn} 
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={styles.primaryBtnText}>Back to Sign In</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.label}>EMAIL ADDRESS</Text>
              <View style={styles.inputWrapper}>
                <Mail size={20} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="name@example.com"
                  placeholderTextColor="#94a3b8"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity 
                style={styles.primaryBtn} 
                onPress={handleReset}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Send Reset Link</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scrollContent: { padding: 24, flexGrow: 1 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  header: { alignItems: 'center', marginBottom: 32 },
  iconCircle: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '900', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  form: { gap: 16 },
  label: { fontSize: 11, fontWeight: '900', color: '#64748b', letterSpacing: 0.5 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 16, height: 50 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#0f172a' },
  primaryBtn: { height: 50, backgroundColor: '#1d4ed8', borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  primaryBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
  successCard: { backgroundColor: '#f0fdf4', borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#bbf7d0', marginTop: 20 },
  successTitle: { fontSize: 20, fontWeight: 'bold', color: '#166534', marginTop: 12 },
  successMessage: { fontSize: 14, color: '#15803d', textAlign: 'center', marginTop: 8, lineHeight: 20, marginBottom: 20 }
});

export default ResetPasswordScreen;
