import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, Send, Bot, User, Paperclip, Mic, Loader2, Plus, Clock, FileText, X, CheckCircle, Trash2 } from 'lucide-react';
import { useSelector } from 'react-redux';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';
import { fetchApiWithFallback } from '../lib/api';
import FormattedMessage from '../components/FormattedMessage';

const Chatbot = () => {
  const { user } = useSelector((state) => state.auth);
  const [messages, setMessages] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(() => {
    return sessionStorage.getItem('aura_active_session_id') || crypto.randomUUID();
  });
  
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeDocument, setActiveDocument] = useState(null);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textInputRef = useRef(null);
  const currentSessionIdRef = useRef(currentSessionId);

  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  // Persist current session & active messages to sessionStorage so tab switching preserves state seamlessly
  useEffect(() => {
    sessionStorage.setItem('aura_active_session_id', currentSessionId);
    if (messages.length > 0) {
      try {
        sessionStorage.setItem('aura_active_cache', JSON.stringify({
          sid: currentSessionId,
          messages,
          loading,
          doc: activeDocument
        }));
      } catch (e) {}
    }
  }, [currentSessionId, messages, loading, activeDocument]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadHistory = useCallback(async (isInitialLoad = false) => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      
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

        if (isInitialLoad) {
          const savedSid = sessionStorage.getItem('aura_active_session_id') || currentSessionIdRef.current;
          const cachedData = sessionStorage.getItem('aura_active_cache');
          let restoredFromCache = false;

          if (cachedData) {
            try {
              const parsed = JSON.parse(cachedData);
              if (parsed.sid === savedSid && parsed.messages && parsed.messages.length > 0) {
                setCurrentSessionId(parsed.sid);
                setMessages(parsed.messages);
                if (parsed.loading) setLoading(true);
                if (parsed.doc) setActiveDocument(parsed.doc);
                restoredFromCache = true;
              }
            } catch (e) {}
          }

          if (!restoredFromCache) {
            let targetEntry = sessionEntries.find(([sid]) => sid === savedSid);
            if (!targetEntry && sessionEntries.length > 0 && !savedSid) {
              targetEntry = sessionEntries[0];
            }

            if (targetEntry) {
              const [sid, msgs] = targetEntry;
              setCurrentSessionId(sid);
              sessionStorage.setItem('aura_active_session_id', sid);
              setMessages(msgs.map(m => ({
                role: m.role,
                content: m.content,
                time: new Date(m.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              })));
            }
          }
        }
      } else {
        setSessions([]);
        if (isInitialLoad) {
          const cachedData = sessionStorage.getItem('aura_active_cache');
          if (!cachedData && messages.length === 0) {
            startNewChat();
          }
        }
      }
    } catch (err) {
      console.error("Error loading chat history:", err);
    }
  }, [user]);

  const startNewChat = () => {
    const newSid = crypto.randomUUID();
    setCurrentSessionId(newSid);
    sessionStorage.setItem('aura_active_session_id', newSid);
    sessionStorage.removeItem('aura_active_doc');
    sessionStorage.removeItem('aura_active_cache');
    setActiveDocument(null);
    setLoading(false);
    setInput('');
    if (textInputRef.current) textInputRef.current.value = '';
    setMessages([{
      isGreeting: true,
      role: 'bot',
      content: "Hello! I am Aura AI, your Medical Reports & Health Details Supporter. You can ask me health questions or upload a PDF medical report (lab test, blood report, diagnosis) for instant AI analysis!",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
  };

  const loadSession = (sid, msgs) => {
    setCurrentSessionId(sid);
    sessionStorage.setItem('aura_active_session_id', sid);
    const mapped = msgs.map(m => ({
      role: m.role,
      content: m.content,
      time: new Date(m.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }));
    setMessages(mapped);
    setLoading(false);
    setInput('');
    if (textInputRef.current) textInputRef.current.value = '';
    sessionStorage.setItem('aura_active_cache', JSON.stringify({
      sid,
      messages: mapped,
      loading: false,
      doc: activeDocument
    }));
  };

  const deleteSession = async (sid, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this consultation history?")) return;

    try {
      if (user) {
        await supabase.from('chat_history').delete().eq('session_id', sid).eq('user_id', user.id);
      }
      
      setSessions(prev => prev.filter(([id]) => id !== sid));

      if (currentSessionId === sid || currentSessionIdRef.current === sid) {
        startNewChat();
      }
    } catch (err) {
      console.error("Error deleting chat history:", err);
      alert("Failed to delete chat history.");
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert("File size exceeds 15MB limit. Please upload a smaller PDF report.");
      return;
    }

    setUploading(true);
    try {
      let data;
      try {
        const formData = new FormData();
        formData.append('file', file);
        data = await fetchApiWithFallback('/ai/upload-report', {
          method: 'POST',
          body: formData
        });
      } catch (uploadErr) {
        console.warn("FormData upload attempt failed, using base64 payload fallback...", uploadErr);
        const base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        data = await fetchApiWithFallback('/ai/upload-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64Data,
            fileName: file.name
          })
        });
      }

      if (data && data.status === 'success') {
        const docInfo = {
          id: data.documentId,
          name: data.fileName || file.name,
          chunks: data.totalChunks,
          pages: data.totalPages
        };
        setActiveDocument(docInfo);
        sessionStorage.setItem('aura_active_doc', JSON.stringify(docInfo));

        const initialBotMsg = {
          role: 'bot',
          content: `📄 **Medical Report Uploaded & Processed**\n\n- **File**: ${docInfo.name}\n- **Structure**: ${docInfo.pages} Pages • ${docInfo.chunks} Processed Sections\n\n---\n\n### 🩺 Comprehensive Medical Report Analysis:\n${data.initialAnalysis || data.summaryPreview}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        const userUploadMsg = {
          role: 'user',
          content: `[Uploaded PDF Medical Report: ${file.name}]`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, userUploadMsg, initialBotMsg]);

        // Save to Supabase history if available
        if (user) {
          await supabase.from('chat_history').insert([
            { user_id: user.id, session_id: currentSessionId, role: 'user', content: userUploadMsg.content },
            { user_id: user.id, session_id: currentSessionId, role: 'bot', content: initialBotMsg.content }
          ]);
          await loadHistory();
        }
      } else {
        alert(data?.error || "Failed to process PDF report.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert(error.message || "Upload failed. Make sure backend API server is running.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const savedDoc = sessionStorage.getItem('aura_active_doc');
    if (savedDoc) {
      try { setActiveDocument(JSON.parse(savedDoc)); } catch (e) {}
    }
    loadHistory(true);
  }, [user]);

  const handleSend = async (customMessageText = null) => {
    const textToSend = customMessageText || input;
    if (!textToSend.trim() || loading) return;

    const targetSid = currentSessionId;

    // Immediately clear text input state and native DOM value
    setInput('');
    if (textInputRef.current) textInputRef.current.value = '';

    const userMessage = {
      role: 'user',
      content: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      if (user) {
        await supabase.from('chat_history').insert([
          { user_id: user.id, session_id: targetSid, role: 'user', content: textToSend }
        ]);
        await loadHistory(false);
      }

      // Query RAG pipeline backend endpoint
      const data = await fetchApiWithFallback('/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: textToSend,
          documentId: activeDocument?.id,
          history: messages.filter(m => !m.isGreeting && m.content).map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
          }))
        })
      });

      const botResponse = data.response || "I'm sorry, I couldn't process that medical query.";

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

      if (currentSessionIdRef.current === targetSid) {
        setMessages(prev => [...prev, botMessage]);
      }

    } catch (error) {
      console.error('Chat error:', error);
      if (currentSessionIdRef.current === targetSid) {
        setMessages(prev => [...prev, {
          role: 'bot',
          content: "I'm having trouble connecting to the AI diagnostic service. Please verify the backend service status.",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }
    } finally {
      if (currentSessionIdRef.current === targetSid) {
        setLoading(false);
      }
    }
  };

  return (
    <div className="h-[calc(100vh-2rem)] p-4 flex gap-6 max-w-[1600px] mx-auto">
      {/* Sidebar */}
      <div className="w-80 flex flex-col gap-4">
        <Button 
          onClick={startNewChat}
          className="w-full py-6 rounded-xl flex items-center gap-3 bg-primary/10 text-primary border-2 border-primary/20 hover:bg-primary hover:text-white transition-all shadow-lg shadow-primary/5"
        >
          <Plus className="w-5 h-5" />
          New Consultation
        </Button>

        <Card className="flex-1 flex flex-col overflow-hidden p-0 border-slate-100">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 bg-white">
            <h2 className="font-bold text-sm text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Past Consultations
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sessions.map(([sid, msgs]) => (
              <div 
                key={sid} 
                onClick={() => loadSession(sid, msgs)}
                className={`group p-3 rounded-xl cursor-pointer transition-all border relative ${
                  currentSessionId === sid 
                    ? 'bg-primary/5 border-primary/20 shadow-sm' 
                    : 'hover:bg-slate-50 dark:hover:bg-zinc-800 border-transparent'
                }`}
              >
                <button
                  onClick={(e) => deleteSession(sid, e)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  title="Delete Chat History"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="pr-8">
                  <p className="text-[10px] font-bold text-slate-400 mb-1">
                    {new Date(msgs[0].created_at).toLocaleDateString()}
                  </p>
                  <p className={`text-sm font-medium truncate ${
                    currentSessionId === sid ? 'text-primary' : 'text-slate-600 '
                  }`}>
                    {msgs.find(m => m.role === 'user')?.content || "Medical Consultation"}
                  </p>
                </div>
              </div>
            ))}

            {sessions.length === 0 && (
              <div className="p-8 text-center">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No previous consultations yet.</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full">
        <div className="mb-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Medical AI Assistant</h1>
            <p className="text-slate-500 text-sm">Smart Health AI • Medical Reports & Details Supporter</p>
          </div>
        </div>

        <Card className="flex-1 flex flex-col p-0 overflow-hidden relative shadow-2xl border-none ring-1 ring-slate-100">
          <div className="flex-1 p-6 space-y-6 overflow-y-auto bg-slate-50/30">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  msg.role === 'bot' ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'
                }`}>
                  {msg.role === 'bot' ? <Bot className="w-6 h-6" /> : <User className="w-6 h-6" />}
                </div>
                <div className={`p-5 rounded-2xl shadow-sm border ${
                  msg.role === 'bot' 
                    ? 'bg-white rounded-tl-none border-slate-100 text-slate-700' 
                    : 'bg-primary rounded-tr-none border-primary text-white'
                }`}>
                  <FormattedMessage content={msg.content} role={msg.role} />
                  <span className={`text-[10px] mt-3 block ${msg.role === 'bot' ? 'text-slate-400' : 'text-primary-foreground/50'}`}>
                    {msg.time}
                  </span>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-4 max-w-[80%]">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="w-6 h-6 text-primary animate-pulse" />
                </div>
                <div className="bg-white p-4 rounded-xl rounded-tl-none border border-slate-100">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    <span className="text-xs font-semibold text-slate-500">Analyzing Report & Health Context...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Active PDF Badge */}
          {activeDocument && (
            <div className="mx-6 mt-3 p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between text-xs font-semibold text-primary animate-fadeIn">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary shrink-0" />
                <span>Active Report: <strong>{activeDocument.name}</strong> ({activeDocument.pages} Pages • {activeDocument.chunks} Sections)</span>
              </div>
              <button 
                onClick={() => setActiveDocument(null)} 
                className="p-1 hover:bg-primary/20 rounded-lg transition-all text-slate-500 hover:text-red-500"
                title="Remove Active Document Context"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Input Area */}
          <div className="p-6 border-t border-slate-100 bg-white">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex gap-4 items-center"
            >
              <div className="flex-1 relative flex items-center gap-2">
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="application/pdf,.pdf"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/5 transition-all flex items-center gap-1 border border-slate-200"
                  disabled={loading || uploading}
                  title="Upload PDF Medical Report for Analysis"
                >
                  {uploading ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : <Paperclip className="w-6 h-6" />}
                </button>
                <input 
                  ref={textInputRef}
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={activeDocument ? `Ask questions about ${activeDocument.name}...` : "Describe your symptoms or upload a PDF medical report..."}
                  className="w-full py-4 pl-4 pr-12 rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-slate-900"
                  readOnly={loading}
                />
              </div>

              <Button 
                type="submit"
                className="p-4 rounded-xl shrink-0 h-14 w-14 flex items-center justify-center"
                disabled={loading || !input.trim()}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Chatbot;
