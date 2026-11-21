import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Video, MessageCircle, ArrowLeft, Loader2, Phone, MoreVertical, Clock, Calendar } from 'lucide-react';
import { useSelector } from 'react-redux';
import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';

// Schedule Call Modal Component
const ScheduleCallModal = ({ onClose, onSchedule }) => {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [type, setType] = useState('Video'); // Video / Audio

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!date || !time) {
      alert('Please select both date and time.');
      return;
    }
    onSchedule(date, time, type);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-xl overflow-hidden shadow-2xl p-8 space-y-6 animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-zinc-800">
        <div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">Schedule Consultation Call</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Set up a secure telehealth session.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-400">Call Type</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setType('Video')}
                className={`h-12 rounded-xl flex items-center justify-center gap-2 border font-bold text-sm transition-all cursor-pointer ${
                  type === 'Video'
                    ? 'bg-primary/5 text-primary border-primary shadow-sm'
                    : 'border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800'
                }`}
              >
                <Video className="w-4 h-4" />
                Video Call
              </button>
              <button
                type="button"
                onClick={() => setType('Audio')}
                className={`h-12 rounded-xl flex items-center justify-center gap-2 border font-bold text-sm transition-all cursor-pointer ${
                  type === 'Audio'
                    ? 'bg-primary/5 text-primary border-primary shadow-sm'
                    : 'border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800'
                }`}
              >
                <Phone className="w-4 h-4" />
                Audio Call
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full h-12 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-slate-900 dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400">Time</label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full h-12 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              className="flex-1 rounded-xl h-12 text-sm font-bold border border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all cursor-pointer"
              onClick={onClose}
            >
              Cancel
            </button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1 rounded-xl h-12 text-sm font-bold shadow-md"
            >
              Schedule
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Chat = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  
  const [appointment, setAppointment] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
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

    // 3. Subscribe to Real-time Messages & Appointment updates
    const messageSubscription = supabase
      .channel(`chat:messages:${appointmentId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `appointment_id=eq.${appointmentId}` 
      }, (payload) => {
        setMessages(prev => prev.some(m => m.id === payload.new.id) ? prev : [...prev, payload.new]);
      })
      .subscribe();

    const appointmentSubscription = supabase
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
      supabase.removeChannel(messageSubscription);
      supabase.removeChannel(appointmentSubscription);
    };
  }, [appointmentId, user]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const contentText = newMessage.trim();
    if (!contentText || sending) return;

    setSending(true);
    setNewMessage('');
    const receiverId = user.id === appointment.user_id ? appointment.doctor_id : appointment.user_id;

    try {
      const { data, error } = await supabase.from('messages').insert([{
        appointment_id: appointmentId,
        sender_id: user.id,
        receiver_id: receiverId,
        content: contentText
      }]).select();

      if (error) throw error;
      const insertedMsg = (data && data[0]) ? data[0] : {
        id: `temp_${Date.now()}`,
        appointment_id: appointmentId,
        sender_id: user.id,
        receiver_id: receiverId,
        content: contentText,
        created_at: new Date().toISOString()
      };

      setMessages(prev => prev.some(m => m.id === insertedMsg.id) ? prev : [...prev, insertedMsg]);
    } catch (err) {
      console.error('Send Error:', err);
      setNewMessage(contentText);
    } finally {
      setSending(false);
    }
  };

  const handleScheduleCall = async (date, time, type) => {
    if (!user || !appointment) return;
    const combinedDateTime = new Date(`${date}T${time}`);
    
    try {
      const callNotes = `[Call: ${type}]`;
      const updatedNotes = appointment.notes 
        ? `${appointment.notes}\n${callNotes}`
        : callNotes;

      // 1. Update appointment date/notes
      const { error: apptError } = await supabase
        .from('appointments')
        .update({
          appointment_date: combinedDateTime.toISOString(),
          notes: updatedNotes
        })
        .eq('id', appointmentId);

      if (apptError) throw apptError;

      // 2. Insert call details notification message in chat
      const receiverId = user.id === appointment.user_id ? appointment.doctor_id : appointment.user_id;
      const formattedDateTime = combinedDateTime.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
      const systemMessageContent = `📅 Scheduled a ${type} Call for ${formattedDateTime}`;
      
      const { data: msgData, error: msgError } = await supabase.from('messages').insert([{
        appointment_id: appointmentId,
        sender_id: user.id,
        receiver_id: receiverId,
        content: systemMessageContent
      }]).select();

      if (msgError) throw msgError;

      if (msgData && msgData[0]) {
        setMessages(prev => prev.some(m => m.id === msgData[0].id) ? prev : [...prev, msgData[0]]);
      }

      // Update local state
      setAppointment(prev => ({
        ...prev,
        appointment_date: combinedDateTime.toISOString(),
        notes: updatedNotes
      }));
      
      setShowScheduleModal(false);
    } catch (err) {
      console.error('Error scheduling call:', err);
      alert('Failed to schedule call.');
    }
  };

  if (loading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-slate-500 font-bold">Initializing Secure Consultation Room...</p>
      </div>
    );
  }

  // Lock screen if appointment request not accepted/completed
  if (appointment && appointment.status !== 'accepted' && appointment.status !== 'completed') {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl text-center shadow-xl space-y-6 animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/20 text-amber-500 flex items-center justify-center">
          <Clock className="w-8 h-8 animate-pulse" />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-black text-slate-900 dark:text-white">Consultation Room Locked</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
            This chat room is only available once the doctor has approved your appointment request.
          </p>
          <div className="px-4 py-2 bg-slate-50 dark:bg-zinc-950 rounded-xl text-xs font-bold text-slate-500 border border-slate-100 dark:border-zinc-800 w-fit mx-auto">
            Current Status: <span className="uppercase text-amber-600 dark:text-amber-400">{appointment.status}</span>
          </div>
        </div>
        <Button 
          variant="outline" 
          className="w-full rounded-xl h-12"
          onClick={() => navigate(-1)}
        >
          Go Back
        </Button>
      </div>
    );
  }

  const otherPersonName = user.id === appointment.user_id ? `Dr. ${appointment.doctor_name}` : 'Patient';

  return (
    <div className="max-w-5xl mx-auto h-[85vh] flex flex-col bg-white dark:bg-zinc-900 rounded-xl shadow-2xl overflow-hidden border border-slate-100 dark:border-zinc-800">
      
      {/* Chat Header */}
      <div className="p-6 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-all cursor-pointer">
            <ArrowLeft className="w-6 h-6 text-slate-500" />
          </button>
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black">
            {otherPersonName.charAt(0)}
          </div>
          <div>
            <h3 className="font-black text-slate-900 dark:text-white leading-tight">{otherPersonName}</h3>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Secure Connection
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Schedule Call Button (Active only if not completed) */}
          {appointment.status !== 'completed' && (
            <Button 
              variant="outline" 
              className="rounded-xl h-12 px-5 gap-2 border-slate-200 dark:border-zinc-700 hover:bg-primary hover:text-white hover:border-primary transition-all"
              onClick={() => setShowScheduleModal(true)}
            >
              <Calendar className="w-5 h-5" />
              <span className="hidden sm:inline">Schedule Call</span>
            </Button>
          )}
          <button className="p-2 text-slate-400 cursor-pointer">
            <MoreVertical className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-slate-50/20 dark:bg-zinc-950/20">
        {messages.map((msg) => {
          const isMe = msg.sender_id === user.id;
          const isSystemMessage = msg.content?.includes('📅');
          
          if (isSystemMessage) {
            return (
              <div key={msg.id} className="flex justify-center my-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-2xl px-6 py-3 text-xs font-bold text-primary max-w-sm text-center flex items-center gap-3">
                  <Calendar className="w-4 h-4 shrink-0" />
                  <span>{msg.content}</span>
                </div>
              </div>
            );
          }

          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] p-4 rounded-xl ${
                isMe 
                  ? 'bg-primary text-white rounded-tr-none' 
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 rounded-tl-none'
              }`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                <span className={`text-[9px] mt-1 block opacity-50 ${isMe ? 'text-right' : 'text-left'}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      {/* Input Area or Completed Banner */}
      {appointment.status === 'completed' ? (
        <div className="p-6 bg-slate-50 dark:bg-zinc-900/50 border-t border-slate-100 dark:border-zinc-800 flex flex-col items-center justify-center text-center gap-2">
          <div className="px-4 py-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full text-[10px] font-black uppercase tracking-wider text-slate-500">
            Consultation Completed
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            This consultation has been marked as completed. The chat is now in read-only history mode.
          </p>
          {user.id === appointment.user_id && (
            <Button 
              variant="primary" 
              className="mt-2 rounded-xl py-2.5 px-6 font-bold text-xs shadow-md"
              onClick={() => navigate('/doctors')}
            >
              Book Another Consultation
            </Button>
          )}
        </div>
      ) : (
        <form onSubmit={handleSendMessage} className="p-6 bg-white dark:bg-zinc-900 border-t border-slate-100 dark:border-zinc-800 flex gap-4">
          <input 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your clinical query here..."
            className="flex-1 bg-slate-50 dark:bg-zinc-950 border-none rounded-xl px-6 py-4 text-sm focus:ring-4 focus:ring-primary/10 outline-none transition-all text-slate-900 dark:text-white shadow-inner"
          />
          <Button 
            type="submit" 
            disabled={!newMessage.trim() || sending}
            className="rounded-xl w-14 h-14 p-0 flex items-center justify-center shadow-xl shadow-primary/30 shrink-0"
          >
            {sending ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
          </Button>
        </form>
      )}

      {showScheduleModal && (
        <ScheduleCallModal 
          onClose={() => setShowScheduleModal(false)}
          onSchedule={handleScheduleCall}
        />
      )}
    </div>
  );
};

export default Chat;
