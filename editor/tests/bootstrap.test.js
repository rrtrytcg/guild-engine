import { describe, it, expect } from 'vitest'
import { bootstrapState } from '../../engine/systems/bootstrap.js'

const MINIMAL_PROJECT = {
  nodes: [
    { id: 'res-gold', type: 'resource', label: 'Gold', base_cap: 999999, base_income: 0, icon: '💰' },
    { id: 'res-wood', type: 'resource', label: 'Wood', base_cap: 100, base_income: 2, icon: '🪵', is_material: true },
    { id: 'item-sword', type: 'item', label: 'Iron Sword', icon: '🗡️', rarity: 'common' },
    { id: 'building-forge', type: 'building', label: 'Forge', icon: '🔨', max_level: 5, levels: [{ cost: [] }] },
    { id: 'class-warrior', type: 'hero_class', label: 'Warrior', icon: '⚔️', base_stats: { attack: 10, defense: 8 } },
    { id: 'exp-forest', type: 'expedition', label: 'Forest', icon: '🌲', level: 1, duration_s: 60, party_size: 3, enemy_atk: 10, enemy_hp: 70 },
    { id: 'upg-mining', type: 'upgrade', label: 'Mining', icon: '⛏️', cost: [{ resource_id: 'res-gold', amount: 100 }], tiers: [{}, {}] },
    { id: 'faction-guild', type: 'faction', label: 'Guild', icon: '🏛️' },
  ],
  meta: { title: 'Test Project' },
}

describe('bootstrapState', () => {
  it('creates resources with correct defaults', () => {
    const state = bootstrapState(MINIMAL_PROJECT)
    expect(state.resources['res-gold']).toEqual({
      id: 'res-gold',
      label: 'Gold',
      icon: '💰',
      amount: 0,
      cap: 999999,
      income: 0,
      is_material: false,
    })
    expect(state.resources['res-wood'].is_material).toBe(true)
    expect(state.resources['res-wood'].income).toBe(2)
  })

  it('creates item definitions', () => {
    const state = bootstrapState(MINIMAL_PROJECT)
    expect(state.itemDefs['item-sword']).toBeDefined()
    expect(state.itemDefs['item-sword'].label).toBe('Iron Sword')
  })

  it('creates empty inventory and buff stockpile', () => {
    const state = bootstrapState(MINIMAL_PROJECT)
    expect(state.inventory).toEqual({})
    expect(state.buff_stockpile).toEqual({})
  })

  it('creates hero classes', () => {
    const state = bootstrapState(MINIMAL_PROJECT)
    expect(state.heroClasses['class-warrior']).toBeDefined()
  })

  it('creates buildings with level 0', () => {
    const state = bootstrapState(MINIMAL_PROJECT)
    expect(state.buildings['building-forge'].level).toBe(0)
    expect(state.buildings['building-forge'].max_level).toBe(5)
  })

  it('creates expeditions', () => {
    const state = bootstrapState(MINIMAL_PROJECT)
    expect(state.expeditions['exp-forest']).toBeDefined()
    expect(state.expeditions['exp-forest'].level).toBe(1)
  })

  it('creates upgrades with tier 0', () => {
    const state = bootstrapState(MINIMAL_PROJECT)
    expect(state.upgrades['upg-mining'].tier).toBe(0)
  })

  it('creates factions with 0 rep', () => {
    const state = bootstrapState(MINIMAL_PROJECT)
    expect(state.factions['faction-guild'].rep).toBe(0)
  })

  it('initializes meta title', () => {
    const state = bootstrapState(MINIMAL_PROJECT)
    expect(state.meta.title).toBe('Test Project')
  })

  it('initializes empty hero roster and recruit pool', () => {
    const state = bootstrapState(MINIMAL_PROJECT)
    expect(state.heroes).toEqual([])
    expect(state.recruitPool).toEqual([])
  })

  it('initializes multipliers with defaults', () => {
    const state = bootstrapState(MINIMAL_PROJECT)
    expect(state.multipliers.resource_income).toEqual({})
    expect(state.multipliers.resource_cap).toEqual({})
    expect(state.multipliers.craft_speed).toBe(1)
  })

  it('initializes event log with system messages', () => {
    const state = bootstrapState(MINIMAL_PROJECT)
    expect(state.eventLog.length).toBeGreaterThan(0)
    expect(state.eventLog[0].type).toBe('system')
    expect(state.eventLog[0].text).toContain('Test Project')
  })
})
