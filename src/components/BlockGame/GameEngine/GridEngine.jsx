import React from 'react';
import RobotSprite from './RobotSprite';

/**
 * GridEngine renders the 2D Mars rover game board
 */
export default function GridEngine({
  gridConfig,
  robotState,
  cargos = [],
  targetTile = null,
  stationBuilding = null,
  isExecuting = false,
  cellSize = 64,
}) {
  const { cols = 8, rows = 7, tiles = [] } = gridConfig;

  // Set of valid tile keys for quick lookup: `${x},${y}`
  const tileSet = new Set(tiles.map((t) => `${t.x},${t.y}`));

  // Width and height of grid area
  const gridWidth = cols * cellSize;
  const gridHeight = rows * cellSize;

  return (
    <div
      className="game-grid-viewport"
      style={{
        position: 'relative',
        width: `${gridWidth}px`,
        height: `${gridHeight}px`,
        margin: 'auto',
      }}
    >
      {/* Background Starry / Nebular Glow */}
      <svg
        style={{
          position: 'absolute',
          top: -40,
          left: -50,
          width: gridWidth + 100,
          height: gridHeight + 80,
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        <defs>
          <radialGradient id="spacePurpleGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.25" />
            <stop offset="70%" stopColor="#4c1d95" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#1e1035" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx={gridWidth / 2} cy={gridHeight / 2} r={gridWidth / 2 + 60} fill="url(#spacePurpleGlow)" />
      </svg>

      {/* Grid Path Tiles */}
      <div
        className="grid-tiles-layer"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 2,
        }}
      >
        {tiles.map((tile) => {
          const left = tile.x * cellSize;
          const top = tile.y * cellSize;
          const isTarget = targetTile && targetTile.x === tile.x && targetTile.y === tile.y;

          return (
            <div
              key={`${tile.x},${tile.y}`}
              className={`track-tile ${isTarget ? 'target-tile' : ''}`}
              style={{
                position: 'absolute',
                left: `${left}px`,
                top: `${top}px`,
                width: `${cellSize}px`,
                height: `${cellSize}px`,
                backgroundColor: isTarget ? '#EA580C' : '#F97316',
                border: isTarget ? '2px solid #C2410C' : '1.5px solid #EA580C',
                boxShadow: isTarget
                  ? '0 0 16px rgba(249, 115, 22, 0.6), inset 0 2px 4px rgba(255,255,255,0.3)'
                  : 'inset 0 2px 4px rgba(255,255,255,0.25), inset 0 -2px 4px rgba(0,0,0,0.2)',
                borderRadius: '6px',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s',
              }}
            >
              {/* Target X Marker */}
              {isTarget && (
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
                  <path
                    d="M 6 6 L 18 18 M 18 6 L 6 18"
                    stroke="#FFFFFF"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </div>
          );
        })}
      </div>

      {/* Space Station Building & Solar Panel */}
      {stationBuilding && (
        <div
          className="station-building-layer"
          style={{
            position: 'absolute',
            left: `${stationBuilding.x * cellSize}px`,
            top: `${stationBuilding.y * cellSize}px`,
            zIndex: 4,
            pointerEvents: 'none',
          }}
        >
          {/* Station SVG */}
          <svg width="110" height="110" viewBox="0 0 100 100" fill="none">
            {/* Base Station Compartment */}
            <rect x="25" y="45" width="50" height="38" rx="6" fill="#475569" stroke="#1E293B" strokeWidth="2.5" />
            <rect x="30" y="52" width="40" height="24" rx="4" fill="#64748B" />
            {/* Door / Portal light */}
            <circle cx="50" cy="64" r="5" fill="#38BDF8" />

            {/* Support pole to solar array */}
            <rect x="46" y="32" width="8" height="15" fill="#334155" />

            {/* Solar Panel Array */}
            <polygon
              points="15,32 85,32 75,8 25,8"
              fill="#1E293B"
              stroke="#0EA5E9"
              strokeWidth="2"
            />
            {/* Solar cell grid lines */}
            <line x1="32" y1="8" x2="28" y2="32" stroke="#38BDF8" strokeWidth="1.2" />
            <line x1="50" y1="8" x2="50" y2="32" stroke="#38BDF8" strokeWidth="1.2" />
            <line x1="68" y1="8" x2="72" y2="32" stroke="#38BDF8" strokeWidth="1.2" />
            <line x1="20" y1="20" x2="80" y2="20" stroke="#38BDF8" strokeWidth="1.2" />
          </svg>
        </div>
      )}

      {/* Cargo Items Layer */}
      <div
        className="grid-cargos-layer"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 3,
        }}
      >
        {cargos.map((cargo) => {
          const left = cargo.x * cellSize + (cellSize - 32) / 2;
          const top = cargo.y * cellSize + (cellSize - 32) / 2;

          return (
            <div
              key={cargo.id}
              className="cargo-box-item"
              style={{
                position: 'absolute',
                left: `${left}px`,
                top: `${top}px`,
                width: '32px',
                height: '32px',
                backgroundColor: '#3b82f6',
                borderRadius: '6px',
                border: '2px solid #1d4ed8',
                boxShadow: '0 3px 6px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.2s ease',
              }}
            >
              {/* Inner Cargo Cross Line Pattern */}
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  border: '1.5px solid #bfdbfe',
                  borderRadius: '2px',
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Robot Character Layer */}
      <div
        className="grid-robot-layer"
        style={{
          position: 'absolute',
          left: `${robotState.x * cellSize + (cellSize - 56) / 2}px`,
          top: `${robotState.y * cellSize + (cellSize - 56) / 2}px`,
          transition: 'left 0.35s cubic-bezier(0.25, 1, 0.5, 1), top 0.35s cubic-bezier(0.25, 1, 0.5, 1)',
          zIndex: 10,
        }}
      >
        <RobotSprite
          direction={robotState.direction}
          isMoving={isExecuting}
          size={56}
        />
      </div>
    </div>
  );
}
