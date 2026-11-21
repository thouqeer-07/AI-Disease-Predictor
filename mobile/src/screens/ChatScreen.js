import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Dimensions,
  } from 'react-native';
import { Send, Bot, User as UserIcon, Plus, Clock, Loader2, Paperclip, FileText, X, CheckCircle } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../lib/supabase';
import { fetchApiWithFallback } from '../lib/api';

const { width } = Dimensions.get('window');

// Native dependency-free UUID Generator
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const ChatScreen = () => {
  const { user } = useSelector((state) => state.auth);
  const [messages, setMessages] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(generateUUID());
  
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fetchingHistory, setFetchingHistory] = useState(false);
  const [activeDocument, setActiveDocument] = useState(null);

  const scrollViewRef = useRef(null);

  const handleAttachPdf = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const file = result.assets[0];
      setUploading(true);

      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name || 'medical_report.pdf',
        type: 'application/pdf'
      });

      // Upload PDF to backend RAG indexing endpoint using FormData
      const data = await fetchApiWithFallback('/ai/upload-report', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        }
      });

      if (data && data.status === 'success') {
        const docInfo = {
          id: data.documentId,
          name: data.fileName || file.name,
          chunks: data.totalChunks,
          pages: data.totalPages
        };
        setActiveDocument(docInfo);

        const initialBotMsg = {
          role: 'bot',
          content: `📄 Medical Report Processed & Analyzed\n\nFile: ${docInfo.name}\nStructure: ${docInfo.pages} Pages • ${docInfo.chunks} Processed Sections\n\n--------------------\n🩺 Initial Medical Report Analysis:\n${data.initialAnalysis || data.summaryPreview}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        const userUploadMsg = {
          role: 'user',
          content: `[Uploaded PDF Medical Report: ${file.name}]`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, userUploadMsg, initialBotMsg]);

        if (user) {
          await supabase.from('chat_history').insert([
            { user_id: user.id, session_id: currentSessionId, role: 'user', content: userUploadMsg.content },
            { user_id: user.id, session_id: currentSessionId, role: 'bot', content: initialBotMsg.content }
          ]);
          await loadHistory();
        }
      } else {
        Alert.alert("Upload Notice", data.error || "Could not process PDF report.");
      }

    } catch (err) {
      console.error("Document picking error:", err);
      // Fallback demo option if native picker encounters system restriction
      Alert.alert(
        'Upload PDF Medical Report',
        'Would you like to analyze a sample Medical Lab Report?',
        [
          {
            text: 'Simulate Analysis',
            onPress: () => simulatePdfIndexing()
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } finally {
      setUploading(false);
    }
  };

  const simulatePdfIndexing = async () => {
    setUploading(true);
    try {
      const samplePdfText = "PATIENT: John Doe | LAB REPORT: Complete Blood Count (CBC) & Lipid Panel | Hemoglobin: 14.2 g/dL (Normal 13.5-17.5) | WBC: 6.8 K/uL (Normal 4.5-11.0) | Total Cholesterol: 215 mg/dL (Borderline High >200) | HDL: 45 mg/dL | LDL: 138 mg/dL (Optimal <100) | Fasting Blood Sugar: 95 mg/dL (Normal 70-99). RECOMMENDATIONS: Reduce saturated fats, maintain 30 mins exercise daily.";
      
      const docId = `sim_${Date.now()}`;
      const docInfo = {
        id: docId,
        name: 'CBC_Lipid_Panel_Report.pdf',
        chunks: 4,
        pages: 1
      };
      setActiveDocument(docInfo);

      const botMsg = {
        role: 'bot',
        content: `📄 Medical Report Processed & Analyzed\n\nFile: ${docInfo.name}\nStructure: 1 Page • 4 Processed Sections\n\n--------------------\n🩺 Initial Medical Report Analysis:\nYour Complete Blood Count (CBC) and Fasting Glucose are in normal ranges. Your LDL Cholesterol (138 mg/dL) is slightly elevated. Dietary adjustments and exercise are recommended.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, {
        role: 'user',
        content: `[Uploaded PDF Medical Report: ${docInfo.name}]`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }, botMsg]);

    } finally {
      setUploading(false);
    }
  };

  const loadHistory = useCallback(async (isInitialLoad = false) => {
    if (!user) return;
    setFetchingHistory(true);
    try {
      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;

      if (data && data.length > 0) {
        const grouped = data.reduce((acc, m) => {
          const sid = m.session_id;
          if (!acc[sid]) acc[sid] = [];
          acc[sid].push(m);
          return acc;
        }, {});
        
        const sessionEntries = Object.entries(grouped).sort((a, b) => {
          return new Date(b[1][0].created_at) - new Date(a[1][0].created_at);
        });

        setSessions(sessionEntries);

        // Only restore latest session if initially loading component and no active messages
        if (isInitialLoad && sessionEntries.length > 0) {
          const [latestSid, latestMsgs] = sessionEntries[0];
          setCurrentSessionId(latestSid);
          setMessages(latestMsgs.map(m => ({
            role: m.role,
            content: m.content,
            time: new Date(m.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          })));
        }
      } else {
        setSessions([]);
        if (isInitialLoad && messages.length === 0) {
          startNewChat();
        }
      }
    } catch (err) {
      console.error('Error fetching chat history:', err);
    } finally {
      setFetchingHistory(false);
    }
  }, [user]);

  const startNewChat = () => {
    const newSid = generateUUID();
    setCurrentSessionId(newSid);
    setActiveDocument(null);
    setMessages([{
      isGreeting: true,
      role: 'bot',
      content: "Hello! I am your AI Medical Assistant. Ask me health questions or tap the paperclip icon to upload a PDF medical report!",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
  };

  const loadSession = (sid, msgs) => {
    setCurrentSessionId(sid);
    setMessages(msgs.map(m => ({
      role: m.role,
      content: m.content,
      time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    })));
  };

  const deleteSession = (sid) => {
    Alert.alert(
      "Delete History",
      "Are you sure you want to delete this consultation history?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              if (user) {
                await supabase.from('chat_history').delete().eq('session_id', sid).eq('user_id', user.id);
              }
              setSessions(prev => prev.filter(([id]) => id !== sid));
              if (currentSessionId === sid) {
                startNewChat();
              }
            } catch (err) {
              console.error("Error deleting chat history:", err);
              Alert.alert("Error", "Failed to delete chat history.");
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    loadHistory(true);
  }, [user]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsgText = input;
    const targetSid = currentSessionId;
    setInput('');

    const userMessage = {
      role: 'user',
      content: userMsgText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      if (user) {
        await supabase.from('chat_history').insert([
          { user_id: user.id, session_id: targetSid, role: 'user', content: userMsgText }
        ]);
        await loadHistory(false);
      }

      // Post to AI backend chat endpoint via fallback API client
      const data = await fetchApiWithFallback('/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMsgText,
          documentId: activeDocument?.id,
          history: messages.filter(m => !m.isGreeting && m.content).map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
          }))
        })
      });

      const botResponse = data.response || "I'm sorry, I couldn't process that query.";

      if (user) {
        await supabase.from('chat_history').insert([
          { user_id: user.id, session_id: targetSid, role: 'bot', content: botResponse }
        ]);
        await loadHistory(false);
      }

      const botMessage = {
        role: 'bot',
        content: botResponse,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'bot',
        content: "I'm having trouble connecting to the AI diagnostic service. Please make sure backend server is running.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 90}
      >
        {/* Top History Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.newChatBtn} onPress={startNewChat}>
            <Plus size={18} color="#1d4ed8" />
            <Text style={styles.newChatBtnText}>New</Text>
          </TouchableOpacity>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.historyScroll}>
            {sessions.map(([sid, msgs]) => (
              <TouchableOpacity 
                key={sid} 
                style={[styles.historyItem, currentSessionId === sid && styles.historyItemActive]}
                onPress={() => loadSession(sid, msgs)}
                onLongPress={() => deleteSession(sid)}
              >
                <Clock size={12} color={currentSessionId === sid ? '#1d4ed8' : '#64748b'} />
                <Text style={[styles.historyItemText, currentSessionId === sid && styles.historyItemTextActive]} numberOfLines={1}>
                  {msgs.find(m => m.role === 'user')?.content || "Consultation"}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Messages list */}
        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={styles.chatContainer}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg, idx) => (
            <View key={idx} style={[styles.messageRow, msg.role === 'user' ? styles.messageRowUser : styles.messageRowBot]}>
              <View style={[styles.avatar, msg.role === 'user' ? styles.avatarUser : styles.avatarBot]}>
                {msg.role === 'bot' ? <Bot size={18} color="#1d4ed8" /> : <UserIcon size={18} color="#64748b" />}
              </View>
              <View style={[styles.bubble, msg.role === 'user' ? styles.bubbleUser : styles.bubbleBot]}>
                <Text style={[styles.messageText, msg.role === 'user' && styles.messageTextUser]}>
                  {msg.content
                    .replace(/^###\s*/gm, '📌 ')
                    .replace(/^##\s*/gm, '🔹 ')
                    .replace(/^#\s*/gm, '📊 ')
                    .replace(/^---\s*$/gm, '──────────────')
                    .replace(/\*\*(.*?)\*\*/g, '$1')}
                </Text>
                <Text style={[styles.msgTime, msg.role === 'user' ? styles.msgTimeUser : styles.msgTimeBot]}>{msg.time}</Text>
              </View>
            </View>
          ))}
          
          {loading && (
            <View style={[styles.messageRow, styles.messageRowBot]}>
              <View style={[styles.avatar, styles.avatarBot]}>
                <Bot size={18} color="#1d4ed8" />
              </View>
              <View style={[styles.bubble, styles.bubbleBot]}>
                <ActivityIndicator size="small" color="#1d4ed8" />
                <Text style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Analyzing medical report...</Text>
              </View>
            </View>
          )}
        </ScrollView>
        
        {/* Active PDF Badge if selected */}
        {activeDocument && (
          <View style={styles.pdfBadgeContainer}>
            <View style={styles.pdfBadgeContent}>
              <FileText size={16} color="#1d4ed8" />
              <Text style={styles.pdfBadgeText} numberOfLines={1}>
                Active Report: {activeDocument.name} ({activeDocument.chunks} sections)
              </Text>
            </View>
            <TouchableOpacity onPress={() => setActiveDocument(null)} style={styles.removePdfBtn}>
              <X size={14} color="#64748b" />
            </TouchableOpacity>
          </View>
        )}

        {/* Chat input box */}
        <View style={styles.inputArea}>
          <TouchableOpacity 
            style={styles.attachBtn} 
            onPress={handleAttachPdf}
            activeOpacity={0.7}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#1d4ed8" />
            ) : (
              <Paperclip size={20} color="#1d4ed8" />
            )}
          </TouchableOpacity>

          <TextInput 
            placeholder={activeDocument ? `Ask about ${activeDocument.name}...` : "Type symptoms or ask questions..."} 
            placeholderTextColor="#94a3b8"
            style={styles.input} 
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSend}
            editable={!loading}
            onFocus={() => {
              setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
              }, 200);
            }}
          />

          <TouchableOpacity 
            style={[styles.sendBtn, (!input.trim()) && styles.sendBtnDisabled]} 
            onPress={handleSend}
            disabled={!input.trim() || loading}
          >
            <Send size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  topBar: { flexDirection: 'row', gap: 10, padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#fff', alignItems: 'center' },
  newChatBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#bfdbfe' },
  newChatBtnText: { fontSize: 13, fontWeight: 'bold', color: '#1d4ed8' },
  historyScroll: { flex: 1 },
  historyItem: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f8fafc', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginRight: 8, borderWidth: 1, borderColor: '#f1f5f9', maxWidth: 140 },
  historyItemActive: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  historyItemText: { fontSize: 12, color: '#64748b', fontWeight: 'bold' },
  historyItemTextActive: { color: '#1d4ed8' },
  chatContainer: { padding: 16, paddingBottom: 24, flexGrow: 1 },
  messageRow: { flexDirection: 'row', gap: 10, marginBottom: 16, maxWidth: '85%' },
  messageRowBot: { alignSelf: 'flex-start' },
  messageRowUser: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  avatar: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', shrink: 0 },
  avatarBot: { backgroundColor: '#eff6ff' },
  avatarUser: { backgroundColor: '#f1f5f9' },
  bubble: { padding: 14, borderRadius: 16, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  bubbleBot: { backgroundColor: '#fff', borderTopLeftRadius: 0, borderWidth: 1, borderColor: '#f1f5f9' },
  bubbleUser: { backgroundColor: '#1d4ed8', borderTopRightRadius: 0 },
  messageText: { fontSize: 15, color: '#1e293b', lineHeight: 22, fontWeight: '500' },
  messageTextUser: { color: '#fff' },
  msgTime: { fontSize: 9, marginTop: 6 },
  msgTimeBot: { color: '#94a3b8' },
  msgTimeUser: { color: 'rgba(255,255,255,0.6)', alignSelf: 'flex-end' },
  pdfBadgeContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#eff6ff', borderTopWidth: 1, borderTopColor: '#bfdbfe', paddingHorizontal: 16, paddingVertical: 8 },
  pdfBadgeContent: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  pdfBadgeText: { fontSize: 13, fontWeight: '600', color: '#1d4ed8', flex: 1 },
  removePdfBtn: { padding: 4, borderRadius: 12, backgroundColor: '#dbeafe' },
  inputArea: { padding: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9', backgroundColor: '#fff', flexDirection: 'row', gap: 10, alignItems: 'center' },
  attachBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#bfdbfe' },
  input: { flex: 1, height: 48, backgroundColor: '#f8fafc', borderRadius: 24, paddingHorizontal: 20, borderWidth: 1, borderColor: '#e2e8f0', color: '#0f172a', fontSize: 15 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1d4ed8', alignItems: 'center', justifyContent: 'center', elevation: 2 },
  sendBtnDisabled: { backgroundColor: '#94a3b8', opacity: 0.5 }
});

export default ChatScreen;
