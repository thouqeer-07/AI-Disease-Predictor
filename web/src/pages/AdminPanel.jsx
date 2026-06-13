import React from 'react';
import { Users, ShieldCheck, BarChart3, AlertTriangle, UserPlus, Database } from 'lucide-react';
import { Card, CardHeader } from '../components/Card';
import { Button } from '../components/Button';

const AdminPanel = () => {
 return (
 <div className="p-8 max-w-7xl mx-auto">
 <div className="mb-10">
 <h1 className="text-3xl font-bold text-slate-900">Admin Control Center</h1>
 <p className="text-slate-500">Manage users, approve doctors, and monitor platform analytics.</p>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
 <Card className="bg-blue-50 border-blue-100">
 <div className="flex justify-between items-center">
 <Users className="w-8 h-8 text-blue-600" />
 <span className="text-2xl font-bold text-blue-900">1,240</span>
 </div>
 <p className="text-blue-700 font-medium mt-2">Total Patients</p>
 </Card>
 <Card className="bg-emerald-50 border-emerald-100">
 <div className="flex justify-between items-center">
 <ShieldCheck className="w-8 h-8 text-emerald-600" />
 <span className="text-2xl font-bold text-emerald-900">85</span>
 </div>
 <p className="text-emerald-700 font-medium mt-2">Verified Doctors</p>
 </Card>
 <Card className="bg-orange-50 border-orange-100">
 <div className="flex justify-between items-center">
 <AlertTriangle className="w-8 h-8 text-orange-600" />
 <span className="text-2xl font-bold text-orange-900">12</span>
 </div>
 <p className="text-orange-700 font-medium mt-2">Pending Approvals</p>
 </Card>
 <Card className="bg-indigo-50 border-indigo-100">
 <div className="flex justify-between items-center">
 <Database className="w-8 h-8 text-indigo-600" />
 <span className="text-2xl font-bold text-indigo-900">2.4 TB</span>
 </div>
 <p className="text-indigo-700 font-medium mt-2">System Storage</p>
 </Card>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
 <Card>
 <CardHeader title="Doctor Verification Queue" icon={UserPlus} />
 <div className="space-y-4">
 {[1, 2].map(i => (
 <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-full bg-slate-200" />
 <div>
 <h4 className="font-bold">Dr. Robert Fox</h4>
 <p className="text-xs text-slate-500">ID: MC-29384 • Cardiology</p>
 </div>
 </div>
 <div className="flex gap-2">
 <Button variant="outline" size="sm" className="text-xs">Reject</Button>
 <Button size="sm" className="text-xs">Approve</Button>
 </div>
 </div>
 ))}
 </div>
 </Card>

 <Card>
 <CardHeader title="AI Usage Stats" icon={BarChart3} />
 <div className="h-48 flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
 <p className="text-slate-400">AI Traffic Visualization Placeholder</p>
 </div>
 </Card>
 </div>
 </div>
 );
};

export default AdminPanel;




