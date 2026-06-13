import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store } from './store';
import { setUser, setSession, setLoading, setRole } from './store/slices/authSlice';
import { supabase } from './lib/supabase';

// Layout & Components
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import AIPrediction from './pages/AIPrediction';
import Chatbot from './pages/Chatbot';
import Chat from './pages/Chat';
import DoctorConnect from './pages/DoctorConnect';

import MedicineReminder from './pages/MedicineReminder';
import EmergencySOS from './pages/EmergencySOS';
import Settings from './pages/Settings';
import DoctorDashboard from './pages/DoctorDashboard';
import DoctorPatients from './pages/DoctorPatients';
import DoctorAppointments from './pages/DoctorAppointments';
import DoctorInquiries from './pages/DoctorInquiries';



const DynamicDashboard = () => {

  const { role } = useSelector((state) => state.auth);
  return role === 'doctor' ? <DoctorDashboard /> : <Dashboard />;
};



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

  return (
    <Router>
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 transition-colors duration-300">
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* App Routes wrapped in Layout and ProtectedRoute */}
          <Route path="/dashboard" element={<ProtectedRoute><Layout><DynamicDashboard /></Layout></ProtectedRoute>} />

          <Route path="/prediction" element={<ProtectedRoute><Layout><AIPrediction /></Layout></ProtectedRoute>} />
          <Route path="/chatbot" element={<ProtectedRoute><Layout><Chatbot /></Layout></ProtectedRoute>} />
          <Route path="/chat/:appointmentId" element={<ProtectedRoute><Layout><Chat /></Layout></ProtectedRoute>} />
          <Route path="/doctors" element={<ProtectedRoute><Layout><DoctorConnect /></Layout></ProtectedRoute>} />
          <Route path="/medicines" element={<ProtectedRoute><Layout><MedicineReminder /></Layout></ProtectedRoute>} />
          <Route path="/emergency" element={<ProtectedRoute><Layout><EmergencySOS /></Layout></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
          
          {/* Doctor Specific Routes */}
          <Route path="/doctor/patients" element={<ProtectedRoute><Layout><DoctorPatients /></Layout></ProtectedRoute>} />
          <Route path="/doctor/appointments" element={<ProtectedRoute><Layout><DoctorAppointments /></Layout></ProtectedRoute>} />
          <Route path="/doctor/inquiries" element={<ProtectedRoute><Layout><DoctorInquiries /></Layout></ProtectedRoute>} />




          {/* Default Route */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

export default App;




