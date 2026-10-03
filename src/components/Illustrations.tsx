import React from 'react';
import { ANIMAL_DRAWINGS } from './AnimalAvatars';
import { AVATARS, LEGACY_AVATAR_ANIMALS, type AnimalKind } from '../data/storyData';

interface IllustrationProps {
  className?: string;
}

/** Mountain / Swat Valley scene */
export const MountainScene: React.FC<IllustrationProps> = ({ className = '' }) => (
  <svg viewBox="0 0 800 400" className={className} preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="sky-mtn" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#8ed6ff" />
        <stop offset="60%" stopColor="#bce6ff" />
        <stop offset="100%" stopColor="#d6f9dc" />
      </linearGradient>
    </defs>
    <rect width="800" height="400" fill="url(#sky-mtn)" />
    <circle cx="650" cy="80" r="40" fill="#fbbf24" opacity="0.9" />
    <circle cx="650" cy="80" r="55" fill="#fbbf24" opacity="0.2" />
    {/* clouds */}
    <g fill="#fff" opacity="0.85">
      <ellipse cx="150" cy="70" rx="40" ry="18" />
      <ellipse cx="180" cy="60" rx="35" ry="20" />
      <ellipse cx="450" cy="90" rx="45" ry="16" />
    </g>
    {/* mountains */}
    <path d="M0 250 L120 120 L200 180 L300 90 L420 200 L500 130 L620 210 L800 140 L800 400 L0 400 Z" fill="#1c6aa8" opacity="0.7" />
    <path d="M0 280 L100 170 L220 230 L340 150 L460 250 L580 190 L720 260 L800 210 L800 400 L0 400 Z" fill="#10913a" opacity="0.8" />
    {/* snow caps */}
    <path d="M280 110 L300 90 L320 105 L310 100 L300 90 Z" fill="#fff" opacity="0.9" />
    {/* river */}
    <path d="M100 340 Q300 320 500 350 T800 330 L800 400 L0 400 Z" fill="#58bffa" opacity="0.6" />
    {/* trees */}
    <g>
      <circle cx="80" cy="310" r="25" fill="#0e7331" />
      <rect x="76" y="310" width="8" height="20" fill="#78350f" />
      <circle cx="560" cy="300" r="30" fill="#0e7331" />
      <rect x="556" y="300" width="8" height="25" fill="#78350f" />
    </g>
    {/* little house */}
    <g>
      <rect x="360" y="290" width="60" height="40" fill="#fbbf24" />
      <path d="M350 290 L390 255 L430 290 Z" fill="#c44407" />
      <rect x="380" y="305" width="15" height="25" fill="#78350f" />
    </g>
  </svg>
);

/** Village scene */
export const VillageScene: React.FC<IllustrationProps> = ({ className = '' }) => (
  <svg viewBox="0 0 800 400" className={className} preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="sky-vil" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fef3c7" />
        <stop offset="100%" stopColor="#fde68a" />
      </linearGradient>
    </defs>
    <rect width="800" height="400" fill="url(#sky-vil)" />
    <circle cx="700" cy="60" r="35" fill="#fbbf24" />
    {/* fields */}
    <path d="M0 250 Q400 240 800 260 L800 400 L0 400 Z" fill="#7fe696" />
    <path d="M0 300 Q400 290 800 310 L800 400 L0 400 Z" fill="#44d067" opacity="0.6" />
    {/* houses */}
    <g>
      <rect x="80" y="220" width="90" height="60" fill="#fff8ed" stroke="#c44407" strokeWidth="2" />
      <path d="M70 220 L125 175 L180 220 Z" fill="#c44407" />
      <rect x="110" y="245" width="20" height="35" fill="#78350f" />
    </g>
    <g>
      <rect x="250" y="210" width="100" height="70" fill="#ffe3ea" stroke="#bb1642" strokeWidth="2" />
      <path d="M240 210 L300 160 L360 210 Z" fill="#bb1642" />
      <rect x="285" y="240" width="22" height="40" fill="#78350f" />
    </g>
    <g>
      <rect x="440" y="215" width="95" height="65" fill="#d6f9dc" stroke="#10913a" strokeWidth="2" />
      <path d="M430 215 L487 168 L545 215 Z" fill="#10913a" />
      <rect x="475" y="240" width="20" height="40" fill="#78350f" />
    </g>
    <g>
      <rect x="600" y="220" width="90" height="60" fill="#d9f1ff" stroke="#1d83d1" strokeWidth="2" />
      <path d="M590 220 L645 175 L700 220 Z" fill="#1d83d1" />
      <rect x="630" y="245" width="20" height="35" fill="#78350f" />
    </g>
    {/* path */}
    <path d="M0 370 Q400 340 800 370" stroke="#92400e" strokeWidth="20" fill="none" opacity="0.4" />
    {/* tree */}
    <g>
      <rect x="200" y="270" width="10" height="35" fill="#78350f" />
      <circle cx="205" cy="260" r="28" fill="#0e7331" />
    </g>
  </svg>
);

/** Bazaar scene */
export const BazaarScene: React.FC<IllustrationProps> = ({ className = '' }) => (
  <svg viewBox="0 0 800 400" className={className} preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="sky-baz" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ff9eb9" />
        <stop offset="100%" stopColor="#ffbd6d" />
      </linearGradient>
    </defs>
    <rect width="800" height="400" fill="url(#sky-baz)" />
    {/* mosque silhouette */}
    <g>
      <rect x="580" y="150" width="140" height="120" fill="#1d4d6f" />
      <path d="M580 150 L650 100 L720 150 Z" fill="#1d4d6f" />
      <circle cx="650" cy="100" r="15" fill="#1d4d6f" />
      <rect x="640" y="80" width="6" height="20" fill="#1d4d6f" />
      <path d="M620 270 Q620 230 645 230 Q670 230 670 270 Z" fill="#1d4d6f" />
    </g>
    {/* shops */}
    <g>
      <rect x="40" y="220" width="120" height="80" fill="#fbbf24" />
      <path d="M30 220 L100 180 L170 220 Z" fill="#ec5e04" />
      <rect x="60" y="250" width="30" height="50" fill="#fff" />
      <rect x="110" y="250" width="30" height="50" fill="#f93c6a" />
    </g>
    <g>
      <rect x="200" y="210" width="120" height="90" fill="#f93c6a" />
      <path d="M190 210 L260 170 L330 210 Z" fill="#bb1642" />
      <rect x="220" y="240" width="35" height="60" fill="#fde68a" />
      <rect x="270" y="240" width="35" height="60" fill="#8ed6ff" />
    </g>
    <g>
      <rect x="360" y="220" width="120" height="80" fill="#1eb549" />
      <path d="M350 220 L420 180 L490 220 Z" fill="#0e7331" />
      <rect x="380" y="250" width="35" height="50" fill="#fff8ed" />
      <rect x="430" y="250" width="35" height="50" fill="#fbbf24" />
    </g>
    {/* lanterns */}
    <g>
      <line x1="100" y1="180" x2="100" y2="160" stroke="#78350f" strokeWidth="2" />
      <circle cx="100" cy="155" r="10" fill="#fbbf24" opacity="0.9" />
      <line x1="260" y1="170" x2="260" y2="150" stroke="#78350f" strokeWidth="2" />
      <circle cx="260" cy="145" r="10" fill="#fbbf24" opacity="0.9" />
      <line x1="420" y1="180" x2="420" y2="160" stroke="#78350f" strokeWidth="2" />
      <circle cx="420" cy="155" r="10" fill="#fbbf24" opacity="0.9" />
    </g>
    {/* ground */}
    <rect x="0" y="300" width="800" height="100" fill="#c44407" opacity="0.3" />
    {/* carpet pattern */}
    <g opacity="0.3">
      <circle cx="100" cy="330" r="8" fill="#fbbf24" />
      <circle cx="300" cy="330" r="8" fill="#f93c6a" />
      <circle cx="500" cy="330" r="8" fill="#fbbf24" />
      <circle cx="700" cy="330" r="8" fill="#f93c6a" />
    </g>
  </svg>
);

/** Eid celebration scene */
export const EidScene: React.FC<IllustrationProps> = ({ className = '' }) => (
  <svg viewBox="0 0 800 400" className={className} preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="sky-eid" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#1d4d6f" />
        <stop offset="50%" stopColor="#4a3080" />
        <stop offset="100%" stopColor="#9c3710" />
      </linearGradient>
    </defs>
    <rect width="800" height="400" fill="url(#sky-eid)" />
    {/* moon */}
    <circle cx="120" cy="80" r="35" fill="#fef3c7" />
    <circle cx="135" cy="75" r="30" fill="#1d4d6f" />
    {/* stars */}
    <g fill="#fef3c7">
      <circle cx="250" cy="60" r="3" />
      <circle cx="400" cy="40" r="2" />
      <circle cx="550" cy="70" r="3" />
      <circle cx="680" cy="50" r="2" />
      <circle cx="320" cy="100" r="2" />
      <circle cx="600" cy="110" r="2" />
    </g>
    {/* mosque */}
    <g>
      <rect x="300" y="180" width="200" height="120" fill="#fbbf24" opacity="0.9" />
      <path d="M300 180 L400 110 L500 180 Z" fill="#fbbf24" />
      <circle cx="400" cy="110" r="20" fill="#fbbf24" />
      <rect x="394" y="75" width="12" height="35" fill="#fbbf24" />
      <path d="M350 300 Q350 250 375 250 Q400 250 400 300 Z" fill="#c44407" />
      <path d="M400 300 Q400 250 425 250 Q450 250 450 300 Z" fill="#c44407" />
      <rect x="280" y="200" width="15" height="100" fill="#c44407" />
      <circle cx="287" cy="200" r="20" fill="#fbbf24" />
      <rect x="505" y="200" width="15" height="100" fill="#c44407" />
      <circle cx="512" cy="200" r="20" fill="#fbbf24" />
    </g>
    {/* lanterns hanging */}
    <g>
      <line x1="100" y1="120" x2="700" y2="120" stroke="#fbbf24" strokeWidth="2" opacity="0.5" />
      {[150, 250, 350, 450, 550, 650].map((x, i) => (
        <g key={i}>
          <line x1={x} y1="120" x2={x} y2="145" stroke="#fbbf24" strokeWidth="2" />
          <ellipse cx={x} cy="155" rx="12" ry="16" fill="#fbbf24" opacity="0.9" />
          <line x1={x} y1="170" x2={x} y2="175" stroke="#f93c6a" strokeWidth="3" />
        </g>
      ))}
    </g>
    {/* ground */}
    <rect x="0" y="300" width="800" height="100" fill="#78350f" opacity="0.6" />
  </svg>
);

/** Night/stars scene for "fear of darkness" */
export const NightScene: React.FC<IllustrationProps> = ({ className = '' }) => (
  <svg viewBox="0 0 800 400" className={className} preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="sky-night" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#0f172a" />
        <stop offset="100%" stopColor="#1d5a88" />
      </linearGradient>
    </defs>
    <rect width="800" height="400" fill="url(#sky-night)" />
    {/* moon */}
    <circle cx="600" cy="100" r="50" fill="#fef3c7" opacity="0.95" />
    <circle cx="615" cy="92" r="45" fill="#0f172a" opacity="0.3" />
    {/* twinkling stars */}
    <g fill="#fef3c7">
      <circle cx="80" cy="50" r="3"><animate attributeName="opacity" values="0.3;1;0.3" dur="3s" repeatCount="indefinite" /></circle>
      <circle cx="200" cy="80" r="2"><animate attributeName="opacity" values="1;0.3;1" dur="2.5s" repeatCount="indefinite" /></circle>
      <circle cx="350" cy="40" r="3"><animate attributeName="opacity" values="0.3;1;0.3" dur="4s" repeatCount="indefinite" /></circle>
      <circle cx="450" cy="90" r="2"><animate attributeName="opacity" values="1;0.3;1" dur="3.5s" repeatCount="indefinite" /></circle>
      <circle cx="720" cy="60" r="3"><animate attributeName="opacity" values="0.3;1;0.3" dur="2.8s" repeatCount="indefinite" /></circle>
      <circle cx="150" cy="130" r="2" opacity="0.6" />
      <circle cx="500" cy="150" r="2" opacity="0.6" />
      <circle cx="680" cy="180" r="2" opacity="0.6" />
    </g>
    {/* hills */}
    <path d="M0 300 Q200 270 400 290 T800 280 L800 400 L0 400 Z" fill="#0e7331" opacity="0.5" />
    <path d="M0 330 Q200 310 400 320 T800 310 L800 400 L0 400 Z" fill="#0f4b26" opacity="0.7" />
    {/* little glowing window */}
    <g>
      <rect x="350" y="280" width="60" height="50" fill="#fbbf24" opacity="0.85" />
      <rect x="340" y="270" width="80" height="10" fill="#78350f" />
      <rect x="340" y="330" width="80" height="10" fill="#78350f" />
      <circle cx="380" cy="305" r="6" fill="#fff" opacity="0.6" />
    </g>
    {/* fireflies */}
    <g fill="#fde68a">
      <circle cx="200" cy="200" r="4" opacity="0.7"><animate attributeName="opacity" values="0.3;0.9;0.3" dur="2s" repeatCount="indefinite" /></circle>
      <circle cx="550" cy="220" r="4" opacity="0.7"><animate attributeName="opacity" values="0.9;0.3;0.9" dur="2.5s" repeatCount="indefinite" /></circle>
      <circle cx="120" cy="250" r="3" opacity="0.5"><animate attributeName="opacity" values="0.3;0.8;0.3" dur="3s" repeatCount="indefinite" /></circle>
    </g>
  </svg>
);

/** Forest scene */
export const ForestScene: React.FC<IllustrationProps> = ({ className = '' }) => (
  <svg viewBox="0 0 800 400" className={className} preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="sky-forest" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#b3f2c0" />
        <stop offset="100%" stopColor="#d6f9dc" />
      </linearGradient>
    </defs>
    <rect width="800" height="400" fill="url(#sky-forest)" />
    <circle cx="650" cy="70" r="30" fill="#fbbf24" opacity="0.8" />
    {/* trees */}
    {[60, 180, 320, 480, 620, 720].map((x, i) => (
      <g key={i}>
        <rect x={x} y="200" width="12" height="80" fill="#78350f" />
        <circle cx={x + 6} cy="180" r="45" fill="#0e7331" />
        <circle cx={x + 6} cy="150" r="35" fill="#10913a" />
      </g>
    ))}
    {/* ground */}
    <rect x="0" y="280" width="800" height="120" fill="#44d067" opacity="0.5" />
    {/* path */}
    <path d="M200 400 Q400 320 600 400" stroke="#92400e" strokeWidth="30" fill="none" opacity="0.3" />
    {/* mushrooms */}
    <g>
      <ellipse cx="300" cy="340" rx="15" ry="10" fill="#f93c6a" />
      <rect x="295" y="340" width="10" height="15" fill="#fff8ed" />
      <ellipse cx="500" cy="335" rx="12" ry="8" fill="#f93c6a" />
      <rect x="496" y="335" width="8" height="12" fill="#fff8ed" />
    </g>
  </svg>
);

/** School scene */
export const SchoolScene: React.FC<IllustrationProps> = ({ className = '' }) => (
  <svg viewBox="0 0 800 400" className={className} preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="sky-school" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#8ed6ff" />
        <stop offset="100%" stopColor="#d9f1ff" />
      </linearGradient>
    </defs>
    <rect width="800" height="400" fill="url(#sky-school)" />
    <circle cx="100" cy="60" r="30" fill="#fbbf24" opacity="0.8" />
    {/* school building */}
    <g>
      <rect x="250" y="140" width="300" height="160" fill="#fbbf24" />
      <path d="M240 140 L400 80 L560 140 Z" fill="#c44407" />
      <rect x="380" y="80" width="40" height="40" fill="#fff" />
      <rect x="390" y="65" width="20" height="20" fill="#c44407" />
      <rect x="290" y="180" width="50" height="50" fill="#8ed6ff" />
      <rect x="460" y="180" width="50" height="50" fill="#8ed6ff" />
      <rect x="375" y="220" width="50" height="80" fill="#78350f" />
    </g>
    {/* flag */}
    <g>
      <rect x="400" y="40" width="4" height="50" fill="#78350f" />
      <rect x="404" y="40" width="40" height="25" fill="#1eb549" />
    </g>
    {/* ground */}
    <rect x="0" y="300" width="800" height="100" fill="#7fe696" />
    {/* path */}
    <rect x="375" y="300" width="50" height="100" fill="#92400e" opacity="0.3" />
    {/* tree */}
    <g>
      <rect x="680" y="250" width="10" height="50" fill="#78350f" />
      <circle cx="685" cy="240" r="30" fill="#0e7331" />
    </g>
    {/* bus */}
    <g>
      <rect x="80" y="280" width="100" height="40" fill="#fbbf24" />
      <rect x="90" y="285" width="20" height="20" fill="#8ed6ff" />
      <rect x="120" y="285" width="20" height="20" fill="#8ed6ff" />
      <rect x="150" y="285" width="20" height="20" fill="#8ed6ff" />
      <circle cx="100" cy="325" r="10" fill="#1a1a1a" />
      <circle cx="160" cy="325" r="10" fill="#1a1a1a" />
    </g>
  </svg>
);

/** Journey / path scene */
export const JourneyScene: React.FC<IllustrationProps> = ({ className = '' }) => (
  <svg viewBox="0 0 800 400" className={className} preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="sky-journey" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffbd6d" />
        <stop offset="100%" stopColor="#ffeed3" />
      </linearGradient>
    </defs>
    <rect width="800" height="400" fill="url(#sky-journey)" />
    <circle cx="650" cy="80" r="40" fill="#ec5e04" opacity="0.8" />
    {/* winding path */}
    <path d="M100 400 Q200 300 300 350 Q400 250 500 300 Q600 200 700 250 L700 400 Z" fill="#92400e" opacity="0.2" />
    <path d="M150 400 Q250 320 350 360 Q450 270 550 310 Q650 220 720 260" stroke="#92400e" strokeWidth="25" fill="none" opacity="0.4" />
    {/* trees along path */}
    {[200, 450, 600].map((x, i) => (
      <g key={i}>
        <rect x={x} y="250" width="8" height="40" fill="#78350f" />
        <circle cx={x + 4} cy="240" r="20" fill="#0e7331" />
      </g>
    ))}
    {/* hills */}
    <path d="M0 350 Q200 310 400 340 T800 320 L800 400 L0 400 Z" fill="#44d067" opacity="0.5" />
  </svg>
);

export const ILLUSTRATION_MAP: Record<string, React.FC<IllustrationProps>> = {
  mountain: MountainScene,
  village: VillageScene,
  bazaar: BazaarScene,
  eid: EidScene,
  forest: ForestScene,
  school: SchoolScene,
  night: NightScene,
  journey: JourneyScene,
};

/** Avatar SVG — a cute animal in a soft round badge */
export const AvatarSvg: React.FC<{ avatar: { id: string; color?: string }; size?: number; className?: string }> = ({ avatar, size = 80, className = '' }) => {
  const known = AVATARS.find((a) => a.id === avatar.id);
  const animal: AnimalKind = known?.id ?? LEGACY_AVATAR_ANIMALS[avatar.id] ?? 'lion';
  const Drawing = ANIMAL_DRAWINGS[animal];
  const tint = known?.color ?? AVATARS.find((a) => a.id === animal)?.color ?? '#e0f2fe';
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} role="img" aria-label={animal}>
      <circle cx="50" cy="50" r="48" fill={tint} />
      <Drawing />
    </svg>
  );
};

/** Decorative floating book logo */
export const BookLogo: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 40 }) => (
  <svg viewBox="0 0 50 50" width={size} height={size} className={className}>
    <defs>
      <linearGradient id="logo-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fb7a0f" />
        <stop offset="100%" stopColor="#f93c6a" />
      </linearGradient>
    </defs>
    {/* book pages */}
    <path d="M10 12 Q25 8 25 10 L25 38 Q25 36 10 40 Z" fill="#fff" />
    <path d="M40 12 Q25 8 25 10 L25 38 Q25 36 40 40 Z" fill="#fff8ed" />
    {/* spine */}
    <line x1="25" y1="10" x2="25" y2="38" stroke="#ec5e04" strokeWidth="1.5" />
    {/* star on cover */}
    <path d="M25 18 L27 22 L31 22 L28 25 L29 29 L25 27 L21 29 L22 25 L19 22 L23 22 Z" fill="url(#logo-grad)" />
    {/* text lines */}
    <line x1="13" y1="28" x2="22" y2="27" stroke="#fbbf24" strokeWidth="1.5" />
    <line x1="13" y1="32" x2="22" y2="31" stroke="#fbbf24" strokeWidth="1.5" />
    <line x1="28" y1="27" x2="37" y2="28" stroke="#fbbf24" strokeWidth="1.5" />
    <line x1="28" y1="31" x2="37" y2="32" stroke="#fbbf24" strokeWidth="1.5" />
  </svg>
);

/** Twinkle star decoration */
export const StarTwinkle: React.FC<{ className?: string; size?: number; color?: string; style?: React.CSSProperties }> = ({ className = '', size = 24, color = '#fbbf24', style }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} style={style}>
    <path d="M12 2 L14 9 L21 12 L14 15 L12 22 L10 15 L3 12 L10 9 Z" fill={color} />
  </svg>
);
