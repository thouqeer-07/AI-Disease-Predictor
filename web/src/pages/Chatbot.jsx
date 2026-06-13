import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, Send, Bot, User, Paperclip, Mic, Loader2, Plus, Clock } from 'lucide-react';
import { useSelector } from 'react-redux';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';

const Chatbot = () => {
 const { user } = useSelector((state) => state.auth);
 const [messages, setMessages] = useState([]);
 const [sessions, setSessions] = useState([]);
 const [currentSessionId, setCurrentSessionId] = useState(crypto.randomUUID());


 const [input, setInput] = useState('');
 const [loading, setLoading] = useState(false);
 const [uploading, setUploading] = useState(false);
 const messagesEndRef = useRef(null);
 const fileInputRef = useRef(null);


 const scrollToBottom = () => {
 messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
 };

 const loadHistory = useCallback(async () => {
 if (!user) return;
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
 } else {
 setSessions([]);
 }
 }, [user]);






 const startNewChat = () => {
 setCurrentSessionId(crypto.randomUUID());
 setMessages([{
 role: 'bot',
 content: "Hello again! I've started a new session for you. How can I help you right now?",
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

 const handleFileUpload = async (e) => {
 const file = e.target.files[0];
 if (!file) return;

 if (file.size > 5 * 1024 * 1024) {
 alert("File is too large. Please upload an image smaller than 5MB.");
 return;
 }

 setUploading(true);
 try {
 const fileExt = file.name.split('.').pop();
 const fileName = `${user.id}/${Math.random()}.${fileExt}`;
 const filePath = `${fileName}`;

 const { data, error: uploadError } = await supabase.storage
 .from('medical-reports')
 .upload(filePath, file);

 if (uploadError) throw uploadError;

 const { data: { publicUrl } } = supabase.storage
 .from('medical-reports')
 .getPublicUrl(filePath);

 handleSend(`[File Attached: ${file.name}] Analyze this report: ${publicUrl}`);

 } catch (error) {
 console.error("Upload error:", error);
 alert("Failed to upload. Please ensure a 'medical-reports' bucket exists in Supabase.");
 } finally {
 setUploading(false);
 }
 };




 useEffect(() => {
 scrollToBottom();
 }, [messages]);


 useEffect(() => {
 // Initial setup: start a fresh chat and load history sidebar
 startNewChat();
 loadHistory();
 }, [user]);


 const handleSend = async () => {
 if (!input.trim() || loading) return;

 const userMessage = {
 role: 'user',
 content: input,
 time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
 };

 setMessages(prev => [...prev, userMessage]);
 setInput('');
 setLoading(true);

 try {
 // 1. Save user message to DB
 const { error: userError } = await supabase.from('chat_history').insert([
 { user_id: user.id, session_id: currentSessionId, role: 'user', content: input }
 ]);
 
 if (userError) {
 console.error("Supabase Save Error (User):", userError);
 alert("Database Error: Could not save your message. Please check if the 'chat_history' table exists in Supabase.");
 throw userError;
 }

 // 2. Refresh sidebar immediately so the new chat shows up
 await loadHistory();


 // 3. Get AI response
 const response = await fetch('http://localhost:5000/api/ai/chat', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ 
 message: input,
 history: messages.slice(1).map(m => ({
 role: m.role === 'user' ? 'user' : 'model',
 parts: [{ text: m.content }]
 }))

 })
 });

 const data = await response.json();
 const botResponse = data.response || "I'm sorry, I couldn't process that.";
 
 // 4. Save bot response to DB
 const { error: botError } = await supabase.from('chat_history').insert([
 { user_id: user.id, session_id: currentSessionId, role: 'bot', content: botResponse }
 ]);

 if (botError) throw botError;

 // 5. Refresh sidebar again with bot's answer
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
 content: "I'm having trouble connecting to my brain right now. Please try again in a moment.",
 time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
 }]);
 } finally {
 setLoading(false);
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
 Past History
 </h2>
 </div>
 <div className="flex-1 overflow-y-auto p-2 space-y-1">
 {sessions.map(([sid, msgs]) => (
 <div 
 key={sid} 
 onClick={() => loadSession(sid, msgs)}
 className={`group p-3 rounded-xl cursor-pointer transition-all border ${
 currentSessionId === sid 
 ? 'bg-primary/5 border-primary/20 shadow-sm' 
 : 'hover:bg-slate-50 :bg-zinc-800 border-transparent'
 }`}
 >
 <p className="text-[10px] font-bold text-slate-400 mb-1">
 {new Date(msgs[0].created_at).toLocaleDateString()}
 </p>
 <p className={`text-sm font-medium truncate ${
 currentSessionId === sid ? 'text-primary' : 'text-slate-600 '
 }`}>
 {msgs.find(m => m.role === 'user')?.content || "New Consultation"}
 </p>
 </div>
 ))}

 {sessions.length === 0 && (
 <div className="p-8 text-center">
 <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
 <p className="text-xs text-slate-400">No previous chats yet.</p>
 </div>
 )}
 </div>
 </Card>
 </div>

 {/* Main Chat Area */}
 <div className="flex-1 flex flex-col h-full">
 <div className="mb-6 flex justify-between items-center">
 <div>
 <h1 className="text-3xl font-bold text-slate-900">Medical Assistant</h1>
 <p className="text-slate-500">Aura AI • Real-time health insights</p>
 </div>
 </div>

 <Card className="flex-1 flex flex-col p-0 overflow-hidden relative shadow-2xl border-none ring-1 ring-slate-100 ">

 <div className="flex-1 p-6 space-y-6 overflow-y-auto bg-slate-50/30 ">
 {messages.map((msg, idx) => (
 <div key={idx} className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
 <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
 msg.role === 'bot' ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'
 }`}>
 {msg.role === 'bot' ? <Bot className="w-6 h-6" /> : <User className="w-6 h-6" />}
 </div>
 <div className={`p-4 rounded-xl shadow-sm border ${
 msg.role === 'bot' 
 ? 'bg-white rounded-tl-none border-slate-100 text-slate-700 ' 
 : 'bg-primary rounded-tr-none border-primary text-white'
 }`}>
 <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
 <span className={`text-[10px] mt-2 block ${msg.role === 'bot' ? 'text-slate-400' : 'text-primary-foreground/50'}`}>
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
 <div className="bg-white p-4 rounded-xl rounded-tl-none border border-slate-100 ">
 <div className="flex gap-1">
 <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
 <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
 <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
 </div>
 </div>
 </div>
 )}
 <div ref={messagesEndRef} />
 </div>

 {/* Input Area */}
 <div className="p-6 border-t border-slate-100 bg-white ">
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
 accept="image/*,.pdf"
 />
 <button
 type="button"
 onClick={() => fileInputRef.current?.click()}
 className="p-3 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/5 transition-all"
 disabled={loading || uploading}
 >
 {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Paperclip className="w-6 h-6" />}
 </button>
 <input 
 type="text" 
 value={input}
 onChange={(e) => setInput(e.target.value)}
 placeholder="Describe your symptoms or ask a question..."
 className="w-full py-4 pl-4 pr-12 rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-slate-900"
 disabled={loading}
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





