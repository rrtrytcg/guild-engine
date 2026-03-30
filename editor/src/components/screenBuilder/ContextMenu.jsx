import AddWidgetMenu from './AddWidgetMenu'
import { CONTAINER_WIDGET_TYPES } from '../../utils/screenSchema'

export default function ContextMenu({ menu, onAddWidget, onDuplicate, onDelete, onWrap }) {
  if (!menu) return null

  return (
    <div
      style={{
        ...menuStyle,
        top: menu.y,
        left: menu.x,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={headerStyle}>
        <div style={{ color: '#f2f2ff', fontSize: 13, fontWeight: 700 }}>{menu.widgetId}</div>
        <div style={{ color: '#8f8fb0', fontSize: 11 }}>{menu.widgetType}</div>
      </div>

      {menu.isContainer && (
        <div style={groupStyle}>
          <div style={groupTitleStyle}>Add Child</div>
          <AddWidgetMenu onAddWidget={onAddWidget} />
        </div>
      )}

      <div style={groupStyle}>
        <div style={groupTitleStyle}>Actions</div>
        <div style={actionListStyle}>
          <button type="button" onClick={onDuplicate} disabled={menu.isRoot} style={actionButtonStyle(menu.isRoot)}>
            Duplicate
          </button>
          <button type="button" onClick={onDelete} disabled={menu.isRoot} style={actionButtonStyle(menu.isRoot)}>
            Delete
          </button>
        </div>
      </div>

      <div style={groupStyle}>
        <div style={groupTitleStyle}>Wrap in</div>
        <div style={buttonGridStyle}>
          {CONTAINER_WIDGET_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onWrap(type)}
              disabled={menu.isRoot}
              style={actionButtonStyle(menu.isRoot)}
            >
              {type}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

const menuStyle = {
  position: 'fixed',
  zIndex: 1200,
  width: 300,
  maxWidth: 'calc(100vw - 24px)',
  borderRadius: 14,
  border: '1px solid #2f2f48',
  background: '#11111d',
  boxShadow: '0 24px 64px rgba(0,0,0,0.42)',
  padding: 14,
}

const headerStyle = {
  paddingBottom: 10,
  marginBottom: 12,
  borderBottom: '1px solid #24243a',
}

const groupStyle = {
  marginTop: 12,
}

const groupTitleStyle = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.12em',
  color: '#7F77DD',
  textTransform: 'uppercase',
  marginBottom: 8,
}

const buttonGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 6,
}

const actionListStyle = {
  display: 'grid',
  gap: 6,
}

const actionButtonStyle = (disabled) => ({
  background: '#181827',
  border: '1px solid #2c2c44',
  borderRadius: 8,
  color: disabled ? '#666680' : '#d7d7ee',
  fontSize: 12,
  fontWeight: 600,
  padding: '8px 10px',
  textAlign: 'left',
  cursor: disabled ? 'not-allowed' : 'pointer',
})
