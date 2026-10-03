import React from 'react';
import { StarTwinkle, BookLogo } from './Illustrations';

export const Cloud: React.FC<{ className?: string; width?: number; opacity?: number }> = ({ className = '', width = 120, opacity = 0.9 }) => (
  <svg width={width} height={width * 0.5} viewBox="0 0 120 60" className={className} aria-hidden>
    <g fill="#fff" opacity={opacity}>
      <ellipse cx="38" cy="38" rx="26" ry="18" />
      <ellipse cx="64" cy="28" rx="28" ry="24" />
      <ellipse cx="88" cy="40" rx="22" ry="16" />
      <rect x="20" y="38" width="86" height="18" rx="9" />
    </g>
  </svg>
);

export const FloatingDecor: React.FC = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
    <Cloud className="absolute top-[6%] -left-6 animate-float-slow" width={150} opacity={0.85} />
    <Cloud className="absolute top-[18%] right-[4%] animate-float" width={110} opacity={0.7} />
    <Cloud className="absolute top-[62%] -right-8 animate-float-slow" width={170} opacity={0.6} />
    <Cloud className="absolute top-[78%] left-[6%] animate-float" width={90} opacity={0.55} />
    <StarTwinkle className="absolute top-[12%] left-[30%] animate-twinkle" size={18} color="#fbbf24" />
    <StarTwinkle className="absolute top-[40%] right-[14%] animate-twinkle" size={14} color="#fcd34d" style={{ animationDelay: '1s' } as React.CSSProperties} />
    <StarTwinkle className="absolute top-[70%] left-[22%] animate-twinkle" size={12} color="#fbbf24" style={{ animationDelay: '2s' } as React.CSSProperties} />
  </div>
);

/** Full-page sky background shared by the light screens. */
export const SkyPage: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`relative min-h-screen overflow-x-hidden bg-gradient-to-b from-sky2-200 via-sky2-100 to-sky2-50 ${className}`}>
    <FloatingDecor />
    <div className="relative">{children}</div>
  </div>
);

export const SectionBadge: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = 'sky2' }) => (
  <span className={`inline-flex items-center gap-2 rounded-full bg-${color}-100 px-4 py-1.5 text-sm font-bold text-${color}-700`}>
    {children}
  </span>
);

export const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className = '', onClick }) => (
  <div
    onClick={onClick}
    className={`rounded-[1.75rem] bg-white shadow-lg shadow-sky2-200/60 ring-1 ring-sky2-100 transition-all duration-300 ${onClick ? 'cursor-pointer hover:shadow-xl hover:-translate-y-1' : ''} ${className}`}
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
  disabled?: boolean;
  /** Accessible name for buttons whose label is hidden on small screens. */
  ariaLabel?: string;
}> = ({ children, onClick, variant = 'primary', size = 'md', className = '', icon, disabled = false, ariaLabel }) => {
  const variants = {
    primary: 'bg-gradient-to-b from-sky2-400 to-sky2-600 text-white shadow-[0_5px_0_0_#1c6aa8] hover:brightness-110 active:translate-y-1 active:shadow-[0_1px_0_0_#1c6aa8]',
    secondary: 'bg-gradient-to-b from-amber2-300 to-amber2-400 text-amber2-900 shadow-[0_5px_0_0_#d97706] hover:brightness-105 active:translate-y-1 active:shadow-[0_1px_0_0_#d97706]',
    ghost: 'bg-white text-sky2-700 ring-2 ring-sky2-200 hover:ring-sky2-400 hover:bg-sky2-50',
    white: 'bg-white text-sky2-600 shadow-lg hover:shadow-xl hover:scale-105',
  };
  const sizes = { sm: 'px-4 py-2 text-sm', md: 'px-6 py-3 text-base', lg: 'px-8 py-4 text-lg' };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-display font-bold tracking-wide transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {icon}
      {children}
    </button>
  );
};

export const Toggle: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; label: string; description?: string }> = ({ checked, onChange, label, description }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className="flex w-full items-center justify-between gap-4 rounded-2xl bg-sky2-50 px-4 py-3 text-left transition-colors hover:bg-sky2-100"
  >
    <span>
      <span className="block font-bold text-gray-800">{label}</span>
      {description && <span className="mt-0.5 block text-sm text-gray-500">{description}</span>}
    </span>
    <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? 'bg-sky2-500' : 'bg-gray-300'}`}>
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-6' : 'left-1'}`} />
    </span>
  </button>
);

export const Logo: React.FC<{ size?: number; showText?: boolean; className?: string; tone?: 'dark' | 'light' }> = ({ size = 40, showText = true, className = '', tone = 'dark' }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <div className="relative">
      <BookLogo size={size} className="animate-float-slow" />
      <StarTwinkle className="absolute -top-1 -right-1 animate-twinkle" size={12} />
    </div>
    {showText && (
      <span className={`font-display text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r ${tone === 'light' ? 'from-white to-sky2-200' : 'from-sky2-500 to-sky2-700'}`}>
        Qissa
      </span>
    )}
  </div>
);
