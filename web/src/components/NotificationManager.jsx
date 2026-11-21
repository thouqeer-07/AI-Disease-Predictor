import React, { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { supabase } from '../lib/supabase';

const NotificationManager = () => {
  const { user } = useSelector((state) => state.auth);
  const notifiedRef = useRef({}); // keep track of { "medId-YYYY-MM-DD-HH-MM": true }

  useEffect(() => {
    if (!user) return;

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    let medications = [];

    const fetchMeds = async () => {
      const { data } = await supabase
        .from('medications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);
      medications = data || [];
    };

    fetchMeds();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('realtime:notification_medications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medications' }, () => {
        fetchMeds();
      })
      .subscribe();

    // Check more frequently to avoid missing the minute mark due to browser throttling
    const interval = setInterval(() => {
      const now = new Date();
      const currentHours = now.getHours().toString().padStart(2, '0');
      const currentMinutes = now.getMinutes().toString().padStart(2, '0');
      const currentTime = `${currentHours}:${currentMinutes}:00`;
      const dateString = now.toISOString().split('T')[0]; // YYYY-MM-DD

      medications.forEach(med => {
        if (!med.time) return;
        
        // Robustly parse the stored time (handles "HH:MM:SS" or "HH:MM")
        const timeParts = med.time.split(':');
        if (timeParts.length >= 2) {
          const medHour = timeParts[0].padStart(2, '0');
          const medMin = timeParts[1].padStart(2, '0');
          
          if (medHour === currentHours && medMin === currentMinutes && med.stock_count > 0) {
            const notifKey = `${med.id}-${dateString}-${currentHours}:${currentMinutes}`;
            
            if (!notifiedRef.current[notifKey]) {
              notifiedRef.current[notifKey] = true;
              
              if ('Notification' in window && Notification.permission === 'granted') {
                let body = `It's time to take ${med.name}.`;
                if (med.stock_count <= 5) {
                  body += ` Low Stock Reminder! Only ${med.stock_count} left.`;
                }
                new Notification('Time for your medicine!', {
                  body,
                  icon: '/favicon.ico'
                });
              }
            }
          }
        }
      });
    }, 10000); // Check every 10 seconds

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [user]);

  return null;
};

export default NotificationManager;
