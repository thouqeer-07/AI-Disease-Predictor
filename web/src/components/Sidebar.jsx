import React from 'react';
import { NavLink } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { logout } from '../store/slices/authSlice';
import { 
 LayoutDashboard, 
 Stethoscope, 
 MessageSquare, 
 Pill, 
 ShieldAlert, 
 ShieldCheck,
 UserCircle, 
 Settings,
 LogOut,
 Activity,
 Users,
 Calendar,
 Mail
} from 'lucide-react';

import { useSelector } from 'react-redux';

const SidebarItem = ({ icon: Icon, label, to }) => (
 <NavLink
 to={to}
 className={({ isActive }) => `
 flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300
 ${isActive 
 ? 'bg-primary text-white shadow-md' 
 : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 text-slate-500'}
 `}
 >
 <Icon className="w-5 h-5" />
 <span className="font-medium">{label}</span>
 </NavLink>
);

const Sidebar = () => {
 const dispatch = useDispatch();
 const { role } = useSelector((state) => state.auth);

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



 const items = role === 'doctor' ? doctorItems : patientItems;

 return (
 <div className="w-64 h-screen sticky top-0 border-r border-slate-200 bg-white p-6 flex flex-col">
 <div className="flex items-center gap-2 mb-10 px-2">
 <div className="p-2 bg-primary rounded-lg shadow-md">
 <Activity className="w-6 h-6 text-white" />
 </div>
 <span className="text-xl font-bold tracking-tight text-slate-900">AuraHealth</span>
 </div>

 <div className="flex-1 flex flex-col gap-2">
 {items.map((item) => (
 <SidebarItem key={item.to + item.label} icon={item.icon} label={item.label} to={item.to} />
 ))}
 </div>


 <div className="pt-6 border-t border-slate-100 flex flex-col gap-2">
 <SidebarItem icon={Settings} label="Settings" to="/settings" />
 <button 
 onClick={() => dispatch(logout())}
 className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all w-full text-left font-medium"
 >
 <LogOut className="w-5 h-5" />
 <span className="font-medium">Logout</span>
 </button>
 </div>
 </div>
 );
};

export default Sidebar;





