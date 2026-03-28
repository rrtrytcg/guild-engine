import { CONNECTION_RULES, REQUIRED_FIELDS, WARNING_CHECKS } from './rules'

// ─── Main entry point ────────────────────────────────────────────────────────
// Takes ReactFlow nodes + edges from the Zustand store.
// Returns { ok, errors, warnings, project }
// ok=true means the project.json is valid and ready to write.
// ok=false means there are blocking errors; project is still returned for inspection.

export function compile(rfNodes, rfEdges, meta = {}) {
  const errors = []
  const warnings = []

  // Build fast lookup maps
  const nodeById = new Map(rfNodes.map((n) => [n.id, n]))
  const dataNodes = rfNodes.map((n) => n.data)

  // ── Phase 1: Required field validation ──────────────────────────────────────
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

  // ── Phase 2: Duplicate ID check ─────────────────────────────────────────────
  const idCounts = {}
  for (const node of rfNodes) {
    idCounts[node.id] = (idCounts[node.id] ?? 0) + 1
  }
  for (const [id, count] of Object.entries(idCounts)) {
    if (count > 1) {
      errors.push({
        nodeId: id,
        message: `Duplicate node ID "${id}" found ${count} times — all node IDs must be unique.`,
      })
    }
  }

  // ── Phase 3: Edge / connection rule validation ───────────────────────────────
  for (const edge of rfEdges) {
    const source = nodeById.get(edge.source)
    const target = nodeById.get(edge.target)

    // Dangling edge — one end missing
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
        message: `Invalid connection: ${source.data.type} → "${relation}" → ${target.data.type}. Allowed targets: ${allowedTargets.join(', ')}.`,
      })
    }
  }

  // ── Phase 4: Cross-reference resolution ─────────────────────────────────────
  // Check that any field ending in _id or _ids actually points to an existing node
  const allIds = new Set(rfNodes.map((n) => n.id))

  for (const node of rfNodes) {
    const d = node.data

    // Single ID references
    const singleRefs = [
      ['loot_table_id', d.loot_table_id],
      ['fail_loot_table_id', d.fail_loot_table_id],
      ['currency_id', d.currency_id],
      ['output_item_id', d.output_item_id],
    ]
    for (const [field, refId] of singleRefs) {
      if (refId && !allIds.has(refId)) {
        warnings.push({
          nodeId: node.id,
          message: `"${d.label}" field "${field}" references unknown ID "${refId}".`,
        })
      }
    }

    // Array ID references
    const arrayRefs = [
      ['unlock_node_ids', d.unlock_node_ids],
      ['on_complete_events', d.on_complete_events],
      ['unlocks_node_ids', d.unlocks_node_ids],
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

    // Loot table entries
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

    // Recipe inputs and output
    if (d.type === 'recipe') {
      for (const inp of d.inputs ?? []) {
        if (inp.item_id && !allIds.has(inp.item_id)) {
          warnings.push({
            nodeId: node.id,
            message: `Recipe "${d.label}" input references unknown item ID "${inp.item_id}".`,
          })
        }
      }
    }

    // Faction tier unlock_node_ids
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

    // Prestige bonus IDs
    if (d.type === 'prestige') {
      for (const bonus of d.bonuses ?? []) {
        if (!bonus.id || bonus.id.trim() === '') {
          warnings.push({
            nodeId: node.id,
            message: `Prestige "${d.label}" has a bonus with no ID — it may cause runtime issues.`,
          })
        }
      }
    }
  }

  // ── Phase 5: Warning checks ──────────────────────────────────────────────────
  for (const rule of WARNING_CHECKS) {
    if (rule.global) {
      if (rule.check(null, dataNodes)) {
        warnings.push({ message: rule.message() })
      }
    } else {
      for (const node of rfNodes) {
        if (node.data.type && rule.check(node, dataNodes)) {
          warnings.push({ nodeId: node.id, message: rule.message(node) })
        }
      }
    }
  }

  // ── Phase 6: Serialize ───────────────────────────────────────────────────────
  // Attach canvas_pos from ReactFlow position back into node data before writing
  const serializedNodes = rfNodes.map((n) => ({
    ...n.data,
    canvas_pos: { x: Math.round(n.position.x), y: Math.round(n.position.y) },
  }))

  const serializedEdges = rfEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    relation: e.data?.relation ?? 'unlocks',
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function countByType(nodes) {
  const counts = {}
  for (const n of nodes) {
    counts[n.data.type] = (counts[n.data.type] ?? 0) + 1
  }
  return counts
}

// Download a project.json file from a compile result
export function downloadProject(result) {
  const blob = new Blob([JSON.stringify(result.project, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${result.project.meta.title.replace(/\s+/g, '-').toLowerCase() || 'project'}.json`
  a.click()
  URL.revokeObjectURL(url)
}
