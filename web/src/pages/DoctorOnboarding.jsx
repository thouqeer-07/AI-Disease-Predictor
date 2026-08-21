import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { BookOpen, UserCircle, Save, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { setUser } from '../store/slices/authSlice';

const DoctorOnboarding = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    universityName: '',
    startYear: '',
    endYear: '',
    duration: '',
    collegeLocation: '',
    bio: ''
  });
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.universityName || !formData.startYear || !formData.endYear || !formData.duration || !formData.collegeLocation || !formData.bio) {
      setError('Please fill out all fields.');
      return;
    }

    const startY = parseInt(String(formData.startYear).trim(), 10);
    const endY = parseInt(String(formData.endYear).trim(), 10);

    if (isNaN(startY) || isNaN(endY)) {
      setError('Please enter valid numeric 4-digit years for Start Year and End Year.');
      return;
    }

    if (startY === endY) {
      setError('Start Year and End Year cannot be the same year.');
      return;
    }

    if (endY < startY) {
      setError('End Year cannot be earlier than Start Year.');
      return;
    }

    if (endY - startY < 4) {
      setError(`The duration between Start Year (${startY}) and End Year (${endY}) must be at least 4 years for a medical degree.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const educationData = {
        universityName: formData.universityName,
        startYear: formData.startYear,
        endYear: formData.endYear,
        duration: formData.duration,
        collegeLocation: formData.collegeLocation
      };

      // 1. Update doctors table in Supabase
      try {
        await supabase
          .from('doctors')
          .update({
            bio: formData.bio,
            education: JSON.stringify(educationData)
          })
          .eq('id', user?.id);
      } catch (e) {}

      // 2. Update profiles table in Supabase
      try {
        await supabase
          .from('profiles')
          .update({
            medical_history: JSON.stringify({ bio: formData.bio, education: educationData })
          })
          .eq('id', user?.id);
      } catch (e) {}

      // 3. Update Supabase Auth user metadata
      const { data, error: updateError } = await supabase.auth.updateUser({
        data: {
          education: educationData,
          bio: formData.bio,
          onboarded: true
        }
      });

      if (updateError) throw updateError;
      
      // Update Redux state so the router redirects correctly
      dispatch(setUser(data.user));
      
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'An error occurred while saving your profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 overflow-y-auto relative">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl opacity-60" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-3xl opacity-60" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-25" />
      </div>

      <div className="w-full max-w-2xl bg-slate-900/90 border border-slate-800/80 backdrop-blur-2xl p-6 sm:p-10 rounded-3xl shadow-2xl space-y-6 relative z-10 my-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30 shadow-lg shadow-primary/10 mb-2">
            <BookOpen className="w-6 h-6 text-primary animate-pulse" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Professional Profile</h1>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Please complete your professional credentials before accessing your dashboard.
          </p>
        </div>
          
        {error && (
          <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-xl flex items-start gap-3 text-red-400 text-xs">
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-2">Education Details</h3>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 ml-1">University / College Name</label>
              <input
                type="text"
                name="universityName"
                value={formData.universityName}
                onChange={handleChange}
                placeholder="e.g. AIIMS Delhi"
                className="w-full px-4 py-3.5 rounded-xl border border-slate-800 bg-slate-950/50 text-white focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-600"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 ml-1">Start Year</label>
                <input
                  type="number"
                  name="startYear"
                  value={formData.startYear}
                  onChange={handleChange}
                  placeholder="e.g. 2010"
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-800 bg-slate-950/50 text-white focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-600"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 ml-1">End Year</label>
                <input
                  type="number"
                  name="endYear"
                  value={formData.endYear}
                  onChange={handleChange}
                  placeholder="e.g. 2015"
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-800 bg-slate-950/50 text-white focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-600"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 ml-1">Duration (Years)</label>
                <input
                  type="text"
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  placeholder="e.g. 5 Years"
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-800 bg-slate-950/50 text-white focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-600"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 ml-1">College Location</label>
                <input
                  type="text"
                  name="collegeLocation"
                  value={formData.collegeLocation}
                  onChange={handleChange}
                  placeholder="e.g. New Delhi, India"
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-800 bg-slate-950/50 text-white focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-600"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 ml-1">Professional Bio</label>
            <div className="relative">
              <UserCircle className="absolute left-4 top-4 w-5 h-5 text-slate-500" />
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                placeholder="Write a brief professional summary about your expertise and experience..."
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-800 bg-slate-950/50 text-white focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-600 min-h-[150px] resize-y"
                required
              />
            </div>
            <p className="text-xs text-slate-500 ml-1">This will be visible to patients when they view your profile.</p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 text-sm font-bold rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] bg-primary text-white flex items-center justify-center gap-2 disabled:opacity-70 disabled:hover:scale-100"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Save & Proceed
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DoctorOnboarding;
