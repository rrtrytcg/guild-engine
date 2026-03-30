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
