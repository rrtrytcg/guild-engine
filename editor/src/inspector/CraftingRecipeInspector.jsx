import { Field, Section, SearchableDropdown, TextArea, Toggle, useNodeUpdater } from './FormPrimitives'

export default function CraftingRecipeInspector({ node }) {
  const update = useNodeUpdater(node.id)
  const d = node.data
  const inputs = Array.isArray(d.inputs) ? d.inputs : []

  const addInput = () => update({ inputs: [...inputs, { resource: '', amount: 1 }] })
  const updateInput = (index, patch) =>
    update({
      inputs: inputs.map((entry, idx) => (idx === index ? { ...entry, ...patch } : entry)),
    })
  const removeInput = (index) =>
    update({
      inputs: inputs.filter((_, idx) => idx !== index),
    })

  return (
    <div>
      <Section title="Identity" />
      <Field label="Label" value={d.label} onChange={(v) => update({ label: v })} />
      <TextArea label="Description" value={d.description} onChange={(v) => update({ description: v })} rows={2} />

      <Section title="Inputs" />
      {inputs.length === 0 && (
        <p style={{ fontSize: 11, color: '#444460', marginBottom: 10 }}>No resource costs yet.</p>
      )}
      {inputs.map((input, index) => (
        <div key={index} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <SearchableDropdown
              label={index === 0 ? 'Resource' : ''}
              value={input.resource ?? ''}
              onChange={(v) => updateInput(index, { resource: v })}
              typeFilter="resource"
              placeholder="Search resources"
            />
          </div>
          <div style={{ width: 96 }}>
            <Field
              label={index === 0 ? 'Amount' : ''}
              value={input.amount ?? 1}
              onChange={(v) => updateInput(index, { amount: Number(v) })}
              type="number"
            />
          </div>
          <button onClick={() => removeInput(index)} style={{ ...xBtn, marginBottom: 13 }}>x</button>
        </div>
      ))}
      <button onClick={addInput} style={addBtn}>+ Add cost</button>

      <Section title="Result" />
      <SearchableDropdown
        label="Output item"
        value={d.output_item ?? ''}
        onChange={(v) => update({ output_item: v })}
        typeFilter="item"
        placeholder="Search items"
      />
      <Field
        label="Output quantity"
        value={d.output_quantity ?? 1}
        onChange={(v) => update({ output_quantity: Number(v) })}
        type="number"
      />

      <Section title="Unlocks" />
      <SearchableDropdown
        label="Required workflow"
        value={d.required_workflow ?? ''}
        onChange={(v) => update({ required_workflow: v })}
        typeFilter="building_workflow"
        placeholder="Search workflows"
      />
      <Field
        label="Required building level"
        value={d.required_building_level ?? 1}
        onChange={(v) => update({ required_building_level: Number(v) })}
        type="number"
      />
      <Toggle
        label="Visible"
        value={d.visible !== false}
        onChange={(v) => update({ visible: v })}
      />
    </div>
  )
}

const xBtn = { background: 'none', border: 'none', color: '#555570', cursor: 'pointer', fontSize: 16, padding: '0 2px' }
const addBtn = { width: '100%', padding: '7px', background: '#1e1e2e', border: '1px dashed #2a2a3e', borderRadius: 7, color: '#666680', fontSize: 12, cursor: 'pointer', marginBottom: 4 }
