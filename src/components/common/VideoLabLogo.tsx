/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export interface VideoLabLogoProps {
  className?: string;
  height?: number | string;
  variant?: 'full' | 'mark' | 'text';
  theme?: 'light' | 'dark';
  subtitle?: string;
}

/**
 * Official VideoLab Logo Component.
 * Faithfully matches the VideoLab brand identity:
 * - Constellation node network + Play triangle mark
 * - "VideoLab" typography with vibrant teal & mint-cyan gradient
 */
export const VideoLabLogo: React.FC<VideoLabLogoProps> = ({
  className = '',
  height = 28,
  variant = 'full',
  theme = 'light',
  subtitle,
}) => {
  const isDark = theme === 'dark';
  const iconColor = isDark ? '#2DD4BF' : '#008075';
  const videoColor = isDark ? '#F4FBF9' : '#14B8A6';
  const gradientStart = isDark ? '#2DD4BF' : '#14B8A6';
  const gradientMid = isDark ? '#5EEAD4' : '#2DD4BF';
  const gradientEnd = isDark ? '#A5F3FC' : '#67E8F9';

  // Mark-only variant (Constellation network + Play Triangle)
  if (variant === 'mark') {
    return (
      <svg
        viewBox="0 0 160 120"
        style={{ height, width: typeof height === 'number' ? height * (160 / 120) : undefined }}
        className={`inline-block select-none shrink-0 ${className}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g stroke={iconColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.95">
          <line x1="14" y1="60" x2="32" y2="30" />
          <line x1="14" y1="60" x2="32" y2="90" />
          <line x1="32" y1="30" x2="58" y2="12" />
          <line x1="32" y1="90" x2="58" y2="108" />
          <line x1="58" y1="12" x2="96" y2="28" />
          <line x1="58" y1="108" x2="96" y2="92" />
          <line x1="32" y1="30" x2="96" y2="28" />
          <line x1="32" y1="90" x2="96" y2="92" />
          <line x1="14" y1="60" x2="62" y2="60" />
          <line x1="32" y1="30" x2="62" y2="60" />
          <line x1="32" y1="90" x2="62" y2="60" />
          <line x1="58" y1="12" x2="62" y2="60" />
          <line x1="58" y1="108" x2="62" y2="60" />
          <line x1="62" y1="60" x2="96" y2="60" />
          <line x1="58" y1="12" x2="96" y2="50" />
          <line x1="58" y1="108" x2="96" y2="70" />
          <line x1="62" y1="60" x2="96" y2="38" />
          <line x1="62" y1="60" x2="96" y2="82" />
        </g>
        <path
          d="M 96 26 C 96 24 98 23 100 24 L 148 57 C 150 58.5 150 61.5 148 63 L 100 96 C 98 97 96 96 96 94 Z"
          fill={iconColor}
        />
        <g fill={iconColor}>
          <circle cx="14" cy="60" r="5.5" />
          <circle cx="32" cy="30" r="5.5" />
          <circle cx="32" cy="90" r="5.5" />
          <circle cx="58" cy="12" r="5.5" />
          <circle cx="58" cy="108" r="5.5" />
          <circle cx="62" cy="60" r="6" />
        </g>
      </svg>
    );
  }

  // Full brand lockup (Icon + Wordmark "VideoLab")
  return (
    <div className={`inline-flex items-center gap-2 select-none shrink-0 ${className}`}>
      <svg
        viewBox="0 0 540 120"
        style={{
          height,
          width: typeof height === 'number' ? height * (540 / 120) : undefined,
        }}
        className="inline-block select-none shrink-0"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={`videolab-grad-${theme}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={gradientStart} />
            <stop offset="50%" stopColor={gradientMid} />
            <stop offset="100%" stopColor={gradientEnd} />
          </linearGradient>
        </defs>

        {/* Constellation Icon & Play Triangle */}
        <g stroke={iconColor} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.95">
          <line x1="14" y1="60" x2="32" y2="30" />
          <line x1="14" y1="60" x2="32" y2="90" />
          <line x1="32" y1="30" x2="58" y2="12" />
          <line x1="32" y1="90" x2="58" y2="108" />
          <line x1="58" y1="12" x2="96" y2="28" />
          <line x1="58" y1="108" x2="96" y2="92" />
          <line x1="32" y1="30" x2="96" y2="28" />
          <line x1="32" y1="90" x2="96" y2="92" />
          <line x1="14" y1="60" x2="62" y2="60" />
          <line x1="32" y1="30" x2="62" y2="60" />
          <line x1="32" y1="90" x2="62" y2="60" />
          <line x1="58" y1="12" x2="62" y2="60" />
          <line x1="58" y1="108" x2="62" y2="60" />
          <line x1="62" y1="60" x2="96" y2="60" />
          <line x1="58" y1="12" x2="96" y2="50" />
          <line x1="58" y1="108" x2="96" y2="70" />
          <line x1="62" y1="60" x2="96" y2="38" />
          <line x1="62" y1="60" x2="96" y2="82" />
        </g>
        <path
          d="M 96 26 C 96 24 98 23 100 24 L 148 57 C 150 58.5 150 61.5 148 63 L 100 96 C 98 97 96 96 96 94 Z"
          fill={iconColor}
        />
        <g fill={iconColor}>
          <circle cx="14" cy="60" r="5.5" />
          <circle cx="32" cy="30" r="5.5" />
          <circle cx="32" cy="90" r="5.5" />
          <circle cx="58" cy="12" r="5.5" />
          <circle cx="58" cy="108" r="5.5" />
          <circle cx="62" cy="60" r="6" />
        </g>

        {/* Wordmark "VideoLab" */}
        <text
          x="168"
          y="88"
          fontFamily="'Plus Jakarta Sans', 'Poppins', 'Montserrat', 'Inter', -apple-system, sans-serif"
          fontWeight="800"
          fontSize="80"
          letterSpacing="-0.02em"
        >
          <tspan fill={videoColor}>Video</tspan>
          <tspan fill={`url(#videolab-grad-${theme})`}>Lab</tspan>
        </text>
      </svg>

      {subtitle && (
        <span
          className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${
            isDark
              ? 'text-[#2DD4BF] bg-[#134E48]/60 border-[#14B8A6]/40'
              : 'text-[#0F766E] bg-[#E6F4F2] border-[#C5E3DF]'
          }`}
        >
          {subtitle}
        </span>
      )}
    </div>
  );
};
