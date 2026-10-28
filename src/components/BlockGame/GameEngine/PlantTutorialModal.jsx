import React from 'react';
import PlantSprite from './PlantSprite';

/**
 * Tutorial Guide Modal Dialog for "Laser and Plants"
 * Matches the exact intro popup shown in the user's screenshot.
 */
export default function PlantTutorialModal({ onClose }) {
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
        paddingTop: '60px',
        background: 'rgba(0, 0, 0, 0.4)',
        animation: 'fadeIn 0.25s ease',
      }}
      onClick={onClose}
    >
      <div
        className="plant-tutorial-card"
        style={{
          background: '#ffffff',
          borderRadius: '10px',
          padding: '24px 30px',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.35)',
          maxWidth: '380px',
          width: '90%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Guides Row */}
        <div style={{ display: 'flex', gap: '24px', marginBottom: '22px' }}>
          {/* Column 1: Harmful Plants */}
          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#334155',
                marginBottom: '8px',
              }}
            >
              harmful plants
            </div>
            <div
              style={{
                width: '56px',
                height: '56px',
                background: '#471b22',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PlantSprite type="pest" size={44} />
            </div>
          </div>

          {/* Column 2: Sprouts Stages */}
          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#334155',
                marginBottom: '8px',
              }}
            >
              sprouts
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {/* Stage 1 */}
              <div
                style={{
                  width: '38px',
                  height: '56px',
                  background: '#471b22',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Stage 1: Seedling"
              >
                <PlantSprite type="sprout" stage={1} size={30} />
              </div>

              {/* Stage 2 */}
              <div
                style={{
                  width: '38px',
                  height: '56px',
                  background: '#471b22',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Stage 2: Sprout"
              >
                <PlantSprite type="sprout" stage={2} size={30} />
              </div>

              {/* Stage 3 */}
              <div
                style={{
                  width: '38px',
                  height: '56px',
                  background: '#471b22',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Stage 3: Budding"
              >
                <PlantSprite type="sprout" stage={3} size={30} />
              </div>

              {/* Stage 4 (Watered Fruit Bush) */}
              <div
                style={{
                  width: '38px',
                  height: '56px',
                  background: '#471b22',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Stage 4: Grown Bush"
              >
                <PlantSprite type="sprout" stage={4} isWatered={true} size={30} />
              </div>
            </div>
          </div>
        </div>

        {/* Continue Button */}
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
  );
}
