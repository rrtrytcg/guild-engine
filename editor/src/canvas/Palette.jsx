import { NODE_CONFIG, PALETTE_GROUPS } from '../nodes/nodeConfig'
import useStore from '../store/useStore'

export default function Palette() {
  const addNode = useStore((s) => s.addNode)

  // Drag start — encode the node type in the drag event
  const onDragStart = (e, nodeType) => {
    e.dataTransfer.setData('application/guild-engine-node', nodeType)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      style={{
        width: 200,
        flexShrink: 0,
        background: '#13131f',
        borderRight: '1px solid #2a2a3e',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        padding: '12px 0',
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#555570',
          padding: '0 14px 10px',
        }}
      >
        Node Palette
      </div>

      {PALETTE_GROUPS.map((group) => {
        const entries = Object.entries(NODE_CONFIG).filter(([, c]) => c.group === group)
        return (
          <div key={group} style={{ marginBottom: 4 }}>
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#444460',
                padding: '6px 14px 4px',
              }}
            >
              {group}
            </div>
            {entries.map(([type, config]) => (
              <div
                key={type}
                draggable
                onDragStart={(e) => onDragStart(e, type)}
                onClick={() => addNode(type, { x: 300 + Math.random() * 200, y: 200 + Math.random() * 200 })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '7px 14px',
                  cursor: 'grab',
                  borderRadius: 6,
                  margin: '1px 6px',
                  transition: 'background 0.1s',
                  userSelect: 'none',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#1e1e2e')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: config.color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 12, color: '#c0c0d8' }}>{config.label}</span>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
