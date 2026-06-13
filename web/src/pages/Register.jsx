import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, Mail, Lock, User, Shield, AlertCircle, Phone } from 'lucide-react';

import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';

const Register = () => {
 const navigate = useNavigate();
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



 const handleInputChange = (e) => {
 const { name, value } = e.target;
 setFormData(prev => ({ ...prev, [name]: value }));
 };

 const handleRegister = async (e) => {
 e.preventDefault();
 setLoading(true);
 setError(null);

 try {
 const { data, error: signUpError } = await supabase.auth.signUp({
 email: formData.email,
 password: formData.password,
 options: {
 data: {
 full_name: formData.fullName,
 role: role,
 phone_number: formData.phoneNumber,
 gender: formData.gender,
 specialty: role === 'doctor' ? formData.specialty : undefined,
 license_number: role === 'doctor' ? formData.licenseNumber : undefined,
 hospital_name: role === 'doctor' ? formData.hospitalName : undefined,
 hospital_address: role === 'doctor' ? formData.hospitalAddress : undefined,
 experience_years: role === 'doctor' ? formData.experienceYears : undefined
 }


 }
 });

 if (signUpError) throw signUpError;

 if (data.user) {
 // Registration successful
 navigate('/login', { state: { message: 'Registration successful! Please check your email to verify your account.' } });
 }
 } catch (err) {
 setError(err.message);
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
 <div className="w-full max-w-lg">
 <div className="flex justify-center mb-8">
 <div className="flex items-center gap-3">
 <div className="p-2.5 bg-primary rounded-xl shadow-md">
 <Activity className="w-6 h-6 text-white" />
 </div>
 <span className="text-2xl font-bold tracking-tight text-slate-900">AuraHealth</span>
 </div>
 </div>

 <Card className="p-8">
 <div className="text-center mb-8">
 <h2 className="text-2xl font-bold text-slate-900">Create Account</h2>
 <p className="text-slate-500 mt-1">Join the AuraHealth professional medical network</p>
 </div>

 {error && (
 <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm">
 <AlertCircle className="w-5 h-5 shrink-0" />
 <p>{error}</p>
 </div>
 )}

 {/* Role Selection */}
 <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl mb-8">
 {['patient', 'doctor'].map((r) => (
 <button
 key={r}
 type="button"
 onClick={() => setRole(r)}
 className={`
 py-2 rounded-lg text-sm font-bold transition-all duration-300 capitalize
 ${role === r 
 ? 'bg-white text-primary shadow-sm ring-1 ring-black/5' 
 : 'text-slate-500 hover:text-slate-700'}
 `}
 >
 {r}
 </button>
 ))}
 </div>


 <form className="space-y-5" onSubmit={handleRegister}>
 {/* 1. Full Name */}
 <div className="space-y-2">
 <label className="text-sm font-medium text-slate-700 ml-1">Full Name</label>
 <div className="relative">
 <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
 <input 
 name="fullName"
 type="text" 
 required
 value={formData.fullName}
 onChange={handleInputChange}
 placeholder="John Doe"
 className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-100 bg-white/50 bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900"
 />
 </div>
 </div>

 {/* 2. Email Address */}
 <div className="space-y-2">
 <label className="text-sm font-medium text-slate-700 ml-1">Email Address</label>
 <div className="relative">
 <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
 <input 
 name="email"
 type="email" 
 required
 value={formData.email}
 onChange={handleInputChange}
 placeholder="john@example.com"
 className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-100 bg-white/50 bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900"
 />
 </div>
 </div>

 {/* 3. Password */}
 <div className="space-y-2">
 <label className="text-sm font-medium text-slate-700 ml-1">Password</label>
 <div className="relative">
 <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
 <input 
 name="password"
 type="password" 
 required
 value={formData.password}
 onChange={handleInputChange}
 placeholder="••••••••"
 className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-100 bg-white/50 bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900"
 />
 </div>
 </div>

 {/* 4. Mobile & Gender Grid */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-2">
 <label className="text-sm font-medium text-slate-700 ml-1">Mobile Number</label>
 <div className="relative">
 <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
 <input 
 name="phoneNumber"
 type="tel" 
 required
 value={formData.phoneNumber}
 onChange={handleInputChange}
 placeholder="+91 0000000000"
 className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-slate-900"
 />
 </div>
 </div>
 <div className="space-y-2">
 <label className="text-sm font-medium text-slate-700 ml-1">Gender</label>
 <select 
 name="gender"
 required
 value={formData.gender}
 onChange={handleInputChange}
 className="w-full px-4 py-3.5 rounded-xl border border-slate-100 bg-white/50 bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 appearance-none"
 >
 <option value="">Select Gender</option>
 <option value="male">Male</option>
 <option value="female">Female</option>
 <option value="other">Other</option>
 </select>
 </div>
 </div>

 {/* 5. Doctor Specific Fields */}
 {role === 'doctor' && (
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
 <div className="space-y-2">
 <label className="text-sm font-medium text-slate-700 ml-1">Medical Specialty</label>
 <div className="relative">
 <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
 <input 
 name="specialty"
 type="text" 
 required={role === 'doctor'}
 value={formData.specialty}
 onChange={handleInputChange}
 placeholder="e.g. Cardiologist"
 className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-slate-900"
 />
 </div>
 </div>
 <div className="space-y-2">
 <label className="text-sm font-medium text-slate-700 ml-1">License Number</label>
 <div className="relative">
 <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
 <input 
 name="licenseNumber"
 type="text" 
 required={role === 'doctor'}
 value={formData.licenseNumber}
 onChange={handleInputChange}
 placeholder="e.g. MC12345"
 className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-slate-900"
 />
 </div>
 </div>
 <div className="space-y-2">
 <label className="text-sm font-medium text-slate-700 ml-1">Hospital Name</label>
 <div className="relative">
 <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
 <input 
 name="hospitalName"
 type="text" 
 required={role === 'doctor'}
 value={formData.hospitalName}
 onChange={handleInputChange}
 placeholder="e.g. Apollo Hospital"
 className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-slate-900"
 />
 </div>
 </div>
 <div className="space-y-2">
 <label className="text-sm font-medium text-slate-700 ml-1">Experience (Years)</label>
 <div className="relative">
 <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
 <input 
 name="experienceYears"
 type="number" 
 required={role === 'doctor'}
 value={formData.experienceYears}
 onChange={handleInputChange}
 placeholder="e.g. 10"
 className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-slate-900"
 />
 </div>
 </div>
 <div className="sm:col-span-2 space-y-2">
 <label className="text-sm font-medium text-slate-700 ml-1">Hospital Address</label>
 <div className="relative">
 <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
 <input 
 name="hospitalAddress"
 type="text" 
 required={role === 'doctor'}
 value={formData.hospitalAddress}
 onChange={handleInputChange}
 placeholder="Full Hospital Address"
 className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-slate-900"
 />
 </div>
 </div>
 </div>
 )}

 <div className="flex items-start gap-3 py-2">
 <input type="checkbox" required className="mt-1 rounded border-slate-300 text-primary focus:ring-primary" />
 <p className="text-sm text-slate-500">
 I agree to the <a href="#" className="text-primary font-medium hover:underline">Terms of Service</a> and <a href="#" className="text-primary font-medium hover:underline">Privacy Policy</a>
 </p>
 </div>

 <Button type="submit" className="w-full py-4 text-base rounded-lg" disabled={loading}>
 {loading ? 'Creating Account...' : 'Create Account'}
 </Button>
 </form>


 <p className="text-center mt-8 text-slate-600 text-slate-500">
 Already have an account?{' '}
 <Link to="/login" className="text-primary font-semibold hover:underline">Log in</Link>
 </p>
 </Card>
 </div>
 </div>
 );
};

export default Register;





