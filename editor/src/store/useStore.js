import { create } from 'zustand'
import { addEdge, applyNodeChanges, applyEdgeChanges } from 'reactflow'
import { inferRelation, relationColor } from '../canvas/inferRelation'
import { generateId } from '../utils/ids'
import {
  injectByPath, createNodeFromParameter, injectParameterIntoWorkflow, injectParameterIntoRecipe,
  upsertBlueprint, serializeBlueprintEdge, remapBlueprintNode, remapBlueprintEdge,
  normalizeImportedBlueprintNode, applyImportedBlueprintCrossReferences,
  findSemanticDependencyMatches, remapDependencyReferences,
  buildAutoCreatedDependencyNodes,
} from '../utils/blueprintUtils.js'
import {
  GROUP_COLOR_PALETTE,
  sanitizeGroupNodeIds,
  calculateGroupCentroid,
  calculateGroupSize,
  pickNextGroupColor,
  removeNodesFromGroups,
  assignNodesToGroup,
  normalizeImportedGroups,
  serializeProjectGroup,
} from '../utils/groupUtils.js'

export { GROUP_COLOR_PALETTE }

const useStore = create((set, get) => ({
  // --- Graph state ---
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedNodeIds: [],
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

  onConnect: (edgeOrConnection) => {
    // If Canvas already built a full edge object (has data.relation), append directly
    if (edgeOrConnection?.data?.relation !== undefined) {
      set({ edges: [...get().edges, edgeOrConnection] })
    } else {
      set({ edges: addEdge({ ...edgeOrConnection, id: generateId('e') }, get().edges) })
    }
  },

  // --- Node selection ---
  selectNode: (id) => set({ selectedNodeId: id }),
  clearSelection: () => set({ selectedNodeId: null, selectedNodeIds: [] }),
  setSelectedNodeIds: (ids) => set({ selectedNodeIds: ids ?? [] }),

  rigSelectedNodes: () => {
    const { nodes, edges, selectedNodeIds } = get()

    // Get only edges where BOTH source and target are in the selection
    const selectedIds = new Set(selectedNodeIds?.length > 0
      ? selectedNodeIds
      : nodes.filter(n => n.selected).map(n => n.id))

    const internalEdges = edges.filter(e =>
      selectedIds.has(e.source) && selectedIds.has(e.target))

    const nodeMap = new Map(nodes.map(n => [n.id, n]))
    const patches = new Map() // nodeId → data patch

    const patch = (nodeId, update) => {
      const existing = patches.get(nodeId) ?? {}
      patches.set(nodeId, { ...existing, ...update })
    }

    for (const edge of internalEdges) {
      const source = nodeMap.get(edge.source)
      const target = nodeMap.get(edge.target)
      if (!source || !target) continue
      const relation = edge.data?.relation ??
        inferRelation(source.data.type, target.data.type)

      switch (relation) {
        case 'available_at':
          if (source.data.type === 'building_workflow')
            patch(source.id, { building_id: target.id })
          break

        case 'produces':
          if (source.data.type === 'building_workflow') {
            const existing = (patches.get(source.id)?.output_rules) ?? source.data.output_rules ?? []
            const alreadyWired = existing.some(r => r.target === target.id)
            if (!alreadyWired)
              patch(source.id, { output_rules: [
                ...existing,
                { output_type: 'resource', target: target.id,
                  yield_formula: '1', chance: 1 }
              ]})
          }
          if (source.data.type === 'building') {
            const levels = source.data.levels ?? []
            const updated = levels.map(lvl => ({
              ...lvl,
              production: { ...(lvl.production ?? {}), [target.id]: 1 }
            }))
            patch(source.id, { produces_resource: target.id, levels: updated })
          }
          if (source.data.type === 'crafting_recipe')
            patch(source.id, { output_item_id: target.id })
          break

        case 'consumes':
          if (target.data.type === 'crafting_recipe' ||
              target.data.type === 'recipe') {
            const existing = (patches.get(target.id)?.inputs) ?? target.data.inputs ?? []
            const alreadyWired = existing.some(i => i.item_id === source.id)
            if (!alreadyWired)
              patch(target.id, { inputs: [
                ...existing, { item_id: source.id, qty: 1 }
              ]})
          }
          if (target.data.type === 'building_workflow') {
            const existing = (patches.get(target.id)?.input_rules) ?? target.data.input_rules ?? []
            const alreadyWired = existing.some(i => i.item_id === source.id)
            if (!alreadyWired)
              patch(target.id, { input_rules: [
                ...existing, { item_id: source.id, qty: 1 }
              ]})
          }
          break

        case 'used_by':
          if (source.data.type === 'crafting_recipe')
            patch(source.id, { workflow_id: target.id })
          break

        case 'drops_from':
          if (source.data.type === 'loot_table')
            patch(target.id, { loot_table_id: source.id })
          if (source.data.type === 'item') {
            const existing = (patches.get(target.id)?.entries) ?? target.data.entries ?? []
            const alreadyWired = existing.some(e => e.item_id === source.id)
            if (!alreadyWired)
              patch(target.id, { entries: [
                ...existing,
                { item_id: source.id, weight: 10,
                  min_qty: 1, max_qty: 1, guaranteed: false }
              ]})
          }
          break

        case 'unlocks':
          if (source.data.type === 'act') {
            const existing = (patches.get(source.id)?.unlocks_node_ids) ?? source.data.unlocks_node_ids ?? []
            if (!existing.includes(target.id))
              patch(source.id, { unlocks_node_ids: [...existing, target.id] })
          }
          if (source.data.type === 'boss_expedition') {
            const existing = (patches.get(source.id)?.on_success_unlock) ?? source.data.on_success_unlock ?? []
            if (!existing.includes(target.id))
              patch(source.id, { on_success_unlock: [...existing, target.id] })
          }
          if (source.data.type === 'building_upgrade') {
            const existing = (patches.get(source.id)?.unlocks_workflow_ids) ?? source.data.unlocks_workflow_ids ?? []
            if (!existing.includes(target.id))
              patch(source.id, { unlocks_workflow_ids: [...existing, target.id] })
          }
          break

        case 'hosts':
          if (source.data.type === 'building_upgrade')
            patch(source.id, { building_id: target.id })
          break

        case 'trains':
          if (source.data.type === 'hero_class')
            patch(source.id, { building_affinity: target.id })
          break

        case 'assigned_to':
          if (source.data.type === 'hero_class')
            patch(source.id, { building_affinity: target.id })
          break

        case 'triggers':
          if (source.data.type === 'act') {
            const existing = (patches.get(source.id)?.on_complete_events) ?? source.data.on_complete_events ?? []
            if (!existing.includes(target.id))
              patch(source.id, { on_complete_events: [...existing, target.id] })
          }
          break

        default:
          break
      }
    }

    // Additional pass: building_workflow → item produces
    for (const edge of internalEdges) {
      const source = nodeMap.get(edge.source)
      const target = nodeMap.get(edge.target)
      if (!source || !target) continue
      if (source.data.type === 'building_workflow' && target.data.type === 'item') {
        const existing = (patches.get(source.id)?.output_rules) ?? source.data.output_rules ?? []
        const alreadyWired = existing.some(r => r.target === target.id)
        if (!alreadyWired) {
          const existingPatch = patches.get(source.id) ?? {}
          patches.set(source.id, { ...existingPatch, output_rules: [
            ...existing,
            { output_type: 'item', target: target.id, quantity: 1, chance: 1 }
          ]})
        }
      }
    }

    // Apply all patches
    const updatedNodes = nodes.map(n => {
      const p = patches.get(n.id)
      return p ? { ...n, data: { ...n.data, ...p } } : n
    })

    set({ nodes: updatedNodes })

    return {
      rigged: patches.size,
      relations: [...new Set(internalEdges.map(e =>
        e.data?.relation ?? 'unlocks'))]
    }
  },

  // --- Group metadata ---
  createGroup: (nodeIds, label) => {
    const nodes = get().nodes
    const validNodeIds = sanitizeGroupNodeIds(nodeIds, nodes)
    if (validNodeIds.length === 0) return null

    const groups = get().groups
    const groupId = generateId('group')
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
    const id = generateId(type)
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

    const rawEdges = project.edges.map((e) => ({
      id: e.id ?? `e-${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      data: { relation: e.relation },
      style: { stroke: '#444466', strokeWidth: 1.5 },
    }))

    // Migrate edges: re-infer relations from node types
    const nodeMap = new Map(rfNodes.map(n => [n.id, n]))
    const rfEdges = rawEdges.map(edge => {
      if (edge.data?.relation === 'unlocks' || !edge.data?.relation) {
        const source = nodeMap.get(edge.source)
        const target = nodeMap.get(edge.target)
        if (source && target) {
          const relation = inferRelation(source.data.type, target.data.type)
          return {
            ...edge,
            data: { ...edge.data, relation },
            label: relation,
            labelStyle: { fontSize: 10, fill: '#666680' },
            labelBgStyle: { fill: '#13131f', fillOpacity: 0.8 },
            style: { stroke: relationColor(relation), strokeWidth: 1.5 },
          }
        }
      }
      return edge
    })

    set({
      nodes: rfNodes,
      edges: rfEdges,
      groups: normalizeImportedGroups(project.groups, rfNodes, { generateId }),
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
  importBlueprint: (blueprintJson, dropPosition = { x: 320, y: 180 }, parameterMappings = null) => {
    if (!Array.isArray(blueprintJson?.nodes) || blueprintJson.nodes.length === 0) return null

    const existingNodes = get().nodes
    const existingEdges = get().edges
    const maxX = existingNodes.length > 0
      ? Math.max(...existingNodes.map((n) => (n.position.x + 240)))
      : 0
    const safeDropX = Math.max(dropPosition?.x ?? 100, maxX + 80)
    const safeDropY = dropPosition?.y ?? 80

    // Apply parameter mappings if provided (from modal)
    let blueprintWithMappings = blueprintJson
    if (parameterMappings && Object.keys(parameterMappings).length > 0) {
      const result = applyParameterMappingsToBlueprint(blueprintJson, parameterMappings, safeDropX, safeDropY)
      blueprintWithMappings = result.blueprint
    }

    const blueprintPositions = blueprintWithMappings.nodes.map((nodeData, index) => (
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
      blueprintWithMappings.nodes
        .filter((nodeData) => nodeData?.id)
        .map((nodeData) => [nodeData.id, `import-${timestamp}-${nodeData.id}`])
    )

    const remappedBlueprintNodes = blueprintWithMappings.nodes
      .map((nodeData) => remapBlueprintNode(nodeData, idMap))
      .map((nodeData) => normalizeImportedBlueprintNode(nodeData, idMap))
      .map((nodeData) => applyImportedBlueprintCrossReferences(nodeData, idMap))

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
    const importedEdges = Array.isArray(blueprintWithMappings?.edges)
      ? blueprintWithMappings.edges
          .map((edgeData, index) => remapBlueprintEdge(edgeData, idMap, timestamp, index))
          .filter(Boolean)
      : []

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
      edges: [...existingEdges, ...importedEdges],
      selectedNodeId: normalizedImportedNodes[0]?.id ?? get().selectedNodeId,
    })

    if (normalizedImportedNodes.length > 0) {
      get().createGroup(
        normalizedImportedNodes.map((node) => node.id),
        blueprintWithMappings?.blueprint_meta?.label ?? 'Imported Blueprint'
      )
    }

    return {
      importedCount: normalizedImportedNodes.length,
      importedEdgeCount: importedEdges.length,
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
    const nodeIdSet = new Set(nodeIds)
    const selectedNodes = nodeIds
      .map((nodeId) => get().nodes.find((n) => n.id === nodeId))
      .filter(Boolean)
      .map((node) => node.data)
    const selectedEdges = get().edges
      .filter((edge) => nodeIdSet.has(edge.source) && nodeIdSet.has(edge.target))
      .map(serializeBlueprintEdge)

    const payload = {
      blueprint_meta: {
        id: blueprintNode.id,
        label: blueprintNode.data?.label || blueprintNode.id,
        description: blueprintNode.data?.description || '',
        requires_schema_version: blueprintNode.data?.requires_schema_version || '1.2.0',
        created_at: new Date().toISOString(),
      },
      nodes: selectedNodes,
      edges: selectedEdges,
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
  crafting_recipe: {
    label: 'New Craft Recipe',
    description: '',
    inputs: [],
    output_item_id: '',
    output_quantity: 1,
    workflow_id: '',
    required_building_level: 1,
    visible: true,
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

// --- Parameter injection system for blueprints ---

/**
 * Applies parameter mappings to a blueprint, injecting resource/item IDs
 * into workflow input_rules and output_rules.
 *
 * @param {Object} blueprint - The blueprint JSON
 * @param {Object} mappings - Map of parameter keys to node IDs or creation requests
 * @param {number} safeDropX - Canvas X position for new nodes
 * @param {number} safeDropY - Canvas Y position for new nodes
 * @returns {Object} { blueprint: Modified blueprint, createdNodePositions: position map }
 */
function applyParameterMappingsToBlueprint(blueprint, mappings, safeDropX, safeDropY) {
  const deepClone = (obj) => JSON.parse(JSON.stringify(obj))
  const result = deepClone(blueprint)

  const parameters = result.blueprint_meta?.parameters || []
  if (!parameters.length) return { blueprint: result, createdNodePositions: {} }

  // Build a lookup of parameter configs by key
  const paramConfig = Object.fromEntries(parameters.map((p) => [p.key, p]))

  // Track created node IDs and their positions
  const createdNodePositions = {}
  let createdIndex = 0

  // Process each mapping
  Object.entries(mappings).forEach(([paramKey, value]) => {
    const config = paramConfig[paramKey]
    if (!config) return

    let targetNodeId = value

    // Handle "create new" mappings
    if (value?.create) {
      const newNodeId = generateId(`param-${config.type}`)
      targetNodeId = newNodeId

      // Calculate staggered position for new node (left of main blueprint)
      const newNodePos = {
        x: safeDropX - 280 - (createdIndex % 3) * 40,
        y: safeDropY + (Math.floor(createdIndex / 3)) * 160,
      }
      createdNodePositions[newNodeId] = newNodePos

      // Create the new node data with position
      const newNodeData = createNodeFromParameter(value, newNodeId, newNodePos)
      if (newNodeData) {
        result.nodes.push(newNodeData)
      }
      createdIndex++
    }

    // Inject the mapping using explicit injects_into paths if provided
    if (config.injects_into && Array.isArray(config.injects_into)) {
      config.injects_into.forEach((path) => {
        injectByPath(result, path, targetNodeId, config)
      })
    } else {
      // Fallback to heuristic-based injection for old blueprints
      result.nodes.forEach((node) => {
        if (node.type === 'building_workflow') {
          injectParameterIntoWorkflow(node, config, targetNodeId, paramKey)
        }
        if (node.type === 'crafting_recipe') {
          injectParameterIntoRecipe(node, config, targetNodeId, paramKey)
        }
      })
    }
  })

  return { blueprint: result, createdNodePositions }
}

export default useStore
