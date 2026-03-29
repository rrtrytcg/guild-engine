import Toolbar from './components/Toolbar'
import Palette from './canvas/Palette'
import Canvas from './canvas/Canvas'
import GroupCanvas from './canvas/GroupCanvas'
import Inspector from './inspector/Inspector'
import useStore from './store/useStore'

export default function App() {
  const canvasView = useStore((s) => s.canvasView)
  const activeGroupId = useStore((s) => s.activeGroupId)
  const focusGroupId = canvasView === 'nodes' ? activeGroupId : null

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: '#0d0d1a',
        color: '#e0e0f0',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <Toolbar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Palette />
        {canvasView === 'nodes' ? (
          <Canvas focusGroupId={focusGroupId} />
        ) : (
          <GroupCanvas />
        )}
        <Inspector />
      </div>
    </div>
  )
}
