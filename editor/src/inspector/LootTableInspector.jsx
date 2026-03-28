import { Field, Section, Toggle, useNodeUpdater } from './FormPrimitives'

export default function LootTableInspector({ node }) {
  const update = useNodeUpdater(node.id)
  const d = node.data
  const entries = d.entries ?? []

  const addEntry = () =>
    update({ entries: [...entries, { item_id: '', weight: 10, min_qty: 1, max_qty: 1, guaranteed: false }] })

  const updateEntry = (i, patch) =>
    update({ entries: entries.map((e, idx) => (idx === i ? { ...e, ...patch } : e)) })

  const removeEntry = (i) =>
    update({ entries: entries.filter((_, idx) => idx !== i) })

  return (
    <div>
      <Section title="Identity" />
      <Field label="Label" value={d.label} onChange={(v) => update({ label: v })} />

      <Section title="Roll config" />
      <Field label="Rolls per drop event" value={d.rolls} onChange={(v) => update({ rolls: v })} type="number" />

      <Section title="Drop entries" />
      {entries.length === 0 && (
        <p style={{ fontSize: 11, color: '#444460', marginBottom: 10 }}>No entries yet. Add one below.</p>
      )}
      {entries.map((entry, i) => (
        <div key={i} style={{ background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 8, padding: '8px 10px', marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 10, color: '#555570', fontWeight: 700 }}>ENTRY {i + 1}</span>
            <button onClick={() => removeEntry(i)} style={xBtn}>× remove</button>
          </div>
          <Field label="Item ID" value={entry.item_id} onChange={(v) => updateEntry(i, { item_id: v })} placeholder="item-123" />
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <Field label="Weight" value={entry.weight} onChange={(v) => updateEntry(i, { weight: Number(v) })} type="number" />
            </div>
            <div style={{ flex: 1 }}>
              <Field label="Min qty" value={entry.min_qty} onChange={(v) => updateEntry(i, { min_qty: Number(v) })} type="number" />
            </div>
            <div style={{ flex: 1 }}>
              <Field label="Max qty" value={entry.max_qty} onChange={(v) => updateEntry(i, { max_qty: Number(v) })} type="number" />
            </div>
          </div>
          <Toggle label="Guaranteed drop" value={entry.guaranteed} onChange={(v) => updateEntry(i, { guaranteed: v })} />
        </div>
      ))}
      <button onClick={addEntry} style={addBtn}>+ Add entry</button>
    </div>
  )
}

const xBtn = { background: 'none', border: 'none', color: '#555570', cursor: 'pointer', fontSize: 11 }
const addBtn = { width: '100%', padding: '7px', background: '#1e1e2e', border: '1px dashed #2a2a3e', borderRadius: 7, color: '#666680', fontSize: 12, cursor: 'pointer', marginTop: 2 }
