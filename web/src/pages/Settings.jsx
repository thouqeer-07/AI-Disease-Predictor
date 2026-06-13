import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Scale, Ruler, Calendar, Heart, Shield, Save, Loader2, LogOut, Trash2, AlertTriangle, ShieldCheck } from 'lucide-react';

import { useSelector, useDispatch } from 'react-redux';
import { Card, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';
import { logout } from '../store/slices/authSlice';

const Settings = () => {
 const { user, role } = useSelector((state) => state.auth);
 const dispatch = useDispatch();

 const [loading, setLoading] = useState(false);
 const [formData, setFormData] = useState({
 full_name: user?.user_metadata?.full_name || '',
 age: user?.user_metadata?.age || '',
 weight_kg: user?.user_metadata?.weight_kg || '',
 height_cm: user?.user_metadata?.height_cm || '',
 blood_group: user?.user_metadata?.blood_group || '',
 phone_number: user?.user_metadata?.phone_number || '',
 gender: user?.user_metadata?.gender || '',
 // Doctor specific
 specialty: '',

 license_number: '',
 hospital_name: '',
 hospital_address: '',
 experience_years: ''
 });


 const handleChange = (e) => {
 setFormData({ ...formData, [e.target.name]: e.target.value });
 };

 useEffect(() => {
 const fetchFullProfile = async () => {
 if (!user?.id) return;
 
 try {
 // 1. Fetch from profiles table (Personal Info)
 const { data: profileData } = await supabase
 .from('profiles')
 .select('*')
 .eq('id', user.id)
 .single();

 // 2. Fetch from doctors table (if doctor)
 let doctorData = null;
 if (role === 'doctor') {
 const { data } = await supabase
 .from('doctors')
 .select('*')
 .eq('id', user.id)
 .single();
 doctorData = data;
 }

 // 3. Fallback to user_metadata
 const meta = user.user_metadata || {};
 
 setFormData(prev => ({
 ...prev,
 full_name: profileData?.full_name || meta.full_name || prev.full_name,
 phone_number: profileData?.phone_number || meta.phone_number || prev.phone_number,
 gender: profileData?.gender || meta.gender || prev.gender,
 age: profileData?.age || meta.age || prev.age,
 weight_kg: profileData?.weight_kg || meta.weight_kg || prev.weight_kg,
 height_cm: profileData?.height_cm || meta.height_cm || prev.height_cm,
 blood_group: profileData?.blood_group || meta.blood_group || prev.blood_group,
 // Doctor fields
 specialty: doctorData?.specialty || meta.specialty || '',
 license_number: doctorData?.license_number || meta.license_number || '',
 hospital_name: doctorData?.hospital_name || meta.hospital_name || '',
 hospital_address: doctorData?.hospital_address || meta.hospital_address || '',
 experience_years: doctorData?.experience_years || meta.experience_years || ''
 }));
 } catch (err) {
 console.error("Error fetching full profile:", err);
 }
 };

 fetchFullProfile();
 }, [role, user?.id]);



 const handleSave = async (e) => {
 e.preventDefault();
 setLoading(true);

 try {
 const { error } = await supabase.auth.updateUser({
 data: formData
 });

 if (error) throw error;

 // Also update profiles table
 const { error: profileError } = await supabase
 .from('profiles')
 .update({
 full_name: formData.full_name,
 gender: formData.gender,
 age: parseInt(formData.age),
 weight_kg: parseFloat(formData.weight_kg),
 height_cm: parseFloat(formData.height_cm),
 blood_group: formData.blood_group,
 phone_number: formData.phone_number
 })

 .eq('id', user.id);

 if (profileError) throw profileError;

 if (role === 'doctor') {
 const { error: doctorError } = await supabase
 .from('doctors')
 .update({
 specialty: formData.specialty,
 license_number: formData.license_number,
 hospital_name: formData.hospital_name,
 hospital_address: formData.hospital_address,
 experience_years: parseInt(formData.experience_years) || 0
 })
 .eq('id', user.id);
 if (doctorError) throw doctorError;
 }

 
 alert('Profile updated successfully!');
 } catch (error) {
 console.error('Update error:', error.message);
 alert('Error updating profile: ' + error.message);
 } finally {
 setLoading(false);
 }
 };

 const handleDeleteAccount = async () => {
 const confirmed = window.confirm(
 "CRITICAL WARNING: This will PERMANENTLY DELETE your entire AuraHealth account, including medical history, chat consultations, and logs. This action CANNOT be undone. Are you absolutely sure?"
 );

 if (!confirmed) return;

 setLoading(true);
 try {
 const { error } = await supabase.rpc('delete_user_account');
 if (error) throw error;

 alert('Your account and all associated data have been deleted. You will now be redirected.');
 dispatch(logout());
 } catch (error) {
 console.error('Deletion error:', error.message);
 alert('Error deleting account: ' + error.message);
 } finally {
 setLoading(false);
 }
 };


 return (
 <div className="p-8 max-w-4xl mx-auto">
 <div className="mb-10">
 <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
 <p className="text-slate-500 mt-1">Manage your health profile and account preferences.</p>
 </div>

 <form onSubmit={handleSave} className="space-y-8">
 <Card className="p-8">
 <CardHeader title="Personal Information" icon={User} />
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
 <div className="space-y-2">
 <label className="text-sm font-medium text-slate-700 ml-1">Full Name</label>
 <div className="relative">
 <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
 <input 
 name="full_name"
 value={formData.full_name}
 onChange={handleChange}
 className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-100 bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-slate-900"
 />
 </div>
 </div>
 <div className="space-y-2">
 <label className="text-sm font-medium text-slate-700 ml-1">Gender</label>
 <select 
 name="gender"
 value={formData.gender}
 onChange={handleChange}
 className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-slate-900"
 >
 <option value="">Select</option>
 <option value="male">Male</option>
 <option value="female">Female</option>
 <option value="other">Other</option>
 </select>
 </div>
 <div className="space-y-2">
 <label className="text-sm font-medium text-slate-700 ml-1">Phone Number</label>
 <div className="relative">

 <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
 <input 
 name="phone_number"
 value={formData.phone_number}
 onChange={handleChange}
 className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-100 bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-slate-900"
 />
 </div>
 </div>
 </div>
 </Card>

 {role === 'doctor' ? (
 <Card className="p-8">
 <CardHeader title="Medical Credentials" icon={ShieldCheck} />
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
 <div className="space-y-2">
 <label className="text-sm font-medium text-slate-700 ml-1">Specialty</label>
 <input 
 name="specialty"
 value={formData.specialty}
 onChange={handleChange}
 className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-slate-900"
 />
 </div>
 <div className="space-y-2">
 <label className="text-sm font-medium text-slate-700 ml-1">License Number</label>
 <input 
 name="license_number"
 value={formData.license_number}
 onChange={handleChange}
 className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-slate-900"
 />
 </div>
 <div className="space-y-2">
 <label className="text-sm font-medium text-slate-700 ml-1">Hospital Name</label>
 <input 
 name="hospital_name"
 value={formData.hospital_name}
 onChange={handleChange}
 className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-slate-900"
 />
 </div>
 <div className="space-y-2">
 <label className="text-sm font-medium text-slate-700 ml-1">Experience (Years)</label>
 <input 
 name="experience_years"
 type="number"
 value={formData.experience_years}
 onChange={handleChange}
 className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-slate-900"
 />
 </div>
 <div className="md:col-span-2 space-y-2">
 <label className="text-sm font-medium text-slate-700 ml-1">Hospital Address</label>
 <input 
 name="hospital_address"
 value={formData.hospital_address}
 onChange={handleChange}
 className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-slate-900"
 />
 </div>
 </div>
 </Card>
 ) : (
 <Card className="p-8">
 <CardHeader title="Health Metrics" icon={Heart} />
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
 <div className="space-y-2">
 <label className="text-sm font-medium text-slate-700 ml-1">Age</label>
 <div className="relative">
 <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
 <input 
 name="age"
 type="number"
 value={formData.age}
 onChange={handleChange}
 className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-100 bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-slate-900"
 />
 </div>
 </div>
 <div className="space-y-2">
 <label className="text-sm font-medium text-slate-700 ml-1">Weight (kg)</label>
 <div className="relative">
 <Scale className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
 <input 
 name="weight_kg"
 type="number"
 step="0.1"
 value={formData.weight_kg}
 onChange={handleChange}
 className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-100 bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-slate-900"
 />
 </div>
 </div>
 <div className="space-y-2">
 <label className="text-sm font-medium text-slate-700 ml-1">Height (cm)</label>
 <div className="relative">
 <Ruler className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
 <input 
 name="height_cm"
 type="number"
 value={formData.height_cm}
 onChange={handleChange}
 className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-100 bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-slate-900"
 />
 </div>
 </div>
 <div className="space-y-2">
 <label className="text-sm font-medium text-slate-700 ml-1">Blood Group</label>
 <select 
 name="blood_group"
 value={formData.blood_group}
 onChange={handleChange}
 className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-slate-900"
 >
 <option value="">Select</option>
 {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
 <option key={bg} value={bg}>{bg}</option>
 ))}
 </select>
 </div>
 </div>
 </Card>
 )}


 <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-6 rounded-xl border border-slate-100 gap-4">
 <div className="flex gap-4">
 <Button 
 type="button" 
 variant="outline" 
 className="text-slate-500 border-slate-100 hover:bg-slate-50 gap-2 h-12 px-6 rounded-xl"
 onClick={() => dispatch(logout())}
 >
 <LogOut className="w-4 h-4" />
 Logout
 </Button>
 <Button 
 type="button" 
 variant="outline" 
 className="text-red-500 border-red-100 hover:bg-red-50 gap-2 h-12 px-6 rounded-xl"
 onClick={handleDeleteAccount}
 disabled={loading}
 >
 <Trash2 className="w-4 h-4" />
 Delete Account
 </Button>
 </div>
 <Button 
 type="submit" 
 className="gap-2 h-12 px-10 rounded-xl shadow-md w-full sm:w-auto"
 disabled={loading}
 >
 {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
 Save Changes
 </Button>
 </div>

 </form>
 </div>
 );
};

export default Settings;




