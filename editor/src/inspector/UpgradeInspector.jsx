import { Field, TextArea, Section, StatBlock, useNodeUpdater } from './FormPrimitives'

export default function UpgradeInspector({ node }) {
  const update = useNodeUpdater(node.id)
  const d = node.data
  const effect = d.effect ?? {}
  const cost = d.cost ?? []

  const updateEffect = (patch) => update({ effect: { ...effect, ...patch } })
  const addCost = () => update({ cost: [...cost, { resource_id: '', amount: 0 }] })
  const updCost = (i, patch) => update({ cost: cost.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) })
  const remCost = (i) => update({ cost: cost.filter((_, idx) => idx !== i) })

  return (
    <div>
      <Section title="Identity" />
      <Field label="Label" value={d.label} onChange={(v) => update({ label: v })} />
      <Field label="Icon (emoji)" value={d.icon} onChange={(v) => update({ icon: v })} placeholder="⬆️" />
      <TextArea label="Description" value={d.description} onChange={(v) => update({ description: v })} rows={2} />
      <Field label="Max tier (1 = one-time)" value={d.max_tier} onChange={(v) => update({ max_tier: Number(v) })} type="number" />

      <Section title="Cost (per tier)" />
      {cost.map((c, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <input value={c.resource_id} onChange={(e) => updCost(i, { resource_id: e.target.value })} placeholder="resource_id" style={{ ...inp, flex: 1 }} />
          <input type="number" value={c.amount} onChange={(e) => updCost(i, { amount: Number(e.target.value) })} style={{ ...inp, width: 80 }} />
          <button onClick={() => remCost(i)} style={xBtn}>×</button>
        </div>
      ))}
      <button onClick={addCost} style={addBtn}>+ Add cost</button>

      <Section title="Effect" />
      <StatBlock label="Resource cap multiplier" value={effect.resource_cap_multiplier ?? {}} onChange={(v) => updateEffect({ resource_cap_multiplier: v })} />
      <StatBlock label="Resource income multiplier" value={effect.resource_income_multiplier ?? {}} onChange={(v) => updateEffect({ resource_income_multiplier: v })} />
      <StatBlock label="Hero stat modifier" value={effect.hero_stat_modifier ?? {}} onChange={(v) => updateEffect({ hero_stat_modifier: v })} />
      <Field label="Expedition success bonus" value={effect.expedition_success_bonus ?? 0} onChange={(v) => updateEffect({ expedition_success_bonus: Number(v) })} type="number" />
      <Field label="Craft speed multiplier" value={effect.craft_speed_multiplier ?? 1} onChange={(v) => updateEffect({ craft_speed_multiplier: Number(v) })} type="number" />
      <Field label="Loot bonus %" value={effect.loot_bonus_pct ?? 0} onChange={(v) => updateEffect({ loot_bonus_pct: Number(v) })} type="number" />
    </div>
  )
}

const inp = { background: '#1e1e2e', border: '1px solid #2a2a3e', borderRadius: 6, padding: '4px 6px', color: '#e0e0f0', fontSize: 12, outline: 'none' }
const xBtn = { background: 'none', border: 'none', color: '#555570', cursor: 'pointer', fontSize: 14, padding: '0 2px' }
const addBtn = { width: '100%', padding: '7px', background: '#1e1e2e', border: '1px dashed #2a2a3e', borderRadius: 7, color: '#666680', fontSize: 12, cursor: 'pointer', marginBottom: 4 }
