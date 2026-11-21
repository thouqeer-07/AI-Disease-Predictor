import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform, 
  ActivityIndicator,
  Alert,
  Modal,
  } from 'react-native';
import { 
  Send, 
  ArrowLeft, 
  Clock, 
  Calendar, 
  Video, 
  Phone, 
  Lock, 
  CheckCircle2, 
  MoreVertical,
  ShieldCheck
} from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { supabase } from '../lib/supabase';

const ConsultationChatScreen = ({ route, navigation }) => {
  const { appointmentId } = route.params || {};
  const { user } = useSelector((state) => state.auth);

  const [appointment, setAppointment] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Call schedule state
  const [callType, setCallType] = useState('Video');
  const [callDate, setCallDate] = useState('');
  const [callTime, setCallTime] = useState('');
  const [schedulingCall, setSchedulingCall] = useState(false);

  const scrollViewRef = useRef(null);

  const fetchData = useCallback(async () => {
    if (!appointmentId || !user) return;
    setLoading(true);
    try {
      // 1. Fetch Appointment Details
      const { data: appt, error: apptError } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();

      if (apptError) throw apptError;
      setAppointment(appt);

      // 2. Fetch Initial Messages
      const { data: msgs, error: msgsError } = await supabase
        .from('messages')
        .select('*')
        .eq('appointment_id', appointmentId)
        .order('created_at', { ascending: true });

      if (msgsError) throw msgsError;
      setMessages(msgs || []);
    } catch (err) {
      console.error('Error loading consultation chat:', err);
      Alert.alert('Error', 'Unable to load consultation session.');
    } finally {
      setLoading(false);
    }
  }, [appointmentId, user]);

  useEffect(() => {
    fetchData();

    if (!appointmentId) return;

    // Real-time message listener
    const messageSub = supabase
      .channel(`chat:messages:${appointmentId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `appointment_id=eq.${appointmentId}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    // Real-time appointment status listener
    const apptSub = supabase
      .channel(`chat:appointment:${appointmentId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'appointments',
        filter: `id=eq.${appointmentId}`
      }, (payload) => {
        setAppointment(payload.new);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messageSub);
      supabase.removeChannel(apptSub);
    };
  }, [appointmentId, fetchData]);

  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending || !appointment) return;

    setSending(true);
    const receiverId = user.id === appointment.user_id ? appointment.doctor_id : appointment.user_id;

    try {
      const { error } = await supabase.from('messages').insert([{
        appointment_id: appointmentId,
        sender_id: user.id,
        receiver_id: receiverId,
        content: newMessage.trim()
      }]);

      if (error) throw error;
      setNewMessage('');
    } catch (err) {
      console.error('Send message error:', err);
      Alert.alert('Error', 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const handleScheduleCallSubmit = async () => {
    if (!callDate || !callTime) {
      Alert.alert('Validation Error', 'Please specify both date (YYYY-MM-DD) and time (HH:MM).');
      return;
    }

    setSchedulingCall(true);
    try {
      const combinedDateTime = new Date(`${callDate}T${callTime}`);
      const callNotes = `[Call: ${callType}]`;
      const updatedNotes = appointment.notes ? `${appointment.notes}\n${callNotes}` : callNotes;

      // 1. Update appointment record
      const { error: apptErr } = await supabase
        .from('appointments')
        .update({
          appointment_date: combinedDateTime.toISOString(),
          notes: updatedNotes
        })
        .eq('id', appointmentId);

      if (apptErr) throw apptErr;

      // 2. Insert system notification message into chat stream
      const receiverId = user.id === appointment.user_id ? appointment.doctor_id : appointment.user_id;
      const formattedDateTime = combinedDateTime.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
      const systemMsgContent = `📅 Scheduled a ${callType} Call for ${formattedDateTime}`;

      const { error: msgErr } = await supabase.from('messages').insert([{
        appointment_id: appointmentId,
        sender_id: user.id,
        receiver_id: receiverId,
        content: systemMsgContent
      }]);

      if (msgErr) throw msgErr;

      setAppointment(prev => ({
        ...prev,
        appointment_date: combinedDateTime.toISOString(),
        notes: updatedNotes
      }));

      setShowScheduleModal(false);
      setCallDate('');
      setCallTime('');
      Alert.alert('Call Scheduled', `Your ${callType} consultation call has been scheduled.`);
    } catch (err) {
      console.error('Schedule Call error:', err);
      Alert.alert('Error', 'Failed to schedule consultation call.');
    } finally {
      setSchedulingCall(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1d4ed8" />
        <Text style={styles.loadingText}>Initializing Secure Consultation Room...</Text>
      </SafeAreaView>
    );
  }

  if (!appointment) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.errorText}>Appointment not found.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Lifecycle State 1: Locked Screen (status pending or rejected)
  if (appointment.status !== 'accepted' && appointment.status !== 'completed') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.lockedHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconCircle}>
            <ArrowLeft size={20} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.lockedHeaderTitle}>Consultation Status</Text>
        </View>

        <View style={styles.lockedCard}>
          <View style={styles.lockedIconWrapper}>
            <Clock size={40} color="#d97706" />
          </View>
          <Text style={styles.lockedTitle}>Consultation Room Locked</Text>
          <Text style={styles.lockedSubtitle}>
            This private consultation room will automatically unlock once the doctor approves your appointment request.
          </Text>

          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>
              STATUS: <Text style={{ color: '#d97706', fontWeight: '900' }}>{appointment.status.toUpperCase()}</Text>
            </Text>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryBtnText}>Return to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const otherPersonName = user.id === appointment.user_id 
    ? `Dr. ${appointment.doctor_name || 'Doctor'}` 
    : (appointment.patient_name || 'Patient');

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 90}
      >
        {/* Room Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backTouch}>
              <ArrowLeft size={22} color="#0f172a" />
            </TouchableOpacity>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarLetter}>{otherPersonName.charAt(0)}</Text>
            </View>
            <View>
              <Text style={styles.headerTitle}>{otherPersonName}</Text>
              <View style={styles.secureBadge}>
                <View style={styles.greenDot} />
                <Text style={styles.secureText}>SECURE CONVERSATION</Text>
              </View>
            </View>
          </View>

          {appointment.status !== 'completed' && (
            <TouchableOpacity 
              style={styles.scheduleBtn} 
              onPress={() => {
                const today = new Date().toISOString().split('T')[0];
                setCallDate(today);
                setCallTime('10:00');
                setShowScheduleModal(true);
              }}
            >
              <Calendar size={16} color="#1d4ed8" />
              <Text style={styles.scheduleBtnText}>Schedule Call</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Message Stream */}
        <ScrollView 
          ref={scrollViewRef} 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((msg) => {
            const isMe = msg.sender_id === user.id;
            const isSystemMsg = msg.content?.includes('📅');

            if (isSystemMsg) {
              return (
                <View key={msg.id} style={styles.systemMsgContainer}>
                  <View style={styles.systemMsgBubble}>
                    <Calendar size={16} color="#1d4ed8" />
                    <Text style={styles.systemMsgText}>{msg.content}</Text>
                  </View>
                </View>
              );
            }

            return (
              <View key={msg.id} style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}>
                <View style={[styles.msgBubble, isMe ? styles.msgBubbleMe : styles.msgBubbleOther]}>
                  <Text style={[styles.msgText, isMe ? styles.msgTextMe : styles.msgTextOther]}>
                    {msg.content}
                  </Text>
                  <Text style={[styles.timeText, isMe ? styles.timeTextMe : styles.timeTextOther]}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Bottom Input or Completed Archival Banner */}
        {appointment.status === 'completed' ? (
          <View style={styles.completedBanner}>
            <View style={styles.completedTag}>
              <CheckCircle2 size={12} color="#059669" />
              <Text style={styles.completedTagText}>CONSULTATION COMPLETED</Text>
            </View>
            <Text style={styles.completedSubtext}>
              This consultation has concluded. The chat is in read-only archive mode.
            </Text>
            {user.id === appointment.user_id && (
              <TouchableOpacity 
                style={styles.bookAgainBtn}
                onPress={() => navigation.navigate('MainTabs', { screen: 'Connect' })}
              >
                <Text style={styles.bookAgainText}>Book Another Consultation</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type your clinical message..."
              placeholderTextColor="#94a3b8"
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
            />
            <TouchableOpacity 
              style={[styles.sendBtn, (!newMessage.trim() || sending) && styles.sendBtnDisabled]}
              onPress={handleSendMessage}
              disabled={!newMessage.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Send size={18} color="#ffffff" />
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Schedule Call Modal */}
        <Modal
          visible={showScheduleModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowScheduleModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Schedule Consultation Call</Text>
              <Text style={styles.modalSubtitle}>Set up a video or audio call for this appointment.</Text>

              <Text style={styles.fieldLabel}>CALL TYPE</Text>
              <View style={styles.callTypeRow}>
                <TouchableOpacity 
                  style={[styles.typeOption, callType === 'Video' && styles.typeOptionActive]}
                  onPress={() => setCallType('Video')}
                >
                  <Video size={18} color={callType === 'Video' ? '#1d4ed8' : '#64748b'} />
                  <Text style={[styles.typeOptionText, callType === 'Video' && styles.typeOptionTextActive]}>Video Call</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.typeOption, callType === 'Audio' && styles.typeOptionActive]}
                  onPress={() => setCallType('Audio')}
                >
                  <Phone size={18} color={callType === 'Audio' ? '#1d4ed8' : '#64748b'} />
                  <Text style={[styles.typeOptionText, callType === 'Audio' && styles.typeOptionTextActive]}>Audio Call</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>DATE (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="2026-08-10"
                placeholderTextColor="#94a3b8"
                value={callDate}
                onChangeText={setCallDate}
              />

              <Text style={styles.fieldLabel}>TIME (HH:MM)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="10:30"
                placeholderTextColor="#94a3b8"
                value={callTime}
                onChangeText={setCallTime}
              />

              <View style={styles.modalActionRow}>
                <TouchableOpacity 
                  style={styles.cancelBtn} 
                  onPress={() => setShowScheduleModal(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.submitBtn} 
                  onPress={handleScheduleCallSubmit}
                  disabled={schedulingCall}
                >
                  {schedulingCall ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.submitBtnText}>Schedule Call</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  loadingText: { marginTop: 12, color: '#64748b', fontWeight: 'bold' },
  errorText: { fontSize: 16, color: '#ef4444', fontWeight: 'bold' },
  backBtn: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#1d4ed8', borderRadius: 10 },
  backBtnText: { color: '#ffffff', fontWeight: 'bold' },

  lockedHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 12 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  lockedHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  lockedCard: { margin: 20, padding: 24, backgroundColor: '#ffffff', borderRadius: 24, alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9', elevation: 2 },
  lockedIconWrapper: { width: 72, height: 72, borderRadius: 24, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  lockedTitle: { fontSize: 22, fontWeight: '900', color: '#0f172a', textAlign: 'center' },
  lockedSubtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  statusPill: { marginTop: 16, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fef3c7', borderRadius: 12 },
  statusPillText: { fontSize: 12, fontWeight: 'bold', color: '#b45309' },
  primaryBtn: { marginTop: 24, width: '100%', height: 48, backgroundColor: '#1d4ed8', borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backTouch: { padding: 6 },
  avatarCircle: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 18, fontWeight: 'bold', color: '#1d4ed8' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  secureBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  greenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981' },
  secureText: { fontSize: 9, fontWeight: '900', color: '#10b981', letterSpacing: 0.5 },
  scheduleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#eff6ff', borderRadius: 10, borderWidth: 1, borderColor: '#bfdbfe' },
  scheduleBtnText: { fontSize: 12, fontWeight: 'bold', color: '#1d4ed8' },

  scrollContent: { padding: 16, gap: 12, paddingBottom: 24 },
  msgRow: { flexDirection: 'row' },
  msgRowMe: { justifyContent: 'flex-end' },
  msgRowOther: { justifyContent: 'flex-start' },
  msgBubble: { maxWidth: '78%', padding: 12, borderRadius: 16 },
  msgBubbleMe: { backgroundColor: '#1d4ed8', borderBottomRightRadius: 2 },
  msgBubbleOther: { backgroundColor: '#e2e8f0', borderBottomLeftRadius: 2 },
  msgText: { fontSize: 14, lineHeight: 20 },
  msgTextMe: { color: '#ffffff' },
  msgTextOther: { color: '#0f172a' },
  timeText: { fontSize: 9, marginTop: 4 },
  timeTextMe: { color: 'rgba(255,255,255,0.7)', textAlign: 'right' },
  timeTextOther: { color: '#64748b', textAlign: 'left' },

  systemMsgContainer: { alignItems: 'center', marginVertical: 8 },
  systemMsgBubble: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#eff6ff', borderRadius: 12, borderWidth: 1, borderColor: '#bfdbfe' },
  systemMsgText: { fontSize: 12, fontWeight: 'bold', color: '#1d4ed8' },

  completedBanner: { padding: 16, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#f1f5f9', alignItems: 'center' },
  completedTag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: '#d1fae5', borderRadius: 8 },
  completedTagText: { fontSize: 10, fontWeight: '900', color: '#059669' },
  completedSubtext: { fontSize: 12, color: '#64748b', marginTop: 6, textAlign: 'center' },
  bookAgainBtn: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#1d4ed8', borderRadius: 10 },
  bookAgainText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },

  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#f1f5f9', gap: 10 },
  input: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#0f172a', maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#1d4ed8', alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#94a3b8' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#ffffff', borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  modalSubtitle: { fontSize: 13, color: '#64748b', marginTop: 4, marginBottom: 16 },
  fieldLabel: { fontSize: 11, fontWeight: '900', color: '#64748b', marginBottom: 6, marginTop: 10 },
  callTypeRow: { flexDirection: 'row', gap: 10 },
  typeOption: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#f8fafc' },
  typeOptionActive: { borderColor: '#1d4ed8', backgroundColor: '#eff6ff' },
  typeOptionText: { fontSize: 13, fontWeight: 'bold', color: '#64748b' },
  typeOptionTextActive: { color: '#1d4ed8' },
  modalInput: { height: 44, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 12, fontSize: 14, color: '#0f172a', backgroundColor: '#f8fafc' },
  modalActionRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontWeight: 'bold', color: '#64748b' },
  submitBtn: { flex: 1, height: 44, borderRadius: 10, backgroundColor: '#1d4ed8', alignItems: 'center', justifyContent: 'center' },
  submitBtnText: { fontWeight: 'bold', color: '#ffffff' }
});

export default ConsultationChatScreen;
