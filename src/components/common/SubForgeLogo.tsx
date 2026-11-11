import React from 'react';

interface SubForgeLogoProps {
  className?: string;
  size?: number;
  glow?: boolean;
}

/**
 * Premium SubForge Brand Emblem
 * Features an electric blue & neon purple forged waveform "S" monogram
 * with specular glass reflections and cybernetic purple glow.
 */
export function SubForgeLogo({ className = '', size = 36, glow = true }: SubForgeLogoProps) {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 48 48"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full filter drop-shadow-[0_0_12px_rgba(168,85,247,0.45)]"
      >
        <defs>
          {/* Outer Glass Gradient */}
          <linearGradient id="sf-glass-bg" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2E1065" />
            <stop offset="50%" stopColor="#1E0A3C" />
            <stop offset="100%" stopColor="#0B031E" />
          </linearGradient>

          {/* Electric Blue to Neon Purple Forge Arc */}
          <linearGradient id="sf-arc-cyan" x1="6" y1="8" x2="38" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="50%" stopColor="#818CF8" />
            <stop offset="100%" stopColor="#C084FC" />
          </linearGradient>

          {/* Vibrant Purple to Magenta Forge Arc */}
          <linearGradient id="sf-arc-purple" x1="42" y1="40" x2="10" y2="20" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E879F9" />
            <stop offset="50%" stopColor="#A855F7" />
            <stop offset="100%" stopColor="#6366F1" />
          </linearGradient>

          {/* Specular Highlight */}
          <linearGradient id="sf-rim" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
            <stop offset="40%" stopColor="rgba(192,132,252,0.4)" />
            <stop offset="100%" stopColor="rgba(56,189,248,0.2)" />
          </linearGradient>
        </defs>

        {/* Squircle Glass Emblem Base */}
        <rect
          x="3"
          y="3"
          width="42"
          height="42"
          rx="12"
          fill="url(#sf-glass-bg)"
          stroke="url(#sf-rim)"
          strokeWidth="1.5"
        />

        {/* Ambient Subtle Waveforms / Subtitle Guides */}
        <line x1="12" y1="12" x2="18" y2="12" stroke="#A855F7" strokeWidth="1.25" strokeLinecap="round" strokeOpacity="0.4" />
        <line x1="30" y1="36" x2="36" y2="36" stroke="#38BDF8" strokeWidth="1.25" strokeLinecap="round" strokeOpacity="0.4" />

        {/* Upper Interlocking Forge Arc (Waveform + "S" Top) */}
        <path
          d="M34 16C34 13.7909 30.866 12 27 12H19C15.134 12 12 14.2386 12 17C12 21 17 22.5 24 24"
          stroke="url(#sf-arc-cyan)"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Lower Interlocking Forge Arc (Waveform + "S" Bottom) */}
        <path
          d="M14 32C14 34.2091 17.134 36 21 36H29C32.866 36 36 33.7614 36 31C36 27 31 25.5 24 24"
          stroke="url(#sf-arc-purple)"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Central Forge Timing Spark / Jewel (Precision Sync Core) */}
        <circle cx="24" cy="24" r="2.2" fill="#FFFFFF" />
        <circle cx="24" cy="24" r="3.5" fill="#38BDF8" opacity="0.5" />
      </svg>

      {/* Subtle Specular Sheen Overlay */}
      <span className="pointer-events-none absolute inset-0 rounded-[12px] bg-gradient-to-tr from-transparent via-white/10 to-transparent" />
    </div>
  );
}
