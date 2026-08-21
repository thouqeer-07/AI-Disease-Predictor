import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Card = ({ children, className, glass = true }) => {
 return (
 <div
 className={twMerge(
 'rounded-xl p-6 transition-all duration-300',
 glass ? 'glass' : 'bg-white shadow-sm border border-slate-200',
 className
 )}
 >
 {children}
 </div>
 );
};

export const CardHeader = ({ title, subtitle, icon: Icon }) => (
 <div className="flex items-center justify-between mb-6">
 <div>
 <h3 className="text-lg font-semibold text-slate-800 text-slate-900">{title}</h3>
 {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
 </div>
 {Icon && (
 <div className="p-3 bg-primary/10 rounded-xl">
 <Icon className="w-6 h-6 text-primary" />
 </div>
 )}
 </div>
);




