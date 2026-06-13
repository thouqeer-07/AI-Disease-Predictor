import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Video, MessageCircle, ArrowLeft, Loader2, User, Phone, MoreVertical } from 'lucide-react';
import { useSelector } from 'react-redux';
import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

const Chat = () => {
 const { appointmentId } = useParams();
 const navigate = useNavigate();
 const { user } = useSelector((state) => state.auth);
 
 const [appointment, setAppointment] = useState(null);
 const [messages, setMessages] = useState([]);
 const [newMessage, setNewMessage] = useState('');
 const [loading, setLoading] = useState(true);
 const [sending, setSending] = useState(false);
 const scrollRef = useRef(null);

 useEffect(() => {
 if (!user) return;

 const fetchData = async () => {
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
 console.error('Chat Error:', err);
 } finally {
 setLoading(false);
 }
 };

 fetchData();

 // 3. Subscribe to Real-time Messages
 const subscription = supabase
 .channel(`chat:${appointmentId}`)
 .on('postgres_changes', { 
 event: 'INSERT', 
 schema: 'public', 
 table: 'messages',
 filter: `appointment_id=eq.${appointmentId}` 
 }, (payload) => {
 setMessages(prev => [...prev, payload.new]);
 })
 .subscribe();

 return () => {
 supabase.removeChannel(subscription);
 };
 }, [appointmentId, user]);

 useEffect(() => {
 scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
 }, [messages]);

 const handleSendMessage = async (e) => {
 e.preventDefault();
 if (!newMessage.trim() || sending) return;

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
 console.error('Send Error:', err);
 } finally {
 setSending(false);
 }
 };

 const handleFakeVideoCall = () => {
 alert("Tele-Health Video Module is being initialized. Please wait for the doctor to start the secure session.");
 };

 if (loading) {
 return (
 <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
 <Loader2 className="w-10 h-10 text-primary animate-spin" />
 <p className="text-slate-500 font-bold">Initializing Secure Consultation Room...</p>
 </div>
 );
 }

 const otherPersonName = user.id === appointment.user_id ? `Dr. ${appointment.doctor_name}` : 'Patient';

 return (
 <div className="max-w-5xl mx-auto h-[85vh] flex flex-col bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-100">
 {/* Chat Header */}
 <div className="p-6 border-b border-slate-100 bg-slate-50/50 bg-white flex items-center justify-between">
 <div className="flex items-center gap-4">
 <button onClick={() => navigate(-1)} className="p-2 hover:bg-white :bg-zinc-800 rounded-full transition-all">
 <ArrowLeft className="w-6 h-6 text-slate-500" />
 </button>
 <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black">
 {otherPersonName.charAt(0)}
 </div>
 <div>
 <h3 className="font-black text-slate-900 leading-tight">{otherPersonName}</h3>
 <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1">
 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
 Secure Connection
 </span>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <Button 
 variant="outline" 
 className="rounded-xl h-12 px-5 gap-2 border-slate-200 border-slate-100 hover:bg-primary hover:text-white hover:border-primary transition-all"
 onClick={handleFakeVideoCall}
 >
 <Video className="w-5 h-5" />
 <span className="hidden sm:inline">Video Call</span>
 </Button>
 <button className="p-2 text-slate-400">
 <MoreVertical className="w-6 h-6" />
 </button>
 </div>
 </div>

 {/* Message Area */}
 <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
 {messages.map((msg) => {
 const isMe = msg.sender_id === user.id;
 return (
 <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
 <div className={`max-w-[70%] p-4 rounded-xl ${
 isMe 
 ? 'bg-primary text-white rounded-tr-none' 
 : 'bg-slate-100 text-slate-800 rounded-tl-none'
 }`}>
 <p className="text-sm leading-relaxed">{msg.content}</p>
 <span className={`text-[9px] mt-1 block opacity-50 ${isMe ? 'text-right' : 'text-left'}`}>
 {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
 </span>
 </div>
 </div>
 );
 })}
 <div ref={scrollRef} />
 </div>

 {/* Input Area */}
 <form onSubmit={handleSendMessage} className="p-6 bg-white border-t border-slate-100 flex gap-4">
 <input 
 value={newMessage}
 onChange={(e) => setNewMessage(e.target.value)}
 placeholder="Type your clinical query here..."
 className="flex-1 bg-white border-none rounded-xl px-6 py-4 text-sm focus:ring-4 focus:ring-primary/10 outline-none transition-all text-slate-900 shadow-inner"
 />
 <Button 
 type="submit" 
 disabled={!newMessage.trim() || sending}
 className="rounded-xl w-14 h-14 p-0 flex items-center justify-center shadow-xl shadow-primary/30"
 >
 {sending ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
 </Button>
 </form>
 </div>
 );
};

export default Chat;




