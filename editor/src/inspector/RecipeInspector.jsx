import { Field, Section, SearchableDropdown, useNodeUpdater } from './FormPrimitives'

export default function RecipeInspector({ node }) {
  const update = useNodeUpdater(node.id)
  const d = node.data
  const inputs = d.inputs ?? []

  const addInput = () => update({ inputs: [...inputs, { item_id: '', qty: 1 }] })
  const updateInput = (i, patch) =>
    update({ inputs: inputs.map((e, idx) => (idx === i ? { ...e, ...patch } : e)) })
  const removeInput = (i) =>
    update({ inputs: inputs.filter((_, idx) => idx !== i) })

  return (
    <div>
      <Section title="Identity" />
      <Field label="Label" value={d.label} onChange={(v) => update({ label: v })} />

      <Section title="Inputs" />
      {inputs.length === 0 && (
        <p style={{ fontSize: 11, color: '#444460', marginBottom: 10 }}>No ingredients yet.</p>
      )}
      {inputs.map((inp, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <SearchableDropdown
              label={i === 0 ? 'Item ID' : ''}
              value={inp.item_id}
              onChange={(v) => updateInput(i, { item_id: v })}
              typeFilter="item"
              placeholder="Search items"
            />
          </div>
          <div style={{ width: 90 }}>
            <Field label={i === 0 ? 'Qty' : ''} value={inp.qty} onChange={(v) => updateInput(i, { qty: Number(v) })} type="number" />
          </div>
          <button onClick={() => removeInput(i)} style={{ ...xBtn, marginBottom: 13 }}>×</button>
        </div>
      ))}
      <button onClick={addInput} style={addBtn}>+ Add ingredient</button>

      <Section title="Output" />
      <SearchableDropdown
        label="Output item ID"
        value={d.output_item_id}
        onChange={(v) => update({ output_item_id: v })}
        typeFilter="item"
        placeholder="Search items"
      />
      <Field label="Output quantity" value={d.output_qty} onChange={(v) => update({ output_qty: Number(v) })} type="number" />

      <Section title="Crafting" />
      <Field label="Craft time (seconds)" value={d.craft_time_s} onChange={(v) => update({ craft_time_s: Number(v) })} type="number" />
    </div>
  )
}

const xBtn = { background: 'none', border: 'none', color: '#555570', cursor: 'pointer', fontSize: 16, padding: '0 2px' }
const addBtn = { width: '100%', padding: '7px', background: '#1e1e2e', border: '1px dashed #2a2a3e', borderRadius: 7, color: '#666680', fontSize: 12, cursor: 'pointer', marginBottom: 4 }
