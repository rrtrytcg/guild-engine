import { useState } from 'react'
import { generateId } from '../utils/ids'
import {
  Field,
  TextArea,
  Section,
  Toggle,
  Select,
  SearchableDropdown,
  MultiDropdown,
  useNodeUpdater,
} from './FormPrimitives'

const ON_OPTIONS = ['any', 'success', 'dominant']

export default function ExpeditionInspector({ node }) {
  const update = useNodeUpdater(node.id)
  const d = node.data
  const events = d.events ?? []
  const resourceRewards = d.resource_rewards ?? []
  const factionRewards = d.faction_rewards ?? []

  const addEvent = () =>
    update({
      events: [
        ...events,
        {
          id: generateId('evt'),
          label: 'New event',
          trigger_chance: 0.3,
          choices: [{ label: 'Continue', outcome: { log_message: 'The party presses on.' } }],
        },
      ],
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
      <Field label="Level" value={d.level ?? 1} onChange={(v) => update({ level: Number(v) })} type="number" />
      <Field label="Duration (seconds)" value={d.duration_s} onChange={(v) => update({ duration_s: Number(v) })} type="number" />
      <Field label="Party size" value={d.party_size} onChange={(v) => update({ party_size: Number(v) })} type="number" />
      <Field label="Enemy ATK" value={d.enemy_atk ?? 10} onChange={(v) => update({ enemy_atk: Number(v) })} type="number" />
      <Field label="Enemy HP" value={d.enemy_hp ?? 100} onChange={(v) => update({ enemy_hp: Number(v) })} type="number" />
      <Field label="Curse chance (0–1)" value={d.curse_chance ?? 0} onChange={(v) => update({ curse_chance: Number(v) })} type="number" />

      <BaseXpField
        value={d.base_xp}
        level={Number(d.level ?? 1)}
        onChange={(value) => update({ base_xp: value })}
      />

      <Section title="Loot" />
      <SearchableDropdown
        label="Loot table ID"
        value={d.loot_table_id}
        onChange={(v) => update({ loot_table_id: v })}
        typeFilter="loot_table"
        placeholder="Search loot tables"
      />
      <SearchableDropdown
        label="Fail loot table ID (optional)"
        value={d.fail_loot_table_id ?? ''}
        onChange={(v) => update({ fail_loot_table_id: v })}
        typeFilter="loot_table"
        placeholder="Search loot tables"
      />

      <Section title="Entry cost" />
      <CostEditor value={d.entry_cost ?? []} onChange={(v) => update({ entry_cost: v })} />

      <Section title="Rewards" />
      <RewardList
        title="Resource rewards"
        entries={resourceRewards}
        idField="resource_id"
        idLabel="Resource"
        idTypeFilter="resource"
        amountField="amount"
        amountLabel="Amount"
        onField="on"
        onChange={(next) => update({ resource_rewards: next })}
        defaultEntry={{ resource_id: '', amount: 0, on: 'success' }}
      />
      <RewardList
        title="Faction rewards"
        entries={factionRewards}
        idField="faction_id"
        idLabel="Faction"
        idTypeFilter="faction"
        amountField="rep"
        amountLabel="Rep"
        onField="on"
        onChange={(next) => update({ faction_rewards: next })}
        defaultEntry={{ faction_id: '', rep: 0, on: 'success' }}
      />

      <Section title="Unlocks" />
      <MultiDropdown
        label="On success unlock"
        values={d.on_success_unlock ?? []}
        onChange={(v) => update({ on_success_unlock: v })}
        typeFilter={null}
        placeholder="Search all nodes"
      />

      <Section title="Mid-run events" />
      {events.map((evt, i) => (
        <EventRow key={i} index={i} evt={evt} onChange={(p) => updateEvent(i, p)} onRemove={() => removeEvent(i)} />
      ))}
      <button onClick={addEvent} style={addBtn}>+ Add event</button>
    </div>
  )
}

function BaseXpField({ value, level, onChange }) {
  const auto = value === null || value === undefined

  return (
    <div style={{ marginBottom: 12 }}>
      <Toggle
        label="Auto base XP (level × 15)"
        value={auto}
        onChange={(next) => onChange(next ? null : (value ?? level * 15))}
      />
      {!auto && (
        <Field
          label="Base XP override"
          value={value ?? 0}
          onChange={(v) => onChange(Number(v))}
          type="number"
        />
      )}
      <div style={{ fontSize: 10, color: '#555570', marginTop: -4 }}>
        Null uses level × 15. Set 0 for explicit zero XP.
      </div>
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
          <button onClick={() => rem(i)} style={{ ...xBtn, marginBottom: 13 }}>×</button>
        </div>
      ))}
      <button onClick={add} style={smallAddBtn}>+ cost</button>
    </div>
  )
}

function RewardList({
  title,
  entries,
  idField,
  idLabel,
  idTypeFilter,
  amountField,
  amountLabel,
  onField,
  onChange,
  defaultEntry,
}) {
  const add = () => onChange([...entries, defaultEntry])
  const upd = (i, patch) => onChange(entries.map((entry, idx) => (idx === i ? { ...entry, ...patch } : entry)))
  const rem = (i) => onChange(entries.filter((_, idx) => idx !== i))

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#666680', marginBottom: 6 }}>
        {title}
      </div>
      {entries.length === 0 && (
        <p style={{ fontSize: 11, color: '#444460', marginBottom: 8 }}>No entries yet.</p>
      )}
      {entries.map((entry, i) => (
        <div key={i} style={{ background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 10, color: '#555570', fontWeight: 700 }}>{title.toUpperCase()} {i + 1}</span>
            <button onClick={() => rem(i)} style={xBtn}>× remove</button>
          </div>
          <SearchableDropdown
            label={idLabel}
            value={entry[idField] ?? ''}
            onChange={(v) => upd(i, { [idField]: v })}
            typeFilter={idTypeFilter}
            placeholder={`Search ${idLabel.toLowerCase()}s`}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <Field
                label={amountLabel}
                value={entry[amountField] ?? 0}
                onChange={(v) => upd(i, { [amountField]: Number(v) })}
                type="number"
              />
            </div>
            <div style={{ width: 120 }}>
              <Select
                label="On"
                value={entry[onField] ?? 'success'}
                onChange={(v) => upd(i, { [onField]: v })}
                options={ON_OPTIONS}
              />
            </div>
          </div>
        </div>
      ))}
      <button onClick={add} style={addBtn}>+ Add {title.slice(0, -1).toLowerCase()}</button>
    </div>
  )
}

function EventRow({ index, evt, onChange, onRemove }) {
  const [open, setOpen] = useState(false)
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

const xBtn = { background: 'none', border: 'none', color: '#555570', cursor: 'pointer', fontSize: 11 }
const addBtn = { width: '100%', padding: '7px', background: '#1e1e2e', border: '1px dashed #2a2a3e', borderRadius: 7, color: '#666680', fontSize: 12, cursor: 'pointer' }
const smallAddBtn = { fontSize: 10, padding: '3px 8px', background: '#1e1e2e', border: '1px solid #2a2a3e', borderRadius: 4, color: '#666680', cursor: 'pointer' }
