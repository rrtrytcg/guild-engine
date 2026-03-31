import { useEffect, useState } from 'react'

/**
 * DropZone overlay that renders visual feedback when dragging widgets over containers.
 * Shows a blue line indicator for before/after positions, or a highlight for inside.
 */
export default function DropZone({ containerId, position }) {
  const [style, setStyle] = useState(null)

  useEffect(() => {
    // Use requestAnimationFrame to ensure DOM is ready
    const calculateStyle = () => {
      // Get container element
      const container = document.querySelector(`[data-widget-id="${containerId}"]`)
      if (!container) return

      const surface = document.querySelector('[data-canvas-surface]')
      if (!surface) return

      const containerRect = container.getBoundingClientRect()
      const surfaceRect = surface.getBoundingClientRect()
      
      // Get zoom from computed transform
      const computedStyle = window.getComputedStyle(surface)
      const transform = computedStyle.transform
      const zoom = transform?.includes('scale') 
        ? parseFloat(transform.match(/scale\(([\d.]+)\)/)?.[1] || '1')
        : 1

      // Calculate relative position (compensate for zoom)
      const relativeTop = (containerRect.top - surfaceRect.top) / zoom
      const relativeLeft = (containerRect.left - surfaceRect.left) / zoom
      const relativeWidth = containerRect.width / zoom
      const relativeHeight = containerRect.height / zoom

      if (position === 'inside') {
        setStyle({
          position: 'absolute',
          top: relativeTop,
          left: relativeLeft,
          width: relativeWidth,
          height: relativeHeight,
          backgroundColor: 'rgba(127, 119, 221, 0.2)',
          border: '2px dashed #7F77DD',
          borderRadius: 8,
          pointerEvents: 'none',
          transition: 'all 0.1s ease',
        })
      } else {
        // Before/after positions show a line indicator
        const lineTop = position === 'before' 
          ? relativeTop - 2 
          : relativeTop + relativeHeight - 1
        
        setStyle({
          position: 'absolute',
          left: relativeLeft,
          top: lineTop,
          width: relativeWidth,
          height: 3,
          backgroundColor: '#7F77DD',
          borderRadius: 2,
          pointerEvents: 'none',
          transition: 'all 0.1s ease',
          boxShadow: '0 0 8px rgba(127, 119, 221, 0.6)',
        })
      }
    }

    requestAnimationFrame(calculateStyle)
  }, [containerId, position])

  if (!style) return null

  return <div style={style} />
}
