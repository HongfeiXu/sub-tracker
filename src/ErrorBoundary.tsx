import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleReset = () => {
    localStorage.clear()
    this.setState({ hasError: false })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem', fontFamily: 'sans-serif' }}>
          <p style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>页面出了点问题</p>
          <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '1.5rem' }}>可能是本地数据损坏导致，可以尝试清除数据并重置。</p>
          <button
            onClick={this.handleReset}
            style={{ padding: '0.625rem 1.5rem', fontSize: '0.875rem', fontWeight: 500, borderRadius: '0.75rem', border: 'none', backgroundColor: '#3B82F6', color: '#fff', cursor: 'pointer' }}
          >
            清除数据并重置
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
