import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Bell, MessageSquare, Calendar, CheckCircle2, XCircle, Video, Phone, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AnimatePresence, motion } from 'framer-motion';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const { user, role } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  const addToast = (toast) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      removeToast(id);
    }, 6000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    if (!user) return;

    // 1. Subscribe to appointments changes
    const appointmentsChannel = supabase
      .channel('realtime:appointments_notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        async (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;

          // DOCTOR notifications
          if (role === 'doctor' && newRecord.doctor_id === user.id) {
            if (eventType === 'INSERT') {
              // Fetch patient full name from profiles
              const { data: patientProfile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', newRecord.user_id)
                .single();

              const patientName = patientProfile?.full_name || 'A patient';
              addToast({
                type: 'request',
                title: 'New Appointment Request',
                description: `${patientName} has requested an appointment on ${new Date(
                  newRecord.appointment_date
                ).toLocaleDateString()}.`,
                icon: Calendar,
                actionLabel: 'View Requests',
                onClick: () => navigate('/doctor/appointments'),
              });
            }
          }

          // PATIENT notifications
          if (role === 'patient' && newRecord.user_id === user.id) {
            if (eventType === 'UPDATE') {
              const statusChanged = oldRecord && oldRecord.status !== newRecord.status;
              const dateChanged = oldRecord && oldRecord.appointment_date !== newRecord.appointment_date;

              if (statusChanged) {
                if (newRecord.status === 'accepted') {
                  addToast({
                    type: 'success',
                    title: 'Appointment Accepted!',
                    description: `Dr. ${newRecord.doctor_name} accepted your request. Chat is now available.`,
                    icon: CheckCircle2,
                    actionLabel: 'Chat Now',
                    onClick: () => navigate(`/chat/${newRecord.id}`),
                  });
                } else if (newRecord.status === 'rejected') {
                  addToast({
                    type: 'error',
                    title: 'Appointment Rejected',
                    description: `Dr. ${newRecord.doctor_name} has declined your request.`,
                    icon: XCircle,
                    actionLabel: 'View Profile',
                    onClick: () => navigate('/doctors'),
                  });
                }
              } else if (dateChanged) {
                // Determine if this is a call update
                const isVideo = newRecord.notes?.includes('[Call: Video]') || newRecord.notes?.toLowerCase().includes('video');
                const isAudio = newRecord.notes?.includes('[Call: Audio]') || newRecord.notes?.toLowerCase().includes('audio');
                const callType = isVideo ? 'Video Call' : isAudio ? 'Audio Call' : 'Consultation';

                addToast({
                  type: 'call',
                  title: 'Call Scheduled / Updated',
                  description: `A ${callType} has been scheduled for ${new Date(
                    newRecord.appointment_date
                  ).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}.`,
                  icon: isVideo ? Video : isAudio ? Phone : Calendar,
                  actionLabel: 'View Details',
                  onClick: () => navigate(`/chat/${newRecord.id}`),
                });
              }
            }
          }
        }
      )
      .subscribe();

    // 2. Subscribe to messages changes
    const messagesChannel = supabase
      .channel('realtime:messages_notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const { new: newMsg } = payload;

          if (newMsg.receiver_id === user.id) {
            // Check if we are currently looking at this chat room
            const currentPath = window.location.pathname;
            if (currentPath === `/chat/${newMsg.appointment_id}`) {
              // User is already reading, no toast needed
              return;
            }

            // Fetch sender info or appointment info to get a clean description
            const { data: appt } = await supabase
              .from('appointments')
              .select('doctor_name, user_id')
              .eq('id', newMsg.appointment_id)
              .single();

            let senderName = 'Patient';
            if (appt) {
              if (role === 'patient') {
                senderName = `Dr. ${appt.doctor_name}`;
              } else {
                const { data: patientProfile } = await supabase
                  .from('profiles')
                  .select('full_name')
                  .eq('id', appt.user_id)
                  .single();
                senderName = patientProfile?.full_name || 'Patient';
              }
            }

            addToast({
              type: 'message',
              title: `New message from ${senderName}`,
              description: newMsg.content.length > 50 ? `${newMsg.content.substring(0, 50)}...` : newMsg.content,
              icon: MessageSquare,
              actionLabel: 'Reply',
              onClick: () => navigate(`/chat/${newMsg.appointment_id}`),
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(appointmentsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [user, role, navigate]);

  return (
    <NotificationContext.Provider value={{ addToast, toasts }}>
      {children}
      <NotificationToastsContainer toasts={toasts} removeToast={removeToast} />
    </NotificationContext.Provider>
  );
};

const NotificationToastsContainer = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = t.icon || Bell;
          let borderClass = 'border-slate-100';
          let iconBg = 'bg-primary/10 text-primary';

          if (t.type === 'success') {
            borderClass = 'border-emerald-100';
            iconBg = 'bg-emerald-50 text-emerald-500';
          } else if (t.type === 'error') {
            borderClass = 'border-red-100';
            iconBg = 'bg-red-50 text-red-500';
          } else if (t.type === 'call') {
            borderClass = 'border-blue-100';
            iconBg = 'bg-blue-50 text-blue-500';
          }

          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
              layout
              className={`pointer-events-auto bg-white/80 dark:bg-zinc-900/90 backdrop-blur-md rounded-2xl p-4 shadow-xl border ${borderClass} flex gap-3 overflow-hidden items-start`}
            >
              <div className={`p-2 rounded-xl shrink-0 ${iconBg}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-slate-900 dark:text-white leading-tight">{t.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-normal">{t.description}</p>
                {t.actionLabel && (
                  <button
                    onClick={() => {
                      t.onClick();
                      removeToast(t.id);
                    }}
                    className="text-xs font-black text-primary mt-2 hover:underline cursor-pointer flex items-center"
                  >
                    {t.actionLabel}
                  </button>
                )}
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg text-slate-400 cursor-pointer shrink-0 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
