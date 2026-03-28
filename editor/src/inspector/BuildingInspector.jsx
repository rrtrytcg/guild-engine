import { Field, TextArea, Toggle, Section, DroppableInput, useNodeUpdater } from './FormPrimitives'

export default function BuildingInspector({ node }) {
  const update = useNodeUpdater(node.id)
  const d = node.data
  const levels = d.levels ?? []

  const setMaxLevel = (n) => {
    const count = Number(n)
    const next = Array.from({ length: count }, (_, i) => levels[i] ?? defaultLevel())
    update({ max_level: count, levels: next })
  }

  const updateLevel = (i, patch) =>
    update({ levels: levels.map((l, idx) => (idx === i ? { ...l, ...patch } : l)) })

  return (
    <div>
      <Section title="Identity" />
      <Field label="Label" value={d.label} onChange={(v) => update({ label: v })} />
      <Field label="Icon (emoji)" value={d.icon} onChange={(v) => update({ icon: v })} placeholder="🏰" />
      <TextArea label="Description" value={d.description} onChange={(v) => update({ description: v })} rows={2} />

      <Section title="Config" />
      <Field label="Max level" value={d.max_level} onChange={setMaxLevel} type="number" />
      <Toggle label="Crafting station" value={d.is_crafting_station} onChange={(v) => update({ is_crafting_station: v })} />

      <Section title="Levels" />
      {levels.length === 0 && (
        <p style={{ fontSize: 11, color: '#444460', marginBottom: 8 }}>Set max level above to generate level slots.</p>
      )}
      {levels.map((lvl, i) => (
        <LevelRow key={i} index={i} lvl={lvl} onChange={(patch) => updateLevel(i, patch)} isCrafting={d.is_crafting_station} />
      ))}
    </div>
  )
}

function LevelRow({ index, lvl, onChange, isCrafting }) {
  const [open, setOpen] = React.useState(index === 0)

  return (
    <div style={{ border: '1px solid #2a2a3e', borderRadius: 8, marginBottom: 6, overflow: 'hidden' }}>
      <div
        onClick={() => setOpen((o) => !o)}
        style={{ padding: '7px 10px', background: '#1a1a2e', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <span style={{ fontSize: 12, color: '#c0c0d8', fontWeight: 500 }}>Level {index + 1}</span>
        <span style={{ fontSize: 11, color: '#444460' }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{ padding: '8px 10px' }}>
          <Field label="Build time (seconds)" value={lvl.build_time_s ?? 0} onChange={(v) => onChange({ build_time_s: Number(v) })} type="number" />
          <Field label="Hero slots" value={lvl.hero_slots ?? 0} onChange={(v) => onChange({ hero_slots: Number(v) })} type="number" />
          {isCrafting && (
            <Field label="Recipe queue slots" value={lvl.recipe_slots ?? 0} onChange={(v) => onChange({ recipe_slots: Number(v) })} type="number" />
          )}
          <CostEditor label="Build cost" value={lvl.build_cost ?? []} onChange={(v) => onChange({ build_cost: v })} />
          <ProductionEditor value={lvl.production ?? {}} onChange={(v) => onChange({ production: v })} />
        </div>
      )}
    </div>
  )
}

function CostEditor({ label, value, onChange }) {
  const add = () => onChange([...value, { resource_id: '', amount: 0 }])
  const upd = (i, patch) => onChange(value.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
  const rem = (i) => onChange(value.filter((_, idx) => idx !== i))

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#666680', marginBottom: 4 }}>{label}</div>
      {value.map((c, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
          <DroppableInput value={c.resource_id} onChange={(v) => upd(i, { resource_id: v })} placeholder="resource_id" style={{ ...inp, flex: 1 }} />
          <input type="number" value={c.amount} onChange={(e) => upd(i, { amount: Number(e.target.value) })} style={{ ...inp, width: 70 }} />
          <button onClick={() => rem(i)} style={xBtn}>×</button>
        </div>
      ))}
      <button onClick={add} style={addBtn}>+ cost</button>
    </div>
  )
}

function ProductionEditor({ value, onChange }) {
  const entries = Object.entries(value)
  const add = () => onChange({ ...value, '': 0 })
  const upd = (oldKey, newKey, val) => {
    const next = {}
    entries.forEach(([k, v]) => { next[k === oldKey ? newKey : k] = k === oldKey ? val : v })
    onChange(next)
  }
  const rem = (key) => { const n = { ...value }; delete n[key]; onChange(n) }

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#666680', marginBottom: 4 }}>Production / sec</div>
      {entries.map(([key, val], i) => (
        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
          <DroppableInput value={key} onChange={(v) => upd(key, v, val)} placeholder="resource_id" style={{ ...inp, flex: 1 }} />
          <input type="number" value={val} onChange={(e) => upd(key, key, Number(e.target.value))} style={{ ...inp, width: 70 }} />
          <button onClick={() => rem(key)} style={xBtn}>×</button>
        </div>
      ))}
      <button onClick={add} style={addBtn}>+ resource</button>
    </div>
  )
}

const defaultLevel = () => ({ build_cost: [], build_time_s: 0, hero_slots: 0, recipe_slots: 0, production: {} })
const inp = { background: '#1e1e2e', border: '1px solid #2a2a3e', borderRadius: 6, padding: '4px 6px', color: '#e0e0f0', fontSize: 12, outline: 'none' }
const xBtn = { background: 'none', border: 'none', color: '#555570', cursor: 'pointer', fontSize: 14, padding: '0 2px' }
const addBtn = { fontSize: 10, padding: '3px 8px', background: '#1e1e2e', border: '1px solid #2a2a3e', borderRadius: 4, color: '#666680', cursor: 'pointer' }

import React from 'react'
