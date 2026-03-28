import { Field, TextArea, Select, Section, useNodeUpdater } from './FormPrimitives'

const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary']
const SLOTS = ['weapon', 'armor', 'accessory', 'relic']
const SUBTYPES = ['equipment', 'material']

export default function ItemInspector({ node }) {
  const update = useNodeUpdater(node.id)
  const d = node.data
  const isEquipment = d.subtype === 'equipment'

  return (
    <div>
      <Section title="Identity" />
      <Field label="Label" value={d.label} onChange={(v) => update({ label: v })} />
      <Field label="Icon (emoji)" value={d.icon} onChange={(v) => update({ icon: v })} placeholder="🗡️" />
      <TextArea label="Description" value={d.description} onChange={(v) => update({ description: v })} rows={2} />

      <Section title="Classification" />
      <Select label="Subtype" value={d.subtype} onChange={(v) => update({ subtype: v })} options={SUBTYPES} />
      <Select label="Rarity" value={d.rarity} onChange={(v) => update({ rarity: v })} options={RARITIES} />
      <Field label="Stack limit" value={d.stack_limit} onChange={(v) => update({ stack_limit: v })} type="number" />

      {isEquipment && (
        <>
          <Section title="Equipment" />
          <Select label="Slot" value={d.slot} onChange={(v) => update({ slot: v })} options={SLOTS} />
          <StatModTable value={d.stat_modifiers ?? {}} onChange={(v) => update({ stat_modifiers: v })} />
        </>
      )}
    </div>
  )
}

// Inline compact stat table for equipment modifiers
function StatModTable({ value, onChange }) {
  const entries = Object.entries(value)
  const PRESETS = ['attack', 'defense', 'speed', 'hp', 'luck']

  const set = (key, val) => onChange({ ...value, [key]: Number(val) })
  const remove = (key) => { const n = { ...value }; delete n[key]; onChange(n) }
  const add = (key) => { if (!value[key]) onChange({ ...value, [key]: 0 }) }

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#666680', marginBottom: 6 }}>
        Stat modifiers
      </div>
      {/* Preset quick-add chips */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
        {PRESETS.filter((p) => !value[p]).map((p) => (
          <button key={p} onClick={() => add(p)} style={chipStyle}>{p}</button>
        ))}
      </div>
      {entries.map(([key, val]) => (
        <div key={key} style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#8888aa', flex: 1 }}>{key}</span>
          <input
            type="number"
            value={val}
            onChange={(e) => set(key, e.target.value)}
            style={numInput}
          />
          <button onClick={() => remove(key)} style={xBtn}>×</button>
        </div>
      ))}
    </div>
  )
}

const chipStyle = { fontSize: 10, padding: '2px 7px', borderRadius: 4, background: '#1e1e2e', border: '1px solid #2a2a3e', color: '#666680', cursor: 'pointer' }
const numInput = { width: 64, background: '#1e1e2e', border: '1px solid #2a2a3e', borderRadius: 6, padding: '4px 6px', color: '#e0e0f0', fontSize: 12, outline: 'none' }
const xBtn = { background: 'none', border: 'none', color: '#555570', cursor: 'pointer', fontSize: 14, padding: '0 2px' }
