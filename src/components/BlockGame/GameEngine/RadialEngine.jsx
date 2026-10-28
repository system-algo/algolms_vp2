import React from 'react';
import TurretRobotSprite from './TurretRobotSprite';
import PlantSprite from './PlantSprite';

/**
 * RadialEngine renders the Circular Garden "Laser and Plants" game board
 * Matching the exact visual style of Algo LMS VP2 Module 2 Lesson 3.
 */
export default function RadialEngine({
  gardenConfig,
  robotState = { direction: 270 },
  plants = [],
  isExecuting = false,
  laserActive = false,
  waterActive = false,
  size = 500,
}) {
  const center = size / 2;
  const radius = size * 0.36; // 180px radius at 500px size

  // Calculate target plant coordinate in current robot aiming direction
  const aimRad = ((robotState.direction - 90) * Math.PI) / 180;
  const targetX = center + radius * Math.cos(aimRad);
  const targetY = center + radius * Math.sin(aimRad);

  return (
    <div
      className="radial-garden-viewport"
      style={{
        position: 'relative',
        width: `${size}px`,
        height: `${size}px`,
        maxWidth: '100%',
        maxHeight: '100%',
        aspectRatio: '1 / 1',
        margin: 'auto',
        background: '#7d2d35',
        border: '2px solid #ff7a00',
        borderRadius: '4px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5), inset 0 0 40px rgba(0,0,0,0.3)',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* BACKGROUND DECORATION SVG (Foliage, Spider, Garden tools, Soil texture) */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        <defs>
          {/* Neon Green Laser Beam Glow */}
          <filter id="laserBeamFilter" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Water Droplet Glow */}
          <filter id="waterGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Subtle soil speckles */}
        <circle cx="80" cy="120" r="1.5" fill="#5c1e25" />
        <circle cx="160" cy="90" r="2" fill="#5c1e25" />
        <circle cx="380" cy="110" r="1.8" fill="#5c1e25" />
        <circle cx="430" cy="220" r="1.5" fill="#5c1e25" />
        <circle cx="70" cy="390" r="2" fill="#5c1e25" />
        <circle cx="410" cy="420" r="1.8" fill="#5c1e25" />

        {/* 1. TOP JUNGLE FOLIAGE SILHOUETTE */}
        <g fill="#1d0a0d">
          {/* Hanging leaves / vines across the top */}
          <path d="M 0 0 L 500 0 L 500 28 Q 460 38 430 20 Q 400 48 370 24 Q 340 40 310 22 Q 280 50 250 26 Q 220 44 190 20 Q 160 52 130 26 Q 100 40 70 22 Q 40 46 0 28 Z" />
          <path d="M 0 0 L 180 0 L 150 35 Q 110 55 80 30 Q 40 50 0 35 Z" fill="#140609" />
          <path d="M 320 0 L 500 0 L 500 35 Q 460 50 420 30 Q 370 52 340 32 Z" fill="#140609" />

          {/* Individual hanging palm vine leaves */}
          <path d="M 50 20 C 60 45 45 65 30 72 C 38 55 42 40 50 20 Z" />
          <path d="M 120 22 C 130 50 115 75 100 82 C 108 62 112 45 120 22 Z" />
          <path d="M 230 24 C 240 55 225 80 210 88 C 218 66 222 48 230 24 Z" />
          <path d="M 370 22 C 360 50 375 75 390 82 C 382 62 378 45 370 22 Z" />
          <path d="M 450 20 C 440 45 455 65 470 72 C 462 55 458 40 450 20 Z" />

          {/* Spider hanging on a fine web thread (Top-right) */}
          <line x1="420" y1="20" x2="420" y2="68" stroke="#3b151a" strokeWidth="1" />
          {/* Spider body */}
          <ellipse cx="420" cy="71" rx="4" ry="5" />
          <circle cx="420" cy="67" r="2.8" />
          {/* Spider legs */}
          <path d="M 416 69 Q 410 66 408 72" stroke="#1d0a0d" strokeWidth="1" fill="none" />
          <path d="M 424 69 Q 430 66 432 72" stroke="#1d0a0d" strokeWidth="1" fill="none" />
          <path d="M 416 73 Q 410 74 407 80" stroke="#1d0a0d" strokeWidth="1" fill="none" />
          <path d="M 424 73 Q 430 74 433 80" stroke="#1d0a0d" strokeWidth="1" fill="none" />
        </g>

        {/* 2. BOTTOM-LEFT GARDEN TOOLS SILHOUETTE (Shovel & Rake) */}
        <g stroke="#3a1318" fill="#3a1318" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {/* Shovel / Spade */}
          <line x1="68" y1="425" x2="115" y2="465" strokeWidth="3" />
          {/* Shovel blade */}
          <path d="M 68 425 C 60 415 50 412 45 420 C 40 428 48 438 58 442 Z" strokeWidth="1.5" />
          {/* Shovel handle grip */}
          <circle cx="118" cy="468" r="4.5" fill="none" strokeWidth="2" />

          {/* Rake */}
          <line x1="42" y1="462" x2="90" y2="446" strokeWidth="2.5" />
          <line x1="38" y1="452" x2="46" y2="472" strokeWidth="3.5" />
          <line x1="34" y1="450" x2="30" y2="453" strokeWidth="2.5" />
          <line x1="38" y1="456" x2="34" y2="460" strokeWidth="2.5" />
          <line x1="42" y1="462" x2="38" y2="466" strokeWidth="2.5" />
          <line x1="46" y1="468" x2="42" y2="472" strokeWidth="2.5" />
        </g>

        {/* 3. BOTTOM-RIGHT WATERING CAN SILHOUETTE */}
        <g stroke="#3a1318" fill="#3a1318" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          {/* Can body */}
          <path d="M 445 435 L 452 418 L 468 418 L 472 435 Z" />
          {/* Spout */}
          <line x1="447" y1="428" x2="436" y2="416" strokeWidth="2.5" />
          {/* Rose head */}
          <ellipse cx="434" cy="414" rx="3.5" ry="5.5" />
          {/* Handle */}
          <path d="M 466 420 C 476 422 476 432 469 435" fill="none" strokeWidth="2" />
        </g>

        {/* 4. ACTIVE LASER BEAM SHOOTING FROM TURRET TO TARGET */}
        {laserActive && (
          <g>
            {/* Outer soft green laser glow */}
            <line
              x1={center}
              y1={center}
              x2={targetX}
              y2={targetY}
              stroke="#22c55e"
              strokeWidth="10"
              strokeLinecap="round"
              opacity="0.45"
              filter="url(#laserBeamFilter)"
            />
            {/* Main intense laser beam */}
            <line
              x1={center}
              y1={center}
              x2={targetX}
              y2={targetY}
              stroke="#4ade80"
              strokeWidth="5"
              strokeLinecap="round"
              filter="url(#laserBeamFilter)"
            />
            {/* Core pure white hot beam */}
            <line
              x1={center}
              y1={center}
              x2={targetX}
              y2={targetY}
              stroke="#ffffff"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Laser impact burst at target plant */}
            <circle cx={targetX} cy={targetY} r="18" fill="#4ade80" opacity="0.6" filter="url(#laserBeamFilter)" />
            <circle cx={targetX} cy={targetY} r="9" fill="#ffffff" />
            <polygon
              points={`${targetX},${targetY - 18} ${targetX + 5},${targetY - 5} ${targetX + 18},${targetY} ${targetX + 5},${targetY + 5} ${targetX},${targetY + 18} ${targetX - 5},${targetY + 5} ${targetX - 18},${targetY} ${targetX - 5},${targetY - 5}`}
              fill="#ffffff"
            />
          </g>
        )}

        {/* 5. WATER STREAM / DROPLETS ANIMATION */}
        {waterActive && (
          <g filter="url(#waterGlow)">
            {/* Water path */}
            <path
              d={`M ${center} ${center} Q ${(center + targetX) / 2} ${(center + targetY) / 2 - 25} ${targetX} ${targetY}`}
              stroke="#38bdf8"
              strokeWidth="4"
              strokeDasharray="6 6"
              fill="none"
              opacity="0.8"
            />
            {/* Blue water drops */}
            <circle cx={(center * 2 + targetX) / 3} cy={(center * 2 + targetY) / 3 - 10} r="4.5" fill="#0284c7" />
            <circle cx={(center + targetX * 2) / 3} cy={(center + targetY * 2) / 3 - 14} r="5" fill="#38bdf8" />
            <circle cx={targetX - 4} cy={targetY - 8} r="6" fill="#7dd3fc" />
            {/* Splash circles at target */}
            <ellipse cx={targetX} cy={targetY + 12} rx="14" ry="4" fill="#0284c7" opacity="0.6" />
          </g>
        )}
      </svg>

      {/* PLANTS ARRANGED IN CIRCULAR TRACK (12 radial positions at 30° increments) */}
      <div
        className="radial-plants-layer"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 5,
        }}
      >
        {plants.map((plant) => {
          // Angle in Scratch: 0=Up, 90=Right, 180=Down, 270=Left
          const rad = ((plant.angle - 90) * Math.PI) / 180;
          const x = center + radius * Math.cos(rad) - 24;
          const y = center + radius * Math.sin(rad) - 24;

          return (
            <div
              key={plant.id || plant.angle}
              className={`plant-node ${plant.destroyed ? 'plant-is-destroyed' : ''}`}
              style={{
                position: 'absolute',
                left: `${x}px`,
                top: `${y}px`,
                width: '48px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.3s ease, opacity 0.3s ease',
              }}
              title={`Plant at ${plant.angle}°: ${plant.isEvil ? 'Harmful pest plant' : plant.type || 'Garden plant'}`}
            >
              <PlantSprite
                type={plant.type || (plant.isEvil ? 'pest' : 'bush')}
                stage={plant.stage || 1}
                isEvil={plant.isEvil}
                isWatered={plant.isWatered}
                destroyed={plant.destroyed}
                size={48}
              />
            </div>
          );
        })}
      </div>

      {/* CENTRAL ROBOT TURRET (Laser Tank Machine) */}
      <div
        style={{
          position: 'absolute',
          left: `${center - 55}px`,
          top: `${center - 35}px`,
          zIndex: 10,
        }}
      >
        <TurretRobotSprite
          direction={robotState.direction}
          isExecuting={isExecuting}
          laserActive={laserActive}
          waterActive={waterActive}
          width={110}
          height={70}
        />
      </div>
    </div>
  );
}
