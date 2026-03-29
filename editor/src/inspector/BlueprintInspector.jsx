import useStore from '../store/useStore'
import { Field, TextArea, Section, MultiDropdown, useNodeUpdater } from './FormPrimitives'

export default function BlueprintInspector({ node }) {
  const update = useNodeUpdater(node.id)
  const exportBlueprint = useStore((s) => s.exportBlueprint)
  const d = node.data

  return (
    <div>
      <Section title="Identity" />
      <Field label="Label" value={d.label} onChange={(v) => update({ label: v })} />
      <TextArea label="Description" value={d.description ?? ''} onChange={(v) => update({ description: v })} rows={2} />

      <Section title="Blueprint" />
      <Field
        label="Schema version required"
        value={d.requires_schema_version ?? '1.2.0'}
        onChange={(v) => update({ requires_schema_version: v })}
      />
      <MultiDropdown
        label="Node IDs included"
        values={d.node_ids ?? []}
        onChange={(v) => update({ node_ids: v })}
        placeholder="Type to search or drop nodes"
      />

      <Section title="Export" />
      <button onClick={() => exportBlueprint(node.id)} style={exportBtn}>
        Export blueprint
      </button>
    </div>
  )
}

const exportBtn = {
  fontSize: 11,
  padding: '6px 10px',
  background: '#1e1e2e',
  border: '1px solid #2a2a3e',
  borderRadius: 6,
  color: '#c0c0d8',
  cursor: 'pointer',
}
