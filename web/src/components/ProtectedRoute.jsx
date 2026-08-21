import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

const ProtectedRoute = ({ children, requireOnboarding = true }) => {
 const { session, loading, user, role: reduxRole } = useSelector((state) => state.auth);
 const location = useLocation();

 if (loading) {
 return (
 <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
 <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
 </div>
 );
 }

 if (!session) {
 // Redirect to login but save the attempted location
 return <Navigate to="/login" state={{ from: location }} replace />;
 }

 if (requireOnboarding) {
   const role = reduxRole || user?.user_metadata?.role || 'patient';
   
   if (role === 'doctor') {
     const isDoctorOnboarded = user?.user_metadata?.onboarded === true || user?.user_metadata?.onboarded === 'true' || Boolean(user?.user_metadata?.education);
     if (!isDoctorOnboarded) {
       return <Navigate to="/doctor-onboarding" replace />;
     }
   } else if (role === 'patient') {
     const isPatientOnboarded = user?.user_metadata?.health_onboarded === true || user?.user_metadata?.health_onboarded === 'true' || (user?.user_metadata?.age && user?.user_metadata?.weight_kg);
     if (!isPatientOnboarded) {
       return <Navigate to="/patient-onboarding" replace />;
     }
   }
 }

 return children;
};

export default ProtectedRoute;




