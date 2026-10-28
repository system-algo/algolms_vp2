import React from 'react';

/**
 * Robot Sprite SVG Component
 * Direction convention:
 * 0 = Up (North)
 * 90 = Right (East)
 * 180 = Down (South)
 * -90 or 270 = Left (West)
 */
export default function RobotSprite({
  direction = 90,
  isMoving = false,
  carriedCargo = 0,
  size = 52,
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
        transition: 'transform 0.28s ease',
        position: 'relative',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Shadow */}
        <ellipse cx="32" cy="56" rx="22" ry="6" fill="rgba(0,0,0,0.25)" />

        {/* Left Tread (Top in side view) */}
        <rect
          x="12"
          y="10"
          width="40"
          height="11"
          rx="5"
          fill="#334155"
          stroke="#1e293b"
          strokeWidth="2"
        />
        <line x1="20" y1="10" x2="20" y2="21" stroke="#64748b" strokeWidth="2" />
        <line x1="28" y1="10" x2="28" y2="21" stroke="#64748b" strokeWidth="2" />
        <line x1="36" y1="10" x2="36" y2="21" stroke="#64748b" strokeWidth="2" />
        <line x1="44" y1="10" x2="44" y2="21" stroke="#64748b" strokeWidth="2" />

        {/* Right Tread (Bottom in side view) */}
        <rect
          x="12"
          y="43"
          width="40"
          height="11"
          rx="5"
          fill="#334155"
          stroke="#1e293b"
          strokeWidth="2"
        />
        <line x1="20" y1="43" x2="20" y2="54" stroke="#64748b" strokeWidth="2" />
        <line x1="28" y1="43" x2="28" y2="54" stroke="#64748b" strokeWidth="2" />
        <line x1="36" y1="43" x2="36" y2="54" stroke="#64748b" strokeWidth="2" />
        <line x1="44" y1="43" x2="44" y2="54" stroke="#64748b" strokeWidth="2" />

        {/* Main Body Chassis (Yellow/Gold) */}
        <rect
          x="16"
          y="17"
          width="32"
          height="30"
          rx="8"
          fill="#FBBF24"
          stroke="#D97706"
          strokeWidth="2.5"
        />

        {/* Front Visor / Eyes Screen (Facing right x=40) */}
        <rect
          x="32"
          y="23"
          width="13"
          height="18"
          rx="4"
          fill="#1E293B"
          stroke="#0F172A"
          strokeWidth="1.5"
        />
        {/* Glowing Eyes */}
        <circle cx="37" cy="28" r="2.5" fill="#38BDF8" />
        <circle cx="37" cy="36" r="2.5" fill="#38BDF8" />

        {/* Top Antenna */}
        <line x1="24" y1="17" x2="24" y2="10" stroke="#94A3B8" strokeWidth="2.5" />
        <circle cx="24" cy="9" r="3" fill="#EF4444" />

        {/* Cargo Carrier Backpack (if carrying cargo) */}
        {carriedCargo > 0 && (
          <g transform="translate(13, 23)">
            <rect
              width="18"
              height="18"
              rx="3"
              fill="#3B82F6"
              stroke="#1D4ED8"
              strokeWidth="2"
            />
            <line x1="0" y1="9" x2="18" y2="9" stroke="#93C5FD" strokeWidth="1.5" />
            <line x1="9" y1="0" x2="9" y2="18" stroke="#93C5FD" strokeWidth="1.5" />
          </g>
        )}
      </svg>
    </div>
  );
}
