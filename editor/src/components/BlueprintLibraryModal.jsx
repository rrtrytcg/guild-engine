import { useState } from 'react'
import useStore from '../store/useStore'
import ParameterMappingModal from './ParameterMappingModal'
import smeltBasic from '../blueprints/basic/smelt.blueprint.json'
import brewBasic from '../blueprints/basic/brew.blueprint.json'
import researchBasic from '../blueprints/basic/research.blueprint.json'
import forgeChainMedium from '../blueprints/medium/forge-chain.blueprint.json'
import apothecaryChainMedium from '../blueprints/medium/apothecary-chain.blueprint.json'
import libraryChainMedium from '../blueprints/medium/library-chain.blueprint.json'
import forgeSystemComplex from '../blueprints/complex/forge-system.blueprint.json'
import apothecarySystemComplex from '../blueprints/complex/apothecary-system.blueprint.json'
import librarySystemComplex from '../blueprints/complex/library-system.blueprint.json'

const PRESET_BLUEPRINTS = {
  basic: [smeltBasic, brewBasic, researchBasic],
  medium: [forgeChainMedium, apothecaryChainMedium, libraryChainMedium],
  complex: [forgeSystemComplex, apothecarySystemComplex, librarySystemComplex],
}

const TABS = [
  { id: 'basic', label: 'Basic' },
  { id: 'medium', label: 'Medium' },
  { id: 'complex', label: 'Complex' },
  { id: 'epic', label: 'Epic' },
  { id: 'yours', label: 'Yours' },
]

const COMPLEXITY_COLORS = {
  basic: '#1D9E75',
  medium: '#378ADD',
  complex: '#BA7517',
  epic: '#7F77DD',
}

const TYPE_TAGS = {
  building: { icon: '🏗', label: 'building' },
  workflow: { icon: '⚙', label: 'workflow' },
  artisan: { icon: '🧑‍🔧', label: 'artisan' },
  recipe: { icon: '📜', label: 'recipe' },
  item: { icon: '⚔', label: 'item' },
  resource: { icon: '💠', label: 'resource' },
  upgrade: { icon: '⬆', label: 'upgrade' },
  event: { icon: '✨', label: 'event' },
  hero: { icon: '🧑', label: 'hero' },
}

export default function BlueprintLibraryModal({ onClose, dropPosition }) {
  const importBlueprint = useStore((s) => s.importBlueprint)
  const savedBlueprints = useStore((s) => s.blueprints)
  const [notice, setNotice] = useState('')
  const [activeTab, setActiveTab] = useState('basic')
  const [pendingBlueprint, setPendingBlueprint] = useState(null)

  const tabBlueprints = activeTab === 'yours'
    ? savedBlueprints
    : (PRESET_BLUEPRINTS[activeTab] ?? [])

  const handleDropRequest = (blueprint) => {
    const parameters = blueprint.blueprint_meta?.parameters
    if (parameters?.length > 0) {
      setPendingBlueprint(blueprint)
    } else {
      handleDrop(blueprint)
    }
  }

  const handleDrop = (blueprint, parameterMappings) => {
    const summary = importBlueprint(blueprint, dropPosition, parameterMappings)
    if (!summary) return

    const autoCreatedResourcesOnly = summary.autoCreated.every((entry) => entry.type === 'resource')
    const autoCreatedLabel = autoCreatedResourcesOnly ? 'resources' : 'nodes'
    const autoCreatedList = summary.autoCreated.length > 0
      ? `: ${summary.autoCreated.map((entry) => entry.id).join(', ')}`
      : ''
    const remappedList = summary.remapped?.length > 0
      ? ` ${summary.remapped.join('; ')}`
      : ''

    setNotice(
      `${blueprint.blueprint_meta?.label ?? 'Blueprint'} dropped - ${summary.importedCount} nodes, ${summary.importedEdgeCount ?? 0} edges imported, ${summary.autoCreatedCount} ${autoCreatedLabel} auto-created${autoCreatedList}${remappedList}`
    )
  }

  const handleParameterConfirm = (result) => {
    if (result.action === 'import' && pendingBlueprint) {
      handleDrop(pendingBlueprint, result.mappings)
    } else if (result.action === 'skip' && pendingBlueprint) {
      handleDrop(pendingBlueprint, null)
    }
    setPendingBlueprint(null)
  }

  const handleParameterCancel = () => {
    setPendingBlueprint(null)
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 5, 12, 0.78)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(180deg, #151523 0%, #10101a 100%)',
          border: '1px solid #2a2a3e',
          borderRadius: 18,
          width: 960,
          maxWidth: '100%',
          maxHeight: '82vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 28px 80px rgba(0, 0, 0, 0.55)',
        }}
      >
        <div style={headerStyle}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#f2f2ff' }}>Blueprint Library</div>
            <div style={{ fontSize: 12, color: '#8d8daa', marginTop: 4 }}>
              Preset graph kits for common systems, plus your own exported blueprints.
            </div>
          </div>
          <button onClick={onClose} style={closeBtn}>×</button>
        </div>

        <div style={tabRow}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={tabButton(isActive)}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '18px 22px 22px' }}>
          {notice && <div style={noticeStyle}>{notice}</div>}

          {activeTab === 'epic' ? (
            <div style={emptyState}>
              No epic blueprints yet - build and share your own.
            </div>
          ) : tabBlueprints.length > 0 ? (
            <div style={cardGrid}>
              {tabBlueprints.map((blueprint) => (
                <BlueprintCard
                  key={blueprint.blueprint_meta?.id ?? blueprint.blueprint_meta?.label}
                  blueprint={blueprint}
                  onDrop={() => handleDropRequest(blueprint)}
                />
              ))}
            </div>
          ) : (
            <div style={emptyState}>
              {activeTab === 'yours'
                ? 'Export a blueprint from a blueprint node or import a `.blueprint.json` file to see it here.'
                : 'No blueprints in this category yet.'}
            </div>
          )}
        </div>

        {pendingBlueprint && (
          <ParameterMappingModal
            parameters={pendingBlueprint.blueprint_meta.parameters}
            onConfirm={handleParameterConfirm}
            onCancel={handleParameterCancel}
            dropPosition={dropPosition}
          />
        )}

        <div style={footerStyle}>
          <button onClick={onClose} style={secondaryBtn}>Close</button>
        </div>
      </div>
    </div>
  )
}

function BlueprintCard({ blueprint, onDrop }) {
  const meta = blueprint.blueprint_meta ?? {}
  const complexity = (meta.complexity ?? 'basic').toLowerCase()
  const complexityColor = COMPLEXITY_COLORS[complexity] ?? '#7F77DD'
  const nodeCount = blueprint.nodes?.length ?? 0
  const edgeCount = blueprint.edges?.length ?? 0
  const typeTags = getBlueprintTypeTags(blueprint)

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <Badge color={complexityColor} label={complexity} />
        <CountBadge label={`${nodeCount} nodes`} />
        <CountBadge label={`${edgeCount} edges`} />
      </div>

      <div style={{ fontSize: 20, fontWeight: 800, color: '#f2f2ff', marginBottom: 8 }}>
        {meta.label ?? 'Unnamed blueprint'}
      </div>

      <div style={descriptionStyle}>
        {meta.description ?? 'No description provided.'}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {typeTags.map((tag) => (
          <div key={tag.label} style={typeChip}>
            <span>{tag.icon}</span>
            <span>{tag.label}</span>
          </div>
        ))}
      </div>

      <button onClick={onDrop} style={primaryBtn}>
        Drop onto canvas
      </button>
    </div>
  )
}

function getBlueprintTypeTags(blueprint) {
  const seen = new Set()

  for (const node of blueprint.nodes ?? []) {
    const category = getNodeTagCategory(node)
    if (category && !seen.has(category)) {
      seen.add(category)
    }
  }

  return Array.from(seen).map((category) => TYPE_TAGS[category]).filter(Boolean)
}

function getNodeTagCategory(node) {
  if (node?.type === 'hero_class') {
    return node.hero_type === 'artisan' ? 'artisan' : 'hero'
  }
  if (node?.type === 'building_workflow') return 'workflow'
  if (node?.type === 'crafting_recipe' || node?.type === 'recipe') return 'recipe'
  if (node?.type === 'building_upgrade') return 'upgrade'
  if (node?.type === 'item') return 'item'
  if (node?.type === 'resource') return 'resource'
  if (node?.type === 'event') return 'event'
  if (node?.type === 'building') return 'building'
  return null
}

function Badge({ color, label }) {
  return (
    <div
      style={{
        padding: '5px 11px',
        borderRadius: 999,
        background: `${color}22`,
        border: `1px solid ${color}44`,
        color,
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </div>
  )
}

function CountBadge({ label }) {
  return (
    <div
      style={{
        padding: '5px 11px',
        borderRadius: 999,
        background: '#1c1c2d',
        border: '1px solid #30304a',
        color: '#b3b3cd',
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </div>
  )
}

const headerStyle = {
  padding: '18px 22px 14px',
  borderBottom: '1px solid #26263b',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 16,
}

const tabRow = {
  display: 'flex',
  gap: 10,
  padding: '14px 22px 0',
  borderBottom: '1px solid #202033',
  flexWrap: 'wrap',
}

const cardGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: 14,
}

const cardStyle = {
  background: 'linear-gradient(180deg, #171728 0%, #131320 100%)',
  border: '1px solid #2c2c43',
  borderRadius: 16,
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 230,
}

const descriptionStyle = {
  color: '#8d8daa',
  fontSize: 12,
  lineHeight: 1.5,
  marginBottom: 14,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

const typeChip = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 10px',
  borderRadius: 999,
  background: '#1d1d2d',
  border: '1px solid #30304a',
  color: '#b8b8d2',
  fontSize: 11,
  fontWeight: 700,
}

const emptyState = {
  padding: '20px 18px',
  background: '#151523',
  border: '1px solid #2a2a3e',
  borderRadius: 14,
  color: '#8d8daa',
  fontSize: 13,
}

const noticeStyle = {
  marginBottom: 14,
  padding: '11px 13px',
  borderRadius: 12,
  border: '1px solid #1D9E7544',
  background: '#1D9E7522',
  color: '#78d7b7',
  fontSize: 12,
  lineHeight: 1.5,
}

const footerStyle = {
  padding: '14px 22px',
  borderTop: '1px solid #26263b',
  display: 'flex',
  justifyContent: 'flex-end',
}

const closeBtn = {
  background: 'transparent',
  border: '1px solid #2f2f46',
  borderRadius: 10,
  color: '#7e7e9d',
  cursor: 'pointer',
  fontSize: 20,
  lineHeight: 1,
  width: 36,
  height: 36,
}

const secondaryBtn = {
  background: 'transparent',
  border: '1px solid #2f2f46',
  borderRadius: 10,
  color: '#b3b3cd',
  fontSize: 12,
  fontWeight: 700,
  padding: '9px 16px',
  cursor: 'pointer',
}

const primaryBtn = {
  width: '100%',
  marginTop: 'auto',
  background: 'linear-gradient(135deg, #5d54d8 0%, #7F77DD 100%)',
  border: 'none',
  borderRadius: 11,
  color: '#fff',
  fontSize: 13,
  fontWeight: 800,
  padding: '11px 16px',
  cursor: 'pointer',
}

const tabButton = (isActive) => ({
  background: isActive ? '#24243a' : 'transparent',
  border: `1px solid ${isActive ? '#4d4d7a' : '#2f2f46'}`,
  borderBottomColor: isActive ? '#6d66d8' : '#2f2f46',
  borderRadius: 999,
  color: isActive ? '#f1efff' : '#9999b8',
  fontSize: 12,
  fontWeight: 800,
  padding: '9px 15px',
  cursor: 'pointer',
  marginBottom: 12,
})
