import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Activity, 
  Mail, 
  Lock, 
  AlertCircle, 
  CheckCircle2, 
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

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [verifiedMessage, setVerifiedMessage] = useState(null);
  
  // OTP States
  const [showOtpBox, setShowOtpBox] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [validationErrors, setValidationErrors] = useState({
    email: ''
  });

  const successMessage = location.state?.message;

  // Initialize OTP box if coming from Register
  useEffect(() => {
    if (location.state?.requireOtp && location.state?.email) {
      setShowOtpBox(true);
      setOtpEmail(location.state.email);
    }
  }, [location.state]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('verified') === 'true') {
      setVerifiedMessage('Your email has been successfully verified! You can now log in.');
    }
  }, [location]);

  // Real-time email validation effect
  useEffect(() => {
    const trimmedEmail = formData.email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let emailErr = '';
    if (formData.email && !emailRegex.test(trimmedEmail)) {
      emailErr = 'Please enter a valid email address.';
    }
    setValidationErrors({ email: emailErr });
  }, [formData.email]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'email') {
      let clean = value.toLowerCase().replace(/\s+/g, '');
      clean = clean.replace(/[^a-z0-9@._\-+]/g, '');
      const parts = clean.split('@');
      if (parts.length > 2) {
        clean = parts[0] + '@' + parts.slice(1).join('');
      }
      setFormData(prev => ({ ...prev, email: clean }));
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleForgotPassword = async (e) => {
    if (e) e.preventDefault();
    setError(null);
    setVerifiedMessage(null);

    let targetEmail = formData.email ? formData.email.trim() : '';

    if (!targetEmail) {
      targetEmail = window.prompt("Please enter your registered email address to receive a password reset link:");
      if (!targetEmail || !targetEmail.trim()) return;
      targetEmail = targetEmail.trim();
      setFormData(prev => ({ ...prev, email: targetEmail }));
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(targetEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      // 1. Primary: Use Supabase Auth client to send reset password email
      const { error: sbError } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      let backendSent = false;

      // 2. Secondary: Call backend API if running
      try {
        const data = await fetchApiWithFallback('/patients/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: targetEmail })
        });
        if (data && data.success) backendSent = true;
      } catch (backendErr) {
        console.warn('Backend reset email endpoint notice:', backendErr);
      }

      if (sbError && !backendSent) {
        throw sbError;
      }

      setVerifiedMessage(`Password reset link has been sent to ${targetEmail}! Please check your email inbox.`);
    } catch (err) {
      console.error('Forgot password error:', err);
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setOtpLoading(true);
    setError(null);
    setVerifiedMessage(null);

    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter a valid 6-digit OTP.');
      setOtpLoading(false);
      return;
    }

    try {
      const data = await fetchApiWithFallback('/patients/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpEmail, otp: otpCode })
      });

      if (data && data.success) {
        setVerifiedMessage('Email verified successfully! You can now log in.');
        setShowOtpBox(false);
        setOtpCode('');
        
        // Auto-fill the email in the login form if not already there
        setFormData(prev => ({ ...prev, email: otpEmail }));
      }
    } catch (err) {
      setError(err.message || 'Invalid or expired OTP.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Prevent submission if there are validation errors
    if (validationErrors.email || !formData.email) {
      setError(validationErrors.email || 'Please enter your email address.');
      setLoading(false);
      return;
    }

    const trimmedEmail = formData.email.trim();

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: formData.password
      });

      if (signInError) throw signInError;

      // Restrict OTP verification check to Patient accounts only (Doctors and Admins are pre-verified)
      const userRole = data.user?.user_metadata?.role;
      const isDoctorOrAdmin = userRole === 'doctor' || userRole === 'admin';

      if (!isDoctorOrAdmin && data.user && (!data.user.email_confirmed_at || data.user.user_metadata?.aura_verified === false)) {
        await supabase.auth.signOut();
        setOtpEmail(trimmedEmail);
        setShowOtpBox(true);
        setError('Please verify your email to log in. An OTP has been sent to your inbox.');
        return;
      }

      // Successful login
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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

      {/* Right Column - Authentication Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative overflow-y-auto bg-transparent z-10">
        
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-md bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl p-8 sm:p-10 rounded-3xl shadow-2xl relative z-10 space-y-6"
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
              Welcome Back
            </h2>
            <p className="text-slate-400 mt-2 text-sm">
              Enter your credentials to access your health portal.
            </p>
          </div>

          {(verifiedMessage || successMessage) && (
            <motion.div 
              data-testid="verified-alert"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-emerald-950/20 border border-emerald-900/30 rounded-xl flex items-start gap-3 text-emerald-400 text-sm"
            >
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="leading-normal">{verifiedMessage || successMessage}</p>
            </motion.div>
          )}

          {error && (
            <motion.div 
              data-testid="error-alert"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-red-950/20 border border-red-900/30 rounded-xl flex items-start gap-3 text-red-400 text-sm"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="leading-normal">{error}</p>
            </motion.div>
          )}

          {showOtpBox ? (
            <form className="space-y-5" onSubmit={handleVerifyOtp} data-testid="otp-form">
              <div className="text-center mb-4">
                <p className="text-sm text-slate-400">
                  We sent a 6-digit verification code to <br />
                  <strong className="text-white">{otpEmail}</strong>
                </p>
              </div>
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="space-y-2"
              >
                <label className="text-xs font-semibold text-slate-300 ml-1 uppercase tracking-wider text-center block">
                  Enter 6-Digit OTP
                </label>
                <div className="relative">
                  <input 
                    name="otp"
                    type="text" 
                    maxLength={6}
                    required
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full text-center tracking-[1em] py-4 rounded-xl border border-slate-800 bg-slate-900/50 focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all text-2xl font-bold text-white placeholder:text-slate-600"
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="pt-2 flex gap-3"
              >
                <Button type="button" onClick={() => setShowOtpBox(false)} variant="outline" className="flex-1 py-3.5 text-sm font-bold rounded-xl transition-all">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 py-3.5 text-sm font-bold rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.01]" disabled={otpLoading || otpCode.length !== 6}>
                  {otpLoading ? 'Verifying...' : 'Verify Email'}
                </Button>
              </motion.div>
            </form>
          ) : (
            <form className="space-y-5" onSubmit={handleLogin} data-testid="login-form">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="space-y-2"
              >
                <label className="text-xs font-semibold text-slate-300 ml-1 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    data-testid="login-email-input"
                    name="email"
                    type="email" 
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="name@healthcare.com"
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-800 bg-slate-900/50 focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all text-white placeholder:text-slate-500"
                  />
                </div>
                {validationErrors.email && (
                  <p data-testid="email-validation-error" className="text-[11px] text-red-400 mt-1 ml-1">{validationErrors.email}</p>
                )}
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="space-y-2"
              >
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Password
                  </label>
                  <button 
                    data-testid="forgot-password-link"
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs text-primary font-bold hover:underline transition-all cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    data-testid="login-password-input"
                    name="password"
                    type={showPassword ? "text" : "password"} 
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-3.5 rounded-xl border border-slate-800 bg-slate-900/50 focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all text-white placeholder:text-slate-500"
                  />
                  <button
                    data-testid="toggle-password-button"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 focus:outline-none transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="pt-2"
              >
                <Button data-testid="login-submit-button" type="submit" className="w-full py-3.5 text-sm font-bold rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.01]" disabled={loading}>
                  {loading ? 'Signing In...' : 'Sign In'}
                </Button>
              </motion.div>
            </form>
          )}

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center mt-8 text-slate-400 text-sm"
          >
            Don't have an account?{' '}
            <Link data-testid="register-link" to="/register" className="text-primary font-bold hover:underline transition-all">
              Create account
            </Link>
          </motion.p>
        </motion.div>

      </div>
    </div>
  );
};

export default Login;
