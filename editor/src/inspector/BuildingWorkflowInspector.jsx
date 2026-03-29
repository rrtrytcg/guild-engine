import { Field, TextArea, Select, Toggle, Section, SearchableDropdown, useNodeUpdater } from './FormPrimitives'

const BEHAVIOR_OPTIONS = ['consume_item', 'consume_resource', 'produce_resource', 'modify_item', 'recruit_hero']
const WORKFLOW_MODE_OPTIONS = ['queued', 'passive']
const OUTPUT_TYPE_OPTIONS = ['resource', 'item', 'consumable', 'world_effect', 'hero_instance']
const FAILURE_BEHAVIOR_OPTIONS = ['consume_inputs_no_output', 'partial_refund', 'reset_progress_refund_inputs']
const CRIT_BEHAVIOR_OPTIONS = ['double_output', 'quality_upgrade', 'rarity_upgrade', 'breakthrough', 'extend_duration']
const WORLD_EFFECT_OPTIONS = ['unlock_node', 'apply_modifier', 'trigger_event']
const MODIFIER_OPERATION_OPTIONS = ['multiply', 'add', 'set']

export default function BuildingWorkflowInspector({ node }) {
  const update = useNodeUpdater(node.id)
  const d = node.data
  const inputRules = d.inputs ?? d.input_rules ?? []
  const outputRules = d.output_rules ?? []
  const successTable = normalizeSuccessTable(d.success_table)
  const streakBonus = d.streak_bonus ? normalizeStreakBonus(d.streak_bonus) : null
  const momentumConfig = d.momentum_config ? normalizeMomentumConfig(d.momentum_config) : null

  const updateInputRules = (nextInputs) => {
    update({ inputs: nextInputs, input_rules: nextInputs })
  }

  const addInputRule = () => {
    updateInputRules([...inputRules, { resource: '', amount: 0 }])
  }

  const updateInputRule = (index, patch) => {
    updateInputRules(
      inputRules.map((rule, idx) => (idx === index ? { ...rule, ...patch } : rule))
    )
  }

  const removeInputRule = (index) => {
    updateInputRules(inputRules.filter((_, idx) => idx !== index))
  }

  const updateOutputRules = (nextRules) => {
    update({ output_rules: nextRules })
  }

  const addOutputRule = () => {
    updateOutputRules([...outputRules, normalizeOutputRule()])
  }

  const updateOutputRule = (index, patch) => {
    updateOutputRules(
      outputRules.map((rule, idx) => (idx === index ? normalizeOutputRule({ ...rule, ...patch }) : normalizeOutputRule(rule)))
    )
  }

  const removeOutputRule = (index) => {
    updateOutputRules(outputRules.filter((_, idx) => idx !== index))
  }

  const updateSuccessTable = (patch) => {
    const nextSuccessTable = normalizeSuccessTable({
      ...successTable,
      ...patch,
    })
    update({
      success_table: nextSuccessTable,
      xp_on_complete: Number(nextSuccessTable.xp_on_complete ?? 0),
    })
  }

  const toggleStreakBonus = (enabled) => {
    update({
      streak_bonus: enabled ? normalizeStreakBonus(d.streak_bonus) : undefined,
    })
  }

  const updateStreakBonus = (patch) => {
    update({
      streak_bonus: normalizeStreakBonus({
        ...d.streak_bonus,
        ...patch,
      }),
    })
  }

  const toggleMomentum = (enabled) => {
    update({
      momentum_config: enabled ? normalizeMomentumConfig(d.momentum_config) : undefined,
    })
  }

  const updateMomentum = (patch) => {
    update({
      momentum_config: normalizeMomentumConfig({
        ...d.momentum_config,
        ...patch,
      }),
    })
  }

  const addMomentumThreshold = () => {
    updateMomentum({
      thresholds: [...(momentumConfig?.thresholds ?? []), { momentum: 0, label: '', speed_bonus: 0, crit_bonus: 0 }],
    })
  }

  const updateMomentumThreshold = (index, patch) => {
    updateMomentum({
      thresholds: (momentumConfig?.thresholds ?? []).map((threshold, idx) =>
        idx === index ? { ...threshold, ...patch } : threshold
      ),
    })
  }

  const removeMomentumThreshold = (index) => {
    updateMomentum({
      thresholds: (momentumConfig?.thresholds ?? []).filter((_, idx) => idx !== index),
    })
  }

  return (
    <div>
      <Section title="Identity" />
      <Field label="Label" value={d.label} onChange={(v) => update({ label: v })} />
      <TextArea label="Description" value={d.description} onChange={(v) => update({ description: v })} rows={2} />

      <Section title="Workflow" />
      <SearchableDropdown
        label="Host building"
        value={d.host_building ?? ''}
        onChange={(v) => update({ host_building: v })}
        typeFilter="building"
        placeholder="Search buildings"
      />
      <Select label="Behavior" value={d.behavior ?? 'consume_resource'} onChange={(v) => update({ behavior: v })} options={BEHAVIOR_OPTIONS} />
      <Select label="Workflow mode" value={d.workflow_mode ?? 'queued'} onChange={(v) => update({ workflow_mode: v })} options={WORKFLOW_MODE_OPTIONS} />
      <Field label="Action type" value={d.action_type ?? ''} onChange={(v) => update({ action_type: v })} placeholder="brew" />
      <Field
        label="Base duration ticks"
        value={d.duration_base_ticks ?? d.base_duration_ticks ?? 1}
        onChange={(v) => update({ duration_base_ticks: Number(v), base_duration_ticks: Number(v) })}
        type="number"
      />
      <Field
        label="XP on complete"
        value={d.xp_on_complete ?? d.success_table?.xp_on_complete ?? 0}
        onChange={(v) => updateSuccessTable({ xp_on_complete: Number(v) })}
        type="number"
      />
      {d.workflow_mode === 'passive' && (
        <Field
          label="Total ticks required"
          value={d.total_ticks_required ?? 0}
          onChange={(v) => update({ total_ticks_required: Number(v) })}
          type="number"
        />
      )}

      <Section title="Input rules" />
      {inputRules.map((rule, index) => (
        <div key={index} style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <SearchableDropdown
              label={index === 0 ? 'Resource' : ''}
              value={rule.resource ?? ''}
              onChange={(v) => updateInputRule(index, { resource: v })}
              typeFilter="resource"
              placeholder="Search resources"
            />
          </div>
          <div style={{ width: 90 }}>
            <Field
              label={index === 0 ? 'Amount' : ''}
              value={rule.amount ?? 0}
              onChange={(v) => updateInputRule(index, { amount: v })}
              placeholder="1"
            />
          </div>
          <button onClick={() => removeInputRule(index)} style={xBtn}>×</button>
        </div>
      ))}
      <button onClick={addInputRule} style={addBtn}>+ cost</button>

      <Section title="Output rules" />
      {outputRules.map((rule, index) => {
        const targetFilter = getOutputTargetFilter(rule)
        const targetValue = rule.output_type === 'hero_instance' ? (rule.target_class ?? '') : (rule.target ?? '')
        const targetLabel = rule.output_type === 'hero_instance' ? 'Target class' : 'Target'

        return (
          <div key={index} style={{ border: '1px solid #2a2a3e', borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
            <Select
              label="Output type"
              value={rule.output_type}
              onChange={(v) => updateOutputRule(index, {
                output_type: v,
                target: v === 'hero_instance' ? '' : rule.target,
                target_class: v === 'hero_instance' ? rule.target_class : '',
              })}
              options={OUTPUT_TYPE_OPTIONS}
            />
            <SearchableDropdown
              label={targetLabel}
              value={targetValue}
              onChange={(v) => updateOutputRule(index, rule.output_type === 'hero_instance' ? { target_class: v } : { target: v })}
              typeFilter={targetFilter}
              placeholder="Search nodes or drop one here"
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{ flex: 1 }}>
                <Field
                  label="Quantity"
                  value={rule.quantity ?? 1}
                  onChange={(v) => updateOutputRule(index, { quantity: Number(v) })}
                  type="number"
                />
              </div>
              <div style={{ flex: 1 }}>
                <Field
                  label="Chance"
                  value={rule.chance ?? 1}
                  onChange={(v) => updateOutputRule(index, { chance: v })}
                  placeholder="1"
                />
              </div>
            </div>

            {rule.output_type === 'world_effect' && (
              <>
                <Select
                  label="Effect type"
                  value={rule.effect_type ?? 'unlock_node'}
                  onChange={(v) => updateOutputRule(index, { effect_type: v })}
                  options={WORLD_EFFECT_OPTIONS}
                />
                {rule.effect_type === 'apply_modifier' && (
                  <>
                    <Field
                      label="Modifier target"
                      value={rule.modifier_target ?? ''}
                      onChange={(v) => updateOutputRule(index, { modifier_target: v })}
                    />
                    <Select
                      label="Modifier operation"
                      value={rule.modifier_operation ?? 'multiply'}
                      onChange={(v) => updateOutputRule(index, { modifier_operation: v })}
                      options={MODIFIER_OPERATION_OPTIONS}
                    />
                    <Field
                      label="Modifier value"
                      value={rule.modifier_value ?? 1}
                      onChange={(v) => updateOutputRule(index, { modifier_value: v })}
                    />
                  </>
                )}
              </>
            )}

            <button onClick={() => removeOutputRule(index)} style={addBtn}>Remove output</button>
          </div>
        )
      })}
      <button onClick={addOutputRule} style={addBtn}>+ output</button>

      <Section title="Success table" />
      <SliderField
        label="Failure chance"
        value={successTable.base_failure}
        onChange={(v) => updateSuccessTable({ base_failure: v })}
      />
      <SliderField
        label="Crit chance"
        value={successTable.base_crit}
        onChange={(v) => updateSuccessTable({ base_crit: v })}
      />
      <Select
        label="Failure behavior"
        value={successTable.failure_behavior}
        onChange={(v) => updateSuccessTable({ failure_behavior: v })}
        options={FAILURE_BEHAVIOR_OPTIONS}
      />
      <Select
        label="Crit behavior"
        value={successTable.crit_behavior}
        onChange={(v) => updateSuccessTable({ crit_behavior: v })}
        options={CRIT_BEHAVIOR_OPTIONS}
      />
      <Field
        label="Failure XP multiplier"
        value={successTable.failure_xp_multiplier}
        onChange={(v) => updateSuccessTable({ failure_xp_multiplier: Number(v) })}
        type="number"
      />
      <Toggle
        label="Failure grants XP"
        value={Boolean(successTable.failure_grants_xp)}
        onChange={(v) => updateSuccessTable({ failure_grants_xp: v })}
      />
      <Field
        label="Crit multiplier"
        value={successTable.crit_multiplier}
        onChange={(v) => updateSuccessTable({ crit_multiplier: Number(v) })}
        type="number"
      />
      {successTable.failure_behavior === 'partial_refund' && (
        <Field
          label="Failure refund rate"
          value={successTable.failure_refund_rate}
          onChange={(v) => updateSuccessTable({ failure_refund_rate: Number(v) })}
          type="number"
        />
      )}

      <Section title="Streak bonus" />
      <Toggle label="Enabled" value={Boolean(streakBonus)} onChange={toggleStreakBonus} />
      {streakBonus && (
        <>
          <Field
            label="Threshold"
            value={streakBonus.threshold}
            onChange={(v) => updateStreakBonus({ threshold: Number(v) })}
            type="number"
          />
          <Field
            label="Duration reduction"
            value={streakBonus.duration_reduction ?? 0}
            onChange={(v) => updateStreakBonus({ duration_reduction: Number(v) })}
            type="number"
          />
          <Field
            label="Crit bonus"
            value={streakBonus.crit_bonus ?? 0}
            onChange={(v) => updateStreakBonus({ crit_bonus: Number(v) })}
            type="number"
          />
        </>
      )}

      <Section title="Momentum config" />
      <Toggle label="Enabled" value={Boolean(momentumConfig)} onChange={toggleMomentum} />
      {momentumConfig && (
        <>
          <Field
            label="Gain per job"
            value={momentumConfig.gain_per_job}
            onChange={(v) => updateMomentum({ gain_per_job: Number(v) })}
            type="number"
          />
          <Field
            label="Decay per idle tick"
            value={momentumConfig.decay_per_idle_tick}
            onChange={(v) => updateMomentum({ decay_per_idle_tick: Number(v) })}
            type="number"
          />
          <div style={{ marginBottom: 10 }}>
            <div style={subLabelStyle}>Thresholds</div>
            {(momentumConfig.thresholds ?? []).map((threshold, index) => (
              <div key={index} style={{ border: '1px solid #2a2a3e', borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
                <Field
                  label="Momentum"
                  value={threshold.momentum ?? 0}
                  onChange={(v) => updateMomentumThreshold(index, { momentum: Number(v) })}
                  type="number"
                />
                <Field
                  label="Label"
                  value={threshold.label ?? ''}
                  onChange={(v) => updateMomentumThreshold(index, { label: v })}
                />
                <Field
                  label="Speed bonus"
                  value={threshold.speed_bonus ?? 0}
                  onChange={(v) => updateMomentumThreshold(index, { speed_bonus: Number(v) })}
                  type="number"
                />
                <Field
                  label="Crit bonus"
                  value={threshold.crit_bonus ?? 0}
                  onChange={(v) => updateMomentumThreshold(index, { crit_bonus: Number(v) })}
                  type="number"
                />
                <button onClick={() => removeMomentumThreshold(index)} style={addBtn}>Remove threshold</button>
              </div>
            ))}
            <button onClick={addMomentumThreshold} style={addBtn}>+ threshold</button>
          </div>
        </>
      )}
    </div>
  )
}

function normalizeOutputRule(rule = {}) {
  return {
    output_type: rule.output_type ?? 'resource',
    target: rule.target ?? '',
    target_class: rule.target_class ?? '',
    quantity: Number(rule.quantity ?? 1),
    chance: rule.chance ?? 1,
    effect_type: rule.effect_type ?? 'unlock_node',
    modifier_target: rule.modifier_target ?? '',
    modifier_value: rule.modifier_value ?? 1,
    modifier_operation: rule.modifier_operation ?? 'multiply',
  }
}

function normalizeSuccessTable(successTable = {}) {
  return {
    base_failure: Number(successTable.base_failure ?? 0),
    base_crit: Number(successTable.base_crit ?? 0),
    failure_behavior: successTable.failure_behavior ?? 'consume_inputs_no_output',
    failure_refund_rate: Number(successTable.failure_refund_rate ?? 0.5),
    failure_grants_xp: successTable.failure_grants_xp ?? true,
    failure_xp_multiplier: Number(successTable.failure_xp_multiplier ?? 0.5),
    crit_behavior: successTable.crit_behavior ?? 'double_output',
    crit_multiplier: Number(successTable.crit_multiplier ?? 2),
    xp_on_complete: Number(successTable.xp_on_complete ?? 0),
  }
}

function normalizeStreakBonus(streakBonus = {}) {
  return {
    threshold: Number(streakBonus.threshold ?? 2),
    duration_reduction: Number(streakBonus.duration_reduction ?? 0),
    crit_bonus: Number(streakBonus.crit_bonus ?? 0),
    label: streakBonus.label ?? '',
  }
}

function normalizeMomentumConfig(momentumConfig = {}) {
  return {
    gain_per_job: Number(momentumConfig.gain_per_job ?? 0),
    decay_per_idle_tick: Number(momentumConfig.decay_per_idle_tick ?? 0),
    thresholds: Array.isArray(momentumConfig.thresholds) ? momentumConfig.thresholds : [],
  }
}

function getOutputTargetFilter(rule) {
  if (rule.output_type === 'resource') return 'resource'
  if (rule.output_type === 'item' || rule.output_type === 'consumable') return 'item'
  if (rule.output_type === 'hero_instance') return 'hero_class'
  return undefined
}

function SliderField({ label, value, onChange }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#666680' }}>
          {label}
        </label>
        <span style={{ fontSize: 10, color: '#8888aa' }}>{Number(value ?? 0).toFixed(2)}</span>
      </div>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={value ?? 0}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%' }}
      />
    </div>
  )
}

const subLabelStyle = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#666680',
  marginBottom: 4,
}

const xBtn = { background: 'none', border: 'none', color: '#555570', cursor: 'pointer', fontSize: 14, padding: '0 2px' }
const addBtn = { fontSize: 10, padding: '3px 8px', background: '#1e1e2e', border: '1px solid #2a2a3e', borderRadius: 4, color: '#666680', cursor: 'pointer' }
