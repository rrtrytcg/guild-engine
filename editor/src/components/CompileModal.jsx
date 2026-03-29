import { useState } from 'react'
import { compile, downloadProject } from '../compiler/compiler'
import useStore from '../store/useStore'

export default function CompileModal({ onClose }) {
  const nodes = useStore((s) => s.nodes)
  const edges = useStore((s) => s.edges)
  const exportProject = useStore((s) => s.exportProject)
  const [meta, setMeta] = useState({ title: 'My Guild Game', author: '' })
  const [result, setResult] = useState(null)

  const runCompile = () => {
    const r = compile(nodes, edges, meta)
    setResult({
      ...r,
      project: exportProject(r.project),
    })
  }

  const handleDownload = () => {
    if (result) downloadProject(result)
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#13131f', border: '1px solid #2a2a3e', borderRadius: 14,
          width: 540, maxHeight: '80vh', display: 'flex', flexDirection: 'column',
          overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
        }}
      >
        {/* Modal header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #2a2a3e', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#e0e0f0' }}>Compile project</div>
            <div style={{ fontSize: 11, color: '#444460', marginTop: 2 }}>Validate graph and export project.json</div>
          </div>
          <button onClick={onClose} style={closeBtn}>×</button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {/* Meta fields */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e1e2e' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#444460', marginBottom: 10 }}>Project info</div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
              <div style={{ flex: 2 }}>
                <label style={labelStyle}>Title</label>
                <input value={meta.title} onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))} style={inputStyle} placeholder="My Guild Game" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Author</label>
                <input value={meta.author} onChange={(e) => setMeta((m) => ({ ...m, author: e.target.value }))} style={inputStyle} placeholder="you" />
              </div>
            </div>
          </div>

          {/* Compile result */}
          {result && (
            <div style={{ padding: '14px 20px' }}>

              {/* Stats */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                <Chip label="Nodes" value={result.stats.nodeCount} color="#7F77DD" />
                <Chip label="Edges" value={result.stats.edgeCount} color="#534AB7" />
                {Object.entries(result.stats.byType).map(([type, count]) => (
                  <Chip key={type} label={type} value={count} color="#2a2a3e" textColor="#8888aa" />
                ))}
              </div>

              {/* Errors */}
              {result.errors.length > 0 && (
                <Section title={`${result.errors.length} error${result.errors.length !== 1 ? 's' : ''}`} color="#E24B4A">
                  {result.errors.map((e, i) => (
                    <MessageRow key={i} icon="✕" color="#E24B4A" text={e.message} />
                  ))}
                </Section>
              )}

              {/* Warnings */}
              {result.warnings.length > 0 && (
                <Section title={`${result.warnings.length} warning${result.warnings.length !== 1 ? 's' : ''}`} color="#BA7517">
                  {result.warnings.map((w, i) => (
                    <MessageRow key={i} icon="▲" color="#BA7517" text={w.message} />
                  ))}
                </Section>
              )}

              {/* All clear */}
              {result.ok && result.warnings.length === 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#0F6E5622', border: '1px solid #0F6E5644', borderRadius: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 18 }}>✓</span>
                  <span style={{ fontSize: 13, color: '#5DCAA5', fontWeight: 500 }}>Graph is valid — ready to export.</span>
                </div>
              )}

              {result.ok && result.warnings.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#BA751722', border: '1px solid #BA751744', borderRadius: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 18 }}>⚠</span>
                  <span style={{ fontSize: 13, color: '#EF9F27', fontWeight: 500 }}>Valid with warnings — you can still export.</span>
                </div>
              )}

              {!result.ok && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#E24B4A22', border: '1px solid #E24B4A44', borderRadius: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 18 }}>✕</span>
                  <span style={{ fontSize: 13, color: '#E24B4A', fontWeight: 500 }}>Fix errors above before exporting.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #2a2a3e', display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0 }}>
          <button onClick={onClose} style={secondaryBtn}>Cancel</button>
          <button onClick={runCompile} style={primaryBtn('#534AB7')}>
            Run validation
          </button>
          {result?.ok && (
            <button onClick={handleDownload} style={primaryBtn('#1D9E75')}>
              ↓ Download project.json
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Chip({ label, value, color, textColor }) {
  return (
    <div style={{ padding: '4px 10px', borderRadius: 6, background: `${color}22`, border: `1px solid ${color}44`, display: 'flex', gap: 6, alignItems: 'center' }}>
      <span style={{ fontSize: 10, color: textColor ?? color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <span style={{ fontSize: 13, color: textColor ?? color, fontWeight: 700 }}>{value}</span>
    </div>
  )
}

function Section({ title, color, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color, marginBottom: 6 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{children}</div>
    </div>
  )
}

function MessageRow({ icon, color, text }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '6px 10px', background: `${color}11`, borderRadius: 6, border: `1px solid ${color}22` }}>
      <span style={{ fontSize: 11, color, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <span style={{ fontSize: 12, color: '#c0c0d8', lineHeight: 1.5 }}>{text}</span>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const labelStyle = { display: 'block', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#666680', marginBottom: 4 }
const inputStyle = { width: '100%', background: '#1e1e2e', border: '1px solid #2a2a3e', borderRadius: 6, padding: '6px 8px', color: '#e0e0f0', fontSize: 12, outline: 'none', boxSizing: 'border-box' }
const closeBtn = { background: 'none', border: 'none', color: '#555570', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '0 4px' }
const secondaryBtn = { background: 'transparent', border: '1px solid #2a2a3e', borderRadius: 7, color: '#8888aa', fontSize: 12, fontWeight: 600, padding: '7px 16px', cursor: 'pointer' }
const primaryBtn = (bg) => ({ background: bg, border: 'none', borderRadius: 7, color: '#fff', fontSize: 12, fontWeight: 600, padding: '7px 16px', cursor: 'pointer' })
