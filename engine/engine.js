import { bootstrapState } from './systems/bootstrap.js'
import { tickResources, formatNumber, canAfford, spend, spendItems } from './systems/resources.js'
import {
  tickExpeditions,
  startExpedition,
  resolveEventChoice,
  addToEventLog,
  selectAutoPartyHeroes,
  summarizeExpeditionReadiness,
} from './systems/expeditions.js'
import { tickCrafting, processBuildingTick, buildBuilding, recruitHero, buyUpgrade, equipItem, unequipItem, startCraft, saveGame, loadSave, evaluateFormula } from './systems/buildings.js'

// ── Engine singleton ──────────────────────────────────────────────────────────
let state = null
let tickInterval = null
let renderCallback = null

const TICK_MS = 250 // 4 ticks/sec
const ITEM_RARITY_TIERS = ['common', 'uncommon', 'rare', 'epic', 'legendary']

export function initEngine(project, onRender) {
  state = bootstrapState(project)
  renderCallback = onRender

  // Attempt to restore save
  const restored = loadSave(state)
  if (restored) {
    reconcileLoadedRuntimeState()
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

function renderNow() {
  if (typeof renderCallback === 'function' && state) {
    renderCallback(getSnapshot())
  }
}

function getHeroClass(hero) {
  return hero ? state?.heroClasses?.[hero.class_id] ?? null : null
}

function getAssignedBuildingForHero(heroId) {
  return Object.values(state?.buildings ?? {}).find((building) => building.artisan_assigned === heroId) ?? null
}

function getBuildingQueueLimit(building) {
  const levelData = building?.levels?.[(building?.level ?? 1) - 1] ?? null
  const recipeSlots = Number(levelData?.recipe_slots ?? 0)
  const artisanSlots = Number(building?.artisan_slots?.base_count ?? 0)
  return Math.max(1, recipeSlots || artisanSlots || 1)
}

function rarityToTier(rarity) {
  return Math.max(0, ITEM_RARITY_TIERS.indexOf(rarity ?? 'common'))
}

function getWorkflowRecipe(workflowId, buildingLevel = 0) {
  const recipes = Object.values(state?.craftingRecipes ?? {}).filter((recipe) =>
    recipe.required_workflow === workflowId
    && recipe.visible !== false
    && (recipe.required_building_level ?? 1) <= buildingLevel
  )

  recipes.sort((left, right) => (left.label ?? left.id).localeCompare(right.label ?? right.id))
  return recipes[0] ?? null
}

function evaluateFormulaSafe(formula, variables, fallback) {
  try {
    return Number(evaluateFormula(formula, variables))
  } catch {
    return Number(fallback ?? 0)
  }
}

function buildWorkflowFormulaVariables(building, workflow, artisan, sourceItemDef = null, batchSize = 1) {
  const artisanClass = getHeroClass(artisan)
  const variables = {
    item_level: 1,
    item_rarity_tier: rarityToTier(sourceItemDef?.rarity),
    item_quality_tier: 0,
    building_level: Number(building?.level ?? 0),
    worker_skill: Number(artisan?.stats?.[artisanClass?.primary_stat] ?? 0),
    worker_specialization_match: Number(
      artisan?.specialization && workflow?.action_type
        ? artisan.specialization === workflow.action_type
        : 0
    ),
    worker_level: Number(artisan?.level ?? 1),
    batch_size: Number(batchSize ?? 1),
    momentum: Number(building?.momentum ?? 0),
    streak_count: Number(building?.streak_count ?? 0),
    base_failure: Number(workflow?.success_table?.base_failure ?? 0),
    base_crit: Number(workflow?.success_table?.base_crit ?? 0),
    forge_level: Number(building?.level ?? 0),
    base_duration: Number(workflow?.duration_base_ticks ?? workflow?.total_ticks_required ?? 1),
  }

  for (const [resourceId, resource] of Object.entries(state?.resources ?? {})) {
    variables[`resource_${resourceId}`] = Number(resource.amount ?? 0)
  }
  for (const [stat, value] of Object.entries(sourceItemDef?.stat_modifiers ?? {})) {
    variables[`item_base_stat_${stat}`] = Number(value ?? 0)
  }

  return variables
}

function resolveWorkflowDuration(building, workflow, options = {}) {
  const sourceItemDef = options.sourceItemId ? state?.itemDefs?.[options.sourceItemId] ?? null : null
  const artisan = building?.artisan_assigned
    ? state?.heroes?.find((hero) => hero.id === building.artisan_assigned) ?? null
    : null
  const variables = buildWorkflowFormulaVariables(building, workflow, artisan, sourceItemDef, options.batchSize ?? 1)
  const recipe = options.recipeId ? state?.craftingRecipes?.[options.recipeId] ?? null : null

  if (recipe?.craft_time_formula) {
    return Math.max(0.1, evaluateFormulaSafe(recipe.craft_time_formula, variables, workflow?.duration_base_ticks ?? workflow?.total_ticks_required ?? 1))
  }
  if (workflow?.duration_formula) {
    return Math.max(0.1, evaluateFormulaSafe(workflow.duration_formula, variables, workflow?.duration_base_ticks ?? workflow?.total_ticks_required ?? 1))
  }
  return Math.max(0.1, Number(workflow?.total_ticks_required ?? workflow?.duration_base_ticks ?? 1))
}

function resolveWorkflowResourceInputs(building, workflow, recipe = null) {
  const artisan = building?.artisan_assigned
    ? state?.heroes?.find((hero) => hero.id === building.artisan_assigned) ?? null
    : null
  const variables = buildWorkflowFormulaVariables(building, workflow, artisan)
  const source = recipe?.inputs ?? workflow?.inputs ?? []

  return source.map((entry) => {
    const resourceId = entry.resource ?? entry.resource_id
    const amount = typeof entry.amount === 'string'
      ? evaluateFormulaSafe(entry.amount, variables, 0)
      : Number(entry.amount ?? 0)
    return {
      resource_id: resourceId,
      amount: Math.max(0, amount),
    }
  }).filter((entry) => entry.resource_id && entry.amount > 0)
}

function getWorkflowCandidateItems(workflow) {
  const filter = workflow?.target_filter ?? null
  const requiredTags = new Set(filter?.item_tags ?? [])
  const excludedTags = new Set(filter?.exclude_tags ?? [])
  const allowedRarities = new Set(filter?.item_rarity ?? [])

  return Object.entries(state?.inventory ?? {})
    .filter(([, qty]) => qty > 0)
    .map(([itemId, qty]) => ({ itemId, qty, def: state?.itemDefs?.[itemId] ?? null }))
    .filter((entry) => entry.def)
    .filter((entry) => {
      const tags = new Set(entry.def?.tags ?? [])
      if (requiredTags.size > 0 && [...requiredTags].some((tag) => !tags.has(tag))) return false
      if (excludedTags.size > 0 && [...excludedTags].some((tag) => tags.has(tag))) return false
      if (allowedRarities.size > 0 && !allowedRarities.has(entry.def?.rarity ?? 'common')) return false
      return true
    })
    .sort((left, right) => (left.def?.label ?? left.itemId).localeCompare(right.def?.label ?? right.itemId))
}

function assignArtisanToBuilding(buildingId, heroId) {
  const building = state?.buildings?.[buildingId]
  if (!building) return { ok: false, reason: 'Building not found.' }
  if (!building.has_workflows || (building.level ?? 0) <= 0) return { ok: false, reason: 'This building cannot host artisans yet.' }
  if (Number(building.artisan_slots?.base_count ?? 0) <= 0) return { ok: false, reason: 'No artisan slots available.' }

  const hero = state?.heroes?.find((entry) => entry.id === heroId)
  if (!hero) return { ok: false, reason: 'Hero not found.' }
  const heroClass = getHeroClass(hero)
  if (heroClass?.hero_type !== 'artisan') return { ok: false, reason: 'Only artisans can be assigned here.' }
  if (hero.status !== 'ready') return { ok: false, reason: 'That artisan is not ready.' }

  const existingAssignment = getAssignedBuildingForHero(heroId)
  if (existingAssignment && existingAssignment.id !== buildingId) {
    return { ok: false, reason: `${hero.name} is already assigned to ${existingAssignment.label}.` }
  }

  if (building.artisan_assigned && building.artisan_assigned !== heroId) {
    const previousHero = state.heroes.find((entry) => entry.id === building.artisan_assigned)
    if (previousHero) {
      previousHero.status = 'ready'
      delete previousHero.assigned_building_id
    }
  }

  building.artisan_assigned = heroId
  hero.status = 'assigned'
  hero.assigned_building_id = buildingId
  state.ui.artisanPickerBuildingId = null
  addToEventLog(state, `${hero.name} assigned to ${building.label}`, 'info')
  renderNow()
  return { ok: true }
}

function unassignArtisanFromBuilding(buildingId) {
  const building = state?.buildings?.[buildingId]
  if (!building?.artisan_assigned) return { ok: false, reason: 'No artisan assigned.' }

  const hero = state.heroes.find((entry) => entry.id === building.artisan_assigned)
  building.artisan_assigned = null
  state.ui.artisanPickerBuildingId = null

  if (hero) {
    hero.status = 'ready'
    delete hero.assigned_building_id
    addToEventLog(state, `${hero.name} unassigned from ${building.label}`, 'info')
  }

  renderNow()
  return { ok: true }
}

function queueWorkflowJobForBuilding(buildingId, workflowId) {
  const building = state?.buildings?.[buildingId]
  const workflow = state?.buildingWorkflows?.[workflowId]
  if (!building || !workflow) return { ok: false, reason: 'Building or workflow not found.' }
  if ((building.level ?? 0) <= 0) return { ok: false, reason: 'Build the structure first.' }
  if (!building.has_workflows) return { ok: false, reason: 'This building does not support workflows.' }
  if ((workflow.host_building ?? workflow.building_id) !== buildingId) return { ok: false, reason: 'Workflow does not belong to this building.' }
  if (workflow.visible === false) return { ok: false, reason: 'Workflow is locked.' }
  if (workflow.workflow_mode === 'passive') return { ok: false, reason: 'Passive workflows run automatically.' }

  const queueLimit = getBuildingQueueLimit(building)
  const queuedJobs = (building.workflow_queue ?? []).filter((job) => !job.passive)
  if (queuedJobs.length >= queueLimit) return { ok: false, reason: 'Workflow queue is full.' }

  const recipe = getWorkflowRecipe(workflowId, building.level ?? 0)
  const resourceInputs = resolveWorkflowResourceInputs(building, workflow, recipe)
  if (resourceInputs.length && !canAfford(state, resourceInputs)) {
    return { ok: false, reason: 'Missing resources.' }
  }

  let sourceItemId = null
  if (workflow.behavior === 'consume_item' || workflow.behavior === 'modify_item') {
    const candidate = getWorkflowCandidateItems(workflow)[0]
    if (!candidate) return { ok: false, reason: 'Missing item input.' }
    if (!spendItems(state, [{ item_id: candidate.itemId, qty: 1 }])) {
      return { ok: false, reason: 'Missing item input.' }
    }
    sourceItemId = candidate.itemId
  }

  if (resourceInputs.length) {
    spend(state, resourceInputs)
  }

  const batchSize = Number(recipe?.output_quantity ?? workflow?.batch_config?.max_size ?? 1)
  building.workflow_queue = building.workflow_queue ?? []
  building.workflow_queue.push({
    id: `job-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    workflow_id: workflowId,
    recipe_id: recipe?.id ?? null,
    source_item_id: sourceItemId,
    progress_s: 0,
    total_s: resolveWorkflowDuration(building, workflow, {
      recipeId: recipe?.id,
      sourceItemId,
      batchSize,
    }),
    batch_size: batchSize,
    inputs_committed: true,
    consumed_resources: resourceInputs,
    item_level: 1,
    item_quality_tier: 0,
    passive: false,
  })

  addToEventLog(state, `Job queued: ${workflow.label ?? workflow.id} at ${building.label}`, 'info')
  renderNow()
  return { ok: true }
}

function recruitHeroFromPool(heroId) {
  const index = (state?.recruitPool ?? []).findIndex((hero) => hero.id === heroId)
  if (index < 0) return { ok: false, reason: 'Recruit not found.' }

  const [hero] = state.recruitPool.splice(index, 1)
  hero.status = 'ready'
  hero.statuses = (hero.statuses ?? []).filter((status) => status !== 'assigned')
  delete hero.assigned_building_id
  state.heroes.push(hero)
  addToEventLog(state, `${hero.name} joins the guild!`, 'success')
  renderNow()
  return { ok: true, hero }
}

function reconcileLoadedRuntimeState() {
  const assignedHeroIds = new Set()
  const liveWorkflowIds = new Set(Object.keys(state?.buildingWorkflows ?? {}))
  const rosterHeroIds = new Set((state?.heroes ?? []).map((hero) => hero.id))
  let clearedOrphanedAssignments = 0
  let removedOrphanedQueueJobs = 0
  let removedDuplicateRecruits = 0

  for (const building of Object.values(state?.buildings ?? {})) {
    if (Array.isArray(building?.workflow_queue)) {
      const previousCount = building.workflow_queue.length
      building.workflow_queue = building.workflow_queue.filter((job) => {
        const workflowId = job?.workflow_id ?? job?.workflowId
        return workflowId && liveWorkflowIds.has(workflowId)
      })
      removedOrphanedQueueJobs += previousCount - building.workflow_queue.length
    }

    if (building?.artisan_assigned) {
      const hero = state?.heroes?.find((entry) => entry.id === building.artisan_assigned)
      if (!hero) {
        building.artisan_assigned = null
        clearedOrphanedAssignments += 1
        continue
      }

      hero.status = 'assigned'
      hero.assigned_building_id = building.id
      assignedHeroIds.add(hero.id)
    }
  }

  for (const hero of state?.heroes ?? []) {
    if (!assignedHeroIds.has(hero.id) && hero.status === 'assigned') {
      hero.status = 'ready'
      delete hero.assigned_building_id
    }
  }

  if (Array.isArray(state?.recruitPool)) {
    const previousCount = state.recruitPool.length
    state.recruitPool = state.recruitPool.filter((hero) => !rosterHeroIds.has(hero.id))
    removedDuplicateRecruits = previousCount - state.recruitPool.length
  }

  if (clearedOrphanedAssignments > 0) {
    addToEventLog(state, `Load reconciliation: cleared ${clearedOrphanedAssignments} orphaned artisan assignment${clearedOrphanedAssignments === 1 ? '' : 's'}.`, 'system')
  }
  if (removedOrphanedQueueJobs > 0) {
    addToEventLog(state, `Load reconciliation: removed ${removedOrphanedQueueJobs} orphaned workflow queue job${removedOrphanedQueueJobs === 1 ? '' : 's'}.`, 'system')
  }
  if (removedDuplicateRecruits > 0) {
    addToEventLog(state, `Load reconciliation: removed ${removedDuplicateRecruits} duplicate recruit pool entr${removedDuplicateRecruits === 1 ? 'y' : 'ies'}.`, 'system')
  }
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
  assignArtisan: (buildingId, heroId) => {
    const r = assignArtisanToBuilding(buildingId, heroId)
    if (!r.ok) notify(r.reason, 'danger')
    return r
  },
  unassignArtisan: (buildingId) => {
    const r = unassignArtisanFromBuilding(buildingId)
    if (!r.ok) notify(r.reason, 'danger')
    return r
  },
  queueWorkflowJob: (buildingId, workflowId) => {
    const r = queueWorkflowJobForBuilding(buildingId, workflowId)
    if (!r.ok) notify(r.reason, 'danger')
    return r
  },
  recruitFromPool: (heroId) => {
    const r = recruitHeroFromPool(heroId)
    if (!r.ok) notify(r.reason, 'danger')
    return r
  },
  setSelectedBuilding: (buildingId) => {
    state.ui.selectedBuildingId = state.ui.selectedBuildingId === buildingId ? null : buildingId
    if (state.ui.selectedBuildingId !== buildingId) {
      state.ui.artisanPickerBuildingId = null
    }
    renderNow()
  },
  toggleArtisanPicker: (buildingId) => {
    state.ui.artisanPickerBuildingId = state.ui.artisanPickerBuildingId === buildingId ? null : buildingId
    renderNow()
  },
  setScreen: (screen, extra = {}) => {
    state.ui.screen = screen
    Object.assign(state.ui, extra)
    if (screen !== 'world') {
      state.ui.artisanPickerBuildingId = null
    }
    renderNow()
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
    recruitPool: state.recruitPool,
    heroClasses: Object.values(state.heroClasses),
    buildings: Object.values(state.buildings),
    buildingWorkflows: Object.values(state.buildingWorkflows ?? {}),
    craftingRecipes: Object.values(state.craftingRecipes ?? {}),
    buffStockpile: Object.entries(state.buff_stockpile ?? {})
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => ({ id, qty, def: state.itemDefs[id] })),
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
