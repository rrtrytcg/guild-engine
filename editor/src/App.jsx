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

function ScreenBuilderLoading() {
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
      Loading screen builder…
    </div>
  )
}

const GroupCanvas = lazy(() => 
  import('./canvas/GroupCanvas').catch(() => Promise.resolve({ default: () => null }))
)
const ScreenBuilder = lazy(() => 
  import('./components/ScreenBuilder').catch(() => Promise.resolve({ default: () => null }))
)

const SearchPalette = lazy(() => import('./components/SearchPalette'))

export default function App() {
  const viewMode = useStore((s) => s.viewMode)
  const activeGroupId = useStore((s) => s.activeGroupId)
  const focusGroupId = viewMode === 'nodes' ? activeGroupId : null
  const openSearch = useStore((s) => s.openSearch)

  // Ctrl+K to open search palette
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (viewMode === 'screens') return

      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        openSearch()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openSearch, viewMode])

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
        {viewMode === 'screens' ? (
          <Suspense fallback={<ScreenBuilderLoading />}>
            <ScreenBuilder />
          </Suspense>
        ) : (
          <>
            <Palette />
            {viewMode === 'nodes' ? (
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
          </>
        )}
      </div>
    </div>
  )
}
