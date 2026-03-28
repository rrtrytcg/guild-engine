// Visual config for every node type.
// color    → border accent + header background
// textColor → header text
// emoji    → shown in palette list and node chip header

export const NODE_CONFIG = {
  resource: {
    label: 'Resource',
    emoji: '💰',
    color: '#1D9E75',       // teal
    textColor: '#ffffff',
    group: 'Economy',
  },
  item: {
    label: 'Item',
    emoji: '🗡️',
    color: '#BA7517',       // amber
    textColor: '#ffffff',
    group: 'Economy',
  },
  loot_table: {
    label: 'Loot Table',
    emoji: '🎲',
    color: '#D85A30',       // coral
    textColor: '#ffffff',
    group: 'Economy',
  },
  recipe: {
    label: 'Recipe',
    emoji: '🔨',
    color: '#993C1D',       // coral dark
    textColor: '#ffffff',
    group: 'Economy',
  },
  hero_class: {
    label: 'Hero Class',
    emoji: '⚔️',
    color: '#7F77DD',       // purple
    textColor: '#ffffff',
    group: 'Heroes',
  },
  ability: {
    label: 'Ability',
    emoji: '✨',
    color: '#534AB7',       // purple dark
    textColor: '#ffffff',
    group: 'Heroes',
  },
  building: {
    label: 'Building',
    emoji: '🏰',
    color: '#378ADD',       // blue
    textColor: '#ffffff',
    group: 'World',
  },
  upgrade: {
    label: 'Upgrade',
    emoji: '⬆️',
    color: '#185FA5',       // blue dark
    textColor: '#ffffff',
    group: 'World',
  },
  act: {
    label: 'Act',
    emoji: '📖',
    color: '#639922',       // green
    textColor: '#ffffff',
    group: 'World',
  },
  event: {
    label: 'Event',
    emoji: '⚡',
    color: '#3B6D11',       // green dark
    textColor: '#ffffff',
    group: 'World',
  },
  expedition: {
    label: 'Expedition',
    emoji: '🗺️',
    color: '#888780',       // gray mid
    textColor: '#ffffff',
    group: 'Expeditions',
  },
  boss_expedition: {
    label: 'Boss',
    emoji: '💀',
    color: '#5F5E5A',       // gray dark
    textColor: '#ffffff',
    group: 'Expeditions',
  },
  faction: {
    label: 'Faction',
    emoji: '⚜️',
    color: '#D4537E',       // pink
    textColor: '#ffffff',
    group: 'Meta',
  },
  prestige: {
    label: 'Prestige',
    emoji: '🌟',
    color: '#993556',       // pink dark
    textColor: '#ffffff',
    group: 'Meta',
  },
}

export const PALETTE_GROUPS = ['Economy', 'Heroes', 'World', 'Expeditions', 'Meta']
