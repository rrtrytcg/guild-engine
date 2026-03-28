import { Field, TextArea, Section, useNodeUpdater } from './FormPrimitives'
import React from 'react'

export default function FactionInspector({ node }) {
  const update = useNodeUpdater(node.id)
  const d = node.data
  const tiers = d.rep_tiers ?? []

  const addTier = () =>
    update({
      rep_tiers: [...tiers, {
        threshold: (tiers[tiers.length - 1]?.threshold ?? 0) + 1000,
        label: 'New tier',
        unlock_node_ids: [],
        discount_pct: 0,
      }],
    })

  const updateTier = (i, patch) =>
    update({ rep_tiers: tiers.map((t, idx) => (idx === i ? { ...t, ...patch } : t)) })

  const removeTier = (i) =>
    update({ rep_tiers: tiers.filter((_, idx) => idx !== i) })

  return (
    <div>
      <Section title="Identity" />
      <Field label="Label" value={d.label} onChange={(v) => update({ label: v })} />
      <Field label="Icon (emoji)" value={d.icon} onChange={(v) => update({ icon: v })} placeholder="⚜️" />
      <TextArea label="Description" value={d.description} onChange={(v) => update({ description: v })} rows={2} />
      <Field label="Starting reputation" value={d.starting_rep} onChange={(v) => update({ starting_rep: Number(v) })} type="number" />

      <Section title="Reputation tiers" />
      <p style={{ fontSize: 11, color: '#444460', marginBottom: 8 }}>Ordered by threshold. Reaching a threshold unlocks that tier's content.</p>
      {tiers.length === 0 && (
        <p style={{ fontSize: 11, color: '#444460', marginBottom: 8 }}>No tiers yet.</p>
      )}
      {tiers.map((tier, i) => (
        <TierRow key={i} index={i} tier={tier} onChange={(p) => updateTier(i, p)} onRemove={() => removeTier(i)} />
      ))}
      <button onClick={addTier} style={addBtn}>+ Add tier</button>
    </div>
  )
}

function TierRow({ index, tier, onChange, onRemove }) {
  const [open, setOpen] = React.useState(index === 0)
  return (
    <div style={{ border: '1px solid #2a2a3e', borderRadius: 8, marginBottom: 6, overflow: 'hidden' }}>
      <div onClick={() => setOpen((o) => !o)} style={{ padding: '7px 10px', background: '#1a1a2e', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: '#c0c0d8' }}>{tier.label || `Tier ${index + 1}`} <span style={{ color: '#555570', fontSize: 10 }}>({tier.threshold} rep)</span></span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={(e) => { e.stopPropagation(); onRemove() }} style={xBtn}>× remove</button>
          <span style={{ fontSize: 11, color: '#444460' }}>{open ? '▲' : '▼'}</span>
        </div>
      </div>
      {open && (
        <div style={{ padding: '8px 10px' }}>
          <Field label="Tier label" value={tier.label} onChange={(v) => onChange({ label: v })} />
          <Field label="Rep threshold" value={tier.threshold} onChange={(v) => onChange({ threshold: Number(v) })} type="number" />
          <Field label="Shop discount %" value={tier.discount_pct ?? 0} onChange={(v) => onChange({ discount_pct: Number(v) })} type="number" />
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#666680', marginBottom: 4 }}>Unlock node IDs (comma-separated)</div>
          <input
            value={(tier.unlock_node_ids ?? []).join(', ')}
            onChange={(e) => onChange({ unlock_node_ids: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
            placeholder="building-123, expedition-456"
            style={{ ...inp, width: '100%', marginBottom: 10 }}
          />
        </div>
      )}
    </div>
  )
}

const xBtn = { background: 'none', border: 'none', color: '#555570', cursor: 'pointer', fontSize: 11 }
const addBtn = { width: '100%', padding: '7px', background: '#1e1e2e', border: '1px dashed #2a2a3e', borderRadius: 7, color: '#666680', fontSize: 12, cursor: 'pointer' }
const inp = { background: '#1e1e2e', border: '1px solid #2a2a3e', borderRadius: 6, padding: '4px 6px', color: '#e0e0f0', fontSize: 12, outline: 'none' }
