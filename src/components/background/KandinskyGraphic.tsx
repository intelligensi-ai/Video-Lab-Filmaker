import React from 'react';

/**
 * Wassily Kandinsky-inspired geometric background
 * Faithful to Intelligensi.ai Video Lab Creator & Filmmaker UI:
 * - Concentric orbital rings and radial spokes in signature teal (#166E67 / #0D9488)
 * - Upper red focal node with radiant glow
 * - Lower constellation network of cyan glowing connection points
 * - Bottom teal arc dome with the iconic Intelligensi "i" medallion
 */
export const KandinskyGraphic: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden select-none z-0 ${className}`}
    >
      <svg
        className="w-full h-full"
        viewBox="0 0 1440 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Gradients */}
          <radialGradient id="tealTargetGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1B7C75" stopOpacity="0.45" />
            <stop offset="70%" stopColor="#13635D" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#0B403C" stopOpacity="0.05" />
          </radialGradient>

          <radialGradient id="redGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FF3838" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#FF4A4A" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#FF4A4A" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="nodeCyanGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2DD4BF" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#14B8A6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#0F766E" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="domeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#156D66" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#0E4E49" stopOpacity="0.98" />
          </linearGradient>
        </defs>

        {/* 1. Large Top-Right Concentric Orbital Target */}
        <g transform="translate(920, 240)">
          {/* Filled teal circular sector */}
          <circle cx="0" cy="0" r="280" fill="url(#tealTargetGlow)" />

          {/* Radial Spokes */}
          {[-75, -60, -45, -30, -15, 0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240, 255, 270].map(
            (deg, i) => {
              const rad = (deg * Math.PI) / 180;
              const x2 = Math.cos(rad) * 360;
              const y2 = Math.sin(rad) * 360;
              return (
                <line
                  key={i}
                  x1="0"
                  y1="0"
                  x2={x2}
                  y2={y2}
                  stroke="#166E67"
                  strokeWidth="0.75"
                  strokeOpacity="0.18"
                />
              );
            }
          )}

          {/* Concentric Arcs */}
          <circle cx="0" cy="0" r="100" stroke="#166E67" strokeWidth="1" strokeOpacity="0.3" />
          <circle cx="0" cy="0" r="180" stroke="#166E67" strokeWidth="1.2" strokeOpacity="0.35" />
          <circle cx="0" cy="0" r="260" stroke="#166E67" strokeWidth="1.5" strokeOpacity="0.4" />
          <circle cx="0" cy="0" r="340" stroke="#166E67" strokeWidth="1" strokeDasharray="3 6" strokeOpacity="0.25" />
          <circle cx="0" cy="0" r="420" stroke="#166E67" strokeWidth="0.75" strokeOpacity="0.15" />

          {/* Glowing Red Meridian Point (Iconic Intelligensi marker at top) */}
          <circle cx="0" cy="-260" r="22" fill="url(#redGlow)" />
          <circle cx="0" cy="-260" r="7" fill="#EF4444" />
          <circle cx="0" cy="-260" r="3" fill="#FFFFFF" />

          {/* Center axis node */}
          <circle cx="0" cy="0" r="5" fill="#166E67" fillOpacity="0.6" />
        </g>

        {/* 2. Lower Left Network & Constellation Graph */}
        <g transform="translate(480, 720)">
          {/* Subtle large circle outline */}
          <circle cx="0" cy="0" r="320" stroke="#166E67" strokeWidth="1" strokeOpacity="0.2" />
          <circle cx="0" cy="0" r="220" stroke="#166E67" strokeWidth="0.8" strokeDasharray="4 8" strokeOpacity="0.2" />

          {/* Network Connection Lines */}
          <line x1="-240" y1="-80" x2="-140" y2="40" stroke="#14B8A6" strokeWidth="0.8" strokeOpacity="0.35" />
          <line x1="-140" y1="40" x2="-60" y2="-60" stroke="#14B8A6" strokeWidth="0.8" strokeOpacity="0.35" />
          <line x1="-60" y1="-60" x2="80" y2="-120" stroke="#14B8A6" strokeWidth="0.8" strokeOpacity="0.35" />
          <line x1="-60" y1="-60" x2="20" y2="60" stroke="#14B8A6" strokeWidth="0.8" strokeOpacity="0.35" />
          <line x1="80" y1="-120" x2="160" y2="-20" stroke="#14B8A6" strokeWidth="0.8" strokeOpacity="0.35" />
          <line x1="20" y1="60" x2="160" y2="-20" stroke="#14B8A6" strokeWidth="0.8" strokeOpacity="0.35" />
          <line x1="160" y1="-20" x2="260" y2="30" stroke="#14B8A6" strokeWidth="0.8" strokeOpacity="0.35" />
          <line x1="-60" y1="-60" x2="-220" y2="-160" stroke="#14B8A6" strokeWidth="0.8" strokeOpacity="0.35" />

          {/* Interconnecting line to upper target */}
          <line x1="80" y1="-120" x2="440" y2="-480" stroke="#14B8A6" strokeWidth="0.8" strokeDasharray="4 6" strokeOpacity="0.25" />

          {/* Constellation Nodes with soft glow */}
          {[
            { x: -240, y: -80, r: 5 },
            { x: -140, y: 40, r: 6 },
            { x: -60, y: -60, r: 7 },
            { x: 80, y: -120, r: 8 },
            { x: 20, y: 60, r: 5 },
            { x: 160, y: -20, r: 6 },
            { x: 260, y: 30, r: 5 },
            { x: -220, y: -160, r: 4 },
          ].map((pt, i) => (
            <g key={i}>
              <circle cx={pt.x} cy={pt.y} r={pt.r * 3.5} fill="url(#nodeCyanGlow)" />
              <circle cx={pt.x} cy={pt.y} r={pt.r} fill="#2DD4BF" fillOpacity="0.9" />
              <circle cx={pt.x} cy={pt.y} r={pt.r * 0.4} fill="#FFFFFF" />
            </g>
          ))}
        </g>

        {/* 3. Subtle background radial rings top left */}
        <circle cx="120" cy="180" r="260" stroke="#166E67" strokeWidth="0.75" strokeOpacity="0.12" />
        <circle cx="120" cy="180" r="160" stroke="#166E67" strokeWidth="0.75" strokeDasharray="4 6" strokeOpacity="0.1" />

        {/* 4. Bottom Center Half-Dome Feature from Intelligensi Creator Screen */}
        <g transform="translate(720, 900)">
          {/* Half-dome arc */}
          <path
            d="M -220 0 A 220 180 0 0 1 220 0 Z"
            fill="url(#domeGrad)"
            opacity="0.92"
          />

          {/* White 'i' circular badge at the apex */}
          <g transform="translate(0, -110)">
            <circle cx="0" cy="0" r="24" fill="#FFFFFF" filter="drop-shadow(0 2px 8px rgba(0,0,0,0.15))" />
            {/* 'i' dot */}
            <circle cx="0" cy="-7" r="3.2" fill="#156D66" />
            {/* 'i' stem */}
            <rect x="-2.2" y="-1.5" width="4.4" height="11" rx="2.2" fill="#156D66" />
          </g>
        </g>
      </svg>
    </div>
  );
};
