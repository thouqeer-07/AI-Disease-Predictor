import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

const ProtectedRoute = ({ children }) => {
 const { session, loading } = useSelector((state) => state.auth);
 const location = useLocation();

 if (loading) {
 return (
 <div className="min-h-screen flex items-center justify-center bg-slate-50 ">
 <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
 </div>
 );
 }

 if (!session) {
 // Redirect to login but save the attempted location
 return <Navigate to="/login" state={{ from: location }} replace />;
 }

 return children;
};

export default ProtectedRoute;




