import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider, useDispatch } from 'react-redux';
import { store } from './src/store';
import RootNavigation from './src/navigation';
import { supabase } from './src/lib/supabase';
import { setUser, setSession, setLoading, setRole } from './src/store/slices/authSlice';

function AppContent() {
  const dispatch = useDispatch();

  useEffect(() => {
    // 1. Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      dispatch(setSession(session));
      dispatch(setUser(session?.user ?? null));
      dispatch(setRole(session?.user?.user_metadata?.role ?? null));
      dispatch(setLoading(false));
    });

    // 2. Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      dispatch(setSession(session));
      dispatch(setUser(session?.user ?? null));
      dispatch(setRole(session?.user?.user_metadata?.role ?? null));
      dispatch(setLoading(false));
    });

    return () => subscription.unsubscribe();
  }, [dispatch]);

  return <RootNavigation />;
}

export default function App() {
  return (
    <Provider store={store}>
      <AppContent />
      <StatusBar style="auto" />
    </Provider>
  );
}
