import React, { useState, useEffect } from 'react';
import GridEngine from './GridEngine';
import RadialEngine from './RadialEngine';
import PlantTutorialModal from './PlantTutorialModal';

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
  const [showTutorial, setShowTutorial] = useState(Boolean(level.hasTutorial));

  // Reset tutorial state when level changes
  useEffect(() => {
    setShowTutorial(Boolean(level.hasTutorial));
  }, [level.id, level.hasTutorial]);

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
          ? '#210a12' // Dark maroon matching screenshot
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

      {/* Reopen Tutorial / Info button */}
      {isRadial && level.hasTutorial && !showTutorial && (
        <button
          type="button"
          onClick={() => setShowTutorial(true)}
          title="Open game guide / tutorial"
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'rgba(255, 255, 255, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 15,
            transition: 'background 0.15s ease',
          }}
        >
          ?
        </button>
      )}

      {/* Main Game World Stage */}
      <div
        className="game-stage-wrapper"
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px 20px',
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
          paddingBottom: '20px',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* BIG ROUND PLAY BUTTON (Matching Screenshot) */}
        <div style={{ position: 'relative', marginBottom: '10px' }}>
          {isExecuting ? (
            <button
              type="button"
              className="game-play-button is-running"
              onClick={onReset}
              title="Reset simulation"
              style={{
                width: '74px',
                height: '74px',
                borderRadius: '50%',
                background: '#ef4444',
                border: '4px solid #ffffff',
                boxShadow: '0 6px 16px rgba(0, 0, 0, 0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, background 0.15s ease',
              }}
            >
              <svg viewBox="0 0 24 24" width="28" height="28" fill="white">
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
                width: '74px',
                height: '74px',
                borderRadius: '50%',
                background: '#22c55e',
                border: '4px solid #ffffff',
                boxShadow: '0 6px 16px rgba(0, 0, 0, 0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, background 0.15s ease',
              }}
            >
              {/* Play triangle with slight offset to visually center */}
              <svg viewBox="0 0 24 24" width="34" height="34" fill="white" style={{ marginLeft: '4px' }}>
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </button>
          )}
        </div>

        {/* Subtitle / Instruction Hint (e.g. "Destroy one pest plant and grow one good one") */}
        <div
          className="game-instruction-hint"
          style={{
            color: '#e2e8f0',
            fontSize: '13.5px',
            fontStyle: 'normal',
            fontWeight: 500,
            textAlign: 'center',
            maxWidth: '90%',
            lineHeight: 1.4,
            opacity: 0.9,
            textShadow: '0 1px 3px rgba(0,0,0,0.6)',
          }}
        >
          {statusMessage || level.hint || 'Destroy one pest plant and grow one good one'}
        </div>
      </div>

      {/* TUTORIAL MODAL DIALOG (Harmful Plants vs Sprouts) */}
      {isRadial && showTutorial && (
        <PlantTutorialModal onClose={() => setShowTutorial(false)} />
      )}

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
              You successfully destroyed the pest and grew the plant!
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={onReset}
                style={{
                  padding: '10px 22px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#22c55e',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(34, 197, 94, 0.35)',
                }}
              >
                Play Again
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
              {statusMessage || 'Check your commands and try again!'}
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
