import { Field, TextArea, Section, StatBlock, SearchableDropdown, useNodeUpdater } from './FormPrimitives'

const SLOT_OPTIONS = ['weapon', 'armor', 'accessory', 'relic']

function CostEditor({ value, onChange }) {
  const add = () => onChange([...value, { resource_id: '', amount: 0 }])
  const upd = (i, patch) => onChange(value.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
  const rem = (i) => onChange(value.filter((_, idx) => idx !== i))
  return (
    <div style={{ marginBottom: 10 }}>
      {value.map((c, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <SearchableDropdown
              label={i === 0 ? 'Resource' : ''}
              value={c.resource_id}
              onChange={(v) => upd(i, { resource_id: v })}
              typeFilter="resource"
              placeholder="Search resources"
            />
          </div>
          <div style={{ width: 90 }}>
            <Field label={i === 0 ? 'Amount' : ''} value={c.amount} onChange={(v) => upd(i, { amount: Number(v) })} type="number" />
          </div>
          <button onClick={() => rem(i)} style={xBtn}>×</button>
        </div>
      ))}
      <button onClick={add} style={addBtn}>+ cost</button>
    </div>
  )
}

export default function HeroClassInspector({ node }) {
  const update = useNodeUpdater(node.id)
  const d = node.data

  const toggleSlot = (slot) => {
    const current = d.slots ?? []
    const next = current.includes(slot)
      ? current.filter((s) => s !== slot)
      : [...current, slot]
    update({ slots: next })
  }

  return (
    <div>
      <Section title="Identity" />
      <Field label="Label" value={d.label} onChange={(v) => update({ label: v })} />
      <Field label="Icon (emoji)" value={d.icon} onChange={(v) => update({ icon: v })} placeholder="⚔️" />
      <TextArea label="Description" value={d.description} onChange={(v) => update({ description: v })} rows={2} />

      <Section title="Equipment slots" />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {SLOT_OPTIONS.map((slot) => {
          const active = (d.slots ?? []).includes(slot)
          return (
            <button
              key={slot}
              onClick={() => toggleSlot(slot)}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                border: active ? '1px solid #7F77DD' : '1px solid #2a2a3e',
                background: active ? '#7F77DD22' : '#1e1e2e',
                color: active ? '#7F77DD' : '#666680',
                fontSize: 11,
                cursor: 'pointer',
                fontWeight: active ? 600 : 400,
              }}
            >
              {slot}
            </button>
          )
        })}
      </div>

      <Section title="Recruit cost" />
      <CostEditor value={d.recruit_cost ?? []} onChange={(v) => update({ recruit_cost: v })} />

      <Section title="Base stats" />
      <StatBlock label="Base stats" value={d.base_stats} onChange={(v) => update({ base_stats: v })} />

      <Section title="Stat growth (per level)" />
      <StatBlock label="Growth" value={d.stat_growth} onChange={(v) => update({ stat_growth: v })} />
    </div>
  )
}

const xBtn = { background: 'none', border: 'none', color: '#555570', cursor: 'pointer', fontSize: 14, padding: '0 2px' }
const addBtn = { fontSize: 10, padding: '3px 8px', background: '#1e1e2e', border: '1px solid #2a2a3e', borderRadius: 4, color: '#666680', cursor: 'pointer' }
