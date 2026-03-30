// editor/src/hooks/useSearchIndex.js
import { useMemo } from 'react'
import { NODE_CONFIG } from '../nodes/nodeConfig.js'

/**
 * Pure hook that builds a memoized search index from nodes.
 * No side effects, no store access.
 *
 * @param {Array} nodes - ReactFlow nodes array
 * @returns {Array<{id, label, type, group, description, emoji}>}
 */
export function useSearchIndex(nodes) {
  return useMemo(() => {
    if (!nodes || !Array.isArray(nodes)) {
      return []
    }

    return nodes.map((node) => ({
      id: node.id,
      label: node.data?.label ?? node.id,
      type: node.type ?? 'unknown',
      group: NODE_CONFIG[node.type]?.group ?? 'Other',
      description: node.data?.description ?? '',
      emoji: node.data?.icon ?? NODE_CONFIG[node.type]?.emoji ?? '📦',
    }))
  }, [nodes])
}