import { canAfford, spend, gain, giveItem, spendItems } from './resources.js'
import { addToEventLog, checkActProgress, unlockNode, evaluateCondition } from './expeditions.js'

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
    xp_next: 100,
    status: 'ready', // 'ready' | 'on_expedition' | 'injured'
    equipment: {},   // slot → item_id
    stats: computeHeroStats(cls, 1),
  }

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
  hero.stats = computeHeroStats(cls, hero.level)
  for (const equipped of Object.values(hero.equipment)) {
    const equippedDef = state.itemDefs[equipped]
    for (const [stat, mod] of Object.entries(equippedDef?.stat_modifiers ?? {})) {
      hero.stats[stat] = (hero.stats[stat] ?? 0) + mod
    }
  }

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
}

// ── Crafting system ───────────────────────────────────────────────────────────
export function startCraft(state, buildingId, recipeId) {
  const bld = state.buildings[buildingId]
  const recipe = state.recipes[recipeId]
  if (!bld || !recipe) return { ok: false, reason: 'Building or recipe not found.' }
  if (!bld.is_crafting_station) return { ok: false, reason: 'Not a crafting station.' }

  const levelData = bld.levels[bld.level - 1]
  const maxSlots = levelData?.recipe_slots ?? 1
  if (bld.craft_queue.length >= maxSlots) return { ok: false, reason: 'Crafting queue is full.' }

  if (!spendItems(state, recipe.inputs)) return { ok: false, reason: 'Missing ingredients.' }

  bld.craft_queue.push({
    recipe_id: recipeId,
    progress_s: 0,
    total_s: recipe.craft_time_s ?? 10,
  })

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
        giveItem(state, recipe.output_item_id, recipe.output_qty ?? 1)
        const itemDef = state.itemDefs[recipe.output_item_id]
        addToEventLog(state, `Crafted: ${itemDef?.label ?? recipe.output_item_id}.`, 'info')
      }
    }
  }
}

// ── Save/Load ─────────────────────────────────────────────────────────────────
export function saveGame(state) {
  const saveData = {
    version: 1,
    savedAt: Date.now(),
    projectTitle: state.meta.title,
    resources: Object.fromEntries(
      Object.entries(state.resources).map(([id, r]) => [id, r.amount])
    ),
    inventory: { ...state.inventory },
    heroes: state.heroes,
    buildings: Object.fromEntries(
      Object.entries(state.buildings).map(([id, b]) => [
        id,
        { level: b.level, craft_queue: b.craft_queue, visible: b.visible },
      ])
    ),
    upgrades: Object.fromEntries(
      Object.entries(state.upgrades).map(([id, u]) => [id, { tier: u.tier, visible: u.visible }])
    ),
    expeditions: Object.fromEntries(
      Object.entries(state.expeditions).map(([id, e]) => [id, { visible: e.visible }])
    ),
    acts: Object.fromEntries(
      Object.entries(state.acts).map(([id, a]) => [id, { completed: a.completed }])
    ),
    factions: Object.fromEntries(
      Object.entries(state.factions).map(([id, f]) => [id, { rep: f.rep }])
    ),
    multipliers: state.multipliers,
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
    state.heroes = save.heroes ?? []

    for (const [id, data] of Object.entries(save.buildings ?? {})) {
      if (state.buildings[id]) Object.assign(state.buildings[id], data)
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

    // Re-apply upgrade multipliers from saved tiers
    for (const upg of Object.values(state.upgrades)) {
      for (let t = 0; t < upg.tier; t++) {
        applyUpgradeEffect(state, upg.effect ?? {})
      }
    }

    return true
  } catch {
    return false
  }
}
