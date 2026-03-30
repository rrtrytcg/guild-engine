import { CONTAINER_WIDGET_TYPES, DISPLAY_WIDGET_TYPES, INTERACTIVE_WIDGET_TYPES } from '../../utils/screenSchema'

const SECTIONS = [
  { label: 'Display', types: DISPLAY_WIDGET_TYPES },
  { label: 'Container', types: CONTAINER_WIDGET_TYPES },
  { label: 'Interactive', types: INTERACTIVE_WIDGET_TYPES },
]

export default function AddWidgetMenu({ onAddWidget }) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {SECTIONS.map((section) => (
        <div key={section.label}>
          <div style={sectionLabelStyle}>{section.label}</div>
          <div style={buttonGridStyle}>
            {section.types.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => onAddWidget(type)}
                style={menuButtonStyle}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

const sectionLabelStyle = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.12em',
  color: '#7F77DD',
  textTransform: 'uppercase',
  marginBottom: 6,
}

const buttonGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 6,
}

const menuButtonStyle = {
  background: '#181827',
  border: '1px solid #2c2c44',
  borderRadius: 8,
  color: '#d7d7ee',
  fontSize: 12,
  fontWeight: 600,
  padding: '8px 10px',
  textAlign: 'left',
  cursor: 'pointer',
}
