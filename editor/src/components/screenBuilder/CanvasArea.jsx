import { useMemo, useRef, useEffect, useCallback } from 'react'
import { defineScreen, renderScreenToHTML } from '../../../../engine/layoutEngine.js'
import useScreenPreview from '../../hooks/useScreenPreview'
import useStore from '../../store/useStore'
import { CanvasToolbar } from './CanvasToolbar.jsx'
import SelectionOverlay from './SelectionOverlay.jsx'

export function CanvasArea({ onAction }) {
  const { activeScreen, snapshot } = useScreenPreview()
  const canvasZoom = useStore((s) => s.canvasZoom)
  const canvasFitMode = useStore((s) => s.canvasFitMode)
  const selectedWidgetId = useStore((s) => s.selectedWidgetId)
  const setSelectedWidgetId = useStore((s) => s.setSelectedWidgetId)
  const updateScreenWidget = useStore((s) => s.updateScreenWidget)

  const viewportRef = useRef(null)
  const surfaceRef = useRef(null)

  const html = useMemo(() => {
    if (!activeScreen?.id || !activeScreen?.layout?.type) return ''
    defineScreen(activeScreen.id, activeScreen)
    return renderScreenToHTML(activeScreen.id, snapshot, () => {})
  }, [activeScreen, snapshot])

  const handleCanvasClick = useCallback((event) => {
    const actionTarget = event.target instanceof Element
      ? event.target.closest('[data-action]')
      : null
    const action = actionTarget?.getAttribute('data-action')
    if (action) {
      event.preventDefault()
      event.stopPropagation()
      onAction?.(action)
      return
    }

    const widgetTarget = event.target instanceof Element
      ? event.target.closest('[data-widget-id]')
      : null
    const widgetId = widgetTarget?.getAttribute('data-widget-id')

    if (widgetId) {
      setSelectedWidgetId(widgetId)
    } else {
      setSelectedWidgetId(null)
    }
  }, [onAction, setSelectedWidgetId])

  const handleResize = useCallback((widgetId, updates) => {
    if (updates.width != null) {
      updateScreenWidget(widgetId, 'style.width', updates.width)
    }
    if (updates.height != null) {
      updateScreenWidget(widgetId, 'style.height', updates.height)
    }
  }, [updateScreenWidget])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedWidgetId(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setSelectedWidgetId])

  if (!activeScreen) {
    return (
      <div style={containerStyle}>
        <div style={emptyStateStyle}>
          Load or create a screen to start editing
        </div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      {/* Header with screen name */}
      <div style={headerStyle}>
        <div style={headerLeftStyle}>
          <span style={eyebrowStyle}>Canvas</span>
          <span style={screenNameStyle}>{activeScreen.name}</span>
        </div>
        {canvasFitMode === 'auto' && (
          <span style={fitBadgeStyle}>Auto-fit</span>
        )}
      </div>

      {/* Viewport with scrollbars */}
      <div style={viewportStyle} data-canvas-viewport ref={viewportRef}>
        {/* Grid background layer */}
        <div style={gridBackgroundStyle} />

        {/* Scaled canvas surface */}
        <div
          style={surfaceOuterStyle}
          onClick={handleCanvasClick}
          ref={surfaceRef}
        >
          <div
            data-canvas-surface
            style={{
              ...surfaceStyle,
              transform: `scale(${canvasZoom})`,
              transformOrigin: 'top left',
            }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
          {selectedWidgetId && (
            <SelectionOverlay
              containerRef={surfaceRef}
              selectedWidgetId={selectedWidgetId}
              onSelect={setSelectedWidgetId}
              onDeselect={() => setSelectedWidgetId(null)}
              onResize={handleResize}
            />
          )}
        </div>
      </div>

      {/* Floating toolbar */}
      <div data-canvas-toolbar style={toolbarContainerStyle}>
        <CanvasToolbar />
      </div>
    </div>
  )
}

const containerStyle = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  position: 'relative',
  overflow: 'hidden',
}

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 18px',
  borderBottom: '1px solid #2a2a3e',
  background: 'linear-gradient(180deg, #151525 0%, #11111c 100%)',
  flexShrink: 0,
}

const headerLeftStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
}

const eyebrowStyle = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.14em',
  color: '#7F77DD',
  textTransform: 'uppercase',
}

const screenNameStyle = {
  fontSize: 16,
  fontWeight: 700,
  color: '#f3f3ff',
}

const fitBadgeStyle = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.08em',
  color: '#7F77DD',
  textTransform: 'uppercase',
  padding: '4px 8px',
  borderRadius: 4,
  background: 'rgba(127, 119, 221, 0.15)',
  border: '1px solid rgba(127, 119, 221, 0.3)',
}

const viewportStyle = {
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  position: 'relative',
  background: '#0a0a14',
}

const gridBackgroundStyle = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  backgroundImage: 'radial-gradient(circle, #2a2a3e 1px, transparent 1px)',
  backgroundSize: '24px 24px',
  opacity: 0.5,
}

const surfaceOuterStyle = {
  position: 'relative',
  minHeight: '100%',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  padding: 48,
}

const surfaceStyle = {
  background: 'linear-gradient(180deg, #1b1b30 0%, #131322 100%)',
  borderRadius: 18,
  border: '1px solid #31314a',
  boxShadow: '0 20px 50px rgba(0,0,0,0.32)',
  padding: 28,
  minWidth: 320,
  color: '#f3f3ff',
  transition: 'transform 0.2s ease',
}

const toolbarContainerStyle = {
  position: 'absolute',
  top: 0,
  right: 0,
}

const emptyStateStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 1,
  color: '#8f8fb0',
  fontSize: 14,
  fontStyle: 'italic',
}