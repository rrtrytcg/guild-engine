import { lazy, Suspense } from 'react'
import useStore from '../store/useStore'
import { NODE_CONFIG } from '../nodes/nodeConfig'
import { getInspectorImporter } from './inspectorRegistry'

export default function Inspector() {
  const selectedNodeId = useStore((s) => s.selectedNodeId)
  const nodes = useStore((s) => s.nodes)
  const deleteNode = useStore((s) => s.deleteNode)

  const node = nodes.find((n) => n.id === selectedNodeId)

  if (!node) {
    return (
      <div style={{
        width: 480, background: '#13131f', borderLeft: '1px solid #2a2a3e',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#444460', fontSize: 12, textAlign: 'center', padding: 24,
      }}>
        Click a node to inspect it
      </div>
    )
  }

  const config = NODE_CONFIG[node.data.type] ?? { label: node.data.type, color: '#888' }
  const importer = getInspectorImporter(node.data.type)
  const LazyForm = importer
    ? lazy(() => importer().catch(() => ({ default: InspectorLoadFailure })))
    : null

  return (
    <div style={{
      width: 480, background: '#13131f', borderLeft: '1px solid #2a2a3e',
      display: 'flex', flexDirection: 'column', overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{
        background: config.color, padding: '10px 14px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)' }}>
            {config.label}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginTop: 2 }}>
            {node.data.label || 'Unnamed'}
          </div>
        </div>
        <button
          onClick={() => deleteNode(node.id)}
          title="Delete node"
          style={{ background: 'rgba(0,0,0,0.25)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 16, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >×</button>
      </div>

      {/* Node ID */}
      <div style={{ padding: '6px 14px 0', fontFamily: 'monospace', fontSize: 10, color: '#33334a' }}>
        {node.id}
      </div>

      {/* Form */}
      <div style={{ padding: '12px 14px', flex: 1 }}>
        {LazyForm
          ? (
            <Suspense fallback={<InspectorLoading />}>
              <LazyForm node={node} />
            </Suspense>
          )
          : <div style={{ color: '#555570', fontSize: 12 }}>No inspector for type: {node.data.type}</div>
        }
      </div>
    </div>
  )
}

function InspectorLoading() {
  return (
    <div style={{
      padding: 16,
      borderRadius: 8,
      background: '#1a1a2e',
      border: '1px solid #2a2a3e',
      color: '#666680',
      fontSize: 12,
      textAlign: 'center',
    }}>
      Loading inspector…
    </div>
  )
}

function InspectorLoadFailure() {
  return (
    <div style={{
      padding: 16,
      borderRadius: 8,
      background: '#1a1a2e',
      border: '1px solid #E24B4A44',
      color: '#E24B4A',
      fontSize: 12,
      textAlign: 'center',
    }}>
      Inspector failed to load. Refresh the editor to retry.
    </div>
  )
}
