import { useEffect, useRef, useState, useCallback } from 'react'
import useStore from '../../store/useStore'

const HANDLE_SIZE = 8
const MIN_SIZE = 32
const MOVE_HANDLE_SIZE = { width: 40, height: 8 }

export default function SelectionOverlay({ containerRef, selectedWidgetId, onSelect, onDeselect, onResize, onMove }) {
  const canvasZoom = useStore((s) => s.canvasZoom)
  const [bounds, setBounds] = useState(null)
  const [resizeHandle, setResizeHandle] = useState(null)
  const [isMoving, setIsMoving] = useState(false)
  const [moveStart, setMoveStart] = useState(null)
  const startPos = useRef(null)
  const startBounds = useRef(null)

  // Calculate bounds when selection changes
  useEffect(() => {
    if (!containerRef.current || !selectedWidgetId) {
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
  }, [selectedWidgetId, containerRef])

  // Handle resize drag
  useEffect(() => {
    if (!resizeHandle) return

    const handleMouseMove = (e) => {
      if (!startPos.current || !bounds) return

      const deltaX = e.clientX - startPos.current.x
      const deltaY = e.clientY - startPos.current.y
      const scale = 1 / canvasZoom

      setBounds((prev) => {
        if (!prev) return null

        let newBounds = { ...prev }

        if (resizeHandle.includes('e')) {
          newBounds.width = Math.max(MIN_SIZE, prev.width + deltaX * scale)
        }
        if (resizeHandle.includes('s')) {
          newBounds.height = Math.max(MIN_SIZE, prev.height + deltaY * scale)
        }
        if (resizeHandle.includes('w')) {
          newBounds.left = prev.left + deltaX * scale
          newBounds.width = Math.max(MIN_SIZE, prev.width - deltaX * scale)
        }
        if (resizeHandle.includes('n')) {
          newBounds.top = prev.top + deltaY * scale
          newBounds.height = Math.max(MIN_SIZE, prev.height - deltaY * scale)
        }

        return newBounds
      })

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

  // Handle move drag
  useEffect(() => {
    if (!isMoving) return

    const handleMouseMove = (e) => {
      if (!startPos.current || !startBounds.current || !bounds) return

      const deltaX = e.clientX - startPos.current.x
      const deltaY = e.clientY - startPos.current.y
      const scale = 1 / canvasZoom

      setBounds((prev) => {
        if (!prev) return null
        return {
          ...prev,
          left: startBounds.current.left + deltaX * scale,
          top: startBounds.current.top + deltaY * scale,
        }
      })
    }

    const handleMouseUp = () => {
      if (bounds && selectedWidgetId && onMove) {
        const deltaX = bounds.left - startBounds.current.left
        const deltaY = bounds.top - startBounds.current.top
        if (deltaX !== 0 || deltaY !== 0) {
          onMove(selectedWidgetId, { left: deltaX, top: deltaY })
        }
      }
      setIsMoving(false)
      setMoveStart(null)
      startPos.current = null
      startBounds.current = null
      document.body.style.cursor = ''
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp, { once: true })

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
    }
  }, [isMoving, bounds, selectedWidgetId, canvasZoom, onMove])

  const handleResizeStart = useCallback((handle) => (e) => {
    e.stopPropagation()
    e.preventDefault()
    if (!bounds) return
    setResizeHandle(handle)
    startPos.current = { x: e.clientX, y: e.clientY }
    document.body.style.cursor = getResizeCursor(handle)
  }, [bounds])

  const handleMoveStart = useCallback((e) => {
    e.stopPropagation()
    e.preventDefault()
    // Capture current bounds at move start - don't rely on state being current
    const currentBounds = bounds
    if (!currentBounds) return
    setIsMoving(true)
    startPos.current = { x: e.clientX, y: e.clientY }
    startBounds.current = { left: currentBounds.left, top: currentBounds.top }
    document.body.style.cursor = 'move'
  }, [bounds])

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
      {/* Selection border */}
      <div
        data-selection-overlay
        style={overlayStyle(bounds)}
        onClick={handleClick}
      />

      {/* Move handle - top center */}
      <div
        data-move-handle="n"
        style={moveHandleStyle(bounds, 'n')}
        onMouseDown={handleMoveStart}
      />

      {/* Move handle - bottom center */}
      <div
        data-move-handle="s"
        style={moveHandleStyle(bounds, 's')}
        onMouseDown={handleMoveStart}
      />

      {/* Move handle - middle left */}
      <div
        data-move-handle="w"
        style={moveHandleStyle(bounds, 'w')}
        onMouseDown={handleMoveStart}
      />

      {/* Move handle - middle right */}
      <div
        data-move-handle="e"
        style={moveHandleStyle(bounds, 'e')}
        onMouseDown={handleMoveStart}
      />

      {/* Resize handles - cardinal directions */}
      <div
        data-resize-handle="n"
        style={edgeHandleStyle(bounds, 'n')}
        onMouseDown={handleResizeStart('n')}
      />
      <div
        data-resize-handle="s"
        style={edgeHandleStyle(bounds, 's')}
        onMouseDown={handleResizeStart('s')}
      />
      <div
        data-resize-handle="e"
        style={edgeHandleStyle(bounds, 'e')}
        onMouseDown={handleResizeStart('e')}
      />
      <div
        data-resize-handle="w"
        style={edgeHandleStyle(bounds, 'w')}
        onMouseDown={handleResizeStart('w')}
      />

      {/* Resize handles - corners */}
      <div
        data-resize-handle="nw"
        style={cornerHandleStyle(bounds, 'nw')}
        onMouseDown={handleResizeStart('nw')}
      />
      <div
        data-resize-handle="ne"
        style={cornerHandleStyle(bounds, 'ne')}
        onMouseDown={handleResizeStart('ne')}
      />
      <div
        data-resize-handle="sw"
        style={cornerHandleStyle(bounds, 'sw')}
        onMouseDown={handleResizeStart('sw')}
      />
      <div
        data-resize-handle="se"
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

function moveHandleStyle(bounds, position) {
  const { width: hw, height: hh } = MOVE_HANDLE_SIZE
  const positions = {
    n: {
      left: bounds.left + bounds.width / 2 - hw / 2,
      top: bounds.top - hh / 2,
      width: hw,
      height: hh,
    },
    s: {
      left: bounds.left + bounds.width / 2 - hw / 2,
      top: bounds.top + bounds.height - hh / 2,
      width: hw,
      height: hh,
    },
    w: {
      left: bounds.left - hw / 2,
      top: bounds.top + bounds.height / 2 - hh / 2,
      width: hh,
      height: hw,
    },
    e: {
      left: bounds.left + bounds.width - hw / 2,
      top: bounds.top + bounds.height / 2 - hh / 2,
      width: hh,
      height: hw,
    },
  }

  return {
    position: 'absolute',
    ...positions[position],
    backgroundColor: '#7F77DD',
    borderRadius: 4,
    cursor: 'move',
    pointerEvents: 'auto',
    zIndex: 1001,
  }
}

function edgeHandleStyle(bounds, position) {
  const isVertical = position === 'n' || position === 's'
  return {
    position: 'absolute',
    left: isVertical ? bounds.left + bounds.width / 2 - HANDLE_SIZE * 2 : undefined,
    top: !isVertical ? bounds.top + bounds.height / 2 - HANDLE_SIZE * 2 : undefined,
    ...(position === 'n' && {
      top: bounds.top - HANDLE_SIZE / 2,
      width: HANDLE_SIZE * 4,
      height: HANDLE_SIZE,
    }),
    ...(position === 's' && {
      top: bounds.top + bounds.height - HANDLE_SIZE / 2,
      width: HANDLE_SIZE * 4,
      height: HANDLE_SIZE,
    }),
    ...(position === 'e' && {
      left: bounds.left + bounds.width - HANDLE_SIZE / 2,
      width: HANDLE_SIZE,
      height: HANDLE_SIZE * 4,
    }),
    ...(position === 'w' && {
      left: bounds.left - HANDLE_SIZE / 2,
      width: HANDLE_SIZE,
      height: HANDLE_SIZE * 4,
    }),
    backgroundColor: '#7F77DD',
    border: '1px solid #1a1a2e',
    borderRadius: 2,
    pointerEvents: 'auto',
    zIndex: 1001,
  }
}

function cornerHandleStyle(bounds, corner) {
  let left, top
  if (corner === 'nw') {
    left = bounds.left - HANDLE_SIZE * 0.75
    top = bounds.top - HANDLE_SIZE * 0.75
  } else if (corner === 'ne') {
    left = bounds.left + bounds.width - HANDLE_SIZE * 0.25
    top = bounds.top - HANDLE_SIZE * 0.75
  } else if (corner === 'sw') {
    left = bounds.left - HANDLE_SIZE * 0.75
    top = bounds.top + bounds.height - HANDLE_SIZE * 0.25
  } else if (corner === 'se') {
    left = bounds.left + bounds.width - HANDLE_SIZE * 0.25
    top = bounds.top + bounds.height - HANDLE_SIZE * 0.25
  }

  return {
    position: 'absolute',
    left,
    top,
    width: HANDLE_SIZE * 1.5,
    height: HANDLE_SIZE * 1.5,
    backgroundColor: '#7F77DD',
    border: '1px solid #1a1a2e',
    borderRadius: 2,
    pointerEvents: 'auto',
    zIndex: 1001,
  }
}
