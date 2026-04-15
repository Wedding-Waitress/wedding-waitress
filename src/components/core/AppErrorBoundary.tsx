import React from 'react';

interface AppErrorBoundaryProps {
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('App crash:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{ padding: 16, textAlign: 'center', marginTop: 50 }}>
          <h2 style={{ marginBottom: 10 }}>Something went wrong</h2>
          <p>Please refresh the page to continue.</p>
          <button 
            onClick={() => window.location.reload()} 
            style={{ 
              marginTop: 20, 
              padding: '10px 20px', 
              cursor: 'pointer',
              backgroundColor: '#967A59',
              color: 'white',
              border: 'none',
              borderRadius: '6px'
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
