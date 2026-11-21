import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { supabase } from '../lib/supabase';
import { setUser } from '../store/slices/authSlice';
import { motion } from 'framer-motion';
import { Activity, ShieldAlert, User as UserIcon, Calendar as CalendarIcon, Droplet as DropletIcon, Scale as ScaleIcon, Ruler as RulerIcon, Pill as PillIcon } from 'lucide-react';
import { Button } from '../components/Button';

const PatientOnboarding = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  
  const [submitting, setSubmitting] = useState(false);
  const [onboardError, setOnboardError] = useState(null);
  const [checking, setChecking] = useState(true);
  
  const [onboardForm, setOnboardForm] = useState({
    gender: '',
    dob: '',
    age: '',
    weight: '',
    height: '',
    bloodGroup: '',
    drugs: '',
    diseases: ''
  });

  useEffect(() => {
    const isPatientOnboarded = user?.user_metadata?.health_onboarded === true || user?.user_metadata?.health_onboarded === 'true' || (user?.user_metadata?.age && user?.user_metadata?.weight_kg);
    if (isPatientOnboarded) {
      navigate('/dashboard', { replace: true });
    } else {
      setChecking(false);
      if (user?.user_metadata) {
        const savedDob = user.user_metadata.dob || '';
        let autoAge = user.user_metadata.age || '';
        if ((!autoAge || autoAge === '0') && savedDob) {
          const bYear = new Date(savedDob).getFullYear();
          if (!isNaN(bYear) && bYear > 1900) {
            autoAge = new Date().getFullYear() - bYear;
          }
        }

        setOnboardForm(prev => ({
          ...prev,
          gender: user.user_metadata.gender || '',
          dob: savedDob,
          age: autoAge ? String(autoAge) : '',
          weight: user.user_metadata.weight_kg || '',
          height: user.user_metadata.height_cm || '',
          bloodGroup: user.user_metadata.blood_group || '',
          drugs: user.user_metadata.drugs || '',
          diseases: user.user_metadata.diseases || ''
        }));
      }
    }
  }, [user, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setOnboardForm(prev => ({ ...prev, [name]: value }));
  };

  const handleOnboardSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setOnboardError(null);

    const medicalHistoryData = {
      dob: onboardForm.dob,
      drugs: onboardForm.drugs.trim() || 'None',
      diseases: onboardForm.diseases.trim() || 'None'
    };

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          gender: onboardForm.gender,
          age: parseInt(onboardForm.age),
          weight_kg: parseFloat(onboardForm.weight),
          height_cm: parseFloat(onboardForm.height),
          blood_group: onboardForm.bloodGroup,
          medical_history: JSON.stringify(medicalHistoryData)
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      const { data: authData, error: authError } = await supabase.auth.updateUser({
        data: {
          gender: onboardForm.gender,
          age: parseInt(onboardForm.age),
          weight_kg: parseFloat(onboardForm.weight),
          height_cm: parseFloat(onboardForm.height),
          blood_group: onboardForm.bloodGroup,
          dob: onboardForm.dob,
          drugs: onboardForm.drugs.trim() || 'None',
          diseases: onboardForm.diseases.trim() || 'None',
          health_onboarded: true
        }
      });

      if (authError) throw authError;

      if (authData?.user) {
        dispatch(setUser(authData.user));
      }

      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Onboarding update error:', err.message || err);
      setOnboardError(err.message || 'Failed to submit onboarding health data.');
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) return null;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 overflow-y-auto relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl opacity-60" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-3xl opacity-60" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-25" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl bg-slate-900/90 border border-slate-800/80 backdrop-blur-2xl p-6 sm:p-10 rounded-3xl shadow-2xl space-y-6 relative z-10 my-10"
      >
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30 shadow-lg shadow-primary/10 mb-2">
            <Activity className="w-6 h-6 text-primary animate-pulse" />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Complete Health Profile
          </h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Please enter your diagnostics details to configure your AI diagnostic models and clinician connections.
          </p>
        </div>

        {onboardError && (
          <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-xl flex items-start gap-3 text-red-400 text-xs">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <p>{onboardError}</p>
          </div>
        )}

        {/* Pre-filled Account Registration Details Card */}
        {(onboardForm.gender || onboardForm.dob) && (
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
                ✓
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Saved Registration Details</p>
                <p className="text-xs font-semibold text-white mt-0.5">
                  {onboardForm.gender && (
                    <span>Gender: <strong className="text-primary capitalize">{onboardForm.gender}</strong></span>
                  )}
                  {onboardForm.gender && onboardForm.dob && <span> • </span>}
                  {onboardForm.dob && (
                    <span>DOB: <strong className="text-primary">{onboardForm.dob}</strong></span>
                  )}
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold rounded-full">
              Stored in DB
            </span>
          </div>
        )}

        <form onSubmit={handleOnboardSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {!onboardForm.gender && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 ml-1">
                  <UserIcon className="w-3.5 h-3.5 text-slate-400" /> Gender
                </label>
                <select
                  name="gender"
                  required
                  value={onboardForm.gender}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-800 bg-slate-950/50 text-white focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none"
                >
                  <option value="" className="bg-slate-950 text-slate-400">Select Gender</option>
                  <option value="male" className="bg-slate-950 text-white">Male</option>
                  <option value="female" className="bg-slate-950 text-white">Female</option>
                  <option value="other" className="bg-slate-950 text-white">Other</option>
                </select>
              </div>
            )}

            {!onboardForm.dob && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 ml-1">
                  <CalendarIcon className="w-3.5 h-3.5 text-slate-400" /> Date of Birth
                </label>
                <input
                  name="dob"
                  type="date"
                  required
                  value={onboardForm.dob}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-800 bg-slate-950/50 text-white focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 ml-1">
                Age (Years)
              </label>
              <input
                name="age"
                type="number"
                required
                min="0"
                max="125"
                placeholder="e.g. 28"
                value={onboardForm.age}
                onChange={handleInputChange}
                className="w-full px-4 py-3.5 rounded-xl border border-slate-800 bg-slate-950/50 text-white focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-600"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 ml-1">
                <DropletIcon className="w-3.5 h-3.5 text-slate-400" /> Blood Group
              </label>
              <select
                name="bloodGroup"
                required
                value={onboardForm.bloodGroup}
                onChange={handleInputChange}
                className="w-full px-4 py-3.5 rounded-xl border border-slate-800 bg-slate-950/50 text-white focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none"
              >
                <option value="" className="bg-slate-950 text-slate-400">Select Blood Group</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                  <option key={bg} value={bg} className="bg-slate-950 text-white">{bg}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 ml-1">
                <ScaleIcon className="w-3.5 h-3.5 text-slate-400" /> Weight (kg)
              </label>
              <input
                name="weight"
                type="number"
                step="0.1"
                required
                min="1"
                placeholder="e.g. 72.5"
                value={onboardForm.weight}
                onChange={handleInputChange}
                className="w-full px-4 py-3.5 rounded-xl border border-slate-800 bg-slate-950/50 text-white focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-600"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 ml-1">
                <RulerIcon className="w-3.5 h-3.5 text-slate-400" /> Height (cm)
              </label>
              <input
                name="height"
                type="number"
                step="0.1"
                required
                min="30"
                placeholder="e.g. 175"
                value={onboardForm.height}
                onChange={handleInputChange}
                className="w-full px-4 py-3.5 rounded-xl border border-slate-800 bg-slate-950/50 text-white focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-600"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 ml-1">
              <PillIcon className="w-3.5 h-3.5 text-slate-400" /> Any Medications/Drugs
            </label>
            <textarea
              name="drugs"
              rows="2"
              placeholder="List any ongoing medications or drug allergies. Type 'None' if none."
              value={onboardForm.drugs}
              onChange={handleInputChange}
              className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950/50 text-white focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-600 resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 ml-1">
              Any Diseases Having (Medical Conditions)
            </label>
            <textarea
              name="diseases"
              rows="2"
              placeholder="List any medical diagnoses or chronic conditions. Type 'None' if none."
              value={onboardForm.diseases}
              onChange={handleInputChange}
              className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950/50 text-white focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-600 resize-none"
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={submitting}
              className="w-full py-4 text-sm font-bold rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.01]"
            >
              {submitting ? 'Saving health data...' : 'Save & Proceed'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default PatientOnboarding;
