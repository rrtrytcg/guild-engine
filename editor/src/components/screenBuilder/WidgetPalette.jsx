const WIDGET_CATEGORIES = [
  {
    label: 'Containers',
    color: '#7F77DD',
    widgets: [
      { type: 'vbox', icon: '▤' },
      { type: 'hbox', icon: '▥' },
      { type: 'grid', icon: '▦' },
      { type: 'stack', icon: '▧' },
    ],
  },
  {
    label: 'Display',
    color: '#4CAF50',
    widgets: [
      { type: 'label', icon: 'Aa' },
      { type: 'image', icon: '🖼' },
      { type: 'spacer', icon: '□' },
      { type: 'progressbar', icon: '▰' },
    ],
  },
  {
    label: 'Interactive',
    color: '#FF9800',
    widgets: [
      { type: 'textbutton', icon: '[ ]' },
      { type: 'iconbutton', icon: '[•]' },
      { type: 'textinput', icon: '___' },
    ],
  },
]

export function WidgetPalette() {
  const handleDragStart = (e, widgetType) => {
    e.dataTransfer.setData('application/x-widget-type', widgetType)
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div style={paletteStyle}>
      <div style={headerStyle}>
        <span style={eyebrowStyle}>Palette</span>
      </div>

      <div style={hintStyle}>
        Drag widgets onto the canvas (Phase 3)
      </div>

      <div style={categoriesStyle}>
        {WIDGET_CATEGORIES.map((category) => (
          <div key={category.label} style={categoryStyle}>
            <div style={categoryHeaderStyle}>
              <span style={{ ...categoryDotStyle, background: category.color }} />
              <span style={categoryLabelStyle}>{category.label}</span>
            </div>

            <div style={widgetListStyle}>
              {category.widgets.map((widget) => (
                <div
                  key={widget.type}
                  draggable
                  onDragStart={(e) => handleDragStart(e, widget.type)}
                  style={widgetItemStyle}
                  title={`Drag to add ${widget.type}`}
                >
                  <span style={widgetIconStyle}>{widget.icon}</span>
                  <span style={widgetTypeStyle}>{widget.type}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const paletteStyle = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflow: 'hidden',
}

const headerStyle = {
  marginBottom: 4,
}

const eyebrowStyle = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.14em',
  color: '#7F77DD',
  textTransform: 'uppercase',
}

const hintStyle = {
  fontSize: 11,
  color: '#6e6e92',
  marginBottom: 14,
  lineHeight: 1.4,
}

const categoriesStyle = {
  flex: 1,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
}

const categoryStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
}

const categoryHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
}

const categoryDotStyle = {
  width: 6,
  height: 6,
  borderRadius: '50%',
}

const categoryLabelStyle = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.1em',
  color: '#8b8baa',
  textTransform: 'uppercase',
}

const widgetListStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 3,
}

const widgetItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '7px 10px',
  background: '#151523',
  border: '1px solid #2a2a3e',
  borderRadius: 8,
  cursor: 'grab',
  transition: 'all 0.15s ease',
}

const widgetIconStyle = {
  fontSize: 12,
  color: '#c8c4ff',
  width: 20,
  textAlign: 'center',
}

const widgetTypeStyle = {
  fontSize: 12,
  fontWeight: 600,
  color: '#d7d7ee',
}