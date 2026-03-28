// Connection rules mirrored from project.schema.json x-connection-rules.
// source type → { relation → allowed target types[] }
export const CONNECTION_RULES = {
  resource:        { produces: ['building'], modifies: ['upgrade'] },
  item:            { drops_from: ['loot_table'], consumes: ['recipe'] },
  loot_table:      { drops_from: ['expedition', 'boss_expedition', 'building'] },
  recipe:          { hosts_recipe: ['building'], consumes: ['item'], produces: ['item'] },
  hero_class:      { trains: ['building'], preferred_class: ['expedition', 'boss_expedition'] },
  ability:         { trains: ['hero_class'] },
  building:        { produces: ['resource'], hosts_recipe: ['recipe'], unlocks: ['upgrade', 'expedition', 'boss_expedition'], gates: ['act'] },
  upgrade:         { modifies: ['resource', 'building', 'hero_class', 'expedition'] },
  expedition:      { drops_from: ['loot_table'], gates: ['act'], triggers: ['event'] },
  boss_expedition: { drops_from: ['loot_table'], gates: ['act'], triggers: ['event'] },
  act:             { unlocks: ['building', 'expedition', 'boss_expedition', 'upgrade'], triggers: ['event'] },
  event:           { affects_rep: ['faction'], triggers: ['act'] },
  faction:         { gates: ['upgrade', 'building', 'expedition'], affects_rep: ['event'] },
  prestige:        { gates: ['act'], produces: ['resource'] },
}

// Required fields per node type — compiler errors if missing or empty
export const REQUIRED_FIELDS = {
  resource:        ['label', 'base_cap', 'base_income'],
  item:            ['label', 'rarity', 'subtype'],
  loot_table:      ['label', 'rolls'],
  recipe:          ['label', 'output_item_id', 'craft_time_s'],
  hero_class:      ['label', 'base_stats'],
  ability:         ['label', 'trigger'],
  building:        ['label', 'max_level'],
  upgrade:         ['label'],
  expedition:      ['label', 'duration_s', 'party_size', 'base_success_chance'],
  boss_expedition: ['label', 'duration_s', 'party_size', 'boss_hp'],
  act:             ['label', 'act_number'],
  event:           ['label'],
  faction:         ['label'],
  prestige:        ['label', 'currency_id'],
}

// Warnings (non-blocking) — things that are suspicious but not invalid
export const WARNING_CHECKS = [
  {
    id: 'expedition_no_loot',
    check: (node) => (node.type === 'expedition' || node.type === 'boss_expedition') && !node.data.loot_table_id,
    message: (node) => `"${node.data.label}" has no loot table — it will drop nothing on completion.`,
  },
  {
    id: 'building_no_levels',
    check: (node) => node.type === 'building' && (!node.data.levels || node.data.levels.length === 0),
    message: (node) => `"${node.data.label}" has no level data — it cannot be built.`,
  },
  {
    id: 'loot_table_no_entries',
    check: (node) => node.type === 'loot_table' && (!node.data.entries || node.data.entries.length === 0),
    message: (node) => `Loot table "${node.data.label}" has no entries — it will always drop nothing.`,
  },
  {
    id: 'recipe_no_inputs',
    check: (node) => node.type === 'recipe' && (!node.data.inputs || node.data.inputs.length === 0),
    message: (node) => `Recipe "${node.data.label}" has no ingredients.`,
  },
  {
    id: 'prestige_no_conditions',
    check: (node) => node.type === 'prestige' && (!node.data.trigger_conditions || node.data.trigger_conditions.length === 0),
    message: (node) => `Prestige "${node.data.label}" has no trigger conditions — it will always be available.`,
  },
  {
    id: 'act_no_conditions',
    check: (node) => node.type === 'act' && (!node.data.completion_conditions || node.data.completion_conditions.length === 0),
    message: (node) => `Act "${node.data.label}" has no completion conditions — it completes immediately.`,
  },
  {
    id: 'item_equipment_no_stats',
    check: (node) => node.type === 'item' && node.data.subtype === 'equipment' && (!node.data.stat_modifiers || Object.keys(node.data.stat_modifiers).length === 0),
    message: (node) => `Equipment "${node.data.label}" has no stat modifiers — it does nothing when equipped.`,
  },
  {
    id: 'boss_no_phases',
    check: (node) => node.type === 'boss_expedition' && (!node.data.phases || node.data.phases.length === 0),
    message: (node) => `Boss "${node.data.label}" has no phases — it will be a flat fight with no escalation.`,
  },
  {
    id: 'faction_no_tiers',
    check: (node) => node.type === 'faction' && (!node.data.rep_tiers || node.data.rep_tiers.length === 0),
    message: (node) => `Faction "${node.data.label}" has no reputation tiers — rep gains will have no effect.`,
  },
  {
    id: 'no_acts',
    check: (_, allNodes) => allNodes.every((n) => n.type !== 'act'),
    message: () => 'No Act nodes found — the game has no story progression or content gates.',
    global: true,
  },
  {
    id: 'no_expeditions',
    check: (_, allNodes) => allNodes.every((n) => n.type !== 'expedition' && n.type !== 'boss_expedition'),
    message: () => 'No Expedition nodes found — the game has no runs for heroes to go on.',
    global: true,
  },
  {
    id: 'duplicate_act_numbers',
    check: (_, allNodes) => {
      const acts = allNodes.filter((n) => n.type === 'act').map((n) => n.data.act_number)
      return new Set(acts).size !== acts.length
    },
    message: () => 'Multiple Act nodes share the same act_number — acts must have unique numbers.',
    global: true,
  },
]
