import React from 'react';
import type { AnimalKind } from '../data/storyData';

// Shared kawaii face parts so every animal reads as one family.
const Eye: React.FC<{ x: number; y: number; r?: number }> = ({ x, y, r = 4.2 }) => (
  <g>
    <ellipse cx={x} cy={y} rx={r} ry={r * 1.15} fill="#1f2937" />
    <circle cx={x + r * 0.35} cy={y - r * 0.4} r={r * 0.38} fill="#fff" />
    <circle cx={x - r * 0.35} cy={y + r * 0.45} r={r * 0.16} fill="#fff" />
  </g>
);

const Blush: React.FC<{ y: number; dx?: number; color?: string }> = ({ y, dx = 17, color = '#fb7185' }) => (
  <g opacity="0.45">
    <ellipse cx={50 - dx} cy={y} rx="5" ry="3" fill={color} />
    <ellipse cx={50 + dx} cy={y} rx="5" ry="3" fill={color} />
  </g>
);

const CatMouth: React.FC<{ y: number; color?: string }> = ({ y, color = '#7c2d12' }) => (
  <path d={`M44 ${y} Q47 ${y + 4} 50 ${y} Q53 ${y + 4} 56 ${y}`} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
);

const Lion = () => (
  <g>
    {Array.from({ length: 14 }).map((_, i) => {
      const a = (i / 14) * Math.PI * 2;
      return <circle key={i} cx={50 + Math.cos(a) * 28} cy={54 + Math.sin(a) * 27} r="10" fill="#f59e0b" />;
    })}
    <circle cx="50" cy="54" r="28" fill="#f59e0b" />
    <circle cx="33" cy="34" r="7" fill="#fcd34d" />
    <circle cx="67" cy="34" r="7" fill="#fcd34d" />
    <circle cx="33" cy="34" r="3.5" fill="#f59e0b" />
    <circle cx="67" cy="34" r="3.5" fill="#f59e0b" />
    <circle cx="50" cy="55" r="22" fill="#fcd34d" />
    <ellipse cx="50" cy="64" rx="11" ry="8" fill="#fff7d6" />
    <Eye x={41} y={51} />
    <Eye x={59} y={51} />
    <path d="M46 59 Q50 57 54 59 Q52 63 50 63 Q48 63 46 59 Z" fill="#7c2d12" />
    <CatMouth y={65} />
    <Blush y={60} dx={16} />
  </g>
);

const Cat = () => (
  <g>
    <path d="M22 46 L26 16 L45 32 Z" fill="#fb923c" />
    <path d="M78 46 L74 16 L55 32 Z" fill="#fb923c" />
    <path d="M27 40 L29 23 L40 32 Z" fill="#fda4af" />
    <path d="M73 40 L71 23 L60 32 Z" fill="#fda4af" />
    <ellipse cx="50" cy="56" rx="30" ry="26" fill="#fdba74" />
    <path d="M44 32 L46 40 M50 31 L50 40 M56 32 L54 40" stroke="#f97316" strokeWidth="3" strokeLinecap="round" />
    <ellipse cx="50" cy="66" rx="12" ry="8" fill="#fff7ed" />
    <Eye x={39} y={54} />
    <Eye x={61} y={54} />
    <path d="M47 62 L53 62 L50 65.5 Z" fill="#f472b6" />
    <CatMouth y={67} />
    <path d="M30 63 L18 61 M30 67 L19 69 M70 63 L82 61 M70 67 L81 69" stroke="#9a3412" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    <Blush y={62} dx={21} />
  </g>
);

const Bunny = () => (
  <g>
    <ellipse cx="38" cy="25" rx="8.5" ry="21" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1.5" transform="rotate(-10 38 25)" />
    <ellipse cx="62" cy="25" rx="8.5" ry="21" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1.5" transform="rotate(10 62 25)" />
    <ellipse cx="38" cy="26" rx="4" ry="15" fill="#fbcfe8" transform="rotate(-10 38 26)" />
    <ellipse cx="62" cy="26" rx="4" ry="15" fill="#fbcfe8" transform="rotate(10 62 26)" />
    <circle cx="50" cy="60" r="26" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1.5" />
    <Eye x={41} y={57} />
    <Eye x={59} y={57} />
    <ellipse cx="50" cy="65" rx="3.5" ry="2.5" fill="#f472b6" />
    <path d="M50 67 L50 70 M50 70 Q46 73 44 70 M50 70 Q54 73 56 70" stroke="#be185d" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    <rect x="47.5" y="70.5" width="5" height="4.5" rx="1.2" fill="#fff" stroke="#e2e8f0" strokeWidth="1" />
    <Blush y={65} dx={17} color="#f472b6" />
  </g>
);

const Panda = () => (
  <g>
    <circle cx="27" cy="33" r="11" fill="#1f2937" />
    <circle cx="73" cy="33" r="11" fill="#1f2937" />
    <circle cx="50" cy="56" r="29" fill="#fff" stroke="#e5e7eb" strokeWidth="1.5" />
    <ellipse cx="38" cy="54" rx="8" ry="10.5" fill="#1f2937" transform="rotate(25 38 54)" />
    <ellipse cx="62" cy="54" rx="8" ry="10.5" fill="#1f2937" transform="rotate(-25 62 54)" />
    <circle cx="39" cy="53" r="3.6" fill="#fff" />
    <circle cx="61" cy="53" r="3.6" fill="#fff" />
    <circle cx="39.6" cy="53.4" r="2.2" fill="#1f2937" />
    <circle cx="60.4" cy="53.4" r="2.2" fill="#1f2937" />
    <circle cx="40.4" cy="52.3" r="0.9" fill="#fff" />
    <circle cx="61.2" cy="52.3" r="0.9" fill="#fff" />
    <ellipse cx="50" cy="64" rx="4.5" ry="3" fill="#1f2937" />
    <CatMouth y={68} color="#1f2937" />
    <Blush y={66} dx={20} />
  </g>
);

const Fox = () => (
  <g>
    <path d="M20 44 L24 12 L44 30 Z" fill="#f97316" />
    <path d="M80 44 L76 12 L56 30 Z" fill="#f97316" />
    <path d="M24 12 L28 25 L33 21 Z" fill="#7c2d12" />
    <path d="M76 12 L72 25 L67 21 Z" fill="#7c2d12" />
    <path d="M26 38 L28 22 L38 31 Z" fill="#fff7ed" />
    <path d="M74 38 L72 22 L62 31 Z" fill="#fff7ed" />
    <path d="M18 50 Q20 28 50 28 Q80 28 82 50 Q80 66 50 82 Q20 66 18 50 Z" fill="#f97316" />
    <path d="M22 54 Q34 54 42 62 Q46 72 50 82 Q54 72 58 62 Q66 54 78 54 Q74 68 50 82 Q26 68 22 54 Z" fill="#fff7ed" />
    <Eye x={39} y={50} />
    <Eye x={61} y={50} />
    <ellipse cx="50" cy="72" rx="4" ry="3" fill="#1f2937" />
    <Blush y={58} dx={20} />
  </g>
);

const Owl = () => (
  <g>
    <path d="M24 34 L28 16 L40 28 Z" fill="#7c3aed" />
    <path d="M76 34 L72 16 L60 28 Z" fill="#7c3aed" />
    <ellipse cx="50" cy="56" rx="30" ry="31" fill="#a78bfa" />
    <ellipse cx="50" cy="70" rx="17" ry="15" fill="#ede9fe" />
    <path d="M43 68 Q45 71 47 68 M53 68 Q55 71 57 68 M48 75 Q50 78 52 75" stroke="#a78bfa" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    <circle cx="38" cy="47" r="12" fill="#fff" stroke="#ddd6fe" strokeWidth="2.5" />
    <circle cx="62" cy="47" r="12" fill="#fff" stroke="#ddd6fe" strokeWidth="2.5" />
    <Eye x={39} y={47} r={5.5} />
    <Eye x={61} y={47} r={5.5} />
    <path d="M45 56 L55 56 L50 63 Z" fill="#f59e0b" />
    <Blush y={58} dx={24} />
  </g>
);

const Elephant = () => (
  <g>
    <ellipse cx="24" cy="50" rx="17" ry="21" fill="#a5b4fc" />
    <ellipse cx="76" cy="50" rx="17" ry="21" fill="#a5b4fc" />
    <ellipse cx="25" cy="51" rx="10" ry="14" fill="#fbcfe8" />
    <ellipse cx="75" cy="51" rx="10" ry="14" fill="#fbcfe8" />
    <circle cx="50" cy="48" r="24" fill="#c7d2fe" />
    <path d="M43 60 Q42 76 50 82 Q56 86 61 81 Q62 77 58 77 Q53 79 52 73 Q52 66 57 60 Z" fill="#c7d2fe" />
    <path d="M51 74 Q54 75 57 74 M50 69 Q53 70 56 69" stroke="#a5b4fc" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    <Eye x={41} y={46} />
    <Eye x={59} y={46} />
    <Blush y={55} dx={16} />
  </g>
);

const Markhor = () => (
  <g>
    {/* corkscrew horns */}
    <path d="M42 34 C34 30 42 24 36 20 C30 16 38 11 33 6" stroke="#78716c" strokeWidth="7" fill="none" strokeLinecap="round" />
    <path d="M58 34 C66 30 58 24 64 20 C70 16 62 11 67 6" stroke="#78716c" strokeWidth="7" fill="none" strokeLinecap="round" />
    <path d="M36 27 L42 25 M35 18 L40 15 M64 18 L60 15 M64 27 L58 25" stroke="#d6d3d1" strokeWidth="1.8" strokeLinecap="round" />
    <ellipse cx="26" cy="48" rx="11" ry="5.5" fill="#c08a52" transform="rotate(-20 26 48)" />
    <ellipse cx="74" cy="48" rx="11" ry="5.5" fill="#c08a52" transform="rotate(20 74 48)" />
    <ellipse cx="26" cy="48" rx="6" ry="2.6" fill="#fda4af" transform="rotate(-20 26 48)" />
    <ellipse cx="74" cy="48" rx="6" ry="2.6" fill="#fda4af" transform="rotate(20 74 48)" />
    <path d="M44 80 L50 92 L56 80 Z" fill="#e7e5e4" />
    <ellipse cx="50" cy="56" rx="20" ry="26" fill="#d6a46b" />
    <ellipse cx="50" cy="72" rx="12" ry="9" fill="#f5e6d3" />
    <Eye x={42} y={52} />
    <Eye x={58} y={52} />
    <ellipse cx="46.5" cy="70" rx="1.6" ry="1.2" fill="#57534e" />
    <ellipse cx="53.5" cy="70" rx="1.6" ry="1.2" fill="#57534e" />
    <path d="M46 75 Q50 78 54 75" stroke="#57534e" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    <Blush y={62} dx={14} />
  </g>
);

export const ANIMAL_DRAWINGS: Record<AnimalKind, React.FC> = {
  lion: Lion,
  cat: Cat,
  bunny: Bunny,
  panda: Panda,
  fox: Fox,
  owl: Owl,
  elephant: Elephant,
  markhor: Markhor,
};
