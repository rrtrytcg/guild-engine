import { canAfford, spend, gain } from './resources.js'
import { rollLootTable, formatDrops } from './loot.js'
import {
  addHeroStatus,
  advanceHeroBuffDurations,
  applyPreExpeditionBuffs,
  clearExpiredHeroStatuses,
  completePartyRun,
  getHeroEffectiveStats,
  getHeroStatuses,
  grantPartyXp,
  handleWipeDeaths,
  hasHeroStatus,
  isCombatEligibleHero,
  startPartyRun,
} from './buildings.js'

const STATUS_MULTIPLIERS = {
  ready: 1,
  inspired: 1.15,
  exhausted: 0.9,
  cursed: 0.8,
  injured: 0.6,
}

const OUTCOME_TIERS = ['WIPE', 'FAIL', 'NARROW_SUCCESS', 'CLEAN_SUCCESS', 'DOMINANT']
const TIER_RANK = Object.fromEntries(OUTCOME_TIERS.map((tier, index) => [tier, index]))

const READINESS_META = {
  locked: { key: 'locked', label: 'Locked', icon: '🔒', color: '#666680' },
  empty: { key: 'empty', label: 'No heroes', icon: '•', color: '#444460' },
  WIPE: { key: 'WIPE', label: 'Wipe risk', icon: '💀', color: '#444444' },
  FAIL: { key: 'FAIL', label: 'Likely fail', icon: '✕', color: '#E24B4A' },
  NARROW_SUCCESS: { key: 'NARROW_SUCCESS', label: 'Risky', icon: '⚠', color: '#BA7517' },
  CLEAN_SUCCESS: { key: 'CLEAN_SUCCESS', label: 'Ready', icon: '✓', color: '#1D9E75' },
  DOMINANT: { key: 'DOMINANT', label: 'Dominant', icon: '★', color: '#EF9F27' },
}

export function addToEventLog(state, text, type = 'info') {
  state.eventLog.unshift({ ts: Date.now(), text, type })
  if (state.eventLog.length > 200) {
    state.eventLog.length = 200
  }
}

function getExpedition(state, expeditionOrId) {
  if (!expeditionOrId) return null
  if (typeof expeditionOrId === 'string') return state.expeditions?.[expeditionOrId] ?? null
  return expeditionOrId
}

function isHeroOnActiveRun(state, heroId) {
  return state.activeRuns?.some((run) => !run.done && run.party?.includes(heroId))
}

function isSelectableAutoHero(state, hero) {
  if (!hero || hasHeroStatus(hero, 'dead')) return false
  if (!isCombatEligibleHero(state, hero)) return false
  if (isHeroOnActiveRun(state, hero.id)) return false
  return hero.status === 'ready' || hero.status === 'inspired'
}

export function selectAutoPartyHeroes(state, expeditionOrId) {
  const expedition = getExpedition(state, expeditionOrId)
  if (!expedition) return []

  const partySize = expedition.party_size ?? 0
  return state.heroes
    .filter((hero) => isSelectableAutoHero(state, hero))
    .slice(0, partySize)
    .map((hero) => hero.id)
}

function computeStatusMultiplier(hero) {
  return getHeroStatuses(hero).reduce(
    (multiplier, status) => multiplier * (STATUS_MULTIPLIERS[status] ?? 1),
    1
  )
}

export function computePartyMetrics(state, heroIds) {
  const members = []
  let partyPower = 0
  let partySumAtk = 0
  let partySumSpd = 0
  let partySumLck = 0
  let partyMinHp = Infinity

  for (const heroId of heroIds ?? []) {
    const hero = state.heroes.find((entry) => entry.id === heroId)
    if (!hero || hasHeroStatus(hero, 'dead')) continue

    const statusMultiplier = computeStatusMultiplier(hero)
    const baseStats = hero.stats ?? {}
    const effectiveStats = getHeroEffectiveStats(hero)
    const basePower =
      (baseStats.attack ?? 0) * 1 +
      (baseStats.defense ?? 0) * 0.8 +
      (baseStats.speed ?? 0) * 0.5 +
      (baseStats.hp ?? 0) * 0.3 +
      (baseStats.luck ?? 0) * 0.2

    partyPower += basePower * statusMultiplier
    partySumAtk += effectiveStats.attack ?? 0
    partySumSpd += effectiveStats.speed ?? 0
    partySumLck += effectiveStats.luck ?? 0
    partyMinHp = Math.min(partyMinHp, effectiveStats.hp ?? 0)

    members.push({
      heroId: hero.id,
      name: hero.name,
      class_id: hero.class_id,
      level: hero.level ?? 1,
      status: hero.status,
      statuses: getHeroStatuses(hero),
      baseStats: { ...baseStats },
      effectiveStats,
      statusMultiplier,
      basePower,
    })
  }

  const count = members.length
  return {
    members,
    partySize: count,
    partyPower,
    partySumAtk,
    partyAvgSpd: count ? partySumSpd / count : 0,
    partyAvgLck: count ? partySumLck / count : 0,
    partyMinHp: count ? partyMinHp : 0,
  }
}

function getReadinessMeta(key) {
  return READINESS_META[key] ?? READINESS_META.locked
}

export function summarizeExpeditionReadiness(state, expeditionOrId, heroIds = null) {
  const expedition = getExpedition(state, expeditionOrId)
  if (!expedition) {
    return {
      ...READINESS_META.locked,
      barPct: 0,
      locked: true,
      selectableParty: [],
      partyHeroes: [],
      partyPower: 0,
      partySumAtk: 0,
      partyAvgSpd: 0,
      partyAvgLck: 0,
      partyMinHp: 0,
      powerRatio: 0,
      shortParty: false,
    }
  }

  if (!expedition.visible) {
    return {
      ...READINESS_META.locked,
      barPct: 0,
      locked: true,
      selectableParty: [],
      partyHeroes: [],
      partyPower: 0,
      partySumAtk: 0,
      partyAvgSpd: 0,
      partyAvgLck: 0,
      partyMinHp: 0,
      powerRatio: 0,
      shortParty: false,
    }
  }

  const selectableParty = Array.isArray(heroIds)
    ? Array.from(new Set(heroIds.filter(Boolean)))
    : selectAutoPartyHeroes(state, expedition)
  if (!selectableParty.length) {
    return {
      ...READINESS_META.empty,
      barPct: 0,
      locked: false,
      selectableParty: [],
      partyHeroes: [],
      partyPower: 0,
      partySumAtk: 0,
      partyAvgSpd: 0,
      partyAvgLck: 0,
      partyMinHp: 0,
      powerRatio: 0,
      shortParty: false,
    }
  }

  const metrics = computePartyMetrics(state, selectableParty)
  const threshold = Math.max(1, (expedition.level ?? 1) * 10)
  const powerRatio = metrics.partyPower / threshold
  const wipeThreshold = Math.max(1, (expedition.enemy_atk ?? 0) * 0.8)
  const isWipeRisk = metrics.partyMinHp < wipeThreshold

  let meta = READINESS_META.CLEAN_SUCCESS
  let barPct = Math.min(100, (powerRatio / 1.3) * 100)

  if (isWipeRisk) {
    meta = READINESS_META.WIPE
    barPct = Math.min(100, (metrics.partyMinHp / wipeThreshold) * 100)
  } else if (powerRatio < 0.6) {
    meta = READINESS_META.FAIL
  } else if (powerRatio < 0.9) {
    meta = READINESS_META.NARROW_SUCCESS
  } else if (powerRatio < 1.3) {
    meta = READINESS_META.CLEAN_SUCCESS
  } else {
    meta = READINESS_META.DOMINANT
  }

  return {
    ...meta,
    barPct,
    locked: false,
    selectableParty,
    partyHeroes: metrics.members,
    partyPower: metrics.partyPower,
    partySumAtk: metrics.partySumAtk,
    partyAvgSpd: metrics.partyAvgSpd,
    partyAvgLck: metrics.partyAvgLck,
    partyMinHp: metrics.partyMinHp,
    powerRatio,
    shortParty: selectableParty.length < (expedition.party_size ?? selectableParty.length),
  }
}

function computeEffectiveDuration(expedition, partyAvgSpd) {
  const baseDuration = expedition.duration_s ?? 60
  return Math.max(1, baseDuration * Math.max(0.4, 1 - partyAvgSpd / 200))
}

function applyTimedStatus(hero, status, clearAt, timerField) {
  addHeroStatus(hero, status)
  if (timerField) {
    hero[timerField] = hero[timerField] ? Math.max(hero[timerField], clearAt) : clearAt
  }
}

function applyHeroStatusFromOutcome(hero, status, expeditionLevel, nowMs) {
  if (!status || status === 'none') return

  if (status === 'injured') {
    const clearAt = nowMs + Math.ceil(expeditionLevel / 2) * 60 * 1000
    applyTimedStatus(hero, 'injured', clearAt, 'recovery_at')
    return
  }

  if (status === 'cursed') {
    const clearAt = nowMs + expeditionLevel * 3 * 60 * 1000
    applyTimedStatus(hero, 'cursed', clearAt, 'curse_clears_at')
    return
  }

  if (status === 'inspired') {
    addHeroStatus(hero, 'inspired')
  }
}

function shouldApplyReward(on, tier) {
  if (on === 'any') return true
  if (on === 'dominant') return tier === 'DOMINANT'
  if (on === 'success') {
    return TIER_RANK[tier] >= TIER_RANK.NARROW_SUCCESS
  }
  return false
}

function applyRewardPackages(state, expedition, tier) {
  for (const reward of expedition.resource_rewards ?? []) {
    if (!reward?.resource_id || !shouldApplyReward(reward.on, tier)) continue
    gain(state, { [reward.resource_id]: reward.amount ?? 0 })
  }

  for (const reward of expedition.faction_rewards ?? []) {
    if (!reward?.faction_id || !shouldApplyReward(reward.on, tier)) continue
    const faction = state.factions?.[reward.faction_id]
    if (!faction) continue
    faction.rep = (faction.rep ?? 0) + (reward.rep ?? 0)
  }
}

function applyUnlocks(state, unlockIds) {
  for (const nodeId of unlockIds ?? []) {
    unlockNode(state, nodeId)
  }
}

function applyPartyRewardStatus(state, run, status, nowMs) {
  if (!run?.party?.length) return
  for (const heroId of run.party) {
    const hero = state.heroes.find((entry) => entry.id === heroId)
    if (!hero || hasHeroStatus(hero, 'dead')) continue
    applyHeroStatusFromOutcome(hero, status, run.expedition_level ?? 1, nowMs)
  }
}

function applyInjuryCheck(state, run, nowMs) {
  for (const member of run.partyMembers ?? []) {
    const hero = state.heroes.find((entry) => entry.id === member.heroId)
    if (!hero || hasHeroStatus(hero, 'dead')) continue

    const injuryChance = Math.max(0, 0.4 - ((member.effectiveStats.defense ?? 0) / 100))
    if (Math.random() < injuryChance) {
      const wasInjured = hasHeroStatus(hero, 'injured')
      applyHeroStatusFromOutcome(hero, 'injured', run.expedition_level ?? 1, nowMs)
      if (!wasInjured) {
        run.log.push({ ts: nowMs, text: `${hero.name} returns injured.` })
        addToEventLog(state, `${hero.name} returns injured from ${run.expedition_label}.`, 'danger')
      }
    }
  }
}

function applyCurseCheck(state, run, nowMs) {
  const curseChance = run.expedition_curse_chance ?? 0
  if (curseChance <= 0) return

  for (const heroId of run.party ?? []) {
    const hero = state.heroes.find((entry) => entry.id === heroId)
    if (!hero || hasHeroStatus(hero, 'dead')) continue

    if (Math.random() < curseChance) {
      const wasCursed = hasHeroStatus(hero, 'cursed')
      applyHeroStatusFromOutcome(hero, 'cursed', run.expedition_level ?? 1, nowMs)
      if (!wasCursed) {
        run.log.push({ ts: nowMs, text: `${hero.name} has been cursed.` })
        addToEventLog(state, `${hero.name} has been cursed in ${run.expedition_label}.`, 'danger')
      }
    }
  }
}

function applyChoiceOutcome(state, run, outcome = {}, nowMs = Date.now()) {
  if (outcome.resource_delta) {
    gain(state, outcome.resource_delta)
  }

  if (outcome.faction_rep_delta) {
    for (const [factionId, rep] of Object.entries(outcome.faction_rep_delta)) {
      const faction = state.factions?.[factionId]
      if (faction) faction.rep = (faction.rep ?? 0) + Number(rep || 0)
    }
  }

  if (outcome.unlock_node_ids?.length) {
    applyUnlocks(state, outcome.unlock_node_ids)
  }

  if (outcome.hero_status && outcome.hero_status !== 'none' && run?.party?.length) {
    applyPartyRewardStatus(state, run, outcome.hero_status, nowMs)
  }

  if (outcome.loot_table_id) {
    const drops = rollLootTable(state, outcome.loot_table_id)
    const dropText = formatDrops(state, drops)
    if (run) {
      run.log.push({ ts: nowMs, text: `Found: ${dropText}` })
    }
    addToEventLog(state, `Event reward: ${dropText}`, 'success')
  }

  if (outcome.log_message) {
    if (run) {
      run.log.push({ ts: nowMs, text: outcome.log_message })
    }
    addToEventLog(state, outcome.log_message, 'info')
  }
}

function fireEventNode(state, eventId, { silent = false } = {}) {
  const node = state._nodeMap?.get(eventId)
  if (!node || node.type !== 'event') return

  if (!silent) {
    if (node.log_message) {
      addToEventLog(state, node.log_message, 'system')
    } else {
      addToEventLog(state, `Event triggered: ${node.label}`, 'system')
    }
  }

  const choices = node.choices ?? []
  if (choices.length === 1) {
    applyChoiceOutcome(state, null, choices[0].outcome ?? {})
  }
}

function updateRunBossPhases(run) {
  const phases = run.boss_phases ?? []
  if (!phases.length || run.boss_hp_max <= 0) return

  const hpFrac = run.boss_hp / run.boss_hp_max
  while (run.boss_phase_idx < phases.length && hpFrac <= (phases[run.boss_phase_idx].hp_threshold ?? 0)) {
    const phase = phases[run.boss_phase_idx]
    run.boss_phase_idx += 1
    run.log.push({
      ts: Date.now(),
      text: phase.log_message || `${phase.label || `Phase ${phase.phase_number}`} begins!`,
    })
  }
}

function finalizeRun(state, run, tier) {
  const expedition = state.expeditions[run.expedition_id]
  if (!expedition || run.done) return

  const nowMs = Date.now()
  run.done = true
  run.resolved_at = nowMs
  run.outcome = tier
  run.result_tier = tier

  const xpBase = expedition.base_xp === null || expedition.base_xp === undefined
    ? (expedition.level ?? 1) * 15
    : expedition.base_xp
  const xpMultiplier = {
    WIPE: 0.5,
    FAIL: 0.5,
    NARROW_SUCCESS: 1,
    CLEAN_SUCCESS: 1.5,
    DOMINANT: 2,
  }[tier] ?? 1

  grantPartyXp(state, run.party ?? [], xpBase * xpMultiplier)
  applyRewardPackages(state, expedition, tier)

  if (tier === 'WIPE') {
    handleWipeDeaths(state, run.party ?? [], expedition.label, expedition.level ?? 1, nowMs)
    applyCurseCheck(state, run, nowMs)
    run.log.push({ ts: nowMs, text: 'The party is wiped out.' })
    addToEventLog(state, `"${expedition.label}" ended in a wipe.`, 'danger')
  } else if (tier === 'FAIL') {
    applyInjuryCheck(state, run, nowMs)
    applyCurseCheck(state, run, nowMs)
    if (expedition.fail_loot_table_id) {
      const drops = rollLootTable(state, expedition.fail_loot_table_id)
      const dropText = formatDrops(state, drops)
      run.log.push({ ts: nowMs, text: `Failure loot: ${dropText}` })
      addToEventLog(state, `"${expedition.label}" failed. Consolation: ${dropText}`, 'danger')
    } else {
      run.log.push({ ts: nowMs, text: 'The party returns empty-handed.' })
      addToEventLog(state, `"${expedition.label}" failed.`, 'danger')
    }
  } else {
    if (tier === 'NARROW_SUCCESS') {
      applyInjuryCheck(state, run, nowMs)
    }

    const lootTableId = expedition.loot_table_id
    const baseRolls = lootTableId ? 1 : 0
    const bonusRolls = tier === 'DOMINANT'
      ? Math.min(3, Math.max(0, Math.floor((run.partyAvgLck ?? 0) / 20)))
      : 0
    const drops = []

    for (let rollIndex = 0; rollIndex < baseRolls + bonusRolls; rollIndex++) {
      drops.push(...rollLootTable(state, lootTableId))
    }

    if (lootTableId) {
      const dropText = formatDrops(state, drops)
      const bonusText = bonusRolls > 0 ? ` + ${bonusRolls} bonus rolls` : ''
      run.log.push({ ts: nowMs, text: `Loot: ${dropText}${bonusText}` })
      addToEventLog(state, `"${expedition.label}" completed. Loot: ${dropText}${bonusText}`, 'success')
    } else {
      run.log.push({ ts: nowMs, text: 'Completed successfully.' })
      addToEventLog(state, `"${expedition.label}" completed.`, 'success')
    }
    if (tier !== 'FAIL' && tier !== 'WIPE') {
      applyUnlocks(state, expedition.on_success_unlock ?? [])
    }
  }

  advanceHeroBuffDurations(state, run.party ?? [], TIER_RANK[tier] >= TIER_RANK.NARROW_SUCCESS)
  completePartyRun(state, run.party ?? [])
  updateBestProgress(expedition, tier)
  checkActProgress(state)
}

function updateBestProgress(expedition, tier) {
  const rank = TIER_RANK[tier] ?? 0
  expedition.best_tier = Math.max(expedition.best_tier ?? 0, rank)
  if (rank >= TIER_RANK.NARROW_SUCCESS) {
    expedition.completed = true
  }
}

function resolveStandardOutcome(state, run) {
  const expedition = state.expeditions[run.expedition_id]
  const metrics = run.metrics ?? computePartyMetrics(state, run.party)

  if (metrics.partyMinHp < (expedition.enemy_atk ?? 0) * 0.8) {
    return 'WIPE'
  }

  const effectiveDuration = run.effective_duration_s ?? computeEffectiveDuration(expedition, metrics.partyAvgSpd)
  const atkNeeded = (expedition.enemy_hp ?? 0) / Math.max(1, effectiveDuration)
  const partyDps = metrics.partySumAtk * (1 + (state.multipliers.expedition_success ?? 0))
  if (partyDps < atkNeeded * 0.5) {
    return 'FAIL'
  }

  const threshold = Math.max(1, (expedition.level ?? 1) * 10)
  const powerRatio = metrics.partyPower / threshold
  if (powerRatio < 0.6) return 'FAIL'
  if (powerRatio < 0.9) return 'NARROW_SUCCESS'
  if (powerRatio < 1.3) return 'CLEAN_SUCCESS'
  return 'DOMINANT'
}

function resolveBossOutcome(state, run) {
  if (run.boss_hp === 0) return 'DOMINANT'
  return resolveStandardOutcome(state, run)
}

export function evaluateCondition(state, cond) {
  if (!cond || !cond.type) return false

  switch (cond.type) {
    case 'resource_gte': {
      const res = state.resources?.[cond.target_id]
      return !!res && (res.amount ?? 0) >= (cond.value ?? 0)
    }
    case 'building_level': {
      const bld = state.buildings?.[cond.target_id]
      return !!bld && (bld.level ?? 0) >= (cond.value ?? 0)
    }
    case 'act_reached': {
      const act = state.acts?.[cond.target_id]
      return !!act && !!act.completed
    }
    case 'faction_rep_gte': {
      const faction = state.factions?.[cond.target_id]
      return !!faction && (faction.rep ?? 0) >= (cond.value ?? 0)
    }
    case 'upgrade_owned': {
      const upgrade = state.upgrades?.[cond.target_id]
      return !!upgrade && (upgrade.tier ?? 0) >= (cond.value ?? 1)
    }
    case 'hero_count_gte':
      return (state.heroes?.length ?? 0) >= (cond.value ?? 0)
    case 'prestige_count_gte': {
      const prestige = state.prestige?.[cond.target_id] ?? Object.values(state.prestige ?? {})[0]
      return !!prestige && (prestige.count ?? 0) >= (cond.value ?? 0)
    }
    default:
      return false
  }
}

export function unlockNode(state, nodeId) {
  if (!nodeId) return

  if (state.buildingWorkflows?.[nodeId]) state.buildingWorkflows[nodeId].visible = true
  if (state.buildingUpgrades?.[nodeId]) state.buildingUpgrades[nodeId].visible = true
  if (state.craftingRecipes?.[nodeId]) state.craftingRecipes[nodeId].visible = true
  if (state.blueprints?.[nodeId]) state.blueprints[nodeId].visible = true
  if (state.buildings?.[nodeId]) state.buildings[nodeId].visible = true
  if (state.upgrades?.[nodeId]) state.upgrades[nodeId].visible = true
  if (state.expeditions?.[nodeId]) state.expeditions[nodeId].visible = true
  if (state.acts?.[nodeId]) state.acts[nodeId].visible = true
  if (state.events?.[nodeId]) state.events[nodeId].visible = true
}

function refreshProgressionVisibility(state) {
  const acts = Object.values(state.acts ?? {}).sort((a, b) => (a.act_number ?? 0) - (b.act_number ?? 0))
  let previousCompleted = true

  for (const act of acts) {
    const shouldBeVisible = (act.act_number ?? 0) === 1 || previousCompleted
    act.visible = !!act.completed || shouldBeVisible
    previousCompleted = !!act.completed
  }

  const expeditionToAct = new Map()
  const bossToAct = new Map()
  for (const act of acts) {
    for (const expeditionId of act.expedition_ids ?? []) {
      expeditionToAct.set(expeditionId, act.id)
    }
    if (act.boss_expedition_id) {
      bossToAct.set(act.boss_expedition_id, act.id)
    }
  }

  for (const expedition of Object.values(state.expeditions ?? {})) {
    const actId = expeditionToAct.get(expedition.id) ?? bossToAct.get(expedition.id)
    const act = actId ? state.acts?.[actId] : null
    const meetsOwnConditions = (expedition.unlock_conditions ?? []).every((cond) => evaluateCondition(state, cond))
    const unlockedByOwnConditions = !expedition.unlock_conditions?.length || meetsOwnConditions || expedition.visible

    if (act) {
      if (!act.visible) {
        expedition.visible = false
        continue
      }

      if (expedition.type === 'boss_expedition') {
        const regularComplete = (act.expedition_ids ?? []).every(
          (id) => (state.expeditions?.[id]?.best_tier ?? -1) >= TIER_RANK.NARROW_SUCCESS
        )
        expedition.visible = regularComplete && unlockedByOwnConditions
      } else {
        expedition.visible = unlockedByOwnConditions
      }
    } else {
      expedition.visible = unlockedByOwnConditions
    }
  }
}

export function checkActProgress(state, options = {}) {
  const { silent = false } = options
  const acts = Object.values(state.acts ?? {}).sort((a, b) => (a.act_number ?? 0) - (b.act_number ?? 0))

  for (const act of acts) {
    const expeditionIds = act.expedition_ids ?? []
    const bossId = act.boss_expedition_id
    const regularComplete = expeditionIds.every(
      (id) => (state.expeditions?.[id]?.best_tier ?? -1) >= TIER_RANK.NARROW_SUCCESS
    )
    const bossComplete = bossId
      ? (state.expeditions?.[bossId]?.best_tier ?? -1) >= TIER_RANK.NARROW_SUCCESS
      : false
    const extraConditionsMet = (act.completion_conditions ?? []).every((cond) => evaluateCondition(state, cond))
    const shouldComplete = regularComplete && bossComplete && extraConditionsMet

    if (shouldComplete && !act.completed) {
      act.completed = true
      if (!silent) {
        addToEventLog(
          state,
          act.narrative_log?.trim() ? act.narrative_log.trim() : `${act.label} complete.`,
          'system'
        )
      }

      for (const nodeId of act.unlocks_node_ids ?? []) {
        unlockNode(state, nodeId)
      }

      for (const eventId of act.on_complete_events ?? []) {
        fireEventNode(state, eventId, { silent })
      }
    }
  }

  refreshProgressionVisibility(state)
}

export function startExpedition(state, expeditionId, heroIds = null) {
  clearExpiredHeroStatuses(state)

  const expedition = state.expeditions?.[expeditionId]
  if (!expedition) return { ok: false, reason: 'Expedition not found.' }
  if (!expedition.visible) return { ok: false, reason: 'Expedition is locked.' }
  if (state.activeRuns?.some((run) => !run.done)) {
    return { ok: false, reason: 'Another expedition is already running.' }
  }

  const selectedIds = Array.from(new Set((Array.isArray(heroIds) ? heroIds : selectAutoPartyHeroes(state, expedition)).filter(Boolean)))
  if (!selectedIds.length) return { ok: false, reason: 'Select at least one hero.' }
  if (selectedIds.length > (expedition.party_size ?? selectedIds.length)) {
    return { ok: false, reason: `Max party size is ${expedition.party_size}.` }
  }

  const heroes = []
  for (const heroId of selectedIds) {
    const hero = state.heroes.find((entry) => entry.id === heroId)
    if (!hero) return { ok: false, reason: `Hero "${heroId}" not found.` }
    if (hasHeroStatus(hero, 'dead')) return { ok: false, reason: `${hero.name} cannot depart.` }
    if (!isCombatEligibleHero(state, hero)) return { ok: false, reason: `${hero.name} cannot join expeditions.` }
    heroes.push(hero)
  }

  if (!canAfford(state, expedition.entry_cost ?? [])) {
    return { ok: false, reason: 'Not enough resources.' }
  }

  spend(state, expedition.entry_cost ?? [])
  applyPreExpeditionBuffs(state, selectedIds)
  startPartyRun(state, selectedIds)

  const metrics = computePartyMetrics(state, selectedIds)
  const effectiveDuration = computeEffectiveDuration(expedition, metrics.partyAvgSpd)
  const nowMs = Date.now()
  const runId = `run-${nowMs}`
  const run = {
    run_id: runId,
    expedition_id: expedition.id,
    party: selectedIds,
    partyMembers: metrics.members,
    partyPower: metrics.partyPower,
    partySumAtk: metrics.partySumAtk,
    partyAvgSpd: metrics.partyAvgSpd,
    partyAvgLck: metrics.partyAvgLck,
    partyMinHp: metrics.partyMinHp,
    expedition_label: expedition.label,
    expedition_level: expedition.level ?? 1,
    expedition_curse_chance: expedition.curse_chance ?? 0,
    elapsed_s: 0,
    total_s: effectiveDuration,
    effective_duration_s: effectiveDuration,
    log: [{ ts: nowMs, text: `Party departs for "${expedition.label}".` }],
    done: false,
    outcome: null,
    result_tier: null,
    is_boss: expedition.type === 'boss_expedition',
    boss_hp: expedition.type === 'boss_expedition' ? (expedition.boss_hp ?? null) : null,
    boss_hp_max: expedition.type === 'boss_expedition' ? (expedition.boss_hp ?? null) : null,
    boss_phases: (expedition.phases ?? []).slice().sort((a, b) => (a.phase_number ?? 0) - (b.phase_number ?? 0)),
    boss_phase_idx: 0,
    pending_event: null,
    last_event_window: -1,
    resolved_at: null,
  }

  state.activeRuns.push(run)
  state.ui.activeRunId = runId
  state.ui.screen = 'expedition'
  addToEventLog(state, `Party departs for "${expedition.label}".`, 'info')
  return { ok: true, runId }
}

function tryFireEvent(state, run) {
  const expedition = state.expeditions?.[run.expedition_id]
  const events = expedition?.events ?? []
  if (!events.length) return

  const eventWindow = Math.floor(run.elapsed_s / 8)
  if (eventWindow <= run.last_event_window) return
  run.last_event_window = eventWindow

  for (const eventDef of events) {
    if (eventDef.condition && !evaluateCondition(state, eventDef.condition)) continue
    if (Math.random() < (eventDef.trigger_chance ?? 0.3)) {
      run.pending_event = { event_def: eventDef }
      run.log.push({ ts: Date.now(), text: `⚡ ${eventDef.label}` })
      addToEventLog(state, `Event on "${expedition.label}": ${eventDef.label}`, 'info')
      break
    }
  }
}

function resolveRun(state, run) {
  const expedition = state.expeditions?.[run.expedition_id]
  if (!expedition || run.done) return

  const tier = run.is_boss ? resolveBossOutcome(state, run) : resolveStandardOutcome(state, run)
  finalizeRun(state, run, tier)
}

function settleBossDamage(state, run, dt) {
  if (!run.is_boss || run.boss_hp === null || run.boss_hp === undefined || run.boss_hp <= 0) return

  const bossDps = run.partySumAtk * (1 + (state.multipliers.expedition_success ?? 0))
  run.boss_hp = Math.max(0, run.boss_hp - bossDps * dt)
  updateRunBossPhases(run)
}

export function tickExpeditions(state, dt) {
  clearExpiredHeroStatuses(state)

  for (const run of state.activeRuns ?? []) {
    if (run.done || run.pending_event) continue

    run.elapsed_s += dt
    settleBossDamage(state, run, dt)
    tryFireEvent(state, run)

    if (run.elapsed_s >= run.total_s || (run.is_boss && run.boss_hp === 0)) {
      resolveRun(state, run)
    }
  }

  const cutoff = Date.now() - 30_000
  state.activeRuns = (state.activeRuns ?? []).filter(
    (run) => !run.done || (run.resolved_at && run.resolved_at > cutoff)
  )
}

export function resolveEventChoice(state, runId, choiceIndex) {
  const run = state.activeRuns?.find((entry) => entry.run_id === runId)
  if (!run || !run.pending_event) return

  const eventDef = run.pending_event.event_def
  const choice = eventDef?.choices?.[choiceIndex]
  if (!choice) return

  applyChoiceOutcome(state, run, choice.outcome ?? {})
  run.pending_event = null
}
