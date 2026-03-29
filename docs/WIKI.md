# Guild Engine Wiki
### Schema version 1.2.0 — Updated Day 2

Authoritative gameplay and editor reference. Updated every time a new system is implemented.

---

## 1. Node Types Reference

Shared fields on most nodes: `id`, `type`, `label`, `description`, `canvas_pos`, `connections`, `visible`.

### Day 1 node types

| Type | Key fields | In-game role |
|---|---|---|
| `resource` | `icon`, `base_cap`, `base_income`, `is_material` | Currency or crafting material produced, spent, capped, shown in HUD. |
| `item` | `rarity`, `subtype`, `slot`, `stat_modifiers`, `stack_limit`, `item_type`, `consumable_config` | Equipment and consumables. Equipment changes hero stats. |
| `loot_table` | `rolls`, `entries[]` | Weighted drop table used by expeditions, bosses, buildings, and events. |
| `ability` | `trigger`, `effect`, `unlock_level` | Hero-class ability hook. |
| `building` | `max_level`, `levels[]`, `is_crafting_station`, `has_workflows`, `artisan_slots`, `passive_events[]` | World structure that can be built, upgraded, or used as a crafting/workflow station. |
| `upgrade` | `cost[]`, `max_tier`, `effect`, `unlock_conditions[]` | Permanent or tiered progression modifier. |
| `expedition` | `level`, `duration_s`, `party_size`, `enemy_atk`, `enemy_hp`, `base_xp`, `curse_chance`, `loot_table_id`, `resource_rewards[]`, `faction_rewards[]`, `on_success_unlock[]`, `events[]` | Standard run content node. |
| `boss_expedition` | Same as `expedition` plus `boss_hp`, `boss_stats`, `phases[]`, `repeatable` | Boss version of an expedition. |
| `act` | `act_number`, `expedition_ids[]`, `boss_expedition_id`, `completion_conditions[]`, `narrative_log` | Story container that groups expeditions and gates act-to-act progression. |
| `event` | `log_message`, `choices[]` | Narrative or world-state event with choice outcomes. |
| `faction` | `rep_tiers[]`, `starting_rep` | Reputation ladder that unlocks nodes and discounts. |
| `prestige` | `trigger_conditions[]`, `currency_id`, `currency_formula`, `resets[]`, `bonuses[]` | Rebirth / meta-progression layer. |
| `hero_class` | `base_stats`, `stat_growth`, `slots[]`, `recruit_cost[]`, `hero_type`, `combat_eligible`, `xp_source`, `specializations[]`, `building_affinity` | Hero template used when recruiting roster members. |

### Day 2 node types

| Type | Key fields | In-game role |
|---|---|---|
| `building_workflow` | `building_id`, `behavior`, `workflow_mode`, `action_type`, `base_duration_ticks`, `input_rules[]`, `output_rules[]`, `success_table`, `streak_bonus`, `momentum_config` | A specific operation a building can perform. The building is the machine; the workflow is the job type. |
| `building_upgrade` | `building_id`, `required_building_level`, `cost[]`, `unlocks_workflow_ids[]`, `artisan_slot_increase` | Unlocks new workflows and expands artisan slots when a building reaches the required level. |
| `crafting_recipe` | `workflow_id`, `inputs[]`, `output_item_id`, `output_qty`, `craft_time_s`, `unlock_conditions[]` | A specific recipe run by a workflow. One workflow can run many recipes. |
| `blueprint` | `node_ids[]`, `requires_schema_version` | A saved collection of nodes that can be exported and re-imported as a reusable system. |

---

## 2. Building Workflow System

### Workflow vs Recipe — the distinction

`building_workflow` is the **machine** — it defines how a building operates: behavior type, timing, success/failure/crit rules, artisan skill influence. It doesn't know what you're making, only how the making process works.

`crafting_recipe` is the **blueprint** — it defines a specific thing to make: exact inputs, exact output item, which workflow runs it. One workflow can run many recipes.

Example: the "Forge Weapon" workflow handles timing and skill checks for any weapon. "Forge Iron Sword" and "Forge Steel Dagger" are separate recipes pointing at the same workflow.

### Behavior types

| behavior | Description | Typical use |
|---|---|---|
| `consume_item` | Consumes items from inventory, produces output | Forge, Workshop |
| `consume_resource` | Consumes resources from pool, produces output | Apothecary, Library |
| `produce_resource` | Produces resources passively, no input | Mine, Farm |
| `recruit_hero` | Produces a hero instance in the recruit pool | Barracks, Kennel |

### Workflow modes

| workflow_mode | Description |
|---|---|
| `queued` | Player queues jobs manually. Each job runs one at a time. |
| `passive` | Runs continuously in the background without player action. |

### Output types

| output_type | Where it goes | Example |
|---|---|---|
| `resource` | Adds to resource pool | Iron ingots from smelting |
| `item` | Adds to guild inventory | Iron sword from forging |
| `consumable` | Adds to buff stockpile | Health potion from brewing |
| `world_effect` | Mutates world state directly | Unlock a zone, apply a modifier |
| `hero_instance` | Creates hero in recruit pool | Footsoldier from Barracks |

### Success table

Every workflow has a `success_table` with these fields:

```
base_failure:          0.0–1.0  probability of failure
base_crit:             0.0–1.0  probability of crit (only on non-failures)
failure_behavior:      consume_inputs_no_output | partial_refund | reset_progress_refund_inputs
crit_behavior:         double_output | quality_upgrade | rarity_upgrade | breakthrough | extend_duration
crit_multiplier:       quantity multiplier for double_output
failure_grants_xp:     true/false
failure_xp_multiplier: 0.0–1.0  fraction of normal XP on failure
xp_on_complete:        base XP granted to artisan on job completion
```

Roll order: failure check → crit check → success. Crits only fire on non-failures.

### Special mechanics

**Streak bonus (Apothecary-type):**
Running the same recipe consecutively builds a streak. At `threshold` consecutive jobs, `duration_reduction` and `crit_bonus` apply. Streak resets if a different recipe is queued.

**Momentum (Library-type):**
`momentum` accumulates with each completed job (`gain_per_job`) and decays when the queue is idle (`decay_per_idle_tick`). Hitting `thresholds[]` unlocks better output quality. Makes continuous research more effective than sporadic jobs.

### Formula variables

Formulas in `yield_formula`, `base_duration_ticks` overrides, and success table fields can reference:

| Variable | Source |
|---|---|
| `worker_skill` | Assigned artisan's primary stat value |
| `worker_level` | Assigned artisan's hero level |
| `worker_specialization_match` | 1 if artisan specialization matches action_type, else 0 |
| `building_level` | Current building level |
| `batch_size` | Current job batch count |
| `momentum` | Current momentum value (Library-type only) |
| `streak_count` | Consecutive same-recipe count (Apothecary-type only) |
| `item_rarity_tier` | 0=common, 1=uncommon, 2=rare, 3=epic, 4=legendary |
| `resource_{id}` | Current amount of any resource |

---

## 3. Artisan Hero System

### Artisan vs combat heroes

| Property | Combat hero | Artisan hero |
|---|---|---|
| `hero_type` | `combat` | `artisan` |
| `combat_eligible` | `true` | `false` |
| `xp_source` | `expedition` | `workflow` |
| Recruited via | `recruit_cost[]` (gold) | Produced by `hero_instance` workflow output |
| Can go on expeditions | Yes | No |
| Equipment slots | `slots[]` | None |

### Artisan assignment

Artisans are assigned to buildings in the Forge tab. An assigned artisan contributes `worker_skill` (their primary stat) to all workflow formula evaluations. Unassigned buildings still work but at base efficiency.

Assign: `actions.assignArtisan(buildingId, heroId)`
Unassign: `actions.unassignArtisan(buildingId)`

Assigned heroes show "Assigned — Working at [Building]" in amber in the Recruits tab and cannot be sent on expeditions.

### Artisan specializations

Each artisan class has `specializations[]` — a list of `action_type` values they are trained for. When `worker_specialization_match === 1` (artisan's specialization matches the workflow's `action_type`), formulas can apply bonuses.

Example: a Forgemaster with specialization `weaponsmith` gets `worker_specialization_match = 1` when running a workflow with `action_type: "weaponsmith"`.

### Recruit pool

Hero instances produced by `hero_instance` workflow outputs go to `state.recruitPool`, not the active roster. The player manually recruits them from the Recruits tab (free — they were already produced). This gives the player control over roster timing.

---

## 4. Consumable Buff System

### Idle model

Consumables use the **idle model** — buffs apply to the next N expeditions automatically on departure. They are not used mid-expedition.

`consumable_config` fields on item nodes:
```json
{
  "buff_type": "stat_boost | resource_boost | status_clear",
  "stat_modifiers": { "hp": 30 },
  "duration_expeditions": 1,
  "stack_max": 10
}
```

### Auto-apply

Before an expedition departs, the engine automatically applies one eligible consumable per valid buff slot from `state.buff_stockpile`. The player does not need to manually select buffs (pre-expedition preparation screen is in the roadmap for manual selection).

### Buff stockpile

Consumables produced by workflows go to `state.buff_stockpile` (item_id → qty), separate from `state.inventory` (equipment and materials).

---

## 5. Expedition Resolver

Computed with the party assembled for the run.

```
hero_base_power = (ATK × 1.0) + (DEF × 0.8) + (SPD × 0.5) + (HP × 0.3) + (LCK × 0.2)
status_multipliers = { ready: 1.00, inspired: 1.15, exhausted: 0.90, 
                       cursed: 0.80, injured: 0.60 }
effective_hero_power = hero_base_power × product(active status multipliers)

party_power    = sum(effective_hero_power)
party_avg_spd  = avg(SPD)
party_min_hp   = min(HP)   ← weakest link
party_avg_lck  = avg(LCK)
party_sum_atk  = sum(ATK)

effective_duration_s = base_duration_s × max(0.4, 1 − (party_avg_spd / 200))
```

Status multipliers are **multiplicative**. INJURED + CURSED = 0.60 × 0.80 = 0.48×.

---

## 6. Expedition Outcome Logic

Resolution happens once when the timer ends or boss HP reaches zero.

**Step 1 — Wipe check (first, always):**
`party_min_hp < enemy_atk × 0.8`
→ WIPE: all heroes injured, curse check fires, no loot, 0.5× XP.

**Step 2 — DPS check:**
`party_dps = party_sum_atk × (1 + expedition_success_bonus)`
`atk_needed = enemy_hp / effective_duration_s`
If `party_dps < atk_needed × 0.5` → FAIL.

**Step 3 — Power ratio:**
`power_ratio = party_power / (level × 10)`

| Tier | power_ratio | Loot | XP | Injury | Unlocks | Curse |
|---|---|---|---|---|---|---|
| WIPE | HP floor failed | none | 0.5× | all injured | no | yes |
| FAIL | < 0.60 | fail table | 0.5× | DEF check | no | yes |
| NARROW_SUCCESS | 0.60–0.89 | normal | 1.0× | DEF check | yes | no |
| CLEAN_SUCCESS | 0.90–1.29 | normal | 1.5× | none | yes | no |
| DOMINANT | ≥ 1.30 | normal + LCK bonus | 2.0× | none | yes | no |

DEF injury check: `injury_chance = max(0, 0.4 − (hero.DEF / 100))`
DOMINANT bonus rolls: `min(3, floor(party_avg_lck / 20))`

---

## 7. Hero Status Effects

| Status | Multiplier | Trigger | Clears |
|---|---|---|---|
| `ready` | 1.00× | Default | N/A |
| `inspired` | 1.15× all stats | Guild buff (consumable) | After next expedition resolves |
| `exhausted` | 0.90× all stats | 2 consecutive expedition starts | When hero sits out — on expedition **completion** |
| `injured` | 0.60× all stats | FAIL/NARROW DEF check, WIPE survivors | After `ceil(level / 2)` real minutes |
| `cursed` | 0.80× all stats, 0.50× LCK | FAIL/WIPE curse chance | After `level × 3` real minutes |
| `assigned` | N/A | Assigned to a building | Unassigned manually |
| `dead` | Permanent removal | WIPE death roll (25% chance) | Never |

Death only triggers on WIPE. Equipment drops to inventory on death.

---

## 8. Act System

Acts group expeditions and control progression order.

- `expedition_ids[]` — standard expeditions in this act
- `boss_expedition_id` — boss that must be defeated to complete the act
- Act completes when: all expeditions in `expedition_ids[]` completed at least once (NARROW+) AND boss defeated
- Next act's expeditions start `visible: false` and unlock via `on_success_unlock` on the boss

In-game display: expeditions grouped by act header. Boss shows as locked until all standard expeditions are done.

---

## 9. Loot System

- Standard and boss expeditions roll `loot_table_id` on NARROW+
- FAIL can use `fail_loot_table_id`
- DOMINANT adds `min(3, floor(avg_lck / 20))` bonus rolls
- `resource_rewards[]` and `faction_rewards[]` use `on` field:
  - `any` = all outcomes including fail
  - `success` = NARROW+ 
  - `dominant` = DOMINANT only

---

## 10. Upgrade Effects

| Field | Effect |
|---|---|
| `resource_cap_multiplier` | Multiplies cap per resource (stacks multiplicatively) |
| `resource_income_multiplier` | Multiplies income per resource (stacks multiplicatively) |
| `hero_stat_modifier` | Adds to hero stat pool (re-synced on purchase) |
| `expedition_success_bonus` | Flat addition to DPS check bonus (stacks additively) |
| `craft_speed_multiplier` | Multiplies workflow queue speed (stacks multiplicatively) |
| `loot_bonus_pct` | Adds to loot bonus pool |
| `unlock_node_ids` | Makes listed nodes visible |

---

## 11. Prestige System

- `trigger_conditions[]` gate availability
- `currency_formula` is a JS expression evaluated at prestige time (variables: `gold`, `act`, `hero_count`)
- `resets[]` chooses what gets wiped: resources, buildings, heroes, upgrades, expeditions, factions
- `bonuses[]` are permanent purchasable layers spending prestige currency

---

## 12. Faction Reputation

- `rep_tiers[]` ordered by threshold
- Each tier: `threshold`, `label`, `unlock_node_ids[]`, `discount_pct`
- Rep modified by events, expedition `faction_rewards[]`, and building outputs
- Used for vendor gates, story branches, upgrade locks

---

## 13. Blueprint System

Blueprints are reusable node packages — craft systems, building setups, hero class definitions — that can be dropped onto any project canvas.

### Preset blueprints

| Blueprint | Nodes | Key mechanic |
|---|---|---|
| Forge (Standard) | 14 | consume_item workflows, quality_upgrade crit, Forgemaster artisan |
| Apothecary (Standard) | 13 | consume_resource workflows, streak_bonus, Alchemist artisan |
| Library (Standard) | 11 | passive + queued workflows, momentum, breakthrough crit, Scholar artisan |

### Import behavior

- All node IDs are remapped with `import-{timestamp}-` prefix to prevent collisions
- Cross-references (building_id, workflow_id, output_item_id, etc.) are remapped in a second pass
- Missing resource/item dependencies are auto-created as placeholder nodes in a dependency column to the left of the blueprint
- Semantic ID matching: if blueprint uses `gold` and project has `resource-gold` (matched by label "Gold"), references are remapped to the existing node — no duplicate created
- Blueprints are auto-grouped on import (named after the blueprint label)

### Export

Blueprints do NOT include resource nodes. Resources are project concerns. Wire your project's resources to the blueprint's input slots using the auto-rig system.

---

## 14. Auto-Wire + Auto-Rig System

### Edge relation types

When two nodes are connected by a cable, the relation is inferred automatically from source → target node types:

| Relation | Color | Meaning |
|---|---|---|
| `produces` / `drops_from` | 🟢 Teal | Output / reward flow |
| `consumes` / `used_by` | 🟡 Amber | Input / cost flow |
| `unlocks` / `gates` | 🟣 Purple | Progression dependency |
| `modifies` | 🔵 Blue | Stat or rate modification |
| `trains` / `assigned_to` | 🩷 Pink | Hero relationship |
| `triggers` / `affects_rep` | 🟩 Green | Event / narrative |
| other | ⬛ Gray | Default fallback |

### Auto-rig

Select a stack of connected nodes and click **⚡ Rig** in the toolbar (or in the floating multi-select toolbar).

Auto-rig reads all edges between selected nodes and fills in ID cross-reference fields:

| Edge relation | Field filled |
|---|---|
| building_workflow → building (`available_at`) | `workflow.building_id` |
| building_workflow → resource (`produces`) | `workflow.output_rules[].target` |
| building_workflow → item (`produces`) | `workflow.output_rules[].target` |
| resource → building_workflow (`consumes`) | `workflow.input_rules[].item_id` |
| item → crafting_recipe (`consumes`) | `recipe.inputs[].item_id` |
| crafting_recipe → building_workflow (`used_by`) | `recipe.workflow_id` |
| crafting_recipe → item (`produces`) | `recipe.output_item_id` |
| item → loot_table (`drops_from`) | `loot_table.entries[].item_id` |
| loot_table → expedition (`drops_from`) | `expedition.loot_table_id` |
| act → expedition (`unlocks`) | `act.unlocks_node_ids[]` |
| boss → expedition (`on_success_unlock`) | `boss.on_success_unlock[]` |
| building_upgrade → building (`hosts`) | `upgrade.building_id` |
| building_upgrade → building_workflow (`unlocks`) | `upgrade.unlocks_workflow_ids[]` |
| hero_class → building (`assigned_to`) | `hero_class.building_affinity` |

Auto-rig never overwrites existing values — it only fills empty fields.

---

## 15. Canvas Group System

### Two-layer view

Toggle between layers using the **[⊞ Nodes] [▣ Groups]** buttons in the toolbar.

**Node layer** — default. All nodes visible, full detail, drag and connect.

**Group layer** — colored boxes only. Click a box to zoom back into its nodes in node view.

### Creating groups

- Select multiple nodes → click "Group" in the floating selection toolbar → type a name
- Or: right-click any node → "Create new group"
- Blueprint imports auto-create a group named after the blueprint

### Group colors (8 options)
Blue, Teal, Amber, Coral, Purple, Green, Pink, Gray — cycle through with the recolor button on each group card.

### Persistence

Groups are saved in `project.json` as editor metadata. They do not affect compilation or runtime behavior.

---

## 16. Save / Load

- Save key: `guild-engine-save`
- Format is versioned, stored in `localStorage`
- Persisted: resources, inventory, heroes, buildings (level + craft_queue + visible), upgrades, expeditions, acts, factions, multipliers, buff_stockpile, recruitPool
- Hero timers persisted: `recovery_at`, `curse_clears_at`, `consecutive_runs`
- Artisan assignments persisted and reconciled on load (orphaned assignments cleared automatically)
- Workflow queues reconciled on load (stale job IDs removed)
- Load rehydrates state and re-applies upgrade multipliers

---

## 17. Party Power Calculator

```
effective_hero_power = hero_base_power × status_multiplier_product
party_power = sum(effective_hero_power)
power_ratio = party_power / (expedition.level × 10)
```

Readiness display priority (checked in this order):

1. **Wipe risk** 💀 — `party_min_hp < enemy_atk × 0.8`
2. **Likely fail** ✕ — `power_ratio < 0.60`
3. **Risky** ⚠ — `0.60–0.89`
4. **Ready** ✓ — `0.90–1.29`
5. **Dominant** ★ — `≥ 1.30`

Always check wipe risk before power ratio — a "green" party can still wipe if one hero has low HP.

---

## 18. Hero XP Scaling

Formula: `xp_required(level) = floor(100 × level^1.6)`

XP granted per expedition: `base_xp × outcome_multiplier`
- WIPE / FAIL: 0.5×
- NARROW: 1.0×
- CLEAN: 1.5×
- DOMINANT: 2.0×

`base_xp` on expedition node: `null` = auto (`level × 15`), `0` = explicit zero, integer = override.

| Level | XP Required | Level | XP Required |
|---|---|---|---|
| 1 | 100 | 11 | 4,636 |
| 2 | 303 | 12 | 5,329 |
| 3 | 579 | 13 | 6,057 |
| 4 | 918 | 14 | 6,820 |
| 5 | 1,313 | 15 | 7,616 |
| 6 | 1,758 | 16 | 8,444 |
| 7 | 2,249 | 17 | 9,305 |
| 8 | 2,785 | 18 | 10,196 |
| 9 | 3,363 | 19 | 11,117 |
| 10 | 3,981 | 20 | 12,068 |

---

## 19. Tuning Utility

Accessed via **Tuning** button in the editor toolbar.

### Formula Lab
- Type any formula string using variables from the formula variable registry
- Drag sliders for `worker_skill`, `building_level`, `batch_size`, `item_rarity_tier`, `streak_count`, `momentum`
- Live result display
- Danger zone warnings: failure > 30% (red), failure > 15% (yellow), crit > 40% (red), duration < 10 ticks (red), batch > 20 (red)
- Copy formula to clipboard

### XP Curves
- 4 curve shapes: Linear, Polynomial, Exponential, S-Curve
- Level 1–20 table with current vs reference (`100 × level^1.6`) comparison
- Copy curve config as JSON

### Economy Sim
- 10-minute passive simulation using current canvas nodes
- Shows resource amounts at 1min / 5min / 10min
- Flags resources that cap before 5 minutes
- Flags resources with no income source

---

## Compiler Error Reference

| Error | Cause | Fix |
|---|---|---|
| Missing required field | Node missing a required field | Fill the field in inspector |
| Duplicate node ID | Two nodes share the same ID | Delete one or reimport cleanly |
| Invalid connection | Edge relation not allowed for these node types | Check edge color — redraw with correct direction |
| Dangling loot_table_id | Referenced loot table doesn't exist | Wire loot table node or use droppable field |
| Dangling expedition_ids | Act references missing expedition | Add expedition to canvas or update act |
| Cross-building prerequisite missing | building_upgrade requires a building not in graph | Add the required building |
| Circular building prerequisites | A → B → A dependency chain | Break the cycle |
| Artisan not combat_eligible | hero_class with hero_type=artisan has combat_eligible=true | Set combat_eligible to false |
| Blueprint schema version incompatible | Blueprint requires newer schema | Update editor or use migration tool |
