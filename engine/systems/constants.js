export const STATUS_MULTIPLIERS = {
  ready: 1,
  inspired: 1.15,
  exhausted: 0.9,
  cursed: 0.8,
  injured: 0.6,
  dead: 0,
}

export const STATUS_PRIORITY = ['dead', 'injured', 'cursed', 'exhausted', 'inspired', 'ready']

export const HERO_RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary']

export const HERO_STAT_ALIASES = {
  atk: 'attack',
  def: 'defense',
  spd: 'speed',
  hp: 'hp',
  lck: 'luck',
}

export const HERO_NAMES = ['Aldric', 'Brienna', 'Corvin', 'Dasha', 'Emrick', 'Fyra', 'Gareth', 'Hilde', 'Iven', 'Jora']

export const OUTCOME_TIERS = ['WIPE', 'FAIL', 'NARROW_SUCCESS', 'CLEAN_SUCCESS', 'DOMINANT']
export const TIER_RANK = Object.fromEntries(OUTCOME_TIERS.map((tier, index) => [tier, index]))

export const READINESS_META = {
  locked: { key: 'locked', label: 'Locked', icon: '🔒', color: '#666680' },
  empty: { key: 'empty', label: 'No heroes', icon: '•', color: '#444460' },
  WIPE: { key: 'WIPE', label: 'Wipe risk', icon: '💀', color: '#444444' },
  FAIL: { key: 'FAIL', label: 'Likely fail', icon: '✕', color: '#E24B4A' },
  NARROW_SUCCESS: { key: 'NARROW_SUCCESS', label: 'Risky', icon: '⚠', color: '#BA7517' },
  CLEAN_SUCCESS: { key: 'CLEAN_SUCCESS', label: 'Ready', icon: '✓', color: '#1D9E75' },
  DOMINANT: { key: 'DOMINANT', label: 'Dominant', icon: '★', color: '#EF9F27' },
}
