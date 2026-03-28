import { Field, TextArea, Toggle, Section, useNodeUpdater } from './FormPrimitives'

export default function ResourceInspector({ node }) {
  const update = useNodeUpdater(node.id)
  const d = node.data

  return (
    <div>
      <Section title="Identity" />
      <Field label="Label" value={d.label} onChange={(v) => update({ label: v })} />
      <Field label="Icon (emoji)" value={d.icon} onChange={(v) => update({ icon: v })} placeholder="💰" />
      <TextArea label="Description" value={d.description} onChange={(v) => update({ description: v })} rows={2} />

      <Section title="Economy" />
      <Field label="Base income / sec" value={d.base_income} onChange={(v) => update({ base_income: v })} type="number" />
      <Field label="Base cap (0 = unlimited)" value={d.base_cap} onChange={(v) => update({ base_cap: v })} type="number" />
      <Toggle label="Is crafting material" value={d.is_material} onChange={(v) => update({ is_material: v })} />
    </div>
  )
}
