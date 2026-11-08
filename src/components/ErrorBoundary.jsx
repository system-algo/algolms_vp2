import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('LMS Application Error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleBackToDashboard = () => {
    try {
      sessionStorage.removeItem('lms_active_course');
      sessionStorage.removeItem('lms_active_lesson');
      sessionStorage.removeItem('lms_active_page');
      sessionStorage.removeItem('lms_active_task');
      window.location.href = '/';
    } catch {
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <main
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '24px',
            fontFamily: 'Nunito, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            background: '#0f172a',
            color: '#f8fafc',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              maxWidth: '520px',
              background: '#1e293b',
              padding: '32px',
              borderRadius: '16px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
              border: '1px solid #334155',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '8px', color: '#f1f5f9' }}>
              Something went wrong loading this lesson
            </h2>
            <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '20px', lineHeight: 1.5 }}>
              {this.state.error?.message || 'An unexpected error occurred while rendering the page.'}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#6366f1',
                  color: '#fff',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Reload Lesson
              </button>
              <button
                type="button"
                onClick={this.handleBackToDashboard}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid #475569',
                  background: 'transparent',
                  color: '#cbd5e1',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
