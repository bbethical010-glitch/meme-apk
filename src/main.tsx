import React, { StrictMode, Component, type ReactNode, type ErrorInfo } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

window.addEventListener('error', (event) => {
  console.error('[MemeCapsule] Global error caught:', event.error || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[MemeCapsule] Unhandled rejection:', event.reason);
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  }).catch((err) => console.log('Service Worker unregistration failed: ', err));
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorText: string;
}

class ErrorBoundary extends (Component as any) {
  props: ErrorBoundaryProps;
  state = { hasError: false, errorText: '' };

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorText: error?.message || 'Unexpected crash' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[MemeCapsule] ErrorBoundary caught error:', error, info);
  }

  handleReload = () => {
    try {
      sessionStorage.clear();
    } catch {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#131313',
          color: '#e5e2e1',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          boxSizing: 'border-box'
        }}>
          <div style={{
            maxWidth: '440px',
            width: '100%',
            backgroundColor: '#1c1b1b',
            border: '4px solid #dd0061',
            boxShadow: '6px 6px 0px #000000',
            padding: '24px',
            boxSizing: 'border-box'
          }}>
            <div style={{
              display: 'inline-block',
              backgroundColor: '#dd0061',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 900,
              padding: '4px 8px',
              textTransform: 'uppercase',
              marginBottom: '12px'
            }}>
              SYSTEM RECOVERED
            </div>
            <h1 style={{
              fontSize: '24px',
              fontWeight: 900,
              color: '#f4c300',
              textTransform: 'uppercase',
              margin: '0 0 10px 0',
              letterSpacing: '-0.5px'
            }}>
              APPLICATION HALTED
            </h1>
            <p style={{
              fontSize: '13px',
              color: '#988ca1',
              lineHeight: 1.5,
              margin: '0 0 16px 0'
            }}>
              Meme Capsule prevented a blank screen crash. Tap reload to start fresh.
            </p>
            {this.state.errorText && (
              <pre style={{
                fontSize: '11px',
                color: '#ff6b81',
                backgroundColor: '#111111',
                border: '1px solid #333333',
                padding: '8px',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                margin: '0 0 16px 0'
              }}>
                {this.state.errorText}
              </pre>
            )}
            <button
              onClick={this.handleReload}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#9b30ff',
                color: '#ffffff',
                border: '3px solid #000000',
                boxShadow: '4px 4px 0px #000000',
                fontSize: '15px',
                fontWeight: 900,
                textTransform: 'uppercase',
                cursor: 'pointer',
                letterSpacing: '0.5px'
              }}
            >
              RELOAD CAPSULE
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

