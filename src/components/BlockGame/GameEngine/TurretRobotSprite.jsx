import React from 'react';

/**
 * Mechanical Laser Turret Robot (Center of "Laser and Plants" garden)
 * Designed to accurately replicate the robot from Algo LMS VP2 Module 2 Lesson 3.
 */
export default function TurretRobotSprite({
  direction = 270, // Degrees (0=Up, 90=Right, 180=Down, 270=Left)
  isExecuting = false,
  laserActive = false,
  waterActive = false,
  width = 110,
  height = 70,
}) {
  // Base sprite is drawn facing Left (270 degrees)
  const rotation = direction - 270;

  return (
    <div
      style={{
        width: `${width}px`,
        height: `${height}px`,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: `rotate(${rotation}deg)`,
        transformOrigin: '55px 35px',
        transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        filter: 'drop-shadow(0 6px 12px rgba(0, 0, 0, 0.45))',
      }}
    >
      <svg
        viewBox="0 0 110 70"
        width={width}
        height={height}
        style={{ overflow: 'visible' }}
      >
        <defs>
          {/* Metallic Cyan Hull Gradient */}
          <linearGradient id="turretHullGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#327382" />
            <stop offset="50%" stopColor="#1e4f5a" />
            <stop offset="100%" stopColor="#12333b" />
          </linearGradient>

          {/* Tread Rubber Gradient */}
          <linearGradient id="treadGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e2c30" />
            <stop offset="50%" stopColor="#0f191c" />
            <stop offset="100%" stopColor="#1e2c30" />
          </linearGradient>

          {/* Neon Green Laser Glow */}
          <filter id="neonLaserGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 1. TOP & BOTTOM WHEEL TREADS */}
        {/* Top Tread */}
        <rect x="52" y="2" width="46" height="12" rx="4" fill="url(#treadGrad)" stroke="#091214" strokeWidth="1.5" />
        {/* Tread segment ridges */}
        <line x1="60" y1="2" x2="60" y2="14" stroke="#2a3d43" strokeWidth="1.5" />
        <line x1="68" y1="2" x2="68" y2="14" stroke="#2a3d43" strokeWidth="1.5" />
        <line x1="76" y1="2" x2="76" y2="14" stroke="#2a3d43" strokeWidth="1.5" />
        <line x1="84" y1="2" x2="84" y2="14" stroke="#2a3d43" strokeWidth="1.5" />
        <line x1="92" y1="2" x2="92" y2="14" stroke="#2a3d43" strokeWidth="1.5" />

        {/* Bottom Tread */}
        <rect x="52" y="56" width="46" height="12" rx="4" fill="url(#treadGrad)" stroke="#091214" strokeWidth="1.5" />
        <line x1="60" y1="56" x2="60" y2="68" stroke="#2a3d43" strokeWidth="1.5" />
        <line x1="68" y1="56" x2="68" y2="68" stroke="#2a3d43" strokeWidth="1.5" />
        <line x1="76" y1="56" x2="76" y2="68" stroke="#2a3d43" strokeWidth="1.5" />
        <line x1="84" y1="56" x2="84" y2="68" stroke="#2a3d43" strokeWidth="1.5" />
        <line x1="92" y1="56" x2="92" y2="68" stroke="#2a3d43" strokeWidth="1.5" />

        {/* 2. MAIN BODY CAPSULE HULL */}
        <rect
          x="44"
          y="10"
          width="56"
          height="50"
          rx="18"
          fill="url(#turretHullGrad)"
          stroke="#0d2328"
          strokeWidth="2"
        />

        {/* Back exhaust / engine heat sink */}
        <rect x="94" y="24" width="8" height="22" rx="3" fill="#122429" stroke="#091417" strokeWidth="1.5" />
        <line x1="97" y1="28" x2="97" y2="42" stroke="#48656d" strokeWidth="1.2" />
        <line x1="100" y1="28" x2="100" y2="42" stroke="#48656d" strokeWidth="1.2" />

        {/* Central Dome / Turret Viewport */}
        <circle cx="72" cy="35" r="14" fill="#173e46" stroke="#0d2328" strokeWidth="2" />
        <circle cx="72" cy="35" r="9" fill="#245b67" stroke="#3b8898" strokeWidth="1" />
        <circle cx="70" cy="33" r="3.5" fill="#58b3c5" />

        {/* Steel Rivets around dome */}
        <circle cx="56" cy="22" r="1.5" fill="#6296a2" />
        <circle cx="56" cy="48" r="1.5" fill="#6296a2" />
        <circle cx="86" cy="22" r="1.5" fill="#6296a2" />
        <circle cx="86" cy="48" r="1.5" fill="#6296a2" />

        {/* 3. FRONT LASER CANNON / EMITTER BARREL (Pointing Leftwards) */}
        {/* Base mount bracket */}
        <rect x="36" y="25" width="12" height="20" rx="3" fill="#173b43" stroke="#0d2328" strokeWidth="1.5" />

        {/* Main barrel shaft */}
        <rect x="22" y="29" width="16" height="12" rx="2" fill="#1b4650" stroke="#0d2328" strokeWidth="1.5" />

        {/* 3 Concentric Glowing Neon Green Energy Rings */}
        <ellipse cx="30" cy="35" rx="3" ry="8.5" fill="#4ade80" stroke="#16a34a" strokeWidth="1.2" filter="url(#neonLaserGlow)" />
        <ellipse cx="23" cy="35" rx="2.8" ry="7.5" fill="#4ade80" stroke="#16a34a" strokeWidth="1.2" filter="url(#neonLaserGlow)" />
        <ellipse cx="16" cy="35" rx="2.5" ry="6.5" fill="#4ade80" stroke="#16a34a" strokeWidth="1.2" filter="url(#neonLaserGlow)" />

        {/* Pointed Conical Green Nozzle Tip */}
        <polygon
          points="14,30 2,35 14,40"
          fill="#22c55e"
          stroke="#15803d"
          strokeWidth="1.2"
          filter="url(#neonLaserGlow)"
        />

        {/* Muzzle tip core spark */}
        <circle cx="2" cy="35" r="2.5" fill="#ffffff" filter="url(#neonLaserGlow)" />
      </svg>
    </div>
  );
}
