import { CONNECTION_RULES, REQUIRED_FIELDS, VALIDATION_RULES, WARNING_CHECKS } from './rules'

// Main entry point
// Takes ReactFlow nodes + edges from the Zustand store.
// Returns { ok, errors, warnings, project }
// ok=true means the project.json is valid and ready to write.
// ok=false means there are blocking errors; project is still returned for inspection.

export function compile(rfNodes, rfEdges, meta = {}) {
  const errors = []
  const warnings = []

  const nodeById = new Map(rfNodes.map((node) => [node.id, node]))
  const dataNodes = rfNodes.map((node) => node.data)

  const pushRuleMessage = (severity, payload) => {
    if (severity === 'error') {
      errors.push(payload)
      return
    }
    warnings.push(payload)
  }

  const toArray = (value) => Array.isArray(value) ? value : value ? [value] : []
  const toRuleNode = (node) => ({ ...node.data, data: node.data, id: node.id })

  // Phase 1: Required field validation
  for (const node of rfNodes) {
    const required = REQUIRED_FIELDS[node.data.type] ?? []
    for (const field of required) {
      const val = node.data[field]
      const missing = val === undefined || val === null || val === ''
      if (missing) {
        errors.push({
          nodeId: node.id,
          nodeLabel: node.data.label || node.id,
          field,
          message: `"${node.data.label || node.id}" (${node.data.type}) is missing required field: ${field}`,
        })
      }
    }
  }

  // Phase 2: Duplicate ID check
  const idCounts = {}
  for (const node of rfNodes) {
    idCounts[node.id] = (idCounts[node.id] ?? 0) + 1
  }
  for (const [id, count] of Object.entries(idCounts)) {
    if (count > 1) {
      errors.push({
        nodeId: id,
        message: `Duplicate node ID "${id}" found ${count} times - all node IDs must be unique.`,
      })
    }
  }

  // Phase 3: Edge / connection rule validation
  for (const edge of rfEdges) {
    const source = nodeById.get(edge.source)
    const target = nodeById.get(edge.target)

    if (!source) {
      errors.push({ edgeId: edge.id, message: `Edge "${edge.id}" references missing source node "${edge.source}".` })
      continue
    }
    if (!target) {
      errors.push({ edgeId: edge.id, message: `Edge "${edge.id}" references missing target node "${edge.target}".` })
      continue
    }

    const relation = edge.data?.relation ?? 'unlocks'
    const sourceRules = CONNECTION_RULES[source.data.type] ?? {}
    const allowedTargets = sourceRules[relation]

    if (!allowedTargets) {
      warnings.push({
        edgeId: edge.id,
        message: `Edge from "${source.data.label}" (${source.data.type}) uses relation "${relation}" which is not defined for this source type.`,
      })
    } else if (!allowedTargets.includes(target.data.type)) {
      errors.push({
        edgeId: edge.id,
        message: `Invalid connection: ${source.data.type} -> "${relation}" -> ${target.data.type}. Allowed targets: ${allowedTargets.join(', ')}.`,
      })
    }
  }

  // Phase 4: Cross-reference resolution
  const allIds = new Set(rfNodes.map((node) => node.id))

  for (const node of rfNodes) {
    const d = node.data

    const singleRefs = [
      ['loot_table_id', d.loot_table_id],
      ['fail_loot_table_id', d.fail_loot_table_id],
      ['currency_id', d.currency_id],
      ['output_item_id', d.output_item_id],
      ['boss_expedition_id', d.boss_expedition_id],
      ['host_building', d.host_building],
      ['required_workflow', d.required_workflow],
    ]
    for (const [field, refId] of singleRefs) {
      if (refId && !allIds.has(refId)) {
        warnings.push({
          nodeId: node.id,
          message: `"${d.label}" field "${field}" references unknown ID "${refId}".`,
        })
      }
    }

    const arrayRefs = [
      ['unlock_node_ids', d.unlock_node_ids],
      ['on_complete_events', d.on_complete_events],
      ['unlocks_node_ids', d.unlocks_node_ids],
      ['on_success_unlock', d.on_success_unlock],
      ['expedition_ids', d.expedition_ids],
      ['building_affinity', d.building_affinity],
      ['unlocks_workflows', d.effects?.unlocks_workflows],
      ['unlocks_auto_repeat_on', d.effects?.unlocks_auto_repeat_on],
      ['building_prerequisites', d.unlocked_by?.building_prerequisites],
    ]
    for (const [field, ids] of arrayRefs) {
      for (const refId of ids ?? []) {
        if (refId && !allIds.has(refId)) {
          warnings.push({
            nodeId: node.id,
            message: `"${d.label}" field "${field}" references unknown ID "${refId}".`,
          })
        }
      }
    }

    const resourceCostArrays = [d.cost, d.entry_cost, d.recruit_cost, d.inputs]
    for (const costArray of resourceCostArrays) {
      for (const cost of costArray ?? []) {
        const resourceId = cost.resource_id ?? cost.resource
        if (resourceId && !allIds.has(resourceId)) {
          warnings.push({
            nodeId: node.id,
            message: `"${d.label}" references unknown resource ID "${resourceId}".`,
          })
        }
      }
    }

    const conditionArrays = [d.unlock_conditions, d.completion_conditions, d.trigger_conditions]
    for (const conditionArray of conditionArrays) {
      for (const condition of conditionArray ?? []) {
        if (condition?.target_id && !allIds.has(condition.target_id)) {
          warnings.push({
            nodeId: node.id,
            message: `"${d.label}" condition references unknown node ID "${condition.target_id}".`,
          })
        }
      }
    }

    if (d.type === 'loot_table') {
      for (const entry of d.entries ?? []) {
        if (entry.item_id && !allIds.has(entry.item_id)) {
          warnings.push({
            nodeId: node.id,
            message: `Loot table "${d.label}" entry references unknown item ID "${entry.item_id}".`,
          })
        }
      }
    }

    if (d.type === 'recipe') {
      for (const input of d.inputs ?? []) {
        if (input.item_id && !allIds.has(input.item_id)) {
          warnings.push({
            nodeId: node.id,
            message: `Recipe "${d.label}" input references unknown item ID "${input.item_id}".`,
          })
        }
      }
    }

    if (d.type === 'crafting_recipe') {
      if (d.output_item && !allIds.has(d.output_item)) {
        warnings.push({
          nodeId: node.id,
          message: `Crafting recipe "${d.label || d.id}" output references unknown item ID "${d.output_item}".`,
        })
      }
    }

    if (d.type === 'faction') {
      for (const tier of d.rep_tiers ?? []) {
        for (const refId of tier.unlock_node_ids ?? []) {
          if (refId && !allIds.has(refId)) {
            warnings.push({
              nodeId: node.id,
              message: `Faction "${d.label}" tier "${tier.label}" references unknown unlock ID "${refId}".`,
            })
          }
        }
      }
    }

    if (d.type === 'expedition' || d.type === 'boss_expedition') {
      for (const reward of d.resource_rewards ?? []) {
        if (reward.resource_id && !allIds.has(reward.resource_id)) {
          warnings.push({
            nodeId: node.id,
            message: `"${d.label}" resource reward references unknown resource ID "${reward.resource_id}".`,
          })
        }
      }
    }

    if (d.type === 'expedition' || d.type === 'boss_expedition') {
      for (const reward of d.faction_rewards ?? []) {
        if (reward.faction_id && !allIds.has(reward.faction_id)) {
          warnings.push({
            nodeId: node.id,
            message: `"${d.label}" faction reward references unknown faction ID "${reward.faction_id}".`,
          })
        }
      }
    }

    if (d.type === 'building') {
      for (const level of d.levels ?? []) {
        for (const [resId] of Object.entries(level.production ?? {})) {
          if (resId && !allIds.has(resId)) {
            warnings.push({
              nodeId: node.id,
              message: `Building "${d.label}" production references unknown resource ID "${resId}".`,
            })
          }
        }

        for (const cost of level.build_cost ?? []) {
          if (cost.resource_id && !allIds.has(cost.resource_id)) {
            warnings.push({
              nodeId: node.id,
              message: `Building "${d.label}" level cost references unknown resource ID "${cost.resource_id}".`,
            })
          }
        }
      }
    }

    if (d.type === 'building_workflow') {
      for (const rule of d.output_rules ?? []) {
        if (rule.output_type === 'hero_instance' && rule.target_class && !allIds.has(rule.target_class)) {
          warnings.push({
            nodeId: node.id,
            message: `Building workflow "${d.label || d.id}" output references unknown hero class ID "${rule.target_class}".`,
          })
        }
      }
    }

    if (d.type === 'event') {
      for (const choice of d.choices ?? []) {
        for (const [resId] of Object.entries(choice.outcome?.resource_delta ?? {})) {
          if (resId && !allIds.has(resId)) {
            warnings.push({
              nodeId: node.id,
              message: `Event "${d.label}" resource delta references unknown resource ID "${resId}".`,
            })
          }
        }
        for (const [factionId] of Object.entries(choice.outcome?.faction_rep_delta ?? {})) {
          if (factionId && !allIds.has(factionId)) {
            warnings.push({
              nodeId: node.id,
              message: `Event "${d.label}" faction rep delta references unknown faction ID "${factionId}".`,
            })
          }
        }
        for (const refId of choice.outcome?.unlock_node_ids ?? []) {
          if (refId && !allIds.has(refId)) {
            warnings.push({
              nodeId: node.id,
              message: `Event "${d.label}" unlocks unknown node ID "${refId}".`,
            })
          }
        }
      }
    }

    if (d.type === 'prestige') {
      for (const bonus of d.bonuses ?? []) {
        if (!bonus.id || bonus.id.trim() === '') {
          warnings.push({
            nodeId: node.id,
            message: `Prestige "${d.label}" has a bonus with no ID - it may cause runtime issues.`,
          })
        }
      }
    }
  }

  // Phase 5: Custom validation rules
  for (const rule of VALIDATION_RULES) {
    if (rule.global) {
      for (const message of toArray(rule.check(null, dataNodes))) {
        pushRuleMessage(rule.severity ?? 'error', { message })
      }
      continue
    }

    for (const node of rfNodes) {
      const ruleNode = toRuleNode(node)
      for (const message of toArray(rule.check(ruleNode, dataNodes))) {
        pushRuleMessage(rule.severity ?? 'error', { nodeId: node.id, message })
      }
    }
  }

  // Phase 6: Warning checks
  for (const rule of WARNING_CHECKS) {
    if (rule.global) {
      if (rule.check(null, dataNodes)) {
        warnings.push({ message: rule.message() })
      }
    } else {
      for (const node of rfNodes) {
        const ruleNode = toRuleNode(node)
        if (ruleNode.type && rule.check(ruleNode, dataNodes)) {
          warnings.push({ nodeId: node.id, message: rule.message(ruleNode) })
        }
      }
    }
  }

  // Phase 7: Serialize
  const serializedNodes = rfNodes.map((node) => ({
    ...node.data,
    canvas_pos: { x: Math.round(node.position.x), y: Math.round(node.position.y) },
  }))

  const serializedEdges = rfEdges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    relation: edge.data?.relation ?? 'unlocks',
  }))

  const project = {
    meta: {
      schema_version: '0.1.0',
      title: meta.title || 'Untitled Project',
      author: meta.author || '',
      description: meta.description || '',
      created_at: meta.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    nodes: serializedNodes,
    edges: serializedEdges,
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    project,
    stats: {
      nodeCount: rfNodes.length,
      edgeCount: rfEdges.length,
      byType: countByType(rfNodes),
    },
  }
}

function countByType(nodes) {
  const counts = {}
  for (const node of nodes) {
    counts[node.data.type] = (counts[node.data.type] ?? 0) + 1
  }
  return counts
}

export function downloadProject(result) {
  const blob = new Blob([JSON.stringify(result.project, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${result.project.meta.title.replace(/\s+/g, '-').toLowerCase() || 'project'}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}
