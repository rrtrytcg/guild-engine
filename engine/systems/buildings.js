import { canAfford, spend, gain, giveItem, spendItems } from './resources.js'
import { addToEventLog, checkActProgress, unlockNode, evaluateCondition } from './expeditions.js'

export const MIN_ACTION_DELAY_MS = 275

const STATUS_MULTIPLIERS = {
  ready: 1,
  inspired: 1.15,
  exhausted: 0.9,
  cursed: 0.8,
  injured: 0.6,
  dead: 0,
}

const STATUS_PRIORITY = ['dead', 'injured', 'cursed', 'exhausted', 'inspired', 'ready']
const HERO_STAT_ALIASES = {
  atk: 'attack',
  def: 'defense',
  spd: 'speed',
  hp: 'hp',
  lck: 'luck',
}
const HERO_RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary']
const HERO_NAMES = ['Aldric', 'Brienna', 'Corvin', 'Dasha', 'Emrick', 'Fyra', 'Gareth', 'Hilde', 'Iven', 'Jora']
const FORMULA_HELPERS = {
  abs: Math.abs,
  ceil: Math.ceil,
  floor: Math.floor,
  round: Math.round,
  min: Math.min,
  max: Math.max,
  pow: Math.pow,
  sqrt: Math.sqrt,
  clamp: (value, min, max) => Math.min(max, Math.max(min, value)),
}
const FORMULA_IDENTIFIER_RE = /\b[A-Za-z_][A-Za-z0-9_]*\b/g
const SAFE_FORMULA_CHARS_RE = /^[0-9A-Za-z_+\-*/%().,?:<>=!&| \t\r\n]+$/
const BANNED_FORMULA_TOKENS_RE = /(?:__proto__|prototype|constructor|globalThis|window|document|Function|eval|import|new|this|;|\[|\]|\{|\}|`|'|"|\\)/i
const EXACT_FORMULA_VARIABLES = new Set([
  'item_level',
  'item_rarity_tier',
  'item_quality_tier',
  'building_level',
  'worker_skill',
  'worker_specialization_match',
  'worker_level',
  'batch_size',
  'momentum',
  'streak_count',
  'base_failure',
  'base_crit',
  'forge_level',
  'base_duration',
])
const DYNAMIC_FORMULA_VARIABLE_PATTERNS = [
  /^item_craft_cost_[A-Za-z0-9_]+$/,
  /^item_base_stat_[A-Za-z0-9_]+$/,
  /^resource_[A-Za-z0-9_]+$/,
]

export function xpRequired(level) {
  return Math.floor(100 * Math.pow(Math.max(1, level), 1.6))
}

export function getHeroStatuses(hero) {
  if (Array.isArray(hero.statuses)) return [...new Set(hero.statuses.filter(Boolean))]
  if (hero.status && hero.status !== 'ready') return [hero.status]
  return []
}

export function refreshHeroStatus(hero) {
  const statuses = getHeroStatuses(hero)
  if (statuses.includes('dead')) {
    hero.statuses = ['dead']
    hero.status = 'dead'
    return hero.status
  }

  hero.statuses = statuses.filter((status) => status !== 'ready' && status !== 'dead')

  for (const status of STATUS_PRIORITY) {
    if (status === 'ready') break
    if (hero.statuses.includes(status)) {
      hero.status = status
      return hero.status
    }
  }

  hero.status = 'ready'
  return hero.status
}

export function setHeroStatuses(hero, statuses) {
  hero.statuses = [...new Set((statuses ?? []).filter((status) => status && status !== 'ready'))]
  if (hero.statuses.includes('dead')) {
    hero.statuses = ['dead']
  }
  return refreshHeroStatus(hero)
}

export function addHeroStatus(hero, status) {
  if (!status || status === 'ready') return refreshHeroStatus(hero)
  const next = new Set(getHeroStatuses(hero))
  next.add(status)
  return setHeroStatuses(hero, [...next])
}

export function removeHeroStatus(hero, status) {
  const next = new Set(getHeroStatuses(hero))
  next.delete(status)
  return setHeroStatuses(hero, [...next])
}

export function hasHeroStatus(hero, status) {
  return getHeroStatuses(hero).includes(status)
}

function aliasHeroStat(stat) {
  return HERO_STAT_ALIASES[stat] ?? stat
}

function normalizeBuffRecord(buff) {
  if (!buff) return null
  return {
    item_id: buff.item_id,
    duration_type: buff.duration_type ?? 'expedition_count',
    remaining: Math.max(0, Number(buff.remaining ?? 0)),
    effect: buff.effect ?? null,
    stack_behavior: buff.stack_behavior ?? 'refresh',
    stack_cap: buff.stack_cap ?? null,
    stacks: Math.max(1, Number(buff.stacks ?? 1)),
    buff_slot_cost: Math.max(1, Number(buff.buff_slot_cost ?? 1)),
  }
}

export function normalizeHeroRecord(state, hero) {
  const normalized = {
    ...hero,
    xp: hero.xp ?? 0,
    xp_next: hero.xp_next ?? xpRequired(hero.level ?? 1),
    consecutive_runs: hero.consecutive_runs ?? 0,
    recovery_at: hero.recovery_at ?? null,
    curse_clears_at: hero.curse_clears_at ?? null,
    equipment: hero.equipment ?? {},
    active_buffs: (hero.active_buffs ?? []).map(normalizeBuffRecord).filter(Boolean),
    specialization: hero.specialization ?? null,
    rarity: hero.rarity ?? 'common',
  }
  if (!Array.isArray(normalized.statuses)) {
    normalized.statuses = hero.status && hero.status !== 'ready' ? [hero.status] : []
  }
  refreshHeroStatus(normalized)
  syncHeroStats(state, normalized)
  return normalized
}

function buildBuffFormulaVariables(state, hero, buff) {
  const itemDef = state.itemDefs?.[buff.item_id] ?? {}
  const variables = {
    item_level: hero.level ?? 1,
    item_rarity_tier: rarityToTier(itemDef.rarity),
    item_quality_tier: 0,
    building_level: 0,
    worker_skill: 0,
    worker_specialization_match: 0,
    worker_level: hero.level ?? 1,
    batch_size: 1,
    momentum: 0,
    streak_count: 0,
    base_failure: 0,
    base_crit: 0,
    forge_level: 0,
    base_duration: 0,
  }

  for (const [resourceId, resource] of Object.entries(state.resources ?? {})) {
    variables[`resource_${resourceId}`] = Number(resource.amount ?? 0)
  }
  for (const [stat, value] of Object.entries(itemDef.stat_modifiers ?? {})) {
    variables[`item_base_stat_${stat}`] = Number(value ?? 0)
  }

  return variables
}

function resolveBuffValue(state, hero, buff) {
  const rawValue = buff?.effect?.value
  if (typeof rawValue === 'string') {
    return safeEvaluateFormula(rawValue, buildBuffFormulaVariables(state, hero, buff), 0)
  }
  return Number(rawValue ?? 0)
}

function applySingleBuffEffect(state, hero, stats, buff) {
  const effect = buff?.effect
  if (!effect?.stat) return

  const stat = aliasHeroStat(effect.stat)
  const value = resolveBuffValue(state, hero, buff)
  if (!Number.isFinite(value)) return

  if (effect.operation === 'multiply') {
    stats[stat] = (stats[stat] ?? 0) * value
    return
  }
  if (effect.operation === 'set') {
    stats[stat] = value
    return
  }
  stats[stat] = (stats[stat] ?? 0) + value
}

export function syncHeroStats(state, hero) {
  const cls = state.heroClasses[hero.class_id]
  if (!cls) return
  hero.active_buffs = (hero.active_buffs ?? []).map(normalizeBuffRecord).filter(Boolean)
  hero.stats = computeHeroStats(cls, hero.level ?? 1)
  for (const equipped of Object.values(hero.equipment ?? {})) {
    const equippedDef = state.itemDefs[equipped]
    for (const [stat, mod] of Object.entries(equippedDef?.stat_modifiers ?? {})) {
      hero.stats[stat] = (hero.stats[stat] ?? 0) + mod
    }
  }
  for (const buff of hero.active_buffs) {
    for (let index = 0; index < Math.max(1, buff.stacks ?? 1); index++) {
      applySingleBuffEffect(state, hero, hero.stats, buff)
    }
  }
  for (const [stat, mod] of Object.entries(state.multipliers.hero_stats ?? {})) {
    hero.stats[stat] = (hero.stats[stat] ?? 0) + mod
  }
}

export function syncAllHeroStats(state) {
  for (const hero of state.heroes) {
    syncHeroStats(state, hero)
  }
  for (const hero of state.recruitPool ?? []) {
    syncHeroStats(state, hero)
  }
}

export function getHeroEffectiveStats(hero) {
  const stats = hero.stats ?? {}
  const statuses = getHeroStatuses(hero)
  const statusMultiplier = statuses.reduce(
    (mult, status) => mult * (STATUS_MULTIPLIERS[status] ?? 1),
    1
  )
  const cursedLuckMultiplier = statuses.includes('cursed') ? 0.5 : 1

  return {
    attack: (stats.attack ?? 0) * statusMultiplier,
    defense: (stats.defense ?? 0) * statusMultiplier,
    speed: (stats.speed ?? 0) * statusMultiplier,
    hp: (stats.hp ?? 0) * statusMultiplier,
    luck: (stats.luck ?? 0) * statusMultiplier * cursedLuckMultiplier,
  }
}

export function clearExpiredHeroStatuses(state, nowMs = Date.now()) {
  for (const hero of state.heroes) {
    if (hasHeroStatus(hero, 'dead')) continue

    let changed = false
    const statuses = new Set(getHeroStatuses(hero))

    if (statuses.has('injured') && hero.recovery_at !== null && hero.recovery_at !== undefined && nowMs > hero.recovery_at) {
      statuses.delete('injured')
      hero.recovery_at = null
      changed = true
    }

    if (statuses.has('cursed') && hero.curse_clears_at !== null && hero.curse_clears_at !== undefined && nowMs > hero.curse_clears_at) {
      statuses.delete('cursed')
      hero.curse_clears_at = null
      changed = true
    }

    if (changed) {
      setHeroStatuses(hero, [...statuses])
      syncHeroStats(state, hero)
    }
  }
}

export function isCombatEligibleHero(state, hero) {
  if (!hero) return false
  const cls = state.heroClasses?.[hero.class_id]
  if (!cls) return true
  if (cls.combat_eligible === false) return false
  if (cls.hero_type === 'artisan') return false
  return true
}

export function startPartyRun(state, heroIds) {
  for (const hid of heroIds) {
    const hero = state.heroes.find((h) => h.id === hid)
    if (!hero || hasHeroStatus(hero, 'dead')) continue
    hero.consecutive_runs = (hero.consecutive_runs ?? 0) + 1
    if (hero.consecutive_runs >= 2 && getHeroStatuses(hero).length === 0) {
      addHeroStatus(hero, 'exhausted')
    }
  }
}

export function completePartyRun(state, heroIds) {
  const party = new Set(heroIds)
  for (const hero of state.heroes) {
    if (hasHeroStatus(hero, 'dead')) continue

    if (party.has(hero.id)) {
      removeHeroStatus(hero, 'inspired')
    } else {
      hero.consecutive_runs = 0
      if (hasHeroStatus(hero, 'exhausted')) {
        removeHeroStatus(hero, 'exhausted')
      }
    }
  }

  // Inspired is a one-run guild buff, so it clears when any expedition resolves.
  for (const hero of state.heroes) {
    if (hasHeroStatus(hero, 'dead')) continue
    if (hasHeroStatus(hero, 'inspired')) {
      removeHeroStatus(hero, 'inspired')
    }
  }
}

export function grantHeroXp(state, heroId, xpGained) {
  const hero = state.heroes.find((h) => h.id === heroId)
  const safeXp = Math.max(0, Number(xpGained ?? 0))
  if (!hero || hasHeroStatus(hero, 'dead') || safeXp <= 0) return 0

  hero.xp = (hero.xp ?? 0) + safeXp
  let levelsGained = 0

  while (hero.xp >= xpRequired(hero.level ?? 1)) {
    hero.xp -= xpRequired(hero.level ?? 1)
    hero.level = (hero.level ?? 1) + 1
    syncHeroStats(state, hero)
    hero.xp_next = xpRequired(hero.level)
    levelsGained += 1
    addToEventLog(state, `${hero.name} reached level ${hero.level}!`, 'success')
  }

  hero.xp_next = xpRequired(hero.level ?? 1)
  return levelsGained
}

export function grantPartyXp(state, heroIds, xpGained) {
  for (const hid of heroIds) {
    grantHeroXp(state, hid, xpGained)
  }
}

export function handleWipeDeaths(state, heroIds, expeditionLabel, expeditionLevel = 1, nowMs = Date.now()) {
  const deadIds = new Set()

  for (const hid of heroIds) {
    const hero = state.heroes.find((h) => h.id === hid)
    if (!hero || hasHeroStatus(hero, 'dead')) continue

    addHeroStatus(hero, 'injured')
    const recoveryAt = nowMs + Math.ceil(expeditionLevel / 2) * 60 * 1000
    hero.recovery_at = hero.recovery_at ? Math.max(hero.recovery_at, recoveryAt) : recoveryAt

    if (Math.random() < 0.25) {
      for (const itemId of Object.values(hero.equipment ?? {})) {
        if (itemId) giveItem(state, itemId, 1)
      }
      hero.equipment = {}
      hero.active_buffs = []
      setHeroStatuses(hero, ['dead'])
      deadIds.add(hero.id)
      addToEventLog(state, `${hero.name} has fallen in ${expeditionLabel}.`, 'danger')
    } else {
      refreshHeroStatus(hero)
      syncHeroStats(state, hero)
    }
  }

  if (deadIds.size > 0) {
    state.heroes = state.heroes.filter((hero) => !deadIds.has(hero.id))
  }
}

function rarityToTier(rarity) {
  return Math.max(0, HERO_RARITIES.indexOf(rarity ?? 'common'))
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function isAllowedFormulaVariable(name) {
  return EXACT_FORMULA_VARIABLES.has(name) || DYNAMIC_FORMULA_VARIABLE_PATTERNS.some((pattern) => pattern.test(name))
}

export function evaluateFormula(formulaString, variables = {}) {
  if (typeof formulaString !== 'string') return 0
  const formula = formulaString.trim()
  if (!formula) return 0
  if (!SAFE_FORMULA_CHARS_RE.test(formula) || BANNED_FORMULA_TOKENS_RE.test(formula)) {
    throw new Error('Unsafe formula')
  }

  const safeVariables = {}
  for (const [key, value] of Object.entries(variables)) {
    if (isAllowedFormulaVariable(key)) {
      safeVariables[key] = Number.isFinite(Number(value)) ? Number(value) : 0
    }
  }

  const identifiers = new Set(formula.match(FORMULA_IDENTIFIER_RE) ?? [])
  for (const identifier of identifiers) {
    if (identifier === 'true' || identifier === 'false' || identifier === 'null') continue
    if (identifier in FORMULA_HELPERS) continue
    if (identifier in safeVariables) continue
    throw new Error(`Unknown formula identifier: ${identifier}`)
  }

  const argNames = [...Object.keys(FORMULA_HELPERS), ...Object.keys(safeVariables)]
  const argValues = [...Object.values(FORMULA_HELPERS), ...Object.values(safeVariables)]
  const fn = Function(...argNames, '"use strict"; return (' + formula + ');')
  const result = fn(...argValues)
  if (typeof result === 'boolean') return result ? 1 : 0
  const numericResult = Number(result)
  if (!Number.isFinite(numericResult)) {
    throw new Error('Formula did not resolve to a finite number')
  }
  return numericResult
}

function safeEvaluateFormula(formulaString, variables, fallback = 0) {
  try {
    return evaluateFormula(formulaString, variables)
  } catch {
    return fallback
  }
}

function pickRandomName() {
  return `${HERO_NAMES[Math.floor(Math.random() * HERO_NAMES.length)]} ${Math.floor(Math.random() * 100)}`
}

function createHeroInstance(state, classId, options = {}) {
  const cls = state.heroClasses[classId]
  if (!cls) return null

  const specialization = options.specialization
    ?? (Array.isArray(cls.specializations) && cls.specializations.length
      ? cls.specializations[Math.floor(Math.random() * cls.specializations.length)]
      : null)

  const hero = {
    id: options.id ?? `hero-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    class_id: classId,
    name: options.name ?? pickRandomName(),
    level: options.level ?? 1,
    xp: options.xp ?? 0,
    xp_next: xpRequired(options.level ?? 1),
    statuses: options.statuses ?? [],
    status: options.status ?? 'ready',
    consecutive_runs: options.consecutive_runs ?? 0,
    recovery_at: options.recovery_at ?? null,
    curse_clears_at: options.curse_clears_at ?? null,
    equipment: options.equipment ?? {},
    active_buffs: (options.active_buffs ?? []).map(normalizeBuffRecord).filter(Boolean),
    specialization,
    rarity: options.rarity ?? 'common',
    stats: {},
  }

  syncHeroStats(state, hero)
  refreshHeroStatus(hero)
  return hero
}

function getAssignedArtisan(state, building) {
  if (!building?.artisan_assigned) return null
  return state.heroes.find((hero) => hero.id === building.artisan_assigned) ?? null
}

function resolveWorkflowSuccessTable(workflow, recipe) {
  const table = { ...(workflow?.success_table ?? {}) }
  if (recipe?.success_table_override) {
    Object.assign(table, recipe.success_table_override)
  }
  if (recipe?.crit_output?.behavior === 'quality_upgrade') {
    table.crit_behavior = 'quality_upgrade'
    if (recipe.crit_output.result_item) table.crit_output_item = recipe.crit_output.result_item
  } else if (recipe?.crit_output?.behavior === 'double_output') {
    table.crit_behavior = 'double_output'
  }
  return table
}

function buildFormulaVariables(state, building, workflow, job = {}, extra = {}) {
  const artisan = getAssignedArtisan(state, building)
  const artisanClass = artisan ? state.heroClasses?.[artisan.class_id] : null
  const sourceItemDef = job.source_item_id ? state.itemDefs?.[job.source_item_id] : null
  const successTable = resolveWorkflowSuccessTable(workflow, job.recipe_id ? state.craftingRecipes?.[job.recipe_id] : null)
  const variables = {
    item_level: Number(job.item_level ?? 1),
    item_rarity_tier: rarityToTier(sourceItemDef?.rarity),
    item_quality_tier: Number(job.item_quality_tier ?? 0),
    building_level: Number(building?.level ?? 0),
    worker_skill: Number(artisan?.stats?.[artisanClass?.primary_stat] ?? 0),
    worker_specialization_match: Number(
      artisan?.specialization && workflow?.action_type
        ? artisan.specialization === workflow.action_type
        : 0
    ),
    worker_level: Number(artisan?.level ?? 1),
    batch_size: Number(job.batch_size ?? 1),
    momentum: Number(building?.momentum ?? 0),
    streak_count: Number(building?.streak_count ?? 0),
    base_failure: Number(successTable.base_failure ?? 0),
    base_crit: Number(successTable.base_crit ?? 0),
    forge_level: Number(building?.level ?? 0),
    base_duration: Number(
      workflow?.duration_base_ticks
      ?? workflow?.total_ticks_required
      ?? job.base_duration
      ?? job.total_s
      ?? 1
    ),
  }

  for (const [resourceId, resource] of Object.entries(state.resources ?? {})) {
    variables[`resource_${resourceId}`] = Number(resource.amount ?? 0)
  }

  for (const [stat, value] of Object.entries(sourceItemDef?.stat_modifiers ?? {})) {
    variables[`item_base_stat_${stat}`] = Number(value ?? 0)
  }

  for (const [key, value] of Object.entries(extra)) {
    variables[key] = value
  }

  return variables
}

function buildWorkflowInputEntries(state, building, workflow, job = {}) {
  const recipe = job.recipe_id ? state.craftingRecipes?.[job.recipe_id] : null
  const rawInputs = recipe?.inputs ?? workflow?.inputs ?? []
  const variables = buildFormulaVariables(state, building, workflow, job)

  return rawInputs.map((entry) => {
    const inputId = entry.item_id ?? entry.resource_id ?? entry.resource ?? entry.item ?? ''
    const amountSource = entry.qty ?? entry.amount ?? 0
    const amount = Math.max(
      0,
      typeof amountSource === 'string'
        ? safeEvaluateFormula(amountSource, variables, 0)
        : Number(amountSource)
    )
    const isResource = Boolean(inputId && state.resources?.[inputId])
    const isItem = Boolean(inputId && state.itemDefs?.[inputId])
    return {
      id: inputId,
      qty: amount,
      kind: isResource ? 'resource' : (isItem ? 'item' : 'unknown'),
    }
  }).filter((entry) => entry.id && entry.qty > 0)
}

function getWorkflowInputAvailableAmount(state, input) {
  if (!input?.id) return 0
  if (input.kind === 'resource') return Number(state.resources?.[input.id]?.amount ?? 0)
  if (input.kind === 'item') return Number(state.inventory?.[input.id] ?? 0)

  const resourceAmount = Number(state.resources?.[input.id]?.amount ?? 0)
  if (resourceAmount > 0 || state.resources?.[input.id]) return resourceAmount
  return Number(state.inventory?.[input.id] ?? 0)
}

function canAffordWorkflowInputs(state, inputs) {
  return inputs.every((input) => getWorkflowInputAvailableAmount(state, input) >= input.qty)
}

function spendWorkflowInputs(state, inputs) {
  if (!canAffordWorkflowInputs(state, inputs)) return false
  for (const input of inputs) {
    if (input.kind === 'resource' || (input.kind === 'unknown' && state.resources?.[input.id])) {
      if (!state.resources?.[input.id]) continue
      state.resources[input.id].amount -= input.qty
      continue
    }
    state.inventory[input.id] = Math.max(0, Number(state.inventory?.[input.id] ?? 0) - input.qty)
  }
  return true
}

function refundWorkflowInputs(state, inputs, rate = 1) {
  const resourceRefund = {}
  for (const input of inputs ?? []) {
    const refundAmount = input.qty * rate
    if (!(refundAmount > 0)) continue

    if (input.kind === 'resource' || (input.kind === 'unknown' && state.resources?.[input.id])) {
      resourceRefund[input.id] = (resourceRefund[input.id] ?? 0) + refundAmount
      continue
    }

    const wholeRefund = Math.floor(refundAmount)
    if (wholeRefund <= 0) continue
    state.inventory[input.id] = (state.inventory[input.id] ?? 0) + wholeRefund
  }
  if (Object.keys(resourceRefund).length > 0) {
    gain(state, resourceRefund)
  }
}

function createWorkflowJob(state, building, workflow, options = {}) {
  const job = {
    id: options.id ?? `job-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    workflow_id: workflow.id,
    recipe_id: options.recipe_id ?? null,
    source_item_id: options.source_item_id ?? null,
    progress_s: Number(options.progress_s ?? 0),
    total_s: Number(options.total_s ?? 0),
    batch_size: Number(options.batch_size ?? 1),
    inputs_committed: options.inputs_committed ?? false,
    consumed_resources: options.consumed_resources ?? [],
    item_level: options.item_level ?? 1,
    item_quality_tier: options.item_quality_tier ?? 0,
    passive: options.passive ?? workflow.workflow_mode === 'passive',
  }

  if (!(job.total_s > 0)) {
    job.total_s = computeWorkflowDuration(state, building, workflow, job)
  }

  return job
}

function ensureJobInputsCommitted(state, building, workflow, job) {
  if (job.inputs_committed) return true

  const inputs = buildWorkflowInputEntries(state, building, workflow, job)
  if (!inputs.length) {
    job.inputs_committed = true
    job.consumed_resources = []
    return true
  }

  if (!spendWorkflowInputs(state, inputs)) return false
  job.inputs_committed = true
  job.consumed_resources = inputs
  return true
}

function computeWorkflowDuration(state, building, workflow, job = {}) {
  const recipe = job.recipe_id ? state.craftingRecipes?.[job.recipe_id] : null
  const variables = buildFormulaVariables(state, building, workflow, job)

  if (recipe?.craft_time_formula) {
    return Math.max(0.1, safeEvaluateFormula(recipe.craft_time_formula, variables, workflow?.duration_base_ticks ?? 1))
  }
  if (workflow?.duration_formula) {
    return Math.max(0.1, safeEvaluateFormula(workflow.duration_formula, variables, workflow?.duration_base_ticks ?? workflow?.total_ticks_required ?? 1))
  }
  return Math.max(0.1, Number(workflow?.total_ticks_required ?? workflow?.duration_base_ticks ?? job.total_s ?? 1))
}

function getMomentumThresholdBonus(workflow, building) {
  const thresholds = [...(workflow?.momentum_config?.thresholds ?? [])].sort(
    (left, right) => Number(left.momentum ?? 0) - Number(right.momentum ?? 0)
  )
  let matched = null
  for (const threshold of thresholds) {
    if ((building?.momentum ?? 0) >= (threshold.momentum ?? 0)) {
      matched = threshold
    }
  }
  return matched
}

function computeWorkflowSpeedMultiplier(state, building, workflow, job) {
  const variables = buildFormulaVariables(state, building, workflow, job)
  let speed = Number(state.multipliers?.craft_speed ?? 1)

  if (variables.worker_skill > 0) {
    speed *= 1 + (variables.worker_skill / 100)
  }
  if (variables.worker_specialization_match > 0) {
    speed *= 1.15
  }

  if (workflow?.streak_bonus && (building?.streak_count ?? 0) >= (workflow.streak_bonus.threshold ?? Infinity)) {
    speed *= 1 + Number(workflow.streak_bonus.duration_reduction ?? 0)
  }

  const momentumThreshold = getMomentumThresholdBonus(workflow, building)
  if (momentumThreshold?.speed_bonus) {
    speed *= 1 + Number(momentumThreshold.speed_bonus)
  }

  return Math.max(0.01, speed)
}

function resolveChance(value, variables) {
  if (typeof value === 'string') {
    return clamp(safeEvaluateFormula(value, variables, 1), 0, 1)
  }
  if (value === undefined || value === null) return 1
  return clamp(Number(value), 0, 1)
}

function getWorkflowOutputRules(state, workflow, job, recipe) {
  if (workflow?.use_item_salvage_profile && job.source_item_id) {
    return (state.itemDefs?.[job.source_item_id]?.salvage_profile?.outputs ?? []).map((rule) => ({ ...rule }))
  }

  const outputId = recipe?.output_item_id ?? recipe?.output_item
  if (outputId) {
    if (state.resources?.[outputId]) {
      return [{
        output_type: 'resource',
        target: outputId,
        quantity: recipe.output_quantity ?? recipe.output_qty ?? 1,
      }]
    }

    const outputDef = state.itemDefs?.[outputId]
    const outputType = outputDef?.item_type === 'consumable' ? 'consumable' : 'item'
    return [{
      output_type: outputType,
      target: outputId,
      quantity: recipe.output_quantity ?? recipe.output_qty ?? 1,
    }]
  }

  return (workflow?.output_rules ?? []).map((rule) => ({ ...rule }))
}

function addToBuffStockpile(state, itemId, quantity) {
  const itemDef = state.itemDefs?.[itemId]
  if (!itemDef || quantity <= 0) return 0
  const limit = itemDef.stack_max ?? itemDef.stack_limit ?? Infinity
  const previous = Number(state.buff_stockpile?.[itemId] ?? 0)
  const next = Math.min(previous + quantity, limit)
  state.buff_stockpile[itemId] = next
  return next - previous
}

function consumeFromBuffStockpile(state, itemId, quantity = 1) {
  const available = Number(state.buff_stockpile?.[itemId] ?? 0)
  if (available < quantity) return false
  state.buff_stockpile[itemId] = available - quantity
  return true
}

function pickWeightedRarity(rarityTable = []) {
  if (!rarityTable.length) return 'common'
  const totalWeight = rarityTable.reduce((sum, entry) => sum + Number(entry.weight ?? 0), 0)
  if (totalWeight <= 0) return rarityTable[0].rarity ?? 'common'

  let roll = Math.random() * totalWeight
  for (const entry of rarityTable) {
    roll -= Number(entry.weight ?? 0)
    if (roll <= 0) return entry.rarity ?? 'common'
  }
  return rarityTable[rarityTable.length - 1].rarity ?? 'common'
}

function increaseRarity(rarity, steps = 1) {
  const current = Math.max(0, HERO_RARITIES.indexOf(rarity ?? 'common'))
  return HERO_RARITIES[Math.min(HERO_RARITIES.length - 1, current + steps)] ?? 'common'
}

function applyModifierTarget(container, target, operation, value) {
  if (!container || !target) return
  const parts = String(target).split('.').filter(Boolean)
  if (!parts.length) return

  let current = container
  for (let index = 0; index < parts.length - 1; index++) {
    const part = parts[index]
    if (!current[part] || typeof current[part] !== 'object') {
      current[part] = {}
    }
    current = current[part]
  }

  const key = parts[parts.length - 1]
  const base = current[key] ?? (operation === 'multiply' ? 1 : 0)
  if (operation === 'multiply') {
    current[key] = base * value
  } else if (operation === 'set') {
    current[key] = value
  } else {
    current[key] = base + value
  }
}

function applyWorldEffectOutput(state, rule, variables) {
  if (rule.effect_type === 'unlock_node') {
    unlockNode(state, rule.target)
    return
  }

  if (rule.effect_type === 'apply_modifier') {
    const value = typeof rule.modifier_value === 'string'
      ? safeEvaluateFormula(rule.modifier_value, variables, 1)
      : Number(rule.modifier_value ?? 1)
    applyModifierTarget(
      state.multipliers,
      rule.modifier_target ?? rule.target,
      rule.modifier_operation ?? 'multiply',
      value
    )
    if ((rule.modifier_target ?? '').startsWith('hero_stats.')) {
      syncAllHeroStats(state)
    }
    return
  }

  if (rule.effect_type === 'trigger_event') {
    const targetNode = state._nodeMap?.get(rule.target)
    const text = targetNode?.log_message ?? targetNode?.label ?? `Triggered event: ${rule.target}`
    addToEventLog(state, text, 'system')
  }
}

function applyWorkflowOutputs(state, building, workflow, job, recipe, successTable, isCrit) {
  const variables = buildFormulaVariables(state, building, workflow, job)
  const outputRules = getWorkflowOutputRules(state, workflow, job, recipe)
  const quantityMultiplier = isCrit && successTable.crit_behavior === 'double_output'
    ? Number(successTable.crit_multiplier ?? 2)
    : 1

  if (isCrit && successTable.crit_behavior === 'quality_upgrade') {
    const upgradedItemId = recipe?.crit_output?.result_item ?? successTable.crit_output_item
    if (upgradedItemId) {
      for (const rule of outputRules) {
        if (rule.output_type === 'item' || rule.output_type === 'consumable') {
          rule.target = upgradedItemId
        }
      }
    }
  }

  if (isCrit && recipe?.crit_output?.behavior === 'bonus_material' && recipe.crit_output.bonus_resource) {
    outputRules.push({
      output_type: 'resource',
      target: recipe.crit_output.bonus_resource,
      yield_formula: String(recipe.crit_output.bonus_amount ?? 0),
    })
  }

  for (const rule of outputRules) {
    if (Math.random() > resolveChance(rule.chance, variables)) continue

    if (rule.output_type === 'resource') {
      const baseAmount = rule.yield_formula
        ? safeEvaluateFormula(rule.yield_formula, variables, 0)
        : Number(rule.quantity ?? 0)
      const amount = Math.max(0, baseAmount * quantityMultiplier)
      if (rule.target && amount > 0) {
        gain(state, { [rule.target]: amount })
      }
      continue
    }

    if (rule.output_type === 'item') {
      const quantity = Math.max(1, Math.round(Number(rule.quantity ?? 1) * quantityMultiplier))
      if (rule.target) giveItem(state, rule.target, quantity)
      continue
    }

    if (rule.output_type === 'consumable') {
      const quantity = Math.max(1, Math.round(Number(rule.quantity ?? 1) * quantityMultiplier))
      if (rule.target) addToBuffStockpile(state, rule.target, quantity)
      continue
    }

    if (rule.output_type === 'world_effect') {
      applyWorldEffectOutput(state, rule, variables)
      continue
    }

    if (rule.output_type === 'hero_instance') {
      const rarity = isCrit && successTable.crit_behavior === 'rarity_upgrade'
        ? increaseRarity(pickWeightedRarity(rule.rarity_table), 1)
        : pickWeightedRarity(rule.rarity_table)
      const hero = createHeroInstance(state, rule.target_class, { rarity })
      if (hero) {
        state.recruitPool = state.recruitPool ?? []
        state.recruitPool.push(hero)
        addToEventLog(state, `${hero.name} is now available for recruitment.`, 'success')
      }
    }
  }

  if (isCrit && successTable.crit_behavior === 'breakthrough' && Array.isArray(successTable.breakthrough_table) && successTable.breakthrough_table.length) {
    const totalWeight = successTable.breakthrough_table.reduce((sum, entry) => sum + Number(entry.weight ?? 0), 0)
    let roll = Math.random() * Math.max(1, totalWeight)
    let selected = successTable.breakthrough_table[0]
    for (const entry of successTable.breakthrough_table) {
      roll -= Number(entry.weight ?? 0)
      if (roll <= 0) {
        selected = entry
        break
      }
    }
    applyWorldEffectOutput(state, {
      output_type: 'world_effect',
      effect_type: selected.effect_type,
      target: selected.target,
      modifier_value: selected.modifier_value,
    }, variables)
  }
}

function updateBuildingCompletionState(building, workflow, job, completedSuccessfully) {
  const streakKey = job.recipe_id ?? job.workflow_id
  if (completedSuccessfully) {
    if (workflow?.streak_bonus) {
      if (building._last_streak_key === streakKey) {
        building.streak_count = (building.streak_count ?? 0) + 1
      } else {
        building.streak_count = 1
      }
      building._last_streak_key = streakKey
    }

    if (workflow?.momentum_config) {
      building.momentum = Math.max(
        0,
        Number(building.momentum ?? 0) + Number(workflow.momentum_config.gain_per_job ?? 0)
      )
    }
    return
  }

  if (workflow?.streak_bonus) {
    building.streak_count = 0
    building._last_streak_key = null
  }
}

function resolveWorkflowJobCompletion(state, building, workflow, job) {
  const recipe = job.recipe_id ? state.craftingRecipes?.[job.recipe_id] : null
  const successTable = resolveWorkflowSuccessTable(workflow, recipe)
  const variables = buildFormulaVariables(state, building, workflow, job)
  const momentumThreshold = getMomentumThresholdBonus(workflow, building)
  let failureChance = Number(successTable.base_failure ?? 0)
  let critChance = Number(successTable.base_crit ?? 0)

  if (successTable.failure_chance_formula) {
    failureChance = safeEvaluateFormula(successTable.failure_chance_formula, variables, failureChance)
  }
  if (successTable.crit_chance_formula) {
    critChance = safeEvaluateFormula(successTable.crit_chance_formula, variables, critChance)
  }

  if (workflow?.streak_bonus && (building.streak_count ?? 0) >= (workflow.streak_bonus.threshold ?? Infinity)) {
    critChance += Number(workflow.streak_bonus.crit_bonus ?? 0)
  }
  if (momentumThreshold?.crit_bonus) {
    critChance += Number(momentumThreshold.crit_bonus)
  }

  failureChance = clamp(failureChance, 0, 1)
  critChance = clamp(critChance, 0, 1)

  const artisan = getAssignedArtisan(state, building)
  const baseXp = Number(workflow?.xp_on_complete ?? 0)

  if (Math.random() < failureChance) {
    if (successTable.failure_behavior === 'partial_refund') {
      refundWorkflowInputs(state, job.consumed_resources, Number(successTable.failure_refund_rate ?? 0.5))
    } else if (successTable.failure_behavior === 'reset_progress_refund_inputs') {
      refundWorkflowInputs(state, job.consumed_resources, 1)
      job.progress_s = 0
      job.total_s = computeWorkflowDuration(state, building, workflow, job)
      job.inputs_committed = false
      job.consumed_resources = []
      if (artisan && successTable.failure_grants_xp !== false) {
        grantHeroXp(state, artisan.id, baseXp * Number(successTable.failure_xp_multiplier ?? 0.5))
      }
      updateBuildingCompletionState(building, workflow, job, false)
      addToEventLog(state, `${building.label}: ${workflow.label ?? workflow.id} failed and must restart.`, 'danger')
      return true
    }

    if (artisan && successTable.failure_grants_xp !== false) {
      grantHeroXp(state, artisan.id, baseXp * Number(successTable.failure_xp_multiplier ?? 0.5))
    }
    updateBuildingCompletionState(building, workflow, job, false)
    addToEventLog(state, `${building.label}: ${workflow.label ?? workflow.id} failed.`, 'danger')
    return false
  }

  const isCrit = Math.random() < critChance
  applyWorkflowOutputs(state, building, workflow, job, recipe, successTable, isCrit)

  if (artisan && baseXp > 0) {
    grantHeroXp(state, artisan.id, baseXp)
  }

  updateBuildingCompletionState(building, workflow, job, true)
  addToEventLog(
    state,
    `${building.label}: ${workflow.label ?? workflow.id} completed${isCrit ? ' with a critical result' : ''}.`,
    isCrit ? 'success' : 'info'
  )
  return false
}

function refreshWorkflowUnlocksForBuilding(state, buildingId) {
  const building = state.buildings?.[buildingId]
  if (!building) return

  for (const workflow of Object.values(state.buildingWorkflows ?? {})) {
    if (workflow.host_building !== buildingId) continue
    const unlock = workflow.unlocked_by ?? {}
    const meetsLevel = (building.level ?? 0) >= (unlock.building_level ?? 1)
    const meetsPrereqs = (unlock.building_prerequisites ?? []).every(
      (upgradeId) => state.buildingUpgrades?.[upgradeId]?.completed
    )
    workflow.visible = !!building.visible && meetsLevel && meetsPrereqs
  }

  for (const recipe of Object.values(state.craftingRecipes ?? {})) {
    const workflow = state.buildingWorkflows?.[recipe.required_workflow ?? recipe.workflow_id]
    if (!workflow || workflow.host_building !== buildingId) continue
    recipe.visible = !!workflow.visible && (building.level ?? 0) >= (recipe.required_building_level ?? 1)
  }

  for (const upgrade of Object.values(state.buildingUpgrades ?? {})) {
    if (upgrade.host_building !== buildingId) continue
    const requiredLevel = Number(upgrade.requires?.building_level ?? 0)
    const crossRequirements = (upgrade.requires?.cross_building ?? []).every((requirement) => {
      const otherBuilding = state.buildings?.[requirement.building_id]
      return !!otherBuilding && (otherBuilding.level ?? 0) >= (requirement.level ?? 0)
    })
    upgrade.visible = !!building.visible && (building.level ?? 0) >= requiredLevel && crossRequirements
  }
}

function ensurePassiveWorkflowJobs(state, building) {
  for (const workflow of Object.values(state.buildingWorkflows ?? {})) {
    if (workflow.host_building !== building.id) continue
    if (!workflow.visible || workflow.workflow_mode !== 'passive') continue

    const hasExistingJob = (building.workflow_queue ?? []).some(
      (job) => job.workflow_id === workflow.id && job.passive
    )
    if (hasExistingJob) continue

    building.workflow_queue.push(createWorkflowJob(state, building, workflow, {
      passive: true,
      inputs_committed: false,
    }))
  }
}

function decayBuildingMomentum(building, workflow, dt) {
  if (!workflow?.momentum_config) return
  building.momentum = Math.max(
    0,
    Number(building.momentum ?? 0) - (Number(workflow.momentum_config.decay_per_idle_tick ?? 0) * dt)
  )
}

// ── Build a building (or upgrade to next level) ───────────────────────────────
export function buildBuilding(state, buildingId) {
  const bld = state.buildings[buildingId]
  if (!bld) return { ok: false, reason: 'Building not found.' }
  if (bld.level >= bld.max_level) return { ok: false, reason: 'Already at max level.' }

  const nextLevel = bld.level // 0-indexed into levels array
  const levelData = bld.levels[nextLevel]
  if (!levelData) return { ok: false, reason: 'No level data configured.' }

  const cost = levelData.build_cost ?? []
  if (!canAfford(state, cost)) return { ok: false, reason: 'Not enough resources.' }

  spend(state, cost)
  bld.level += 1

  // Unlock any nodes this level reveals
  for (const nodeId of levelData.unlock_node_ids ?? []) {
    unlockNode(state, nodeId)
  }

  refreshWorkflowUnlocksForBuilding(state, buildingId)
  addToEventLog(state, `${bld.label} upgraded to level ${bld.level}.`, 'success')
  checkActProgress(state)
  return { ok: true }
}

// ── Recruit a hero ────────────────────────────────────────────────────────────
export function recruitHero(state, classId) {
  const cls = state.heroClasses[classId]
  if (!cls) return { ok: false, reason: 'Class not found.' }

  // Check unlock conditions
  const locked = (cls.unlock_conditions ?? []).some((c) => !evaluateCondition(state, c))
  if (locked) return { ok: false, reason: 'Conditions not met.' }

  if (!canAfford(state, cls.recruit_cost ?? [])) return { ok: false, reason: 'Not enough resources.' }
  spend(state, cls.recruit_cost ?? [])

  const NAMES = ['Aldric', 'Brienna', 'Corvin', 'Dasha', 'Emrick', 'Fyra', 'Gareth', 'Hilde', 'Iven', 'Jora']
  const name = NAMES[Math.floor(Math.random() * NAMES.length)] + ' ' + Math.floor(Math.random() * 100)

  const hero = {
    id: `hero-${Date.now()}`,
    class_id: classId,
    name,
    level: 1,
    xp: 0,
    xp_next: xpRequired(1),
    statuses: [],
    status: 'ready',
    consecutive_runs: 0,
    recovery_at: null,
    curse_clears_at: null,
    equipment: {},   // slot → item_id
    stats: {},
  }

  syncHeroStats(state, hero)
  refreshHeroStatus(hero)
  state.heroes.push(hero)
  addToEventLog(state, `${name} the ${cls.label} joins the guild!`, 'success')
  return { ok: true, hero }
}

export function computeHeroStats(cls, level) {
  const base = cls.base_stats ?? {}
  const growth = cls.stat_growth ?? {}
  const stats = {}
  for (const [stat, val] of Object.entries(base)) {
    stats[stat] = val + (growth[stat] ?? 0) * (level - 1)
  }
  return stats
}

// ── Equip an item on a hero ───────────────────────────────────────────────────
export function equipItem(state, heroId, itemId) {
  const hero = state.heroes.find((h) => h.id === heroId)
  const item = state.itemDefs[itemId]
  if (!hero || !item) return { ok: false, reason: 'Hero or item not found.' }
  if (item.subtype !== 'equipment') return { ok: false, reason: 'Not an equipment item.' }
  if (!(state.inventory[itemId] > 0)) return { ok: false, reason: 'Item not in inventory.' }

  const slot = item.slot
  const cls = state.heroClasses[hero.class_id]
  if (!cls.slots?.includes(slot)) return { ok: false, reason: `${cls.label} cannot use ${slot} slot.` }

  // Unequip current item in slot
  if (hero.equipment[slot]) {
    giveItem(state, hero.equipment[slot], 1)
  }

  hero.equipment[slot] = itemId
  state.inventory[itemId] = (state.inventory[itemId] ?? 1) - 1

  // Recompute stats with equipment modifiers
  syncHeroStats(state, hero)

  return { ok: true }
}

export function unequipItem(state, heroId, slot) {
  const hero = state.heroes.find((h) => h.id === heroId)
  if (!hero) return { ok: false, reason: 'Hero not found.' }

  const itemId = hero.equipment?.[slot]
  if (!itemId) return { ok: false, reason: 'No item equipped in that slot.' }

  giveItem(state, itemId, 1)
  delete hero.equipment[slot]

  syncHeroStats(state, hero)

  return { ok: true }
}

// ── Buy an upgrade ────────────────────────────────────────────────────────────
export function buyUpgrade(state, upgradeId) {
  const upg = state.upgrades[upgradeId]
  if (!upg) return { ok: false, reason: 'Upgrade not found.' }
  if (upg.tier >= upg.max_tier) return { ok: false, reason: 'Already at max tier.' }

  const cost = upg.cost ?? []
  if (!canAfford(state, cost)) return { ok: false, reason: 'Not enough resources.' }

  spend(state, cost)
  upg.tier += 1

  // Apply effects to multipliers
  applyUpgradeEffect(state, upg.effect ?? {})
  addToEventLog(state, `Upgrade "${upg.label}" purchased (tier ${upg.tier}).`, 'success')

  // Unlock any nodes
  for (const nodeId of upg.effect?.unlock_node_ids ?? []) {
    unlockNode(state, nodeId)
  }

  return { ok: true }
}

function applyUpgradeEffect(state, effect) {
  const m = state.multipliers

  for (const [resId, mult] of Object.entries(effect.resource_cap_multiplier ?? {})) {
    m.resource_cap[resId] = (m.resource_cap[resId] ?? 1) * mult
  }
  for (const [resId, mult] of Object.entries(effect.resource_income_multiplier ?? {})) {
    m.resource_income[resId] = (m.resource_income[resId] ?? 1) * mult
  }
  for (const [stat, mod] of Object.entries(effect.hero_stat_modifier ?? {})) {
    m.hero_stats[stat] = (m.hero_stats[stat] ?? 0) + mod
  }
  if (effect.expedition_success_bonus) {
    m.expedition_success = (m.expedition_success ?? 0) + effect.expedition_success_bonus
  }
  if (effect.craft_speed_multiplier) {
    m.craft_speed = (m.craft_speed ?? 1) * effect.craft_speed_multiplier
  }
  if (effect.loot_bonus_pct) {
    m.loot_bonus_pct = (m.loot_bonus_pct ?? 0) + effect.loot_bonus_pct
  }

  if (effect.hero_stat_modifier && Object.keys(effect.hero_stat_modifier).length > 0) {
    syncAllHeroStats(state)
  }
}

// ── Crafting system ───────────────────────────────────────────────────────────
export function startCraft(state, buildingId, recipeId) {
  const legacyBuilding = state.buildings[buildingId]
  const legacyRecipe = state.recipes[recipeId]

  if (legacyBuilding && legacyRecipe) {
    if (!legacyBuilding.is_crafting_station) return { ok: false, reason: 'Not a crafting station.' }

    const levelData = legacyBuilding.levels[legacyBuilding.level - 1]
    const maxSlots = levelData?.recipe_slots ?? 1
    if (legacyBuilding.craft_queue.length >= maxSlots) return { ok: false, reason: 'Crafting queue is full.' }

    if (!spendItems(state, legacyRecipe.inputs)) return { ok: false, reason: 'Missing ingredients.' }

    legacyBuilding.craft_queue.push({
      recipe_id: recipeId,
      progress_s: 0,
      total_s: legacyRecipe.craft_time_s ?? 10,
    })

    return { ok: true }
  }

  const building = state.buildings?.[buildingId]
  const recipe = state.craftingRecipes?.[recipeId]
  const workflow = recipe ? state.buildingWorkflows?.[recipe.required_workflow ?? recipe.workflow_id] : null
  if (!building || !recipe || !workflow) return { ok: false, reason: 'Building or recipe not found.' }
  if (!building.has_workflows) return { ok: false, reason: 'This building does not support workflows.' }

  refreshWorkflowUnlocksForBuilding(state, buildingId)
  if (workflow.host_building !== buildingId || workflow.visible === false || recipe.visible === false) {
    return { ok: false, reason: 'Workflow or recipe is locked.' }
  }

  const maxSlots = Math.max(1, workflow.batch_config?.max_size ?? 1)
  if ((building.workflow_queue?.length ?? 0) >= maxSlots) {
    return { ok: false, reason: 'Workflow queue is full.' }
  }

  const job = createWorkflowJob(state, building, workflow, {
    recipe_id: recipe.id,
    batch_size: recipe.output_quantity ?? 1,
  })
  if (!ensureJobInputsCommitted(state, building, workflow, job)) {
    return { ok: false, reason: 'Missing resources.' }
  }

  building.workflow_queue.push(job)
  return { ok: true }
}

export function tickCrafting(state, dt) {
  for (const bld of Object.values(state.buildings)) {
    if (!bld.is_crafting_station || bld.level === 0) continue
    const speedMult = state.multipliers.craft_speed ?? 1

    for (const job of bld.craft_queue) {
      job.progress_s += dt * speedMult
    }

    // Complete finished jobs
    const completed = bld.craft_queue.filter((j) => j.progress_s >= j.total_s)
    bld.craft_queue = bld.craft_queue.filter((j) => j.progress_s < j.total_s)

    for (const job of completed) {
      const recipe = state.recipes[job.recipe_id]
      if (recipe) {
        const outputId = recipe.output_item_id ?? recipe.output_item
        const outputQty = recipe.output_qty ?? recipe.output_quantity ?? 1
        if (state.resources?.[outputId]) {
          gain(state, { [outputId]: outputQty })
        } else {
          giveItem(state, outputId, outputQty)
        }

        const outputLabel = state.resources?.[outputId]?.label
          ?? state.itemDefs?.[outputId]?.label
          ?? outputId
        addToEventLog(state, `Crafted: ${outputLabel}.`, 'info')
      }
    }
  }
}

export function processBuildingTick(state, dt) {
  for (const building of Object.values(state.buildings ?? {})) {
    if (!building.has_workflows || building.level === 0) continue

    refreshWorkflowUnlocksForBuilding(state, building.id)
    ensurePassiveWorkflowJobs(state, building)

    const nextQueue = []
    let processedAnyJob = false
    let momentumWorkflow = null

    for (const job of building.workflow_queue ?? []) {
      const workflow = state.buildingWorkflows?.[job.workflow_id]
      if (!workflow || workflow.host_building !== building.id) continue
      if (!momentumWorkflow && workflow.momentum_config) momentumWorkflow = workflow

      if (!ensureJobInputsCommitted(state, building, workflow, job)) {
        nextQueue.push(job)
        continue
      }

      if (!(job.total_s > 0)) {
        job.total_s = computeWorkflowDuration(state, building, workflow, job)
      }

      const speedMultiplier = computeWorkflowSpeedMultiplier(state, building, workflow, job)
      job.progress_s = Number(job.progress_s ?? 0) + (dt * speedMultiplier)
      processedAnyJob = true

      if (job.progress_s < job.total_s) {
        nextQueue.push(job)
        continue
      }

      const keepJob = resolveWorkflowJobCompletion(state, building, workflow, job)
      if (keepJob) {
        nextQueue.push(job)
      }
    }

    building.workflow_queue = nextQueue

    if (!processedAnyJob && momentumWorkflow) {
      decayBuildingMomentum(building, momentumWorkflow, dt)
    }
  }
}

// ── Save/Load ─────────────────────────────────────────────────────────────────
function getBuffTargets(state, partyHeroes, buffConfig) {
  if (buffConfig.apply_scope === 'party') {
    return partyHeroes
  }
  if (buffConfig.apply_scope === 'hero_class') {
    return partyHeroes.filter((hero) => hero.class_id === buffConfig.apply_target)
  }
  return partyHeroes.length ? [partyHeroes[0]] : []
}

function applyBuffToHero(state, hero, itemId, buffConfig) {
  hero.active_buffs = hero.active_buffs ?? []
  const existing = hero.active_buffs.find((buff) => buff.item_id === itemId)

  if (existing) {
    if (buffConfig.stack_behavior === 'extend') {
      existing.remaining += Number(buffConfig.duration_value ?? 1)
    } else if (buffConfig.stack_behavior === 'intensify') {
      existing.stacks = Math.min(
        Number(buffConfig.stack_cap ?? existing.stacks + 1),
        Number(existing.stacks ?? 1) + 1
      )
      existing.remaining = Math.max(existing.remaining, Number(buffConfig.duration_value ?? 1))
    } else {
      existing.remaining = Number(buffConfig.duration_value ?? 1)
    }
    syncHeroStats(state, hero)
    return
  }

  hero.active_buffs.push(normalizeBuffRecord({
    item_id: itemId,
    duration_type: buffConfig.duration_type,
    remaining: Number(buffConfig.duration_value ?? 1),
    effect: { ...buffConfig.effect },
    stack_behavior: buffConfig.stack_behavior ?? 'refresh',
    stack_cap: buffConfig.stack_cap ?? null,
    stacks: 1,
    buff_slot_cost: buffConfig.buff_slot_cost ?? 1,
  }))
  syncHeroStats(state, hero)
}

export function applyPreExpeditionBuffs(state, heroIds) {
  const partyHeroes = (heroIds ?? [])
    .map((heroId) => state.heroes.find((hero) => hero.id === heroId))
    .filter(Boolean)
  if (!partyHeroes.length) return 0

  let appliedCount = 0
  for (const [itemId, quantity] of Object.entries(state.buff_stockpile ?? {})) {
    if (!(quantity > 0)) continue
    const itemDef = state.itemDefs?.[itemId]
    const buffConfig = itemDef?.consumable_config
    if (!buffConfig) continue

    const targets = getBuffTargets(state, partyHeroes, buffConfig)
    if (!targets.length) continue
    if (!consumeFromBuffStockpile(state, itemId, 1)) continue

    for (const hero of targets) {
      applyBuffToHero(state, hero, itemId, buffConfig)
    }
    appliedCount += 1
  }

  if (appliedCount > 0) {
    addToEventLog(state, `Applied ${appliedCount} consumable buff${appliedCount === 1 ? '' : 's'} before departure.`, 'info')
  }

  return appliedCount
}

export function advanceHeroBuffDurations(state, heroIds, wasSuccessful) {
  for (const heroId of heroIds ?? []) {
    const hero = state.heroes.find((entry) => entry.id === heroId)
    if (!hero) continue

    let changed = false
    hero.active_buffs = (hero.active_buffs ?? []).filter((buff) => {
      if (!buff) return false
      if (buff.duration_type === 'permanent_until_death') return true
      if (buff.duration_type === 'expedition_success' && !wasSuccessful) return true

      changed = true
      const nextRemaining = Number(buff.remaining ?? 0) - 1
      return nextRemaining > 0
        ? ((buff.remaining = nextRemaining), true)
        : false
    })

    if (changed) {
      syncHeroStats(state, hero)
    }
  }
}

export function saveGame(state) {
  const saveData = {
    version: 2,
    savedAt: Date.now(),
    projectTitle: state.meta.title,
    resources: Object.fromEntries(
      Object.entries(state.resources).map(([id, r]) => [id, r.amount])
    ),
    inventory: { ...state.inventory },
    buff_stockpile: { ...(state.buff_stockpile ?? {}) },
    heroes: state.heroes,
    recruitPool: state.recruitPool ?? [],
    buildings: Object.fromEntries(
      Object.entries(state.buildings).map(([id, b]) => [
        id,
        {
          level: b.level,
          craft_queue: b.craft_queue,
          workflow_queue: b.workflow_queue,
          artisan_assigned: b.artisan_assigned,
          momentum: b.momentum,
          streak_count: b.streak_count,
          visible: b.visible,
        },
      ])
    ),
    buildingWorkflows: Object.fromEntries(
      Object.entries(state.buildingWorkflows ?? {}).map(([id, workflow]) => [
        id,
        { visible: workflow.visible },
      ])
    ),
    buildingUpgrades: Object.fromEntries(
      Object.entries(state.buildingUpgrades ?? {}).map(([id, upgrade]) => [
        id,
        { completed: upgrade.completed, visible: upgrade.visible },
      ])
    ),
    upgrades: Object.fromEntries(
      Object.entries(state.upgrades).map(([id, u]) => [id, { tier: u.tier, visible: u.visible }])
    ),
    expeditions: Object.fromEntries(
      Object.entries(state.expeditions).map(([id, e]) => [id, {
        visible: e.visible,
        completed: e.completed,
        best_tier: e.best_tier ?? null,
      }])
    ),
    acts: Object.fromEntries(
      Object.entries(state.acts).map(([id, a]) => [id, {
        completed: a.completed,
        visible: a.visible,
      }])
    ),
    factions: Object.fromEntries(
      Object.entries(state.factions).map(([id, f]) => [id, { rep: f.rep }])
    ),
    multipliers: JSON.parse(JSON.stringify(state.multipliers)),
  }

  try {
    localStorage.setItem('guild-engine-save', JSON.stringify(saveData))
    return true
  } catch {
    return false
  }
}

export function loadSave(state) {
  try {
    const raw = localStorage.getItem('guild-engine-save')
    if (!raw) return false
    const save = JSON.parse(raw)

    // Restore amounts
    for (const [id, amount] of Object.entries(save.resources ?? {})) {
      if (state.resources[id]) state.resources[id].amount = amount
    }
    state.inventory = save.inventory ?? {}
    state.buff_stockpile = save.buff_stockpile ?? {}
    state.heroes = (save.heroes ?? []).map((hero) => normalizeHeroRecord(state, hero))
    state.recruitPool = (save.recruitPool ?? []).map((hero) => normalizeHeroRecord(state, hero))

    for (const [id, data] of Object.entries(save.buildings ?? {})) {
      if (state.buildings[id]) Object.assign(state.buildings[id], data)
    }
    for (const [id, data] of Object.entries(save.buildingWorkflows ?? {})) {
      if (state.buildingWorkflows?.[id]) Object.assign(state.buildingWorkflows[id], data)
    }
    for (const [id, data] of Object.entries(save.buildingUpgrades ?? {})) {
      if (state.buildingUpgrades?.[id]) Object.assign(state.buildingUpgrades[id], data)
    }
    for (const [id, data] of Object.entries(save.upgrades ?? {})) {
      if (state.upgrades[id]) Object.assign(state.upgrades[id], data)
    }
    for (const [id, data] of Object.entries(save.expeditions ?? {})) {
      if (state.expeditions[id]) Object.assign(state.expeditions[id], data)
    }
    for (const [id, data] of Object.entries(save.acts ?? {})) {
      if (state.acts[id]) Object.assign(state.acts[id], data)
    }
    for (const [id, data] of Object.entries(save.factions ?? {})) {
      if (state.factions[id]) Object.assign(state.factions[id], data)
    }

    if (save.multipliers) {
      state.multipliers = JSON.parse(JSON.stringify(save.multipliers))
    } else {
      for (const upg of Object.values(state.upgrades)) {
        for (let t = 0; t < upg.tier; t++) {
          applyUpgradeEffect(state, upg.effect ?? {})
        }
      }
    }

    for (const buildingId of Object.keys(state.buildings ?? {})) {
      refreshWorkflowUnlocksForBuilding(state, buildingId)
    }
    syncAllHeroStats(state)
    checkActProgress(state, { silent: true })

    return true
  } catch {
    return false
  }
}
