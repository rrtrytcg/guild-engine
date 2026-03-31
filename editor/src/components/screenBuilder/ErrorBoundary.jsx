import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error(`[ErrorBoundary] ${this.props.label || 'Component'}:`, error, info)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={this.props.fallbackStyle ?? errorContainerStyle}>
          <div style={errorIconStyle}>{this.props.icon ?? '⚠'}</div>
          <div style={errorTitleStyle}>
            {this.props.title ?? `${this.props.label ?? 'Component'} failed`}
          </div>
          <div style={errorMessageStyle}>
            {this.props.message ?? this.state.error?.message ?? 'An unexpected error occurred.'}
          </div>
          {this.props.showReset !== false && (
            <button type="button" onClick={this.handleReset} style={retryBtnStyle}>
              Retry
            </button>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

export function withErrorBoundary(Component, options = {}) {
  return function WrappedWithErrorBoundary(props) {
    return (
      <ErrorBoundary label={options.label ?? Component.displayName ?? Component.name} {...options}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}

const errorContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
  minHeight: 120,
  background: '#1a0a0a',
  border: '1px solid #3a1a1a',
  borderRadius: 12,
  color: '#c08080',
}

const errorIconStyle = {
  fontSize: 24,
  marginBottom: 8,
}

const errorTitleStyle = {
  fontSize: 13,
  fontWeight: 700,
  color: '#e06060',
  marginBottom: 4,
}

const errorMessageStyle = {
  fontSize: 11,
  color: '#907070',
  textAlign: 'center',
  maxWidth: 280,
  lineHeight: 1.5,
  marginBottom: 12,
}

const retryBtnStyle = {
  background: '#2a1a1a',
  border: '1px solid #4a2a2a',
  borderRadius: 6,
  color: '#d09090',
  fontSize: 11,
  fontWeight: 600,
  padding: '6px 16px',
  cursor: 'pointer',
}
