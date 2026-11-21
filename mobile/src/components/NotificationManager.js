import React, { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { useSelector } from 'react-redux';
import { supabase } from '../lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const NotificationManager = () => {
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    if (!user) return;

    let sub;

    const setupNotifications = async () => {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') return;

      const fetchAndSchedule = async () => {
        const { data } = await supabase
          .from('medications')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true);
        
        await Notifications.cancelAllScheduledNotificationsAsync();
        
        if (data) {
          for (const med of data) {
            if (med.stock_count > 0) {
              const [hour, minute] = med.time.split(':').map(Number);
              let body = `It's time to take ${med.name}.`;
              if (med.stock_count <= 5) {
                body += ` Low Stock Reminder! Only ${med.stock_count} left.`;
              }
              
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: 'Time for your medicine!',
                  body,
                  data: { medId: med.id },
                },
                trigger: {
                  hour,
                  minute,
                  repeats: true,
                },
              });
            }
          }
        }
      };

      fetchAndSchedule();

      sub = supabase
        .channel('realtime:notifications_mobile')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'medications' }, () => {
          fetchAndSchedule();
        })
        .subscribe();
    };
    
    setupNotifications();

    return () => {
      if (sub) {
        supabase.removeChannel(sub);
      }
    };
  }, [user]);

  return null;
};

export default NotificationManager;
