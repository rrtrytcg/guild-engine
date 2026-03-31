import useStore from '../../store/useStore'

const MIN_ZOOM = 0.5
const MAX_ZOOM = 2.0
const ZOOM_STEP = 0.1

export function CanvasToolbar() {
  const canvasZoom = useStore((s) => s.canvasZoom)
  const setCanvasZoom = useStore((s) => s.setCanvasZoom)
  const fitCanvasToViewport = useStore((s) => s.fitCanvasToViewport)

  const handleZoomOut = () => {
    if (canvasZoom > MIN_ZOOM) {
      setCanvasZoom(canvasZoom - ZOOM_STEP)
    }
  }

  const handleZoomIn = () => {
    if (canvasZoom < MAX_ZOOM) {
      setCanvasZoom(canvasZoom + ZOOM_STEP)
    }
  }

  const handleSliderChange = (e) => {
    setCanvasZoom(parseFloat(e.target.value))
  }

  return (
    <div style={toolbarStyle}>
      <button
        type="button"
        onClick={handleZoomOut}
        disabled={canvasZoom <= MIN_ZOOM}
        style={zoomButtonStyle}
        title="Zoom out (−10%)"
      >
        −
      </button>

      <div style={sliderContainerStyle}>
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={ZOOM_STEP}
          value={canvasZoom}
          onChange={handleSliderChange}
          style={sliderStyle}
          title="Zoom slider"
        />
        <span style={zoomLabelStyle}>{Math.round(canvasZoom * 100)}%</span>
      </div>

      <button
        type="button"
        onClick={handleZoomIn}
        disabled={canvasZoom >= MAX_ZOOM}
        style={zoomButtonStyle}
        title="Zoom in (+10%)"
      >
        +
      </button>

      <button
        type="button"
        onClick={fitCanvasToViewport}
        style={fitButtonStyle}
        title="Fit to screen"
      >
        Fit
      </button>
    </div>
  )
}

const toolbarStyle = {
  position: 'absolute',
  top: 12,
  right: 12,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 12px',
  background: 'rgba(17, 17, 28, 0.92)',
  border: '1px solid #2a2a3e',
  borderRadius: 12,
  backdropFilter: 'blur(8px)',
  boxShadow: '0 8px 24px rgba(0,0,0,0.32)',
  zIndex: 100,
}

const zoomButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 32,
  height: 32,
  background: '#171727',
  border: '1px solid #2f2f48',
  borderRadius: 8,
  color: '#d7d7ee',
  fontSize: 16,
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
}

const sliderContainerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
}

const sliderStyle = {
  width: 100,
  height: 4,
  appearance: 'none',
  background: '#2f2f48',
  borderRadius: 2,
  cursor: 'pointer',
  outline: 'none',
}

const zoomLabelStyle = {
  minWidth: 44,
  textAlign: 'center',
  fontSize: 12,
  fontWeight: 700,
  color: '#c8c4ff',
}

const fitButtonStyle = {
  padding: '6px 12px',
  background: '#201d47',
  border: '1px solid #4b44a6',
  borderRadius: 8,
  color: '#c8c4ff',
  fontSize: 11,
  fontWeight: 700,
  cursor: 'pointer',
}