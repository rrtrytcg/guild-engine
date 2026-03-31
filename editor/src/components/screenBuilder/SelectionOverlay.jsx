import { useEffect, useRef, useState } from 'react'
import useStore from '../../store/useStore'

const HANDLE_SIZE = 8
const MIN_SIZE = 32

export default function SelectionOverlay({ containerRef, selectedWidgetId, onSelect, onDeselect, onResize }) {
  const [bounds, setBounds] = useState(null)
  const [resizeHandle, setResizeHandle] = useState(null)
  const startPos = useRef(null)

  const rootWidget = useStore((s) => s.activeScreen?.layout)
  const canvasZoom = useStore((s) => s.canvasZoom)

  useEffect(() => {
    if (!selectedWidgetId || !containerRef?.current) {
      setBounds(null)
      return
    }

    const container = containerRef.current
    const widgetEl = container.querySelector(`[data-widget-id="${selectedWidgetId}"]`)

    if (!widgetEl) {
      setBounds(null)
      return
    }

    const rect = widgetEl.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()

    setBounds({
      left: rect.left - containerRect.left,
      top: rect.top - containerRect.top,
      width: rect.width,
      height: rect.height,
    })
  }, [selectedWidgetId, containerRef, rootWidget, canvasZoom])

  useEffect(() => {
    if (!resizeHandle) return

    const handleMouseMove = (e) => {
      if (!startPos.current || !bounds) return

      const deltaX = e.clientX - startPos.current.x
      const deltaY = e.clientY - startPos.current.y
      const scale = 1 / canvasZoom

      if (resizeHandle.includes('e')) {
        setBounds((prev) => prev ? ({ ...prev, width: Math.max(MIN_SIZE, prev.width + deltaX * scale) }) : null)
      }
      if (resizeHandle.includes('s')) {
        setBounds((prev) => prev ? ({ ...prev, height: Math.max(MIN_SIZE, prev.height + deltaY * scale) }) : null)
      }
      if (resizeHandle.includes('w')) {
        setBounds((prev) => prev ? ({
          ...prev,
          left: prev.left + deltaX * scale,
          width: Math.max(MIN_SIZE, prev.width - deltaX * scale),
        }) : null)
      }
      if (resizeHandle.includes('n')) {
        setBounds((prev) => prev ? ({
          ...prev,
          top: prev.top + deltaY * scale,
          height: Math.max(MIN_SIZE, prev.height - deltaY * scale),
        }) : null)
      }

      startPos.current = { x: e.clientX, y: e.clientY }
    }

    const handleMouseUp = () => {
      if (bounds && selectedWidgetId) {
        const updates = {}
        if (resizeHandle.includes('e') || resizeHandle.includes('w')) {
          updates.width = bounds.width
        }
        if (resizeHandle.includes('n') || resizeHandle.includes('s')) {
          updates.height = bounds.height
        }
        if (Object.keys(updates).length > 0) {
          onResize?.(selectedWidgetId, updates)
        }
      }
      setResizeHandle(null)
      startPos.current = null
      document.body.style.cursor = ''
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp, { once: true })

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
    }
  }, [resizeHandle, bounds, selectedWidgetId, canvasZoom, onResize])

  const handleResizeStart = (handle) => (e) => {
    e.stopPropagation()
    setResizeHandle(handle)
    startPos.current = { x: e.clientX, y: e.clientY }
    document.body.style.cursor = getResizeCursor(handle)
  }

  const handleClick = (e) => {
    e.stopPropagation()
    const widgetId = e.target.closest('[data-widget-id]')?.getAttribute('data-widget-id')
    if (widgetId) {
      onSelect(widgetId)
    } else {
      onDeselect()
    }
  }

  if (!bounds || !selectedWidgetId) return null

  return (
    <>
      <div
        data-selection-overlay
        style={overlayStyle(bounds)}
        onClick={handleClick}
      />
      <div
        data-resize-handle-n
        style={resizeHandleStyle(bounds, 'n')}
        onMouseDown={handleResizeStart('n')}
      />
      <div
        data-resize-handle-s
        style={resizeHandleStyle(bounds, 's')}
        onMouseDown={handleResizeStart('s')}
      />
      <div
        data-resize-handle-e
        style={resizeHandleStyle(bounds, 'e')}
        onMouseDown={handleResizeStart('e')}
      />
      <div
        data-resize-handle-w
        style={resizeHandleStyle(bounds, 'w')}
        onMouseDown={handleResizeStart('w')}
      />
      <div
        data-resize-handle-nw
        style={cornerHandleStyle(bounds, 'nw')}
        onMouseDown={handleResizeStart('nw')}
      />
      <div
        data-resize-handle-ne
        style={cornerHandleStyle(bounds, 'ne')}
        onMouseDown={handleResizeStart('ne')}
      />
      <div
        data-resize-handle-sw
        style={cornerHandleStyle(bounds, 'sw')}
        onMouseDown={handleResizeStart('sw')}
      />
      <div
        data-resize-handle-se
        style={cornerHandleStyle(bounds, 'se')}
        onMouseDown={handleResizeStart('se')}
      />
    </>
  )
}

function getResizeCursor(handle) {
  const cursors = {
    n: 'ns-resize',
    s: 'ns-resize',
    e: 'ew-resize',
    w: 'ew-resize',
    ne: 'nesw-resize',
    nw: 'nwse-resize',
    se: 'nwse-resize',
    sw: 'nesw-resize',
  }
  return cursors[handle] || 'default'
}

function overlayStyle(bounds) {
  return {
    position: 'absolute',
    left: bounds.left,
    top: bounds.top,
    width: bounds.width,
    height: bounds.height,
    border: '2px solid #7F77DD',
    backgroundColor: 'rgba(127, 119, 221, 0.08)',
    pointerEvents: 'auto',
    cursor: 'default',
    zIndex: 1000,
  }
}

function resizeHandleStyle(bounds, position) {
  const isVertical = position === 'n' || position === 's'
  return {
    position: 'absolute',
    left: position === 'e' || position === 'w' ? undefined : bounds.left + bounds.width / 2 - HANDLE_SIZE / 2,
    top: position === 'n' || position === 's' ? undefined : bounds.top + bounds.height / 2 - HANDLE_SIZE / 2,
    ...(position === 'n' && { left: bounds.left + bounds.width / 2 - HANDLE_SIZE / 2, top: bounds.top - HANDLE_SIZE / 2, width: HANDLE_SIZE * 2, height: HANDLE_SIZE }),
    ...(position === 's' && { left: bounds.left + bounds.width / 2 - HANDLE_SIZE / 2, top: bounds.top + bounds.height - HANDLE_SIZE / 2, width: HANDLE_SIZE * 2, height: HANDLE_SIZE }),
    ...(position === 'e' && { left: bounds.left + bounds.width - HANDLE_SIZE / 2, top: bounds.top + bounds.height / 2 - HANDLE_SIZE / 2, width: HANDLE_SIZE, height: HANDLE_SIZE * 2 }),
    ...(position === 'w' && { left: bounds.left - HANDLE_SIZE / 2, top: bounds.top + bounds.height / 2 - HANDLE_SIZE / 2, width: HANDLE_SIZE, height: HANDLE_SIZE * 2 }),
    backgroundColor: '#7F77DD',
    border: '1px solid #1a1a2e',
    pointerEvents: 'auto',
    zIndex: 1001,
  }
}

function cornerHandleStyle(bounds, corner) {
  return {
    position: 'absolute',
    left: corner === 'nw' || corner === 'sw' ? bounds.left - HANDLE_SIZE / 2 : undefined,
    left: corner === 'ne' || corner === 'se' ? bounds.left + bounds.width - HANDLE_SIZE / 2 : undefined,
    top: corner === 'nw' || corner === 'ne' ? bounds.top - HANDLE_SIZE / 2 : undefined,
    top: corner === 'sw' || corner === 'se' ? bounds.top + bounds.height - HANDLE_SIZE / 2 : undefined,
    width: HANDLE_SIZE * 1.5,
    height: HANDLE_SIZE * 1.5,
    backgroundColor: '#7F77DD',
    border: '1px solid #1a1a2e',
    pointerEvents: 'auto',
    zIndex: 1001,
  }
}
