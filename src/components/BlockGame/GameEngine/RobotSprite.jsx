import React from 'react';

/**
 * Robot Sprite SVG Component
 * Direction convention:
 * 0 = Up (North)
 * 90 = Right (East)
 * 180 = Down (South)
 * -90 or 270 = Left (West)
 */
/**
 * Yellow Spring Robot Sprite SVG Component (Algo LMS Mascot)
 * Direction convention:
 * 0 = Up (North)
 * 90 = Right (East)
 * 180 = Down (South)
 * -90 or 270 = Left (West)
 */
export default function RobotSprite({
  direction = 90,
  isMoving = false,
  size = 56,
}) {
  // Normalize direction to degrees
  const angle = direction;

  return (
    <div
      className={`robot-sprite-container ${isMoving ? 'is-moving' : ''}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: `rotate(${angle - 90}deg)`, // default SVG faces right (90 deg)
        transition: 'transform 0.26s cubic-bezier(0.34, 1.56, 0.64, 1)',
        position: 'relative',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 72 72"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.35))',
        }}
      >
        <defs>
          <linearGradient id="yellowBodyGrad" x1="16" y1="12" x2="56" y2="52" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FEE140" />
            <stop offset="50%" stopColor="#F6C324" />
            <stop offset="100%" stopColor="#E59E0B" />
          </linearGradient>
          <linearGradient id="springGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FB923C" />
            <stop offset="100%" stopColor="#EA580C" />
          </linearGradient>
        </defs>

        {/* Shadow under spring */}
        <ellipse cx="36" cy="67" rx="16" ry="4" fill="rgba(0, 0, 0, 0.28)" />

        {/* Spring Coil Base (Orange/Reddish coiled spring) */}
        <g className="robot-spring-coil" transform="translate(23, 50)">
          <path
            d="M 6 0 Q 20 -2 20 5 Q 6 8 6 12 Q 20 13 20 17"
            stroke="url(#springGrad)"
            strokeWidth="4.5"
            strokeLinecap="round"
            fill="none"
          />
          {/* Spring base foot pad */}
          <ellipse cx="13" cy="18" rx="10" ry="3.5" fill="#C2410C" />
        </g>

        {/* Left Arm (Black curved arm) */}
        <path
          d="M 17 32 C 10 32 8 40 12 45 C 14 47 16 46 17 44"
          stroke="#1E1E24"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
        {/* Left Hand Clamp */}
        <circle cx="12" cy="45" r="3" fill="#1E1E24" />

        {/* Right Arm (Black curved arm) */}
        <path
          d="M 55 32 C 62 32 64 40 60 45 C 58 47 56 46 55 44"
          stroke="#1E1E24"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
        {/* Right Hand Clamp */}
        <circle cx="60" cy="45" r="3" fill="#1E1E24" />

        {/* Main Yellow Cuboid Body (Bo tròn cạnh) */}
        <rect
          x="18"
          y="10"
          width="36"
          height="42"
          rx="12"
          fill="url(#yellowBodyGrad)"
          stroke="#B45309"
          strokeWidth="2.5"
        />

        {/* Subtle 3D Top-Left Body Highlight */}
        <path
          d="M 24 13 L 48 13 C 51 13 52 14 52 17 C 46 17 28 17 20 22 C 20 18 21 13 24 13 Z"
          fill="#FFFBEB"
          opacity="0.6"
        />

        {/* Face Screen / Eyepatch Area */}
        {/* Left Eye */}
        <ellipse cx="29" cy="24" rx="6" ry="6.5" fill="#FFFFFF" stroke="#1E1E24" strokeWidth="1.8" />
        <ellipse cx="30" cy="24" rx="3.5" ry="4" fill="#0EA5E9" />
        <circle cx="31" cy="22" r="1.5" fill="#FFFFFF" />

        {/* Right Eye */}
        <ellipse cx="43" cy="24" rx="6" ry="6.5" fill="#FFFFFF" stroke="#1E1E24" strokeWidth="1.8" />
        <ellipse cx="42" cy="24" rx="3.5" ry="4" fill="#0EA5E9" />
        <circle cx="43" cy="22" r="1.5" fill="#FFFFFF" />

        {/* Smiling Mouth */}
        <path
          d="M 27 36 Q 36 43 45 36"
          stroke="#1E1E24"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Small rosy cheeks */}
        <circle cx="23" cy="35" r="2" fill="#F97316" opacity="0.4" />
        <circle cx="49" cy="35" r="2" fill="#F97316" opacity="0.4" />
      </svg>
    </div>
  );
}
