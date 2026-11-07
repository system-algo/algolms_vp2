import React from 'react';

/**
 * Mars Mission Intro Tutorial Modal Dialog
 * Matches the exact intro popup shown in the user's screenshot:
 * - Yellow spring robot mascot popping out on the left
 * - "Lead the robot to the living compartment of the station."
 * - Robot -> arrow -> orange X marker
 * - Orange "Continue" button
 */
export default function MarsTutorialModal({ onClose, instruction }) {
  const missionText =
    instruction || 'Lead the robot to the living compartment of the station.';

  return (
    <div
      className="mars-tutorial-backdrop"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(3px)',
        animation: 'fadeIn 0.25s ease',
      }}
      onClick={onClose}
    >
      <div
        className="mars-tutorial-card-container"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          maxWidth: '520px',
          width: '92%',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Popping Mascot Robot on Left Corner */}
        <div
          style={{
            position: 'absolute',
            left: '-48px',
            top: '-24px',
            zIndex: 10,
            filter: 'drop-shadow(0 6px 12px rgba(0, 0, 0, 0.35))',
            pointerEvents: 'none',
          }}
        >
          <svg width="120" height="140" viewBox="0 0 72 72" fill="none">
            {/* Spring Coil Base */}
            <g transform="translate(23, 50)">
              <path
                d="M 6 0 Q 20 -2 20 5 Q 6 8 6 12 Q 20 13 20 17"
                stroke="#EA580C"
                strokeWidth="4.5"
                strokeLinecap="round"
                fill="none"
              />
              <ellipse cx="13" cy="18" rx="10" ry="3.5" fill="#C2410C" />
            </g>
            {/* Left Arm */}
            <path
              d="M 17 32 C 10 32 8 40 12 45 C 14 47 16 46 17 44"
              stroke="#1E1E24"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="12" cy="45" r="3" fill="#1E1E24" />
            {/* Right Arm */}
            <path
              d="M 55 32 C 62 32 64 40 60 45 C 58 47 56 46 55 44"
              stroke="#1E1E24"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="60" cy="45" r="3" fill="#1E1E24" />
            {/* Main Body */}
            <rect
              x="18"
              y="10"
              width="36"
              height="42"
              rx="12"
              fill="#F6C324"
              stroke="#B45309"
              strokeWidth="2.5"
            />
            {/* Left Eye */}
            <ellipse cx="29" cy="24" rx="6" ry="6.5" fill="#FFFFFF" stroke="#1E1E24" strokeWidth="1.8" />
            <ellipse cx="30" cy="24" rx="3.5" ry="4" fill="#0EA5E9" />
            <circle cx="31" cy="22" r="1.5" fill="#FFFFFF" />
            {/* Right Eye */}
            <ellipse cx="43" cy="24" rx="6" ry="6.5" fill="#FFFFFF" stroke="#1E1E24" strokeWidth="1.8" />
            <ellipse cx="42" cy="24" rx="3.5" ry="4" fill="#0EA5E9" />
            <circle cx="43" cy="22" r="1.5" fill="#FFFFFF" />
            {/* Mouth */}
            <path
              d="M 27 36 Q 36 43 45 36"
              stroke="#1E1E24"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </div>

        {/* White Dialog Box */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '28px 28px 24px 80px',
            boxShadow: '0 20px 45px rgba(0, 0, 0, 0.45)',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            boxSizing: 'border-box',
          }}
        >
          {/* Mission Instruction Text */}
          <div
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: '#1e293b',
              lineHeight: 1.5,
              marginBottom: '20px',
            }}
          >
            {missionText}
          </div>

          {/* Diagram: Robot -> dashed arrow -> X box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              gap: '20px',
              marginBottom: '24px',
              padding: '10px 0',
            }}
          >
            {/* Mini Robot on tile */}
            <div
              style={{
                width: '64px',
                height: '64px',
                background: '#ffedd5',
                border: '2px solid #fed7aa',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="42" height="42" viewBox="0 0 72 72" fill="none">
                <rect x="20" y="14" width="32" height="36" rx="10" fill="#F6C324" stroke="#B45309" strokeWidth="2" />
                <circle cx="28" cy="24" r="3" fill="#0EA5E9" />
                <circle cx="44" cy="24" r="3" fill="#0EA5E9" />
                <path d="M 28 36 Q 36 42 44 36" stroke="#1E1E24" strokeWidth="2.5" fill="none" />
              </svg>
            </div>

            {/* Dashed Arrow */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <div style={{ width: '8px', height: '4px', background: '#334155', borderRadius: '2px' }} />
              <div style={{ width: '8px', height: '4px', background: '#334155', borderRadius: '2px' }} />
              <div style={{ width: '8px', height: '4px', background: '#334155', borderRadius: '2px' }} />
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M 5 12 L 18 12 M 12 5 L 19 12 L 12 19" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {/* Target X Tile */}
            <div
              style={{
                width: '64px',
                height: '64px',
                background: '#EA580C',
                borderRadius: '8px',
                boxShadow: '0 4px 10px rgba(234, 88, 12, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                <path d="M 6 6 L 18 18 M 18 6 L 6 18" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Continue Button */}
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#FF6300',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '11px 32px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(255, 99, 0, 0.35)',
              transition: 'background 0.15s ease, transform 0.1s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#e65800')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#FF6300')}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
