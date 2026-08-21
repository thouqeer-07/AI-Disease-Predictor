import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  User, 
  Calendar, 
  Scale, 
  Ruler, 
  Droplet, 
  Pill, 
  ShieldAlert 
} from 'lucide-react';

import Sidebar from './Sidebar';
import { NotificationProvider } from './NotificationToast';
import { supabase } from '../lib/supabase';
import { Button } from './Button';

const Layout = ({ children }) => {
  const { user, role } = useSelector((state) => state.auth);
  
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });

  const [isOnboarded, setIsOnboarded] = useState(true);
  const [checkingOnboard, setCheckingOnboard] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [onboardError, setOnboardError] = useState(null);

  const [onboardForm, setOnboardForm] = useState({
    gender: '',
    dob: '',
    age: '',
    weight: '',
    height: '',
    bloodGroup: '',
    drugs: '',
    diseases: ''
  });

  useEffect(() => {
    // Only check onboarding for patients. Doctors use DoctorOnboarding page.
    // We do NOT block dashboard here anymore, this is handled in App.jsx DynamicDashboard.
  }, [user, role]);

  const handleInputChange = (e) => {};
  const handleOnboardSubmit = async (e) => {};


  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar-collapsed', String(next));
      return next;
    });
  };

  return (
    <NotificationProvider>
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
        <Sidebar isCollapsed={isCollapsed} onToggle={toggleCollapse} />
        <main className="flex-1 overflow-y-auto relative">
          {children}

        </main>
      </div>
    </NotificationProvider>
  );
};

export default Layout;
