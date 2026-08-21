import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  Modal,
  Image
} from 'react-native';
import { Shield, UserCheck, UserX, X, User, BookOpen, MapPin, Building2, Eye, Users, ShieldCheck, AlertTriangle, FileText, Trash2, Mail, Phone, Heart, Scale, Ruler, Calendar } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { fetchApiWithFallback } from '../lib/api';

const StatCard = ({ title, value, icon: Icon, color }) => (
  <View style={styles.statCard}>
    <View style={styles.statCardHeader}>
      <View style={[styles.statIconContainer, { backgroundColor: `${color}15` }]}>
        <Icon size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
    </View>
    <Text style={styles.statTitle}>{title}</Text>
  </View>
);

const AdminScreen = () => {
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({ patients: 0, doctors: 0, pending: 0 });

  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  
  // Modals state
  const [selectedApp, setSelectedApp] = useState(null);
  const [appModalVisible, setAppModalVisible] = useState(false);

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientModalVisible, setPatientModalVisible] = useState(false);

  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [doctorModalVisible, setDoctorModalVisible] = useState(false);

  const [activeTab, setActiveTab] = useState('overview');

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Inquiries / Applications directly from Supabase
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

      setApplications(parsedApps);
      const pendingCount = parsedApps.filter(a => a.status === 'new').length;

      // 2. Fetch Patients directly from Supabase
      const { data: patData } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'patient')
        .order('created_at', { ascending: false });

      setPatients(patData || []);

      // 3. Fetch Doctors directly from Supabase with DOB enrichment
      const { data: docData } = await supabase
        .from('doctors')
        .select('*')
        .order('created_at', { ascending: false });

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
          full_name: doc.name || doc.full_name || matchingProf?.full_name || matchingInq?.fullName || 'Doctor',
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

      setDoctors(verifiedDocs);
      setStats({
        patients: patData?.length || 0,
        doctors: verifiedDocs.length,
        pending: pendingCount
      });
    } catch (error) {
      console.error('Error fetching admin data from Supabase:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const handleUpdateStatus = async (appId, approve) => {
    Alert.alert(
      approve ? 'Approve Doctor' : 'Reject Doctor',
      `Are you sure you want to ${approve ? 'approve' : 'reject'} this application?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: approve ? 'Approve' : 'Reject',
          style: approve ? 'default' : 'destructive',
          onPress: async () => {
            setProcessingId(appId);
            const newStatus = approve ? 'read' : 'urgent';

            // Optimistically update local applications state so the item immediately moves out of pending
            setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a));

            try {
              // 1. Try Backend API first if available
              try {
                const endpoint = approve ? '/admin/approve-doctor' : '/admin/reject-doctor';
                await fetchApiWithFallback(endpoint, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id: appId })
                });
              } catch (apiErr) {
                console.log('Backend API approval endpoint notice, executing direct Supabase approval:', apiErr.message);
              }

              // 2. Update status in inquiries table in Supabase
              const { error: inqErr } = await supabase
                .from('inquiries')
                .update({ status: newStatus })
                .eq('id', appId);

              if (inqErr) throw inqErr;

              // 3. If approved, register doctor into Supabase doctors table
              if (approve) {
                const targetApp = applications.find(a => a.id === appId) || selectedApp;
                if (targetApp && targetApp.email) {
                  const docEmail = targetApp.email.trim();
                  // Check if doctor profile already exists in doctors table
                  const { data: existingDocs } = await supabase
                    .from('doctors')
                    .select('*')
                    .ilike('email', docEmail);

                  if (!existingDocs || existingDocs.length === 0) {
                    const { error: docInsErr } = await supabase
                      .from('doctors')
                      .insert([{
                        name: targetApp.fullName || targetApp.name || 'Doctor',
                        phone_number: targetApp.phoneNumber || '',
                        specialty: targetApp.specialty || 'General Physician',
                        license_number: targetApp.licenseNumber || '',
                        hospital_name: targetApp.hospitalName || 'Clinic',
                        hospital_address: targetApp.hospitalAddress || '',
                        is_verified: true
                      }]);

                    if (docInsErr) {
                      console.warn('Doctors table insert notice:', docInsErr.message);
                    }
                  }
                }
              }

              Alert.alert(
                'Success', 
                approve 
                  ? 'Doctor application approved! The doctor is now verified and added to the doctors list.' 
                  : 'Doctor application rejected.'
              );

              setAppModalVisible(false);
              setSelectedApp(null);
              await fetchProfiles();
            } catch (err) {
              console.error('Error updating doctor application status:', err);
              Alert.alert('Approval Error', err.message || 'Could not process application.');
              // Revert optimistic update on error
              await fetchProfiles();
            } finally {
              setProcessingId(null);
            }
          }
        }
      ]
    );
  };

  const handleDeletePatient = async (id, name) => {
    Alert.alert(
      'Delete Patient',
      `Are you sure you want to permanently delete patient "${name || 'this user'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setPatients(prev => prev.filter(p => p.id !== id));
            try {
              // 1. Try Backend API for complete auth & database deletion
              try {
                await fetchApiWithFallback('/admin/delete-patient', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id })
                });
              } catch (apiErr) {
                console.log('Backend delete notice, executing direct Supabase cascade delete:', apiErr.message);
              }

              // 2. Direct Supabase Cascade Cleanup across all tables
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

              Alert.alert('Success', `Patient ${name || ''} and all associated data deleted successfully.`);
              await fetchProfiles();
            } catch (err) {
              console.error('Error deleting patient:', err);
              Alert.alert('Error', 'Failed to delete patient: ' + err.message);
              await fetchProfiles();
            }
          }
        }
      ]
    );
  };

  const handleDeleteDoctor = async (id, name) => {
    Alert.alert(
      'Delete Doctor',
      `Are you sure you want to permanently delete doctor "${name || 'this doctor'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // Optimistically update local state so doctor immediately disappears from UI
            setDoctors(prev => prev.filter(d => d.id !== id));
            try {
              // 1. Try Backend API for complete auth & database deletion
              try {
                await fetchApiWithFallback('/admin/delete-doctor', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id })
                });
              } catch (apiErr) {
                console.log('Backend API delete endpoint notice, executing direct Supabase cascade delete:', apiErr.message);
              }

              // 2. Direct Cascade Database Cleanup in Supabase
              // Find target doctor to retrieve email if present
              const targetDoc = doctors.find(d => d.id === id);
              const targetEmail = targetDoc?.email || targetDoc?.profiles?.email || null;

              // Delete from doctors table (by id and email)
              await supabase.from('doctors').delete().eq('id', id);
              if (targetEmail) {
                await supabase.from('doctors').delete().ilike('email', targetEmail);
              }

              // Delete from profiles table (by id and email)
              await supabase.from('profiles').delete().eq('id', id);
              if (targetEmail) {
                await supabase.from('profiles').delete().ilike('email', targetEmail);
              }

              // Delete matching inquiry/application records
              if (targetEmail) {
                const { data: inqs } = await supabase
                  .from('inquiries')
                  .select('*')
                  .eq('subject', 'doctor_application');

                for (const inq of (inqs || [])) {
                  try {
                    const payload = JSON.parse(inq.message);
                    if (payload.email && payload.email.toLowerCase() === targetEmail.toLowerCase()) {
                      await supabase.from('inquiries').delete().eq('id', inq.id);
                    }
                  } catch (e) {}
                }
              }

              Alert.alert('Success', `Dr. ${name || ''} deleted successfully from database.`);
              await fetchProfiles();
            } catch (err) {
              console.error('Error deleting doctor:', err);
              Alert.alert('Error', 'Failed to delete doctor: ' + err.message);
              await fetchProfiles();
            }
          }
        }
      ]
    );
  };

  const openAppDetails = (app) => {
    setSelectedApp(app);
    setAppModalVisible(true);
  };

  const openPatientDetails = (pat) => {
    setSelectedPatient(pat);
    setPatientModalVisible(true);
  };

  const openDoctorDetails = (doc) => {
    setSelectedDoctor(doc);
    setDoctorModalVisible(true);
  };

  const pendingApps = applications.filter(app => app.status === 'new');

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'approvals', label: 'Approvals', badge: stats.pending },
    { id: 'patients', label: 'Patients' },
    { id: 'doctors', label: 'Doctors' }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Panel</Text>
        <Text style={styles.subtitle}>Manage platform users & doctor approvals.</Text>
      </View>

      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {tabs.map((tab) => (
            <TouchableOpacity 
              key={tab.id}
              style={[styles.tabBtn, activeTab === tab.id && styles.tabBtnActive]} 
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                {tab.label} {tab.badge ? `(${tab.badge})` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#1d4ed8" style={{ marginTop: 40 }} />
        ) : (
          <>
            {activeTab === 'overview' && (
              <View style={styles.overviewGrid}>
                <StatCard title="Total Patients" value={stats.patients} icon={Users} color="#1d4ed8" />
                <StatCard title="Verified Doctors" value={stats.doctors} icon={ShieldCheck} color="#10b981" />
                <StatCard title="Pending Approvals" value={stats.pending} icon={AlertTriangle} color="#f59e0b" />
              </View>
            )}

            {activeTab === 'approvals' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Doctor Registration Requests</Text>
                {pendingApps.length > 0 ? (
                  pendingApps.map(app => (
                    <View key={app.id} style={styles.appCard}>
                      <View style={styles.appInfo}>
                        <Text style={styles.appName}>{app.fullName}</Text>
                        <Text style={styles.appSub}>{app.specialty} • {app.email}</Text>
                        <Text style={styles.appMeta}>License: {app.licenseNumber} • DOB: {app.dob || 'N/A'}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                        <TouchableOpacity style={styles.viewDocBtn} onPress={() => openAppDetails(app)}>
                          <Eye size={16} color="#1d4ed8" />
                          <Text style={styles.viewDocText}>Review</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={{ backgroundColor: '#ecfdf5', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#6ee7b7' }}
                          onPress={() => handleUpdateStatus(app.id, true)}
                          disabled={processingId === app.id}
                        >
                          <UserCheck size={18} color="#10b981" />
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={{ backgroundColor: '#fef2f2', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#fca5a5' }}
                          onPress={() => handleUpdateStatus(app.id, false)}
                          disabled={processingId === app.id}
                        >
                          <UserX size={18} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>No pending doctor approval requests.</Text>
                )}
              </View>
            )}

            {activeTab === 'patients' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Registered Patients ({patients.length})</Text>
                {patients.length > 0 ? (
                  patients.map(p => (
                    <View key={p.id} style={styles.userRow}>
                      <View style={styles.userAvatar}>
                        <Text style={styles.userAvatarText}>{(p.full_name || 'P').charAt(0).toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.userNameText}>{p.full_name || 'Anonymous'}</Text>
                        <Text style={styles.userSubText}>{p.email}</Text>
                      </View>

                      <View style={styles.rowActions}>
                        <TouchableOpacity 
                          style={styles.viewBtn} 
                          onPress={() => openPatientDetails(p)}
                        >
                          <Eye size={16} color="#1d4ed8" />
                          <Text style={styles.viewBtnText}>Details</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={styles.deleteIconBtn} 
                          onPress={() => handleDeletePatient(p.id, p.full_name)}
                        >
                          <Trash2 size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>No registered patients found.</Text>
                )}
              </View>
            )}

            {activeTab === 'doctors' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Verified Doctors ({doctors.length})</Text>
                {doctors.length > 0 ? (
                  doctors.map(d => (
                    <View key={d.id} style={styles.userRow}>
                      <View style={[styles.userAvatar, { backgroundColor: '#d1fae5' }]}>
                        <Text style={[styles.userAvatarText, { color: '#059669' }]}>
                          {(d.full_name || d.name || 'D').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.userNameText}>Dr. {d.full_name || d.name}</Text>
                        <Text style={styles.userSubText}>{d.specialty} • {d.hospital_name || 'Partner'}</Text>
                      </View>

                      <View style={styles.rowActions}>
                        <TouchableOpacity 
                          style={styles.viewBtn} 
                          onPress={() => openDoctorDetails(d)}
                        >
                          <Eye size={16} color="#1d4ed8" />
                          <Text style={styles.viewBtnText}>Details</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={styles.deleteIconBtn} 
                          onPress={() => handleDeleteDoctor(d.id, d.full_name || d.name)}
                        >
                          <Trash2 size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>No verified doctors found.</Text>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Patient Details Modal */}
      {selectedPatient && (
        <Modal 
          visible={patientModalVisible} 
          animationType="slide" 
          transparent={true}
          onRequestClose={() => setPatientModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContentCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Patient Profile</Text>
                <TouchableOpacity onPress={() => setPatientModalVisible(false)} style={styles.closeBtn}>
                  <X size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <View style={styles.userHeaderBox}>
                  <View style={styles.largeAvatarCircle}>
                    <Text style={styles.largeAvatarText}>
                      {(selectedPatient.full_name || 'P').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailName}>{selectedPatient.full_name || 'N/A'}</Text>
                    <Text style={styles.detailSub}>{selectedPatient.email}</Text>
                  </View>
                </View>

                <View style={styles.gridContainer}>
                  <View style={styles.gridCard}>
                    <Text style={styles.gridCardLabel}>Phone</Text>
                    <Text style={styles.gridCardVal}>{selectedPatient.phone_number || 'N/A'}</Text>
                  </View>
                  <View style={styles.gridCard}>
                    <Text style={styles.gridCardLabel}>Gender</Text>
                    <Text style={styles.gridCardVal}>
                      {selectedPatient.gender ? selectedPatient.gender.charAt(0).toUpperCase() + selectedPatient.gender.slice(1) : 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.gridCard}>
                    <Text style={styles.gridCardLabel}>Age</Text>
                    <Text style={styles.gridCardVal}>{selectedPatient.age ? `${selectedPatient.age} Yrs` : 'N/A'}</Text>
                  </View>
                  <View style={styles.gridCard}>
                    <Text style={styles.gridCardLabel}>Blood Group</Text>
                    <Text style={styles.gridCardVal}>{selectedPatient.blood_group || 'N/A'}</Text>
                  </View>
                  <View style={styles.gridCard}>
                    <Text style={styles.gridCardLabel}>Weight</Text>
                    <Text style={styles.gridCardVal}>{selectedPatient.weight_kg ? `${selectedPatient.weight_kg} kg` : 'N/A'}</Text>
                  </View>
                  <View style={styles.gridCard}>
                    <Text style={styles.gridCardLabel}>Height</Text>
                    <Text style={styles.gridCardVal}>{selectedPatient.height_cm ? `${selectedPatient.height_cm} cm` : 'N/A'}</Text>
                  </View>
                </View>

                {(() => {
                  const history = selectedPatient.medical_history;
                  if (!history) return null;

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
                      <View style={styles.infoBlock}>
                        <Text style={styles.infoBlockTitle}>Medical History & Notes</Text>
                        {parsed.dob ? (
                          <View style={{ marginTop: 4, marginBottom: 4 }}>
                            <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#94a3b8', uppercase: true }}>Date of Birth</Text>
                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#0f172a', marginTop: 2 }}>{parsed.dob}</Text>
                          </View>
                        ) : null}
                        {parsed.diseases ? (
                          <View style={{ marginTop: 6, marginBottom: 4 }}>
                            <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#94a3b8', uppercase: true }}>Medical Conditions / Diseases</Text>
                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#0f172a', marginTop: 2 }}>{parsed.diseases}</Text>
                          </View>
                        ) : null}
                        {parsed.drugs ? (
                          <View style={{ marginTop: 6, marginBottom: 4 }}>
                            <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#94a3b8', uppercase: true }}>Current Medications / Drugs</Text>
                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#0f172a', marginTop: 2 }}>{parsed.drugs}</Text>
                          </View>
                        ) : null}
                        {Object.keys(parsed).map(key => {
                          if (['dob', 'diseases', 'drugs'].includes(key) || !parsed[key]) return null;
                          const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                          return (
                            <View key={key} style={{ marginTop: 6, marginBottom: 4 }}>
                              <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#94a3b8', uppercase: true }}>{label}</Text>
                              <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#0f172a', marginTop: 2 }}>{parsed[key]}</Text>
                            </View>
                          );
                        })}
                      </View>
                    );
                  }

                  return (
                    <View style={styles.infoBlock}>
                      <Text style={styles.infoBlockTitle}>Medical History</Text>
                      <Text style={styles.infoBlockText}>{history}</Text>
                    </View>
                  );
                })()}

                {selectedPatient.created_at ? (
                  <View style={styles.infoBlock}>
                    <Text style={styles.infoBlockTitle}>Joined Platform</Text>
                    <Text style={styles.infoBlockText}>{new Date(selectedPatient.created_at).toLocaleDateString()}</Text>
                  </View>
                ) : null}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Doctor Details Modal */}
      {selectedDoctor && (
        <Modal 
          visible={doctorModalVisible} 
          animationType="slide" 
          transparent={true}
          onRequestClose={() => setDoctorModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContentCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Doctor Credentials</Text>
                <TouchableOpacity onPress={() => setDoctorModalVisible(false)} style={styles.closeBtn}>
                  <X size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <View style={styles.userHeaderBox}>
                  <View style={[styles.largeAvatarCircle, { backgroundColor: '#d1fae5' }]}>
                    <Text style={[styles.largeAvatarText, { color: '#059669' }]}>
                      {(selectedDoctor.full_name || selectedDoctor.name || 'D').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailName}>Dr. {selectedDoctor.full_name || selectedDoctor.name}</Text>
                    <Text style={[styles.detailSub, { color: '#059669', fontWeight: 'bold' }]}>
                      {selectedDoctor.specialty}
                    </Text>
                  </View>
                </View>

                <View style={styles.gridContainer}>
                  <View style={styles.gridCard}>
                    <Text style={styles.gridCardLabel}>License No.</Text>
                    <Text style={styles.gridCardVal}>{selectedDoctor.license_number || 'N/A'}</Text>
                  </View>
                  <View style={styles.gridCard}>
                    <Text style={styles.gridCardLabel}>Date of Birth</Text>
                    <Text style={styles.gridCardVal}>{selectedDoctor.dob || 'N/A'}</Text>
                  </View>
                  <View style={styles.gridCard}>
                    <Text style={styles.gridCardLabel}>Email Address</Text>
                    <Text style={styles.gridCardVal}>{selectedDoctor.email || 'N/A'}</Text>
                  </View>
                  <View style={styles.gridCard}>
                    <Text style={styles.gridCardLabel}>Phone Number</Text>
                    <Text style={styles.gridCardVal}>{selectedDoctor.phone_number || selectedDoctor.phoneNumber || 'N/A'}</Text>
                  </View>
                </View>

                <View style={styles.infoBlock}>
                  <Text style={styles.infoBlockTitle}>Hospital / Clinic</Text>
                  <Text style={styles.infoBlockText}>{selectedDoctor.hospital_name || 'N/A'}</Text>
                  {selectedDoctor.hospital_address ? (
                    <Text style={styles.infoBlockSubText}>{selectedDoctor.hospital_address}</Text>
                  ) : null}
                </View>

                {selectedDoctor.education ? (
                  <View style={styles.infoBlock}>
                    <Text style={styles.infoBlockTitle}>Education Details</Text>
                    {typeof selectedDoctor.education === 'object' ? (
                      <View style={{ gap: 4 }}>
                        <Text style={styles.infoBlockText}>
                          {selectedDoctor.education.universityName || selectedDoctor.education.university_name || 'N/A'}
                        </Text>
                        <Text style={styles.infoBlockSubText}>
                          Location: {selectedDoctor.education.collegeLocation || selectedDoctor.education.college_location || 'N/A'}
                        </Text>
                        <Text style={styles.infoBlockSubText}>
                          Duration: {selectedDoctor.education.startYear || selectedDoctor.education.start_year} - {selectedDoctor.education.endYear || selectedDoctor.education.end_year} ({selectedDoctor.education.duration} Yrs)
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.infoBlockText}>{String(selectedDoctor.education)}</Text>
                    )}
                  </View>
                ) : null}

                {selectedDoctor.bio ? (
                  <View style={styles.infoBlock}>
                    <Text style={styles.infoBlockTitle}>Professional Bio</Text>
                    <Text style={styles.infoBlockText}>{selectedDoctor.bio}</Text>
                  </View>
                ) : null}

                {selectedDoctor.documentPhoto || selectedDoctor.licenseImage ? (
                  <View style={styles.infoBlock}>
                    <Text style={styles.infoBlockTitle}>Registration Document</Text>
                    <Image
                      source={{ uri: selectedDoctor.documentPhoto || selectedDoctor.licenseImage }}
                      style={styles.docImage}
                      resizeMode="cover"
                    />
                  </View>
                ) : null}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Application Detail & Medical License Document Viewer Modal (Pending Approvals) */}
      <Modal visible={appModalVisible} animationType="slide" transparent={true} onRequestClose={() => setAppModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentCard}>
            {selectedApp && (
              <ScrollView contentContainerStyle={{ padding: 4 }}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Doctor Application Details</Text>
                  <TouchableOpacity onPress={() => setAppModalVisible(false)} style={styles.closeBtn}>
                    <X size={20} color="#64748b" />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  <Text style={styles.detailName}>{selectedApp.fullName}</Text>
                  <Text style={styles.detailSub}>{selectedApp.email} • {selectedApp.phoneNumber}</Text>

                  <View style={styles.detailGrid}>
                    <View style={styles.gridBox}>
                      <Text style={styles.gridLabel}>Specialty</Text>
                      <Text style={styles.gridVal}>{selectedApp.specialty}</Text>
                    </View>
                    <View style={styles.gridBox}>
                      <Text style={styles.gridLabel}>License No.</Text>
                      <Text style={styles.gridVal}>{selectedApp.licenseNumber}</Text>
                    </View>
                    <View style={styles.gridBox}>
                      <Text style={styles.gridLabel}>Date of Birth</Text>
                      <Text style={styles.gridVal}>{selectedApp.dob || selectedApp.dateOfBirth || 'N/A'}</Text>
                    </View>
                    <View style={[styles.gridBox, { width: '100%' }]}>
                      <Text style={styles.gridLabel}>Hospital / Clinic</Text>
                      <Text style={styles.gridVal}>{selectedApp.hospitalName}</Text>
                    </View>
                  </View>

                  {/* Medical License Document Viewer */}
                  <Text style={styles.docLabel}>Medical Licensure Document</Text>
                  {selectedApp.documentUrl || selectedApp.document_url || selectedApp.licenseImage || selectedApp.documentPhoto ? (
                    <View style={styles.docPreviewBox}>
                      <Image 
                        source={{ uri: selectedApp.documentUrl || selectedApp.document_url || selectedApp.licenseImage || selectedApp.documentPhoto }} 
                        style={styles.docImage}
                        resizeMode="contain"
                      />
                    </View>
                  ) : (
                    <View style={styles.noDocBox}>
                      <FileText size={32} color="#94a3b8" />
                      <Text style={styles.noDocText}>License Copy Uploaded during Verification</Text>
                    </View>
                  )}

                  <View style={styles.approvalActionRow}>
                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.rejectBtn]}
                      onPress={() => handleUpdateStatus(selectedApp.id, false)}
                      disabled={processingId === selectedApp.id}
                    >
                      <UserX size={18} color="#ef4444" />
                      <Text style={styles.rejectText}>Reject</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.approveBtn]}
                      onPress={() => handleUpdateStatus(selectedApp.id, true)}
                      disabled={processingId === selectedApp.id}
                    >
                      <UserCheck size={18} color="#10b981" />
                      <Text style={styles.approveText}>Approve Doctor</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingBottom: 10 },
  title: { fontSize: 28, fontWeight: '900', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  tabsContainer: { paddingHorizontal: 20, marginBottom: 15 },
  tabsScroll: { gap: 8 },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#e2e8f0', borderRadius: 12 },
  tabBtnActive: { backgroundColor: '#1d4ed8' },
  tabText: { fontSize: 13, fontWeight: 'bold', color: '#64748b' },
  tabTextActive: { color: '#ffffff' },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  overviewGrid: { gap: 12 },
  statCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  statCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statIconContainer: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 24, fontWeight: '900', color: '#0f172a' },
  statTitle: { fontSize: 13, color: '#64748b', marginTop: 8, fontWeight: '600' },
  section: { backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#f1f5f9' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 14 },
  emptyText: { color: '#94a3b8', fontStyle: 'italic', marginVertical: 10 },
  appCard: { backgroundColor: '#f8fafc', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  appInfo: { flex: 1 },
  appName: { fontSize: 15, fontWeight: 'bold', color: '#0f172a' },
  appSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  appMeta: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  appActions: { marginLeft: 10 },
  viewDocBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#eff6ff', borderRadius: 10, borderWidth: 1, borderColor: '#bfdbfe' },
  viewDocText: { color: '#1d4ed8', fontWeight: 'bold', fontSize: 12 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  userAvatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  userAvatarText: { fontSize: 16, fontWeight: 'bold', color: '#1d4ed8' },
  userNameText: { fontSize: 15, fontWeight: 'bold', color: '#0f172a' },
  userSubText: { fontSize: 12, color: '#64748b', marginTop: 1 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#eff6ff', borderRadius: 8, borderWidth: 1, borderColor: '#bfdbfe' },
  viewBtnText: { color: '#1d4ed8', fontWeight: 'bold', fontSize: 12 },
  deleteIconBtn: { padding: 8, borderRadius: 8, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContentCard: { backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  closeBtn: { padding: 6, borderRadius: 10, backgroundColor: '#f1f5f9' },
  modalBody: { paddingVertical: 4 },
  userHeaderBox: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  largeAvatarCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  largeAvatarText: { fontSize: 22, fontWeight: 'bold', color: '#1d4ed8' },
  detailName: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  detailSub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  gridBox: { width: '48%', backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  gridLabel: { fontSize: 11, fontWeight: 'bold', color: '#94a3b8' },
  gridVal: { fontSize: 14, fontWeight: 'bold', color: '#0f172a', marginTop: 4 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  gridCard: { width: '48%', backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  gridCardLabel: { fontSize: 10, fontWeight: 'bold', color: '#94a3b8', uppercase: true },
  gridCardVal: { fontSize: 14, fontWeight: 'bold', color: '#0f172a', marginTop: 2 },
  infoBlock: { backgroundColor: '#f8fafc', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  infoBlockTitle: { fontSize: 12, fontWeight: 'bold', color: '#94a3b8', uppercase: true, marginBottom: 4 },
  infoBlockText: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  infoBlockSubText: { fontSize: 12, color: '#64748b', marginTop: 2 },
  docLabel: { fontSize: 13, fontWeight: 'bold', color: '#0f172a', marginTop: 10 },
  docPreviewBox: { height: 200, backgroundColor: '#f8fafc', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  docImage: { width: '100%', height: 180, borderRadius: 12, marginTop: 6 },
  noDocBox: { height: 120, backgroundColor: '#f8fafc', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center', gap: 8 },
  noDocText: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic' },
  approvalActionRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  actionBtn: { flex: 1, height: 48, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1 },
  rejectBtn: { borderColor: '#fca5a5', backgroundColor: '#fef2f2' },
  rejectText: { color: '#ef4444', fontWeight: 'bold', fontSize: 14 },
  approveBtn: { borderColor: '#6ee7b7', backgroundColor: '#ecfdf5' },
  approveText: { color: '#10b981', fontWeight: 'bold', fontSize: 14 }
});

export default AdminScreen;
