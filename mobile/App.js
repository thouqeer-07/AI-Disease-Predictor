import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';

LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  '`expo-notifications` functionality is not fully supported in Expo Go',
  'SafeAreaView has been deprecated'
]);
import { Provider, useDispatch } from 'react-redux';
import { store } from './src/store';
import RootNavigation from './src/navigation';
import { supabase } from './src/lib/supabase';
import { setUser, setSession, setLoading, setRole } from './src/store/slices/authSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';

function AppContent() {
  const dispatch = useDispatch();

  useEffect(() => {
    // 1. Check active sessions and sets the user safely
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        console.warn("Session refresh error:", error.message);
        try {
          await supabase.auth.signOut({ scope: 'local' });
        } catch (e) {
          // ignore signout errors on stale token
        }
        dispatch(setSession(null));
        dispatch(setUser(null));
        dispatch(setRole(null));
        dispatch(setLoading(false));
        return;
      }

      if (session && session.user && !session.user.email_confirmed_at) {
        try {
          await supabase.auth.signOut({ scope: 'local' });
        } catch (e) {}
        session = null;
      }
      dispatch(setSession(session));
      dispatch(setUser(session?.user ?? null));
      dispatch(setRole(session?.user?.user_metadata?.role ?? null));
      dispatch(setLoading(false));
    }).catch(async (e) => {
      console.warn("Error getting session:", e);
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch (err) {}
      dispatch(setSession(null));
      dispatch(setUser(null));
      dispatch(setRole(null));
      dispatch(setLoading(false));
    });

    // 2. Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      
      const isUnverified = session && session.user && (
        !session.user.email_confirmed_at || 
        session.user.user_metadata?.is_verified === false ||
        session.user.user_metadata?.aura_verified === false
      );

      if (event === 'SIGNED_OUT' || !session || isUnverified) {
        if (isUnverified) {
          try { await supabase.auth.signOut({ scope: 'local' }); } catch (e) {}
        }
        dispatch(setSession(null));
        dispatch(setUser(null));
        dispatch(setRole(null));
        dispatch(setLoading(false));
        return;
      }

      dispatch(setSession(session));
      dispatch(setUser(session?.user ?? null));
      dispatch(setRole(session?.user?.user_metadata?.role ?? null));
      dispatch(setLoading(false));
    });

    return () => subscription.unsubscribe();
  }, [dispatch]);

  return <RootNavigation />;
}

import NotificationManager from './src/components/NotificationManager';

export default function App() {
  return (
    <Provider store={store}>
      <AppContent />
      <NotificationManager />
      <StatusBar style="auto" />
    </Provider>
  );
}
