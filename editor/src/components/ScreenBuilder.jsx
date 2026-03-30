import useWidgetTree from '../hooks/useWidgetTree'
import useStore from '../store/useStore'
import ActionToast from './screenBuilder/ActionToast'
import NavSettings from './screenBuilder/NavSettings'
import PreviewToolbar from './screenBuilder/PreviewToolbar'
import ScreenPreview from './screenBuilder/ScreenPreview'
import WidgetProperties from './screenBuilder/WidgetProperties'
import WidgetTree from './screenBuilder/WidgetTree'
import { useEffect, useState } from 'react'

export default function ScreenBuilder() {
  const { activeScreen } = useWidgetTree()
  const previewDataSource = useStore((s) => s.previewDataSource)
  const [toastAction, setToastAction] = useState(null)

  useEffect(() => {
    if (!toastAction) return undefined

    const timeout = window.setTimeout(() => setToastAction(null), 1800)
    return () => window.clearTimeout(timeout)
  }, [toastAction])

  return (
    <div style={shellWrap}>
      <aside style={panelStyle}>
        <WidgetTree />
      </aside>

      <main style={previewPanelStyle}>
        <div style={previewHeaderStyle}>
          <div>
            <SectionEyebrow>Preview</SectionEyebrow>
            <PanelTitle>{activeScreen?.name ?? 'No screen selected yet'}</PanelTitle>
          </div>
          <div style={previewModeBadge}>{previewDataSource.toUpperCase()}</div>
        </div>
        <PreviewToolbar />

        <div style={previewShellStyle}>
          <div style={previewStageStyle}>
            <ScreenPreview onAction={(action) => setToastAction(action)} />
            <ActionToast action={toastAction} />
          </div>
        </div>
      </main>

      <aside style={panelStyle}>
        <SectionEyebrow>Properties</SectionEyebrow>
        <NavSettings />
        <div style={dividerStyle} />
        <WidgetProperties />
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
  gridTemplateColumns: '280px minmax(0, 1fr) 320px',
  gap: 16,
  flex: 1,
  minWidth: 0,
  padding: 16,
  background: 'radial-gradient(circle at top left, #151528 0%, #0d0d1a 55%, #090912 100%)',
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
}

const previewPanelStyle = {
  ...panelStyle,
  padding: 0,
  overflow: 'hidden',
}

const previewHeaderStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 16,
  padding: 18,
  borderBottom: '1px solid #2a2a3e',
  background: 'linear-gradient(180deg, #151525 0%, #11111c 100%)',
}

const previewModeBadge = {
  borderRadius: 999,
  border: '1px solid #3b3770',
  background: '#201d47',
  color: '#c8c4ff',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.1em',
  padding: '6px 10px',
}

const previewShellStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 1,
  minHeight: 0,
  padding: 24,
  background: 'radial-gradient(circle at center, #16162a 0%, #0f0f1b 68%, #0b0b14 100%)',
}

const previewStageStyle = {
  position: 'relative',
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const dividerStyle = {
  height: 1,
  background: '#1e1e32',
  margin: '10px 0',
}
