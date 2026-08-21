import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Activity, 
  Lock, 
  AlertCircle, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  KeyRound, 
  ArrowLeft 
} from 'lucide-react';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';
import { fetchApiWithFallback } from '../lib/api';
import { motion } from 'framer-motion';

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Extract email or token from URL if present
  const searchParams = new URLSearchParams(location.search);
  const emailQuery = searchParams.get('email') || '';

  const handleReset = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);

    try {
      // 1. First try Supabase Client Auth session update
      const { error: sbError } = await supabase.auth.updateUser({ password });
      
      let updateSuccessful = !sbError;

      // 2. If client update fails or no active session token, fall back to backend Admin API
      if (!updateSuccessful && emailQuery) {
        const data = await fetchApiWithFallback('/patients/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailQuery, password })
        });
        if (data) updateSuccessful = true;
      }

      if (!updateSuccessful && sbError) {
        throw sbError;
      }

      setSuccess('Your password has been successfully reset! Redirecting to login page...');
      setTimeout(() => {
        navigate('/login', { state: { message: 'Password updated successfully! Please sign in with your new credentials.' } });
      }, 2500);

    } catch (err) {
      console.error('Password reset failed:', err);
      setError(err.message || 'Failed to update password. Please request a new reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-6 font-sans relative overflow-hidden">
      {/* Background Glow Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-primary/20 rounded-full blur-3xl opacity-60" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-3xl opacity-60" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-25" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-slate-900/60 border border-slate-800 backdrop-blur-xl p-8 sm:p-10 rounded-3xl shadow-2xl relative z-10 space-y-6"
      >
        <div className="flex items-center gap-3 justify-center mb-2">
          <div className="p-2.5 bg-primary rounded-xl shadow-lg shadow-primary/20">
            <KeyRound className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">AuraHealth</span>
        </div>

        <div className="text-center space-y-1">
          <h2 className="text-2xl font-extrabold text-white">Reset Password</h2>
          <p className="text-slate-400 text-sm">
            Enter your new secure password below.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-xl flex items-start gap-3 text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="leading-normal">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-950/20 border border-emerald-900/30 rounded-xl flex items-start gap-3 text-emerald-400 text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="leading-normal">{success}</p>
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 ml-1 uppercase tracking-wider">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type={showPassword ? "text" : "password"} 
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-12 py-3.5 rounded-xl border border-slate-800 bg-slate-900/50 focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all text-white placeholder:text-slate-500 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 ml-1 uppercase tracking-wider">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type={showPassword ? "text" : "password"} 
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-12 py-3.5 rounded-xl border border-slate-800 bg-slate-900/50 focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all text-white placeholder:text-slate-500 text-sm"
              />
            </div>
          </div>

          <Button type="submit" className="w-full py-3.5 text-sm font-bold rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.01]" disabled={loading}>
            {loading ? 'Updating Password...' : 'Set New Password'}
          </Button>
        </form>

        <div className="text-center pt-2">
          <Link to="/login" className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white font-medium transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
