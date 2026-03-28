import { Field, TextArea, Toggle, Section, StatBlock, DroppableField, useNodeUpdater } from './FormPrimitives'
import React from 'react'

export default function BossExpeditionInspector({ node }) {
  const update = useNodeUpdater(node.id)
  const d = node.data
  const phases = d.phases ?? []

  const addPhase = () =>
    update({
      phases: [...phases, {
        phase_number: phases.length + 1,
        hp_threshold: Math.max(0.1, 0.8 - phases.length * 0.3),
        label: `Phase ${phases.length + 2}`,
        modifier: {},
        log_message: '',
      }],
    })

  const updatePhase = (i, patch) =>
    update({ phases: phases.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) })

  const removePhase = (i) =>
    update({ phases: phases.filter((_, idx) => idx !== i) })

  return (
    <div>
      <Section title="Identity" />
      <Field label="Label" value={d.label} onChange={(v) => update({ label: v })} />
      <Field label="Icon (emoji)" value={d.icon} onChange={(v) => update({ icon: v })} placeholder="💀" />
      <TextArea label="Description" value={d.description} onChange={(v) => update({ description: v })} rows={2} />

      <Section title="Config" />
      <Field label="Duration (seconds)" value={d.duration_s} onChange={(v) => update({ duration_s: Number(v) })} type="number" />
      <Field label="Party size" value={d.party_size} onChange={(v) => update({ party_size: Number(v) })} type="number" />
      <Field label="Boss HP" value={d.boss_hp} onChange={(v) => update({ boss_hp: Number(v) })} type="number" />
      <Toggle label="Repeatable" value={d.repeatable} onChange={(v) => update({ repeatable: v })} />

      <Section title="Boss stats" />
      <StatBlock label="Boss stats" value={d.boss_stats ?? {}} onChange={(v) => update({ boss_stats: v })} />

      <Section title="Loot" />
      <DroppableField label="Kill loot table ID" value={d.loot_table_id} onChange={(v) => update({ loot_table_id: v })} placeholder="loot_table-id" />
      <DroppableField label="Fail loot table ID (optional)" value={d.fail_loot_table_id ?? ''} onChange={(v) => update({ fail_loot_table_id: v })} />

      <Section title="Phases" />
      <p style={{ fontSize: 11, color: '#444460', marginBottom: 8 }}>
        Phase 1 is always active. Add phases that trigger when HP drops below a threshold.
      </p>
      {phases.map((phase, i) => (
        <PhaseRow key={i} index={i} phase={phase} onChange={(p) => updatePhase(i, p)} onRemove={() => removePhase(i)} />
      ))}
      <button onClick={addPhase} style={addBtn}>+ Add phase</button>
    </div>
  )
}

function PhaseRow({ index, phase, onChange, onRemove }) {
  const [open, setOpen] = React.useState(index === 0)
  return (
    <div style={{ border: '1px solid #2a2a3e', borderRadius: 8, marginBottom: 6, overflow: 'hidden' }}>
      <div onClick={() => setOpen((o) => !o)} style={{ padding: '7px 10px', background: '#1a1a2e', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: '#c0c0d8' }}>{phase.label || `Phase ${index + 1}`}</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={(e) => { e.stopPropagation(); onRemove() }} style={xBtn}>× remove</button>
          <span style={{ fontSize: 11, color: '#444460' }}>{open ? '▲' : '▼'}</span>
        </div>
      </div>
      {open && (
        <div style={{ padding: '8px 10px' }}>
          <Field label="Phase label" value={phase.label} onChange={(v) => onChange({ label: v })} />
          <Field label="HP threshold (0–1, phase activates below this)" value={phase.hp_threshold} onChange={(v) => onChange({ hp_threshold: Number(v) })} type="number" />
          <Field label="Log message on transition" value={phase.log_message ?? ''} onChange={(v) => onChange({ log_message: v })} />
          <StatBlock label="Stat modifiers in this phase" value={phase.modifier ?? {}} onChange={(v) => onChange({ modifier: v })} />
        </div>
      )}
    </div>
  )
}

const xBtn = { background: 'none', border: 'none', color: '#555570', cursor: 'pointer', fontSize: 11 }
const addBtn = { width: '100%', padding: '7px', background: '#1e1e2e', border: '1px dashed #2a2a3e', borderRadius: 7, color: '#666680', fontSize: 12, cursor: 'pointer' }
