import useStore from '../store/useStore'
import { NODE_CONFIG } from '../nodes/nodeConfig'
import ResourceInspector from './ResourceInspector'
import HeroClassInspector from './HeroClassInspector'
import ItemInspector from './ItemInspector'
import LootTableInspector from './LootTableInspector'
import RecipeInspector from './RecipeInspector'
import CraftingRecipeInspector from './CraftingRecipeInspector'
import AbilityInspector from './AbilityInspector'
import BuildingInspector from './BuildingInspector'
import UpgradeInspector from './UpgradeInspector'
import BuildingWorkflowInspector from './BuildingWorkflowInspector'
import BuildingUpgradeInspector from './BuildingUpgradeInspector'
import ExpeditionInspector from './ExpeditionInspector'
import BossExpeditionInspector from './BossExpeditionInspector'
import ActInspector from './ActInspector'
import EventInspector from './EventInspector'
import FactionInspector from './FactionInspector'
import PrestigeInspector from './PrestigeInspector'
import BlueprintInspector from './BlueprintInspector'

const INSPECTOR_MAP = {
  resource:         ResourceInspector,
  hero_class:       HeroClassInspector,
  item:             ItemInspector,
  loot_table:       LootTableInspector,
  recipe:           RecipeInspector,
  crafting_recipe:  CraftingRecipeInspector,
  ability:          AbilityInspector,
  building:         BuildingInspector,
  upgrade:          UpgradeInspector,
  building_workflow: BuildingWorkflowInspector,
  building_upgrade: BuildingUpgradeInspector,
  expedition:       ExpeditionInspector,
  boss_expedition:  BossExpeditionInspector,
  act:              ActInspector,
  event:            EventInspector,
  faction:          FactionInspector,
  prestige:         PrestigeInspector,
  blueprint:        BlueprintInspector,
}

export default function Inspector() {
  const selectedNodeId = useStore((s) => s.selectedNodeId)
  const nodes = useStore((s) => s.nodes)
  const deleteNode = useStore((s) => s.deleteNode)

  const node = nodes.find((n) => n.id === selectedNodeId)

  if (!node) {
    return (
      <div style={{
        width: 480, background: '#13131f', borderLeft: '1px solid #2a2a3e',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#444460', fontSize: 12, textAlign: 'center', padding: 24,
      }}>
        Click a node to inspect it
      </div>
    )
  }

  const config = NODE_CONFIG[node.data.type] ?? { label: node.data.type, color: '#888' }
  const Form = INSPECTOR_MAP[node.data.type]

  return (
    <div style={{
      width: 480, background: '#13131f', borderLeft: '1px solid #2a2a3e',
      display: 'flex', flexDirection: 'column', overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{
        background: config.color, padding: '10px 14px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)' }}>
            {config.label}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginTop: 2 }}>
            {node.data.label || 'Unnamed'}
          </div>
        </div>
        <button
          onClick={() => deleteNode(node.id)}
          title="Delete node"
          style={{ background: 'rgba(0,0,0,0.25)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 16, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >×</button>
      </div>

      {/* Node ID */}
      <div style={{ padding: '6px 14px 0', fontFamily: 'monospace', fontSize: 10, color: '#33334a' }}>
        {node.id}
      </div>

      {/* Form */}
      <div style={{ padding: '12px 14px', flex: 1 }}>
        {Form
          ? <Form node={node} />
          : <div style={{ color: '#555570', fontSize: 12 }}>No inspector for type: {node.data.type}</div>
        }
      </div>
    </div>
  )
}
