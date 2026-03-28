import { Field, TextArea, Section, StatBlock, useNodeUpdater } from './FormPrimitives'

const SLOT_OPTIONS = ['weapon', 'armor', 'accessory', 'relic']

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

      <Section title="Base stats" />
      <StatBlock label="Base stats" value={d.base_stats} onChange={(v) => update({ base_stats: v })} />

      <Section title="Stat growth (per level)" />
      <StatBlock label="Growth" value={d.stat_growth} onChange={(v) => update({ stat_growth: v })} />
    </div>
  )
}
