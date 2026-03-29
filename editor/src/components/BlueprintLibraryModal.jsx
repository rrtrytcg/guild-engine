import useStore from '../store/useStore'
import forgeStandard from '../blueprints/forge-standard.blueprint.json'
import apothecaryStandard from '../blueprints/apothecary-standard.blueprint.json'
import libraryStandard from '../blueprints/library-standard.blueprint.json'

const PRESET_BLUEPRINTS = [forgeStandard, apothecaryStandard, libraryStandard]

export default function BlueprintLibraryModal({ onClose, dropPosition }) {
  const importBlueprint = useStore((s) => s.importBlueprint)
  const savedBlueprints = useStore((s) => s.blueprints)

  const handleDrop = (blueprint) => {
    importBlueprint(blueprint, dropPosition)
    onClose()
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
          width: 720, maxHeight: '80vh', display: 'flex', flexDirection: 'column',
          overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #2a2a3e', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#e0e0f0' }}>Blueprint library</div>
            <div style={{ fontSize: 11, color: '#444460', marginTop: 2 }}>Drop a fully-wired preset or one of your saved blueprints onto the canvas.</div>
          </div>
          <button onClick={onClose} style={closeBtn}>×</button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '14px 20px' }}>
          <Section title="Preset blueprints">
            <div style={cardGrid}>
              {PRESET_BLUEPRINTS.map((blueprint) => (
                <BlueprintCard
                  key={blueprint.blueprint_meta.id}
                  blueprint={blueprint}
                  onDrop={() => handleDrop(blueprint)}
                />
              ))}
            </div>
          </Section>

          <Section title="Imported blueprints">
            {savedBlueprints.length > 0 ? (
              <div style={cardGrid}>
                {savedBlueprints.map((blueprint) => (
                  <BlueprintCard
                    key={blueprint.blueprint_meta.id}
                    blueprint={blueprint}
                    onDrop={() => handleDrop(blueprint)}
                  />
                ))}
              </div>
            ) : (
              <div style={emptyState}>
                Export a blueprint from a blueprint node or import a `.blueprint.json` file to see it here.
              </div>
            )}
          </Section>
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid #2a2a3e', display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0 }}>
          <button onClick={onClose} style={secondaryBtn}>Close</button>
        </div>
      </div>
    </div>
  )
}

function BlueprintCard({ blueprint, onDrop }) {
  const meta = blueprint.blueprint_meta ?? {}
  const nodeCount = blueprint.nodes?.length ?? 0

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#e0e0f0' }}>{meta.label ?? 'Unnamed blueprint'}</div>
          <div style={{ fontSize: 11, color: '#666680', marginTop: 4, lineHeight: 1.5 }}>{meta.description ?? 'No description provided.'}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', flexShrink: 0 }}>
          <Badge color="#7F77DD" label={meta.complexity ?? 'custom'} />
          <Badge color="#3B6D11" label={`${nodeCount} nodes`} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <Badge color="#534AB7" label={meta.flavor ?? 'designer'} />
        <Badge color="#2a2a3e" label={meta.requires_schema_version ?? '1.2.0'} textColor="#8888aa" />
      </div>

      <button onClick={onDrop} style={primaryBtn('#534AB7')}>
        Drop onto canvas
      </button>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#444460', marginBottom: 10 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function Badge({ color, label, textColor }) {
  return (
    <div style={{ padding: '4px 10px', borderRadius: 6, background: `${color}22`, border: `1px solid ${color}44`, color: textColor ?? color, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {label}
    </div>
  )
}

const cardGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 12,
}

const cardStyle = {
  background: '#161625',
  border: '1px solid #2a2a3e',
  borderRadius: 10,
  padding: 14,
}

const emptyState = {
  padding: '16px 14px',
  background: '#161625',
  border: '1px solid #2a2a3e',
  borderRadius: 10,
  color: '#666680',
  fontSize: 12,
}

const closeBtn = { background: 'none', border: 'none', color: '#555570', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '0 4px' }
const secondaryBtn = { background: 'transparent', border: '1px solid #2a2a3e', borderRadius: 7, color: '#8888aa', fontSize: 12, fontWeight: 600, padding: '7px 16px', cursor: 'pointer' }
const primaryBtn = (bg) => ({ width: '100%', background: bg, border: 'none', borderRadius: 7, color: '#fff', fontSize: 12, fontWeight: 600, padding: '7px 16px', cursor: 'pointer' })
