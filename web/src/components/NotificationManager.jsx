import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { supabase } from '../lib/supabase';
import { Pill, X } from 'lucide-react';

const playReminderSound = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    const playTone = (freq, startTime, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playTone(523.25, now, 0.2); // C5
    playTone(659.25, now + 0.25, 0.2); // E5
    playTone(783.99, now + 0.5, 0.45); // G5
  } catch (e) {
    console.error('Audio play error:', e);
  }
};

const triggerLaptopOSNotification = async (title, options) => {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'default') {
    try {
      const p = await Notification.requestPermission();
      if (p !== 'granted') return;
    } catch (e) {
      return;
    }
  }

  if (Notification.permission !== 'granted') return;

  // 1. Try standard new Notification()
  try {
    const notif = new Notification(title, options);
    notif.onclick = () => {
      window.focus();
    };
  } catch (e) {
    console.warn('Standard Notification failed:', e);
  }

  // 2. Try Service Worker showNotification
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, options);
      }
    } catch (e) {
      console.warn('ServiceWorker showNotification failed:', e);
    }
  }
};

const NotificationManager = () => {
  const { user } = useSelector((state) => state.auth);
  const notifiedRef = useRef({}); // keep track of { "medId-YYYY-MM-DD-HH-MM": true }
  const [activeReminder, setActiveReminder] = useState(null);

  useEffect(() => {
    if (!user) return;

    // Register Service Worker for native laptop OS notifications
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => console.error('SW register error:', err));
    }

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    let medications = [];

    const fetchMeds = async () => {
      try {
        const { data } = await supabase
          .from('medications')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true);
        medications = data || [];
      } catch (err) {
        console.error('Error fetching medications for notification:', err);
      }
    };

    fetchMeds();

    // Custom event listener to refetch immediately when a medicine is added or updated
    const handleMedUpdate = () => {
      fetchMeds();
    };
    window.addEventListener('medications-updated', handleMedUpdate);

    // Event listener for manual test notification trigger
    const handleTestNotification = (e) => {
      const { name, dosage } = e.detail || { name: 'Test Medicine', dosage: '1 Tablet' };
      playReminderSound();
      setActiveReminder({
        name,
        dosage,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        stock: 30
      });

      triggerLaptopOSNotification(`💊 Test Reminder: ${name}`, {
        body: `It's time to take your test dose of ${name} (${dosage}). Native desktop notifications are working on your laptop!`,
        icon: '/favicon.ico'
      });
    };
    window.addEventListener('trigger-test-notification', handleTestNotification);

    // Subscribe to realtime updates
    const channel = supabase
      .channel('realtime:notification_medications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medications' }, () => {
        fetchMeds();
      })
      .subscribe();

    let lastFetchTime = Date.now();
    const interval = setInterval(async () => {
      // Periodic refetch every 20 seconds to catch any newly added/modified medicines
      if (Date.now() - lastFetchTime > 20000) {
        lastFetchTime = Date.now();
        await fetchMeds();
      }

      const now = new Date();
      const currentHours = now.getHours().toString().padStart(2, '0');
      const currentMinutes = now.getMinutes().toString().padStart(2, '0');
      
      const year = now.getFullYear();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      const localDateString = `${year}-${month}-${day}`;

      medications.forEach(med => {
        if (!med.time) return;
        
        const timeParts = med.time.split(':');
        if (timeParts.length >= 2) {
          const medHour = timeParts[0].padStart(2, '0');
          const medMin = timeParts[1].padStart(2, '0');
          
          if (medHour === currentHours && medMin === currentMinutes && med.stock_count > 0) {
            const notifKey = `${med.id}-${localDateString}-${currentHours}:${currentMinutes}`;
            
            if (!notifiedRef.current[notifKey]) {
              notifiedRef.current[notifKey] = true;
              
              let bodyText = `It's time to take your dose of ${med.name} (${med.dosage}).`;
              if (med.stock_count <= 5) {
                bodyText += ` Low Stock Warning: Only ${med.stock_count} remaining!`;
              }

              // 1. Laptop Native OS Desktop Notification
              triggerLaptopOSNotification(`💊 Time for ${med.name}!`, {
                body: bodyText,
                icon: '/favicon.ico',
                tag: notifKey,
                renotify: true
              });

              // 2. Play audio sound chime
              playReminderSound();

              // 3. Floating in-app reminder banner on screen
              setActiveReminder({
                name: med.name,
                dosage: med.dosage,
                time: med.time.slice(0, 5),
                stock: med.stock_count
              });
            }
          }
        }
      });
    }, 5000); // Check every 5 seconds

    return () => {
      clearInterval(interval);
      window.removeEventListener('medications-updated', handleMedUpdate);
      window.removeEventListener('trigger-test-notification', handleTestNotification);
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (!activeReminder) return null;

  return (
    <div className="fixed top-6 right-6 z-[99999] max-w-md w-full animate-in slide-in-from-top-5 duration-300">
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-2xl border border-primary/40 flex items-start gap-4 backdrop-blur-lg">
        <div className="p-3 bg-primary/20 rounded-xl text-primary shrink-0 animate-bounce">
          <Pill className="w-7 h-7 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="bg-primary/20 text-primary text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Medicine Reminder
            </span>
          </div>
          <h3 className="text-lg font-bold text-white mt-1">Time for {activeReminder.name}!</h3>
          <p className="text-sm text-slate-300 mt-1">
            Dosage: <strong className="text-white">{activeReminder.dosage}</strong> at {activeReminder.time}
          </p>
          {activeReminder.stock <= 5 && (
            <p className="text-xs text-amber-400 font-medium mt-1">
              ⚠️ Low stock: Only {activeReminder.stock} pills remaining!
            </p>
          )}
        </div>
        <button
          onClick={() => setActiveReminder(null)}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default NotificationManager;
