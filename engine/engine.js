import { bootstrapState } from './systems/bootstrap.js'
import { tickResources, formatNumber } from './systems/resources.js'
import {
  tickExpeditions,
  startExpedition,
  resolveEventChoice,
  addToEventLog,
  selectAutoPartyHeroes,
  summarizeExpeditionReadiness,
} from './systems/expeditions.js'
import { tickCrafting, processBuildingTick, buildBuilding, recruitHero, buyUpgrade, equipItem, unequipItem, startCraft, saveGame, loadSave } from './systems/buildings.js'

// ── Engine singleton ──────────────────────────────────────────────────────────
let state = null
let tickInterval = null
let renderCallback = null

const TICK_MS = 250 // 4 ticks/sec

export function initEngine(project, onRender) {
  state = bootstrapState(project)
  renderCallback = onRender

  // Attempt to restore save
  const restored = loadSave(state)
  if (restored) {
    addToEventLog(state, 'Game loaded from save.', 'system')
  }

  // Start game loop
  let lastTime = Date.now()
  tickInterval = setInterval(() => {
    const now = Date.now()
    const dt = Math.min((now - lastTime) / 1000, 2) // clamp dt to 2s max
    lastTime = now
    state.tick++

    tickResources(state, dt)
    tickExpeditions(state, dt)
    tickCrafting(state, dt)
    processBuildingTick(state, dt)

    // Auto-save every 60 ticks (~15s)
    if (state.tick % 60 === 0) saveGame(state)

    renderCallback(getSnapshot())
  }, TICK_MS)

  return getSnapshot()
}

export function stopEngine() {
  if (tickInterval) clearInterval(tickInterval)
  tickInterval = null
}

// ── Public action API — called from UI ────────────────────────────────────────
export const actions = {
  buildBuilding: (id) => {
    const r = buildBuilding(state, id)
    if (!r.ok) notify(r.reason, 'danger')
    return r
  },
  recruitHero: (classId) => {
    const r = recruitHero(state, classId)
    if (!r.ok) notify(r.reason, 'danger')
    return r
  },
  buyUpgrade: (id) => {
    const r = buyUpgrade(state, id)
    if (!r.ok) notify(r.reason, 'danger')
    return r
  },
  startExpedition: (expeditionId, heroIds) => {
    const r = startExpedition(state, expeditionId, heroIds)
    if (!r.ok) notify(r.reason, 'danger')
    return r
  },
  resolveEventChoice: (runId, choiceIndex) => {
    resolveEventChoice(state, runId, choiceIndex)
  },
  startCraft: (buildingId, recipeId) => {
    const r = startCraft(state, buildingId, recipeId)
    if (!r.ok) notify(r.reason, 'danger')
    return r
  },
  equipItem: (heroId, itemId) => {
    const r = equipItem(state, heroId, itemId)
    if (!r.ok) notify(r.reason, 'danger')
    return r
  },
  unequipItem: (heroId, slot) => {
    const r = unequipItem(state, heroId, slot)
    if (!r.ok) notify(r.reason, 'danger')
    return r
  },
  setScreen: (screen, extra = {}) => {
    state.ui.screen = screen
    Object.assign(state.ui, extra)
  },
  saveGame: () => {
    const ok = saveGame(state)
    notify(ok ? 'Game saved.' : 'Save failed!', ok ? 'success' : 'danger')
  },
  clickResource: (resId) => {
    // Manual click — bonus income equal to 10× per-second income
    const res = state.resources[resId]
    if (!res) return
    const bonus = Math.max(1, res.income * 10)
    res.amount = Math.min(res.amount + bonus, res.cap || Infinity)
  },
}

// ── Snapshot — immutable view passed to renderer each tick ────────────────────
function getSnapshot() {
  return {
    meta: state.meta,
    tick: state.tick,
    resources: Object.values(state.resources),
    inventory: Object.entries(state.inventory)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => ({ id, qty, def: state.itemDefs[id] })),
    heroes: state.heroes,
    heroClasses: Object.values(state.heroClasses),
    buildings: Object.values(state.buildings),
    upgrades: Object.values(state.upgrades).filter((u) => u.visible),
    expeditions: Object.values(state.expeditions),
    itemDefs: state.itemDefs,
    activeRuns: state.activeRuns,
    acts: Object.values(state.acts).sort((a, b) => (a.act_number ?? 0) - (b.act_number ?? 0)),
    factions: Object.values(state.factions),
    eventLog: state.eventLog.slice(0, 50),
    ui: state.ui,
    multipliers: state.multipliers,
    // helpers baked in for the renderer
    fmt: formatNumber,
    canAffordCost: (cost) => cost?.every(({ resource_id, amount }) =>
      (state.resources[resource_id]?.amount ?? 0) >= amount
    ),
    selectExpeditionParty: (expeditionId) => selectAutoPartyHeroes(state, expeditionId),
    getExpeditionReadiness: (expeditionId, heroIds) => summarizeExpeditionReadiness(state, expeditionId, heroIds),
  }
}

function notify(text, type = 'info') {
  state.ui.notification = { text, type }
  setTimeout(() => {
    if (state.ui.notification?.text === text) state.ui.notification = null
  }, 3000)
}
