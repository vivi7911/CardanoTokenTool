import type { ReactNode, SVGProps } from "react";
import { seedFromString } from "../lib/cardano";

type P = SVGProps<SVGSVGElement>;

function S({ children, ...props }: P & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconGear = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="3.4" />
    <path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M18.5 5.5l-2.1 2.1M7.6 16.4l-2.1 2.1" />
  </S>
);

export const IconCopy = (p: P) => (
  <S {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </S>
);

export const IconCheck = (p: P) => (
  <S {...p}>
    <path d="M4.5 12.5l5 5 10-11" />
  </S>
);

export const IconDownload = (p: P) => (
  <S {...p}>
    <path d="M12 3v11M7.5 10.5L12 15l4.5-4.5M4 19h16" />
  </S>
);

export const IconPlay = (p: P) => (
  <S {...p}>
    <path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none" />
  </S>
);

export const IconStop = (p: P) => (
  <S {...p}>
    <rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" stroke="none" />
  </S>
);

export const IconFlame = (p: P) => (
  <S {...p}>
    <path d="M12 3s5 4.2 5 9a5 5 0 0 1-10 0c0-2 1-3.8 2.3-5.3.3 1.2 1 2 2.2 2.5C11 7.5 11.4 5 12 3z" />
  </S>
);

export const IconKey = (p: P) => (
  <S {...p}>
    <circle cx="8" cy="14.5" r="4" />
    <path d="M11 11.5L19.5 3M16 6.5l2.5 2.5M13.5 9l2 2" />
  </S>
);

export const IconShield = (p: P) => (
  <S {...p}>
    <path d="M12 3l7 2.8v5.4c0 4.6-3 8-7 9.8-4-1.8-7-5.2-7-9.8V5.8z" />
    <path d="M9 11.5l2.2 2.2L15.5 9" />
  </S>
);

export const IconWallet = (p: P) => (
  <S {...p}>
    <path d="M3.5 7.5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />
    <path d="M15 12h5.5v3H15a1.5 1.5 0 0 1 0-3z" fill="currentColor" stroke="none" />
    <path d="M3.5 9h17" />
  </S>
);

export const IconTerminal = (p: P) => (
  <S {...p}>
    <rect x="2.5" y="4.5" width="19" height="15" rx="2" />
    <path d="M6.5 9.5l3 2.7-3 2.7M12.5 15h5" />
  </S>
);

export const IconSend = (p: P) => (
  <S {...p}>
    <path d="M21 3L10.5 13.5M21 3l-6.8 18-3.7-7.5L3 9.8z" />
  </S>
);

export const IconTag = (p: P) => (
  <S {...p}>
    <path d="M3.5 3.5h7l10 10-7 7-10-10z" />
    <circle cx="8" cy="8" r="1.4" />
  </S>
);

export const IconBraces = (p: P) => (
  <S {...p}>
    <path d="M8.5 4C7 4 6.5 5 6.5 6.5v3c0 1.2-.8 2-2 2.5 1.2.5 2 1.3 2 2.5v3C6.5 19 7 20 8.5 20M15.5 4c1.5 0 2 1 2 2.5v3c0 1.2.8 2 2 2.5-1.2.5-2 1.3-2 2.5v3c0 1.5-.5 2.5-2 2.5" />
  </S>
);

export const IconSliders = (p: P) => (
  <S {...p}>
    <path d="M5 4v6M5 14v6M12 4v2M12 10v10M19 4v10M19 18v2" />
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="8" r="2" />
    <circle cx="19" cy="16" r="2" />
  </S>
);

/* Cardano-inspired brand mark: hub + orbital nodes */
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <circle cx="20" cy="20" r="18.5" fill="none" stroke="#27407c" strokeWidth="1.5" />
      <circle cx="20" cy="20" r="4" fill="#3d7bff" />
      {[0, 60, 120, 180, 240, 300].map((a) => {
        const r = (a * Math.PI) / 180;
        return (
          <circle
            key={a}
            cx={20 + 11 * Math.cos(r)}
            cy={20 + 11 * Math.sin(r)}
            r="2.6"
            fill={a % 120 === 0 ? "#f2b63c" : "#8fb6ff"}
          />
        );
      })}
    </svg>
  );
}

/* procedural token emblem — shape seeded by the policy id */
export function TokenEmblem({ seed, size = 72, letter = "?" }: { seed: string; size?: number; letter?: string }) {
  const s = seedFromString(seed || "cardano");
  const rnd = (i: number) => {
    let t = (s + i * 1013904223) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const sides = 5 + Math.floor(rnd(1) * 3);
  const gid = `te${s.toString(36)}`;
  const R = 25;
  const rot = rnd(3) * Math.PI * 2;
  const pts = Array.from({ length: sides }, (_, i) => {
    const a = (Math.PI * 2 * i) / sides - Math.PI / 2 + rot;
    return `${(50 + R * Math.cos(a)).toFixed(1)},${(50 + R * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
  const orbitR = 40;
  const dotAngle = rnd(2) * Math.PI * 2;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="shrink-0" aria-hidden>
      <defs>
        <radialGradient id={gid} cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#8fb6ff" />
          <stop offset="55%" stopColor="#3d7bff" />
          <stop offset="100%" stopColor="#0b2a6e" />
        </radialGradient>
        <linearGradient id={`${gid}g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f2b63c" />
          <stop offset="100%" stopColor="#ff7a6b" />
        </linearGradient>
      </defs>
      <g className="spin-slow">
        <circle cx="50" cy="50" r="46" fill="none" stroke="#27407c" strokeWidth="1" strokeDasharray="3 7" />
        <circle cx={50 + orbitR * Math.cos(dotAngle)} cy={50 + orbitR * Math.sin(dotAngle)} r="2.4" fill="#f2b63c" />
      </g>
      <circle cx="50" cy="50" r="34" fill="rgba(8,20,48,0.9)" stroke="#3d7bff" strokeWidth="1.2" />
      <polygon points={pts} fill={`url(#${gid})`} stroke={`url(#${gid}g)`} strokeWidth="1.4" strokeLinejoin="round" />
      <text
        x="50"
        y="51"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="JetBrains Mono, monospace"
        fontWeight="700"
        fontSize={16}
        fill="#04102a"
      >
        {(letter || "?").slice(0, 3).toUpperCase()}
      </text>
    </svg>
  );
}
