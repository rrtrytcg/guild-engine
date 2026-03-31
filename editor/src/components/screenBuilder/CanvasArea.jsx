import { useMemo, useRef, useEffect, useCallback, useState } from 'react'
import { defineScreen, renderScreenToHTML } from '../../../../engine/layoutEngine.js'
import useScreenPreview from '../../hooks/useScreenPreview'
import useStore from '../../store/useStore'
import useScreenFiles from '../../hooks/useScreenFiles'
import { CanvasToolbar } from './CanvasToolbar.jsx'
import SelectionOverlay from './SelectionOverlay.jsx'
import DropZone from './DropZone.jsx'

export function CanvasArea({ onAction }) {
  const { activeScreen, snapshot } = useScreenPreview()
  const canvasZoom = useStore((s) => s.canvasZoom)
  const canvasFitMode = useStore((s) => s.canvasFitMode)
  const selectedWidgetId = useStore((s) => s.selectedWidgetId)
  const setSelectedWidgetId = useStore((s) => s.setSelectedWidgetId)
  const updateScreenWidget = useStore((s) => s.updateScreenWidget)
  const createScreen = useStore((s) => s.createScreen)
  const deleteScreen = useStore((s) => s.deleteScreen)
  const renameScreen = useStore((s) => s.renameScreen)
  const addScreenWidget = useStore((s) => s.addScreenWidget)

  const { screens, loadFromFiles, saveActiveScreen, selectScreen, isDirty, activeScreenId } = useScreenFiles()

  const viewportRef = useRef(null)
  const surfaceRef = useRef(null)
  const [renameTarget, setRenameTarget] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const fileInputRef = useRef(null)
  const [dragOverContainer, setDragOverContainer] = useState(null)
  const [dragPosition, setDragPosition] = useState(null)

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

  const handleMove = useCallback((widgetId, delta) => {
    if (delta.left != null) {
      updateScreenWidget(widgetId, 'style.left', delta.left)
    }
    if (delta.top != null) {
      updateScreenWidget(widgetId, 'style.top', delta.top)
    }
  }, [updateScreenWidget])

  const handleRenameSubmit = () => {
    if (renameTarget && renameValue.trim()) {
      renameScreen(renameTarget, renameValue.trim())
    }
    setRenameTarget(null)
    setRenameValue('')
  }

  const handleDeleteScreen = (screenId) => {
    if (screens.length > 1) {
      deleteScreen(screenId)
    }
  }

  // Drag and drop handlers
  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    
    // Find the widget element being hovered
    const widgetEl = e.target.closest('[data-widget-id]')
    
    if (widgetEl) {
      const widgetId = widgetEl.getAttribute('data-widget-id')
      const widgetType = widgetEl.getAttribute('data-widget-type')
      
      // Only allow drop on container widgets
      if (['vbox', 'hbox', 'grid', 'stack'].includes(widgetType)) {
        const rect = widgetEl.getBoundingClientRect()
        const offsetY = e.clientY - rect.top
        const threshold = rect.height / 3
        
        // Determine drop position based on vertical position
        let dropPosition
        if (offsetY < threshold) {
          dropPosition = 'before'
        } else if (offsetY > rect.height - threshold) {
          dropPosition = 'after'
        } else {
          dropPosition = 'inside'
        }
        
        setDragOverContainer(widgetId)
        setDragPosition(dropPosition)
        return
      }
    }
    
    // Default: drop on root surface
    setDragOverContainer('root')
    setDragPosition('inside')
  }, [])

  const handleDragLeave = useCallback((e) => {
    // Only clear if we're leaving the canvas entirely
    const viewport = e.currentTarget
    const related = e.relatedTarget
    
    if (!viewport.contains(related)) {
      setDragOverContainer(null)
      setDragPosition(null)
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    
    const widgetType = e.dataTransfer.getData('application/x-widget-type')
    const targetContainer = dragOverContainer
    
    setDragOverContainer(null)
    setDragPosition(null)
    
    if (widgetType && targetContainer) {
      addScreenWidget(targetContainer, widgetType)
    }
  }, [dragOverContainer, addScreenWidget])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedWidgetId(null)
        setRenameTarget(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setSelectedWidgetId])

  if (!activeScreen) {
    return (
      <div style={containerStyle}>
        <div style={emptyStateStyle}>
          <div style={toolbarRowStyle}>
            <button type="button" onClick={() => fileInputRef.current?.click()} style={toolbarButtonStyle}>
              Load
            </button>
            <button type="button" onClick={() => createScreen('New Screen')} style={toolbarButtonStyle}>
              + New
            </button>
          </div>
          <div style={emptyMessageStyle}>
            Load a screen file or create a new one to start editing
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.screen.json,application/json"
            multiple
            style={{ display: 'none' }}
            onChange={(event) => {
              void loadFromFiles(event.target.files)
              event.target.value = ''
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      {/* Header with screen tabs and actions */}
      <div style={headerStyle}>
        <div style={headerLeftStyle}>
          <span style={eyebrowStyle}>Canvas</span>
          <span style={screenNameStyle}>{activeScreen.name}</span>
        </div>
        <div style={headerActionsStyle}>
          <button type="button" onClick={() => fileInputRef.current?.click()} style={headerButtonStyle}>
            Load
          </button>
          <button type="button" onClick={() => void saveActiveScreen()} style={headerButtonStyle}>
            Save
          </button>
          <button type="button" onClick={() => createScreen('New Screen')} style={headerButtonStyle}>
            + New
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.screen.json,application/json"
            multiple
            style={{ display: 'none' }}
            onChange={(event) => {
              void loadFromFiles(event.target.files)
              event.target.value = ''
            }}
          />
        </div>
      </div>

      {/* Screen tabs */}
      <div style={tabsStyle}>
        {screens.map((screen) => (
          <div
            key={screen.id}
            style={tabOuterStyle(activeScreenId === screen.id)}
            onDoubleClick={() => {
              setRenameTarget(screen.id)
              setRenameValue(screen.name)
            }}
          >
            {renameTarget === screen.id ? (
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameSubmit()
                  if (e.key === 'Escape') {
                    setRenameTarget(null)
                    setRenameValue('')
                  }
                }}
                style={renameInputStyle}
                autoFocus
              />
            ) : (
              <button
                type="button"
                onClick={() => selectScreen(screen.id)}
                style={tabBtnStyle(activeScreenId === screen.id)}
                title={`${screen.name}\n(Double-click to rename)`}
              >
                {screen.name}
              </button>
            )}
            {screens.length > 1 && (
              <button
                type="button"
                onClick={() => handleDeleteScreen(screen.id)}
                style={deleteTabBtnStyle}
                title="Delete screen"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        {isDirty && <span style={dirtyBadgeStyle}>Unsaved</span>}
      </div>

  {/* Viewport with scrollbars */}
  <div 
    style={viewportStyle} 
    data-canvas-viewport 
    ref={viewportRef}
    onDragOver={handleDragOver}
    onDragLeave={handleDragLeave}
    onDrop={handleDrop}
  >
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
          onMove={handleMove}
        />
      )}
      {/* Drop zone overlay */}
      {dragOverContainer && <DropZone containerId={dragOverContainer} position={dragPosition} />}
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

const toolbarRowStyle = {
  display: 'flex',
  gap: 8,
  marginBottom: 12,
}

const toolbarButtonStyle = {
  background: '#171727',
  border: '1px solid #2f2f48',
  borderRadius: 8,
  color: '#d7d7ee',
  fontSize: 12,
  fontWeight: 700,
  padding: '8px 10px',
  cursor: 'pointer',
}

const emptyMessageStyle = {
  color: '#6e6e92',
  fontSize: 13,
  marginTop: 12,
}

const headerActionsStyle = {
  display: 'flex',
  gap: 8,
}

const headerButtonStyle = {
  background: '#171727',
  border: '1px solid #2f2f48',
  borderRadius: 8,
  color: '#d7d7ee',
  fontSize: 11,
  fontWeight: 700,
  padding: '6px 10px',
  cursor: 'pointer',
}

const tabsStyle = {
  display: 'flex',
  gap: 6,
  padding: '10px 18px',
  borderBottom: '1px solid #2a2a3e',
  background: '#0f0f1a',
  flexWrap: 'wrap',
  alignItems: 'center',
}

const tabOuterStyle = (active) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 2,
  background: active ? '#1e1b40' : 'transparent',
  border: `1px solid ${active ? '#4b44a6' : 'transparent'}`,
  borderRadius: 999,
  padding: active ? '4px 6px 4px 10px' : '4px 6px',
})

const tabBtnStyle = (active) => ({
  background: 'transparent',
  border: 'none',
  color: active ? '#f3f3ff' : '#a8a8c4',
  fontSize: 11,
  fontWeight: 700,
  padding: 0,
  cursor: 'pointer',
  maxWidth: 120,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

const renameInputStyle = {
  width: 100,
  padding: '2px 6px',
  background: '#0e0e1c',
  border: '1px solid #4b44a6',
  borderRadius: 6,
  color: '#e0dcff',
  fontSize: 11,
  fontWeight: 700,
  outline: 'none',
}

const deleteTabBtnStyle = {
  background: 'transparent',
  border: 'none',
  color: '#5a5a80',
  fontSize: 10,
  cursor: 'pointer',
  padding: '0 2px',
  borderRadius: 4,
  lineHeight: 1,
}

const dirtyBadgeStyle = {
  borderRadius: 999,
  background: '#3f2d13',
  border: '1px solid #ba7517',
  color: '#efc16d',
  fontSize: 11,
  fontWeight: 700,
  padding: '6px 10px',
}