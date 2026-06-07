import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { TenantProvider } from './store/tenant-context.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '2rem',
          background: '#1e1e24',
          color: '#ff5555',
          fontFamily: 'monospace',
          height: '100vh',
          width: '100vw',
          overflow: 'auto',
          boxSizing: 'border-box'
        }}>
          <h2>Oops! Algo deu errado.</h2>
          <p style={{ color: '#fff', fontSize: '1.1rem' }}>{this.state.error && this.state.error.toString()}</p>
          <pre style={{ background: '#2d2d34', padding: '1rem', borderRadius: '4px', color: '#ccc', whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.stack}
          </pre>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              background: '#ff5a00',
              border: 'none',
              color: '#fff',
              fontWeight: 'bold',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Recarregar Página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <TenantProvider>
        <App />
      </TenantProvider>
    </ErrorBoundary>
  </StrictMode>,
)
