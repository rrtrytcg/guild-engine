import { bootstrapState } from './systems/bootstrap.js'
import { tickResources, formatNumber, spendItems } from './systems/resources.js'
import { generateId } from './systems/helpers.js'
import {
  tickExpeditions,
  startExpedition,
  resolveEventChoice,
  addToEventLog,
  selectAutoPartyHeroes,
  summarizeExpeditionReadiness,
} from './systems/expeditions.js'
import { tickCrafting, processBuildingTick, buildBuilding, recruitHero, buyUpgrade, equipItem, unequipItem, startCraft, saveGame, loadSave, evaluateFormula } from './systems/buildings.js'
import { screenRegistry, defineScreen as engineDefineScreen, getScreen as engineGetScreen } from './layoutEngine.js'

const TICK_MS = 250 // 4 ticks/sec
const ITEM_RARITY_TIERS = ['common', 'uncommon', 'rare', 'epic', 'legendary']

export class EngineRuntime {
  constructor({ tickMs = TICK_MS } = {}) {
    this.state = null
    this.tickInterval = null
    this.renderCallback = null
    this.tickMs = tickMs

    // Re-export screen registry functions for external use
    this.defineScreen = engineDefineScreen
    this.getScreen = engineGetScreen

    this.actions = {
      buildBuilding: (id) => {
        const r = buildBuilding(this.state, id)
        if (!r.ok) this.notify(r.reason, 'danger')
        return r
      },
      recruitHero: (classId) => {
        const r = recruitHero(this.state, classId)
        if (!r.ok) this.notify(r.reason, 'danger')
        return r
      },
      buyUpgrade: (id) => {
        const r = buyUpgrade(this.state, id)
        if (!r.ok) this.notify(r.reason, 'danger')
        return r
      },
      startExpedition: (expeditionId, heroIds) => {
        const r = startExpedition(this.state, expeditionId, heroIds)
        if (!r.ok) this.notify(r.reason, 'danger')
        return r
      },
      resolveEventChoice: (runId, choiceIndex) => {
        resolveEventChoice(this.state, runId, choiceIndex)
      },
      startCraft: (buildingId, recipeId) => {
        const r = startCraft(this.state, buildingId, recipeId)
        if (!r.ok) this.notify(r.reason, 'danger')
        return r
      },
      equipItem: (heroId, itemId) => {
        const r = equipItem(this.state, heroId, itemId)
        if (!r.ok) this.notify(r.reason, 'danger')
        return r
      },
      unequipItem: (heroId, slot) => {
        const r = unequipItem(this.state, heroId, slot)
        if (!r.ok) this.notify(r.reason, 'danger')
        return r
      },
      assignArtisan: (buildingId, heroId) => {
        const r = this.assignArtisanToBuilding(buildingId, heroId)
        if (!r.ok) this.notify(r.reason, 'danger')
        return r
      },
      unassignArtisan: (buildingId) => {
        const r = this.unassignArtisanFromBuilding(buildingId)
        if (!r.ok) this.notify(r.reason, 'danger')
        return r
      },
      queueWorkflowJob: (buildingId, workflowId) => {
        const r = this.queueWorkflowJobForBuilding(buildingId, workflowId)
        if (!r.ok) this.notify(r.reason, 'danger')
        return r
      },
      recruitFromPool: (heroId) => {
        const r = this.recruitHeroFromPool(heroId)
        if (!r.ok) this.notify(r.reason, 'danger')
        return r
      },
      dismissHero: (heroId) => {
        const r = this.dismissHeroFromGuild(heroId)
        if (!r.ok) this.notify(r.reason, 'danger')
        return r
      },
      setSelectedBuilding: (buildingId) => {
        this.state.ui.selectedBuildingId = this.state.ui.selectedBuildingId === buildingId ? null : buildingId
        if (this.state.ui.selectedBuildingId !== buildingId) {
          this.state.ui.artisanPickerBuildingId = null
        }
        this.renderNow()
      },
      toggleArtisanPicker: (buildingId) => {
        this.state.ui.artisanPickerBuildingId = this.state.ui.artisanPickerBuildingId === buildingId ? null : buildingId
        this.renderNow()
      },
      setScreen: (screen, extra = {}) => {
        this.state.ui.screen = screen
        Object.assign(this.state.ui, extra)
        if (screen !== 'world') {
          this.state.ui.artisanPickerBuildingId = null
        }
        this.renderNow()
      },
      saveGame: () => {
        const ok = saveGame(this.state)
        this.notify(ok ? 'Game saved.' : 'Save failed!', ok ? 'success' : 'danger')
      },
      clickResource: (resId) => {
        const res = this.state.resources[resId]
        if (!res) return
        const bonus = Math.max(1, res.income * 10)
        res.amount = Math.min(res.amount + bonus, res.cap || Infinity)
      },
    }
  }

  init(project, onRender) {
    this.stop()
    this.state = bootstrapState(project)
    this.renderCallback = onRender

    const restored = loadSave(this.state)
    if (restored) {
      this.reconcileLoadedRuntimeState()
      addToEventLog(this.state, 'Game loaded from save.', 'system')
    }

    this.renderNow()

    let lastTime = Date.now()
    this.tickInterval = setInterval(() => {
      const now = Date.now()
      const dt = Math.min((now - lastTime) / 1000, 2)
      lastTime = now
      this.state.tick++

      tickResources(this.state, dt)
      tickExpeditions(this.state, dt)
      tickCrafting(this.state, dt)
      processBuildingTick(this.state, dt)

      if (this.state.tick % 60 === 0) saveGame(this.state)

      this.renderCallback(this.getSnapshot())
    }, this.tickMs)

    return this.getSnapshot()
  }

  stop() {
    if (this.tickInterval) clearInterval(this.tickInterval)
    this.tickInterval = null
  }

  renderNow() {
    if (typeof this.renderCallback === 'function' && this.state) {
      this.renderCallback(this.getSnapshot())
    }
  }

  getHeroClass(hero) {
    return hero ? this.state?.heroClasses?.[hero.class_id] ?? null : null
  }

  getAssignedBuildingForHero(heroId) {
    return Object.values(this.state?.buildings ?? {}).find((building) => building.artisan_assigned === heroId) ?? null
  }

  getBuildingQueueLimit(building) {
    const levelData = building?.levels?.[(building?.level ?? 1) - 1] ?? null
    const recipeSlots = Number(levelData?.recipe_slots ?? 0)
    const artisanSlots = Number(building?.artisan_slots?.base_count ?? 0)
    return Math.max(1, recipeSlots || artisanSlots || 1)
  }

  rarityToTier(rarity) {
    return Math.max(0, ITEM_RARITY_TIERS.indexOf(rarity ?? 'common'))
  }

  getWorkflowRecipe(workflowId, buildingLevel = 0) {
    const recipes = Object.values(this.state?.craftingRecipes ?? {}).filter((recipe) =>
      (recipe.required_workflow ?? recipe.workflow_id) === workflowId
      && recipe.visible !== false
      && (recipe.required_building_level ?? 1) <= buildingLevel
    )

    recipes.sort((left, right) => (left.label ?? left.id).localeCompare(right.label ?? right.id))
    return recipes[0] ?? null
  }

  evaluateFormulaSafe(formula, variables, fallback) {
    try {
      return Number(evaluateFormula(formula, variables))
    } catch {
      return Number(fallback ?? 0)
    }
  }

  buildWorkflowFormulaVariables(building, workflow, artisan, sourceItemDef = null, batchSize = 1) {
    const artisanClass = this.getHeroClass(artisan)
    const variables = {
      item_level: 1,
      item_rarity_tier: this.rarityToTier(sourceItemDef?.rarity),
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

    for (const [resourceId, resource] of Object.entries(this.state?.resources ?? {})) {
      variables[`resource_${resourceId}`] = Number(resource.amount ?? 0)
    }
    for (const [stat, value] of Object.entries(sourceItemDef?.stat_modifiers ?? {})) {
      variables[`item_base_stat_${stat}`] = Number(value ?? 0)
    }

    return variables
  }

  resolveWorkflowDuration(building, workflow, options = {}) {
    const sourceItemDef = options.sourceItemId ? this.state?.itemDefs?.[options.sourceItemId] ?? null : null
    const artisan = building?.artisan_assigned
      ? this.state?.heroes?.find((hero) => hero.id === building.artisan_assigned) ?? null
      : null
    const variables = this.buildWorkflowFormulaVariables(building, workflow, artisan, sourceItemDef, options.batchSize ?? 1)
    const recipe = options.recipeId ? this.state?.craftingRecipes?.[options.recipeId] ?? null : null

    if (recipe?.craft_time_formula) {
      return Math.max(0.1, this.evaluateFormulaSafe(recipe.craft_time_formula, variables, workflow?.duration_base_ticks ?? workflow?.total_ticks_required ?? 1))
    }
    if (workflow?.duration_formula) {
      return Math.max(0.1, this.evaluateFormulaSafe(workflow.duration_formula, variables, workflow?.duration_base_ticks ?? workflow?.total_ticks_required ?? 1))
    }
    return Math.max(0.1, Number(workflow?.total_ticks_required ?? workflow?.duration_base_ticks ?? 1))
  }

  resolveWorkflowInputs(building, workflow, recipe = null) {
    const artisan = building?.artisan_assigned
      ? this.state?.heroes?.find((hero) => hero.id === building.artisan_assigned) ?? null
      : null
    const variables = this.buildWorkflowFormulaVariables(building, workflow, artisan)
    const source = recipe?.inputs ?? workflow?.inputs ?? []

    return source.map((entry) => {
      const inputId = entry.item_id ?? entry.resource_id ?? entry.resource ?? entry.item ?? ''
      const amountSource = entry.qty ?? entry.amount ?? 0
      const amount = typeof amountSource === 'string'
        ? this.evaluateFormulaSafe(amountSource, variables, 0)
        : Number(amountSource)
      const isResource = Boolean(inputId && this.state?.resources?.[inputId])
      const isItem = Boolean(inputId && this.state?.itemDefs?.[inputId])
      return {
        id: inputId,
        qty: Math.max(0, amount),
        kind: isResource ? 'resource' : (isItem ? 'item' : 'unknown'),
      }
    }).filter((entry) => entry.id && entry.qty > 0)
  }

  getAvailableWorkflowInputAmount(input) {
    if (!input?.id) return 0
    if (input.kind === 'resource') return Number(this.state?.resources?.[input.id]?.amount ?? 0)
    if (input.kind === 'item') return Number(this.state?.inventory?.[input.id] ?? 0)

    const resourceAmount = Number(this.state?.resources?.[input.id]?.amount ?? 0)
    if (resourceAmount > 0 || this.state?.resources?.[input.id]) return resourceAmount
    return Number(this.state?.inventory?.[input.id] ?? 0)
  }

  canCommitWorkflowInputs(inputs) {
    return inputs.every((input) => this.getAvailableWorkflowInputAmount(input) >= input.qty)
  }

  commitWorkflowInputs(inputs) {
    if (!this.canCommitWorkflowInputs(inputs)) return false

    for (const input of inputs) {
      if (input.kind === 'resource' || (input.kind === 'unknown' && this.state?.resources?.[input.id])) {
        this.state.resources[input.id].amount -= input.qty
        continue
      }
      this.state.inventory[input.id] = Math.max(0, Number(this.state.inventory?.[input.id] ?? 0) - input.qty)
    }

    return true
  }

  getWorkflowCandidateItems(workflow) {
    const filter = workflow?.target_filter ?? null
    const requiredTags = new Set(filter?.item_tags ?? [])
    const excludedTags = new Set(filter?.exclude_tags ?? [])
    const allowedRarities = new Set(filter?.item_rarity ?? [])

    return Object.entries(this.state?.inventory ?? {})
      .filter(([, qty]) => qty > 0)
      .map(([itemId, qty]) => ({ itemId, qty, def: this.state?.itemDefs?.[itemId] ?? null }))
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

  assignArtisanToBuilding(buildingId, heroId) {
    const building = this.state?.buildings?.[buildingId]
    if (!building) return { ok: false, reason: 'Building not found.' }
    if (!building.has_workflows || (building.level ?? 0) <= 0) return { ok: false, reason: 'This building cannot host artisans yet.' }
    if (Number(building.artisan_slots?.base_count ?? 0) <= 0) return { ok: false, reason: 'No artisan slots available.' }

    const hero = this.state?.heroes?.find((entry) => entry.id === heroId)
    if (!hero) return { ok: false, reason: 'Hero not found.' }
    const heroClass = this.getHeroClass(hero)
    if (heroClass?.hero_type !== 'artisan') return { ok: false, reason: 'Only artisans can be assigned here.' }
    if (hero.status !== 'ready') return { ok: false, reason: 'That artisan is not ready.' }

    const existingAssignment = this.getAssignedBuildingForHero(heroId)
    if (existingAssignment && existingAssignment.id !== buildingId) {
      return { ok: false, reason: `${hero.name} is already assigned to ${existingAssignment.label}.` }
    }

    if (building.artisan_assigned && building.artisan_assigned !== heroId) {
      const previousHero = this.state.heroes.find((entry) => entry.id === building.artisan_assigned)
      if (previousHero) {
        previousHero.status = 'ready'
        delete previousHero.assigned_building_id
      }
    }

    building.artisan_assigned = heroId
    hero.status = 'assigned'
    hero.assigned_building_id = buildingId
    this.state.ui.artisanPickerBuildingId = null
    addToEventLog(this.state, `${hero.name} assigned to ${building.label}`, 'info')
    this.renderNow()
    return { ok: true }
  }

  unassignArtisanFromBuilding(buildingId) {
    const building = this.state?.buildings?.[buildingId]
    if (!building?.artisan_assigned) return { ok: false, reason: 'No artisan assigned.' }

    const hero = this.state.heroes.find((entry) => entry.id === building.artisan_assigned)
    building.artisan_assigned = null
    this.state.ui.artisanPickerBuildingId = null

    if (hero) {
      hero.status = 'ready'
      delete hero.assigned_building_id
      addToEventLog(this.state, `${hero.name} unassigned from ${building.label}`, 'info')
    }

    this.renderNow()
    return { ok: true }
  }

  queueWorkflowJobForBuilding(buildingId, workflowId) {
    const building = this.state?.buildings?.[buildingId]
    const workflow = this.state?.buildingWorkflows?.[workflowId]
    if (!building || !workflow) return { ok: false, reason: 'Building or workflow not found.' }
    if ((building.level ?? 0) <= 0) return { ok: false, reason: 'Build the structure first.' }
    if (!building.has_workflows) return { ok: false, reason: 'This building does not support workflows.' }
    if ((workflow.host_building ?? workflow.building_id) !== buildingId) return { ok: false, reason: 'Workflow does not belong to this building.' }
    if (workflow.visible === false) return { ok: false, reason: 'Workflow is locked.' }
    if (workflow.workflow_mode === 'passive') return { ok: false, reason: 'Passive workflows run automatically.' }

    const queueLimit = this.getBuildingQueueLimit(building)
    const queuedJobs = (building.workflow_queue ?? []).filter((job) => !job.passive)
    if (queuedJobs.length >= queueLimit) return { ok: false, reason: 'Workflow queue is full.' }

    const recipe = this.getWorkflowRecipe(workflowId, building.level ?? 0)
    const workflowInputs = this.resolveWorkflowInputs(building, workflow, recipe)
    if (workflowInputs.length && !this.canCommitWorkflowInputs(workflowInputs)) {
      return { ok: false, reason: 'Missing inputs.' }
    }

    let sourceItemId = null
    const explicitItemInput = workflowInputs.find((input) => input.kind === 'item')?.id ?? null
    if (explicitItemInput) {
      sourceItemId = explicitItemInput
    }

    if ((workflow.behavior === 'consume_item' || workflow.behavior === 'modify_item') && !workflowInputs.length) {
      const candidate = this.getWorkflowCandidateItems(workflow)[0]
      if (!candidate) return { ok: false, reason: 'Missing item input.' }
      if (!spendItems(this.state, [{ item_id: candidate.itemId, qty: 1 }])) {
        return { ok: false, reason: 'Missing item input.' }
      }
      sourceItemId = candidate.itemId
    }

    if (workflowInputs.length && !this.commitWorkflowInputs(workflowInputs)) {
      return { ok: false, reason: 'Missing inputs.' }
    }

    const batchSize = Number(recipe?.output_quantity ?? workflow?.batch_config?.max_size ?? 1)
    building.workflow_queue = building.workflow_queue ?? []
    building.workflow_queue.push({
      id: generateId('job'),
      workflow_id: workflowId,
      recipe_id: recipe?.id ?? null,
      source_item_id: sourceItemId,
      progress_s: 0,
      total_s: this.resolveWorkflowDuration(building, workflow, {
        recipeId: recipe?.id,
        sourceItemId,
        batchSize,
      }),
      batch_size: batchSize,
      inputs_committed: true,
      consumed_resources: workflowInputs,
      item_level: 1,
      item_quality_tier: 0,
      passive: false,
    })

    addToEventLog(this.state, `Job queued: ${workflow.label ?? workflow.id} at ${building.label}`, 'info')
    this.renderNow()
    return { ok: true }
  }

  recruitHeroFromPool(heroId) {
    const index = (this.state?.recruitPool ?? []).findIndex((hero) => hero.id === heroId)
    if (index < 0) return { ok: false, reason: 'Recruit not found.' }

    const [hero] = this.state.recruitPool.splice(index, 1)
    hero.status = 'ready'
    hero.statuses = (hero.statuses ?? []).filter((status) => status !== 'assigned')
    delete hero.assigned_building_id
    this.state.heroes.push(hero)
    addToEventLog(this.state, `${hero.name} joins the guild!`, 'success')
    this.renderNow()
    return { ok: true, hero }
  }

  dismissHeroFromGuild(heroId) {
    const heroIndex = this.state?.heroes?.findIndex((entry) => entry.id === heroId) ?? -1
    if (heroIndex < 0) return { ok: false, reason: 'Hero not found.' }

    const hero = this.state.heroes[heroIndex]
    if (hero.status === 'on_expedition') {
      return { ok: false, reason: 'Hero is on expedition' }
    }

    if (hero.status === 'assigned') {
      const assignedBuilding = this.getAssignedBuildingForHero(heroId)
      if (assignedBuilding?.artisan_assigned === heroId) {
        assignedBuilding.artisan_assigned = null
      }
      delete hero.assigned_building_id
      this.state.ui.artisanPickerBuildingId = null
    }

    for (const itemId of Object.values(hero.equipment ?? {})) {
      if (!itemId) continue
      this.state.inventory[itemId] = (this.state.inventory[itemId] ?? 0) + 1
    }

    hero.equipment = {}
    this.state.heroes.splice(heroIndex, 1)
    addToEventLog(this.state, `${hero.name} has left the guild.`, 'info')
    this.renderNow()
    return { ok: true }
  }

  reconcileLoadedRuntimeState() {
    const assignedHeroIds = new Set()
    const liveWorkflowIds = new Set(Object.keys(this.state?.buildingWorkflows ?? {}))
    const rosterHeroIds = new Set((this.state?.heroes ?? []).map((hero) => hero.id))
    let clearedOrphanedAssignments = 0
    let removedOrphanedQueueJobs = 0
    let removedDuplicateRecruits = 0

    for (const building of Object.values(this.state?.buildings ?? {})) {
      if (Array.isArray(building?.workflow_queue)) {
        const previousCount = building.workflow_queue.length
        building.workflow_queue = building.workflow_queue.filter((job) => {
          const workflowId = job?.workflow_id ?? job?.workflowId
          return workflowId && liveWorkflowIds.has(workflowId)
        })
        removedOrphanedQueueJobs += previousCount - building.workflow_queue.length
      }

      if (building?.artisan_assigned) {
        const hero = this.state?.heroes?.find((entry) => entry.id === building.artisan_assigned)
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

    for (const hero of this.state?.heroes ?? []) {
      if (!assignedHeroIds.has(hero.id) && hero.status === 'assigned') {
        hero.status = 'ready'
        delete hero.assigned_building_id
      }
    }

    if (Array.isArray(this.state?.recruitPool)) {
      const previousCount = this.state.recruitPool.length
      this.state.recruitPool = this.state.recruitPool.filter((hero) => !rosterHeroIds.has(hero.id))
      removedDuplicateRecruits = previousCount - this.state.recruitPool.length
    }

    if (clearedOrphanedAssignments > 0) {
      addToEventLog(this.state, `Load reconciliation: cleared ${clearedOrphanedAssignments} orphaned artisan assignment${clearedOrphanedAssignments === 1 ? '' : 's'}.`, 'system')
    }
    if (removedOrphanedQueueJobs > 0) {
      addToEventLog(this.state, `Load reconciliation: removed ${removedOrphanedQueueJobs} orphaned workflow queue job${removedOrphanedQueueJobs === 1 ? '' : 's'}.`, 'system')
    }
    if (removedDuplicateRecruits > 0) {
      addToEventLog(this.state, `Load reconciliation: removed ${removedDuplicateRecruits} duplicate recruit pool entr${removedDuplicateRecruits === 1 ? 'y' : 'ies'}.`, 'system')
    }
  }

  getSnapshot() {
    return {
      meta: this.state.meta,
      tick: this.state.tick,
      resources: Object.values(this.state.resources),
      inventory: Object.entries(this.state.inventory)
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => ({ id, qty, def: this.state.itemDefs[id] })),
      heroes: this.state.heroes,
      recruitPool: this.state.recruitPool,
      heroClasses: Object.values(this.state.heroClasses),
      buildings: Object.values(this.state.buildings),
      buildingWorkflows: Object.values(this.state.buildingWorkflows ?? {}),
      craftingRecipes: Object.values(this.state.craftingRecipes ?? {}),
      buffStockpile: Object.entries(this.state.buff_stockpile ?? {})
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => ({ id, qty, def: this.state.itemDefs[id] })),
      upgrades: Object.values(this.state.upgrades).filter((u) => u.visible),
      expeditions: Object.values(this.state.expeditions),
      itemDefs: this.state.itemDefs,
      activeRuns: this.state.activeRuns,
      acts: Object.values(this.state.acts).sort((a, b) => (a.act_number ?? 0) - (b.act_number ?? 0)),
      factions: Object.values(this.state.factions),
      eventLog: this.state.eventLog.slice(0, 50),
      ui: this.state.ui,
      multipliers: this.state.multipliers,
      fmt: formatNumber,
      canAffordCost: (cost) => cost?.every(({ resource_id, amount }) =>
        (this.state.resources[resource_id]?.amount ?? 0) >= amount
      ),
      selectExpeditionParty: (expeditionId) => selectAutoPartyHeroes(this.state, expeditionId),
      getExpeditionReadiness: (expeditionId, heroIds) => summarizeExpeditionReadiness(this.state, expeditionId, heroIds),
    }
  }

  notify(text, type = 'info') {
    this.state.ui.notification = { text, type }
    setTimeout(() => {
      if (this.state.ui.notification?.text === text) this.state.ui.notification = null
    }, 3000)
  }
}

const runtime = new EngineRuntime()

export function initEngine(project, onRender) {
  return runtime.init(project, onRender)
}

export function stopEngine() {
  runtime.stop()
}

export const actions = runtime.actions

// Screen layout system exports
export { screenRegistry, defineScreen, getScreen, renderScreenToHTML, widgetToHTML } from './layoutEngine.js'
