import { useState } from 'react'
import { Field, TextArea, Toggle, Select, Section, SearchableDropdown, useNodeUpdater } from './FormPrimitives'

const ARTISAN_SLOT_EXPAND_OPTIONS = ['building_upgrade', 'none']
const PASSIVE_EVENT_TYPES = ['hero_available', 'resource_windfall', 'world_effect', 'random_encounter']

export default function BuildingInspector({ node }) {
  const update = useNodeUpdater(node.id)
  const d = node.data
  const levels = d.levels ?? []
  const passiveEvents = d.passive_events ?? []

  const normalizeLevel = (lvl = {}) => ({
    build_cost: Array.isArray(lvl.build_cost) ? lvl.build_cost : [],
    build_time_s: lvl.build_time_s ?? 0,
    hero_slots: lvl.hero_slots ?? 0,
    recipe_slots: lvl.recipe_slots ?? 0,
    production: lvl.production ?? {},
  })

  const normalizePassiveEvent = (event = {}) => ({
    event_type: event.event_type ?? 'hero_available',
    trigger: event.trigger ?? 'time_interval',
    interval_formula: event.interval_formula ?? '',
  })

  const setMaxLevel = (n) => {
    const count = Math.max(1, Number(n) || 1)
    const next = Array.from({ length: count }, (_, i) => normalizeLevel(levels[i]))
    update({ max_level: count, levels: next })
  }

  const updateLevel = (i, patch) => {
    const next = levels.map((l, idx) => normalizeLevel(idx === i ? { ...l, ...patch } : l))
    update({ levels: next })
  }

  const setHasWorkflows = (value) => {
    update({
      has_workflows: value,
      artisan_slots: value
        ? {
            base_count: d.artisan_slots?.base_count ?? 0,
            max_count: d.artisan_slots?.max_count ?? 0,
            expand_by: d.artisan_slots?.expand_by ?? 'building_upgrade',
          }
        : d.artisan_slots,
    })
  }

  const updateArtisanSlots = (patch) => {
    update({
      artisan_slots: {
        base_count: d.artisan_slots?.base_count ?? 0,
        max_count: d.artisan_slots?.max_count ?? 0,
        expand_by: d.artisan_slots?.expand_by ?? 'building_upgrade',
        ...patch,
      },
    })
  }

  const addPassiveEvent = () => {
    update({
      passive_events: [...passiveEvents, normalizePassiveEvent()],
    })
  }

  const updatePassiveEvent = (index, patch) => {
    update({
      passive_events: passiveEvents.map((event, idx) =>
        idx === index ? normalizePassiveEvent({ ...event, ...patch }) : normalizePassiveEvent(event)
      ),
    })
  }

  const removePassiveEvent = (index) => {
    update({
      passive_events: passiveEvents.filter((_, idx) => idx !== index),
    })
  }

  return (
    <div>
      <Section title="Identity" />
      <Field label="Label" value={d.label} onChange={(v) => update({ label: v })} />
      <Field label="Icon (emoji)" value={d.icon} onChange={(v) => update({ icon: v })} placeholder="🏰" />
      <TextArea label="Description" value={d.description} onChange={(v) => update({ description: v })} rows={2} />

      <Section title="Config" />
      <Field label="Max level" value={d.max_level} onChange={setMaxLevel} type="number" />
      <Toggle label="Crafting station" value={d.is_crafting_station} onChange={(v) => update({ is_crafting_station: v })} />
      <Toggle label="Has workflows" value={Boolean(d.has_workflows)} onChange={setHasWorkflows} />

      {d.has_workflows && (
        <>
          <Section title="Artisan slots" />
          <Field
            label="Base count"
            value={d.artisan_slots?.base_count ?? 0}
            onChange={(v) => updateArtisanSlots({ base_count: Number(v) })}
            type="number"
          />
          <Field
            label="Max count"
            value={d.artisan_slots?.max_count ?? 0}
            onChange={(v) => updateArtisanSlots({ max_count: Number(v) })}
            type="number"
          />
          <Select
            label="Expand by"
            value={d.artisan_slots?.expand_by ?? 'building_upgrade'}
            onChange={(v) => updateArtisanSlots({ expand_by: v })}
            options={ARTISAN_SLOT_EXPAND_OPTIONS}
          />
        </>
      )}

      <Section title="Passive events" />
      {passiveEvents.map((event, index) => (
        <div key={index} style={{ border: '1px solid #2a2a3e', borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
          <Select
            label="Event type"
            value={event.event_type ?? 'hero_available'}
            onChange={(v) => updatePassiveEvent(index, { event_type: v, trigger: 'time_interval' })}
            options={PASSIVE_EVENT_TYPES}
          />
          <Field
            label="Interval formula"
            value={event.interval_formula ?? ''}
            onChange={(v) => updatePassiveEvent(index, { interval_formula: v, trigger: 'time_interval' })}
            placeholder="600"
          />
          <button onClick={() => removePassiveEvent(index)} style={addBtn}>Remove event</button>
        </div>
      ))}
      <button onClick={addPassiveEvent} style={addBtn}>+ passive event</button>

      <Section title="Loot" />
      <SearchableDropdown
        label="Loot table ID"
        value={d.loot_table_id ?? ''}
        onChange={(v) => update({ loot_table_id: v })}
        typeFilter="loot_table"
        placeholder="Search loot tables"
      />

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
  const [open, setOpen] = useState(index === 0)

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

function ProductionEditor({ value, onChange }) {
  const entries = Object.entries(value)
  const add = () => onChange({ ...value, '': 0 })
  const upd = (oldKey, newKey, val) => {
    const next = {}
    entries.forEach(([k, v]) => {
      next[k === oldKey ? newKey : k] = k === oldKey ? val : v
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
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#666680', marginBottom: 4 }}>Production / sec</div>
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
            <Field label={i === 0 ? 'Rate' : ''} value={val} onChange={(v) => upd(key, key, Number(v))} type="number" />
          </div>
          <button onClick={() => rem(key)} style={xBtn}>×</button>
        </div>
      ))}
      <button onClick={add} style={addBtn}>+ resource</button>
    </div>
  )
}

const xBtn = { background: 'none', border: 'none', color: '#555570', cursor: 'pointer', fontSize: 14, padding: '0 2px' }
const addBtn = { fontSize: 10, padding: '3px 8px', background: '#1e1e2e', border: '1px solid #2a2a3e', borderRadius: 4, color: '#666680', cursor: 'pointer' }
