import React from 'react';
import PlantSprite from './PlantSprite';

/**
 * Tutorial Guide Modal Dialog for "Laser and Plants"
 * Matches the exact intro popup and tutorial GIF shown in Algo LMS captures.
 */
export default function PlantTutorialModal({ level, onClose }) {
  const isLevel1 = !level || level.levelNumber === 1 || Boolean(level.tutorialGif);
  const isLevel2 = level && level.levelNumber === 2;
  const isLoopLevel = level && (level.levelNumber === 6 || level.levelNumber === 8 || level.levelNumber === 11);

  return (
    <div
      className="plant-tutorial-backdrop"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '40px',
        background: 'rgba(0, 0, 0, 0.55)',
        animation: 'fadeIn 0.25s ease',
      }}
      onClick={onClose}
    >
      <div
        className="plant-tutorial-card"
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '24px 28px',
          boxShadow: '0 20px 48px rgba(0, 0, 0, 0.45)',
          maxWidth: '440px',
          width: '92%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header with Close '✕' Button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
            {level?.title || 'Laser and plants'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              fontWeight: 700,
              color: '#64748b',
              cursor: 'pointer',
              padding: '2px 6px',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* 1. LEVEL 1: REAL CAPTURED ANIMATED GIF TUTORIAL */}
        {isLevel1 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '16px' }}>
            <div
              style={{
                width: '100%',
                borderRadius: '8px',
                overflow: 'hidden',
                background: '#2b0f14',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                marginBottom: '12px',
              }}
            >
              <img
                src="/courses/VP2/M2-Control-Structures/pages/VP2_M2L3_1/workspace/images/level_02_task_21714_actual_2_static_image_02_img.gif"
                alt="Destroy pest plant animation"
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            <p style={{ margin: 0, fontSize: '13.5px', color: '#334155', fontWeight: 500, textAlign: 'center', lineHeight: 1.5 }}>
              To destroy a pest plant, use the <strong>destroy</strong> command.
            </p>
          </div>
        )}

        {/* 2. LEVEL 2: SPROUT GROWTH STAGES */}
        {isLevel2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '20px' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  harmful plants
                </div>
                <div style={{ width: '56px', height: '56px', background: '#471b22', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PlantSprite type="pest" size={44} />
                </div>
              </div>

              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  sprouts growth stages
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[1, 2, 3].map((stg) => (
                    <div key={stg} style={{ width: '38px', height: '56px', background: '#471b22', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <PlantSprite type="sprout" stage={stg} size={30} />
                    </div>
                  ))}
                  <div style={{ width: '38px', height: '56px', background: '#471b22', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PlantSprite type="sprout" stage={4} isWatered={true} size={30} />
                  </div>
                </div>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: 1.45 }}>
              Find the small sprout and water it with the <strong>water</strong> command so it can grow!
            </p>
          </div>
        )}

        {/* 3. LOOP LEVELS (6, 8, 11) */}
        {isLoopLevel && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <span style={{ fontSize: '28px' }}>🔁</span>
              <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.4 }}>
                <strong>Repeat Loop Guide:</strong> Put repeating actions inside the <code>repeat ... times</code> block to save commands and meet the strict command limit!
              </div>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>
              {level?.hint || level?.instruction}
            </p>
          </div>
        )}

        {/* Generic level fallback if none of the above */}
        {!isLevel1 && !isLevel2 && !isLoopLevel && (
          <div style={{ marginBottom: '16px', fontSize: '13.5px', color: '#334155', lineHeight: 1.5 }}>
            <p style={{ margin: '0 0 8px 0' }}>{level?.instruction}</p>
            <p style={{ margin: 0, color: '#64748b', fontSize: '12.5px' }}>{level?.hint}</p>
          </div>
        )}

        {/* Bottom Continue Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#ff6300',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '9px 24px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(255, 99, 0, 0.4)',
              transition: 'background 0.15s ease, transform 0.1s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#e65900')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#ff6300')}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
