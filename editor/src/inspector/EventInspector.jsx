import { useState } from 'react'
import { Field, TextArea, Section, SearchableDropdown, useNodeUpdater } from './FormPrimitives'

export default function EventInspector({ node }) {
  const update = useNodeUpdater(node.id)
  const d = node.data
  const choices = d.choices ?? []

  const addChoice = () =>
    update({ choices: [...choices, { label: 'New choice', outcome: { log_message: '' } }] })

  const updateChoice = (i, patch) =>
    update({ choices: choices.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) })

  const updateOutcome = (i, patch) =>
    updateChoice(i, { outcome: { ...(choices[i].outcome ?? {}), ...patch } })

  const removeChoice = (i) =>
    update({ choices: choices.filter((_, idx) => idx !== i) })

  return (
    <div>
      <Section title="Identity" />
      <Field label="Label" value={d.label} onChange={(v) => update({ label: v })} />
      <TextArea label="Description" value={d.description} onChange={(v) => update({ description: v })} rows={2} />
      <TextArea label="Log message (shown in event log)" value={d.log_message ?? ''} onChange={(v) => update({ log_message: v })} rows={2} placeholder="A merchant appears at the gate..." />

      <Section title="Player choices" />
      {choices.length === 0 && (
        <p style={{ fontSize: 11, color: '#444460', marginBottom: 8 }}>No choices - event fires automatically with no player input.</p>
      )}
      {choices.map((choice, i) => (
        <ChoiceRow
          key={i}
          index={i}
          choice={choice}
          onLabelChange={(v) => updateChoice(i, { label: v })}
          onOutcomeChange={(patch) => updateOutcome(i, patch)}
          onRemove={() => removeChoice(i)}
        />
      ))}
      {choices.length < 4 && (
        <button onClick={addChoice} style={addBtn}>+ Add choice</button>
      )}
    </div>
  )
}

function ChoiceRow({ index, choice, onLabelChange, onOutcomeChange, onRemove }) {
  const [open, setOpen] = useState(index === 0)
  const outcome = choice.outcome ?? {}

  return (
    <div style={{ border: '1px solid #2a2a3e', borderRadius: 8, marginBottom: 6, overflow: 'hidden' }}>
      <div onClick={() => setOpen((o) => !o)} style={{ padding: '7px 10px', background: '#1a1a2e', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: '#c0c0d8' }}>{choice.label || `Choice ${index + 1}`}</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={(e) => { e.stopPropagation(); onRemove() }} style={xBtn}>× remove</button>
          <span style={{ fontSize: 11, color: '#444460' }}>{open ? '▲' : '▼'}</span>
        </div>
      </div>
      {open && (
        <div style={{ padding: '8px 10px' }}>
          <Field label="Choice label" value={choice.label} onChange={onLabelChange} />
          <Field label="Outcome log message" value={outcome.log_message ?? ''} onChange={(v) => onOutcomeChange({ log_message: v })} />
          <ResourceDeltaEditor value={outcome.resource_delta ?? {}} onChange={(v) => onOutcomeChange({ resource_delta: v })} />
          <FactionDeltaEditor value={outcome.faction_rep_delta ?? {}} onChange={(v) => onOutcomeChange({ faction_rep_delta: v })} />
        </div>
      )}
    </div>
  )
}

function ResourceDeltaEditor({ value, onChange }) {
  const entries = Object.entries(value)
  const add = () => onChange({ ...value, '': 0 })
  const upd = (oldKey, newKey, val) => {
    const next = {}
    entries.forEach(([k, v]) => {
      next[k === oldKey ? newKey : k] = k === oldKey ? Number(val) : v
    })
    onChange(next)
  }
  const rem = (key) => {
    const n = { ...value }
    delete n[key]
    onChange(n)
  }

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#666680', marginBottom: 4 }}>Resource delta</div>
      {entries.map(([key, val], i) => (
        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <SearchableDropdown
              label={i === 0 ? 'Resource' : ''}
              value={key}
              onChange={(v) => upd(key, v, val)}
              typeFilter="resource"
              placeholder="Search resources"
            />
          </div>
          <div style={{ width: 90 }}>
            <Field label={i === 0 ? 'Amount' : ''} value={val} onChange={(v) => upd(key, key, v)} type="number" />
          </div>
          <button onClick={() => rem(key)} style={xBtn}>×</button>
        </div>
      ))}
      <button onClick={add} style={smallAdd}>+ resource</button>
    </div>
  )
}

function FactionDeltaEditor({ value, onChange }) {
  const entries = Object.entries(value)
  const add = () => onChange({ ...value, '': 0 })
  const upd = (oldKey, newKey, val) => {
    const next = {}
    entries.forEach(([k, v]) => {
      next[k === oldKey ? newKey : k] = k === oldKey ? Number(val) : v
    })
    onChange(next)
  }
  const rem = (key) => {
    const n = { ...value }
    delete n[key]
    onChange(n)
  }

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#666680', marginBottom: 4 }}>Faction rep delta</div>
      {entries.map(([key, val], i) => (
        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <SearchableDropdown
              label={i === 0 ? 'Faction' : ''}
              value={key}
              onChange={(v) => upd(key, v, val)}
              typeFilter="faction"
              placeholder="Search factions"
            />
          </div>
          <div style={{ width: 90 }}>
            <Field label={i === 0 ? 'Rep' : ''} value={val} onChange={(v) => upd(key, key, v)} type="number" />
          </div>
          <button onClick={() => rem(key)} style={xBtn}>×</button>
        </div>
      ))}
      <button onClick={add} style={smallAdd}>+ faction</button>
    </div>
  )
}

const xBtn = { background: 'none', border: 'none', color: '#555570', cursor: 'pointer', fontSize: 11 }
const addBtn = { width: '100%', padding: '7px', background: '#1e1e2e', border: '1px dashed #2a2a3e', borderRadius: 7, color: '#666680', fontSize: 12, cursor: 'pointer' }
const smallAdd = { fontSize: 10, padding: '3px 8px', background: '#1e1e2e', border: '1px solid #2a2a3e', borderRadius: 4, color: '#666680', cursor: 'pointer' }
