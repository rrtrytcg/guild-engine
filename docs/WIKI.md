# Guild Engine Wiki

Authoritative gameplay reference for the expedition system and its supporting editor/runtime pieces.

## 1. Node Types Reference

Shared fields on most nodes: `id`, `type`, `label`, `description`, `canvas_pos`, `connections`.

| Type | Key fields | In-game role |
| --- | --- | --- |
| `resource` | `icon`, `base_cap`, `base_income`, `is_material` | Currency or crafting material that can be produced, spent, capped, and shown in the HUD. |
| `item` | `rarity`, `subtype`, `slot`, `stat_modifiers`, `stack_limit` | Equipment and consumables. Equipment changes hero stats; items can be crafted, looted, or dropped. |
| `loot_table` | `rolls`, `entries[]` | Weighted drop table used by expeditions, bosses, buildings, and events. |
| `recipe` | `inputs[]`, `output_item_id`, `output_qty`, `craft_time_s`, `unlock_conditions[]` | Crafting recipe consumed by crafting buildings. |
| `ability` | `trigger`, `effect`, `unlock_level` | Hero-class ability hook. |
| `building` | `max_level`, `levels[]`, `is_crafting_station`, `loot_table_id`, `unlock_conditions[]` | World structure that can be built, upgraded, or used as a crafting station. |
| `upgrade` | `cost[]`, `max_tier`, `effect`, `unlock_conditions[]` | Permanent or tiered progression modifier. |
| `expedition` | `level`, `duration_s`, `party_size`, `enemy_atk`, `enemy_hp`, `base_xp`, `curse_chance`, `loot_table_id`, `fail_loot_table_id`, `entry_cost[]`, `resource_rewards[]`, `faction_rewards[]`, `on_success_unlock[]`, `events[]` | Standard run content node. |
| `boss_expedition` | Same as `expedition` plus `boss_hp`, `boss_stats`, `phases[]`, `repeatable` | Boss version of an expedition. Used by acts. |
| `act` | `act_number`, `expedition_ids[]`, `boss_expedition_id`, `completion_conditions[]`, `on_complete_events[]`, `unlocks_node_ids[]`, `narrative_log` | Story container that gates expedition visibility and boss unlock order. |
| `event` | `log_message`, `choices[]` | Narrative or world-state event with choice outcomes. |
| `faction` | `rep_tiers[]`, `starting_rep` | Reputation ladder that unlocks nodes and discounts. |
| `prestige` | `trigger_conditions[]`, `currency_id`, `currency_formula`, `resets[]`, `bonuses[]` | Rebirth / meta-progression layer. |
| `hero_class` | `base_stats`, `stat_growth`, `slots[]`, `recruit_cost[]`, `unlock_conditions[]` | Hero template used when recruiting roster members. |

## 2. Expedition Resolver

Computed with the party that is assembled for the run.

```text
hero_base_power = (ATK x 1.0) + (DEF x 0.8) + (SPD x 0.5) + (HP x 0.3) + (LCK x 0.2)
status_multipliers = ready: 1.00, inspired: 1.15, exhausted: 0.90, cursed: 0.80, injured: 0.60
effective_hero_power = hero_base_power x product(active status multipliers)

party_power   = sum(effective_hero_power)
party_avg_spd = avg(SPD)
party_min_hp  = min(HP)
party_avg_lck = avg(LCK)
party_sum_atk = sum(ATK)

effective_duration_s = base_duration_s x max(0.4, 1 - (party_avg_spd / 200))
```

Important: status multipliers are multiplicative, not additive. Multiple statuses multiply together.

## 3. Expedition Outcome Logic

Resolution happens once, when the timer ends or the boss HP bar reaches zero.

1. Wipe check first:
   `party_min_hp < enemy_atk x 0.8`
   - Outcome: `WIPE`
   - All heroes in the party become injured first.
   - Curse check runs.
   - No loot.
   - XP multiplier: `0.5x`
2. DPS check second:
   `party_dps = party_sum_atk x (1 + expedition_success_bonus)`
   `atk_needed = enemy_hp / effective_duration_s`
   - If `party_dps < atk_needed x 0.5`, outcome is `FAIL`
   - Injury check runs.
   - Curse check runs.
   - Fail loot table can roll.
   - XP multiplier: `0.5x`
3. Power ratio tier third:
   `power_ratio = party_power / (level x 10)`
   - `< 0.60` -> `FAIL`
   - `0.60 - 0.89` -> `NARROW_SUCCESS`
   - `0.90 - 1.29` -> `CLEAN_SUCCESS`
   - `>= 1.30` -> `DOMINANT`

Outcome effects summary:

| Tier | Loot | XP | Injury | Unlocks | Curse |
| --- | --- | --- | --- | --- | --- |
| `WIPE` | none | `0.5x` | all injured | no | yes |
| `FAIL` | fail table only | `0.5x` | defense check | no | yes |
| `NARROW_SUCCESS` | normal loot | `1.0x` | defense check | yes | no |
| `CLEAN_SUCCESS` | normal loot | `1.5x` | none | yes | no |
| `DOMINANT` | normal loot + bonus rolls | `2.0x` | none | yes | no |

Defense injury check:
`injury_chance = max(0, 0.4 - (hero.DEF / 100))`

DOMINANT bonus rolls:
`bonus_rolls = min(3, floor(party_avg_lck / 20))`

## 4. Hero Status Effects

| Status | Effect | Trigger | Clear |
| --- | --- | --- | --- |
| `ready` | No modifier | Default state | N/A |
| `inspired` | `1.15x` to all stats | Temporary guild buff | Cleared after the next expedition resolves |
| `exhausted` | `0.90x` to all stats | Two consecutive expedition starts without sitting out | Cleared when the hero sits out on expedition completion |
| `injured` | `0.60x` to all stats | FAIL/NARROW injury check, or WIPE survivors | Clears after `ceil(level / 2)` real minutes |
| `cursed` | `0.80x` to all stats and `0.50x` LCK | FAIL/WIPE curse chance | Clears after `level x 3` real minutes |
| `dead` | Permanent removal from roster | WIPE death roll only | Never clears |

Death only triggers on `WIPE`. Regular injured runs do not cause death.

## 5. Loot System

- Standard expeditions and bosses roll `loot_table_id` on `NARROW_SUCCESS`, `CLEAN_SUCCESS`, and `DOMINANT`.
- `FAIL` can use `fail_loot_table_id` if the designer provides one.
- `DOMINANT` adds bonus loot table rolls using the LCK cap above.
- `resource_rewards[]` and `faction_rewards[]` use the `on` field:
  - `any` = all outcomes, including fail and wipe
  - `success` = `NARROW_SUCCESS` and above
  - `dominant` = `DOMINANT` only

## 6. Crafting System

- Crafting only works on buildings marked `is_crafting_station = true`.
- The current building level determines the available `recipe_slots`.
- Each job stores `progress_s` and `total_s`.
- `state.multipliers.craft_speed` multiplies queue progress.
- Recipes consume `inputs[]` and produce `output_item_id` when finished.

## 7. Upgrade Effects

Upgrade effects use these fields:

- `resource_cap_multiplier`
- `resource_income_multiplier`
- `hero_stat_modifier`
- `expedition_success_bonus`
- `craft_speed_multiplier`
- `loot_bonus_pct`
- `unlock_node_ids`

Stacking rules:

- Resource cap and income multipliers multiply together per resource.
- Hero stat modifiers add into the hero stat pool, then hero stats are re-synced.
- Expedition success bonus adds a flat bonus to expedition DPS checks.
- Craft speed multipliers multiply queue speed.
- Loot bonus percent adds into the loot bonus pool.

## 8. Prestige System

- `trigger_conditions[]` gate prestige availability.
- `currency_id` identifies the prestige currency resource.
- `currency_formula` is a JS expression evaluated at prestige time.
- Available variables include `gold`, `act`, and `hero_count`.
- `resets[]` chooses what gets wiped on prestige.
- `bonuses[]` are permanent purchasable layers that spend prestige currency.

## 9. Faction Reputation

- `rep_tiers[]` is an ordered list of thresholds.
- Each tier can unlock nodes and apply `discount_pct`.
- `starting_rep` sets the initial reputation value.
- Faction rep is used for vendors, story gates, and upgrade gates.

## 10. Save / Load

- Save key: `guild-engine-save`
- Save format is versioned and stored in `localStorage`.
- Persisted data includes resources, inventory, heroes, buildings, upgrades, expeditions, acts, factions, and multipliers.
- Expedition completion state persists through `visible`, `completed`, and `best_tier`.
- Hero timers persist through `recovery_at`, `curse_clears_at`, and `consecutive_runs`.
- Load rehydrates the state and re-applies upgrade multipliers.

## 11. Party Power Calculator

Use this when balancing expedition difficulty or checking the UI readiness preview.

```text
effective_hero_power = hero_base_power x status_multiplier_product
party_power = sum(effective_hero_power)
party_avg_spd = avg(effective SPD)
party_avg_lck = avg(effective LCK)
party_min_hp = min(effective HP)
power_ratio = party_power / (level x 10)
```

Readiness priority:

1. Wipe risk first: `party_min_hp < enemy_atk x 0.8`
2. Fail likely: `power_ratio < 0.60`
3. Risky: `0.60 - 0.89`
4. Ready: `0.90 - 1.29`
5. Dominant: `>= 1.30`

## 12. Hero XP Scaling Table

Formula:
`xp_required(level) = floor(100 x level^1.6)`

| Level | XP Required |
| --- | ---: |
| 1 | 100 |
| 2 | 303 |
| 3 | 579 |
| 4 | 918 |
| 5 | 1,313 |
| 6 | 1,758 |
| 7 | 2,249 |
| 8 | 2,785 |
| 9 | 3,363 |
| 10 | 3,981 |
| 11 | 4,636 |
| 12 | 5,329 |
| 13 | 6,057 |
| 14 | 6,820 |
| 15 | 7,616 |
| 16 | 8,444 |
| 17 | 9,305 |
| 18 | 10,196 |
| 19 | 11,117 |
| 20 | 12,068 |

