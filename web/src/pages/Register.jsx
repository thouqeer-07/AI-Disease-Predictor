import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Activity, 
  Mail, 
  Lock, 
  User, 
  AlertCircle, 
  Phone, 
  FileImage, 
  Eye, 
  EyeOff, 
  Brain, 
  Users, 
  HeartPulse, 
  ShieldCheck 
} from 'lucide-react';

import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';
import { fetchApiWithFallback } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';

const slides = [
  {
    title: "AI-Powered Diagnostics",
    description: "Harness advanced neural models to analyze symptoms and predict potential diagnoses early and accurately.",
    icon: Brain,
    stats: "99.2% Accuracy",
    color: "text-blue-400"
  },
  {
    title: "Secure Doctor Connect",
    description: "Instantly connect with verified medical professionals via end-to-end encrypted messaging and video channels.",
    icon: Users,
    stats: "24/7 Availability",
    color: "text-emerald-400"
  },
  {
    title: "Smart Medication Tracker",
    description: "Never miss a dose with our automated reminder system and real-time medical updates.",
    icon: HeartPulse,
    stats: "Automated Logging",
    color: "text-purple-400"
  }
];

const countryCodes = [
  { code: '+91', label: '🇮🇳 +91' },
  { code: '+1', label: '🇺🇸 +1' },
  { code: '+44', label: '🇬🇧 +44' },
  { code: '+971', label: '🇦🇪 +971' },
  { code: '+61', label: '🇦🇺 +61' },
  { code: '+966', label: '🇸🇦 +966' }
];

const formatDobToDDMMYYYY = (val) => {
  if (!val || typeof val !== 'string') return '';
  const trimmed = val.trim();
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) return trimmed;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parts = trimmed.split('-');
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return trimmed;
};

const Register = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState('patient');
  const [doctorSubTab, setDoctorSubTab] = useState('request'); // 'request' or 'register'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [documentFile, setDocumentFile] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [countryCode, setCountryCode] = useState('+91');
  const [validationErrors, setValidationErrors] = useState({
    email: '',
    phoneNumber: ''
  });

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

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Real-time email and phone validation
  useEffect(() => {
    const trimmedEmail = formData.email.trim();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    let emailErr = '';
    if (formData.email && !emailRegex.test(trimmedEmail)) {
      emailErr = 'Please enter a valid email address (e.g. user@example.com).';
    }

    let phoneErr = '';
    if (formData.phoneNumber) {
      const phoneDigits = formData.phoneNumber.replace(/\D/g, '');
      if (phoneDigits.length < 7 || phoneDigits.length > 15) {
        phoneErr = 'Phone number must be between 7 and 15 digits.';
      }
    }

    setValidationErrors({
      email: emailErr,
      phoneNumber: phoneErr
    });
  }, [formData.email, formData.phoneNumber]);

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
      if (domainPart) {
        const domainMap = {
          'gmial.com': 'gmail.com',
          'gamil.com': 'gmail.com',
          'gmai.com': 'gmail.com',
          'gmaill.com': 'gmail.com',
          'gmal.com': 'gmail.com',
          'gmail.co': 'gmail.com',
          'gmail.con': 'gmail.com',
          'gmail.cm': 'gmail.com',
          'gmail.cmo': 'gmail.com',
          'yaho.com': 'yahoo.com',
          'yahooo.com': 'yahoo.com',
          'yahoo.co': 'yahoo.com',
          'yahoo.con': 'yahoo.com',
          'hotmai.com': 'hotmail.com',
          'hotmial.com': 'hotmail.com',
          'hotmail.co': 'hotmail.com',
          'outlok.com': 'outlook.com',
          'outloo.com': 'outlook.com',
          'outlook.co': 'outlook.com',
          'iclod.com': 'icloud.com',
          'icloud.co': 'icloud.com'
        };
        if (domainMap[domainPart]) {
          suggestion = `${userPart}@${domainMap[domainPart]}`;
        }
      }
    }

    return { clean, suggestion };
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phoneNumber') {
      const sanitized = value.replace(/\D/g, '');
      setFormData(prev => ({ ...prev, phoneNumber: sanitized }));
      return;
    }
    if (name === 'email') {
      const { clean, suggestion } = checkEmailTypo(value);
      setFormData(prev => ({ ...prev, email: clean }));
      setEmailSuggestion(suggestion);
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocumentFile(reader.result); // Base64 string
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Prevent submission if there are validation errors
    if (validationErrors.email || !formData.email) {
      setError(validationErrors.email || 'Please enter your email address.');
      setLoading(false);
      return;
    }

    // 2. Mobile number rules & country code concatenation
    let fullPhoneNumber = '';
    if (!isDoctorRegister) {
      if (validationErrors.phoneNumber || !formData.phoneNumber) {
        setError(validationErrors.phoneNumber || 'Please enter your mobile number.');
        setLoading(false);
        return;
      }
      const phoneDigits = formData.phoneNumber.replace(/\D/g, ''); // Extract only digits
      fullPhoneNumber = `${countryCode}${phoneDigits}`;
    }

    const trimmedEmail = formData.email.trim();

    try {
      if (role === 'doctor') {
        if (doctorSubTab === 'request') {
          // 1. Submit Verification Request
          if (!documentFile) {
            throw new Error('Please upload a photocopy of your professional credentials/document.');
          }

          const formattedDob = formatDobToDDMMYYYY(formData.dob);

          try {
            await fetchApiWithFallback('/doctors/apply', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fullName: formData.fullName,
                email: trimmedEmail,
                phoneNumber: fullPhoneNumber,
                gender: formData.gender,
                specialty: formData.specialty,
                licenseNumber: formData.licenseNumber,
                hospitalName: formData.hospitalName,
                hospitalAddress: formData.hospitalAddress,
                dob: formattedDob,
                documentPhoto: documentFile
              })
            });
          } catch (apiErr) {
            console.log('Backend apply API notice, saving directly via Supabase client fallback:', apiErr);
            const appPayload = {
              fullName: formData.fullName,
              email: trimmedEmail,
              phoneNumber: fullPhoneNumber,
              gender: formData.gender,
              specialty: formData.specialty,
              licenseNumber: formData.licenseNumber,
              hospitalName: formData.hospitalName,
              hospitalAddress: formData.hospitalAddress,
              dob: formattedDob,
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
                patient_id: adminId,
                doctor_id: adminId,
                patient_name: formData.fullName,
                subject: 'doctor_application',
                message: JSON.stringify(appPayload),
                status: 'new'
              }]);

            if (inqErr) throw inqErr;
          }

          alert('Verification request submitted successfully! Once approved, the admin will notify you via email to create your account.');
          
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
          setDoctorSubTab('register'); // Switch to account creation tab
        } else {
          // 2. Register Approved Account
          const checkData = await fetchApiWithFallback('/doctors/check-approval', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: trimmedEmail })
          });

          if (!checkData.approved) {
            throw new Error(checkData.error || 'Your registration request is not yet approved by the administrator. Please wait for the email alert.');
          }

          const details = checkData.details;

          // Register in Supabase Auth using the approved payload details
          const { data, error: signUpError } = await supabase.auth.signUp({
            email: trimmedEmail,
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

          if (data.user) {
            navigate('/login', { state: { message: 'Approved doctor account successfully created! You can now log in.' } });
          }
        }
      } else {
        const formattedPatientDob = formatDobToDDMMYYYY(formData.dob);
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName,
              role: 'patient',
              phone_number: fullPhoneNumber,
              gender: formData.gender,
              dob: formattedPatientDob,
              aura_verified: false
            }
          }
        });

        if (signUpError) throw signUpError;

        if (data.user) {
          try {
            await supabase
              .from('profiles')
              .update({
                gender: formData.gender,
                medical_history: JSON.stringify({ dob: formattedPatientDob })
              })
              .eq('id', data.user.id);
          } catch (e) {}

          // FORCE SIGN OUT to prevent auto-login and strictly enforce login/verification flow
          try { await supabase.auth.signOut(); } catch (e) {}

          try {
            await fetchApiWithFallback('/patients/send-welcome', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: trimmedEmail,
                fullName: formData.fullName
              })
            });
          } catch (mailErr) {
            console.error('Failed to trigger patient welcome email:', mailErr);
          }
          navigate('/login', { state: { 
            message: 'Account successfully created! Please enter the 6-digit OTP sent to your email.', 
            email: trimmedEmail, 
            requireOtp: true 
          } });
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isDoctorRequest = role === 'doctor' && doctorSubTab === 'request';
  const isDoctorRegister = role === 'doctor' && doctorSubTab === 'register';

  return (
    <div className="min-h-screen flex bg-slate-950 text-white overflow-hidden font-sans relative">
      
      {/* Shared Background Gradients & Blueprint Grids (Full Screen) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div
          animate={{
            x: [0, 40, -20, 0],
            y: [0, -40, 30, 0],
          }}
          transition={{
            duration: 16,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-primary/20 rounded-full blur-3xl opacity-60"
        />
        <motion.div
          animate={{
            x: [0, -30, 40, 0],
            y: [0, 50, -40, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-3xl opacity-60"
        />
        <motion.div
          animate={{
            x: [0, 20, -30, 0],
            y: [0, -30, 30, 0],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-1/2 left-1/3 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl opacity-50"
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-25" />
      </div>

      {/* Left Column - Brand Showcase (Hidden on Mobile/Tablet) */}
      <div className="hidden lg:flex lg:w-1/2 bg-transparent relative flex-col justify-between p-12 overflow-hidden border-r border-slate-900/50 z-10">
        
        {/* Brand Header */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="p-2.5 bg-primary/25 backdrop-blur-md rounded-xl border border-primary/30 shadow-lg shadow-primary/10">
            <Activity className="w-6 h-6 text-primary" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">AuraHealth</span>
        </div>

        {/* Feature Carousel */}
        <div className="relative z-10 my-auto max-w-lg">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
                {React.createElement(slides[currentSlide].icon, { 
                  className: `w-4 h-4 ${slides[currentSlide].color}` 
                })}
                <span className="text-xs font-semibold text-slate-300 tracking-wide uppercase">
                  {slides[currentSlide].stats}
                </span>
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-white leading-tight">
                {slides[currentSlide].title}
              </h1>
              <p className="text-lg text-slate-400 font-light leading-relaxed">
                {slides[currentSlide].description}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Indicators */}
          <div className="flex gap-2.5 mt-8">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentSlide ? 'w-8 bg-primary' : 'w-2 bg-slate-800 hover:bg-slate-700'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Floating Interactive Stat Cards */}
        <div className="absolute right-8 top-1/4 z-10 hidden xl:block w-64">
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="p-4 bg-slate-900/80 border border-slate-800/80 backdrop-blur-md rounded-2xl shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">AI Diagnostic Engine</span>
              <span className="px-2 py-0.5 text-[9px] bg-emerald-500/10 text-emerald-400 rounded-full font-bold">Active</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white tracking-tight">99.2%</span>
              <span className="text-[10px] text-slate-500">Confidence Match</span>
            </div>
            <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
              <div className="bg-primary h-full rounded-full" style={{ width: '92.2%' }} />
            </div>
          </motion.div>
        </div>

        <div className="absolute right-12 bottom-1/4 z-10 hidden xl:block w-60">
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
            className="p-4 bg-slate-900/80 border border-slate-800/80 backdrop-blur-md rounded-2xl shadow-2xl flex items-center gap-3.5"
          >
            <div className="p-2.5 bg-primary/20 rounded-xl border border-primary/30">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">HIPAA Compliant</h4>
              <p className="text-[10px] text-slate-400 font-medium">Strict Data Protection</p>
            </div>
          </motion.div>
        </div>

        {/* Footer info */}
        <div className="relative z-10">
          <p className="text-xs text-slate-500 font-medium">© 2026 AuraHealth. Secure Clinical Environment.</p>
        </div>

      </div>

      {/* Right Column - Registration Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative overflow-y-auto bg-transparent z-10">
        
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-lg bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl p-8 sm:p-10 rounded-3xl shadow-2xl relative z-10 space-y-6 my-auto py-8"
        >
          
          {/* Logo visible only on Mobile/Tablet */}
          <div className="flex flex-col items-center gap-3 lg:hidden mb-4">
            <div className="p-2.5 bg-primary rounded-xl shadow-lg shadow-primary/10">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">AuraHealth</span>
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              Create Account
            </h2>
            <p className="text-slate-400 mt-2 text-sm">
              Join the AuraHealth professional medical network.
            </p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-red-955/20 border border-red-900/30 rounded-xl flex items-start gap-3 text-red-400 text-sm"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="leading-normal">{error}</p>
            </motion.div>
          )}

          {/* Role Selection Slider */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900/60 border border-slate-800 rounded-xl mb-6 relative">
            {['patient', 'doctor'].map((r) => (
              <button
                key={r}
                data-testid={`role-${r}-tab`}
                type="button"
                onClick={() => setRole(r)}
                className={`
                  relative py-2.5 rounded-lg text-sm font-bold transition-all duration-300 capitalize z-10
                  ${role === r 
                    ? 'text-primary' 
                    : 'text-slate-400 hover:text-slate-200'}
                `}
              >
                {role === r && (
                  <motion.div
                    layoutId="activeRole"
                    className="absolute inset-0 bg-slate-900 border border-slate-800 rounded-lg shadow-sm -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                {r}
              </button>
            ))}
          </div>

          {/* Doctor Sub Tabs */}
          {role === 'doctor' && (
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/60 border border-slate-900 rounded-lg mb-6 text-xs relative">
              <button
                type="button"
                onClick={() => setDoctorSubTab('request')}
                className={`
                  relative py-2 rounded-md font-bold transition-all duration-300 z-10
                  ${doctorSubTab === 'request' 
                    ? 'text-primary' 
                    : 'text-slate-400 hover:text-slate-200'}
                `}
              >
                {doctorSubTab === 'request' && (
                  <motion.div
                    layoutId="activeDoctorSubTab"
                    className="absolute inset-0 bg-slate-900 border border-slate-800 rounded-md shadow-sm -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                1. Submit Request
              </button>
              <button
                type="button"
                onClick={() => setDoctorSubTab('register')}
                className={`
                  relative py-2 rounded-md font-bold transition-all duration-300 z-10
                  ${doctorSubTab === 'register' 
                    ? 'text-primary' 
                    : 'text-slate-400 hover:text-slate-200'}
                `}
              >
                {doctorSubTab === 'register' && (
                  <motion.div
                    layoutId="activeDoctorSubTab"
                    className="absolute inset-0 bg-slate-900 border border-slate-800 rounded-md shadow-sm -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                2. Create Account
              </button>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleRegister}>
            <AnimatePresence mode="wait">
              <motion.div
                key={`${role}-${doctorSubTab}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                {/* Full Name - Hidden only if Doctor Register */}
                {!isDoctorRegister && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 ml-1 uppercase tracking-wider">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input 
                        data-testid="register-fullname-input"
                        name="fullName"
                        type="text" 
                        required
                        value={formData.fullName}
                        onChange={handleInputChange}
                        placeholder={role === 'doctor' ? "Dr. John Doe" : "John Doe"}
                        className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-800 bg-slate-900/50 focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all text-white placeholder:text-slate-500"
                      />
                    </div>
                  </div>
                )}

                {/* Email Address - Always visible */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 ml-1 uppercase tracking-wider">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                      data-testid="register-email-input"
                      name="email"
                      type="email" 
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="john@example.com"
                      className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-800 bg-slate-900/50 focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all text-white placeholder:text-slate-500"
                    />
                  </div>
                  {validationErrors.email && (
                    <p data-testid="register-email-error" className="text-[11px] text-red-400 mt-1 ml-1">{validationErrors.email}</p>
                  )}
                  {emailSuggestion && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, email: emailSuggestion }));
                        setEmailSuggestion(null);
                      }}
                      className="text-[11px] bg-blue-500/10 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-lg mt-1 text-left hover:bg-blue-500/20 transition-all font-medium block w-full"
                    >
                      💡 Did you mean <span className="underline font-bold">{emailSuggestion}</span>? (Click to fix)
                    </button>
                  )}
                  {isDoctorRequest && (
                    <p className="text-[10px] text-slate-400 ml-1">
                      This email must match the one you will use to register after approval.
                    </p>
                  )}
                </div>

                {/* Password - Hidden only if Doctor Request */}
                {!isDoctorRequest && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 ml-1 uppercase tracking-wider">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input 
                        data-testid="register-password-input"
                        name="password"
                        type={showPassword ? "text" : "password"} 
                        required
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder="••••••••"
                        className="w-full pl-12 pr-12 py-3.5 rounded-xl border border-slate-800 bg-slate-900/50 focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all text-white placeholder:text-slate-500"
                      />
                      <button
                        data-testid="toggle-register-password"
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 focus:outline-none transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Remaining details: Mobile - Hidden if Doctor Register */}
                {!isDoctorRegister && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300 ml-1 uppercase tracking-wider">
                        Mobile Number
                      </label>
                      <div className="flex gap-2">
                        <select 
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="w-24 px-2 py-3.5 rounded-xl border border-slate-800 bg-slate-900/50 text-white focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none text-center"
                        >
                          {countryCodes.map(cc => (
                            <option key={cc.code} value={cc.code} className="bg-slate-950 text-white">
                              {cc.label}
                            </option>
                          ))}
                        </select>
                        <div className="relative flex-1">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <input 
                            name="phoneNumber"
                            type="tel" 
                            required
                            value={formData.phoneNumber}
                            onChange={handleInputChange}
                            placeholder="00000 00000"
                            className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-800 bg-slate-900/50 focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all text-white placeholder:text-slate-500"
                          />
                        </div>
                      </div>
                      {validationErrors.phoneNumber && (
                        <p className="text-[11px] text-red-400 mt-1 ml-1">{validationErrors.phoneNumber}</p>
                      )}
                    </div>

                    {/* Gender Selection & Date of Birth */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-300 ml-1 uppercase tracking-wider">
                          Gender
                        </label>
                        <select
                          name="gender"
                          required
                          value={formData.gender}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3.5 rounded-xl border border-slate-800 bg-slate-900/50 focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all text-white"
                        >
                          <option value="" disabled className="bg-slate-950 text-slate-500">Select Gender</option>
                          <option value="male" className="bg-slate-950 text-white">Male</option>
                          <option value="female" className="bg-slate-950 text-white">Female</option>
                          <option value="other" className="bg-slate-950 text-white">Other</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-300 ml-1 uppercase tracking-wider">
                          Date of Birth
                        </label>
                        <input 
                          type="date"
                          name="dob"
                          className="w-full px-4 py-3.5 rounded-xl border border-slate-800 bg-slate-900/50 focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all text-white"
                          value={formData.dob}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>

                    {/* Doctor Specific Professional Fields - Visible only if doctor requesting verification */}
                    {role === 'doctor' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-slate-300 ml-1 uppercase tracking-wider">
                            Medical Specialty
                          </label>
                          <input 
                            name="specialty"
                            type="text" 
                            required
                            value={formData.specialty}
                            onChange={handleInputChange}
                            placeholder="e.g. Cardiologist"
                            className="w-full px-4 py-3.5 rounded-xl border border-slate-800 bg-slate-900/50 focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all text-white placeholder:text-slate-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-slate-300 ml-1 uppercase tracking-wider">
                            License Number
                          </label>
                          <input 
                            name="licenseNumber"
                            type="text" 
                            required
                            value={formData.licenseNumber}
                            onChange={handleInputChange}
                            placeholder="e.g. MC12345"
                            className="w-full px-4 py-3.5 rounded-xl border border-slate-800 bg-slate-900/50 focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all text-white placeholder:text-slate-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-slate-300 ml-1 uppercase tracking-wider">
                            Hospital Name
                          </label>
                          <input 
                            name="hospitalName"
                            type="text" 
                            required
                            value={formData.hospitalName}
                            onChange={handleInputChange}
                            placeholder="e.g. Apollo Hospital"
                            className="w-full px-4 py-3.5 rounded-xl border border-slate-800 bg-slate-900/50 focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all text-white placeholder:text-slate-500"
                          />
                        </div>
                        <div className="sm:col-span-2 space-y-2">
                          <label className="text-xs font-semibold text-slate-300 ml-1 uppercase tracking-wider">
                            Hospital Address
                          </label>
                          <input 
                            name="hospitalAddress"
                            type="text" 
                            required
                            value={formData.hospitalAddress}
                            onChange={handleInputChange}
                            placeholder="Full Hospital Address"
                            className="w-full px-4 py-3.5 rounded-xl border border-slate-800 bg-slate-900/50 focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all text-white placeholder:text-slate-500"
                          />
                        </div>
                        
                        {/* Document Photocopy Upload */}
                        <div className="sm:col-span-2 space-y-2">
                          <label className="text-xs font-semibold text-slate-300 ml-1 uppercase tracking-wider">
                            Credentials Document Photocopy
                          </label>
                          <div className="flex items-center gap-3.5 p-4 rounded-xl border border-slate-800 bg-slate-900/30 backdrop-blur-md">
                            <FileImage className="w-8 h-8 text-primary shrink-0" />
                            <div className="flex-1 min-w-0">
                              <input 
                                type="file" 
                                accept="image/*"
                                required
                                onChange={handleFileChange}
                                className="text-xs text-slate-400 w-full file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 file:transition-all"
                              />
                              <p className="text-[10px] text-slate-500 mt-1">Upload JPEG/PNG photocopies of license or degrees.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="flex items-start gap-3 py-2">
              <input 
                type="checkbox" 
                required 
                className="mt-1 w-4 h-4 rounded border-slate-800 bg-slate-900/50 text-primary focus:ring-primary" 
              />
              <p className="text-xs text-slate-400 leading-normal">
                I agree to the <Link to="/terms" target="_blank" className="text-primary font-bold hover:underline">Terms of Service</Link> and <Link to="/privacy" target="_blank" className="text-primary font-bold hover:underline">Privacy Policy</Link>
              </p>
            </div>

            <div className="pt-2">
              <Button type="submit" className="w-full py-3.5 text-sm font-bold rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.01]" disabled={loading}>
                {loading 
                  ? 'Processing...' 
                  : (isDoctorRequest ? 'Submit Verification Request' : 'Create Account')}
              </Button>
            </div>
          </form>

          <p className="text-center mt-8 text-slate-400 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-bold hover:underline transition-all">
              Log in
            </Link>
          </p>
        </motion.div>

      </div>
    </div>
  );
};

export default Register;
