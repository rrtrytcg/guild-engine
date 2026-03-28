import useStore from '../store/useStore'

export default function Toolbar() {
  const exportProject = useStore((s) => s.exportProject)
  const nodeCount = useStore((s) => s.nodes.length)
  const edgeCount = useStore((s) => s.edges.length)

  return (
    <div
      style={{
        height: 48,
        background: '#0a0a14',
        borderBottom: '1px solid #2a2a3e',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 16,
        flexShrink: 0,
      }}
    >
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16 }}>⚔️</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#e0e0f0', letterSpacing: '0.02em' }}>
          Guild Engine
        </span>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            background: '#7F77DD22',
            color: '#7F77DD',
            border: '1px solid #7F77DD44',
            borderRadius: 4,
            padding: '1px 5px',
            letterSpacing: '0.1em',
          }}
        >
          EDITOR
        </span>
      </div>

      <div style={{ flex: 1 }} />

      {/* Stats */}
      <span style={{ fontSize: 11, color: '#444460' }}>
        {nodeCount} node{nodeCount !== 1 ? 's' : ''} · {edgeCount} edge{edgeCount !== 1 ? 's' : ''}
      </span>

      {/* Export */}
      <button
        onClick={exportProject}
        style={{
          background: '#7F77DD',
          border: 'none',
          borderRadius: 7,
          color: '#fff',
          fontSize: 12,
          fontWeight: 600,
          padding: '6px 14px',
          cursor: 'pointer',
          letterSpacing: '0.02em',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#534AB7')}
        onMouseLeave={(e) => (e.currentTarget.style.background = '#7F77DD')}
      >
        Export project.json
      </button>
    </div>
  )
}
