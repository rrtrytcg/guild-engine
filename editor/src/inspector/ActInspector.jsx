import { Field, TextArea, Select, Section, useNodeUpdater } from './FormPrimitives'

const CONDITION_TYPES = [
  'resource_gte',
  'building_level',
  'act_reached',
  'faction_rep_gte',
  'upgrade_owned',
  'hero_count_gte',
  'prestige_count_gte',
]

export default function ActInspector({ node }) {
  const update = useNodeUpdater(node.id)
  const d = node.data
  const conditions = d.completion_conditions ?? []

  const addCondition = () =>
    update({ completion_conditions: [...conditions, { type: 'resource_gte', target_id: '', value: 0 }] })

  const updateCondition = (i, patch) =>
    update({ completion_conditions: conditions.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) })

  const removeCondition = (i) =>
    update({ completion_conditions: conditions.filter((_, idx) => idx !== i) })

  return (
    <div>
      <Section title="Identity" />
      <Field label="Label" value={d.label} onChange={(v) => update({ label: v })} />
      <Field label="Act number" value={d.act_number} onChange={(v) => update({ act_number: Number(v) })} type="number" />
      <TextArea label="Description" value={d.description} onChange={(v) => update({ description: v })} rows={2} />
      <TextArea label="Narrative log (shown on act start/complete)" value={d.narrative_log ?? ''} onChange={(v) => update({ narrative_log: v })} rows={3} placeholder="The guild doors creak open as a new threat emerges..." />

      <Section title="Completion conditions (all must pass)" />
      {conditions.length === 0 && (
        <p style={{ fontSize: 11, color: '#444460', marginBottom: 8 }}>No conditions — act completes immediately.</p>
      )}
      {conditions.map((cond, i) => (
        <div key={i} style={{ background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 10, color: '#555570', fontWeight: 700 }}>CONDITION {i + 1}</span>
            <button onClick={() => removeCondition(i)} style={xBtn}>× remove</button>
          </div>
          <Select label="Type" value={cond.type} onChange={(v) => updateCondition(i, { type: v })} options={CONDITION_TYPES} />
          <Field label="Target ID (node id)" value={cond.target_id ?? ''} onChange={(v) => updateCondition(i, { target_id: v })} placeholder="resource-123" />
          <Field label="Value" value={cond.value ?? 0} onChange={(v) => updateCondition(i, { value: Number(v) })} type="number" />
        </div>
      ))}
      <button onClick={addCondition} style={addBtn}>+ Add condition</button>
    </div>
  )
}

const xBtn = { background: 'none', border: 'none', color: '#555570', cursor: 'pointer', fontSize: 11 }
const addBtn = { width: '100%', padding: '7px', background: '#1e1e2e', border: '1px dashed #2a2a3e', borderRadius: 7, color: '#666680', fontSize: 12, cursor: 'pointer' }
