import { create } from 'zustand'
import { addEdge, applyNodeChanges, applyEdgeChanges } from 'reactflow'

export const GROUP_COLOR_PALETTE = [
  '#185FA5',
  '#1D9E75',
  '#BA7517',
  '#993C1D',
  '#534AB7',
  '#3B6D11',
  '#993556',
  '#5F5E5A',
]

const useStore = create((set, get) => ({
  // --- Graph state ---
  nodes: [],
  edges: [],
  selectedNodeId: null,
  blueprints: [],
  groups: [],
  canvasView: 'nodes',
  activeGroupId: null,

  // --- ReactFlow handlers (wired directly to <ReactFlow> props) ---
  onNodesChange: (changes) => {
    const removedNodeIds = changes
      .filter((change) => change.type === 'remove')
      .map((change) => change.id)

    set({
      nodes: applyNodeChanges(changes, get().nodes),
      groups: removedNodeIds.length > 0
        ? removeNodesFromGroups(get().groups, removedNodeIds)
        : get().groups,
      selectedNodeId: removedNodeIds.includes(get().selectedNodeId)
        ? null
        : get().selectedNodeId,
    })
  },

  onEdgesChange: (changes) =>
    set({ edges: applyEdgeChanges(changes, get().edges) }),

  onConnect: (connection) =>
    set({ edges: addEdge({ ...connection, id: `e-${Date.now()}` }, get().edges) }),

  // --- Node selection ---
  selectNode: (id) => set({ selectedNodeId: id }),
  clearSelection: () => set({ selectedNodeId: null }),

  // --- Group metadata ---
  createGroup: (nodeIds, label) => {
    const nodes = get().nodes
    const validNodeIds = sanitizeGroupNodeIds(nodeIds, nodes)
    if (validNodeIds.length === 0) return null

    const groups = get().groups
    const groupId = `group-${Date.now()}`
    const trimmedLabel = String(label ?? '').trim()
    const group = {
      id: groupId,
      label: trimmedLabel || `Group ${groups.length + 1}`,
      color: pickNextGroupColor(groups),
      nodeIds: validNodeIds,
      position: calculateGroupCentroid(nodes, validNodeIds),
      size: calculateGroupSize(validNodeIds.length),
    }

    set({
      groups: assignNodesToGroup([...groups, group], groupId, validNodeIds),
    })

    return groupId
  },

  renameGroup: (groupId, label) =>
    set({
      groups: get().groups.map((group) => (
        group.id === groupId
          ? { ...group, label: String(label ?? '').trim() || group.label }
          : group
      )),
    }),

  recolorGroup: (groupId, color) =>
    set({
      groups: get().groups.map((group) => (
        group.id === groupId ? { ...group, color } : group
      )),
    }),

  deleteGroup: (groupId) =>
    set({
      groups: get().groups.filter((group) => group.id !== groupId),
      activeGroupId: get().activeGroupId === groupId ? null : get().activeGroupId,
    }),

  addNodesToGroup: (groupId, nodeIds) => {
    const validNodeIds = sanitizeGroupNodeIds(nodeIds, get().nodes)
    if (validNodeIds.length === 0) return

    set({
      groups: assignNodesToGroup(get().groups, groupId, validNodeIds),
    })
  },

  removeNodesFromGroup: (nodeIds) => {
    const validNodeIds = sanitizeGroupNodeIds(nodeIds, get().nodes)
    if (validNodeIds.length === 0) return

    set({
      groups: removeNodesFromGroups(get().groups, validNodeIds),
    })
  },

  setCanvasView: (view) =>
    set((state) => ({
      canvasView: view === 'groups' ? 'groups' : 'nodes',
      activeGroupId: view === 'groups' ? null : state.activeGroupId,
    })),

  setActiveGroup: (groupId) => set({ activeGroupId: groupId }),

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
      groups: removeNodesFromGroups(get().groups, [id]),
      selectedNodeId: get().selectedNodeId === id ? null : get().selectedNodeId,
    }),

  deleteNodes: (ids) => {
    const targets = new Set(ids ?? [])
    if (targets.size === 0) return

    set({
      nodes: get().nodes.filter((n) => !targets.has(n.id)),
      edges: get().edges.filter((e) => !targets.has(e.source) && !targets.has(e.target)),
      groups: removeNodesFromGroups(get().groups, Array.from(targets)),
      selectedNodeId: targets.has(get().selectedNodeId) ? null : get().selectedNodeId,
    })
  },

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

    set({
      nodes: rfNodes,
      edges: rfEdges,
      groups: normalizeImportedGroups(project.groups, rfNodes),
      selectedNodeId: null,
      canvasView: 'nodes',
      activeGroupId: null,
    })
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
    if (!Array.isArray(blueprintJson?.nodes) || blueprintJson.nodes.length === 0) return null

    const existingNodes = get().nodes
    const maxX = existingNodes.length > 0
      ? Math.max(...existingNodes.map((n) => (n.position.x + 240)))
      : 0
    const safeDropX = Math.max(dropPosition?.x ?? 100, maxX + 80)
    const safeDropY = dropPosition?.y ?? 80

    const blueprintPositions = blueprintJson.nodes.map((nodeData, index) => (
      nodeData.canvas_pos ?? {
        x: (index % 4) * 220,
        y: Math.floor(index / 4) * 160,
      }
    ))
    const blueprintOrigin = blueprintPositions.reduce((best, pos) => {
      if (!best) return pos
      const bestScore = Number(best.x ?? 0) + Number(best.y ?? 0)
      const nextScore = Number(pos.x ?? 0) + Number(pos.y ?? 0)
      if (nextScore < bestScore) return pos
      if (nextScore === bestScore && Number(pos.x ?? 0) < Number(best.x ?? 0)) return pos
      return best
    }, null)

    const timestamp = Date.now()
    const idMap = Object.fromEntries(
      blueprintJson.nodes
        .filter((nodeData) => nodeData?.id)
        .map((nodeData) => [nodeData.id, `import-${timestamp}-${nodeData.id}`])
    )

    const remappedBlueprintNodes = blueprintJson.nodes
      .map((nodeData) => remapBlueprintNode(nodeData, idMap))
      .map((nodeData) => normalizeImportedBlueprintNode(nodeData, idMap))

    const importedNodes = remappedBlueprintNodes.map((remappedData, index) => {
      const relativePos = blueprintPositions[index]
      const absolutePos = {
        x: Number(safeDropX) + Number(relativePos.x ?? 0) - Number(blueprintOrigin?.x ?? 0),
        y: Number(safeDropY) + Number(relativePos.y ?? 0) - Number(blueprintOrigin?.y ?? 0),
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

    const existingGraphIds = new Set(existingNodes.map((node) => node.data?.id ?? node.id))
    const importedIds = new Set(importedNodes.map((node) => node.data?.id ?? node.id))
    const semanticMatches = findSemanticDependencyMatches(importedNodes, {
      existingNodes,
      existingGraphIds,
      importedIds,
    })
    const normalizedImportedNodes = semanticMatches.idMap.size > 0
      ? importedNodes.map((node) => ({
          ...node,
          data: remapDependencyReferences(node.data, '', semanticMatches.lookup),
        }))
      : importedNodes

    const autoCreatedNodes = buildAutoCreatedDependencyNodes(normalizedImportedNodes, {
      existingGraphIds,
      importedIds,
      safeDropX,
      safeDropY,
    })

    set({
      nodes: [...get().nodes, ...autoCreatedNodes, ...normalizedImportedNodes],
      selectedNodeId: normalizedImportedNodes[0]?.id ?? get().selectedNodeId,
    })

    if (normalizedImportedNodes.length > 0) {
      get().createGroup(
        normalizedImportedNodes.map((node) => node.id),
        blueprintJson?.blueprint_meta?.label ?? 'Imported Blueprint'
      )
    }

    return {
      importedCount: normalizedImportedNodes.length,
      autoCreatedCount: autoCreatedNodes.length,
      autoCreated: autoCreatedNodes.map((node) => ({
        id: node.data.id,
        type: node.data.type,
      })),
      remapped: semanticMatches.messages,
    }
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

  exportProject: (project) => ({
    ...project,
    groups: get().groups.map(serializeProjectGroup),
  }),

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

function normalizeImportedBlueprintNode(nodeData, idMap) {
  if (!nodeData || typeof nodeData !== 'object') return nodeData

  if (nodeData.type === 'building_workflow') {
    const buildingId = nodeData.building_id ?? nodeData.host_building
    if (!buildingId) return nodeData

    const remappedBuildingId = idMap[buildingId] ?? buildingId
    return {
      ...nodeData,
      building_id: remappedBuildingId,
      host_building: remappedBuildingId,
    }
  }

  if (nodeData.type === 'building_upgrade') {
    const buildingId = nodeData.building_id ?? nodeData.host_building
    const remappedBuildingId = buildingId ? (idMap[buildingId] ?? buildingId) : ''
    const unlocksWorkflowIds = (nodeData.unlocks_workflow_ids ?? []).map((workflowId) => idMap[workflowId] ?? workflowId)

    return {
      ...nodeData,
      building_id: remappedBuildingId,
      host_building: remappedBuildingId,
      unlocks_workflow_ids: unlocksWorkflowIds,
      effects: nodeData.effects
        ? {
            ...nodeData.effects,
            unlocks_workflows: (nodeData.effects.unlocks_workflows ?? []).map((workflowId) => idMap[workflowId] ?? workflowId),
          }
        : nodeData.effects,
    }
  }

  return nodeData
}

function findSemanticDependencyMatches(importedNodes, context) {
  const missingDependencies = collectMissingDependencies(importedNodes, context)
  const resourceNodes = context.existingNodes.filter((node) => node.type === 'resource')
  const idMap = new Map()
  const messages = []

  for (const [missingId, type] of missingDependencies.entries()) {
    if (type !== 'resource') continue

    const targetLabel = normalizeText(humanizeId(missingId))
    const match = resourceNodes.find((node) => (
      normalizeText(node.data?.label) === targetLabel
      || normalizeText(stripTypePrefix(node.id)) === normalizeText(missingId)
    ))

    if (!match) continue

    idMap.set(missingId, match.id)
    messages.push(`Remapped '${missingId}' -> '${match.id}' (matched by label)`)
  }

  return {
    idMap,
    lookup: Object.fromEntries(idMap),
    messages,
  }
}

function remapDependencyReferences(value, key, idMap) {
  if (Array.isArray(value)) {
    const shouldMapArray = ARRAY_REFERENCE_KEYS.has(key) || key.endsWith('_ids')
    return value.map((item) => {
      if (shouldMapArray && typeof item === 'string') {
        return idMap[item] ?? item
      }
      return remapDependencyReferences(item, '', idMap)
    })
  }

  if (value && typeof value === 'object') {
    const next = {}
    for (const [childKey, childValue] of Object.entries(value)) {
      next[childKey] = remapDependencyReferences(childValue, childKey, idMap)
    }
    return next
  }

  if (typeof value === 'string') {
    const shouldMapScalar = key !== 'id' && (SCALAR_REFERENCE_KEYS.has(key) || key.endsWith('_id'))
    if (shouldMapScalar) {
      return idMap[value] ?? value
    }
  }

  return value
}

function buildAutoCreatedDependencyNodes(importedNodes, context) {
  const missingDependencies = collectMissingDependencies(importedNodes, context)
  return Array.from(missingDependencies.entries()).map(([id, type], index) => {
    const position = {
      x: Number(context.safeDropX ?? 0) - 240,
      y: Number(context.safeDropY ?? 0) + (index * 160),
    }
    const data = type === 'item'
      ? {
          id,
          type: 'item',
          label: humanizeId(id),
          icon: '📦',
          subtype: 'material',
          slot: null,
          rarity: 'common',
          stack_limit: 99,
          item_type: 'material',
          stack_max: 99,
          visible: true,
          canvas_pos: position,
        }
      : {
          id,
          type: 'resource',
          label: humanizeId(id),
          icon: '📦',
          base_income: 0,
          base_cap: 500,
          is_material: true,
          visible: true,
          canvas_pos: position,
        }

    return {
      id,
      type: data.type,
      position,
      data,
    }
  })
}

function collectMissingDependencies(importedNodes, context) {
  const missing = new Map()
  const knownIds = new Set([
    ...context.existingGraphIds,
    ...context.importedIds,
  ])

  const addMissing = (id, type) => {
    if (!id || knownIds.has(id)) return
    if (!missing.has(id)) {
      missing.set(id, type)
    }
  }

  const scanOutputRules = (rules = []) => {
    for (const rule of rules) {
      if (!rule?.target) continue
      if (rule.output_type === 'resource') {
        addMissing(rule.target, 'resource')
      } else if (rule.output_type === 'item' || rule.output_type === 'consumable') {
        addMissing(rule.target, 'item')
      }
    }
  }

  const scanResourceEntries = (entries = []) => {
    for (const entry of entries) {
      const resourceId = entry?.resource_id ?? entry?.resource
      if (resourceId) addMissing(resourceId, 'resource')
    }
  }

  const scanNode = (nodeData) => {
    scanOutputRules(nodeData?.output_rules)
    scanResourceEntries(nodeData?.input_rules)
    scanResourceEntries(nodeData?.inputs)
    scanResourceEntries(nodeData?.cost)
    scanResourceEntries(nodeData?.recruit_cost)
    scanResourceEntries(nodeData?.build_cost)

    for (const level of nodeData?.levels ?? []) {
      scanResourceEntries(level?.build_cost)
    }
  }

  for (const node of importedNodes) {
    scanNode(node.data ?? node)
  }

  return missing
}

function humanizeId(id) {
  return String(id ?? '')
    .split(/[_-]/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

function stripTypePrefix(id) {
  return String(id ?? '').replace(/^[a-z]+-/, '')
}

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase()
}

function sanitizeGroupNodeIds(nodeIds, nodes) {
  const validNodeIds = new Set(nodes.map((node) => node.id))
  return Array.from(new Set((nodeIds ?? []).filter((nodeId) => validNodeIds.has(nodeId))))
}

function calculateGroupCentroid(nodes, nodeIds) {
  const selectedNodes = nodes.filter((node) => nodeIds.includes(node.id))
  if (selectedNodes.length === 0) {
    return { x: 80, y: 80 }
  }

  const totals = selectedNodes.reduce((acc, node) => ({
    x: acc.x + Number(node.position?.x ?? 0),
    y: acc.y + Number(node.position?.y ?? 0),
  }), { x: 0, y: 0 })

  return {
    x: Math.round(totals.x / selectedNodes.length),
    y: Math.round(totals.y / selectedNodes.length),
  }
}

function calculateGroupSize(nodeCount) {
  return {
    w: Math.max(200, Number(nodeCount ?? 0) * 40),
    h: 160,
  }
}

function pickNextGroupColor(groups) {
  return GROUP_COLOR_PALETTE[groups.length % GROUP_COLOR_PALETTE.length]
}

function removeNodesFromGroups(groups, nodeIds) {
  const removedIds = new Set(nodeIds)
  return groups.map((group) => {
    const nextNodeIds = group.nodeIds.filter((nodeId) => !removedIds.has(nodeId))
    return {
      ...group,
      nodeIds: nextNodeIds,
      size: calculateGroupSize(nextNodeIds.length),
    }
  })
}

function assignNodesToGroup(groups, groupId, nodeIds) {
  const assignedIds = new Set(nodeIds)

  return groups.map((group) => {
    const withoutMovedNodes = group.nodeIds.filter((nodeId) => !assignedIds.has(nodeId))
    const nextNodeIds = group.id === groupId
      ? Array.from(new Set([...withoutMovedNodes, ...nodeIds]))
      : withoutMovedNodes

    return {
      ...group,
      nodeIds: nextNodeIds,
      size: calculateGroupSize(nextNodeIds.length),
    }
  })
}

function normalizeImportedGroups(groups, nodes) {
  const safeGroups = Array.isArray(groups) ? groups : []

  return safeGroups.map((group, index) => {
    const nodeIds = sanitizeGroupNodeIds(group?.nodeIds, nodes)
    const color = GROUP_COLOR_PALETTE.includes(group?.color) ? group.color : pickNextGroupColor(safeGroups.slice(0, index))

    return {
      id: group?.id || `group-${Date.now()}-${index}`,
      label: String(group?.label ?? '').trim() || `Group ${index + 1}`,
      color,
      nodeIds,
      position: {
        x: Number(group?.position?.x ?? calculateGroupCentroid(nodes, nodeIds).x),
        y: Number(group?.position?.y ?? calculateGroupCentroid(nodes, nodeIds).y),
      },
      size: {
        w: Number(group?.size?.w ?? calculateGroupSize(nodeIds.length).w),
        h: Number(group?.size?.h ?? calculateGroupSize(nodeIds.length).h),
      },
    }
  })
}

function serializeProjectGroup(group) {
  return {
    id: group.id,
    label: group.label,
    color: group.color,
    nodeIds: [...group.nodeIds],
    position: { ...group.position },
    size: { ...group.size },
  }
}

export default useStore
