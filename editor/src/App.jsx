import { lazy, Suspense, useEffect } from 'react'
import Toolbar from './components/Toolbar'
import Palette from './canvas/Palette'
import Canvas from './canvas/Canvas'
import Inspector from './inspector/Inspector'
import useStore from './store/useStore'

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

const GroupCanvas = lazy(() => import('./canvas/GroupCanvas').catch(() => ({
  default: GroupCanvasError,
})))

const SearchPalette = lazy(() => import('./components/SearchPalette'))

export default function App() {
  const canvasView = useStore((s) => s.canvasView)
  const activeGroupId = useStore((s) => s.activeGroupId)
  const focusGroupId = canvasView === 'nodes' ? activeGroupId : null
  const openSearch = useStore((s) => s.openSearch)
  const closeSearch = useStore((s) => s.closeSearch)

  // Ctrl+K to open search palette
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        openSearch()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openSearch])

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
        <Suspense fallback={null}>
          <SearchPalette />
        </Suspense>
      </div>
    </div>
  )
}
