import './lms-activity-frame.css';

export default function LmsActivityFrame({
  children,
  title,
  status,
  onNextTask,
  onPrevTask,
  onBack,
  nextLabel = 'Next',
  
  // Floating Action Props
  onCheck,
  onReset,
  isCheckDisabled,
  isResetDisabled,
  isCheckLoading,
}) {
  const hasNext = typeof onNextTask === 'function';
  const hasPrev = typeof onPrevTask === 'function';
  const hasBack = typeof onBack === 'function';

  return (
    <main className="lms-frame">
      <div className="lms-frame__inner">
        {hasPrev && (
          <button
            type="button"
            className="lms-frame__side lms-frame__side--left"
            onClick={onPrevTask}
            title="Previous Activity"
          >
            ‹
          </button>
        )}

        <section
          className="lms-frame__card"
          aria-label={title || 'Activity'}
        >
          <div className="lms-frame__content">
            {children}
          </div>
          
          {/* Floating Action Buttons */}
          {(onCheck || onReset) && (
            <div className="lms-frame__floating-actions">
              {onCheck && (
                <button
                  type="button"
                  className="lms-fab lms-fab--check"
                  onClick={onCheck}
                  disabled={isCheckDisabled || isCheckLoading}
                  title="Check answer"
                >
                  {isCheckLoading ? (
                    <span className="lms-fab-spinner" />
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              )}
              {onReset && (
                <button
                  type="button"
                  className="lms-fab lms-fab--reset"
                  onClick={onReset}
                  disabled={isResetDisabled}
                  title="Reset"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <polyline points="3 3 3 8 8 8" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </section>

        {hasNext && (
          <button
            type="button"
            className="lms-frame__side lms-frame__side--right"
            onClick={onNextTask}
            title="Next Activity"
          >
            ›
          </button>
        )}
      </div>

      <div
        className="lms-frame__bottom"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '16px',
        }}
      >
        {hasBack && (
          <button
            type="button"
            onClick={onBack}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '8px',
              fontWeight: 600,
              transition: 'all 0.2s ease',
              backdropFilter: 'blur(4px)',
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
              event.currentTarget.style.transform = 'translateY(-2px)';
              event.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              event.currentTarget.style.transform = 'translateY(0)';
              event.currentTarget.style.boxShadow = 'none';
            }}
            onMouseDown={(event) => {
              event.currentTarget.style.transform = 'translateY(0)';
              event.currentTarget.style.boxShadow = 'none';
            }}
            onMouseUp={(event) => {
              event.currentTarget.style.transform = 'translateY(-2px)';
              event.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
              />
            </svg>
            Back to Course
          </button>
        )}
      </div>
    </main>
  );
}