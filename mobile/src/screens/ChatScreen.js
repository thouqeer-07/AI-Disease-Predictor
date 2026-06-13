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
  SafeAreaView
} from 'react-native';
import { Send, Bot, User as UserIcon, Plus, Clock, Loader2 } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { supabase } from '../lib/supabase';

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
  const [fetchingHistory, setFetchingHistory] = useState(false);
  const scrollViewRef = useRef(null);

  const loadHistory = useCallback(async () => {
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
      } else {
        setSessions([]);
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
    setMessages([{
      role: 'bot',
      content: "Hello! I've started a new session for you. How can I help you with your health today?",
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

  useEffect(() => {
    startNewChat();
    loadHistory();
  }, [user]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsgText = input;
    const userMessage = {
      role: 'user',
      content: userMsgText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // 1. Save user message to DB
      const { error: userError } = await supabase.from('chat_history').insert([
        { user_id: user.id, session_id: currentSessionId, role: 'user', content: userMsgText }
      ]);
      
      if (userError) throw userError;
      
      await loadHistory();

      // 2. Platform-aware API connection URL
      const API_URL = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://localhost:5000/api');

      // 3. Post to AI backend chat endpoint
      const response = await fetch(`${API_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMsgText,
          history: messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
          }))
        })
      });

      if (!response.ok) throw new Error('Network response not ok');
      const data = await response.json();
      const botResponse = data.response || "I'm sorry, I couldn't process that request.";

      // 4. Save bot response to DB
      const { error: botError } = await supabase.from('chat_history').insert([
        { user_id: user.id, session_id: currentSessionId, role: 'bot', content: botResponse }
      ]);

      if (botError) throw botError;
      await loadHistory();

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
        content: "I'm having trouble connecting to my diagnostic engine. Please make sure your server is running.",
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
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
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
                <Text style={[styles.messageText, msg.role === 'user' && styles.messageTextUser]}>{msg.content}</Text>
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
              </View>
            </View>
          )}
        </ScrollView>
        
        {/* Chat input box */}
        <View style={styles.inputArea}>
          <TextInput 
            placeholder="Type symptoms or ask questions..." 
            placeholderTextColor="#94a3b8"
            style={styles.input} 
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSend}
            disabled={loading}
          />
          <TouchableOpacity 
            style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]} 
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
  chatContainer: { padding: 16, paddingBottom: 24 },
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
  inputArea: { padding: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9', backgroundColor: '#fff', flexDirection: 'row', gap: 10, alignItems: 'center' },
  input: { flex: 1, height: 48, backgroundColor: '#f8fafc', borderRadius: 24, paddingHorizontal: 20, borderWidth: 1, borderColor: '#e2e8f0', color: '#0f172a', fontSize: 15 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1d4ed8', alignItems: 'center', justifyContent: 'center', elevation: 2 },
  sendBtnDisabled: { backgroundColor: '#94a3b8', opacity: 0.5 }
});

export default ChatScreen;
