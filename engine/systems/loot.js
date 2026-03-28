import { giveItem } from './resources.js'

// Roll a loot table and credit items to the player's inventory.
// Returns array of { item_id, qty, label } for the event log.
export function rollLootTable(state, tableId) {
  const table = state.lootTables[tableId]
  if (!table) return []

  const drops = []
  const rolls = table.rolls ?? 1
  const bonusPct = state.multipliers.loot_bonus_pct ?? 0

  for (let r = 0; r < rolls; r++) {
    // Guaranteed entries always drop
    for (const entry of table.entries ?? []) {
      if (entry.guaranteed) {
        const qty = randInt(entry.min_qty ?? 1, entry.max_qty ?? 1)
        giveItem(state, entry.item_id, qty)
        drops.push({ item_id: entry.item_id, qty })
      }
    }

    // Weighted roll for non-guaranteed entries
    const pool = (table.entries ?? []).filter((e) => !e.guaranteed)
    if (!pool.length) continue

    // Apply loot bonus by inflating all weights
    const totalWeight = pool.reduce((sum, e) => sum + e.weight * (1 + bonusPct / 100), 0)
    let roll = Math.random() * totalWeight

    for (const entry of pool) {
      roll -= entry.weight * (1 + bonusPct / 100)
      if (roll <= 0) {
        const qty = randInt(entry.min_qty ?? 1, entry.max_qty ?? 1)
        giveItem(state, entry.item_id, qty)
        drops.push({ item_id: entry.item_id, qty })
        break
      }
    }
  }

  return drops
}

// Format drop list into a log string
export function formatDrops(state, drops) {
  if (!drops.length) return 'nothing dropped.'
  return drops
    .map(({ item_id, qty }) => {
      const def = state.itemDefs[item_id]
      const label = def?.label ?? item_id
      return qty > 1 ? `${label} ×${qty}` : label
    })
    .join(', ')
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
