import { lazy, Suspense } from 'react'
import Toolbar from './components/Toolbar'
import Palette from './canvas/Palette'
import Canvas from './canvas/Canvas'
import Inspector from './inspector/Inspector'
import useStore from './store/useStore'

const GroupCanvas = lazy(() => import('./canvas/GroupCanvas').catch(() => ({
  default: GroupCanvasError,
})))

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
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minWidth: 0 }}>
        <Palette />
        {canvasView === 'nodes' ? (
          <Canvas focusGroupId={focusGroupId} />
        ) : (
          <Suspense fallback={<GroupCanvasLoading />}>
            <GroupCanvas />
          </Suspense>
        )}
        <Inspector />
      </div>
    </div>
  )
}

function GroupCanvasLoading() {
  return (
    <div style={{
      flex: 1,
      padding: 24,
      background: 'radial-gradient(circle at top left, #151528 0%, #0d0d1a 55%, #090912 100%)',
      color: '#666680',
      fontSize: 12,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      Loading group view…
    </div>
  )
}

function GroupCanvasError() {
  return (
    <div style={{
      flex: 1,
      padding: 24,
      background: 'radial-gradient(circle at top left, #151528 0%, #0d0d1a 55%, #090912 100%)',
      color: '#E24B4A',
      fontSize: 12,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
    }}>
      Group view failed to load. Reload the editor to try again.
    </div>
  )
}
