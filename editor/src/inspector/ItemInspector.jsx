import { Field, TextArea, Select, Section, StatBlock, useNodeUpdater } from './FormPrimitives'

const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary']
const SLOTS = ['weapon', 'armor', 'accessory', 'relic']
const ITEM_TYPES = ['equipment', 'material', 'consumable']
const BUFF_TYPES = ['party', 'hero', 'hero_class']

export default function ItemInspector({ node }) {
  const update = useNodeUpdater(node.id)
  const d = node.data
  const itemType = d.item_type ?? d.subtype ?? 'equipment'
  const isEquipment = itemType === 'equipment'
  const isConsumable = itemType === 'consumable'
  const consumableConfig = normalizeConsumableConfig(d.consumable_config)

  const setItemType = (value) => {
    const nextPatch = {
      item_type: value,
      subtype: value === 'equipment' ? 'equipment' : 'material',
    }

    if (value === 'consumable') {
      const normalized = normalizeConsumableConfig(d.consumable_config)
      const stackValue = Number(d.stack_max ?? d.stack_limit ?? 1)
      nextPatch.consumable_config = {
        ...normalized,
        duration_value: Number(normalized.duration_expeditions ?? normalized.duration_value ?? 1),
      }
      nextPatch.stack_max = stackValue
      nextPatch.stack_limit = stackValue
    }

    update(nextPatch)
  }

  const updateConsumableConfig = (patch) => {
    const next = normalizeConsumableConfig({ ...consumableConfig, ...patch })
    update({ consumable_config: next })
  }

  const setConsumableStackMax = (value) => {
    const amount = Number(value)
    update({
      stack_max: amount,
      stack_limit: amount,
    })
  }

  return (
    <div>
      <Section title="Identity" />
      <Field label="Label" value={d.label} onChange={(v) => update({ label: v })} />
      <Field label="Icon (emoji)" value={d.icon} onChange={(v) => update({ icon: v })} placeholder="🗡️" />
      <TextArea label="Description" value={d.description} onChange={(v) => update({ description: v })} rows={2} />

      <Section title="Classification" />
      <Select label="Item type" value={itemType} onChange={setItemType} options={ITEM_TYPES} />
      <Select label="Rarity" value={d.rarity} onChange={(v) => update({ rarity: v })} options={RARITIES} />

      {!isConsumable && (
        <Field
          label="Stack limit"
          value={d.stack_limit ?? d.stack_max ?? 1}
          onChange={(v) => update({ stack_limit: Number(v), stack_max: Number(v) })}
          type="number"
        />
      )}

      {isEquipment && (
        <>
          <Section title="Equipment" />
          <Select label="Slot" value={d.slot} onChange={(v) => update({ slot: v })} options={SLOTS} />
          <StatBlock label="Stat modifiers" value={d.stat_modifiers ?? {}} onChange={(v) => update({ stat_modifiers: v })} />
        </>
      )}

      {isConsumable && (
        <>
          <Section title="Consumable config" />
          <Select
            label="Buff type"
            value={consumableConfig.buff_type ?? 'party'}
            onChange={(v) => updateConsumableConfig({ buff_type: v, apply_scope: v })}
            options={BUFF_TYPES}
          />
          <StatBlock
            label="Stat modifiers"
            value={consumableConfig.stat_modifiers ?? {}}
            onChange={(v) => updateConsumableConfig({ stat_modifiers: v })}
          />
          <Field
            label="Duration expeditions"
            value={consumableConfig.duration_expeditions ?? 1}
            onChange={(v) => updateConsumableConfig({ duration_expeditions: Number(v), duration_value: Number(v) })}
            type="number"
          />
          <Field
            label="Stack max"
            value={d.stack_max ?? d.stack_limit ?? 1}
            onChange={setConsumableStackMax}
            type="number"
          />
        </>
      )}
    </div>
  )
}

function normalizeConsumableConfig(config = {}) {
  const statModifiers = normalizeStatModifiers(config)
  const entries = Object.entries(statModifiers)
  const [firstStat, firstValue] = entries[0] ?? ['attack', 0]
  const hasStatModifiers = entries.length > 0

  return {
    ...config,
    buff_type: config.buff_type ?? config.apply_scope ?? 'party',
    stat_modifiers: statModifiers,
    duration_expeditions: Number(config.duration_expeditions ?? config.duration_value ?? 1),
    apply_scope: config.apply_scope ?? config.buff_type ?? 'party',
    duration_type: config.duration_type ?? 'expedition_count',
    duration_value: Number(config.duration_expeditions ?? config.duration_value ?? 1),
    effect: {
      stat: hasStatModifiers ? firstStat : (config.effect?.stat ?? firstStat),
      operation: config.effect?.operation ?? 'add',
      value: hasStatModifiers ? Number(firstValue ?? 0) : (config.effect?.value ?? Number(firstValue ?? 0)),
    },
    stack_behavior: config.stack_behavior ?? 'refresh',
    buff_slot_cost: config.buff_slot_cost ?? 1,
  }
}

function normalizeStatModifiers(config = {}) {
  if (config.stat_modifiers && Object.keys(config.stat_modifiers).length > 0) {
    return config.stat_modifiers
  }
  if (config.effect?.stat) {
    return { [config.effect.stat]: Number(config.effect.value ?? 0) }
  }
  return {}
}
