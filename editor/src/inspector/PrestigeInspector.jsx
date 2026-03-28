import { useState } from 'react'
import { Field, TextArea, Select, Section, SearchableDropdown, useNodeUpdater } from './FormPrimitives'

const RESET_OPTIONS = ['resources', 'buildings', 'heroes', 'upgrades', 'expeditions', 'factions']
const CONDITION_TYPES = ['resource_gte', 'building_level', 'act_reached', 'faction_rep_gte', 'upgrade_owned', 'hero_count_gte', 'prestige_count_gte']
const CONDITION_TARGET_FILTERS = {
  resource_gte: 'resource',
  building_level: 'building',
  act_reached: 'act',
  faction_rep_gte: 'faction',
  upgrade_owned: 'upgrade',
}

export default function PrestigeInspector({ node }) {
  const update = useNodeUpdater(node.id)
  const d = node.data
  const bonuses = d.bonuses ?? []
  const conditions = d.trigger_conditions ?? []
  const resets = d.resets ?? []

  const toggleReset = (cat) => {
    const next = resets.includes(cat) ? resets.filter((r) => r !== cat) : [...resets, cat]
    update({ resets: next })
  }

  const addCondition = () =>
    update({ trigger_conditions: [...conditions, { type: 'act_reached', target_id: '', value: 1 }] })

  const updateCondition = (i, patch) =>
    update({ trigger_conditions: conditions.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) })

  const removeCondition = (i) =>
    update({ trigger_conditions: conditions.filter((_, idx) => idx !== i) })

  const addBonus = () =>
    update({ bonuses: [...bonuses, { id: `bonus-${Date.now()}`, label: 'New bonus', cost: 1, max_tier: 5, effect: {} }] })

  const updateBonus = (i, patch) =>
    update({ bonuses: bonuses.map((b, idx) => (idx === i ? { ...b, ...patch } : b)) })

  const removeBonus = (i) =>
    update({ bonuses: bonuses.filter((_, idx) => idx !== i) })

  return (
    <div>
      <Section title="Identity" />
      <Field label="Label" value={d.label} onChange={(v) => update({ label: v })} />
      <TextArea label="Description" value={d.description} onChange={(v) => update({ description: v })} rows={2} />

      <Section title="Prestige currency" />
      <SearchableDropdown
        label="Currency resource ID"
        value={d.currency_id}
        onChange={(v) => update({ currency_id: v })}
        typeFilter="resource"
        placeholder="Search resources"
      />
      <Field label="Currency formula (JS)" value={d.currency_formula} onChange={(v) => update({ currency_formula: v })} placeholder="Math.floor(Math.sqrt(gold / 1000))" />

      <Section title="Trigger conditions (all must pass)" />
      {conditions.map((cond, i) => (
        <div key={i} style={{ background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: '#555570', fontWeight: 700 }}>CONDITION {i + 1}</span>
            <button onClick={() => removeCondition(i)} style={xBtn}>× remove</button>
          </div>
          <Select label="Type" value={cond.type} onChange={(v) => updateCondition(i, { type: v })} options={CONDITION_TYPES} />
          <SearchableDropdown
            label="Target ID"
            value={cond.target_id ?? ''}
            onChange={(v) => updateCondition(i, { target_id: v })}
            typeFilter={CONDITION_TARGET_FILTERS[cond.type] ?? null}
            placeholder="Search node IDs"
          />
          <Field label="Value" value={cond.value ?? 0} onChange={(v) => updateCondition(i, { value: Number(v) })} type="number" />
        </div>
      ))}
      <button onClick={addCondition} style={addBtn}>+ Add condition</button>

      <Section title="What resets on prestige" />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {RESET_OPTIONS.map((cat) => {
          const active = resets.includes(cat)
          return (
            <button key={cat} onClick={() => toggleReset(cat)} style={{
              padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
              border: active ? '1px solid #D4537E' : '1px solid #2a2a3e',
              background: active ? '#D4537E22' : '#1e1e2e',
              color: active ? '#D4537E' : '#666680',
              fontWeight: active ? 600 : 400,
            }}>
              {cat}
            </button>
          )
        })}
      </div>

      <Section title="Prestige bonuses" />
      {bonuses.map((bonus, i) => (
        <BonusRow key={i} index={i} bonus={bonus} onChange={(p) => updateBonus(i, p)} onRemove={() => removeBonus(i)} />
      ))}
      <button onClick={addBonus} style={addBtn}>+ Add bonus</button>
    </div>
  )
}

function BonusRow({ index, bonus, onChange, onRemove }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ border: '1px solid #2a2a3e', borderRadius: 8, marginBottom: 6, overflow: 'hidden' }}>
      <div onClick={() => setOpen((o) => !o)} style={{ padding: '7px 10px', background: '#1a1a2e', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: '#c0c0d8' }}>{bonus.label || `Bonus ${index + 1}`}</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={(e) => { e.stopPropagation(); onRemove() }} style={xBtn}>× remove</button>
          <span style={{ fontSize: 11, color: '#444460' }}>{open ? '▲' : '▼'}</span>
        </div>
      </div>
      {open && (
        <div style={{ padding: '8px 10px' }}>
          <Field label="Label" value={bonus.label} onChange={(v) => onChange({ label: v })} />
          <Field label="Cost (prestige currency per tier)" value={bonus.cost} onChange={(v) => onChange({ cost: Number(v) })} type="number" />
          <Field label="Max tier" value={bonus.max_tier} onChange={(v) => onChange({ max_tier: Number(v) })} type="number" />
          <div style={{ fontSize: 10, color: '#444460', marginTop: 4 }}>Effect - add stat keys like "resource_income_multiplier.gold: 0.1"</div>
        </div>
      )}
    </div>
  )
}

const xBtn = { background: 'none', border: 'none', color: '#555570', cursor: 'pointer', fontSize: 11 }
const addBtn = { width: '100%', padding: '7px', background: '#1e1e2e', border: '1px dashed #2a2a3e', borderRadius: 7, color: '#666680', fontSize: 12, cursor: 'pointer' }
