import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { logout } from '../store/slices/authSlice';
import { 
  LayoutDashboard, 
  Stethoscope, 
  MessageSquare, 
  Pill, 
  ShieldAlert, 
  UserCircle, 
  Settings,
  LogOut,
  Activity,
  Users,
  Calendar,
  Mail,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';

const SidebarItem = ({ icon: Icon, label, to, isCollapsed }) => (
  <NavLink
    to={to}
    className={({ isActive }) => `
      flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative group
      ${isActive 
        ? 'bg-primary text-white shadow-lg shadow-primary/20' 
        : 'text-slate-400 hover:bg-slate-900/60 hover:text-white'}
      ${isCollapsed ? 'justify-center px-0 w-12 h-12 mx-auto' : ''}
    `}
  >
    <Icon className="w-5 h-5 shrink-0" />
    <AnimatePresence mode="wait">
      {!isCollapsed && (
        <motion.span
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.15 }}
          className="font-medium whitespace-nowrap"
        >
          {label}
        </motion.span>
      )}
    </AnimatePresence>

    {/* Tooltip when collapsed */}
    {isCollapsed && (
      <div className="absolute left-full ml-4 px-3 py-1.5 bg-slate-900 text-slate-200 text-xs font-semibold rounded-lg border border-slate-800 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap shadow-xl z-50">
        {label}
      </div>
    )}
  </NavLink>
);

const Sidebar = ({ isCollapsed, onToggle }) => {
  const dispatch = useDispatch();
  const { role } = useSelector((state) => state.auth);
  const [isLogoHovered, setIsLogoHovered] = useState(false);

  const patientItems = [
    { icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" },
    { icon: Stethoscope, label: "AI Prediction", to: "/prediction" },
    { icon: MessageSquare, label: "AI Chatbot", to: "/chatbot" },
    { icon: Pill, label: "Medicines", to: "/medicines" },
    { icon: ShieldAlert, label: "Emergency SOS", to: "/emergency" },
    { icon: UserCircle, label: "Doctor Connect", to: "/doctors" },
  ];

  const doctorItems = [
    { icon: LayoutDashboard, label: "Clinical Dashboard", to: "/dashboard" },
    { icon: Users, label: "My Patients", to: "/doctor/patients" },
    { icon: Calendar, label: "Appointments", to: "/doctor/appointments" },
    { icon: Stethoscope, label: "Prediction Tool", to: "/prediction" },
    { icon: Mail, label: "Patient Inquiries", to: "/doctor/inquiries" },
  ];

  const adminItems = [
    { icon: LayoutDashboard, label: "Admin Control Center", to: "/dashboard" },
  ];

  const items = role === 'admin' 
    ? adminItems 
    : (role === 'doctor' ? doctorItems : patientItems);

  return (
    <motion.div
      animate={{ width: isCollapsed ? '5rem' : '16rem' }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="h-screen sticky top-0 border-r border-slate-900 bg-slate-950 p-4 flex flex-col justify-between overflow-visible relative z-20 text-white select-none shrink-0"
    >
      
      {/* Shared Background Gradients & Blueprint Grids */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 rounded-r-xl">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-20" />
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-primary/10 to-transparent blur-xl" />
      </div>

      {/* Sidebar Content container */}
      <div className="flex-1 flex flex-col z-10 overflow-hidden">
        
        {/* Logo Header / Interactive Toggle Button */}
        <button
          onClick={onToggle}
          onMouseEnter={() => setIsLogoHovered(true)}
          onMouseLeave={() => setIsLogoHovered(false)}
          className={`w-full flex items-center gap-3 mb-10 mt-2 p-2 rounded-xl transition-all duration-300 relative group cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-primary/20 select-none ${
            isCollapsed ? 'justify-center bg-transparent' : 'hover:bg-slate-900/60'
          }`}
        >
          <div className="w-10 h-10 bg-primary/25 backdrop-blur-md rounded-xl border border-primary/30 shadow-md flex items-center justify-center shrink-0 relative overflow-hidden">
            {/* Activity Icon - default state */}
            <motion.div
              animate={{ 
                opacity: isLogoHovered ? 0 : 1, 
                scale: isLogoHovered ? 0.8 : 1,
                rotate: isLogoHovered ? -90 : 0
              }}
              transition={{ duration: 0.2 }}
              className="absolute"
            >
              <Activity className="w-5 h-5 text-primary" />
            </motion.div>
            
            {/* Chevron Icon - hover state */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotate: 90 }}
              animate={{ 
                opacity: isLogoHovered ? 1 : 0, 
                scale: isLogoHovered ? 1 : 0.8,
                rotate: isLogoHovered ? 0 : 90
              }}
              transition={{ duration: 0.2 }}
              className="absolute flex items-center justify-center"
            >
              {isCollapsed ? (
                <ChevronRight className="w-5 h-5 text-white" />
              ) : (
                <ChevronLeft className="w-5 h-5 text-white" />
              )}
            </motion.div>
          </div>
          
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="text-lg font-bold tracking-tight text-white whitespace-nowrap"
              >
                AuraHealth
              </motion.span>
            )}
          </AnimatePresence>

          {/* Collapsed Tooltip for Logo Button */}
          {isCollapsed && (
            <div className="absolute left-full ml-4 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap shadow-xl z-50">
              Expand Sidebar
            </div>
          )}
        </button>

        {/* Menu Items */}
        <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-1">
          {items.map((item) => (
            <SidebarItem 
              key={item.to + item.label} 
              icon={item.icon} 
              label={item.label} 
              to={item.to} 
              isCollapsed={isCollapsed} 
            />
          ))}
        </div>

      </div>

      {/* Footer Section */}
      <div className="pt-4 border-t border-slate-900 flex flex-col gap-2 relative z-10">
        <SidebarItem icon={Settings} label="Settings" to="/settings" isCollapsed={isCollapsed} />
        
        <button 
          onClick={() => dispatch(logout())}
          className={`
            flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-950/20 transition-all w-full text-left font-medium relative group
            ${isCollapsed ? 'justify-center px-0 w-12 h-12 mx-auto' : ''}
          `}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="font-medium whitespace-nowrap"
              >
                Logout
              </motion.span>
            )}
          </AnimatePresence>
          
          {/* Tooltip when collapsed */}
          {isCollapsed && (
            <div className="absolute left-full ml-4 px-3 py-1.5 bg-red-950 text-red-200 text-xs font-semibold rounded-lg border border-red-900/30 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap shadow-xl z-50">
              Logout
            </div>
          )}
        </button>
      </div>

    </motion.div>
  );
};

export default Sidebar;
