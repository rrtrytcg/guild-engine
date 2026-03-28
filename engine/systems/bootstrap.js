// Converts a project.json into a fully hydrated live game state.
// Called once on load. Everything the engine needs lives here.

export function bootstrapState(project) {
  const nodeMap = new Map(project.nodes.map((n) => [n.id, n]))

  // Resources
  const resources = {}
  for (const node of project.nodes.filter((n) => n.type === 'resource')) {
    resources[node.id] = {
      id: node.id,
      label: node.label,
      icon: node.icon ?? '💰',
      amount: 0,
      cap: node.base_cap,
      income: node.base_income ?? 0,
      is_material: node.is_material ?? false,
    }
  }

  // Items / inventory
  const itemDefs = {}
  for (const node of project.nodes.filter((n) => n.type === 'item')) {
    itemDefs[node.id] = node
  }
  const inventory = {} // item_id -> qty
  const buffStockpile = {} // consumable item_id -> qty

  // Hero classes & roster
  const heroClasses = {}
  for (const node of project.nodes.filter((n) => n.type === 'hero_class')) {
    heroClasses[node.id] = node
  }
  const heroes = [] // live hero instances
  const recruitPool = []

  // Buildings
  const buildings = {}
  for (const node of project.nodes.filter((n) => n.type === 'building')) {
    const hasWorkflows = node.has_workflows ?? false
    buildings[node.id] = {
      id: node.id,
      label: node.label,
      icon: node.icon ?? '🏰',
      level: 0, // 0 = not yet built
      max_level: node.max_level,
      levels: node.levels ?? [],
      is_crafting_station: node.is_crafting_station ?? false,
      has_workflows: hasWorkflows,
      artisan_slots: node.artisan_slots ?? null,
      buff_slots: node.buff_slots ?? null,
      passive_events: node.passive_events ?? [],
      assigned_heroes: [],
      craft_queue: [], // legacy recipe queue
      workflow_queue: hasWorkflows ? [] : [],
      artisan_assigned: hasWorkflows ? null : null,
      momentum: hasWorkflows ? 0 : 0,
      streak_count: hasWorkflows ? 0 : 0,
      visible: !node.unlock_conditions?.length,
    }
  }

  // Loot tables
  const lootTables = {}
  for (const node of project.nodes.filter((n) => n.type === 'loot_table')) {
    lootTables[node.id] = node
  }

  // Legacy recipes
  const recipes = {}
  for (const node of project.nodes.filter((n) => n.type === 'recipe')) {
    recipes[node.id] = node
  }

  // Day 2 workflows / recipes / upgrades
  const buildingWorkflows = {}
  for (const node of project.nodes.filter((n) => n.type === 'building_workflow')) {
    buildingWorkflows[node.id] = {
      ...node,
      visible: !node.unlocked_by?.building_level && !node.unlocked_by?.building_prerequisites?.length,
    }
  }

  const craftingRecipes = {}
  for (const node of project.nodes.filter((n) => n.type === 'crafting_recipe')) {
    craftingRecipes[node.id] = {
      ...node,
      visible: !(node.required_building_level > 1),
    }
  }

  const buildingUpgrades = {}
  for (const node of project.nodes.filter((n) => n.type === 'building_upgrade')) {
    buildingUpgrades[node.id] = {
      ...node,
      completed: false,
      visible: true,
    }
  }

  const blueprints = {}
  for (const node of project.nodes.filter((n) => n.type === 'blueprint')) {
    blueprints[node.id] = node
  }

  // Upgrades
  const upgrades = {}
  for (const node of project.nodes.filter((n) => n.type === 'upgrade')) {
    upgrades[node.id] = {
      ...node,
      tier: 0,
      visible: !node.unlock_conditions?.length,
    }
  }

  // Expeditions
  const expeditions = {}
  for (const node of project.nodes.filter(
    (n) => n.type === 'expedition' || n.type === 'boss_expedition'
  )) {
    expeditions[node.id] = {
      ...node,
      visible: false,
      completed: false,
      best_tier: null,
    }
  }

  // Active runs
  const activeRuns = []

  // Acts / events
  const acts = {}
  for (const node of project.nodes.filter((n) => n.type === 'act')) {
    acts[node.id] = { ...node, completed: false, visible: false }
  }

  const events = {}
  for (const node of project.nodes.filter((n) => n.type === 'event')) {
    events[node.id] = { ...node, visible: false }
  }

  const orderedActs = Object.values(acts).sort((a, b) => (a.act_number ?? 0) - (b.act_number ?? 0))
  let previousCompleted = true
  const actOwnedExpeditions = new Set()

  for (const act of orderedActs) {
    act.visible = (act.act_number ?? 0) === 1 || previousCompleted
    previousCompleted = !!act.completed
  }

  for (const act of orderedActs) {
    const actVisible = !!act.visible
    for (const expeditionId of act.expedition_ids ?? []) {
      actOwnedExpeditions.add(expeditionId)
      const expedition = expeditions[expeditionId]
      if (!expedition) continue
      expedition.visible = actVisible && !expedition.unlock_conditions?.length
    }

    const bossExpedition = act.boss_expedition_id ? expeditions[act.boss_expedition_id] : null
    if (bossExpedition) {
      actOwnedExpeditions.add(act.boss_expedition_id)
      bossExpedition.visible = false
    }
  }

  for (const expedition of Object.values(expeditions)) {
    if (actOwnedExpeditions.has(expedition.id)) continue
    expedition.visible = !expedition.unlock_conditions?.length
  }

  // Factions
  const factions = {}
  for (const node of project.nodes.filter((n) => n.type === 'faction')) {
    factions[node.id] = { ...node, rep: node.starting_rep ?? 0 }
  }

  // Prestige
  const prestige = {}
  for (const node of project.nodes.filter((n) => n.type === 'prestige')) {
    prestige[node.id] = {
      ...node,
      count: 0,
      currency: 0,
      purchased: {}, // bonus_id -> tier bought
    }
  }

  // Multipliers (modified by upgrades / world effects)
  const multipliers = {
    resource_cap: {}, // resource_id -> multiplier
    resource_income: {}, // resource_id -> multiplier
    hero_stats: {}, // stat -> modifier
    expedition_success: 0, // flat bonus
    craft_speed: 1,
    loot_bonus_pct: 0,
  }

  // Event log
  const eventLog = [
    { ts: Date.now(), text: `${project.meta.title} — a new adventure begins.`, type: 'system' },
  ]

  // UI state
  const ui = {
    screen: 'world', // 'world' | 'expedition' | 'forge'
    activeRunId: null,
    selectedBuildingId: null,
    notification: null,
  }

  return {
    meta: project.meta,
    tick: 0,
    lastTickAt: Date.now(),

    resources,
    inventory,
    buff_stockpile: buffStockpile,
    itemDefs,
    heroes,
    heroClasses,
    recruitPool,
    buildings,
    lootTables,
    recipes,
    craftingRecipes,
    buildingWorkflows,
    buildingUpgrades,
    blueprints,
    upgrades,
    expeditions,
    activeRuns,
    acts,
    events,
    factions,
    prestige,
    multipliers,
    eventLog,
    ui,
    _nodeMap: nodeMap,
    _project: project,
  }
}
