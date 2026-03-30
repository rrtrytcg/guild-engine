/**
 * Pure blueprint manipulation utilities.
 * Extracted from useStore.js for testability and separation of concerns.
 */

export function injectByPath(blueprint, path, targetNodeId, paramConfig) {
  const [nodeId, ...fieldParts] = path.split('.')
  const fieldPath = fieldParts.join('.')

  const node = blueprint.nodes.find((n) => n.id === nodeId)
  if (!node) return

  if (fieldPath === 'input_rules') {
    const existingRules = node.input_rules || []
    const alreadyExists = existingRules.some(
      (r) => r.resource_id === targetNodeId || r.item_id === targetNodeId
    )
    if (!alreadyExists) {
      node.input_rules = [
        ...existingRules,
        { resource_id: targetNodeId, amount: 5 },
      ]
    }
  } else if (fieldPath === 'output_rules') {
    const existingRules = node.output_rules || []
    const alreadyExists = existingRules.some((r) => r.target === targetNodeId)
    if (!alreadyExists) {
      node.output_rules = [
        ...existingRules,
        { output_type: paramConfig.type === 'item' ? 'item' : 'resource', target: targetNodeId, quantity: 2, chance: 1 },
      ]
    }
  } else if (fieldPath === 'inputs') {
    const existingInputs = node.inputs || []
    const alreadyExists = existingInputs.some(
      (i) => i.item_id === targetNodeId || i.resource_id === targetNodeId
    )
    if (!alreadyExists) {
      node.inputs = [
        ...existingInputs,
        { item_id: targetNodeId, qty: 5 },
      ]
    }
  } else if (fieldPath === 'output_item_id') {
    if (!node.output_item_id) {
      node.output_item_id = targetNodeId
    }
  } else if (fieldPath.startsWith('inputs[')) {
    const match = fieldPath.match(/inputs\[(\d+)\]\.(\w+)/)
    if (match) {
      const index = parseInt(match[1], 10)
      const field = match[2]
      if (!node.inputs[index]) {
        node.inputs[index] = {}
      }
      node.inputs[index][field] = targetNodeId
    }
  }
}

export function createNodeFromParameter(mapping, nodeId, position) {
  const { type, label, icon } = mapping

  if (type === 'resource') {
    return {
      id: nodeId,
      type: 'resource',
      label,
      icon: icon || '💠',
      description: 'Auto-created from blueprint parameter',
      base_cap: 1000,
      base_income: 0,
      is_material: false,
      visible: true,
      position,
      canvas_pos: position,
    }
  }

  if (type === 'item') {
    return {
      id: nodeId,
      type: 'item',
      label,
      icon: icon || '📦',
      description: 'Auto-created from blueprint parameter',
      subtype: 'material',
      slot: null,
      rarity: 'common',
      stack_limit: 99,
      item_type: 'material',
      stack_max: 99,
      visible: true,
      position,
      canvas_pos: position,
    }
  }

  return null
}

function isInputParameter(paramKey) {
  const inputPatterns = ['input', 'ingredient', 'raw', 'ore', 'herb', 'berry']
  const outputPatterns = ['output', 'product', 'refined', 'ingot', 'potion', 'brew']

  const keyLower = paramKey.toLowerCase()

  if (outputPatterns.some((p) => keyLower.includes(p))) {
    return false
  }

  if (inputPatterns.some((p) => keyLower.includes(p))) {
    return true
  }

  return paramKey.includes('resource') && !paramKey.includes('output')
}

export function injectParameterIntoWorkflow(workflowNode, paramConfig, targetNodeId, paramKey) {
  const inputKey = isInputParameter(paramKey)

  if (inputKey) {
    const existingRules = workflowNode.input_rules || []
    const alreadyExists = existingRules.some(
      (r) => r.resource_id === targetNodeId || r.item_id === targetNodeId
    )
    if (!alreadyExists) {
      workflowNode.input_rules = [
        ...existingRules,
        { resource_id: targetNodeId, amount: 5 },
      ]
    }

    const existingInputs = workflowNode.inputs || []
    const inputExists = existingInputs.some(
      (i) => i.item_id === targetNodeId || i.resource_id === targetNodeId
    )
    if (!inputExists) {
      workflowNode.inputs = [
        ...existingInputs,
        { item_id: targetNodeId, qty: 5 },
      ]
    }
  } else {
    const existingRules = workflowNode.output_rules || []
    const alreadyExists = existingRules.some(
      (r) => r.target === targetNodeId
    )
    if (!alreadyExists) {
      workflowNode.output_rules = [
        ...existingRules,
        { output_type: paramConfig.type === 'item' ? 'item' : 'resource', target: targetNodeId, quantity: 2, chance: 1 },
      ]
    }
  }
}

export function injectParameterIntoRecipe(recipeNode, paramConfig, targetNodeId, paramKey) {
  const inputKey = isInputParameter(paramKey)

  if (inputKey) {
    const existingInputs = recipeNode.inputs || []
    const alreadyExists = existingInputs.some((i) => i.item_id === targetNodeId)
    if (!alreadyExists) {
      recipeNode.inputs = [
        ...existingInputs,
        { item_id: targetNodeId, qty: 5 },
      ]
    }
  } else {
    if (paramConfig.type === 'item') {
      if (!recipeNode.output_item_id) {
        recipeNode.output_item_id = targetNodeId
      }
    }
  }
}

export { isInputParameter }

// ── ID/text utilities ───────────────────────────────────────────────────────────

export function humanizeId(id) {
  return String(id ?? '')
    .split(/[_-]/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

export function stripTypePrefix(id) {
  return String(id ?? '').replace(/^[a-z]+-/, '')
}

export function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase()
}

// ── Reference key sets for ID remapping ───────────────────────────────────────

export const SCALAR_REFERENCE_KEYS = new Set([
  'id',
  'loot_table_id',
  'fail_loot_table_id',
  'currency_id',
  'output_item_id',
  'boss_expedition_id',
  'host_building',
  'workflow_id',
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

export const ARRAY_REFERENCE_KEYS = new Set([
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

// ── Blueprint upsert ───────────────────────────────────────────────────────────

export function upsertBlueprint(blueprints, blueprintJson) {
  const blueprintId = blueprintJson?.blueprint_meta?.id
  if (!blueprintId) return blueprints

  return [
    blueprintJson,
    ...blueprints.filter((blueprint) => blueprint?.blueprint_meta?.id !== blueprintId),
  ]
}

// ── Blueprint edge serialization ───────────────────────────────────────────────

export function serializeBlueprintEdge(edge) {
  const relation = edge.data?.relation ?? edge.relation ?? ''
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    relation,
    label: edge.label ?? relation,
    style: edge.style ? { ...edge.style } : undefined,
    data: edge.data ? { ...edge.data } : undefined,
  }
}

// ── Deep ID remapping ──────────────────────────────────────────────────────────

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

export function remapBlueprintNode(nodeData, idMap) {
  return remapBlueprintValue(nodeData, '', idMap)
}

export function remapBlueprintEdge(edgeData, idMap, timestamp, index) {
  if (!edgeData?.source || !edgeData?.target) return null

  const relation = edgeData.data?.relation ?? edgeData.relation ?? ''
  return {
    ...edgeData,
    id: `import-edge-${timestamp}-${edgeData.id ?? index}`,
    source: idMap[edgeData.source] ?? edgeData.source,
    target: idMap[edgeData.target] ?? edgeData.target,
    data: {
      ...(edgeData.data ?? {}),
      relation,
    },
    label: edgeData.label ?? relation,
    style: edgeData.style ?? { stroke: '#444466', strokeWidth: 1.5 },
  }
}

// ── Node-type-specific normalizations ─────────────────────────────────────────

export function normalizeImportedBlueprintNode(nodeData, idMap) {
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

export function applyImportedBlueprintCrossReferences(nodeData, idMap) {
  if (!nodeData || typeof nodeData !== 'object') return nodeData

  if (nodeData.type === 'building_workflow') {
    return {
      ...nodeData,
      building_id: idMap[nodeData.building_id] ?? nodeData.building_id,
    }
  }

  if (nodeData.type === 'building_upgrade') {
    return {
      ...nodeData,
      building_id: idMap[nodeData.building_id] ?? nodeData.building_id,
      unlocks_workflow_ids: nodeData.unlocks_workflow_ids?.map(
        (workflowId) => idMap[workflowId] ?? workflowId
      ),
    }
  }

  if (nodeData.type === 'crafting_recipe') {
    return {
      ...nodeData,
      output_item_id: idMap[nodeData.output_item_id] ?? nodeData.output_item_id,
      workflow_id: idMap[nodeData.workflow_id] ?? nodeData.workflow_id,
      inputs: nodeData.inputs?.map((inp) => ({
        ...inp,
        item_id: idMap[inp.item_id] ?? inp.item_id,
      })),
    }
  }

  return nodeData
}

// ── Dependency collection ──────────────────────────────────────────────────────

export function collectMissingDependencies(importedNodes, context) {
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

// ── Semantic dependency matching ────────────────────────────────────────────────

export function findSemanticDependencyMatches(importedNodes, context) {
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

// ── Dependency reference remapping ────────────────────────────────────────────

export function remapDependencyReferences(value, key, idMap) {
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

// ── Auto-create missing dependency nodes ───────────────────────────────────────

export function buildAutoCreatedDependencyNodes(importedNodes, context) {
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
