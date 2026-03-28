import { Field, TextArea, Section, Toggle, useNodeUpdater } from './FormPrimitives'

export default function ExpeditionInspector({ node }) {
  const update = useNodeUpdater(node.id)
  const d = node.data
  const events = d.events ?? []

  const addEvent = () =>
    update({
      events: [...events, {
        id: `evt-${Date.now()}`,
        label: 'New event',
        trigger_chance: 0.3,
        choices: [{ label: 'Continue', outcome: { log_message: 'The party presses on.' } }],
      }],
    })

  const updateEvent = (i, patch) =>
    update({ events: events.map((e, idx) => (idx === i ? { ...e, ...patch } : e)) })

  const removeEvent = (i) =>
    update({ events: events.filter((_, idx) => idx !== i) })

  return (
    <div>
      <Section title="Identity" />
      <Field label="Label" value={d.label} onChange={(v) => update({ label: v })} />
      <Field label="Icon (emoji)" value={d.icon} onChange={(v) => update({ icon: v })} placeholder="🗺️" />
      <TextArea label="Description" value={d.description} onChange={(v) => update({ description: v })} rows={2} />

      <Section title="Config" />
      <Field label="Duration (seconds)" value={d.duration_s} onChange={(v) => update({ duration_s: Number(v) })} type="number" />
      <Field label="Party size" value={d.party_size} onChange={(v) => update({ party_size: Number(v) })} type="number" />
      <Field label="Base success chance (0–1)" value={d.base_success_chance} onChange={(v) => update({ base_success_chance: Number(v) })} type="number" />

      <Section title="Loot" />
      <Field label="Loot table ID" value={d.loot_table_id} onChange={(v) => update({ loot_table_id: v })} placeholder="loot_table-id" />
      <Field label="Fail loot table ID (optional)" value={d.fail_loot_table_id ?? ''} onChange={(v) => update({ fail_loot_table_id: v })} placeholder="loot_table-id" />

      <Section title="Entry cost" />
      <CostEditor value={d.entry_cost ?? []} onChange={(v) => update({ entry_cost: v })} />

      <Section title="Mid-run events" />
      {events.map((evt, i) => (
        <EventRow key={i} index={i} evt={evt} onChange={(p) => updateEvent(i, p)} onRemove={() => removeEvent(i)} />
      ))}
      <button onClick={addEvent} style={addBtn}>+ Add event</button>
    </div>
  )
}

function EventRow({ index, evt, onChange, onRemove }) {
  const [open, setOpen] = React.useState(false)
  return (
    <div style={{ border: '1px solid #2a2a3e', borderRadius: 8, marginBottom: 6, overflow: 'hidden' }}>
      <div onClick={() => setOpen((o) => !o)} style={{ padding: '7px 10px', background: '#1a1a2e', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: '#c0c0d8' }}>{evt.label || `Event ${index + 1}`}</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={(e) => { e.stopPropagation(); onRemove() }} style={xBtn}>× remove</button>
          <span style={{ fontSize: 11, color: '#444460' }}>{open ? '▲' : '▼'}</span>
        </div>
      </div>
      {open && (
        <div style={{ padding: '8px 10px' }}>
          <Field label="Label" value={evt.label} onChange={(v) => onChange({ label: v })} />
          <Field label="Trigger chance (0–1)" value={evt.trigger_chance} onChange={(v) => onChange({ trigger_chance: Number(v) })} type="number" />
          <div style={{ fontSize: 10, color: '#444460', marginTop: 4 }}>Choices: {evt.choices?.length ?? 0} — edit in code or future UI</div>
        </div>
      )}
    </div>
  )
}

function CostEditor({ value, onChange }) {
  const add = () => onChange([...value, { resource_id: '', amount: 0 }])
  const upd = (i, patch) => onChange(value.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
  const rem = (i) => onChange(value.filter((_, idx) => idx !== i))
  return (
    <div style={{ marginBottom: 10 }}>
      {value.map((c, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
          <input value={c.resource_id} onChange={(e) => upd(i, { resource_id: e.target.value })} placeholder="resource_id" style={{ ...inp, flex: 1 }} />
          <input type="number" value={c.amount} onChange={(e) => upd(i, { amount: Number(e.target.value) })} style={{ ...inp, width: 70 }} />
          <button onClick={() => rem(i)} style={xBtn}>×</button>
        </div>
      ))}
      <button onClick={add} style={smallAddBtn}>+ cost</button>
    </div>
  )
}

import React from 'react'
const inp = { background: '#1e1e2e', border: '1px solid #2a2a3e', borderRadius: 6, padding: '4px 6px', color: '#e0e0f0', fontSize: 12, outline: 'none' }
const xBtn = { background: 'none', border: 'none', color: '#555570', cursor: 'pointer', fontSize: 11 }
const addBtn = { width: '100%', padding: '7px', background: '#1e1e2e', border: '1px dashed #2a2a3e', borderRadius: 7, color: '#666680', fontSize: 12, cursor: 'pointer' }
const smallAddBtn = { fontSize: 10, padding: '3px 8px', background: '#1e1e2e', border: '1px solid #2a2a3e', borderRadius: 4, color: '#666680', cursor: 'pointer' }
