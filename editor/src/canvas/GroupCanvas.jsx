import { useMemo, useState } from 'react'
import useStore, { GROUP_COLOR_PALETTE } from '../store/useStore'
import { NODE_CONFIG } from '../nodes/nodeConfig'

const UNGROUPED_COLOR = '#5F5E5A'

export default function GroupCanvas() {
  const nodes = useStore((s) => s.nodes)
  const groups = useStore((s) => s.groups)
  const renameGroup = useStore((s) => s.renameGroup)
  const recolorGroup = useStore((s) => s.recolorGroup)
  const setCanvasView = useStore((s) => s.setCanvasView)
  const setActiveGroup = useStore((s) => s.setActiveGroup)

  const groupNodesById = useMemo(() => {
    const nodesById = new Map(nodes.map((node) => [node.id, node]))
    return new Map(groups.map((group) => [
      group.id,
      group.nodeIds.map((nodeId) => nodesById.get(nodeId)).filter(Boolean),
    ]))
  }, [groups, nodes])

  const groupedNodeIds = useMemo(() => (
    new Set(groups.flatMap((group) => group.nodeIds))
  ), [groups])

  const ungroupedNodes = useMemo(() => (
    nodes.filter((node) => !groupedNodeIds.has(node.id))
  ), [groupedNodeIds, nodes])

  const sortedGroups = useMemo(() => (
    [...groups].sort((a, b) => extractGroupTimestamp(a.id) - extractGroupTimestamp(b.id))
  ), [groups])

  return (
    <div
      style={{
        flex: 1,
        padding: 24,
        background: 'radial-gradient(circle at top left, #151528 0%, #0d0d1a 55%, #090912 100%)',
        overflowY: 'auto',
      }}
    >
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', color: '#7F77DD', textTransform: 'uppercase' }}>
          Group View
        </div>
        <div style={{ fontSize: 14, color: '#8888aa', marginTop: 6 }}>
          Open a group card to jump back into node view and focus that cluster.
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 18,
        }}
      >
        {sortedGroups.map((group) => (
          <GroupCard
            key={group.id}
            group={group}
            nodes={groupNodesById.get(group.id) ?? []}
            onOpen={() => {
              setActiveGroup(group.id)
              setCanvasView('nodes')
            }}
            onRename={(label) => renameGroup(group.id, label)}
            onRecolor={() => recolorGroup(group.id, getNextGroupColor(group.color))}
          />
        ))}

        <StaticCard
          color={UNGROUPED_COLOR}
          title="Ungrouped"
          subtitle={`${ungroupedNodes.length} node${ungroupedNodes.length !== 1 ? 's' : ''}`}
          body={buildTypeSummary(ungroupedNodes)}
          onClick={() => {
            setActiveGroup(null)
            setCanvasView('nodes')
          }}
        />
      </div>
    </div>
  )
}

function GroupCard({ group, nodes, onOpen, onRename, onRecolor }) {
  const [isHovered, setIsHovered] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [draftLabel, setDraftLabel] = useState(group.label)

  const subtitle = `${nodes.length} node${nodes.length !== 1 ? 's' : ''}`
  const body = buildTypeSummary(nodes)

  return (
    <div
      onClick={onOpen}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        minHeight: 188,
        padding: 18,
        borderRadius: 18,
        border: `2px solid ${group.color}`,
        background: withAlpha(group.color, '26'),
        cursor: 'pointer',
        boxShadow: isHovered ? '0 20px 50px rgba(0,0,0,0.28)' : '0 12px 34px rgba(0,0,0,0.22)',
        transition: 'transform 0.16s ease, box-shadow 0.16s ease',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          {isEditing ? (
            <input
              autoFocus
              value={draftLabel}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setDraftLabel(e.target.value)}
              onBlur={() => {
                const trimmedLabel = draftLabel.trim()
                if (trimmedLabel) onRename(trimmedLabel)
                setIsEditing(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const trimmedLabel = draftLabel.trim()
                  if (trimmedLabel) onRename(trimmedLabel)
                  setIsEditing(false)
                }
                if (e.key === 'Escape') {
                  setDraftLabel(group.label)
                  setIsEditing(false)
                }
              }}
              style={renameInput}
            />
          ) : (
            <div style={{ color: group.color, fontSize: 18, fontWeight: 800, lineHeight: 1.2 }}>
              {group.label}
            </div>
          )}

          <div style={{ fontSize: 12, color: '#a0a0bc', marginTop: 8 }}>
            {subtitle}
          </div>
        </div>

        {(isHovered || isEditing) && (
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              title="Rename group"
              onClick={(e) => {
                e.stopPropagation()
                setDraftLabel(group.label)
                setIsEditing(true)
              }}
              style={iconButton}
            >
              {'\u270E'}
            </button>
            <button
              type="button"
              title="Cycle group color"
              onClick={(e) => {
                e.stopPropagation()
                onRecolor()
              }}
              style={iconButton}
            >
              {'\u25C9'}
            </button>
          </div>
        )}
      </div>

      <div style={{ marginTop: 18, color: '#c9c9de', fontSize: 13, lineHeight: 1.6 }}>
        {body}
      </div>
    </div>
  )
}

function StaticCard({ color, title, subtitle, body, onClick }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        minHeight: 188,
        padding: 18,
        borderRadius: 18,
        border: `2px solid ${color}`,
        background: withAlpha(color, '22'),
        cursor: 'pointer',
        boxShadow: isHovered ? '0 20px 50px rgba(0,0,0,0.28)' : '0 12px 34px rgba(0,0,0,0.22)',
        transition: 'transform 0.16s ease, box-shadow 0.16s ease',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
      }}
    >
      <div style={{ color, fontSize: 18, fontWeight: 800, lineHeight: 1.2 }}>
        {title}
      </div>
      <div style={{ fontSize: 12, color: '#a0a0bc', marginTop: 8 }}>
        {subtitle}
      </div>
      <div style={{ marginTop: 18, color: '#c9c9de', fontSize: 13, lineHeight: 1.6 }}>
        {body}
      </div>
    </div>
  )
}

function buildTypeSummary(nodes) {
  if (nodes.length === 0) return 'No nodes in this group yet.'

  const counts = nodes.reduce((acc, node) => {
    acc[node.type] = (acc[node.type] ?? 0) + 1
    return acc
  }, {})

  return Object.entries(counts)
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1]
      return a[0].localeCompare(b[0])
    })
    .map(([type, count]) => `${count} ${formatTypeLabel(type, count)}`)
    .join(' · ')
}

function formatTypeLabel(type, count) {
  const rawLabel = NODE_CONFIG[type]?.label?.toLowerCase() ?? type.replace(/_/g, ' ')
  if (count === 1) return rawLabel

  const pluralLabels = {
    'hero class': 'hero classes',
    'boss expedition': 'boss expeditions',
    'loot table': 'loot tables',
    'building workflow': 'building workflows',
    'building upgrade': 'building upgrades',
  }

  return pluralLabels[rawLabel] ?? `${rawLabel}s`
}

function extractGroupTimestamp(groupId) {
  const match = String(groupId ?? '').match(/^group-(\d+)/)
  return Number(match?.[1] ?? 0)
}

function getNextGroupColor(currentColor) {
  const currentIndex = GROUP_COLOR_PALETTE.indexOf(currentColor)
  const nextIndex = currentIndex === -1
    ? 0
    : (currentIndex + 1) % GROUP_COLOR_PALETTE.length
  return GROUP_COLOR_PALETTE[nextIndex]
}

function withAlpha(color, alphaHex) {
  return `${color}${alphaHex}`
}

const iconButton = {
  width: 30,
  height: 30,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#11111b',
  border: '1px solid #2a2a3e',
  borderRadius: 999,
  color: '#e0e0f0',
  cursor: 'pointer',
}

const renameInput = {
  width: '100%',
  background: '#11111b',
  border: '1px solid #2a2a3e',
  borderRadius: 10,
  color: '#e0e0f0',
  fontSize: 14,
  fontWeight: 700,
  padding: '8px 10px',
  outline: 'none',
}
