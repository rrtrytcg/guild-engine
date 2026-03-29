import { Field, TextArea, Section, SearchableDropdown, MultiDropdown, useNodeUpdater } from './FormPrimitives'

export default function BuildingUpgradeInspector({ node }) {
  const update = useNodeUpdater(node.id)
  const d = node.data
  const effects = d.effects ?? {}

  const updateEffects = (patch) => {
    const nextEffects = {
      ...effects,
      ...patch,
    }

    update({
      effects: nextEffects,
      unlocks_workflow_ids: nextEffects.unlocks_workflows ?? [],
      artisan_slot_increase: Number(nextEffects.slots_added ?? 0),
    })
  }

  const setBuildingId = (value) => {
    update({
      host_building: value,
      building_id: value,
    })
  }

  const setRequiredBuildingLevel = (value) => {
    const level = Number(value)
    update({
      level,
      required_building_level: level,
    })
  }

  return (
    <div>
      <Section title="Identity" />
      <Field label="Label" value={d.label} onChange={(v) => update({ label: v })} />
      <TextArea label="Description" value={d.description} onChange={(v) => update({ description: v })} rows={2} />

      <Section title="Config" />
      <SearchableDropdown
        label="Building ID"
        value={d.host_building ?? d.building_id ?? ''}
        onChange={setBuildingId}
        typeFilter="building"
        placeholder="Search buildings"
      />
      <Field
        label="Required building level"
        value={d.level ?? d.required_building_level ?? 1}
        onChange={setRequiredBuildingLevel}
        type="number"
      />

      <Section title="Cost" />
      <CostEditor value={d.cost ?? []} onChange={(v) => update({ cost: v })} />

      <Section title="Unlocks" />
      <MultiDropdown
        label="Unlocks workflow IDs"
        values={effects.unlocks_workflows ?? d.unlocks_workflow_ids ?? []}
        onChange={(v) => updateEffects({ unlocks_workflows: v })}
        typeFilter="building_workflow"
        placeholder="Type to search or drop workflows"
      />
      <Field
        label="Artisan slot increase"
        value={effects.slots_added ?? d.artisan_slot_increase ?? 0}
        onChange={(v) => updateEffects({ slots_added: Number(v) })}
        type="number"
      />
    </div>
  )
}

function CostEditor({ value, onChange }) {
  const add = () => onChange([...value, { resource: '', amount: 0 }])
  const upd = (i, patch) => onChange(value.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
  const rem = (i) => onChange(value.filter((_, idx) => idx !== i))

  return (
    <div style={{ marginBottom: 10 }}>
      {value.map((c, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <SearchableDropdown
              label={i === 0 ? 'Resource' : ''}
              value={c.resource ?? ''}
              onChange={(v) => upd(i, { resource: v })}
              typeFilter="resource"
              placeholder="Search resources"
            />
          </div>
          <div style={{ width: 90 }}>
            <Field label={i === 0 ? 'Amount' : ''} value={c.amount ?? 0} onChange={(v) => upd(i, { amount: Number(v) })} type="number" />
          </div>
          <button onClick={() => rem(i)} style={xBtn}>×</button>
        </div>
      ))}
      <button onClick={add} style={addBtn}>+ cost</button>
    </div>
  )
}

const xBtn = { background: 'none', border: 'none', color: '#555570', cursor: 'pointer', fontSize: 14, padding: '0 2px' }
const addBtn = { fontSize: 10, padding: '3px 8px', background: '#1e1e2e', border: '1px solid #2a2a3e', borderRadius: 4, color: '#666680', cursor: 'pointer' }
