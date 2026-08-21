import React, { useState, useEffect } from 'react';
import { 
  Users, ShieldCheck, BarChart3, AlertTriangle, UserPlus, 
  Database, Eye, FileText, CheckCircle, XCircle, Clock, Check, X,
  Activity, Search, Trash2
} from 'lucide-react';
import { Card, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';
import { fetchApiWithFallback } from '../lib/api';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [applications, setApplications] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  
  const [selectedApp, setSelectedApp] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  
  // Stats state
  const [stats, setStats] = useState({
    patients: 0,
    doctors: 0,
    pending: 0
  });

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Patients directly from Supabase DB
      const { data: patData } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'patient')
      // 2. Fetch Verified Doctors directly from Supabase DB
      const { data: docData } = await supabase
        .from('doctors')
        .select('*')
        .order('created_at', { ascending: false });

      // 3. Fetch applications directly from Supabase inquiries table
      const { data: inqs } = await supabase
        .from('inquiries')
        .select('*')
        .eq('subject', 'doctor_application')
        .order('created_at', { ascending: false });

      const parsedApps = (inqs || []).map(inq => {
        let payload = {};
        try { payload = JSON.parse(inq.message); } catch (e) {}
        const dobVal = payload.dob || payload.dateOfBirth || payload.dob_string || 'Not Provided';
        return { id: inq.id, status: inq.status, created_at: inq.created_at, ...payload, dob: dobVal };
      }).filter(app => app.fullName && app.email);

      // Enrich doctors with full details from profiles and inquiry applications
      const { data: profDocs } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'doctor');

      let verifiedDocs = (docData && docData.length > 0) ? docData : (profDocs || []);

      verifiedDocs = verifiedDocs.map(doc => {
        const matchingProf = (profDocs || []).find(p => p.id === doc.id || (p.email && doc.email && p.email.toLowerCase() === doc.email.toLowerCase()));
        const matchingInq = parsedApps.find(inq => {
          if (inq.email && doc.email && inq.email.toLowerCase() === doc.email.toLowerCase()) return true;
          if (inq.fullName && doc.name && inq.fullName.toLowerCase() === doc.name.toLowerCase()) return true;
          return false;
        });

        // DOB
        let foundDob = doc.dob || doc.dateOfBirth || null;
        if (!foundDob && matchingProf?.medical_history) {
          try {
            const parsed = typeof matchingProf.medical_history === 'string' ? JSON.parse(matchingProf.medical_history) : matchingProf.medical_history;
            if (parsed?.dob) foundDob = parsed.dob;
          } catch (e) {}
        }
        if (!foundDob && matchingInq?.dob && matchingInq.dob !== 'Not Provided') {
          foundDob = matchingInq.dob;
        }

        // Bio
        let foundBio = doc.bio || matchingProf?.bio || null;
        if (!foundBio && matchingProf?.medical_history) {
          try {
            const parsed = typeof matchingProf.medical_history === 'string' ? JSON.parse(matchingProf.medical_history) : matchingProf.medical_history;
            if (parsed?.bio) foundBio = parsed.bio;
          } catch (e) {}
        }
        if (!foundBio && matchingInq?.bio) foundBio = matchingInq.bio;

        // Education
        let foundEdu = doc.education || matchingProf?.education || null;
        if (!foundEdu && matchingProf?.medical_history) {
          try {
            const parsed = typeof matchingProf.medical_history === 'string' ? JSON.parse(matchingProf.medical_history) : matchingProf.medical_history;
            if (parsed?.education) foundEdu = parsed.education;
          } catch (e) {}
        }
        if (!foundEdu && matchingInq?.education) foundEdu = matchingInq.education;

        if (typeof foundEdu === 'string') {
          try { foundEdu = JSON.parse(foundEdu); } catch (e) {}
        }

        // Document Photo
        const docPhoto = doc.documentPhoto || doc.licenseImage || matchingInq?.documentPhoto || null;

        return {
          ...doc,
          name: doc.name || doc.full_name || matchingProf?.full_name || matchingInq?.fullName || 'Doctor',
          email: doc.email || matchingProf?.email || matchingInq?.email || 'N/A',
          phone_number: doc.phone_number || doc.phone || matchingProf?.phone_number || matchingInq?.phoneNumber || 'N/A',
          dob: foundDob || 'Not Specified',
          bio: foundBio || 'No biography provided.',
          education: foundEdu || 'N/A',
          documentPhoto: docPhoto,
          license_number: doc.license_number || matchingInq?.licenseNumber || 'N/A',
          hospital_name: doc.hospital_name || matchingInq?.hospitalName || 'N/A',
          hospital_address: doc.hospital_address || matchingInq?.hospitalAddress || 'N/A',
          specialty: doc.specialty || matchingInq?.specialty || 'General Physician'
        };
      });

      setApplications(parsedApps);
      setPatients(patData || []);
      setDoctors(verifiedDocs);

      const pendingCount = parsedApps.filter(app => app.status === 'new').length;
      setStats({
        patients: patData?.length || 0,
        doctors: verifiedDocs.length,
        pending: pendingCount
      });
    } catch (err) {
      console.error('Error fetching admin data from Supabase:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();

    const adminChannel = supabase
      .channel('realtime:admin_panel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inquiries' }, () => {
        fetchAllData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'doctors' }, () => {
        fetchAllData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchAllData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(adminChannel);
    };
  }, []);

  const handleApprove = async (id) => {
    if (!window.confirm('Are you sure you want to approve this doctor application?')) return;
    setActionLoading(id);
    try {
      const data = await fetchApiWithFallback('/admin/approve-doctor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });

      alert(data.message || 'Doctor application approved successfully.');
      fetchAllData();
    } catch (err) {
      console.warn('Backend API approval failed, trying direct database update:', err);
      try {
        const { error } = await supabase
          .from('inquiries')
          .update({ status: 'read' })
          .eq('id', id);
        if (error) throw error;

        // Insert doctor into doctors table
        const targetApp = doctorApplications.find(a => a.id === id);
        if (targetApp) {
          await supabase.from('doctors').insert([{
            name: targetApp.fullName || targetApp.name || 'Doctor',
            phone_number: targetApp.phoneNumber || '',
            specialty: targetApp.specialty || 'General Physician',
            license_number: targetApp.licenseNumber || '',
            hospital_name: targetApp.hospitalName || 'Clinic',
            hospital_address: targetApp.hospitalAddress || '',
            is_verified: true
          }]);
        }

        alert('Doctor application approved successfully.');
        fetchAllData();
      } catch (subErr) {
        alert('Approval failed: ' + subErr.message);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Are you sure you want to reject this doctor registration request?')) return;
    setActionLoading(id);
    try {
      const data = await fetchApiWithFallback('/admin/reject-doctor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });

      alert(data.message || 'Doctor application rejected.');
      fetchAllData();
    } catch (err) {
      console.warn('Backend API rejection failed, trying direct database update:', err);
      try {
        const { error } = await supabase
          .from('inquiries')
          .update({ status: 'urgent' })
          .eq('id', id);
        if (error) throw error;
        alert('Doctor application rejected.');
        fetchAllData();
      } catch (subErr) {
        alert('Rejection failed: ' + subErr.message);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteApplication = async (id) => {
    if (!window.confirm('Are you sure you want to remove this record from the registry?')) return;
    setActionLoading(id);
    try {
      const data = await fetchApiWithFallback('/admin/delete-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });

      alert(data.message || 'Record removed successfully.');
      fetchAllData();
    } catch (err) {
      console.warn('Backend API delete failed, trying direct database delete:', err);
      try {
        const { error } = await supabase
          .from('inquiries')
          .delete()
          .eq('id', id);

        if (error) throw error;
        alert('Record removed successfully.');
        fetchAllData();
      } catch (subErr) {
        alert('Error deleting application: ' + subErr.message);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteDoctor = async (id, doctorName) => {
    if (!window.confirm(`Are you sure you want to permanently delete Dr. ${doctorName || ''}?`)) return;
    setActionLoading(id);
    try {
      const data = await fetchApiWithFallback('/admin/delete-doctor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });

      alert(data.message || `Dr. ${doctorName || ''} deleted successfully.`);
      fetchAllData();
    } catch (err) {
      console.warn('Backend API delete doctor failed, trying direct database delete:', err);
      try {
        const targetDoc = doctors.find(d => d.id === id);
        const targetEmail = targetDoc?.email || null;

        await supabase.from('doctors').delete().eq('id', id);
        if (targetEmail) await supabase.from('doctors').delete().ilike('email', targetEmail);

        await supabase.from('profiles').delete().eq('id', id);
        if (targetEmail) await supabase.from('profiles').delete().ilike('email', targetEmail);

        if (targetEmail) {
          const { data: inqs } = await supabase.from('inquiries').select('*').eq('subject', 'doctor_application');
          for (const inq of (inqs || [])) {
            try {
              const payload = JSON.parse(inq.message);
              if (payload.email && payload.email.toLowerCase() === targetEmail.toLowerCase()) {
                await supabase.from('inquiries').delete().eq('id', inq.id);
              }
            } catch (e) {}
          }
        }

        alert(`Dr. ${doctorName || ''} deleted successfully.`);
        fetchAllData();
      } catch (subErr) {
        alert('Error deleting doctor: ' + subErr.message);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeletePatient = async (id, patientName) => {
    if (!window.confirm(`Are you sure you want to permanently delete patient ${patientName || ''}?`)) return;
    setActionLoading(id);
    try {
      const data = await fetchApiWithFallback('/admin/delete-patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });

      alert(data.message || `Patient ${patientName || ''} deleted successfully.`);
      fetchAllData();
    } catch (err) {
      console.warn('Backend API delete patient failed, trying direct database delete:', err);
      try {
        const targetPat = patients.find(p => p.id === id);
        const cleanEmail = targetPat?.email ? targetPat.email.trim().toLowerCase() : null;

        await supabase.from('profiles').delete().eq('id', id);
        if (cleanEmail) await supabase.from('profiles').delete().ilike('email', cleanEmail);

        await supabase.from('emergency_contacts').delete().eq('user_id', id);
        await supabase.from('sos_logs').delete().eq('user_id', id);
        await supabase.from('inquiries').delete().eq('patient_id', id);

        if (cleanEmail) {
          const { data: inqs } = await supabase.from('inquiries').select('*');
          for (const inq of (inqs || [])) {
            try {
              const payload = JSON.parse(inq.message);
              if (payload.email && payload.email.trim().toLowerCase() === cleanEmail) {
                await supabase.from('inquiries').delete().eq('id', inq.id);
              }
            } catch (e) {}
          }
        }

        alert(`Patient ${patientName || ''} and all associated data deleted successfully.`);
        fetchAllData();
      } catch (subErr) {
        alert('Error deleting patient: ' + subErr.message);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const pendingApps = applications.filter(app => app.status === 'new' && app.fullName);
  const pastApps = applications.filter(app => app.status !== 'new' && app.fullName);

  // Renders the tab navigation
  const renderTabs = () => (
    <div className="flex space-x-1 bg-slate-100/50 p-1 rounded-xl mb-8 border border-slate-200/50 overflow-x-auto">
      {['overview', 'patients', 'doctors', 'approvals'].map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`flex-1 px-4 py-2.5 text-sm font-semibold capitalize rounded-lg transition-all whitespace-nowrap ${
            activeTab === tab
              ? 'bg-white text-primary shadow-sm ring-1 ring-slate-200'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50/50'
          }`}
        >
          {tab}
          {tab === 'approvals' && stats.pending > 0 && (
            <span className="ml-2 inline-flex items-center justify-center bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full">
              {stats.pending}
            </span>
          )}
        </button>
      ))}
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Admin Control Center</h1>
          <p className="text-slate-500 mt-1">Manage users, approve doctors, and monitor platform analytics.</p>
        </div>
        <Button onClick={fetchAllData} variant="outline" size="sm" className="shrink-0 bg-white shadow-sm">
          Refresh Data
        </Button>
      </div>

      {renderTabs()}

      {loading ? (
        <div className="flex items-center justify-center p-20">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100 shadow-sm">
                  <div className="flex justify-between items-center">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><Users className="w-6 h-6" /></div>
                    <span className="text-3xl font-black text-slate-800 tracking-tight">{stats.patients}</span>
                  </div>
                  <p className="text-slate-500 font-medium mt-4">Total Registered Patients</p>
                </Card>
                <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100 shadow-sm">
                  <div className="flex justify-between items-center">
                    <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl"><ShieldCheck className="w-6 h-6" /></div>
                    <span className="text-3xl font-black text-slate-800 tracking-tight">{stats.doctors}</span>
                  </div>
                  <p className="text-slate-500 font-medium mt-4">Verified Professional Doctors</p>
                </Card>
                <Card className="bg-gradient-to-br from-orange-50 to-white border-orange-100 shadow-sm">
                  <div className="flex justify-between items-center">
                    <div className="p-3 bg-orange-100 text-orange-600 rounded-xl"><AlertTriangle className="w-6 h-6" /></div>
                    <span className="text-3xl font-black text-slate-800 tracking-tight">{stats.pending}</span>
                  </div>
                  <p className="text-slate-500 font-medium mt-4">Pending Doctor Approvals</p>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* System Info */}
                <Card className="shadow-sm border-slate-200">
                  <CardHeader title="System Information" icon={BarChart3} />
                  <div className="p-5 rounded-xl bg-slate-50/50 border border-slate-100 text-sm space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                      <span className="font-medium text-slate-500">Platform Database:</span>
                      <span className="font-bold text-slate-700 bg-white px-3 py-1 rounded-md shadow-sm border border-slate-200">Supabase</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                      <span className="font-medium text-slate-500">SMTP Server Status:</span>
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-md border border-emerald-100 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Active
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-slate-500">Control Center Level:</span>
                      <span className="font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-md border border-indigo-100">Root Admin</span>
                    </div>
                  </div>
                </Card>

                {/* Past Actions Registry */}
                <Card className="shadow-sm border-slate-200">
                  <CardHeader title="Processed Requests Registry" icon={Clock} />
                  {pastApps.length === 0 ? (
                    <div className="text-center p-8 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-slate-400 font-medium">No processed records found.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                      {pastApps.map(app => (
                        <div key={app.id} className="flex justify-between items-center p-3.5 rounded-xl border border-slate-100 bg-white text-sm hover:shadow-sm transition-shadow">
                          <div>
                            <span className="font-bold text-slate-800 block">{app.fullName}</span>
                            <span className="text-slate-500 text-xs">{app.specialty} • {app.email}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {app.status === 'read' ? (
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold text-xs flex items-center gap-1.5">
                                <Check className="w-3.5 h-3.5" /> Approved
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 border border-red-100 font-bold text-xs flex items-center gap-1.5">
                                <X className="w-3.5 h-3.5" /> Rejected
                              </span>
                            )}
                            <button
                              onClick={() => handleDeleteApplication(app.id)}
                              disabled={actionLoading === app.id}
                              title="Delete Record"
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'patients' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card className="shadow-sm border-slate-200 overflow-hidden">
                <CardHeader title="Registered Patients Directory" icon={Users} />
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 border-y border-slate-100 text-slate-500 font-medium">
                      <tr>
                        <th className="px-6 py-3">Patient Name</th>
                        <th className="px-6 py-3">Contact Email</th>
                        <th className="px-6 py-3">Phone Number</th>
                        <th className="px-6 py-3">Joined Date</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {patients.map(pat => (
                        <tr key={pat.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-slate-800">{pat.full_name || 'N/A'}</td>
                          <td className="px-6 py-4 text-slate-600">{pat.email}</td>
                          <td className="px-6 py-4 text-slate-600">{pat.phone_number || 'N/A'}</td>
                          <td className="px-6 py-4 text-slate-500">{new Date(pat.created_at).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => setSelectedPatient(pat)}>
                              View Details
                            </Button>
                            <button
                              onClick={() => handleDeletePatient(pat.id, pat.full_name)}
                              disabled={actionLoading === pat.id}
                              title="Delete Patient"
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-slate-200"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {patients.length === 0 && (
                        <tr>
                          <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                            No patients found in the database.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'doctors' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card className="shadow-sm border-slate-200 overflow-hidden">
                <CardHeader title="Verified Doctors Directory" icon={ShieldCheck} />
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 border-y border-slate-100 text-slate-500 font-medium">
                      <tr>
                        <th className="px-6 py-3">Doctor Name</th>
                        <th className="px-6 py-3">Specialty</th>
                        <th className="px-6 py-3">License Number</th>
                        <th className="px-6 py-3">Hospital</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {doctors.map(doc => (
                        <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-slate-800">Dr. {doc.name || doc.full_name || 'N/A'}</td>
                          <td className="px-6 py-4 text-slate-600">
                            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md font-medium text-xs border border-blue-100">{doc.specialty}</span>
                          </td>
                          <td className="px-6 py-4 text-slate-600 font-mono text-xs">{doc.license_number}</td>
                          <td className="px-6 py-4 text-slate-600">{doc.hospital_name}</td>
                          <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => setSelectedDoctor(doc)}>
                              View Details
                            </Button>
                            <button
                              onClick={() => handleDeleteDoctor(doc.id, doc.name || doc.full_name)}
                              disabled={actionLoading === doc.id}
                              title="Delete Doctor"
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-slate-200"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {doctors.length === 0 && (
                        <tr>
                          <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                            No verified doctors found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'approvals' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card className="shadow-sm border-slate-200">
                <CardHeader title="Doctor Verification Queue" icon={UserPlus} />
                
                {pendingApps.length === 0 ? (
                  <div className="text-center py-16 bg-slate-50 rounded-xl border border-slate-100 m-4">
                    <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-4 border border-slate-200">
                      <ShieldCheck className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">Queue is Empty</h3>
                    <p className="text-slate-500">All verification queues cleared! No pending doctor requests.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingApps.map(app => (
                      <div key={app.id} className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex gap-5">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 flex items-center justify-center text-primary font-black text-xl shrink-0 shadow-sm">
                            {app.fullName ? app.fullName.charAt(0) : 'D'}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-lg">Dr. {app.fullName}</h4>
                            <div className="flex flex-wrap items-center gap-2 mt-1 mb-2">
                              <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md font-semibold text-xs border border-indigo-100">{app.specialty}</span>
                              <span className="text-sm text-slate-500 font-medium">License: <span className="font-mono text-slate-700">{app.licenseNumber}</span></span>
                            </div>
                            <p className="text-sm text-slate-600 font-medium flex items-center gap-1.5">
                              <Activity className="w-4 h-4 text-slate-400" />
                              {app.hospitalName} • DOB: {app.dob || app.dateOfBirth || 'N/A'}
                            </p>
                            <p className="text-xs text-slate-400 mt-2 flex gap-4">
                              <span>✉️ {app.email}</span>
                              <span>📞 {app.phoneNumber}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex sm:flex-col gap-2 shrink-0">
                          {app.documentPhoto && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-sm flex items-center gap-2 justify-center w-full shadow-sm bg-slate-50 border-slate-200"
                              onClick={() => setSelectedApp(app)}
                            >
                              <Eye className="w-4 h-4 text-slate-500" /> View Documents
                            </Button>
                          )}
                          <div className="flex gap-2 w-full mt-1">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-sm border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 w-full shadow-sm"
                              onClick={() => handleReject(app.id)}
                              disabled={actionLoading === app.id}
                            >
                              Reject
                            </Button>
                            <Button 
                              size="sm" 
                              className="text-sm w-full shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => handleApprove(app.id)}
                              disabled={actionLoading === app.id}
                            >
                              Approve
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}
        </>
      )}

      {/* Patient Details Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-xl text-slate-900">Patient Details</h3>
              <button 
                onClick={() => setSelectedPatient(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-lg transition-colors"
              >
                &times;
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-2xl font-bold">
                  {selectedPatient.full_name ? selectedPatient.full_name.charAt(0) : 'P'}
                </div>
                <div>
                  <h4 className="text-xl font-bold text-slate-800">{selectedPatient.full_name}</h4>
                  <p className="text-slate-500">{selectedPatient.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Phone</p>
                  <p className="font-semibold text-slate-800">{selectedPatient.phone_number || 'N/A'}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Gender</p>
                  <p className="font-semibold text-slate-800 capitalize">{selectedPatient.gender || 'N/A'}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Age</p>
                  <p className="font-semibold text-slate-800">{selectedPatient.age || 'N/A'}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Blood Group</p>
                  <p className="font-semibold text-slate-800">{selectedPatient.blood_group || 'N/A'}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Weight</p>
                  <p className="font-semibold text-slate-800">{selectedPatient.weight_kg ? `${selectedPatient.weight_kg} kg` : 'N/A'}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Height</p>
                  <p className="font-semibold text-slate-800">{selectedPatient.height_cm ? `${selectedPatient.height_cm} cm` : 'N/A'}</p>
                </div>
              </div>
              
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Medical History & Notes</p>
                {(() => {
                  const history = selectedPatient.medical_history;
                  if (!history) {
                    return <p className="text-sm text-slate-400 italic">No medical history recorded.</p>;
                  }

                  let parsed = null;
                  if (typeof history === 'object' && history !== null) {
                    parsed = history;
                  } else if (typeof history === 'string') {
                    const trimmed = history.trim();
                    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                      try { parsed = JSON.parse(trimmed); } catch (e) {}
                    }
                  }

                  if (parsed && typeof parsed === 'object') {
                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                        {parsed.dob && (
                          <div className="p-3 rounded-lg bg-white border border-slate-200">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date of Birth</p>
                            <p className="text-sm font-semibold text-slate-800 mt-0.5">{parsed.dob}</p>
                          </div>
                        )}
                        {parsed.diseases && (
                          <div className="p-3 rounded-lg bg-white border border-slate-200">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Medical Conditions / Diseases</p>
                            <p className="text-sm font-semibold text-slate-800 mt-0.5">{parsed.diseases}</p>
                          </div>
                        )}
                        {parsed.drugs && (
                          <div className="p-3 rounded-lg bg-white border border-slate-200">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Medications / Drugs</p>
                            <p className="text-sm font-semibold text-slate-800 mt-0.5">{parsed.drugs}</p>
                          </div>
                        )}
                        {Object.keys(parsed).map(key => {
                          if (['dob', 'diseases', 'drugs'].includes(key) || !parsed[key]) return null;
                          const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                          return (
                            <div key={key} className="p-3 rounded-lg bg-white border border-slate-200">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                              <p className="text-sm font-semibold text-slate-800 mt-0.5">{parsed[key]}</p>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }

                  return <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{history}</p>;
                })()}
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 flex justify-end">
              <Button onClick={() => setSelectedPatient(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Doctor Details Modal */}
      {selectedDoctor && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-xl text-slate-900">Doctor Profile</h3>
              <button 
                onClick={() => setSelectedDoctor(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-lg transition-colors"
              >
                &times;
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl font-bold">
                  {selectedDoctor.name ? selectedDoctor.name.charAt(0) : (selectedDoctor.full_name ? selectedDoctor.full_name.charAt(0) : 'D')}
                </div>
                <div>
                  <h4 className="text-xl font-bold text-slate-800">Dr. {selectedDoctor.name || selectedDoctor.full_name}</h4>
                  <p className="text-emerald-600 font-semibold text-sm">{selectedDoctor.specialty}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">License No.</p>
                  <p className="font-semibold text-slate-800 font-mono text-sm">{selectedDoctor.license_number || 'N/A'}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Date of Birth</p>
                  <p className="font-semibold text-slate-800">{selectedDoctor.dob || 'N/A'}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Email Address</p>
                  <p className="font-semibold text-slate-800">{selectedDoctor.email || 'N/A'}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Phone Number</p>
                  <p className="font-semibold text-slate-800">{selectedDoctor.phone_number || selectedDoctor.phoneNumber || 'N/A'}</p>
                </div>
                <div className="col-span-2 p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Hospital Name</p>
                  <p className="font-semibold text-slate-800">{selectedDoctor.hospital_name || 'N/A'}</p>
                </div>
                <div className="col-span-2 p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Hospital Address</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{selectedDoctor.hospital_address || 'N/A'}</p>
                </div>
                <div className="col-span-2 p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Education Details</p>
                  {typeof selectedDoctor.education === 'object' && selectedDoctor.education !== null ? (
                    <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                      <div className="col-span-2 sm:col-span-1">
                        <p className="text-[10px] uppercase font-bold text-slate-400">University / College</p>
                        <p className="text-sm font-semibold text-slate-800">{selectedDoctor.education.universityName || selectedDoctor.education.university_name || 'N/A'}</p>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Location</p>
                        <p className="text-sm font-semibold text-slate-800">{selectedDoctor.education.collegeLocation || selectedDoctor.education.college_location || 'N/A'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Duration</p>
                        <p className="text-sm font-semibold text-slate-800">{selectedDoctor.education.startYear || selectedDoctor.education.start_year} - {selectedDoctor.education.endYear || selectedDoctor.education.end_year} ({selectedDoctor.education.duration} Years)</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedDoctor.education || 'N/A'}</p>
                  )}
                </div>
                <div className="col-span-2 p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Bio / About</p>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedDoctor.bio || 'No biography provided.'}</p>
                </div>
                
                <div className="col-span-2 p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Application Date</p>
                  <p className="font-semibold text-slate-800">{selectedDoctor.applicationDate ? new Date(selectedDoctor.applicationDate).toLocaleDateString() : 'N/A'}</p>
                </div>

                {selectedDoctor.documentPhoto && (
                  <div className="col-span-2 p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-3">Registration Document</p>
                    {selectedDoctor.documentPhoto.startsWith('data:') ? (
                      <img 
                        src={selectedDoctor.documentPhoto} 
                        alt="Doctor Document" 
                        className="w-full max-h-[300px] object-contain rounded-lg shadow-sm border border-slate-200 bg-white"
                      />
                    ) : (
                      <p className="text-sm text-slate-500 flex items-center gap-2"><FileText className="w-4 h-4" /> Document cannot be previewed.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 flex justify-end">
              <Button onClick={() => setSelectedDoctor(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Document View Modal (Pending Approvals) */}
      {selectedApp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Dr. {selectedApp.fullName} • Verification Documents</h3>
                <p className="text-xs text-slate-500">License: <span className="font-mono">{selectedApp.licenseNumber}</span> | Specialty: {selectedApp.specialty} | DOB: {selectedApp.dob || selectedApp.dateOfBirth || 'N/A'}</p>
              </div>
              <button 
                onClick={() => setSelectedApp(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-lg cursor-pointer transition-colors"
              >
                &times;
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-slate-900/5 flex flex-col items-center justify-center min-h-[400px]">
              {selectedApp.documentPhoto && selectedApp.documentPhoto.startsWith('data:') ? (
                <img 
                  src={selectedApp.documentPhoto} 
                  alt="Doctor Credentials Document" 
                  className="max-w-full h-auto max-h-[60vh] object-contain rounded-xl shadow-md border border-slate-200 bg-white"
                />
              ) : (
                <div className="text-center text-slate-400">
                  <FileText className="w-16 h-16 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm font-medium">Document format not recognized as base64 preview.</p>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-slate-100 bg-white flex justify-between items-center">
              <p className="text-xs text-slate-400 font-medium">Please verify all credentials before approving.</p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setSelectedApp(null)}>Close Viewer</Button>
                <Button 
                  variant="outline" 
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => {
                    const id = selectedApp.id;
                    setSelectedApp(null);
                    handleReject(id);
                  }}
                >
                  Reject Request
                </Button>
                <Button 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                  onClick={() => {
                    const id = selectedApp.id;
                    setSelectedApp(null);
                    handleApprove(id);
                  }}
                >
                  Approve Request
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
