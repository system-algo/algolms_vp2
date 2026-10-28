import React from 'react';
import RobotSprite from './RobotSprite';

/**
 * RadialEngine renders the Circular Garden "Laser and Plants" game board
 */
export default function RadialEngine({
  gardenConfig,
  robotState,
  plants = [],
  isExecuting = false,
  laserActive = false,
  waterActive = false,
  size = 480,
}) {
  const center = size / 2;
  const radius = size * 0.38;

  return (
    <div
      className="radial-garden-viewport"
      style={{
        position: 'relative',
        width: `${size}px`,
        height: `${size}px`,
        margin: 'auto',
        borderRadius: '50%',
        background: 'radial-gradient(circle, #2d5a27 0%, #1e3a1a 70%, #142912 100%)',
        border: '6px solid #3f6212',
        boxShadow: 'inset 0 0 20px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.3)',
        overflow: 'hidden',
      }}
    >
      {/* Garden Degree Ring Markings */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />

        {/* 30-degree markers */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = i * 30;
          const rad = (angle - 90) * (Math.PI / 180);
          const x1 = center + (radius - 12) * Math.cos(rad);
          const y1 = center + (radius - 12) * Math.sin(rad);
          const x2 = center + (radius + 12) * Math.cos(rad);
          const y2 = center + (radius + 12) * Math.sin(rad);

          return (
            <line
              key={angle}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(255,255,255,0.25)"
              strokeWidth="2"
            />
          );
        })}

        {/* Laser Beam effect */}
        {laserActive && (
          <line
            x1={center}
            y1={center}
            x2={center + radius * Math.cos(((robotState.direction - 90) * Math.PI) / 180)}
            y2={center + radius * Math.sin(((robotState.direction - 90) * Math.PI) / 180)}
            stroke="#ef4444"
            strokeWidth="5"
            strokeLinecap="round"
            filter="drop-shadow(0 0 6px #ef4444)"
          />
        )}
      </svg>

      {/* Plants along the circular track */}
      {plants.map((plant) => {
        const rad = ((plant.angle - 90) * Math.PI) / 180;
        const x = center + radius * Math.cos(rad) - 24;
        const y = center + radius * Math.sin(rad) - 24;

        return (
          <div
            key={plant.id || plant.angle}
            className={`plant-item ${plant.destroyed ? 'plant-destroyed' : ''}`}
            style={{
              position: 'absolute',
              left: `${x}px`,
              top: `${y}px`,
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              transition: 'transform 0.3s ease, opacity 0.3s ease',
              opacity: plant.destroyed ? 0 : 1,
              transform: plant.destroyed ? 'scale(0)' : 'scale(1)',
            }}
          >
            {plant.isEvil ? '👾' : plant.isWatered ? '🌺' : '🌱'}
          </div>
        );
      })}

      {/* Robot in the Center */}
      <div
        style={{
          position: 'absolute',
          left: `${center - 26}px`,
          top: `${center - 26}px`,
          zIndex: 10,
        }}
      >
        <RobotSprite direction={robotState.direction} isMoving={isExecuting} size={52} />
      </div>
    </div>
  );
}
