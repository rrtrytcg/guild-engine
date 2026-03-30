/**
 * Shows screen validation errors (red) and warnings (yellow).
 * Widget-level issues are clickable to select the widget.
 */
import { useState } from 'react'
import useStore from '../../store/useStore'
import useWidgetTree from '../../hooks/useWidgetTree'

export default function ScreenErrors() {
  const screenErrors = useStore((s) => s.screenErrors) ?? []
  const screenWarnings = useStore((s) => s.screenWarnings) ?? []
  const activeScreenId = useStore((s) => s.activeScreenId)
  const { selectWidget } = useWidgetTree()
  const [collapsed, setCollapsed] = useState(false)

  const errors = screenErrors.filter((e) => e.screenId === activeScreenId || e.screenId == null)
  const warnings = screenWarnings.filter((e) => e.screenId === activeScreenId || e.screenId == null)

  if (errors.length === 0 && warnings.length === 0) return null

  return (
    <div style={wrapStyle}>
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        style={toggleStyle}
        title={collapsed ? 'Expand' : 'Collapse'}
      >
        {collapsed ? '▶' : '▼'} Validation
        {errors.length > 0 && (
          <span style={badgeStyle('error')}>{errors.length}</span>
        )}
        {warnings.length > 0 && (
          <span style={badgeStyle('warn')}>{warnings.length}</span>
        )}
      </button>

      {!collapsed && (
        <div style={listStyle}>
          {errors.map((err, i) => (
            <div key={i} style={itemStyle('error')}>
              <span style={iconStyle}>✕</span>
              <span style={msgStyle}>{err.message}</span>
              {err.widgetId && (
                <button
                  type="button"
                  style={linkBtnStyle}
                  onClick={() => selectWidget(err.widgetId)}
                  title="Click to select widget"
                >
                  {err.path}
                </button>
              )}
            </div>
          ))}
          {warnings.map((warn, i) => (
            <div key={i} style={itemStyle('warn')}>
              <span style={iconStyle}>△</span>
              <span style={msgStyle}>{warn.message}</span>
              {warn.widgetId && (
                <button
                  type="button"
                  style={linkBtnStyle}
                  onClick={() => selectWidget(warn.widgetId)}
                  title="Click to select widget"
                >
                  {warn.path}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const wrapStyle = {
  marginBottom: 10,
  borderRadius: 8,
  overflow: 'hidden',
  border: '1px solid #2f2f48',
}

const toggleStyle = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '7px 10px',
  background: '#171727',
  border: 'none',
  color: '#b9b8d2',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  textAlign: 'left',
}

const badgeStyle = (type) => ({
  marginLeft: 4,
  borderRadius: 999,
  background: type === 'error' ? '#3d1e1e' : '#3d3013',
  border: `1px solid ${type === 'error' ? '#a33' : '#a35'}`,
  color: type === 'error' ? '#f77' : '#ea3',
  fontSize: 10,
  fontWeight: 700,
  padding: '1px 6px',
})

const listStyle = {
  padding: '6px 8px 8px',
  background: '#111120',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  maxHeight: 200,
  overflowY: 'auto',
}

const itemStyle = (type) => ({
  display: 'flex',
  alignItems: 'flex-start',
  gap: 6,
  fontSize: 11,
  lineHeight: 1.4,
  color: type === 'error' ? '#f77' : '#ea3',
})

const iconStyle = {
  flexShrink: 0,
  marginTop: 1,
}

const msgStyle = {
  flex: 1,
}

const linkBtnStyle = {
  background: 'transparent',
  border: 'none',
  color: '#8080cc',
  fontSize: 10,
  fontWeight: 700,
  cursor: 'pointer',
  padding: '0 2px',
  textDecoration: 'underline',
  flexShrink: 0,
}
