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
  Alert
} from 'react-native';
import { Activity, Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { fetchApiWithFallback } from '../lib/api';

const handleEmailChange = (val) => {
  let clean = val.toLowerCase().replace(/\s+/g, '');
  clean = clean.replace(/[^a-z0-9@._\-+]/g, '');
  const parts = clean.split('@');
  if (parts.length > 2) {
    clean = parts[0] + '@' + parts.slice(1).join('');
  }
  setEmail(clean);
};

const LoginScreen = ({ navigation, route }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // OTP States
  const [showOtpBox, setShowOtpBox] = useState(route.params?.requireOtp || false);
  const [otpEmail, setOtpEmail] = useState(route.params?.email || '');
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  const handleForgotPassword = () => {
    navigation.navigate('ResetPassword');
  };

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!trimmedEmail || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!emailRegex.test(trimmedEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address (e.g. user@example.com).');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user && (!data.user.email_confirmed_at || data.user.user_metadata?.aura_verified === false)) {
        await supabase.auth.signOut();
        setOtpEmail(trimmedEmail);
        setShowOtpBox(true);
        Alert.alert('Verification Required', 'An OTP has been sent to your email. Please verify to log in.');
        return;
      }
      
      // Navigation will be handled by Auth state listener in App.js usually
    } catch (error) {
      Alert.alert('Login Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP.');
      return;
    }
    setOtpLoading(true);
    try {
      const data = await fetchApiWithFallback('/patients/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpEmail, otp: otpCode })
      });
      if (data && data.success) {
        Alert.alert('Success', 'Email verified successfully! You can now log in.');
        setShowOtpBox(false);
        setOtpCode('');
        setEmail(otpEmail); // Pre-fill email for login
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Invalid or expired OTP.');
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} testID="mobile-login-screen">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Activity size={32} color="#fff" />
            </View>
            <Text style={styles.logoText}>AuraHealth</Text>
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>{showOtpBox ? 'Verify Email' : 'Welcome Back'}</Text>
            <Text style={styles.subtitle}>
              {showOtpBox 
                ? `We sent a 6-digit verification code to\n${otpEmail}` 
                : 'Sign in to continue your health journey'}
            </Text>
          </View>

          {showOtpBox ? (
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <TextInput 
                  testID="mobile-otp-input"
                  placeholder="123456"
                  placeholderTextColor="#94a3b8"
                  style={[styles.input, { textAlign: 'center', fontSize: 24, letterSpacing: 10, fontWeight: 'bold' }]}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otpCode}
                  onChangeText={(val) => setOtpCode(val.replace(/\D/g, ''))}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
                <TouchableOpacity 
                  style={[styles.loginBtn, { flex: 1, backgroundColor: '#f1f5f9' }]}
                  onPress={() => setShowOtpBox(false)}
                >
                  <Text style={[styles.loginBtnText, { color: '#475569' }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.loginBtn, { flex: 1 }, (otpLoading || otpCode.length !== 6) && styles.loginBtnDisabled]}
                  onPress={handleVerifyOtp}
                  disabled={otpLoading || otpCode.length !== 6}
                >
                  <Text style={styles.loginBtnText}>
                    {otpLoading ? 'Verifying...' : 'Verify'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Mail size={20} color="#94a3b8" style={styles.inputIcon} />
                <TextInput 
                  testID="mobile-email-input"
                  placeholder="Email Address"
                  placeholderTextColor="#94a3b8"
                  style={styles.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={(val) => {
                    let clean = val.toLowerCase().replace(/\s+/g, '');
                    clean = clean.replace(/[^a-z0-9@._\-+]/g, '');
                    clean = clean.replace(/\.{2,}/g, '.');
                    const parts = clean.split('@');
                    if (parts.length > 2) {
                      clean = parts[0] + '@' + parts.slice(1).join('');
                    }
                    setEmail(clean);
                  }}
                />
              </View>

              {email.includes('@') && !email.endsWith('.com') && !email.endsWith('.org') && !email.endsWith('.edu') && !email.endsWith('.in') && (
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                  {['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'].map(dom => {
                    const userPart = email.split('@')[0] || '';
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
                        onPress={() => setEmail(fullVal)}
                      >
                        <Text style={{ fontSize: 12, color: '#1d4ed8', fontWeight: '600' }}>@{dom}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <View style={styles.inputContainer}>
                <Lock size={20} color="#94a3b8" style={styles.inputIcon} />
                <TextInput 
                  testID="mobile-password-input"
                  placeholder="Password"
                  placeholderTextColor="#94a3b8"
                  style={styles.input}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity 
                  testID="toggle-password-btn"
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

              <TouchableOpacity testID="forgot-password-btn" style={styles.forgotBtn} onPress={handleForgotPassword} disabled={loading}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                testID="mobile-login-submit-btn"
                style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
                onPress={handleLogin}
                disabled={loading}
              >
                <Text style={styles.loginBtnText}>
                  {loading ? 'Signing In...' : 'Sign In'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {!showOtpBox && (
            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity testID="register-nav-btn" onPress={() => navigation.navigate('Register')}>
                <Text style={styles.linkText}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
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
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 40,
    alignSelf: 'center',
  },
  logoIcon: {
    backgroundColor: '#1d4ed8',
    padding: 10,
    borderRadius: 14,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 8,
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
  forgotBtn: {
    alignSelf: 'flex-end',
  },
  forgotText: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
  loginBtn: {
    backgroundColor: '#1d4ed8',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    elevation: 4,
    shadowColor: '#1d4ed8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  loginBtnDisabled: {
    opacity: 0.7,
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#94a3b8',
    fontSize: 14,
  },
  googleBtn: {
    backgroundColor: '#fff',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  googleBtnText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 40,
    flexWrap: 'wrap'
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

export default LoginScreen;

