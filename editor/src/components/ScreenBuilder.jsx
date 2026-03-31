import useWidgetTree from '../hooks/useWidgetTree'
import useStore from '../store/useStore'
import ActionToast from './screenBuilder/ActionToast'
import { CanvasArea } from './screenBuilder/CanvasArea.jsx'
import ErrorBoundary from './screenBuilder/ErrorBoundary'
import NavSettings from './screenBuilder/NavSettings'
import { WidgetPalette } from './screenBuilder/WidgetPalette.jsx'
import WidgetProperties from './screenBuilder/WidgetProperties'
import WidgetTree from './screenBuilder/WidgetTree'
import { useEffect, useState } from 'react'

export function ScreenBuilder() {
  const { activeScreen, ensureDraft } = useWidgetTree()
  const previewDataSource = useStore((s) => s.previewDataSource)
  const [toastAction, setToastAction] = useState(null)
  const [errorResetKey, setErrorResetKey] = useState(0)

  // Ensure a draft screen exists as soon as ScreenBuilder mounts
  useEffect(() => {
    ensureDraft()
  }, [ensureDraft])

  useEffect(() => {
    if (!toastAction) return undefined

    const timeout = window.setTimeout(() => setToastAction(null), 1800)
    return () => window.clearTimeout(timeout)
  }, [toastAction])

  return (
    <div style={shellWrap}>
      {/* Left column: Palette (top) + Tree (bottom) */}
      <div style={leftColumnStyle}>
        <div style={paletteSectionStyle}>
          <ErrorBoundary label="WidgetPalette" title="Widget palette failed" icon="🧩">
            <WidgetPalette />
          </ErrorBoundary>
        </div>
        <div style={treeSectionStyle}>
          <ErrorBoundary label="WidgetTree" title="Widget tree failed" icon="🌳">
            <WidgetTree />
          </ErrorBoundary>
        </div>
      </div>

      {/* Center: Canvas Area */}
      <main style={canvasPanelStyle}>
        <ErrorBoundary
          key={errorResetKey}
          label="CanvasArea"
          title="Canvas failed to render"
          icon="🖼"
          onReset={() => setErrorResetKey((k) => k + 1)}
        >
          <CanvasArea onAction={(action) => setToastAction(action)} />
        </ErrorBoundary>
        <ActionToast action={toastAction} />
      </main>

      {/* Right: Properties */}
      <aside style={panelStyle}>
        <div style={eyebrowStyle}>Properties</div>
        <ErrorBoundary label="NavSettings" title="Nav settings failed" icon="⚙" showReset={false}>
          <NavSettings />
        </ErrorBoundary>
        <div style={dividerStyle} />
        <ErrorBoundary label="WidgetProperties" title="Properties panel failed" icon="📋" showReset={false}>
          <WidgetProperties />
        </ErrorBoundary>
      </aside>
    </div>
  )
}

function SectionEyebrow({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: '#7F77DD', textTransform: 'uppercase' }}>
      {children}
    </div>
  )
}

function PanelTitle({ children }) {
  return <div style={{ fontSize: 18, fontWeight: 700, color: '#f3f3ff', marginTop: 8 }}>{children}</div>
}

const shellWrap = {
  display: 'grid',
  gridTemplateColumns: '180px minmax(0, 1fr) 320px',
  gridTemplateRows: '1fr',
  gap: 16,
  flex: 1,
  minWidth: 0,
  padding: 16,
  background: 'radial-gradient(circle at top left, #151528 0%, #0d0d1a 55%, #090912 100%)',
}

const leftColumnStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  minHeight: 0,
}

const paletteSectionStyle = {
  flex: '0 0 auto',
  maxHeight: '40%',
  border: '1px solid #2a2a3e',
  borderRadius: 16,
  background: '#11111c',
  padding: 16,
  boxShadow: '0 14px 34px rgba(0,0,0,0.24)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
}

const treeSectionStyle = {
  flex: 1,
  minHeight: 0,
  border: '1px solid #2a2a3e',
  borderRadius: 16,
  background: '#11111c',
  padding: 16,
  boxShadow: '0 14px 34px rgba(0,0,0,0.24)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
}

const canvasPanelStyle = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  border: '1px solid #2a2a3e',
  borderRadius: 16,
  background: '#11111c',
  overflow: 'hidden',
  boxShadow: '0 14px 34px rgba(0,0,0,0.24)',
}

const panelStyle = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  border: '1px solid #2a2a3e',
  borderRadius: 16,
  background: '#11111c',
  padding: 18,
  boxShadow: '0 14px 34px rgba(0,0,0,0.24)',
  overflow: 'hidden',
}

const eyebrowStyle = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.14em',
  color: '#7F77DD',
  textTransform: 'uppercase',
}

const dividerStyle = {
  height: 1,
  background: '#1e1e32',
  margin: '10px 0',
}

export default ScreenBuilder
