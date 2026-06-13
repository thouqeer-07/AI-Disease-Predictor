import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Activity, Mail, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';

const Login = () => {
 const navigate = useNavigate();
 const location = useLocation();
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState(null);
 const [formData, setFormData] = useState({
 email: '',
 password: ''
 });

 const successMessage = location.state?.message;

 const handleInputChange = (e) => {
 const { name, value } = e.target;
 setFormData(prev => ({ ...prev, [name]: value }));
 };

 const handleLogin = async (e) => {
 e.preventDefault();
 setLoading(true);
 setError(null);

 try {
 const { error: signInError } = await supabase.auth.signInWithPassword({
 email: formData.email,
 password: formData.password
 });

 if (signInError) throw signInError;

 // Successful login
 navigate('/dashboard');
 } catch (err) {
 setError(err.message);
 } finally {
 setLoading(false);
 }
 };


 return (
 <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
 <div className="w-full max-w-md">
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
 <h2 className="text-2xl font-bold text-slate-900">Welcome Back</h2>
 <p className="text-slate-500 mt-1">Access your professional health dashboard</p>
 </div>

 {successMessage && (
 <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3 text-emerald-600 text-sm">
 <CheckCircle2 className="w-5 h-5 shrink-0" />
 <p>{successMessage}</p>
 </div>
 )}

 {error && (
 <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm">
 <AlertCircle className="w-5 h-5 shrink-0" />
 <p>{error}</p>
 </div>
 )}

 <form className="space-y-6" onSubmit={handleLogin}>
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
 placeholder="name@healthcare.com"
 className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-slate-900"
 />
 </div>
 </div>

 <div className="space-y-2">
 <div className="flex justify-between items-center ml-1">
 <label className="text-sm font-medium text-slate-700">Password</label>
 <a href="#" className="text-sm text-primary font-medium hover:underline">Forgot password?</a>
 </div>
 <div className="relative">
 <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
 <input 
 name="password"
 type="password" 
 required
 value={formData.password}
 onChange={handleInputChange}
 placeholder="••••••••"
 className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-slate-900"
 />
 </div>
 </div>

 <Button type="submit" className="w-full py-4 text-base" disabled={loading}>
 {loading ? 'Signing In...' : 'Sign In'}
 </Button>

 </form>

 <p className="text-center mt-8 text-slate-600 text-slate-500">
 Don't have an account?{' '}
 <Link to="/register" className="text-primary font-semibold hover:underline">Create account</Link>
 </p>
 </Card>
 </div>
 </div>
 );
};

export default Login;





