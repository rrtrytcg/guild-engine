import { rollLootTable, formatDrops } from './loot.js'
import { gain } from './resources.js'

// ── Start a run ───────────────────────────────────────────────────────────────
export function startExpedition(state, expeditionId, heroIds) {
  const def = state.expeditions[expeditionId]
  if (!def) return { ok: false, reason: 'Expedition not found.' }
  if (heroIds.length === 0) return { ok: false, reason: 'Select at least one hero.' }
  if (heroIds.length > def.party_size) return { ok: false, reason: `Max party size is ${def.party_size}.` }

  const runId = `run-${Date.now()}`
  const run = {
    run_id: runId,
    expedition_id: expeditionId,
    party: heroIds,
    elapsed_s: 0,
    total_s: def.duration_s,
    log: [{ ts: Date.now(), text: `Party departs for "${def.label}".` }],
    done: false,
    outcome: null,       // 'success' | 'failure' | null while running
    // Boss-specific
    is_boss: def.type === 'boss_expedition',
    boss_hp: def.boss_hp ?? null,
    boss_hp_max: def.boss_hp ?? null,
    phase_idx: 0,
    pending_event: null, // { event_def, choices } waiting for player choice
  }

  state.activeRuns.push(run)
  state.ui.activeRunId = runId
  state.ui.screen = 'expedition'
  return { ok: true, runId }
}

// ── Tick all active runs ──────────────────────────────────────────────────────
export function tickExpeditions(state, dt) {
  for (const run of state.activeRuns) {
    if (run.done || run.pending_event) continue

    run.elapsed_s += dt

    // Boss HP drain (heroes chip away at boss proportional to party stats)
    if (run.is_boss && run.boss_hp !== null) {
      const dps = calcPartyDps(state, run.party)
      run.boss_hp = Math.max(0, run.boss_hp - dps * dt)
      checkBossPhases(state, run)
    }

    // Fire mid-run events
    tryFireEvent(state, run)

    // Check completion
    if (run.elapsed_s >= run.total_s || (run.is_boss && run.boss_hp === 0)) {
      resolveRun(state, run)
    }
  }

  // Clean up finished runs older than 30s (keep for log display)
  const cutoff = Date.now() - 30_000
  state.activeRuns = state.activeRuns.filter(
    (r) => !r.done || (r.resolved_at && r.resolved_at > cutoff)
  )
}

// ── Resolve a completed run ───────────────────────────────────────────────────
function resolveRun(state, run) {
  const def = state.expeditions[run.expedition_id]
  run.done = true
  run.resolved_at = Date.now()

  // Success chance calculation
  const baseChance = def.base_success_chance ?? 0.75
  const heroBonus = calcPartySuccessBonus(state, run.party)
  const upgradeBonus = state.multipliers.expedition_success ?? 0
  const successChance = Math.min(1, baseChance + heroBonus + upgradeBonus)

  const bossKilled = run.is_boss && run.boss_hp === 0
  const success = bossKilled || Math.random() < successChance
  run.outcome = success ? 'success' : 'failure'

  if (success) {
    const tableId = def.loot_table_id
    const drops = tableId ? rollLootTable(state, tableId) : []
    const dropText = formatDrops(state, drops)
    run.log.push({ ts: Date.now(), text: `Success! Loot: ${dropText}` })
    addToEventLog(state, `"${def.label}" completed. Loot: ${dropText}`, 'success')
    checkActProgress(state)
  } else {
    const failTableId = def.fail_loot_table_id
    if (failTableId) {
      const drops = rollLootTable(state, failTableId)
      run.log.push({ ts: Date.now(), text: `Failed. Consolation: ${formatDrops(state, drops)}` })
    } else {
      run.log.push({ ts: Date.now(), text: 'The party returns empty-handed.' })
    }
    addToEventLog(state, `"${def.label}" failed.`, 'danger')
  }

  // Apply hero status effects from the run
  applyRunStatusToHeroes(state, run)
}

// ── Mid-run event firing ──────────────────────────────────────────────────────
function tryFireEvent(state, run) {
  const def = state.expeditions[run.expedition_id]
  const events = def.events ?? []
  if (!events.length) return

  // Each event has a per-tick chance to fire (scaled by dt-ish — check once per second roughly)
  const elapsed = Math.floor(run.elapsed_s)
  if (elapsed % 8 !== 0) return // roughly every 8s window

  for (const evt of events) {
    if (Math.random() < (evt.trigger_chance ?? 0.3)) {
      run.pending_event = { event_def: evt }
      run.log.push({ ts: Date.now(), text: `⚡ ${evt.label}` })
      break
    }
  }
}

// ── Player resolves a pending mid-run event choice ────────────────────────────
export function resolveEventChoice(state, runId, choiceIndex) {
  const run = state.activeRuns.find((r) => r.run_id === runId)
  if (!run || !run.pending_event) return

  const evt = run.pending_event.event_def
  const choice = evt.choices?.[choiceIndex]
  if (!choice) return

  const outcome = choice.outcome ?? {}

  if (outcome.resource_delta) gain(state, outcome.resource_delta)
  if (outcome.log_message) run.log.push({ ts: Date.now(), text: outcome.log_message })
  if (outcome.loot_table_id) {
    const drops = rollLootTable(state, outcome.loot_table_id)
    run.log.push({ ts: Date.now(), text: `Found: ${formatDrops(state, drops)}` })
  }

  run.pending_event = null
}

// ── Boss phase transitions ────────────────────────────────────────────────────
function checkBossPhases(state, run) {
  const def = state.expeditions[run.expedition_id]
  const phases = def.phases ?? []
  const hpFrac = run.boss_hp / run.boss_hp_max

  for (let i = run.phase_idx; i < phases.length; i++) {
    if (hpFrac <= phases[i].hp_threshold) {
      run.phase_idx = i + 1
      run.log.push({ ts: Date.now(), text: phases[i].log_message || `Phase ${phases[i].phase_number} begins!` })
      break
    }
  }
}

// ── Hero stat helpers ─────────────────────────────────────────────────────────
function calcPartyDps(state, heroIds) {
  return heroIds.reduce((sum, hid) => {
    const hero = state.heroes.find((h) => h.id === hid)
    return sum + (hero?.stats.attack ?? 10)
  }, 0)
}

function calcPartySuccessBonus(state, heroIds) {
  return heroIds.reduce((sum, hid) => {
    const hero = state.heroes.find((h) => h.id === hid)
    if (!hero) return sum
    const cls = state.heroClasses[hero.class_id]
    // Each ability with success_bonus counts
    const abilityBonus = (cls?.abilities ?? []).reduce((a, abilId) => {
      // abilities looked up via project nodes
      const abilNode = state._nodeMap?.get(abilId)
      return a + (abilNode?.effect?.success_bonus ?? 0)
    }, 0)
    return sum + abilityBonus
  }, 0)
}

function applyRunStatusToHeroes(state, run) {
  // Simple: heroes have a 10% chance of returning injured on failure
  if (run.outcome === 'failure') {
    for (const hid of run.party) {
      const hero = state.heroes.find((h) => h.id === hid)
      if (hero && Math.random() < 0.1) {
        hero.status = 'injured'
        run.log.push({ ts: Date.now(), text: `${hero.name} was injured!` })
      }
    }
  } else {
    // Inspired on success — small stat boost for next run
    for (const hid of run.party) {
      const hero = state.heroes.find((h) => h.id === hid)
      if (hero) hero.status = 'inspired'
    }
  }
}

// ── Act progress check ────────────────────────────────────────────────────────
export function checkActProgress(state) {
  for (const act of Object.values(state.acts)) {
    if (act.completed) continue
    const allMet = (act.completion_conditions ?? []).every((cond) =>
      evaluateCondition(state, cond)
    )
    if (allMet) {
      act.completed = true
      addToEventLog(state, `📖 ${act.label} complete! ${act.narrative_log ?? ''}`, 'system')
      // Unlock nodes referenced by this act
      for (const nodeId of act.unlocks_node_ids ?? []) {
        unlockNode(state, nodeId)
      }
    }
  }
}

export function evaluateCondition(state, cond) {
  switch (cond.type) {
    case 'resource_gte': {
      const res = state.resources[cond.target_id]
      return res ? res.amount >= cond.value : false
    }
    case 'building_level': {
      const bld = state.buildings[cond.target_id]
      return bld ? bld.level >= cond.value : false
    }
    case 'act_reached': {
      const act = state.acts[cond.target_id]
      return act ? act.completed : false
    }
    case 'hero_count_gte':
      return state.heroes.length >= cond.value
    case 'upgrade_owned': {
      const upg = state.upgrades[cond.target_id]
      return upg ? upg.tier >= (cond.value ?? 1) : false
    }
    case 'faction_rep_gte': {
      const fac = state.factions[cond.target_id]
      return fac ? fac.rep >= cond.value : false
    }
    case 'prestige_count_gte': {
      const pres = Object.values(state.prestige)[0]
      return pres ? pres.count >= cond.value : false
    }
    default:
      return false
  }
}

export function unlockNode(state, nodeId) {
  if (state.buildings[nodeId]) state.buildings[nodeId].visible = true
  if (state.expeditions[nodeId]) state.expeditions[nodeId].visible = true
  if (state.upgrades[nodeId]) state.upgrades[nodeId].visible = true
}

export function addToEventLog(state, text, type = 'info') {
  state.eventLog.unshift({ ts: Date.now(), text, type })
  if (state.eventLog.length > 200) state.eventLog.pop()
}
