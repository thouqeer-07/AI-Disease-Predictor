import React, { useState, useEffect, useCallback } from 'react';
import { 
 Users, 
 Calendar, 
 Clock, 
 FileText, 
 CheckCircle2, 
 XCircle, 
 Search,
 MessageSquare,
 TrendingUp,
 UserCheck,
 Plus
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { Card, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';
import ScheduleAppointmentModal from '../components/ScheduleAppointmentModal';
import ViewScheduleModal from '../components/ViewScheduleModal';

const DoctorDashboard = () => {
 const { user } = useSelector((state) => state.auth);
 const [loading, setLoading] = useState(true);
 const [stats, setStats] = useState({
 totalPatients: 0,
 todayAppointments: 0,
 pendingReviews: 0,
 completedConsults: 0
 });
 const [appointments, setAppointments] = useState([]);
 const [recentPatients, setRecentPatients] = useState([]);
 const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
 const [selectedAppt, setSelectedAppt] = useState(null);
 const [viewScheduleOpen, setViewScheduleOpen] = useState(false);

 const fetchDoctorData = useCallback(async () => {
 if (!user) return;
 setLoading(true);
 try {
 // 1. Fetch Appointments for this doctor
 const { data: appts } = await supabase
 .from('appointments')
 .select('*, profiles:user_id(full_name)')
 .eq('doctor_id', user.id)
 .order('appointment_date', { ascending: true });

 const currentAppts = appts || [];
 setAppointments(currentAppts);

 // 2. Fetch Doctor's actual profile
 const { data: doctorProfile } = await supabase
 .from('doctors')
 .select('id')
 .eq('id', user.id)
 .single();

 // 3. Calculate Real Stats (with metadata fallback for newly registered docs)
 const today = new Date().toISOString().split('T')[0];
 const todayAppts = currentAppts.filter(a => a.appointment_date?.startsWith(today));
 
 // Get unique patients count
 const uniquePatients = new Set(currentAppts.map(a => a.user_id)).size;

 setStats({
 totalPatients: uniquePatients || 0,
 todayAppointments: todayAppts.length,
 pendingReviews: currentAppts.filter(a => a.status === 'pending' || a.status === 'upcoming').length,
 completedConsults: currentAppts.filter(a => a.status === 'completed').length
 });


 // 4. Deriving Recent Patients from real appointments
 setRecentPatients(
 currentAppts.slice(0, 3).map(a => ({
 id: a.id,
 name: a.profiles?.full_name || a.patient_name || 'Patient',
 lastVisit: new Date(a.appointment_date).toLocaleDateString(),
 status: a.status || 'Active'
 }))
 );


 } catch (error) {
 console.error('Error fetching doctor data:', error);
 } finally {
 setLoading(false);
 }
 }, [user]);

 useEffect(() => {
 fetchDoctorData();
 }, [fetchDoctorData]);

 const updateStatus = async (id, status) => {
 try {
 const { error } = await supabase
 .from('appointments')
 .update({ status })
 .eq('id', id);

 if (!error) {
 fetchDoctorData();
 }
 } catch (err) {
 console.error('Error updating status:', err);
 }
 };

 const scheduleAppointment = async (id, dateStr) => {
 try {
 const { error } = await supabase
 .from('appointments')
 .update({ 
 status: 'accepted',
 appointment_date: dateStr
 })
 .eq('id', id);

 if (!error) {
 fetchDoctorData();
 }
 } catch (err) {
 console.error('Error scheduling appointment:', err);
 }
 };

 const handleAcceptClick = (appt) => {
 setSelectedAppt(appt);
 setScheduleModalOpen(true);
 };

 const pendingAppointments = appointments.filter(a => a.status === 'pending');

 return (
 <div className="p-8 max-w-7xl mx-auto space-y-8">
 {/* Header */}
 <div className="flex justify-between items-center">
 <div>
 <h1 className="text-3xl font-bold text-slate-900">Doctor Portal</h1>
 <p className="text-slate-500">Welcome, Dr. {user?.user_metadata?.full_name}. Here are your patients today.</p>
 </div>
 <div className="flex gap-3">
 <Button variant="outline" className="rounded-xl gap-2 h-12 px-6" onClick={() => setViewScheduleOpen(true)}>
 <Calendar className="w-4 h-4" />
 Schedule
 </Button>
 </div>
 </div>

 {/* Stats Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 <StatCard title="Total Patients" value={stats.totalPatients} icon={Users} color="bg-blue-50 text-blue-600" />
 <StatCard title="Today's Appts" value={stats.todayAppointments} icon={Clock} color="bg-emerald-50 text-emerald-600" />
 <StatCard title="Pending Reports" value={stats.pendingReviews} icon={FileText} color="bg-orange-50 text-orange-600" />

 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 {/* Appointments List */}
 <div className="lg:col-span-2 space-y-6">
 <Card className="p-0 overflow-hidden">
 <div className="p-6 border-b border-slate-100 flex justify-between items-center">
 <h3 className="text-lg font-bold">Upcoming Appointments</h3>
 <Button variant="ghost" className="text-sm text-primary">View All</Button>
 </div>
 <div className="divide-y divide-slate-100 ">
 {pendingAppointments.length > 0 ? pendingAppointments.map((appt) => (
 <div key={appt.id} className="p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-all">
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-400">
 {(appt.profiles?.full_name || appt.patient_name || 'P').charAt(0)}
 </div>
 <div>
 <p className="font-bold">{appt.profiles?.full_name || appt.patient_name || 'Anonymous Patient'}</p>
 <p className="text-sm text-slate-500">{new Date(appt.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {appt.status}</p>
 </div>
 </div>
 <div className="flex gap-2">
 {appt.status === 'pending' ? (
 <>
 <Button 
 variant="outline" 
 size="sm" 
 className="rounded-xl border-emerald-100 text-emerald-600 hover:bg-emerald-50"
 onClick={() => handleAcceptClick(appt)}
 >
 <CheckCircle2 className="w-4 h-4" />
 </Button>
 <Button 
 variant="outline" 
 size="sm" 
 className="rounded-xl border-red-100 text-red-600 hover:bg-red-50"
 onClick={() => updateStatus(appt.id, 'rejected')}
 >
 <XCircle className="w-4 h-4" />
 </Button>
 </>
 ) : (
 <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
 appt.status === 'completed' ? 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30' :
 appt.status === 'rejected' ? 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30' :
 appt.status === 'accepted' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30' :
 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
 }`}>
 {appt.status}
 </span>
 )}
 </div>
 </div>
 )) : (
 <div className="p-10 text-center text-slate-400">
 <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
 <p>No pending appointment requests.</p>
 </div>
 )}
 </div>
 </Card>
 </div>

 {/* Recent Patients Sidebar */}
 <div className="space-y-6">
 <Card>
 <CardHeader title="Recent Patients" icon={UserCheck} />
 <div className="space-y-4">
 {recentPatients.map(p => (
 <div key={p.id} className="p-4 rounded-xl bg-slate-50 border border-transparent hover:border-primary/20 transition-all cursor-pointer">
 <div className="flex justify-between items-start mb-1">
 <p className="font-bold text-sm">{p.name}</p>
 <span className={`text-[10px] px-2 py-0.5 rounded-full ${
 p.status === 'Critical' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
 }`}>
 {p.status}
 </span>
 </div>
 <p className="text-xs text-slate-500">Last visit: {p.lastVisit}</p>
 </div>
 ))}
 </div>
 <Button variant="outline" className="w-full mt-6 rounded-xl border-slate-200">
 View Patient Directory
 </Button>
 </Card>


 </div>
 </div>
 <ScheduleAppointmentModal
 isOpen={scheduleModalOpen}
 onClose={() => {
 setScheduleModalOpen(false);
 setSelectedAppt(null);
 }}
 appointment={selectedAppt}
 onConfirm={scheduleAppointment}
 />
 <ViewScheduleModal
    isOpen={viewScheduleOpen}
    onClose={() => setViewScheduleOpen(false)}
    doctorId={user?.id}
  />
 </div>
 );
};

const StatCard = ({ title, value, icon: Icon, color }) => (
 <Card className="flex flex-col gap-2">
 <div className={`p-2 w-fit rounded-xl ${color}`}>
 <Icon className="w-5 h-5" />
 </div>
 <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">{title}</p>
 <p className="text-2xl font-bold text-slate-900">{value}</p>
 </Card>
);

export default DoctorDashboard;




