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
  TextInput,
  Platform
} from 'react-native';
import { 
  Search, 
  Star, 
  Calendar, 
  MessageCircle, 
  X, 
  MapPin, 
  Award, 
  Building2, 
  User, 
  BookOpen, 
  Users, 
  Clock, 
  Video, 
  CheckCircle2, 
  ChevronDown,
  AlertCircle
} from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { supabase } from '../lib/supabase';

const DoctorConnectScreen = ({ navigation }) => {
  const { user } = useSelector(state => state.auth);

  // Core Data State
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation & View Tabs
  const [activeTab, setActiveTab] = useState('connect'); // 'connect' or 'visits'
  const [search, setSearch] = useState('');
  
  // Filter & Sort State for Scheduled Visits
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'accepted', 'pending', 'rejected', 'completed'
  const [sortBy, setSortBy] = useState('date_desc'); // 'date_desc', 'date_asc', 'completed_first', 'rejected_first'

  // Profile Modal State
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Booking Modal State
  const [bookingDoctor, setBookingDoctor] = useState(null);
  const [bookingNotes, setBookingNotes] = useState('');
  const [submittingBooking, setSubmittingBooking] = useState(false);

  // Doctor Reviews State
  const [reviews, setReviews] = useState([]);
  const [fetchingReviews, setFetchingReviews] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Fetch verified doctors from 'doctors' table & profiles table
      const { data: doctorData } = await supabase.from('doctors').select('*');
      const { data: profileDocs } = await supabase.from('profiles').select('*').eq('role', 'doctor');

      let combinedDocs = (doctorData || []).map(d => {
        const p = (profileDocs || []).find(prof => prof.id === d.id);
        return {
          ...p,
          ...d,
          full_name: d.name || d.full_name || p?.full_name,
          specialty: d.specialty || d.specialization || p?.specialty,
          bio: d.bio || p?.bio,
          education: d.education || p?.education,
          medical_history: p?.medical_history || d?.medical_history
        };
      });

      (profileDocs || []).forEach(p => {
        if (!combinedDocs.some(cd => cd.id === p.id)) {
          combinedDocs.push(p);
        }
      });

      // 2. Fetch user's appointments
      const { data: appts, error: apptsError } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', user.id)
        .order('appointment_date', { ascending: false });

      if (apptsError) throw apptsError;

      setDoctors(combinedDocs);
      setAppointments(appts || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();

    if (!user) return;
    const apptSub = supabase
      .channel(`realtime:patient_appts_${user.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'appointments',
        filter: `user_id=eq.${user.id}`
      }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(apptSub);
    };
  }, [fetchData, user]);

  const fetchReviews = useCallback(async (doctorId) => {
    if (!doctorId) return;
    setFetchingReviews(true);
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('doctor_id', doctorId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setReviews(data);
      } else {
        setReviews([]);
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setFetchingReviews(false);
    }
  }, []);

  const getDoctorAppointmentInfo = (doctorId) => {
    const userAppts = appointments.filter(a => a.doctor_id === doctorId);
    if (userAppts.length === 0) return { status: 'none', appt: null };
    
    const latest = userAppts.reduce((latest, current) => {
      return new Date(current.created_at) > new Date(latest.created_at) ? current : latest;
    }, userAppts[0]);
    return { status: latest.status, appt: latest };
  };

  const handleBookAppointment = async () => {
    if (!bookingDoctor || !user) return;
    setSubmittingBooking(true);
    try {
      const sentDate = new Date().toISOString();
      const docName = bookingDoctor.full_name || bookingDoctor.name || 'Doctor';
      const docSpec = bookingDoctor.specialty || bookingDoctor.specialization || 'General Specialist';

      const { error } = await supabase.from('appointments').insert([{
        user_id: user.id,
        doctor_id: bookingDoctor.id,
        doctor_name: docName,
        specialization: docSpec,
        appointment_date: sentDate,
        status: 'pending',
        notes: bookingNotes.trim() || null
      }]);

      if (error) throw error;

      Alert.alert('Request Sent', `Your appointment request has been submitted to Dr. ${docName}.`);
      setBookingDoctor(null);
      setBookingNotes('');
      fetchData();
    } catch (err) {
      console.error('Booking error:', err);
      Alert.alert('Error', err.message || 'Failed to submit appointment request.');
    } finally {
      setSubmittingBooking(false);
    }
  };

  const openProfile = (doctor) => {
    setSelectedDoctor(doctor);
    setNewComment('');
    setNewRating(5);
    setModalVisible(true);
    fetchReviews(doctor.id);
  };

  const handleAddReview = async () => {
    if (!newComment.trim()) {
      Alert.alert('Required', 'Please enter a review comment.');
      return;
    }
    if (!selectedDoctor || !user) return;

    setSubmittingReview(true);
    try {
      const patientName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Patient';
      const { error } = await supabase.from('reviews').insert([
        {
          doctor_id: selectedDoctor.id,
          patient_id: user.id,
          patient_name: patientName,
          rating: newRating,
          comment: newComment.trim()
        }
      ]);

      if (error) throw error;
      setNewComment('');
      Alert.alert('Thank You', 'Your review has been submitted successfully.');
      fetchReviews(selectedDoctor.id);
    } catch (err) {
      console.error('Review submit error:', err);
      Alert.alert('Error', err.message || 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const parseDoctorDetails = (doc) => {
    if (!doc) return { docName: 'Doctor', docSpecialty: 'General Specialist', docBio: 'No biography available.', docHospital: 'Not specified', docAddress: 'Not specified', eduObj: null };

    let docName = doc.full_name || doc.name || 'Doctor';
    let docSpecialty = doc.specialty || doc.specialization || 'General Specialist';
    let docBio = doc.bio || doc.professional_bio || doc.description || '';
    let docHospital = doc.hospital_name || doc.hospital || doc.clinic_name || 'Not specified';
    let docAddress = doc.hospital_address || doc.address || doc.location || 'Not specified';
    let eduData = doc.education || null;

    // Check medical_history JSON from profiles table if bio or education is missing
    if (doc.medical_history) {
      try {
        const parsedMed = typeof doc.medical_history === 'string' ? JSON.parse(doc.medical_history) : doc.medical_history;
        if (parsedMed && typeof parsedMed === 'object') {
          if (!docBio && parsedMed.bio) docBio = parsedMed.bio;
          if (!eduData && parsedMed.education) eduData = parsedMed.education;
        }
      } catch (e) {}
    }

    if (!docBio) docBio = 'No biography available.';

    let eduObj = null;
    if (typeof eduData === 'string' && eduData.trim().startsWith('{')) {
      try {
        eduObj = JSON.parse(eduData);
      } catch (e) {
        eduObj = eduData;
      }
    } else {
      eduObj = eduData;
    }

    return { docName, docSpecialty, docBio, docHospital, docAddress, eduObj };
  };

  const renderStatusBadge = (status) => {
    switch(status) {
      case 'pending': return <View style={[styles.badge, styles.badgePending]}><Text style={styles.badgeTextPending}>PENDING</Text></View>;
      case 'accepted': return <View style={[styles.badge, styles.badgeAccepted]}><Text style={styles.badgeTextAccepted}>ACCEPTED</Text></View>;
      case 'rejected': return <View style={[styles.badge, styles.badgeRejected]}><Text style={styles.badgeTextRejected}>REJECTED</Text></View>;
      case 'completed': return <View style={[styles.badge, styles.badgeCompleted]}><Text style={styles.badgeTextCompleted}>COMPLETED</Text></View>;
      default: return null;
    }
  };

  // Filtered lists
  const filteredDoctors = doctors.filter(d => {
    const name = (d.full_name || d.name || '').toLowerCase();
    const spec = (d.specialty || d.specialization || '').toLowerCase();
    const term = search.toLowerCase();
    return name.includes(term) || spec.includes(term);
  });

  const filteredAppointments = appointments.filter(appt => {
    if (statusFilter === 'all') return true;
    return appt.status === statusFilter;
  });

  const sortedAppointments = [...filteredAppointments].sort((a, b) => {
    if (sortBy === 'date_desc') {
      return new Date(b.appointment_date || b.created_at) - new Date(a.appointment_date || a.created_at);
    }
    if (sortBy === 'date_asc') {
      return new Date(a.appointment_date || a.created_at) - new Date(b.appointment_date || b.created_at);
    }
    if (sortBy === 'completed_first') {
      if (a.status === 'completed' && b.status !== 'completed') return -1;
      if (a.status !== 'completed' && b.status === 'completed') return 1;
      return new Date(b.appointment_date) - new Date(a.appointment_date);
    }
    if (sortBy === 'rejected_first') {
      if (a.status === 'rejected' && b.status !== 'rejected') return -1;
      if (a.status !== 'rejected' && b.status === 'rejected') return 1;
      return new Date(b.appointment_date) - new Date(a.appointment_date);
    }
    return 0;
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Doctor Connect</Text>
        <Text style={styles.subtitle}>Find and consult with top-tier medical specialists</Text>
      </View>

      {/* Segmented Sub-Tab Switcher */}
      <View style={styles.tabContainer}>
        <View style={styles.tabBar}>
          <TouchableOpacity 
            style={[styles.tabBtn, activeTab === 'connect' && styles.tabBtnActive]} 
            onPress={() => setActiveTab('connect')}
          >
            <Users size={16} color={activeTab === 'connect' ? '#1d4ed8' : '#64748b'} />
            <Text style={[styles.tabBtnText, activeTab === 'connect' && styles.tabBtnTextActive]}>
              Doctor Connect
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabBtn, activeTab === 'visits' && styles.tabBtnActive]} 
            onPress={() => setActiveTab('visits')}
          >
            <Calendar size={16} color={activeTab === 'visits' ? '#1d4ed8' : '#64748b'} />
            <Text style={[styles.tabBtnText, activeTab === 'visits' && styles.tabBtnTextActive]}>
              Visited
            </Text>
            {appointments.length > 0 && (
              <View style={[styles.badgePill, activeTab === 'visits' ? styles.badgePillActive : styles.badgePillInactive]}>
                <Text style={[styles.badgePillText, activeTab === 'visits' ? styles.badgePillTextActive : styles.badgePillTextInactive]}>
                  {appointments.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#1d4ed8" style={{ marginTop: 50 }} />
        ) : activeTab === 'connect' ? (
          /* TAB 1: Doctor Connect / Find Specialist */
          <View style={styles.tabContent}>
            {/* Search Input */}
            <View style={styles.searchContainer}>
              <Search size={18} color="#94a3b8" style={{ marginRight: 8 }} />
              <TextInput
                placeholder="Search specialties or names..."
                placeholderTextColor="#94a3b8"
                value={search}
                onChangeText={setSearch}
                style={styles.searchInput}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <X size={16} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            {filteredDoctors.length > 0 ? (
              <View style={styles.list}>
                {filteredDoctors.map(doctor => {
                  const { status, appt } = getDoctorAppointmentInfo(doctor.id);
                  const name = doctor.full_name || doctor.name || 'Doctor';
                  const spec = doctor.specialty || doctor.specialization || 'General Practitioner';
                  
                  return (
                    <View key={doctor.id} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <View style={styles.avatar}>
                          <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={styles.info}>
                          <Text style={styles.docName}>{name}</Text>
                          <Text style={styles.docSpecialty}>{spec}</Text>
                          <View style={styles.ratingRow}>
                            <Star size={14} color="#fbbf24" fill="#fbbf24" />
                            <Text style={styles.ratingText}>5.0</Text>
                            {renderStatusBadge(status)}
                          </View>
                        </View>
                      </View>
                      
                      <View style={styles.cardActions}>
                        <TouchableOpacity style={styles.viewBtn} onPress={() => openProfile(doctor)}>
                          <Text style={styles.viewBtnText}>View Profile</Text>
                        </TouchableOpacity>
                        
                        {status === 'pending' ? (
                          <TouchableOpacity style={[styles.bookBtn, styles.pendingBtn]} disabled>
                            <Text style={styles.pendingBtnText}>Pending Approval</Text>
                          </TouchableOpacity>
                        ) : status === 'accepted' ? (
                          <TouchableOpacity 
                            style={[styles.bookBtn, styles.chatBtn]} 
                            onPress={() => navigation.navigate('ConsultationChat', { appointmentId: appt.id })}
                          >
                            <MessageCircle size={16} color="#fff" />
                            <Text style={styles.bookBtnText}>Chat Now</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity 
                            style={styles.bookBtn} 
                            onPress={() => { setBookingDoctor(doctor); setBookingNotes(''); }}
                          >
                            <Calendar size={16} color="#fff" />
                            <Text style={styles.bookBtnText}>Book Now</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Users size={40} color="#cbd5e1" style={{ marginBottom: 12 }} />
                <Text style={styles.emptyText}>No specialists matching "{search}" found.</Text>
              </View>
            )}
          </View>
        ) : (
          /* TAB 2: Visited / Scheduled Visits */
          <View style={styles.tabContent}>
            {/* Scheduled Visits Title & Count */}
            <View style={styles.visitsHeaderRow}>
              <Text style={styles.visitsTitle}>Your Scheduled Visits</Text>
              <View style={styles.visitsCountPill}>
                <Text style={styles.visitsCountText}>{filteredAppointments.length}</Text>
              </View>
            </View>

            {/* Filter Pills */}
            <Text style={styles.filterGroupLabel}>Filter Status:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {[
                { value: 'all', label: 'All' },
                { value: 'accepted', label: 'Accepted' },
                { value: 'pending', label: 'Pending' },
                { value: 'completed', label: 'Completed' },
                { value: 'rejected', label: 'Rejected' }
              ].map(pill => (
                <TouchableOpacity
                  key={pill.value}
                  style={[styles.filterPill, statusFilter === pill.value && styles.filterPillActive]}
                  onPress={() => setStatusFilter(pill.value)}
                >
                  <Text style={[styles.filterPillText, statusFilter === pill.value && styles.filterPillTextActive]}>
                    {pill.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Sort Options */}
            <Text style={styles.filterGroupLabel}>Sort By:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {[
                { value: 'date_desc', label: 'Newest First' },
                { value: 'date_asc', label: 'Oldest First' },
                { value: 'completed_first', label: 'Completed First' },
                { value: 'rejected_first', label: 'Rejected First' }
              ].map(sort => (
                <TouchableOpacity
                  key={sort.value}
                  style={[styles.sortPill, sortBy === sort.value && styles.sortPillActive]}
                  onPress={() => setSortBy(sort.value)}
                >
                  <Text style={[styles.sortPillText, sortBy === sort.value && styles.sortPillTextActive]}>
                    {sort.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Visits Card List */}
            {sortedAppointments.length > 0 ? (
              <View style={styles.visitsList}>
                {sortedAppointments.map((appt) => {
                  const apptDateObj = new Date(appt.appointment_date || appt.created_at || Date.now());
                  const dayNum = apptDateObj.getDate();
                  const monthShort = apptDateObj.toLocaleString('default', { month: 'short' }).toUpperCase();
                  const timeFormatted = apptDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const docDisplayName = appt.doctor_name || 'Specialist Doctor';

                  return (
                    <View key={appt.id} style={styles.visitCard}>
                      <View style={styles.visitCardContent}>
                        {/* Date Badge Box */}
                        <View style={styles.dateBox}>
                          <Text style={styles.dateBoxDay}>{dayNum}</Text>
                          <Text style={styles.dateBoxMonth}>{monthShort}</Text>
                        </View>

                        {/* Visit Info Column */}
                        <View style={styles.visitInfo}>
                          <Text style={styles.visitTitle}>Consultation with {docDisplayName}</Text>
                          <View style={styles.visitDetailRow}>
                            <Clock size={14} color="#64748b" />
                            <Text style={styles.visitDetailText}>{timeFormatted}</Text>
                            <Text style={styles.dotSeparator}>•</Text>
                            <Video size={14} color="#64748b" />
                            <Text style={styles.visitDetailText}>Tele-Consultation</Text>
                          </View>

                          <View style={{ marginTop: 8, flexDirection: 'row' }}>
                            {renderStatusBadge(appt.status)}
                          </View>
                        </View>
                      </View>

                      {/* Action Button */}
                      <View style={styles.visitCardFooter}>
                        {appt.status === 'accepted' ? (
                          <TouchableOpacity 
                            style={styles.joinChatBtn}
                            onPress={() => navigation.navigate('ConsultationChat', { appointmentId: appt.id })}
                          >
                            <MessageCircle size={18} color="#fff" style={{ marginRight: 6 }} />
                            <Text style={styles.joinChatBtnText}>Join Chat</Text>
                          </TouchableOpacity>
                        ) : appt.status === 'pending' ? (
                          <View style={styles.waitingNoteBox}>
                            <Clock size={14} color="#d97706" />
                            <Text style={styles.waitingNoteText}>Waiting for doctor approval</Text>
                          </View>
                        ) : (
                          <View style={styles.completedNoteBox}>
                            <CheckCircle2 size={14} color="#64748b" />
                            <Text style={styles.completedNoteText}>Consultation Status: {appt.status.toUpperCase()}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Calendar size={40} color="#cbd5e1" style={{ marginBottom: 12 }} />
                <Text style={styles.emptyText}>No appointments found under "{statusFilter.toUpperCase()}" filter.</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Booking Notes Modal */}
      {bookingDoctor && (
        <Modal 
          visible={Boolean(bookingDoctor)} 
          animationType="fade" 
          transparent
          onRequestClose={() => setBookingDoctor(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.bookingCard}>
              <Text style={styles.bookingTitle}>Request Appointment</Text>
              <Text style={styles.bookingSub}>Consultation with Dr. {bookingDoctor.full_name || bookingDoctor.name}</Text>

              <Text style={styles.bookingNotesLabel}>Do you have notes or health concerns? (Optional):</Text>
              <TextInput
                multiline
                numberOfLines={4}
                placeholder="Describe your symptoms, questions, or medical concerns for the doctor..."
                placeholderTextColor="#94a3b8"
                style={styles.bookingNotesInput}
                value={bookingNotes}
                onChangeText={setBookingNotes}
              />

              <View style={styles.bookingActionRow}>
                <TouchableOpacity 
                  style={styles.cancelBookingBtn} 
                  onPress={() => setBookingDoctor(null)}
                >
                  <Text style={styles.cancelBookingBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.confirmBookingBtn, submittingBooking && styles.confirmBookingBtnDisabled]}
                  onPress={handleBookAppointment}
                  disabled={submittingBooking}
                >
                  {submittingBooking ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.confirmBookingBtnText}>Book Now</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Doctor Profile Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView style={styles.modalContainer}>
          {selectedDoctor && (() => {
            const { docName, docSpecialty, docBio, docHospital, docAddress, eduObj } = parseDoctorDetails(selectedDoctor);
            
            const avgRating = reviews.length > 0 
              ? (reviews.reduce((acc, r) => acc + (parseFloat(r.rating) || 5), 0) / reviews.length).toFixed(1)
              : '5.0';

            return (
              <ScrollView contentContainerStyle={styles.modalContent}>
                <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
                
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View style={[styles.avatar, styles.modalAvatar]}>
                    <Text style={styles.modalAvatarText}>{docName.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={styles.modalName}>{docName}</Text>
                  <Text style={styles.modalSpecialty}>{docSpecialty}</Text>
                  <View style={styles.ratingBadgeRow}>
                    <Star size={16} color="#fbbf24" fill="#fbbf24" />
                    <Text style={styles.ratingBadgeText}>{avgRating}</Text>
                    <Text style={styles.reviewsCountText}>({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})</Text>
                  </View>
                </View>

                {/* Professional Bio */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <User size={20} color="#1d4ed8" />
                    <Text style={styles.sectionTitle}>Professional Bio</Text>
                  </View>
                  <Text style={styles.sectionBody}>{docBio}</Text>
                </View>

                {/* Education Details */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <BookOpen size={20} color="#1d4ed8" />
                    <Text style={styles.sectionTitle}>Education Details</Text>
                  </View>
                  {typeof eduObj === 'object' && eduObj !== null ? (
                    <View style={styles.educationGrid}>
                      <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>University</Text>
                        <Text style={styles.gridValue}>{eduObj.university_name || eduObj.universityName || 'Not specified'}</Text>
                      </View>
                      <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>Location</Text>
                        <Text style={styles.gridValue}>{eduObj.college_location || eduObj.collegeLocation || 'Not specified'}</Text>
                      </View>
                      <View style={[styles.gridItem, { width: '100%' }]}>
                        <Text style={styles.gridLabel}>Duration & Details</Text>
                        <Text style={styles.gridValue}>
                          {(eduObj.start_year || eduObj.startYear) && (eduObj.end_year || eduObj.endYear) 
                            ? `${eduObj.start_year || eduObj.startYear} - ${eduObj.end_year || eduObj.endYear}`
                            : ''}
                          {eduObj.duration ? ` (${eduObj.duration} Yrs)` : ''}
                          {eduObj.degree || eduObj.qualification ? ` • ${eduObj.degree || eduObj.qualification}` : ''}
                          {!((eduObj.start_year || eduObj.startYear) || eduObj.duration || eduObj.degree) ? 'Verified Degree' : ''}
                        </Text>
                      </View>
                    </View>
                  ) : eduObj ? (
                    <Text style={styles.sectionBody}>{String(eduObj)}</Text>
                  ) : (
                    <Text style={styles.sectionBody}>Not specified</Text>
                  )}
                </View>

                {/* Hospital / Clinic */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Building2 size={20} color="#1d4ed8" />
                    <Text style={styles.sectionTitle}>Hospital / Clinic</Text>
                  </View>
                  <Text style={styles.sectionBody}>{docHospital}</Text>
                </View>

                {/* Location */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <MapPin size={20} color="#1d4ed8" />
                    <Text style={styles.sectionTitle}>Location</Text>
                  </View>
                  <Text style={styles.sectionBody}>{docAddress}</Text>
                </View>

                {/* Patient Reviews Section */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Star size={20} color="#1d4ed8" fill="#1d4ed8" />
                    <Text style={styles.sectionTitle}>Patient Reviews & Feedback</Text>
                  </View>

                  {/* Add Review Box */}
                  <View style={styles.addReviewBox}>
                    <Text style={styles.addReviewTitle}>Write a Review</Text>
                    <Text style={styles.starRatingLabel}>Select Rating:</Text>
                    <View style={styles.starRow}>
                      {[1, 2, 3, 4, 5].map((starVal) => (
                        <TouchableOpacity key={starVal} onPress={() => setNewRating(starVal)}>
                          <Star 
                            size={24} 
                            color="#fbbf24" 
                            fill={starVal <= newRating ? "#fbbf24" : "none"} 
                            style={{ marginRight: 6 }} 
                          />
                        </TouchableOpacity>
                      ))}
                    </View>

                    <TextInput 
                      multiline
                      numberOfLines={3}
                      placeholder="Share your consultation experience with this doctor..."
                      placeholderTextColor="#94a3b8"
                      value={newComment}
                      onChangeText={setNewComment}
                      style={styles.reviewInput}
                    />

                    <TouchableOpacity 
                      style={[styles.submitReviewBtn, submittingReview && styles.submitReviewBtnDisabled]}
                      onPress={handleAddReview}
                      disabled={submittingReview}
                    >
                      {submittingReview ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.submitReviewBtnText}>Submit Review</Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Review List */}
                  {fetchingReviews ? (
                    <ActivityIndicator size="small" color="#1d4ed8" style={{ marginVertical: 16 }} />
                  ) : reviews.length > 0 ? (
                    <View style={styles.reviewsList}>
                      {reviews.map((rev) => (
                        <View key={rev.id || Math.random().toString()} style={styles.reviewCard}>
                          <View style={styles.reviewHeader}>
                            <Text style={styles.reviewerName}>{rev.patient_name || 'Patient'}</Text>
                            <View style={styles.revStarRow}>
                              {[...Array(rev.rating || 5)].map((_, i) => (
                                <Star key={i} size={12} color="#fbbf24" fill="#fbbf24" />
                              ))}
                            </View>
                          </View>
                          <Text style={styles.reviewComment}>{rev.comment}</Text>
                          {rev.created_at && (
                            <Text style={styles.reviewDate}>
                              {new Date(rev.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </Text>
                          )}
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.noReviewsText}>No patient reviews yet. Be the first to share feedback!</Text>
                  )}
                </View>
              </ScrollView>
            );
          })()}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  title: { fontSize: 28, fontWeight: '900', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 2 },

  // Sub-Tab Switcher
  tabContainer: { paddingHorizontal: 20, marginBottom: 12, marginTop: 6 },
  tabBar: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 16, padding: 4 },
  tabBtn: { flex: 1, height: 44, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  tabBtnActive: { backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 },
  tabBtnText: { fontSize: 14, fontWeight: '700', color: '#64748b' },
  tabBtnTextActive: { color: '#1d4ed8' },
  badgePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, marginLeft: 2 },
  badgePillActive: { backgroundColor: '#eff6ff' },
  badgePillInactive: { backgroundColor: '#cbd5e1' },
  badgePillText: { fontSize: 11, fontWeight: 'bold' },
  badgePillTextActive: { color: '#1d4ed8' },
  badgePillTextInactive: { color: '#475569' },

  content: { paddingHorizontal: 20, paddingBottom: 40 },
  tabContent: { gap: 16 },

  // Search Box
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, paddingHorizontal: 16, height: 50, marginBottom: 4 },
  searchInput: { flex: 1, fontSize: 14, color: '#0f172a', fontWeight: '500' },

  list: { gap: 16 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#f1f5f9', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: { width: 60, height: 60, borderRadius: 16, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 24, fontWeight: '900', color: '#1d4ed8' },
  info: { flex: 1, marginLeft: 16 },
  docName: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  docSpecialty: { fontSize: 13, color: '#1d4ed8', fontWeight: 'bold', marginTop: 2, textTransform: 'uppercase' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  ratingText: { fontSize: 13, fontWeight: 'bold', color: '#475569' },
  
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginLeft: 8 },
  badgePending: { backgroundColor: '#fef3c7' },
  badgeTextPending: { color: '#d97706', fontSize: 10, fontWeight: 'bold' },
  badgeAccepted: { backgroundColor: '#d1fae5' },
  badgeTextAccepted: { color: '#059669', fontSize: 10, fontWeight: 'bold' },
  badgeRejected: { backgroundColor: '#ffe4e6' },
  badgeTextRejected: { color: '#e11d48', fontSize: 10, fontWeight: 'bold' },
  badgeCompleted: { backgroundColor: '#dbeafe' },
  badgeTextCompleted: { color: '#1d4ed8', fontSize: 10, fontWeight: 'bold' },

  cardActions: { flexDirection: 'row', gap: 12 },
  viewBtn: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  viewBtnText: { color: '#475569', fontSize: 14, fontWeight: 'bold' },
  bookBtn: { flex: 1, height: 44, borderRadius: 12, backgroundColor: '#1d4ed8', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  bookBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  pendingBtn: { backgroundColor: '#f59e0b' },
  pendingBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  chatBtn: { backgroundColor: '#10b981' },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 14, textAlign: 'center' },

  // Scheduled Visits Styles
  visitsHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  visitsTitle: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  visitsCountPill: { backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16, borderWidth: 1, borderColor: '#dbeafe' },
  visitsCountText: { color: '#1d4ed8', fontSize: 14, fontWeight: 'bold' },

  filterGroupLabel: { fontSize: 11, fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginTop: 4, marginBottom: 4 },
  filterScroll: { flexDirection: 'row', marginBottom: 8 },
  filterPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', marginRight: 8 },
  filterPillActive: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
  filterPillText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  filterPillTextActive: { color: '#fff', fontWeight: 'bold' },

  sortPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1', marginRight: 8 },
  sortPillActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  sortPillText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  sortPillTextActive: { color: '#fff', fontWeight: 'bold' },

  visitsList: { gap: 16, marginTop: 8 },
  visitCard: { backgroundColor: '#fff', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#f1f5f9', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  visitCardContent: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  dateBox: { width: 68, height: 68, borderRadius: 16, backgroundColor: '#eff6ff', borderContent: '#dbeafe', alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  dateBoxDay: { fontSize: 26, fontWeight: '900', color: '#1d4ed8', lineHeight: 28 },
  dateBoxMonth: { fontSize: 10, fontWeight: '900', color: '#1d4ed8', letterSpacing: 1, opacity: 0.8 },
  visitInfo: { flex: 1 },
  visitTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  visitDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  visitDetailText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  dotSeparator: { color: '#cbd5e1', fontSize: 12 },
  visitCardFooter: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f8fafc' },

  joinChatBtn: { backgroundColor: '#2563eb', height: 46, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#2563eb', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  joinChatBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  waitingNoteBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fffbeb', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#fef3c7' },
  waitingNoteText: { fontSize: 12, color: '#d97706', fontWeight: 'bold' },
  completedNoteBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f8fafc', padding: 10, borderRadius: 10 },
  completedNoteText: { fontSize: 12, color: '#64748b', fontWeight: 'bold' },

  // Booking Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', padding: 20 },
  bookingCard: { backgroundColor: '#fff', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
  bookingTitle: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  bookingSub: { fontSize: 14, color: '#1d4ed8', fontWeight: 'bold', marginTop: 4, marginBottom: 16 },
  bookingNotesLabel: { fontSize: 12, fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: 8 },
  bookingNotesInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 14, padding: 14, fontSize: 14, color: '#0f172a', textAlignVertical: 'top', minHeight: 90, marginBottom: 20 },
  bookingActionRow: { flexDirection: 'row', gap: 12 },
  cancelBookingBtn: { flex: 1, height: 48, borderRadius: 14, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
  cancelBookingBtnText: { color: '#475569', fontSize: 14, fontWeight: 'bold' },
  confirmBookingBtn: { flex: 1, height: 48, borderRadius: 14, backgroundColor: '#1d4ed8', alignItems: 'center', justifyContent: 'center' },
  confirmBookingBtnDisabled: { opacity: 0.6 },
  confirmBookingBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

  // Modal Styles
  modalContainer: { flex: 1, backgroundColor: '#f8fafc' },
  modalContent: { padding: 24, paddingBottom: 60 },
  closeBtn: { alignSelf: 'flex-end', padding: 8, backgroundColor: '#fff', borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  modalHeader: { alignItems: 'center', marginBottom: 28, marginTop: 10 },
  modalAvatar: { width: 90, height: 90, borderRadius: 28, marginBottom: 12 },
  modalAvatarText: { fontSize: 36, fontWeight: '900', color: '#1d4ed8' },
  modalName: { fontSize: 24, fontWeight: '900', color: '#0f172a', textAlign: 'center' },
  modalSpecialty: { fontSize: 13, color: '#1d4ed8', fontWeight: 'bold', textTransform: 'uppercase', marginTop: 4, letterSpacing: 1 },
  ratingBadgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: '#fffbeb', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16, borderWidth: 1, borderColor: '#fef3c7' },
  ratingBadgeText: { fontSize: 14, fontWeight: 'bold', color: '#92400e', marginLeft: 4 },
  reviewsCountText: { fontSize: 12, color: '#b45309', marginLeft: 4, fontWeight: '500' },
  
  section: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  sectionBody: { fontSize: 14, color: '#475569', lineHeight: 22 },
  educationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  gridItem: { width: '45%' },
  gridLabel: { fontSize: 11, color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 },
  gridValue: { fontSize: 14, color: '#334155', fontWeight: '500' },

  // Add Review & Review List Styles
  addReviewBox: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  addReviewTitle: { fontSize: 15, fontWeight: 'bold', color: '#0f172a', marginBottom: 8 },
  starRatingLabel: { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 4 },
  starRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  reviewInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, fontSize: 14, color: '#0f172a', minHeight: 70, textAlignVertical: 'top', marginBottom: 12 },
  submitReviewBtn: { backgroundColor: '#1d4ed8', height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  submitReviewBtnDisabled: { opacity: 0.6 },
  submitReviewBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  reviewsList: { gap: 12 },
  reviewCard: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#f1f5f9' },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  reviewerName: { fontSize: 14, fontWeight: 'bold', color: '#0f172a' },
  revStarRow: { flexDirection: 'row', gap: 2 },
  reviewComment: { fontSize: 13, color: '#475569', lineHeight: 18 },
  reviewDate: { fontSize: 11, color: '#94a3b8', marginTop: 6, alignSelf: 'flex-end' },
  noReviewsText: { fontSize: 13, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', paddingVertical: 12 }
});

export default DoctorConnectScreen;
