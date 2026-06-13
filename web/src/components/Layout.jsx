import React from 'react';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
 return (
 <div className="flex min-h-screen bg-slate-50">
 <Sidebar />
 <main className="flex-1 overflow-y-auto">
 {children}
 </main>
 </div>
 );
};

export default Layout;




