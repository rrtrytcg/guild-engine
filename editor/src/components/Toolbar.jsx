import { useRef, useState } from 'react'
import useStore from '../store/useStore'
import CompileModal from './CompileModal'
import BlueprintLibraryModal from './BlueprintLibraryModal'
import TuningModal from './TuningModal'

export default function Toolbar() {
  const importProject = useStore((s) => s.importProject)
  const registerBlueprint = useStore((s) => s.registerBlueprint)
  const canvasView = useStore((s) => s.canvasView)
  const setCanvasView = useStore((s) => s.setCanvasView)
  const nodeCount = useStore((s) => s.nodes.length)
  const edgeCount = useStore((s) => s.edges.length)
  const fileInputRef = useRef(null)
  const [showCompile, setShowCompile] = useState(false)
  const [showBlueprints, setShowBlueprints] = useState(false)
  const [showTuning, setShowTuning] = useState(false)
  const openDocs = () => window.open('/docs/WIKI.md', '_blank', 'noopener,noreferrer')

  const onFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const payload = JSON.parse(ev.target.result)
        if (payload?.blueprint_meta && Array.isArray(payload?.nodes)) {
          registerBlueprint(payload)
        } else {
          importProject(payload)
        }
      } catch {
        alert('Invalid JSON - could not parse file.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const blueprintDropPosition = {
    x: 280 + (nodeCount % 5) * 40,
    y: 160 + (nodeCount % 4) * 36,
  }

  return (
    <>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>{'\u2694'}</span>
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

        <div style={viewToggleWrap}>
          <button
            type="button"
            onClick={() => setCanvasView('nodes')}
            style={viewPill(canvasView === 'nodes')}
          >
            {'\u229E'} Nodes
          </button>
          <button
            type="button"
            onClick={() => setCanvasView('groups')}
            style={viewPill(canvasView === 'groups')}
          >
            {'\u25A3'} Groups
          </button>
        </div>

        <div style={{ flex: 1 }} />

        <span style={{ fontSize: 11, color: '#444460' }}>
          {nodeCount} node{nodeCount !== 1 ? 's' : ''} {'\u00B7'} {edgeCount} edge{edgeCount !== 1 ? 's' : ''}
        </span>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={onFileChange}
          style={{ display: 'none' }}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          style={ghostBtn}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#444460'
            e.currentTarget.style.color = '#c0c0d8'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#2a2a3e'
            e.currentTarget.style.color = '#8888aa'
          }}
        >
          Import JSON
        </button>

        <button
          onClick={() => setShowBlueprints(true)}
          style={ghostBtn}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#444460'
            e.currentTarget.style.color = '#c0c0d8'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#2a2a3e'
            e.currentTarget.style.color = '#8888aa'
          }}
        >
          Blueprints
        </button>

        <button
          onClick={() => setShowTuning(true)}
          style={ghostBtn}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#444460'
            e.currentTarget.style.color = '#c0c0d8'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#2a2a3e'
            e.currentTarget.style.color = '#8888aa'
          }}
        >
          Tuning
        </button>

        <button
          onClick={openDocs}
          style={ghostBtn}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#444460'
            e.currentTarget.style.color = '#c0c0d8'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#2a2a3e'
            e.currentTarget.style.color = '#8888aa'
          }}
        >
          Docs
        </button>

        <button
          onClick={() => setShowCompile(true)}
          style={solidBtn}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#534AB7')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#7F77DD')}
        >
          Compile &amp; Export
        </button>
      </div>

      {showBlueprints && (
        <BlueprintLibraryModal
          onClose={() => setShowBlueprints(false)}
          dropPosition={blueprintDropPosition}
        />
      )}
      {showTuning && <TuningModal onClose={() => setShowTuning(false)} />}
      {showCompile && <CompileModal onClose={() => setShowCompile(false)} />}
    </>
  )
}

const ghostBtn = {
  background: 'transparent',
  border: '1px solid #2a2a3e',
  borderRadius: 7,
  color: '#8888aa',
  fontSize: 12,
  fontWeight: 600,
  padding: '6px 14px',
  cursor: 'pointer',
}

const solidBtn = {
  background: '#7F77DD',
  border: 'none',
  borderRadius: 7,
  color: '#fff',
  fontSize: 12,
  fontWeight: 600,
  padding: '6px 14px',
  cursor: 'pointer',
}

const viewToggleWrap = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: 3,
  background: '#13131f',
  border: '1px solid #2a2a3e',
  borderRadius: 999,
}

const viewPill = (active) => ({
  background: active ? '#7F77DD' : 'transparent',
  border: 'none',
  borderRadius: 999,
  color: active ? '#fff' : '#a0a0bc',
  fontSize: 12,
  fontWeight: 700,
  padding: '6px 12px',
  cursor: 'pointer',
})
