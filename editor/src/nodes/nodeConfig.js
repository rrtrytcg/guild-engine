// Visual config for every node type.
// color    -> border accent + header background
// textColor -> header text
// emoji    -> shown in palette list and node chip header

export const NODE_CONFIG = {
  resource: {
    label: 'Resource',
    emoji: '💰',
    color: '#1D9E75',
    textColor: '#ffffff',
    group: 'Economy',
  },
  item: {
    label: 'Item',
    emoji: '🗡️',
    color: '#BA7517',
    textColor: '#ffffff',
    group: 'Economy',
  },
  loot_table: {
    label: 'Loot Table',
    emoji: '🎲',
    color: '#D85A30',
    textColor: '#ffffff',
    group: 'Economy',
  },
  recipe: {
    label: 'Recipe',
    emoji: '🔨',
    color: '#993C1D',
    textColor: '#ffffff',
    group: 'Economy',
  },
  crafting_recipe: {
    label: 'Craft Recipe',
    emoji: '🛠️',
    color: '#7A3017',
    textColor: '#ffffff',
    group: 'Economy',
  },
  hero_class: {
    label: 'Hero Class',
    emoji: '⚔️',
    color: '#7F77DD',
    textColor: '#ffffff',
    group: 'Heroes',
  },
  ability: {
    label: 'Ability',
    emoji: '✨',
    color: '#534AB7',
    textColor: '#ffffff',
    group: 'Heroes',
  },
  building: {
    label: 'Building',
    emoji: '🏰',
    color: '#378ADD',
    textColor: '#ffffff',
    group: 'World',
  },
  upgrade: {
    label: 'Upgrade',
    emoji: '⬆️',
    color: '#185FA5',
    textColor: '#ffffff',
    group: 'World',
  },
  building_workflow: {
    label: 'Workflow',
    emoji: '⚙️',
    color: '#185FA5',
    textColor: '#ffffff',
    group: 'World',
  },
  building_upgrade: {
    label: 'Bldg Upgrade',
    emoji: '🔧',
    color: '#0C447C',
    textColor: '#ffffff',
    group: 'World',
  },
  blueprint: {
    label: 'Blueprint',
    emoji: '📐',
    color: '#3B6D11',
    textColor: '#ffffff',
    group: 'World',
  },
  act: {
    label: 'Act',
    emoji: '📖',
    color: '#639922',
    textColor: '#ffffff',
    group: 'World',
  },
  event: {
    label: 'Event',
    emoji: '⚡',
    color: '#3B6D11',
    textColor: '#ffffff',
    group: 'World',
  },
  expedition: {
    label: 'Expedition',
    emoji: '🗺️',
    color: '#888780',
    textColor: '#ffffff',
    group: 'Expeditions',
  },
  boss_expedition: {
    label: 'Boss',
    emoji: '💀',
    color: '#5F5E5A',
    textColor: '#ffffff',
    group: 'Expeditions',
  },
  faction: {
    label: 'Faction',
    emoji: '⚜️',
    color: '#D4537E',
    textColor: '#ffffff',
    group: 'Meta',
  },
  prestige: {
    label: 'Prestige',
    emoji: '🌟',
    color: '#993556',
    textColor: '#ffffff',
    group: 'Meta',
  },
}

export const PALETTE_GROUPS = ['Economy', 'Heroes', 'World', 'Expeditions', 'Meta']
