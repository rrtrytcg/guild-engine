import { describe, it, expect } from 'vitest'
import { tickResources, canAfford, spend, gain } from '../../engine/systems/resources.js'

function makeResourceState() {
  return {
    resources: {
      gold: { id: 'gold', label: 'Gold', amount: 100, cap: 999999, income: 5, is_material: false },
      wood: { id: 'wood', label: 'Wood', amount: 50, cap: 200, income: 2, is_material: true },
      stone: { id: 'stone', label: 'Stone', amount: 0, cap: 0, income: 0, is_material: true },
    },
    buildings: {},
    multipliers: { resource_income: {}, resource_cap: {} },
  }
}

describe('tickResources', () => {
  it('adds base income each tick', () => {
    const state = makeResourceState()
    tickResources(state, 1)
    expect(state.resources.gold.amount).toBe(105) // 100 + 5
    expect(state.resources.wood.amount).toBe(52) // 50 + 2
  })

  it('respects resource cap', () => {
    const state = makeResourceState()
    state.resources.wood.amount = 199
    tickResources(state, 1)
    expect(state.resources.wood.amount).toBe(200) // capped at 200
  })

  it('cap of 0 means infinite', () => {
    const state = makeResourceState()
    state.resources.stone.amount = 99999999
    state.resources.stone.income = 1
    tickResources(state, 1)
    expect(state.resources.stone.amount).toBe(100000000) // no cap
  })

  it('applies income multiplier', () => {
    const state = makeResourceState()
    state.multipliers.resource_income.gold = 2
    tickResources(state, 1)
    expect(state.resources.gold.amount).toBe(110) // 100 + 5*2
  })

  it('applies cap multiplier', () => {
    const state = makeResourceState()
    state.resources.wood.amount = 195
    state.multipliers.resource_cap.wood = 0.5
    tickResources(state, 1)
    expect(state.resources.wood.amount).toBe(100) // capped at 200 * 0.5 = 100
  })

  it('includes building production', () => {
    const state = makeResourceState()
    state.buildings.mine = {
      level: 2,
      levels: [
        { production: { gold: 3 } },
        { production: { gold: 5 } },
      ],
    }
    tickResources(state, 1)
    // building level 2 -> levels[1] -> production gold = 5
    // effectiveIncome = (res.income + buildingProduction[gold]) * incomeMulti = (5 + 5) * 1 = 10
    // gold: 100 + 10 = 110
    expect(state.resources.gold.amount).toBe(110)
  })

  it('skips unbuilt buildings', () => {
    const state = makeResourceState()
    state.buildings.mine = {
      level: 0,
      levels: [{ production: { gold: 100 } }],
    }
    tickResources(state, 1)
    expect(state.resources.gold.amount).toBe(105) // just base income
  })

  it('scales with dt', () => {
    const state = makeResourceState()
    tickResources(state, 0.5)
    expect(state.resources.gold.amount).toBeCloseTo(102.5) // 100 + 5 * 0.5
  })
})

describe('canAfford', () => {
  it('returns true for empty cost', () => {
    const state = makeResourceState()
    expect(canAfford(state, [])).toBe(true)
    expect(canAfford(state, null)).toBe(true)
  })

  it('returns true when resources are sufficient', () => {
    const state = makeResourceState()
    expect(canAfford(state, [{ resource_id: 'gold', amount: 50 }])).toBe(true)
  })

  it('returns false when resources are insufficient', () => {
    const state = makeResourceState()
    expect(canAfford(state, [{ resource_id: 'gold', amount: 200 }])).toBe(false)
  })

  it('returns false for unknown resource', () => {
    const state = makeResourceState()
    expect(canAfford(state, [{ resource_id: 'gems', amount: 1 }])).toBe(false)
  })
})

describe('spend', () => {
  it('deducts resources when affordable', () => {
    const state = makeResourceState()
    const ok = spend(state, [{ resource_id: 'gold', amount: 30 }, { resource_id: 'wood', amount: 10 }])
    expect(ok).toBe(true)
    expect(state.resources.gold.amount).toBe(70)
    expect(state.resources.wood.amount).toBe(40)
  })

  it('returns false and does not deduct when not affordable', () => {
    const state = makeResourceState()
    const ok = spend(state, [{ resource_id: 'gold', amount: 200 }])
    expect(ok).toBe(false)
    expect(state.resources.gold.amount).toBe(100) // unchanged
  })
})

describe('gain', () => {
  it('adds resources', () => {
    const state = makeResourceState()
    gain(state, { gold: 25, wood: 5 })
    expect(state.resources.gold.amount).toBe(125)
    expect(state.resources.wood.amount).toBe(55)
  })

  it('respects cap when gaining', () => {
    const state = makeResourceState()
    state.resources.wood.amount = 198
    gain(state, { wood: 10 })
    expect(state.resources.wood.amount).toBe(200) // capped
  })

  it('ignores unknown resources', () => {
    const state = makeResourceState()
    gain(state, { gems: 999 })
    // no error, just ignored
  })
})
