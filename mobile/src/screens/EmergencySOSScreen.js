import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  TouchableWithoutFeedback,
  TextInput, 
  Alert, 
  ActivityIndicator, 
  Animated,
  Platform,
  Linking
} from 'react-native';
import { ShieldAlert, Users, Phone, Plus, History, Loader2, MessageCircle, MessageSquare, Trash2 } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';

const EmergencySOSScreen = () => {
  const { user } = useSelector((state) => state.auth);
  const [guardians, setGuardians] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);

  // Form State
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [phone, setPhone] = useState('');

  // Micro-animations for the button press
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const holdInterval = useRef(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Fetch Guardians
      const { data: contacts, error: contactsError } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (contactsError) throw contactsError;
      setGuardians(contacts || []);

      // 2. Fetch Recent Alerts
      const { data: alerts, error: alertsError } = await supabase
        .from('insights')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'emergency')
        .order('created_at', { ascending: false })
        .limit(5);

      if (alertsError) throw alertsError;
      setRecentAlerts(alerts || []);

    } catch (error) {
      console.error('Error fetching SOS details:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle 3-second hold logic
  const handlePressIn = () => {
    if (sosLoading) return;
    setIsHolding(true);
    setHoldProgress(0);

    // Animate scale up
    Animated.timing(scaleAnim, {
      toValue: 1.15,
      duration: 3000,
      useNativeDriver: true,
    }).start();

    const startTime = Date.now();
    holdInterval.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / 3000) * 100);
      setHoldProgress(pct);

      if (elapsed >= 3000) {
        clearInterval(holdInterval.current);
        handleTriggerSOS();
      }
    }, 50);
  };

  const handlePressOut = () => {
    if (holdInterval.current) {
      clearInterval(holdInterval.current);
    }
    if (!sosLoading) {
      setIsHolding(false);
      setHoldProgress(0);
      
      // Animate scale back down
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleTriggerSOS = async () => {
    setIsHolding(false);
    setHoldProgress(0);
    setSosLoading(true);

    // Spring animation to return to normal size
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();

    try {
      let locationString = 'Location Not Shared';
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          locationString = `https://google.com/maps?q=${loc.coords.latitude},${loc.coords.longitude}`;
        }
      } catch (locError) {
        console.error('Error fetching GPS coordinates:', locError);
      }
      const API_URL = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://localhost:5000/api');

      const response = await fetch(`${API_URL}/sos/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          location: locationString
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to dispatch notifications');

      let alertMsg = 'EMERGENCY SOS REGISTERED!\n\n';
      if (data.twilioConfigured) {
        alertMsg += `Successfully notified ${data.contactsCount} guardian(s) via SMS and WhatsApp.`;
      } else {
        alertMsg += `Logged in database, but Twilio is not configured on the server.\nGuardians: ${guardians.map(g => g.name).join(', ')}`;
      }
      Alert.alert('SOS Triggered', alertMsg);
      fetchData();
    } catch (error) {
      console.error('SOS Trigger Error:', error);
      Alert.alert('SOS logged', 'SOS logged in database, but failed to notify guardians: ' + error.message);
      fetchData();
    } finally {
      setSosLoading(false);
    }
  };

  const handleAddGuardian = async () => {
    if (!name || !relationship || !phone) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('emergency_contacts')
        .insert([
          {
            user_id: user.id,
            name,
            relationship,
            phone_number: phone,
            is_active: true
          }
        ]);

      if (error) throw error;
      Alert.alert('Success', 'Guardian added successfully');
      setName('');
      setRelationship('');
      setPhone('');
      fetchData();
    } catch (error) {
      console.error('Error adding guardian:', error);
      Alert.alert('Error', 'Failed to save guardian contact');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGuardian = async (guardianId, guardianName) => {
    Alert.alert(
      'Delete Contact',
      `Are you sure you want to remove ${guardianName} from your emergency contacts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('emergency_contacts')
                .delete()
                .eq('id', guardianId);

              if (error) throw error;
              Alert.alert('Success', 'Contact removed successfully');
              fetchData();
            } catch (error) {
              console.error('Error deleting guardian:', error);
              Alert.alert('Error', 'Failed to delete contact');
            }
          }
        }
      ]
    );
  };

  const handleWhatsAppContact = (guardian) => {
    const message = `EMERGENCY ALERT: ${user?.user_metadata?.full_name || 'User'} has activated their AuraHealth SOS. Please check on them immediately!`;
    const url = `whatsapp://send?phone=${guardian.phone_number}&text=${encodeURIComponent(message)}`;
    
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        // Fallback to web link
        Linking.openURL(`https://wa.me/${guardian.phone_number}?text=${encodeURIComponent(message)}`);
      }
    });
  };

  const handleSMSContact = (guardian) => {
    const message = `EMERGENCY ALERT: Please check on me immediately!`;
    const separator = Platform.OS === 'ios' ? '&' : '?';
    const url = `sms:${guardian.phone_number}${separator}body=${encodeURIComponent(message)}`;
    Linking.openURL(url);
  };

  const handleCallContact = (guardian) => {
    Linking.openURL(`tel:${guardian.phone_number}`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 3-Second Hold Alert Card */}
      <View style={styles.sosCard}>
        <TouchableWithoutFeedback 
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={sosLoading}
        >
          <Animated.View style={[
            styles.sosBtnCircle, 
            { transform: [{ scale: scaleAnim }] },
            sosLoading && styles.sosBtnLoading,
            isHolding && styles.sosBtnHolding
          ]}>
            {sosLoading ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : (
              <View style={styles.sosBtnInner}>
                <ShieldAlert size={80} color="#fff" />
              </View>
            )}
            
            {/* Visual Progress ring overlay */}
            {!sosLoading && isHolding && (
              <View style={[styles.progressOverlay, { height: `${holdProgress}%` }]} />
            )}
          </Animated.View>
        </TouchableWithoutFeedback>
        
        <Text style={styles.sosTitle}>
          {sosLoading ? 'Sending Alerts...' : isHolding ? `Hold for ${((3000 - (holdProgress * 30)) / 1000).toFixed(1)}s` : 'Press & Hold SOS'}
        </Text>
        <Text style={styles.sosSubtitle}>
          Keep your finger held down for 3 seconds to immediately alert all guardians.
        </Text>
      </View>

      {/* Guardians Management */}
      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>My Guardians</Text>
        
        {loading ? (
          <ActivityIndicator size="small" color="#1d4ed8" style={{ marginVertical: 20 }} />
        ) : guardians.length > 0 ? (
          <View style={styles.contactsList}>
            {guardians.map((g) => (
              <View key={g.id} style={styles.contactCard}>
                {/* Top Row: Info and Delete */}
                <View style={styles.contactTopRow}>
                  <View style={styles.contactAvatarContainer}>
                    <Text style={styles.avatarText}>{g.name.slice(0, 2).toUpperCase()}</Text>
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{g.name}</Text>
                    <Text style={styles.contactRelation}>{g.relationship.toUpperCase()}</Text>
                    <Text style={styles.contactPhone}>{g.phone_number}</Text>
                  </View>
                  <TouchableOpacity style={styles.deleteIconBtn} onPress={() => handleDeleteGuardian(g.id, g.name)}>
                    <Trash2 size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>

                {/* Bottom Row: Communication Actions */}
                <View style={styles.contactActionsGrid}>
                  <TouchableOpacity style={[styles.gridActionBtn, styles.callBtn]} onPress={() => handleCallContact(g)}>
                    <Phone size={14} color="#475569" />
                    <Text style={[styles.gridActionText, styles.callText]}>Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.gridActionBtn, styles.waBtn]} onPress={() => handleWhatsAppContact(g)}>
                    <MessageCircle size={14} color="#16a34a" />
                    <Text style={[styles.gridActionText, styles.waText]}>WhatsApp</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.gridActionBtn, styles.smsBtn]} onPress={() => handleSMSContact(g)}>
                    <MessageSquare size={14} color="#2563eb" />
                    <Text style={[styles.gridActionText, styles.smsText]}>SMS</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No emergency contacts added yet.</Text>
        )}
      </View>

      {/* Add Guardian Form */}
      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Add Emergency Contact</Text>
        <View style={styles.form}>
          <TextInput
            placeholder="Full Name"
            placeholderTextColor="#94a3b8"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />
          <TextInput
            placeholder="Relationship (e.g. Spouse, Parent)"
            placeholderTextColor="#94a3b8"
            value={relationship}
            onChangeText={setRelationship}
            style={styles.input}
          />
          <TextInput
            placeholder="Phone Number (e.g. +1234567890)"
            placeholderTextColor="#94a3b8"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={styles.input}
          />
          <TouchableOpacity style={styles.addBtn} onPress={handleAddGuardian} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Plus size={18} color="#fff" />
                <Text style={styles.addBtnText}>Add Contact</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Alerts */}
      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Recent Alerts Log</Text>
        {recentAlerts.length > 0 ? (
          recentAlerts.map((alert) => (
            <View key={alert.id} style={styles.alertRow}>
              <History size={16} color="#ef4444" style={styles.alertIcon} />
              <View style={styles.alertInfo}>
                <Text style={styles.alertText}>{alert.content}</Text>
                <Text style={styles.alertTime}>{new Date(alert.created_at).toLocaleString()}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No recent alerts triggered.</Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 40 },
  sosCard: { backgroundColor: '#fef2f2', borderRadius: 24, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#fee2e2', marginBottom: 20 },
  sosBtnCircle: { width: 170, height: 170, borderRadius: 85, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: '#ef4444', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, overflow: 'hidden' },
  sosBtnHolding: { backgroundColor: '#dc2626' },
  sosBtnLoading: { backgroundColor: '#94a3b8' },
  sosBtnInner: { width: 150, height: 150, borderRadius: 75, borderStyle: 'solid', borderWidth: 4, borderColor: 'rgba(255, 255, 255, 0.3)', alignItems: 'center', justifyContent: 'center' },
  progressOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(255, 255, 255, 0.25)' },
  sosTitle: { fontSize: 22, fontWeight: '900', color: '#dc2626', marginTop: 20, uppercase: true, letterSpacing: 0.5, minHeight: 30 },
  sosSubtitle: { fontSize: 13, color: '#b91c1c', opacity: 0.7, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  sectionCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#f1f5f9', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, marginBottom: 20 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 16 },
  contactsList: { gap: 12 },
  contactCard: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 4 },
  contactTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  contactAvatarContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  contactInfo: { flex: 1, marginLeft: 12 },
  contactName: { fontSize: 15, fontWeight: 'bold', color: '#0f172a' },
  contactRelation: { fontSize: 10, color: '#64748b', fontWeight: 'bold', marginTop: 1 },
  contactPhone: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  deleteIconBtn: { padding: 6, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#fee2e2' },
  contactActionsGrid: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 },
  gridActionBtn: { flex: 1, height: 36, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  callBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  callText: { color: '#475569' },
  waBtn: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#d1fae5' },
  waText: { color: '#16a34a' },
  smsBtn: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#d1e4ff' },
  smsText: { color: '#2563eb' },
  gridActionText: { fontSize: 11, fontWeight: 'bold' },
  emptyText: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginVertical: 10 },
  form: { gap: 10 },
  input: { height: 46, backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 16, borderStyle: 'solid', borderWidth: 1, borderColor: '#e2e8f0', color: '#0f172a', fontSize: 14 },
  addBtn: { height: 46, backgroundColor: '#1d4ed8', borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  alertRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  alertIcon: { marginRight: 12 },
  alertInfo: { flex: 1 },
  alertText: { fontSize: 13, color: '#334155', fontWeight: '500' },
  alertTime: { fontSize: 11, color: '#94a3b8', marginTop: 2 }
});

export default EmergencySOSScreen;
