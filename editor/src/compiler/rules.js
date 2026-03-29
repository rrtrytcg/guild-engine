const CURRENT_SCHEMA_VERSION = '1.2.0'

function findNode(allNodes, id) {
  return allNodes.find((node) => node.id === id)
}

function isNodeType(node, type) {
  return node?.type === type
}

function getLabel(node) {
  return node?.label || node?.id || 'Unnamed'
}

function getBuildingLevelCap(allNodes, buildingId) {
  const buildingNode = findNode(allNodes, buildingId)
  if (!buildingNode || buildingNode.type !== 'building') return null

  const baseMax = Number(buildingNode.max_level ?? 0)
  const upgradeMax = allNodes
    .filter((node) => node.type === 'building_upgrade' && (node.host_building ?? node.building_id) === buildingId)
    .reduce((maxLevel, node) => Math.max(maxLevel, Number(node.level ?? node.required_building_level ?? 0)), 0)

  return Math.max(baseMax, upgradeMax)
}

function compareVersions(left, right) {
  const leftParts = String(left ?? '0').split('.').map((part) => Number(part) || 0)
  const rightParts = String(right ?? '0').split('.').map((part) => Number(part) || 0)
  const length = Math.max(leftParts.length, rightParts.length)

  for (let index = 0; index < length; index += 1) {
    const l = leftParts[index] ?? 0
    const r = rightParts[index] ?? 0
    if (l > r) return 1
    if (l < r) return -1
  }

  return 0
}

function buildBuildingDependencyGraph(allNodes) {
  const graph = new Map()

  for (const node of allNodes) {
    if (node.type === 'building') {
      graph.set(node.id, graph.get(node.id) ?? new Set())
    }
  }

  for (const node of allNodes) {
    if (node.type !== 'building_upgrade') continue

    const hostBuilding = node.host_building ?? node.building_id
    if (!hostBuilding) continue

    const dependencies = graph.get(hostBuilding) ?? new Set()
    for (const prerequisite of node.requires?.cross_building ?? []) {
      if (prerequisite?.building_id) dependencies.add(prerequisite.building_id)
    }
    graph.set(hostBuilding, dependencies)
  }

  return graph
}

function detectCyclePath(graph) {
  const visited = new Set()
  const active = new Set()
  const stack = []
  let cycle = null

  function visit(nodeId) {
    if (cycle) return

    visited.add(nodeId)
    active.add(nodeId)
    stack.push(nodeId)

    for (const nextId of graph.get(nodeId) ?? []) {
      if (!visited.has(nextId)) {
        visit(nextId)
        if (cycle) return
        continue
      }

      if (active.has(nextId)) {
        const start = stack.indexOf(nextId)
        cycle = [...stack.slice(start), nextId]
        return
      }
    }

    stack.pop()
    active.delete(nodeId)
  }

  for (const nodeId of graph.keys()) {
    if (!visited.has(nodeId)) visit(nodeId)
    if (cycle) break
  }

  return cycle
}

// Connection rules mirrored from project.schema.json x-connection-rules.
// source type -> { relation -> allowed target types[] }
export const CONNECTION_RULES = {
  resource:        { produces: ['building'], modifies: ['upgrade'], consumes: ['building_workflow', 'crafting_recipe'] },
  item:            { drops_from: ['loot_table'], consumes: ['recipe', 'crafting_recipe'] },
  loot_table:      { drops_from: ['expedition', 'boss_expedition', 'building'] },
  recipe:          { hosts_recipe: ['building'], consumes: ['item'], produces: ['item'] },
  crafting_recipe: { used_by: ['building_workflow'], produces: ['item', 'resource'] },
  hero_class:      { trains: ['building'], preferred_class: ['expedition', 'boss_expedition'], assigned_to: ['building', 'building_workflow'] },
  ability:         { trains: ['hero_class'] },
  building:        { produces: ['resource'], hosts_recipe: ['recipe', 'crafting_recipe'], unlocks: ['upgrade', 'expedition', 'boss_expedition'], gates: ['act'], available_at: ['building_workflow'] },
  building_workflow: { available_at: ['building'], produces: ['resource', 'item', 'consumable'], used_by: ['crafting_recipe'], unlocks: ['building_upgrade'] },
  upgrade:         { modifies: ['resource', 'building', 'hero_class', 'expedition'] },
  building_upgrade: { hosts: ['building'], unlocks: ['building_workflow'], requires_building: ['building'] },
  expedition:      { drops_from: ['loot_table'], gates: ['act'], triggers: ['event'] },
  boss_expedition: { drops_from: ['loot_table'], gates: ['act'], triggers: ['event'] },
  act:             { unlocks: ['building', 'expedition', 'boss_expedition', 'upgrade'], triggers: ['event'] },
  event:           { affects_rep: ['faction'], triggers: ['act'] },
  faction:         { gates: ['upgrade', 'building', 'expedition'], affects_rep: ['event'] },
  prestige:        { gates: ['act'], produces: ['resource'] },
  blueprint:       {},
}

// Required fields per node type — compiler errors if missing or empty
export const REQUIRED_FIELDS = {
  resource:        ['label', 'base_cap', 'base_income'],
  item:            ['label', 'rarity', 'subtype'],
  loot_table:      ['label', 'rolls'],
  recipe:          ['label', 'output_item_id', 'craft_time_s'],
  crafting_recipe: ['label', 'output_item_id', 'workflow_id'],
  hero_class:      ['label', 'base_stats'],
  ability:         ['label', 'trigger'],
  building:        ['label', 'max_level'],
  building_workflow: ['behavior', 'host_building', 'output_rules', 'success_table'],
  upgrade:         ['label'],
  building_upgrade: ['host_building', 'level', 'cost'],
  expedition:      ['label', 'duration_s', 'party_size', 'level', 'loot_table_id'],
  boss_expedition: ['label', 'duration_s', 'party_size', 'boss_hp'],
  act:             ['label', 'act_number'],
  event:           ['label'],
  faction:         ['label'],
  prestige:        ['label', 'currency_id'],
  blueprint:       ['label', 'requires_schema_version'],
}

export const VALIDATION_RULES = [
  {
    id: 'cross_building_prerequisite_exists',
    severity: 'error',
    check: (node, allNodes) => {
      if (!isNodeType(node, 'building_upgrade')) return []

      const messages = []
      for (const prerequisite of node.requires?.cross_building ?? []) {
        const buildingId = prerequisite?.building_id
        const target = buildingId ? findNode(allNodes, buildingId) : null
        if (!buildingId || !target || target.type !== 'building') {
          messages.push(`building_upgrade "${node.id}" requires building "${buildingId ?? ''}" which does not exist in the graph.`)
        }
      }
      return messages
    },
  },
  {
    id: 'cross_building_max_level_sufficient',
    severity: 'error',
    check: (node, allNodes) => {
      if (!isNodeType(node, 'building_upgrade')) return []

      const messages = []
      for (const prerequisite of node.requires?.cross_building ?? []) {
        const buildingId = prerequisite?.building_id
        const requiredLevel = Number(prerequisite?.level ?? 0)
        if (!buildingId) continue

        const maxLevel = getBuildingLevelCap(allNodes, buildingId)
        if (maxLevel !== null && maxLevel < requiredLevel) {
          messages.push(
            `building_upgrade "${node.id}" requires building "${buildingId}" at level ${requiredLevel}, but that building only reaches level ${maxLevel}.`
          )
        }
      }
      return messages
    },
  },
  {
    id: 'no_circular_building_prerequisites',
    severity: 'error',
    global: true,
    check: (_, allNodes) => {
      const cycle = detectCyclePath(buildBuildingDependencyGraph(allNodes))
      if (!cycle) return []
      return [`Circular building prerequisite detected: ${cycle.join(' -> ')}. This will deadlock the player.`]
    },
  },
  {
    id: 'output_rule_resource_exists',
    severity: 'error',
    check: (node, allNodes) => {
      if (!isNodeType(node, 'building_workflow')) return []

      const messages = []
      for (const rule of node.output_rules ?? []) {
        if (rule.output_type !== 'resource') continue

        const target = rule.target ?? ''
        const targetNode = target ? findNode(allNodes, target) : null
        if (!targetNode || targetNode.type !== 'resource') {
          messages.push(`building_workflow "${node.id}" output_rule references resource "${target}" which does not exist in the graph.`)
        }
      }
      return messages
    },
  },
  {
    id: 'output_rule_item_exists',
    severity: 'error',
    check: (node, allNodes) => {
      if (!isNodeType(node, 'building_workflow')) return []

      const messages = []
      for (const rule of node.output_rules ?? []) {
        if (rule.output_type !== 'item' && rule.output_type !== 'consumable') continue

        const target = rule.target ?? ''
        const targetNode = target ? findNode(allNodes, target) : null
        if (!targetNode || targetNode.type !== 'item') {
          messages.push(`building_workflow "${node.id}" output_rule references item "${target}" which does not exist in the graph.`)
        }
      }
      return messages
    },
  },
  {
    id: 'hero_class_artisan_assignment_valid',
    severity: 'error',
    check: (node) => {
      if (!isNodeType(node, 'hero_class')) return []
      if (node.hero_type === 'artisan' && node.combat_eligible === true) {
        return [`hero_class "${node.id}" is hero_type=artisan but has combat_eligible=true. Artisans cannot join expeditions.`]
      }
      return []
    },
  },
  {
    id: 'blueprint_schema_version_compatible',
    severity: 'error',
    check: (node) => {
      if (!isNodeType(node, 'blueprint')) return []

      const requiredVersion = node.requires_schema_version ?? node.blueprint_meta?.requires_schema_version
      if (requiredVersion && compareVersions(requiredVersion, CURRENT_SCHEMA_VERSION) > 0) {
        return [
          `Blueprint "${node.label ?? node.blueprint_meta?.blueprint_id ?? node.id}" requires schema version ${requiredVersion} but current version is ${CURRENT_SCHEMA_VERSION}. Run migration tool first.`,
        ]
      }

      return []
    },
  },
]

// Warnings (non-blocking) — things that are suspicious but not invalid
export const WARNING_CHECKS = [
  {
    id: 'expedition_no_loot',
    check: (node) => (node.type === 'expedition' || node.type === 'boss_expedition') && !node.loot_table_id,
    message: (node) => `"${getLabel(node)}" has no loot table — it will drop nothing on completion.`,
  },
  {
    id: 'expedition_level_range',
    check: (node) => (node.type === 'expedition' || node.type === 'boss_expedition') && (
      node.level === undefined ||
      node.level === null ||
      node.level < 1 ||
      node.level > 20
    ),
    message: (node) => `"${getLabel(node)}" must have a level between 1 and 20.`,
  },
  {
    id: 'expedition_zero_enemy_stats',
    check: (node) => (node.type === 'expedition' || node.type === 'boss_expedition') && (
      node.enemy_atk === 0 || node.enemy_hp === 0
    ),
    message: (node) => `"${getLabel(node)}" has enemy ATK or HP set to 0. That usually means the value was left unset.`,
  },
  {
    id: 'building_no_levels',
    check: (node) => node.type === 'building' && (!node.levels || node.levels.length === 0),
    message: (node) => `"${getLabel(node)}" has no level data — it cannot be built.`,
  },
  {
    id: 'loot_table_no_entries',
    check: (node) => node.type === 'loot_table' && (!node.entries || node.entries.length === 0),
    message: (node) => `Loot table "${getLabel(node)}" has no entries — it will always drop nothing.`,
  },
  {
    id: 'recipe_no_inputs',
    check: (node) => node.type === 'recipe' && (!node.inputs || node.inputs.length === 0),
    message: (node) => `Recipe "${getLabel(node)}" has no ingredients.`,
  },
  {
    id: 'prestige_no_conditions',
    check: (node) => node.type === 'prestige' && (!node.trigger_conditions || node.trigger_conditions.length === 0),
    message: (node) => `Prestige "${getLabel(node)}" has no trigger conditions — it will always be available.`,
  },
  {
    id: 'act_no_conditions',
    check: (node) => node.type === 'act' && (!node.completion_conditions || node.completion_conditions.length === 0),
    message: (node) => `Act "${getLabel(node)}" uses the default completion rules with no extra conditions.`,
  },
  {
    id: 'act_no_expedition_ids',
    check: (node) => node.type === 'act' && (!node.expedition_ids || node.expedition_ids.length === 0),
    message: (node) => `Act "${getLabel(node)}" has no expedition_ids — its act group will be empty.`,
  },
  {
    id: 'act_no_boss_expedition_id',
    check: (node) => node.type === 'act' && (!node.boss_expedition_id || node.boss_expedition_id.trim() === ''),
    message: (node) => `Act "${getLabel(node)}" has no boss_expedition_id — the act cannot complete.`,
  },
  {
    id: 'item_equipment_no_stats',
    check: (node) => node.type === 'item' && node.subtype === 'equipment' && (!node.stat_modifiers || Object.keys(node.stat_modifiers).length === 0),
    message: (node) => `Equipment "${getLabel(node)}" has no stat modifiers — it does nothing when equipped.`,
  },
  {
    id: 'boss_no_phases',
    check: (node) => node.type === 'boss_expedition' && (!node.phases || node.phases.length === 0),
    message: (node) => `Boss "${getLabel(node)}" has no phases — it will be a flat fight with no escalation.`,
  },
  {
    id: 'faction_no_tiers',
    check: (node) => node.type === 'faction' && (!node.rep_tiers || node.rep_tiers.length === 0),
    message: (node) => `Faction "${getLabel(node)}" has no reputation tiers — rep gains will have no effect.`,
  },
  {
    id: 'no_acts',
    check: (_, allNodes) => allNodes.every((node) => node.type !== 'act'),
    message: () => 'No Act nodes found — the game has no story progression or content gates.',
    global: true,
  },
  {
    id: 'no_expeditions',
    check: (_, allNodes) => allNodes.every((node) => node.type !== 'expedition' && node.type !== 'boss_expedition'),
    message: () => 'No Expedition nodes found — the game has no runs for heroes to go on.',
    global: true,
  },
  {
    id: 'duplicate_act_numbers',
    check: (_, allNodes) => {
      const acts = allNodes.filter((node) => node.type === 'act').map((node) => node.act_number)
      return new Set(acts).size !== acts.length
    },
    message: () => 'Multiple Act nodes share the same act_number — acts must have unique numbers.',
    global: true,
  },
]
