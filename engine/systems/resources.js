// Resource system — runs every game tick.
// dt = seconds elapsed since last tick.

export function tickResources(state, dt) {
  const { resources, buildings, multipliers } = state

  // Sum production from all built buildings
  const buildingProduction = {}
  for (const bld of Object.values(buildings)) {
    if (bld.level === 0) continue
    const levelData = bld.levels[bld.level - 1]
    if (!levelData?.production) continue
    for (const [resId, rate] of Object.entries(levelData.production)) {
      buildingProduction[resId] = (buildingProduction[resId] ?? 0) + rate
    }
  }

  // Apply income
  for (const res of Object.values(resources)) {
    const incomeMulti = multipliers.resource_income[res.id] ?? 1
    const capMulti = multipliers.resource_cap[res.id] ?? 1
    const effectiveCap = res.cap === 0 ? Infinity : res.cap * capMulti

    const effectiveIncome = (res.income + (buildingProduction[res.id] ?? 0)) * incomeMulti
    res.effective_income = effectiveIncome  // stored for renderer
    res.amount = Math.min(res.amount + effectiveIncome * dt, effectiveCap)
  }
}

// ── Helpers used by all other systems ────────────────────────────────────────

export function canAfford(state, costArray) {
  if (!costArray?.length) return true
  for (const { resource_id, amount } of costArray) {
    const res = state.resources[resource_id]
    if (!res || res.amount < amount) return false
  }
  return true
}

export function spend(state, costArray) {
  if (!canAfford(state, costArray)) return false
  for (const { resource_id, amount } of costArray) {
    state.resources[resource_id].amount -= amount
  }
  return true
}

export function gain(state, deltaMap) {
  for (const [resId, amount] of Object.entries(deltaMap ?? {})) {
    const res = state.resources[resId]
    if (res) {
      const capMulti = state.multipliers.resource_cap[resId] ?? 1
      const effectiveCap = res.cap === 0 ? Infinity : res.cap * capMulti
      res.amount = Math.min(res.amount + amount, effectiveCap)
    }
  }
}

export function hasItem(state, itemId, qty = 1) {
  return (state.inventory[itemId] ?? 0) >= qty
}

export function spendItems(state, inputs) {
  for (const { item_id, qty } of inputs ?? []) {
    if (!hasItem(state, item_id, qty)) return false
  }
  for (const { item_id, qty } of inputs ?? []) {
    state.inventory[item_id] = (state.inventory[item_id] ?? 0) - qty
  }
  return true
}

export function giveItem(state, itemId, qty = 1) {
  const def = state.itemDefs[itemId]
  if (!def) return
  const limit = def.stack_limit ?? 99
  state.inventory[itemId] = Math.min((state.inventory[itemId] ?? 0) + qty, limit)
}

export function formatNumber(n) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return Math.floor(n).toString()
}
