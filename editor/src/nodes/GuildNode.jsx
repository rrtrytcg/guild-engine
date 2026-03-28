import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import { NODE_CONFIG } from './nodeConfig'
import useStore from '../store/useStore'

const GuildNode = memo(({ id, data, selected }) => {
  const config = NODE_CONFIG[data.type] ?? { label: data.type, emoji: '?', color: '#888', textColor: '#fff' }
  const selectNode = useStore((s) => s.selectNode)

  return (
    <div
      onClick={() => selectNode(id)}
      style={{
        minWidth: 180,
        maxWidth: 220,
        borderRadius: 10,
        border: `2px solid ${selected ? '#fff' : config.color}`,
        boxShadow: selected
          ? `0 0 0 3px ${config.color}, 0 4px 20px rgba(0,0,0,0.4)`
          : '0 2px 8px rgba(0,0,0,0.3)',
        background: '#1e1e2e',
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'box-shadow 0.15s, border-color 0.15s',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: config.color,
          borderRadius: '8px 8px 0 0',
          padding: '6px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div
          draggable
          className="nodrag nopan"
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onDragStart={(e) => {
            e.stopPropagation()
            e.dataTransfer.setData('application/guild-engine-node-id', id)
            e.dataTransfer.setData('application/guild-engine-node-type', data.type)
            e.dataTransfer.setData('text/plain', `${id}::${data.type}`)
            e.dataTransfer.effectAllowed = 'copy'
          }}
          title="Drag to an ID field"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 18,
            height: 18,
            borderRadius: 4,
            color: config.textColor,
            fontSize: 12,
            fontWeight: 700,
            cursor: 'grab',
            flexShrink: 0,
            userSelect: 'none',
            background: 'rgba(255,255,255,0.12)',
          }}
        >
          ⠿
        </div>
        <span style={{ fontSize: 14 }}>{data.icon ?? config.emoji}</span>
        <span
          style={{
            color: config.textColor,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            opacity: 0.85,
          }}
        >
          {config.label}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '8px 10px 10px' }}>
        <div
          style={{
            color: '#e0e0f0',
            fontSize: 13,
            fontWeight: 500,
            lineHeight: 1.3,
            marginBottom: data.description ? 4 : 0,
          }}
        >
          {data.label || <span style={{ opacity: 0.4, fontStyle: 'italic' }}>Unnamed</span>}
        </div>
        {data.description && (
          <div
            style={{
              color: '#8888aa',
              fontSize: 11,
              lineHeight: 1.4,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {data.description}
          </div>
        )}

        {/* Quick-glance badges */}
        <NodeBadges data={data} color={config.color} />
      </div>

      {/* ReactFlow connection handles */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: config.color, width: 10, height: 10, border: '2px solid #1e1e2e' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: config.color, width: 10, height: 10, border: '2px solid #1e1e2e' }}
      />
    </div>
  )
})

// Small type-specific summary badges shown under the label
function NodeBadges({ data, color }) {
  const badges = []

  if (data.type === 'resource') {
    if (data.base_income > 0) badges.push(`+${data.base_income}/s`)
    if (data.base_cap > 0) badges.push(`cap ${fmt(data.base_cap)}`)
    if (data.is_material) badges.push('material')
  }
  if (data.type === 'hero_class') {
    if (data.slots?.length) badges.push(data.slots.join(' · '))
  }
  if (data.type === 'item') {
    badges.push(data.rarity ?? 'common')
    if (data.slot) badges.push(data.slot)
  }
  if (data.type === 'expedition' || data.type === 'boss_expedition') {
    if (data.duration_s) badges.push(`${data.duration_s}s`)
    if (data.party_size) badges.push(`${data.party_size} heroes`)
  }
  if (data.type === 'building') {
    if (data.max_level) badges.push(`${data.max_level} lvls`)
    if (data.is_crafting_station) badges.push('forge')
  }
  if (data.type === 'loot_table') {
    if (data.entries?.length) badges.push(`${data.entries.length} entries`)
    if (data.rolls > 1) badges.push(`${data.rolls} rolls`)
  }
  if (data.type === 'faction') {
    if (data.rep_tiers?.length) badges.push(`${data.rep_tiers.length} tiers`)
  }
  if (data.type === 'prestige') {
    if (data.resets?.length) badges.push(`resets ${data.resets.length} systems`)
  }
  if (data.type === 'act') {
    badges.push(`Act ${data.act_number ?? '?'}`)
  }

  if (!badges.length) return null

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
      {badges.map((b, i) => (
        <span
          key={i}
          style={{
            fontSize: 10,
            padding: '2px 6px',
            borderRadius: 4,
            background: `${color}22`,
            color: color,
            fontWeight: 500,
            border: `1px solid ${color}44`,
          }}
        >
          {b}
        </span>
      ))}
    </div>
  )
}

function fmt(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

GuildNode.displayName = 'GuildNode'
export default GuildNode
