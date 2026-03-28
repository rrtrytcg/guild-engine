import Toolbar from './components/Toolbar'
import Palette from './canvas/Palette'
import Canvas from './canvas/Canvas'
import Inspector from './inspector/Inspector'

export default function App() {
  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0d0d1a', color: '#e0e0f0', fontFamily: 'system-ui, sans-serif' }}
    >
      <Toolbar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Palette />
        <Canvas />
        <Inspector />
      </div>
    </div>
  )
}
