# Remaining Audit Items Implementation Plan

**Goal:** Refactor the engine runtime into class-owned state, split editor UI chunks to reduce bundle warnings, and verify `.gitignore` coverage without changing behavior.

**Architecture:** The engine module will be rewritten as a class-backed runtime with a singleton instance while preserving the existing exported API (`initEngine`, `stopEngine`, `actions`). The editor will adopt React lazy-loading for the GroupCanvas, toolbar modals, and inspector forms with explicit loading/failure fallbacks to keep UI stable. `.gitignore` will be verified only (no edits expected).

**Design:** `thoughts/shared/designs/2026-03-30-remaining-audit-items-design.md`

---

## Dependency Graph

```
Batch 1 (parallel): 1.1, 1.2 [foundation - no deps]
Batch 2 (parallel): 2.1, 2.2, 2.3 [editor code-splitting - depends on 1.2 for inspector]
Batch 3 (parallel): 3.1, 3.2 [verification - depends on all]
```

---

## Batch 1: Foundation (parallel - 2 implementers)

All tasks in this batch have NO dependencies and run simultaneously.

### Task 1.1: Engine class refactor + compatibility wrapper
**File:** `engine/engine.js`
**Test:** `editor/tests/engine-runtime.test.js`
**Depends:** none

```javascript
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

const TICK_MS = 250 // 4 ticks/sec
const ITEM_RARITY_TIERS = ['common', 'uncommon', 'rare', 'epic', 'legendary']

export class EngineRuntime {
  constructor({ tickMs = TICK_MS } = {}) {
    this.state = null
    this.tickInterval = null
    this.renderCallback = null
    this.tickMs = tickMs

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
```

```javascript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { EngineRuntime, initEngine, stopEngine, actions } from '../../engine/engine.js'

const project = {
  meta: { title: 'Test Game' },
  nodes: [],
  edges: [],
}

beforeEach(() => {
  vi.useFakeTimers()
  globalThis.localStorage = {
    getItem: vi.fn().mockReturnValue(null),
    setItem: vi.fn(),
  }
})

afterEach(() => {
  vi.useRealTimers()
  delete globalThis.localStorage
})

describe('EngineRuntime', () => {
  it('initializes and ticks via render callback', () => {
    const engine = new EngineRuntime()
    const snapshots = []
    const snap = engine.init(project, (snapshot) => snapshots.push(snapshot))

    expect(snap.meta.title).toBe('Test Game')
    expect(snapshots.length).toBe(1)

    vi.advanceTimersByTime(250)
    expect(snapshots[snapshots.length - 1].tick).toBeGreaterThan(0)

    const lastTick = snapshots[snapshots.length - 1].tick
    engine.stop()
    vi.advanceTimersByTime(1000)
    expect(snapshots[snapshots.length - 1].tick).toBe(lastTick)
  })

  it('keeps compatibility exports intact', () => {
    let lastSnapshot = null
    initEngine(project, (snapshot) => { lastSnapshot = snapshot })
    expect(lastSnapshot.meta.title).toBe('Test Game')
    expect(typeof actions.saveGame).toBe('function')
    stopEngine()
  })
})
```

**Verify:** `npm --prefix editor test -- tests/engine-runtime.test.js`
**Commit:** `refactor(engine): move runtime state into class`

---

### Task 1.2: Inspector registry for lazy imports
**File:** `editor/src/inspector/inspectorRegistry.js`
**Test:** `editor/tests/inspector-registry.test.js`
**Depends:** none

```javascript
export const INSPECTOR_IMPORTERS = {
  resource: () => import('./ResourceInspector.jsx'),
  hero_class: () => import('./HeroClassInspector.jsx'),
  item: () => import('./ItemInspector.jsx'),
  loot_table: () => import('./LootTableInspector.jsx'),
  recipe: () => import('./RecipeInspector.jsx'),
  crafting_recipe: () => import('./CraftingRecipeInspector.jsx'),
  ability: () => import('./AbilityInspector.jsx'),
  building: () => import('./BuildingInspector.jsx'),
  upgrade: () => import('./UpgradeInspector.jsx'),
  building_workflow: () => import('./BuildingWorkflowInspector.jsx'),
  building_upgrade: () => import('./BuildingUpgradeInspector.jsx'),
  expedition: () => import('./ExpeditionInspector.jsx'),
  boss_expedition: () => import('./BossExpeditionInspector.jsx'),
  act: () => import('./ActInspector.jsx'),
  event: () => import('./EventInspector.jsx'),
  faction: () => import('./FactionInspector.jsx'),
  prestige: () => import('./PrestigeInspector.jsx'),
  blueprint: () => import('./BlueprintInspector.jsx'),
}

export function getInspectorImporter(type) {
  return INSPECTOR_IMPORTERS[type] ?? null
}
```

```javascript
import { describe, it, expect } from 'vitest'
import { INSPECTOR_IMPORTERS, getInspectorImporter } from '../src/inspector/inspectorRegistry.js'

describe('inspectorRegistry', () => {
  it('exposes known inspector importers', () => {
    expect(Object.keys(INSPECTOR_IMPORTERS)).toContain('resource')
    expect(Object.keys(INSPECTOR_IMPORTERS)).toContain('building')
    expect(typeof INSPECTOR_IMPORTERS.resource).toBe('function')
  })

  it('returns null for unknown types', () => {
    expect(getInspectorImporter('unknown_type')).toBe(null)
  })
})
```

**Verify:** `npm --prefix editor test -- tests/inspector-registry.test.js`
**Commit:** `refactor(editor): centralize inspector importers`

---

## Batch 2: Editor Code-Splitting (parallel - 3 implementers)

All tasks in this batch depend on Batch 1 completing.

### Task 2.1: Lazy-load GroupCanvas in App shell
**File:** `editor/src/App.jsx`
**Test:** `editor/tests/app-lazy.test.js`
**Depends:** none

```javascript
import { lazy, Suspense } from 'react'
import Toolbar from './components/Toolbar'
import Palette from './canvas/Palette'
import Canvas from './canvas/Canvas'
import Inspector from './inspector/Inspector'
import useStore from './store/useStore'

const GroupCanvas = lazy(() => import('./canvas/GroupCanvas').catch(() => ({
  default: GroupCanvasError,
})))

export default function App() {
  const canvasView = useStore((s) => s.canvasView)
  const activeGroupId = useStore((s) => s.activeGroupId)
  const focusGroupId = canvasView === 'nodes' ? activeGroupId : null

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: '#0d0d1a',
        color: '#e0e0f0',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <Toolbar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minWidth: 0 }}>
        <Palette />
        {canvasView === 'nodes' ? (
          <Canvas focusGroupId={focusGroupId} />
        ) : (
          <Suspense fallback={<GroupCanvasLoading />}>
            <GroupCanvas />
          </Suspense>
        )}
        <Inspector />
      </div>
    </div>
  )
}

function GroupCanvasLoading() {
  return (
    <div style={{
      flex: 1,
      padding: 24,
      background: 'radial-gradient(circle at top left, #151528 0%, #0d0d1a 55%, #090912 100%)',
      color: '#666680',
      fontSize: 12,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      Loading group view…
    </div>
  )
}

function GroupCanvasError() {
  return (
    <div style={{
      flex: 1,
      padding: 24,
      background: 'radial-gradient(circle at top left, #151528 0%, #0d0d1a 55%, #090912 100%)',
      color: '#E24B4A',
      fontSize: 12,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
    }}>
      Group view failed to load. Reload the editor to try again.
    </div>
  )
}
```

```javascript
import { describe, it, expect } from 'vitest'
import App from '../src/App.jsx'

describe('App lazy loading', () => {
  it('exports a component', () => {
    expect(typeof App).toBe('function')
  })
})
```

**Verify:** `npm --prefix editor test -- tests/app-lazy.test.js`
**Commit:** `perf(editor): lazy-load group canvas`

---

### Task 2.2: Lazy-load toolbar modals
**File:** `editor/src/components/Toolbar.jsx`
**Test:** `editor/tests/toolbar-lazy.test.js`
**Depends:** none

```javascript
import { useRef, useState, lazy, Suspense } from 'react'
import useStore from '../store/useStore'

const CompileModal = lazy(() => import('./CompileModal').catch(() => ({
  default: (props) => <ModalLoadFailure {...props} label="Compile modal failed to load." />,
})))
const BlueprintLibraryModal = lazy(() => import('./BlueprintLibraryModal').catch(() => ({
  default: (props) => <ModalLoadFailure {...props} label="Blueprint library failed to load." />,
})))
const TuningModal = lazy(() => import('./TuningModal').catch(() => ({
  default: (props) => <ModalLoadFailure {...props} label="Tuning modal failed to load." />,
})))

export default function Toolbar() {
  const importProject = useStore((s) => s.importProject)
  const registerBlueprint = useStore((s) => s.registerBlueprint)
  const canvasView = useStore((s) => s.canvasView)
  const setCanvasView = useStore((s) => s.setCanvasView)
  const nodeCount = useStore((s) => s.nodes.length)
  const edgeCount = useStore((s) => s.edges.length)
  const selectedNodeIds = useStore((s) => s.selectedNodeIds)
  const rigSelectedNodes = useStore((s) => s.rigSelectedNodes)
  const fileInputRef = useRef(null)
  const [showCompile, setShowCompile] = useState(false)
  const [showBlueprints, setShowBlueprints] = useState(false)
  const [showTuning, setShowTuning] = useState(false)
  const [rigMessage, setRigMessage] = useState(null)
  const openDocs = () => window.open('/docs/WIKI.md', '_blank', 'noopener,noreferrer')

  const handleRig = () => {
    const result = rigSelectedNodes()
    if (result && result.rigged > 0) {
      setRigMessage(`Rigged ${result.rigged} node${result.rigged !== 1 ? 's' : ''} — ${result.relations.join(', ')}`)
    } else {
      setRigMessage('No fields to rig in this selection')
    }
    setTimeout(() => setRigMessage(null), 3500)
  }

  const onFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const payload = JSON.parse(ev.target.result)
        if (payload?.blueprint_meta && Array.isArray(payload?.nodes)) {
          registerBlueprint(payload)
        } else {
          importProject(payload)
        }
      } catch {
        alert('Invalid JSON - could not parse file.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const blueprintDropPosition = {
    x: 280 + (nodeCount % 5) * 40,
    y: 160 + (nodeCount % 4) * 36,
  }

  return (
    <>
      <div
        style={{
          height: 48,
          background: '#0a0a14',
          borderBottom: '1px solid #2a2a3e',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: 16,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>{'\u2694'}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#e0e0f0', letterSpacing: '0.02em' }}>
            Guild Engine
          </span>
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              background: '#7F77DD22',
              color: '#7F77DD',
              border: '1px solid #7F77DD44',
              borderRadius: 4,
              padding: '1px 5px',
              letterSpacing: '0.1em',
            }}
          >
            EDITOR
          </span>
        </div>

        <div style={viewToggleWrap}>
          <button
            type="button"
            onClick={() => setCanvasView('nodes')}
            style={viewPill(canvasView === 'nodes')}
          >
            {'\u229E'} Nodes
          </button>
          <button
            type="button"
            onClick={() => setCanvasView('groups')}
            style={viewPill(canvasView === 'groups')}
          >
            {'\u25A3'} Groups
          </button>
        </div>

        <div style={{ flex: 1 }} />

        <span style={{ fontSize: 11, color: '#444460' }}>
          {nodeCount} node{nodeCount !== 1 ? 's' : ''} {'\u00B7'} {edgeCount} edge{edgeCount !== 1 ? 's' : ''}
        </span>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={onFileChange}
          style={{ display: 'none' }}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={ghostBtn}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#444460'
            e.currentTarget.style.color = '#c0c0d8'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#2a2a3e'
            e.currentTarget.style.color = '#8888aa'
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.background = '#1a1a2e'
            e.currentTarget.style.color = '#fff'
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = '#8888aa'
          }}
        >
          Import JSON
        </button>

        <button
          type="button"
          onClick={() => setShowBlueprints(true)}
          style={ghostBtn}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#444460'
            e.currentTarget.style.color = '#c0c0d8'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#2a2a3e'
            e.currentTarget.style.color = '#8888aa'
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.background = '#1a1a2e'
            e.currentTarget.style.color = '#fff'
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = '#8888aa'
          }}
        >
          Blueprints
        </button>

        <button
          type="button"
          onClick={handleRig}
          disabled={selectedNodeIds.length < 2}
          title="Fill ID references from drawn connections"
          style={{
            ...rigToolbarBtn,
            opacity: selectedNodeIds.length < 2 ? 0.4 : 1,
            cursor: selectedNodeIds.length < 2 ? 'not-allowed' : 'pointer',
            pointerEvents: 'auto',
            touchAction: 'manipulation',
          }}
          onMouseDown={(e) => {
            if (selectedNodeIds.length >= 2) {
              e.currentTarget.style.background = '#8B5A0F'
            }
          }}
          onMouseUp={(e) => {
            if (selectedNodeIds.length >= 2) {
              e.currentTarget.style.background = '#BA7517'
            }
          }}
        >
          ⚡ Rig
        </button>

        <button
          type="button"
          onClick={() => setShowTuning(true)}
          style={ghostBtn}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#444460'
            e.currentTarget.style.color = '#c0c0d8'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#2a2a3e'
            e.currentTarget.style.color = '#8888aa'
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.background = '#1a1a2e'
            e.currentTarget.style.color = '#fff'
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = '#8888aa'
          }}
        >
          Tuning
        </button>

        <button
          type="button"
          onClick={openDocs}
          style={ghostBtn}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#444460'
            e.currentTarget.style.color = '#c0c0d8'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#2a2a3e'
            e.currentTarget.style.color = '#8888aa'
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.background = '#1a1a2e'
            e.currentTarget.style.color = '#fff'
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = '#8888aa'
          }}
        >
          Docs
        </button>

        <button
          type="button"
          onClick={() => setShowCompile(true)}
          style={solidBtn}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#534AB7')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#7F77DD')}
          onMouseDown={(e) => (e.currentTarget.style.background = '#4A3F9F')}
          onMouseUp={(e) => (e.currentTarget.style.background = '#7F77DD')}
        >
          Compile &amp; Export
        </button>
      </div>

      {showBlueprints && (
        <Suspense fallback={<ModalLoading label="Loading blueprint library…" />}>
          <BlueprintLibraryModal
            onClose={() => setShowBlueprints(false)}
            dropPosition={blueprintDropPosition}
          />
        </Suspense>
      )}
      {showTuning && (
        <Suspense fallback={<ModalLoading label="Loading tuning tools…" />}>
          <TuningModal onClose={() => setShowTuning(false)} />
        </Suspense>
      )}
      {showCompile && (
        <Suspense fallback={<ModalLoading label="Loading compile tools…" />}>
          <CompileModal onClose={() => setShowCompile(false)} />
        </Suspense>
      )}

      {rigMessage && (
        <div
          style={{
            position: 'fixed',
            top: 60,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            background: '#1a1208',
            border: '1px solid #BA7517',
            borderRadius: 8,
            color: '#e8c06a',
            fontSize: 12,
            fontWeight: 600,
            padding: '8px 16px',
            pointerEvents: 'none',
          }}
        >
          ⚡ {rigMessage}
        </div>
      )}
    </>
  )
}

function ModalLoading({ label }) {
  return (
    <div style={modalOverlay}>
      <div style={modalShell}>
        <div style={{ fontSize: 13, color: '#8888aa' }}>{label}</div>
      </div>
    </div>
  )
}

function ModalLoadFailure({ onClose, label }) {
  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={modalShell} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 13, color: '#E24B4A', fontWeight: 600 }}>{label}</div>
        <button onClick={onClose} style={{ marginTop: 12, ...ghostBtn }}>Close</button>
      </div>
    </div>
  )
}

const modalOverlay = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
}

const modalShell = {
  background: '#13131f',
  border: '1px solid #2a2a3e',
  borderRadius: 14,
  padding: 20,
  minWidth: 240,
  textAlign: 'center',
}

const ghostBtn = {
  background: 'transparent',
  border: '1px solid #2a2a3e',
  borderRadius: 7,
  color: '#8888aa',
  fontSize: 12,
  fontWeight: 600,
  padding: '6px 14px',
  cursor: 'pointer',
  touchAction: 'manipulation',
  WebkitTapHighlightColor: 'transparent',
  userSelect: 'none',
  WebkitUserSelect: 'none',
}

const solidBtn = {
  background: '#7F77DD',
  border: 'none',
  borderRadius: 7,
  color: '#fff',
  fontSize: 12,
  fontWeight: 600,
  padding: '6px 14px',
  cursor: 'pointer',
  touchAction: 'manipulation',
  WebkitTapHighlightColor: 'transparent',
  userSelect: 'none',
  WebkitUserSelect: 'none',
}

const rigToolbarBtn = {
  background: '#BA7517',
  border: 'none',
  borderRadius: 7,
  color: '#fff',
  fontSize: 12,
  fontWeight: 600,
  padding: '6px 14px',
  touchAction: 'manipulation',
  WebkitTapHighlightColor: 'transparent',
  userSelect: 'none',
  WebkitUserSelect: 'none',
}

const viewToggleWrap = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: 3,
  background: '#13131f',
  border: '1px solid #2a2a3e',
  borderRadius: 999,
}

const viewPill = (active) => ({
  background: active ? '#7F77DD' : 'transparent',
  border: 'none',
  borderRadius: 999,
  color: active ? '#fff' : '#a0a0bc',
  fontSize: 12,
  fontWeight: 700,
  padding: '6px 12px',
  cursor: 'pointer',
  touchAction: 'manipulation',
  WebkitTapHighlightColor: 'transparent',
  userSelect: 'none',
  WebkitUserSelect: 'none',
})
```

```javascript
import { describe, it, expect } from 'vitest'
import Toolbar from '../src/components/Toolbar.jsx'

describe('Toolbar lazy loading', () => {
  it('exports a component', () => {
    expect(typeof Toolbar).toBe('function')
  })
})
```

**Verify:** `npm --prefix editor test -- tests/toolbar-lazy.test.js`
**Commit:** `perf(editor): lazy-load toolbar modals`

---

### Task 2.3: Lazy-load inspector forms by node type
**File:** `editor/src/inspector/Inspector.jsx`
**Test:** `editor/tests/inspector-lazy.test.js`
**Depends:** 1.2

```javascript
import { lazy, Suspense } from 'react'
import useStore from '../store/useStore'
import { NODE_CONFIG } from '../nodes/nodeConfig'
import { getInspectorImporter } from './inspectorRegistry'

export default function Inspector() {
  const selectedNodeId = useStore((s) => s.selectedNodeId)
  const nodes = useStore((s) => s.nodes)
  const deleteNode = useStore((s) => s.deleteNode)

  const node = nodes.find((n) => n.id === selectedNodeId)

  if (!node) {
    return (
      <div style={{
        width: 480, background: '#13131f', borderLeft: '1px solid #2a2a3e',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#444460', fontSize: 12, textAlign: 'center', padding: 24,
      }}>
        Click a node to inspect it
      </div>
    )
  }

  const config = NODE_CONFIG[node.data.type] ?? { label: node.data.type, color: '#888' }
  const importer = getInspectorImporter(node.data.type)
  const LazyForm = importer
    ? lazy(() => importer().catch(() => ({ default: InspectorLoadFailure })))
    : null

  return (
    <div style={{
      width: 480, background: '#13131f', borderLeft: '1px solid #2a2a3e',
      display: 'flex', flexDirection: 'column', overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{
        background: config.color, padding: '10px 14px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)' }}>
            {config.label}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginTop: 2 }}>
            {node.data.label || 'Unnamed'}
          </div>
        </div>
        <button
          onClick={() => deleteNode(node.id)}
          title="Delete node"
          style={{ background: 'rgba(0,0,0,0.25)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 16, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >×</button>
      </div>

      {/* Node ID */}
      <div style={{ padding: '6px 14px 0', fontFamily: 'monospace', fontSize: 10, color: '#33334a' }}>
        {node.id}
      </div>

      {/* Form */}
      <div style={{ padding: '12px 14px', flex: 1 }}>
        {LazyForm
          ? (
            <Suspense fallback={<InspectorLoading />}>
              <LazyForm node={node} />
            </Suspense>
          )
          : <div style={{ color: '#555570', fontSize: 12 }}>No inspector for type: {node.data.type}</div>
        }
      </div>
    </div>
  )
}

function InspectorLoading() {
  return (
    <div style={{
      padding: 16,
      borderRadius: 8,
      background: '#1a1a2e',
      border: '1px solid #2a2a3e',
      color: '#666680',
      fontSize: 12,
      textAlign: 'center',
    }}>
      Loading inspector…
    </div>
  )
}

function InspectorLoadFailure() {
  return (
    <div style={{
      padding: 16,
      borderRadius: 8,
      background: '#1a1a2e',
      border: '1px solid #E24B4A44',
      color: '#E24B4A',
      fontSize: 12,
      textAlign: 'center',
    }}>
      Inspector failed to load. Refresh the editor to retry.
    </div>
  )
}
```

```javascript
import { describe, it, expect } from 'vitest'
import Inspector from '../src/inspector/Inspector.jsx'

describe('Inspector lazy loading', () => {
  it('exports a component', () => {
    expect(typeof Inspector).toBe('function')
  })
})
```

**Verify:** `npm --prefix editor test -- tests/inspector-lazy.test.js`
**Commit:** `perf(editor): lazy-load inspector forms`

---

## Batch 3: Verification (parallel - 2 implementers)

These tasks are verification only and should run after code changes above.

### Task 3.1: Editor build chunk verification
**File:** none
**Test:** none
**Depends:** 2.1, 2.2, 2.3

**Verify:** `npm --prefix editor run build`
**Expected:** Build output shows smaller split chunks; main bundle warning reduced or resolved.

### Task 3.2: `.gitignore` verification (no-op)
**File:** none
**Test:** none
**Depends:** none

**Verify:**
- Confirm root `.gitignore` includes `node_modules` and `dist` (UTF-16 file contains both).
- Confirm `editor/.gitignore` includes `node_modules` and `dist`.

**Expected:** No changes required.
