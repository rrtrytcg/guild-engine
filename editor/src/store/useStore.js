import { create } from 'zustand'
import { addEdge, applyNodeChanges, applyEdgeChanges } from 'reactflow'

const useStore = create((set, get) => ({
  // --- Graph state ---
  nodes: [],
  edges: [],
  selectedNodeId: null,
  blueprints: [],

  // --- ReactFlow handlers (wired directly to <ReactFlow> props) ---
  onNodesChange: (changes) =>
    set({ nodes: applyNodeChanges(changes, get().nodes) }),

  onEdgesChange: (changes) =>
    set({ edges: applyEdgeChanges(changes, get().edges) }),

  onConnect: (connection) =>
    set({ edges: addEdge({ ...connection, id: `e-${Date.now()}` }, get().edges) }),

  // --- Node selection ---
  selectNode: (id) => set({ selectedNodeId: id }),
  clearSelection: () => set({ selectedNodeId: null }),

  // --- Node data update (called from Inspector forms) ---
  updateNodeData: (id, patch) =>
    set({
      nodes: get().nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...patch } } : n
      ),
    }),

  // --- Add a new node from the palette ---
  addNode: (type, position) => {
    const id = `${type}-${Date.now()}`
    const defaults = NODE_DEFAULTS[type] ?? { label: type }
    set({
      nodes: [
        ...get().nodes,
        {
          id,
          type,
          position,
          data: { id, type, ...defaults },
        },
      ],
    })
    return id
  },

  // --- Delete selected node + its edges ---
  deleteNode: (id) =>
    set({
      nodes: get().nodes.filter((n) => n.id !== id),
      edges: get().edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: get().selectedNodeId === id ? null : get().selectedNodeId,
    }),

  // --- Import project.json ---
  importProject: (project) => {
    if (!project?.nodes || !project?.edges) {
      alert('Invalid project.json - missing nodes or edges array.')
      return
    }

    const COLS = 4
    const GAP_X = 260
    const GAP_Y = 180
    const OFFSET_X = 80
    const OFFSET_Y = 80

    const rfNodes = project.nodes.map((nodeData, i) => {
      const pos = nodeData.canvas_pos ?? {
        x: OFFSET_X + (i % COLS) * GAP_X,
        y: OFFSET_Y + Math.floor(i / COLS) * GAP_Y,
      }
      return {
        id: nodeData.id,
        type: nodeData.type,
        position: { x: pos.x, y: pos.y },
        data: nodeData,
      }
    })

    const rfEdges = project.edges.map((e) => ({
      id: e.id ?? `e-${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      data: { relation: e.relation },
      style: { stroke: '#444466', strokeWidth: 1.5 },
    }))

    set({ nodes: rfNodes, edges: rfEdges, selectedNodeId: null })
  },

  // --- Save a .blueprint.json into the local preset library ---
  registerBlueprint: (blueprintJson) => {
    if (!blueprintJson?.blueprint_meta || !Array.isArray(blueprintJson.nodes)) return
    set({
      blueprints: upsertBlueprint(get().blueprints, blueprintJson),
    })
  },

  // --- Import a blueprint graph onto the canvas ---
  importBlueprint: (blueprintJson, dropPosition = { x: 320, y: 180 }) => {
    if (!Array.isArray(blueprintJson?.nodes) || blueprintJson.nodes.length === 0) return

    const timestamp = Date.now()
    const idMap = Object.fromEntries(
      blueprintJson.nodes
        .filter((nodeData) => nodeData?.id)
        .map((nodeData) => [nodeData.id, `import-${timestamp}-${nodeData.id}`])
    )

    const importedNodes = blueprintJson.nodes.map((nodeData, index) => {
      const remappedData = remapBlueprintNode(nodeData, idMap)
      const relativePos = nodeData.canvas_pos ?? {
        x: (index % 4) * 220,
        y: Math.floor(index / 4) * 160,
      }
      const absolutePos = {
        x: Number(dropPosition.x ?? 0) + Number(relativePos.x ?? 0),
        y: Number(dropPosition.y ?? 0) + Number(relativePos.y ?? 0),
      }

      return {
        id: remappedData.id,
        type: remappedData.type,
        position: absolutePos,
        data: {
          ...remappedData,
          canvas_pos: absolutePos,
        },
      }
    })

    set({
      nodes: [...get().nodes, ...importedNodes],
      selectedNodeId: importedNodes[0]?.id ?? get().selectedNodeId,
    })
  },

  // --- Export .blueprint.json from a blueprint node ---
  exportBlueprint: (blueprintNodeId) => {
    const blueprintNode = get().nodes.find((n) => n.id === blueprintNodeId)
    if (!blueprintNode) return

    const nodeIds = blueprintNode.data?.node_ids ?? []
    const selectedNodes = nodeIds
      .map((nodeId) => get().nodes.find((n) => n.id === nodeId))
      .filter(Boolean)
      .map((node) => node.data)

    const payload = {
      blueprint_meta: {
        id: blueprintNode.id,
        label: blueprintNode.data?.label || blueprintNode.id,
        description: blueprintNode.data?.description || '',
        requires_schema_version: blueprintNode.data?.requires_schema_version || '1.2.0',
        created_at: new Date().toISOString(),
      },
      nodes: selectedNodes,
    }

    set({
      blueprints: upsertBlueprint(get().blueprints, payload),
    })

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${(blueprintNode.data?.label || blueprintNode.id || 'blueprint').replace(/\s+/g, '-').toLowerCase()}.blueprint.json`
    anchor.click()
    URL.revokeObjectURL(url)
  },

  // project export is handled by compiler.js + CompileModal
}))

// Default field values when a node is first dropped onto the canvas
const NODE_DEFAULTS = {
  resource: {
    label: 'New Resource',
    description: '',
    icon: '💰',
    base_cap: 1000,
    base_income: 0,
    is_material: false,
  },
  hero_class: {
    label: 'New Hero Class',
    description: '',
    icon: '⚔️',
    base_stats: { attack: 10, defense: 5, speed: 5, hp: 100, luck: 5 },
    stat_growth: { attack: 2, defense: 1, speed: 1, hp: 20, luck: 1 },
    slots: ['weapon', 'armor'],
    recruit_cost: [],
    unlock_conditions: [],
  },
  item: {
    label: 'New Item',
    description: '',
    icon: '🗡️',
    rarity: 'common',
    subtype: 'equipment',
    slot: 'weapon',
    stat_modifiers: {},
    stack_limit: 1,
  },
  loot_table: {
    label: 'New Loot Table',
    rolls: 1,
    entries: [],
  },
  recipe: {
    label: 'New Recipe',
    inputs: [],
    output_item_id: '',
    output_qty: 1,
    craft_time_s: 10,
    unlock_conditions: [],
  },
  ability: {
    label: 'New Ability',
    description: '',
    icon: '✨',
    trigger: 'passive',
    effect: {},
    unlock_level: 1,
  },
  building: {
    label: 'New Building',
    description: '',
    icon: '🏰',
    max_level: 5,
    levels: [],
    is_crafting_station: false,
    loot_table_id: '',
    unlock_conditions: [],
  },
  upgrade: {
    label: 'New Upgrade',
    description: '',
    icon: '⬆️',
    cost: [],
    max_tier: 1,
    effect: {},
    unlock_conditions: [],
  },
  building_workflow: {
    label: 'New Workflow',
    behavior: 'consume_resource',
    workflow_mode: 'queued',
    action_type: '',
    base_duration_ticks: 80,
    duration_base_ticks: 80,
    input_rules: [],
    inputs: [],
    output_rules: [],
    success_table: {
      base_failure: 0.10,
      base_crit: 0.05,
      failure_behavior: 'consume_inputs_no_output',
      crit_behavior: 'double_output',
      crit_multiplier: 2,
      failure_grants_xp: true,
      failure_xp_multiplier: 0.5,
      xp_on_complete: 20,
    },
    xp_on_complete: 20,
    streak_bonus: null,
    momentum_config: null,
    visible: true,
  },
  building_upgrade: {
    label: 'New Upgrade',
    building_id: '',
    host_building: '',
    required_building_level: 2,
    level: 2,
    cost: [],
    unlocks_workflow_ids: [],
    artisan_slot_increase: 0,
    effects: {
      unlocks_workflows: [],
      slots_added: 0,
    },
    visible: true,
  },
  blueprint: {
    label: 'New Blueprint',
    description: '',
    node_ids: [],
    requires_schema_version: '1.2.0',
    visible: true,
  },
  expedition: {
    label: 'New Expedition',
    description: '',
    icon: '🗺️',
    duration_s: 60,
    party_size: 3,
    level: 1,
    enemy_atk: 10,
    enemy_hp: 100,
    base_xp: null,
    curse_chance: 0,
    loot_table_id: '',
    fail_loot_table_id: '',
    entry_cost: [],
    resource_rewards: [],
    faction_rewards: [],
    on_success_unlock: [],
    events: [],
    unlock_conditions: [],
  },
  boss_expedition: {
    label: 'New Boss',
    description: '',
    icon: '💀',
    duration_s: 120,
    party_size: 4,
    level: 1,
    enemy_atk: 10,
    enemy_hp: 100,
    base_xp: null,
    curse_chance: 0,
    boss_hp: 1000,
    boss_stats: { attack: 50, defense: 30, speed: 10 },
    phases: [],
    loot_table_id: '',
    fail_loot_table_id: '',
    entry_cost: [],
    resource_rewards: [],
    faction_rewards: [],
    on_success_unlock: [],
    repeatable: false,
    unlock_conditions: [],
  },
  act: {
    label: 'Act 1',
    description: '',
    act_number: 1,
    completion_conditions: [],
    expedition_ids: [],
    boss_expedition_id: '',
    on_complete_events: [],
    unlocks_node_ids: [],
    narrative_log: '',
  },
  event: {
    label: 'New Event',
    description: '',
    log_message: '',
    choices: [],
  },
  faction: {
    label: 'New Faction',
    description: '',
    icon: '⚜️',
    rep_tiers: [],
    starting_rep: 0,
  },
  prestige: {
    label: 'Prestige Layer',
    description: '',
    trigger_conditions: [],
    currency_id: '',
    currency_formula: 'Math.floor(Math.sqrt(gold / 1000))',
    resets: ['resources', 'buildings', 'heroes', 'upgrades'],
    bonuses: [],
  },
}

const SCALAR_REFERENCE_KEYS = new Set([
  'id',
  'loot_table_id',
  'fail_loot_table_id',
  'currency_id',
  'output_item_id',
  'boss_expedition_id',
  'host_building',
  'required_workflow',
  'output_item',
  'building_id',
  'target',
  'target_class',
  'resource',
  'resource_id',
  'item_id',
  'faction_id',
  'apply_target',
])

const ARRAY_REFERENCE_KEYS = new Set([
  'connections',
  'node_ids',
  'building_affinity',
  'unlocks_workflow_ids',
  'unlocks_workflows',
  'unlocks_auto_repeat_on',
  'building_prerequisites',
  'hero_class_pool',
  'unlock_node_ids',
  'on_complete_events',
  'unlocks_node_ids',
  'on_success_unlock',
  'expedition_ids',
])

function upsertBlueprint(blueprints, blueprintJson) {
  const blueprintId = blueprintJson?.blueprint_meta?.id
  if (!blueprintId) return blueprints

  return [
    blueprintJson,
    ...blueprints.filter((blueprint) => blueprint?.blueprint_meta?.id !== blueprintId),
  ]
}

function remapBlueprintNode(nodeData, idMap) {
  return remapBlueprintValue(nodeData, '', idMap)
}

function remapBlueprintValue(value, key, idMap) {
  if (Array.isArray(value)) {
    const shouldMapArray = ARRAY_REFERENCE_KEYS.has(key) || key.endsWith('_ids')
    return value.map((item) => {
      if (shouldMapArray && typeof item === 'string') {
        return idMap[item] ?? item
      }
      return remapBlueprintValue(item, '', idMap)
    })
  }

  if (value && typeof value === 'object') {
    const next = {}
    for (const [childKey, childValue] of Object.entries(value)) {
      next[childKey] = remapBlueprintValue(childValue, childKey, idMap)
    }
    return next
  }

  if (typeof value === 'string') {
    const shouldMapScalar = key === 'id' || SCALAR_REFERENCE_KEYS.has(key) || key.endsWith('_id')
    if (shouldMapScalar) {
      return idMap[value] ?? value
    }
  }

  return value
}

export default useStore
