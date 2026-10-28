import React from 'react';
import GridEngine from './GridEngine';
import RadialEngine from './RadialEngine';

export default function GameView({
  level,
  robotState,
  cargos = [],
  plants = [],
  isExecuting = false,
  laserActive = false,
  waterActive = false,
  onRun,
  onReset,
  executionStatus, // 'idle' | 'running' | 'completed' | 'failed'
  statusMessage,
}) {
  const isRadial = level.mode === 'radial';

  return (
    <div
      className="game-view-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        position: 'relative',
        background: isRadial
          ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
          : 'linear-gradient(180deg, #8a3420 0%, #a4432c 40%, #5d2012 100%)',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Rocky Canyon Ceiling Decoration (for Mars mode) */}
      {!isRadial && (
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '60px',
            pointerEvents: 'none',
            zIndex: 1,
          }}
          preserveAspectRatio="none"
          viewBox="0 0 1000 60"
        >
          <path
            d="M 0 0 L 0 35 Q 120 55 240 30 T 480 40 T 720 25 T 900 45 L 1000 30 L 1000 0 Z"
            fill="#561d11"
          />
          <path
            d="M 0 0 L 0 20 Q 150 40 300 15 T 600 25 T 850 15 L 1000 20 L 1000 0 Z"
            fill="#3e130a"
          />
        </svg>
      )}

      {/* Main Game World Stage */}
      <div
        className="game-stage-wrapper"
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          position: 'relative',
          zIndex: 2,
        }}
      >
        {isRadial ? (
          <RadialEngine
            gardenConfig={level.garden || {}}
            robotState={robotState}
            plants={plants}
            isExecuting={isExecuting}
            laserActive={laserActive}
            waterActive={waterActive}
          />
        ) : (
          <GridEngine
            gridConfig={level.grid || {}}
            robotState={robotState}
            cargos={cargos}
            isExecuting={isExecuting}
          />
        )}
      </div>

      {/* Bottom Control & Instruction Panel */}
      <div
        className="game-bottom-panel"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingBottom: '24px',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* BIG ROUND PLAY BUTTON (Matching Image 1) */}
        <div style={{ position: 'relative', marginBottom: '12px' }}>
          {isExecuting ? (
            <button
              type="button"
              className="game-play-button is-running"
              onClick={onReset}
              title="Reset simulation"
              style={{
                width: '76px',
                height: '76px',
                borderRadius: '50%',
                background: '#ef4444',
                border: '4px solid #ffffff',
                boxShadow: '0 6px 16px rgba(0, 0, 0, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, background 0.15s ease',
              }}
            >
              <svg viewBox="0 0 24 24" width="30" height="30" fill="white">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              className="game-play-button"
              onClick={onRun}
              title="Run program"
              style={{
                width: '76px',
                height: '76px',
                borderRadius: '50%',
                background: '#22c55e',
                border: '4px solid #ffffff',
                boxShadow: '0 6px 16px rgba(0, 0, 0, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, background 0.15s ease',
              }}
            >
              {/* Play triangle with slight offset to visually center */}
              <svg viewBox="0 0 24 24" width="36" height="36" fill="white" style={{ marginLeft: '4px' }}>
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </button>
          )}
        </div>

        {/* Subtitle / Instruction Hint (Matching Image 1) */}
        <div
          className="game-instruction-hint"
          style={{
            color: '#fed7aa',
            fontSize: '14px',
            fontStyle: 'italic',
            textAlign: 'center',
            maxWidth: '85%',
            lineHeight: 1.4,
            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
          }}
        >
          {statusMessage || level.hint || 'I wonder which way you will lead the robot...'}
        </div>
      </div>

      {/* WIN / COMPLETION OVERLAY DIALOG */}
      {executionStatus === 'completed' && (
        <div
          className="game-result-modal-backdrop"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '28px 36px',
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
              maxWidth: '380px',
              width: '90%',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '8px' }}>🎉</div>
            <h2 style={{ margin: '0 0 8px 0', color: '#166534', fontSize: '24px', fontWeight: 800 }}>
              Great Job!
            </h2>
            <p style={{ margin: '0 0 20px 0', color: '#4b5563', fontSize: '15px' }}>
              You successfully completed the mission!
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={onReset}
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  background: '#f3f4f6',
                  color: '#374151',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Replay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAILED / ERROR DIALOG */}
      {executionStatus === 'failed' && (
        <div
          className="game-result-modal-backdrop"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '28px 36px',
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
              maxWidth: '380px',
              width: '90%',
            }}
          >
            <div style={{ fontSize: '44px', marginBottom: '8px' }}>⚠️</div>
            <h2 style={{ margin: '0 0 8px 0', color: '#991b1b', fontSize: '22px', fontWeight: 800 }}>
              Not quite!
            </h2>
            <p style={{ margin: '0 0 20px 0', color: '#4b5563', fontSize: '14px', lineHeight: 1.5 }}>
              {statusMessage || 'The robot did not complete all goals. Check your commands and try again!'}
            </p>
            <button
              type="button"
              onClick={onReset}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                background: '#ef4444',
                color: '#ffffff',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
