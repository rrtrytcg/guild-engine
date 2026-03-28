import { Field, TextArea, Select, Section, StatBlock, useNodeUpdater } from './FormPrimitives'

const TRIGGERS = [
  'passive',
  'on_combat_start',
  'on_hit',
  'on_kill',
  'on_expedition_complete',
  'on_status_applied',
]

const STATUS_OPTIONS = ['none', 'injured', 'inspired', 'cursed']

export default function AbilityInspector({ node }) {
  const update = useNodeUpdater(node.id)
  const d = node.data
  const effect = d.effect ?? {}

  const updateEffect = (patch) => update({ effect: { ...effect, ...patch } })

  return (
    <div>
      <Section title="Identity" />
      <Field label="Label" value={d.label} onChange={(v) => update({ label: v })} />
      <Field label="Icon (emoji)" value={d.icon} onChange={(v) => update({ icon: v })} placeholder="✨" />
      <TextArea label="Description" value={d.description} onChange={(v) => update({ description: v })} rows={2} />

      <Section title="Trigger" />
      <Select label="Trigger" value={d.trigger} onChange={(v) => update({ trigger: v })} options={TRIGGERS} />
      <Field label="Unlock at level" value={d.unlock_level} onChange={(v) => update({ unlock_level: Number(v) })} type="number" />

      <Section title="Effect" />
      <StatBlock label="Stat modifiers" value={effect.stat_modifier ?? {}} onChange={(v) => updateEffect({ stat_modifier: v })} />
      <StatBlock label="Resource delta" value={effect.resource_delta ?? {}} onChange={(v) => updateEffect({ resource_delta: v })} />
      <Select
        label="Apply status"
        value={effect.apply_status ?? 'none'}
        onChange={(v) => updateEffect({ apply_status: v === 'none' ? undefined : v })}
        options={STATUS_OPTIONS}
      />
      <Field label="Loot bonus %" value={effect.loot_bonus_pct ?? 0} onChange={(v) => updateEffect({ loot_bonus_pct: Number(v) })} type="number" />
      <Field label="Expedition success bonus (0–1)" value={effect.success_bonus ?? 0} onChange={(v) => updateEffect({ success_bonus: Number(v) })} type="number" />
    </div>
  )
}
