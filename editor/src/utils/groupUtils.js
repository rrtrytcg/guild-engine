/**
 * Pure group manipulation utilities.
 * Extracted from useStore.js for testability and separation of concerns.
 */

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

export function sanitizeGroupNodeIds(nodeIds, nodes) {
  const validNodeIds = new Set(nodes.map((node) => node.id))
  return Array.from(new Set((nodeIds ?? []).filter((nodeId) => validNodeIds.has(nodeId))))
}

export function calculateGroupCentroid(nodes, nodeIds) {
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

export function calculateGroupSize(nodeCount) {
  return {
    w: Math.max(200, Number(nodeCount ?? 0) * 40),
    h: 160,
  }
}

export function pickNextGroupColor(groups) {
  return GROUP_COLOR_PALETTE[groups.length % GROUP_COLOR_PALETTE.length]
}

export function removeNodesFromGroups(groups, nodeIds) {
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

export function assignNodesToGroup(groups, groupId, nodeIds) {
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

export function normalizeImportedGroups(groups, nodes, { generateId }) {
  const safeGroups = Array.isArray(groups) ? groups : []

  return safeGroups.map((group, index) => {
    const nodeIds = sanitizeGroupNodeIds(group?.nodeIds, nodes)
    const color = GROUP_COLOR_PALETTE.includes(group?.color)
      ? group.color
      : pickNextGroupColor(safeGroups.slice(0, index))

    return {
      id: group?.id || generateId('group'),
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

export function serializeProjectGroup(group) {
  return {
    id: group.id,
    label: group.label,
    color: group.color,
    nodeIds: [...group.nodeIds],
    position: { ...group.position },
    size: { ...group.size },
  }
}
