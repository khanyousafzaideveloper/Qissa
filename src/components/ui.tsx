import React from 'react';
import { StarTwinkle, BookLogo } from './Illustrations';

export const FloatingDecor: React.FC = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
    <StarTwinkle className="absolute top-[15%] left-[8%] animate-twinkle" size={20} color="#fbbf24" />
    <StarTwinkle className="absolute top-[25%] right-[12%] animate-twinkle" size={16} color="#f93c6a" style={{ animationDelay: '1s' } as any} />
    <StarTwinkle className="absolute top-[60%] left-[15%] animate-twinkle" size={14} color="#31a3eb" style={{ animationDelay: '2s' } as any} />
    <StarTwinkle className="absolute top-[45%] right-[8%] animate-twinkle" size={22} color="#1eb549" style={{ animationDelay: '0.5s' } as any} />
    <StarTwinkle className="absolute top-[80%] right-[20%] animate-twinkle" size={12} color="#fbbf24" style={{ animationDelay: '1.5s' } as any} />
  </div>
);

export const SectionBadge: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = 'saffron' }) => (
  <span className={`inline-flex items-center gap-2 rounded-full bg-${color}-100 px-4 py-1.5 text-sm font-bold text-${color}-700`}>
    {children}
  </span>
);

export const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className = '', onClick }) => (
  <div
    onClick={onClick}
    className={`rounded-3xl bg-white shadow-lg shadow-saffron-200/40 ring-1 ring-saffron-100/60 transition-all duration-300 ${onClick ? 'cursor-pointer hover:shadow-xl hover:-translate-y-1' : ''} ${className}`}
  >
    {children}
  </div>
);

export const Button: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'white';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  icon?: React.ReactNode;
}> = ({ children, onClick, variant = 'primary', size = 'md', className = '', icon }) => {
  const variants = {
    primary: 'bg-gradient-to-r from-saffron-500 to-rose2-500 text-white shadow-lg shadow-saffron-300/50 hover:shadow-xl hover:shadow-rose2-300/50 hover:scale-105',
    secondary: 'bg-gradient-to-r from-sky2-500 to-emerald2-500 text-white shadow-lg shadow-sky2-300/50 hover:shadow-xl hover:scale-105',
    ghost: 'bg-white text-saffron-700 ring-2 ring-saffron-200 hover:ring-saffron-400 hover:bg-saffron-50',
    white: 'bg-white text-saffron-600 shadow-lg hover:shadow-xl hover:scale-105',
  };
  const sizes = { sm: 'px-4 py-2 text-sm', md: 'px-6 py-3 text-base', lg: 'px-8 py-4 text-lg' };
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-bold transition-all duration-300 active:scale-95 ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {icon}
      {children}
    </button>
  );
};

export const Logo: React.FC<{ size?: number; showText?: boolean; className?: string }> = ({ size = 40, showText = true, className = '' }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <div className="relative">
      <BookLogo size={size} className="animate-float-slow" />
      <StarTwinkle className="absolute -top-1 -right-1 animate-twinkle" size={12} />
    </div>
    {showText && (
      <span className="font-display text-2xl font-extrabold bg-gradient-to-r from-saffron-600 to-rose2-500 bg-clip-text text-transparent">
        Qissa
      </span>
    )}
  </div>
);
