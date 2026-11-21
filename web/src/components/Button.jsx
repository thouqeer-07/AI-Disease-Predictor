import React from 'react';
import { twMerge } from 'tailwind-merge';

export const Button = ({ 
 children, 
 variant = 'primary', 
 size = 'md', 
 className, 
 ...props 
}) => {
 const variants = {
 primary: 'bg-primary text-white hover:bg-primary/90 shadow-sm hover:shadow-md',
 secondary: 'bg-secondary text-white hover:bg-secondary/90 shadow-sm hover:shadow-md',
 outline: 'border-2 border-primary text-primary hover:bg-primary/5',
 ghost: 'hover:bg-primary/5 text-slate-600 ',
 glass: 'glass hover:bg-white/20 text-slate-800 text-slate-900',
 };

 const sizes = {
 sm: 'px-4 py-2 text-sm',
 md: 'px-6 py-3',
 lg: 'px-8 py-4 text-lg font-semibold',
 };

 return (
 <button
 className={twMerge(
 'rounded-lg transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 font-medium',
 variants[variant],
 sizes[size],
 className
 )}
 {...props}
 >
 {children}
 </button>
 );
};




