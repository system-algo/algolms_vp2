import React from 'react';
import RobotSprite from './RobotSprite';

/**
 * GridEngine renders the 2D Mars rover game board
 */
export default function GridEngine({
  gridConfig,
  robotState,
  cargos = [],
  isExecuting = false,
  cellSize = 56,
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
      {/* Background Cave / Crater Edge Visual Accents */}
      <svg
        style={{
          position: 'absolute',
          top: -30,
          left: -40,
          width: gridWidth + 80,
          height: gridHeight + 60,
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        <defs>
          <radialGradient id="craterGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#c2573a" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#692817" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Subtle terrain ambient glow */}
        <circle cx={gridWidth / 2} cy={gridHeight / 2} r={gridWidth / 2 + 20} fill="url(#craterGlow)" />
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

          return (
            <div
              key={`${tile.x},${tile.y}`}
              className="track-tile"
              style={{
                position: 'absolute',
                left: `${left}px`,
                top: `${top}px`,
                width: `${cellSize}px`,
                height: `${cellSize}px`,
                backgroundColor: '#f59e42',
                border: '1.5px solid #d97724',
                boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.15)',
                borderRadius: '4px',
                boxSizing: 'border-box',
                transition: 'background-color 0.2s',
              }}
            />
          );
        })}
      </div>

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
          left: `${robotState.x * cellSize + (cellSize - 52) / 2}px`,
          top: `${robotState.y * cellSize + (cellSize - 52) / 2}px`,
          transition: 'left 0.35s cubic-bezier(0.25, 1, 0.5, 1), top 0.35s cubic-bezier(0.25, 1, 0.5, 1)',
          zIndex: 10,
        }}
      >
        <RobotSprite
          direction={robotState.direction}
          isMoving={isExecuting}
          carriedCargo={robotState.carriedCargo}
          size={52}
        />
      </div>
    </div>
  );
}
