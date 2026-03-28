import { create } from 'zustand'
import { addEdge, applyNodeChanges, applyEdgeChanges } from 'reactflow'

const useStore = create((set, get) => ({
  // --- Graph state ---
  nodes: [],
  edges: [],
  selectedNodeId: null,

  // --- ReactFlow handlers (wired directly to <ReactFlow> props) ---
  onNodesChange: (changes) =>
    set({ nodes: applyNodeChanges(changes, get().nodes) }),

  onEdgesChange: (changes) =>
    set({ edges: applyEdgeChanges(changes, get().edges) }),

  onConnect: (connection) =>
    set({ edges: addEdge({ ...connection, id: `e-${Date.now()}` }, get().edges) }),

  // --- Node selection ---
  selectNode: (id) => set({ selectedNodeId: id }),
  clearSelection: () => set({ selectedNodeId: null }),

  // --- Node data update (called from Inspector forms) ---
  updateNodeData: (id, patch) =>
    set({
      nodes: get().nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...patch } } : n
      ),
    }),

  // --- Add a new node from the palette ---
  addNode: (type, position) => {
    const id = `${type}-${Date.now()}`
    const defaults = NODE_DEFAULTS[type] ?? { label: type }
    set({
      nodes: [
        ...get().nodes,
        {
          id,
          type,           // maps to a custom ReactFlow node component
          position,
          data: { id, type, ...defaults },
        },
      ],
    })
    return id
  },

  // --- Delete selected node + its edges ---
  deleteNode: (id) =>
    set({
      nodes: get().nodes.filter((n) => n.id !== id),
      edges: get().edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: get().selectedNodeId === id ? null : get().selectedNodeId,
    }),


  // --- Import project.json ---
  importProject: (project) => {
    if (!project?.nodes || !project?.edges) {
      alert('Invalid project.json — missing nodes or edges array.')
      return
    }

    // Auto-layout: space nodes on a grid if canvas_pos is missing
    const COLS = 4
    const GAP_X = 260
    const GAP_Y = 180
    const OFFSET_X = 80
    const OFFSET_Y = 80

    const rfNodes = project.nodes.map((nodeData, i) => {
      const pos = nodeData.canvas_pos ?? {
        x: OFFSET_X + (i % COLS) * GAP_X,
        y: OFFSET_Y + Math.floor(i / COLS) * GAP_Y,
      }
      return {
        id: nodeData.id,
        type: nodeData.type,
        position: { x: pos.x, y: pos.y },
        data: nodeData,
      }
    })

    const rfEdges = project.edges.map((e) => ({
      id: e.id ?? `e-${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      data: { relation: e.relation },
      style: { stroke: '#444466', strokeWidth: 1.5 },
    }))

    set({ nodes: rfNodes, edges: rfEdges, selectedNodeId: null })
  },

  // export is handled by compiler.js + CompileModal
}))

// Default field values when a node is first dropped onto the canvas
const NODE_DEFAULTS = {
  resource: {
    label: 'New Resource',
    description: '',
    icon: '💰',
    base_cap: 1000,
    base_income: 0,
    is_material: false,
  },
  hero_class: {
    label: 'New Hero Class',
    description: '',
    icon: '⚔️',
    base_stats: { attack: 10, defense: 5, speed: 5, hp: 100, luck: 5 },
    stat_growth: { attack: 2, defense: 1, speed: 1, hp: 20, luck: 1 },
    slots: ['weapon', 'armor'],
    recruit_cost: [],
    unlock_conditions: [],
  },
  item: {
    label: 'New Item',
    description: '',
    icon: '🗡️',
    rarity: 'common',
    subtype: 'equipment',
    slot: 'weapon',
    stat_modifiers: {},
    stack_limit: 1,
  },
  loot_table: {
    label: 'New Loot Table',
    rolls: 1,
    entries: [],
  },
  recipe: {
    label: 'New Recipe',
    inputs: [],
    output_item_id: '',
    output_qty: 1,
    craft_time_s: 10,
    unlock_conditions: [],
  },
  ability: {
    label: 'New Ability',
    description: '',
    icon: '✨',
    trigger: 'passive',
    effect: {},
    unlock_level: 1,
  },
  building: {
    label: 'New Building',
    description: '',
    icon: '🏰',
    max_level: 5,
    levels: [],
    is_crafting_station: false,
    unlock_conditions: [],
  },
  upgrade: {
    label: 'New Upgrade',
    description: '',
    icon: '⬆️',
    cost: [],
    max_tier: 1,
    effect: {},
    unlock_conditions: [],
  },
  expedition: {
    label: 'New Expedition',
    description: '',
    icon: '🗺️',
    duration_s: 60,
    party_size: 3,
    base_success_chance: 0.75,
    loot_table_id: '',
    events: [],
    unlock_conditions: [],
  },
  boss_expedition: {
    label: 'New Boss',
    description: '',
    icon: '💀',
    duration_s: 120,
    party_size: 4,
    boss_hp: 1000,
    boss_stats: { attack: 50, defense: 30, speed: 10 },
    phases: [],
    loot_table_id: '',
    repeatable: false,
    unlock_conditions: [],
  },
  act: {
    label: 'Act 1',
    description: '',
    act_number: 1,
    completion_conditions: [],
    on_complete_events: [],
    unlocks_node_ids: [],
    narrative_log: '',
  },
  event: {
    label: 'New Event',
    description: '',
    log_message: '',
    choices: [],
  },
  faction: {
    label: 'New Faction',
    description: '',
    icon: '⚜️',
    rep_tiers: [],
    starting_rep: 0,
  },
  prestige: {
    label: 'Prestige Layer',
    description: '',
    trigger_conditions: [],
    currency_id: '',
    currency_formula: 'Math.floor(Math.sqrt(gold / 1000))',
    resets: ['resources', 'buildings', 'heroes', 'upgrades'],
    bonuses: [],
  },
}

export default useStore
