# Guild Engine — Expedition System Spec v2.1
# Status: FINAL PATCHED — ready for implementation
# Changes from v2.0: Red team patches applied (see changelog at bottom)

---

## 1. Expedition level (replaces base_success_chance)

### Schema change
Remove `base_success_chance`. Add:
```json
{
  "level": 3,           // integer 1–20, set by designer in inspector
  "enemy_atk": 20,      // burst damage checked against party HP floor
  "enemy_hp": 200,      // total enemy HP pool checked against party DPS
  "curse_chance": 0.0,  // 0.0–1.0, chance to curse a hero on FAILURE/WIPE
  "base_xp": null       // null = auto (level * 15). 0 = explicitly zero XP. Integer = override.
}
```

### base_xp auto-formula (when base_xp is null)
```
base_xp = level * 15
```
Designer sets `0` to explicitly give zero XP (tutorial traps, etc).
Designer sets any positive integer to override.

---

## 2. Party power score

Computed fresh every time a party is assembled.
Gear stat bonuses are already baked into hero.stats via equipItem().

```
// Per hero — base power
hero_base_power = (ATK * 1.0) + (DEF * 0.8) + (SPD * 0.5) + (HP * 0.3) + (LCK * 0.2)

// Status multipliers — MULTIPLICATIVE, applied per hero before summing
// If a hero has multiple statuses, multiply them together.
// e.g. INJURED + CURSED = 0.60 * 0.80 = 0.48 effective multiplier
status_multipliers = {
  ready:     1.00,
  inspired:  1.15,   // clears to ready after run resolves
  exhausted: 0.90,
  cursed:    0.80,   // LCK specifically also gets an additional -50%
  injured:   0.60,   // selectable but death risk active (see section 5)
  dead:      N/A     // removed from roster entirely
}

effective_hero_power = hero_base_power * product(status_multipliers for each active status)

// Party aggregates
party_power      = sum(effective_hero_power for each hero in party)
party_avg_spd    = avg(SPD for each hero in party)
party_min_hp     = min(HP for each hero in party)   // weakest link
party_avg_lck    = avg(LCK for each hero in party)
party_sum_atk    = sum(ATK for each hero in party)
```

### SPD duration modifier
```
effective_duration_s = base_duration_s * max(0.4, 1 - (party_avg_spd / 200))
```
A party averaging SPD 100 completes 50% faster. Hard cap at 40% of base duration.
Note: higher SPD also raises the DPS check threshold — this is intentional design.
SPD is a risk/reward stat, not a free efficiency boost.

---

## 3. Expedition resolver

Runs when elapsed_s >= effective_duration_s (standard) or boss_hp hits 0 (boss).
One resolution per expedition slot — no looping during offline time.

### Step 1 — Wipe check (HP floor) — checked FIRST, always
```
if (party_min_hp < enemy_atk * 0.8):
  outcome = WIPE
  → all heroes in party become INJURED
  → curse check fires (section 6)
  → no loot
  → 50% XP of base_xp
  → STOP — do not proceed to steps 2 or 3
```

### Step 2 — DPS check
```
party_dps = party_sum_atk * (1 + upgrade_expedition_bonus)
atk_needed = enemy_hp / effective_duration_s

if (party_dps < atk_needed * 0.5):
  outcome = FAIL
  → DEF injury check fires (section 5)
  → curse check fires (section 6)
  → fail loot table rolls (if set)
  → 50% XP
  → STOP
```

### Step 3 — Power ratio → outcome tier
```
expedition_threshold = level * 10
power_ratio = party_power / expedition_threshold

power_ratio < 0.60:          FAIL    (same consequences as Step 2)
power_ratio 0.60 – 0.89:     NARROW_SUCCESS
power_ratio 0.90 – 1.29:     CLEAN_SUCCESS
power_ratio >= 1.30:         DOMINANT
```

### Outcome tier effects

| Tier            | Loot              | XP multiplier | Injury risk  | Unlocks | Curse |
|-----------------|-------------------|---------------|--------------|---------|-------|
| WIPE            | none              | 0.5×          | all injured  | no      | yes   |
| FAIL            | fail table only   | 0.5×          | DEF check    | no      | yes   |
| NARROW_SUCCESS  | 1× loot rolls     | 1.0×          | DEF check    | yes     | no    |
| CLEAN_SUCCESS   | 1× loot rolls     | 1.5×          | none         | yes     | no    |
| DOMINANT        | 1× + LCK bonus    | 2.0×          | none         | yes     | no    |

### DEF injury check (FAIL and NARROW_SUCCESS only)
```
for each hero in party:
  injury_chance = max(0, 0.4 - (hero.DEF / 100))
  if random() < injury_chance:
    hero.status = add INJURED
    hero.recovery_at = now_ms + ceil(expedition.level / 2) * 60 * 1000
```

### LCK bonus rolls (DOMINANT only)
```
bonus_rolls = min(3, floor(party_avg_lck / 20))   // hard cap at 3
```
Each bonus roll is an independent additional loot table roll.

---

## 4. Hero XP and leveling

### XP gain per run
```
xp_effective_base = expedition.base_xp ?? (expedition.level * 15)
xp_gained = xp_effective_base * outcome_multiplier

outcome multipliers:
  WIPE:            0.5×
  FAIL:            0.5×
  NARROW_SUCCESS:  1.0×
  CLEAN_SUCCESS:   1.5×
  DOMINANT:        2.0×
```
All heroes in the party receive XP regardless of outcome.

### Level up formula (RPG scaling)
```
xp_required(level) = 100 * (level ^ 1.6)

Examples:
  Level 1 → 2:   100 XP
  Level 2 → 3:   241 XP
  Level 3 → 4:   433 XP
  Level 5 → 6:   951 XP
  Level 10 → 11: 3,981 XP
```
On level up: apply hero_class.stat_growth to hero.stats.
Log: "{hero.name} reached level {N}!" in event log.

### XP display in UI
- Hero card shows XP bar (current / required for next level)
- Shows exact numbers on hover or expanded view

---

## 5. Hero status system

### All statuses

**ready** — default. No modifiers.

**inspired** — +15% to all stats (1.15× multiplier).
Clears to `ready` after the next expedition resolves, any outcome.
Triggered by: items (e.g. War Horn consumable — post-MVP).

**exhausted** — -10% to all stats (0.90× multiplier).
Triggered: hero participates in 2 consecutive expeditions without sitting one out.
Clears: when hero sits out an expedition — specifically, resets `consecutive_runs = 0`
on **completion** (not start) of any expedition they were NOT part of.
This prevents trivially bypassing rest with instant 1-hero runs.

**injured** — -40% to all stats (0.60× multiplier).
Hero CAN be selected for an expedition (player's choice).
Death system activates when injured hero is sent (see Death section below).
Clears: after `ceil(expedition.level / 2)` real minutes (time-based).
Specifically: `hero.recovery_at` timestamp. When `now > recovery_at`, status clears to ready.
Post-MVP: buildings (infirmary) can reduce recovery time.

**cursed** — -20% to all stats (0.80× multiplier). LCK additionally ×0.5.
Triggered by: boss fights and expeditions with `curse_chance > 0` on FAIL/WIPE outcomes.
Clears: after `expedition.level * 3` real minutes (time-based, same system as injured).
Does NOT block expedition participation.
Stacks multiplicatively with injured: 0.60 × 0.80 = 0.48× effective.

**dead** — permanent. Hero removed from roster.
Equipment drops to inventory (all slots unequipped before removal).
Hero name logged: "{name} has fallen in {expedition}."
Cannot be recovered.

### Death system
Death only triggers on WIPE outcome (not on regular injured runs).
```
if outcome == WIPE:
  for each hero in party:
    hero.status = add INJURED   // all become injured first
    death_roll = random()
    if death_roll < 0.25:
      // hero dies
      for each slot in hero.equipment:
        giveItem(state, hero.equipment[slot], 1)
      hero.equipment = {}
      hero.status = DEAD
      remove hero from roster
      log "{hero.name} has fallen in {expedition.label}."
```

### Consecutive run tracking
```
// Stored on hero object in runtime state:
hero.consecutive_runs = 0   // persisted in save

// On expedition START:
for hero in party:
  hero.consecutive_runs += 1

// On expedition COMPLETION:
for hero NOT in party:
  hero.consecutive_runs = 0   // reset those who sat out
  if hero.status == 'exhausted':
    hero.status = 'ready'     // clear exhaustion

// After consecutive_runs increment, check exhaustion:
for hero in party:
  if hero.consecutive_runs >= 2 and hero.status == 'ready':
    hero.status = 'exhausted'
```

---

## 6. Curse system

### On expedition / boss_expedition schema
```json
{ "curse_chance": 0.30 }   // 0.0–1.0, fires on FAIL or WIPE only
```

### Resolver
```
if outcome in [FAIL, WIPE] and expedition.curse_chance > 0:
  for each hero in party (who survived — i.e. not just killed):
    if random() < expedition.curse_chance:
      hero.status = add CURSED
      hero.curse_clears_at = now_ms + (expedition.level * 3 * 60 * 1000)
      log "{hero.name} has been cursed."
```

---

## 7. Act system — structure and display

### Act as expedition container

Act node owns the relationship. Expedition nodes do NOT reference acts.

```json
{
  "act_number": 1,
  "label": "The Darkwood",
  "expedition_ids": ["expedition-forest-path-id", "expedition-goblin-camp-id"],
  "boss_expedition_id": "boss_expedition-forest-king-id",
  "narrative_log": "The guild's first contract takes them into the Darkwood...",
  "completion_conditions": []   // optional extra conditions beyond auto-completion
}
```

### Act completion rules
An act completes when:
1. Every expedition in `expedition_ids` has been completed **at least once** at NARROW_SUCCESS or better
2. AND the `boss_expedition_id` expedition has been completed at any success tier

`completion_conditions` array is evaluated as ADDITIONAL requirements on top of the above.
Leave empty for default behavior.

### Boss expedition unlock
Boss expedition becomes selectable only after ALL expeditions in `expedition_ids` are completed at least once.
Until then, boss shows as locked in the expedition list.

### Next act unlock
Next act's expeditions are hidden until the current act's boss is defeated.
Specifically: act N+1 nodes have `visible = false` until act N sets `completed = true`.

### In-game expedition screen layout
```
ACT 1 — The Darkwood
  ├─ 🗺️ Forest Path          Lv.2  ✓ completed
  ├─ 🗺️ Goblin Camp          Lv.3  available
  └─ 💀 Forest King (BOSS)   Lv.5  🔒 complete all above first

ACT 2 — The Ruins                   🔒 defeat Act 1 boss first
```

---

## 8. on_success_unlock — zone progression

Add to expedition and boss_expedition schema:
```json
{
  "on_success_unlock": ["expedition-id-2", "building-id-3"]
}
```
Fires on NARROW_SUCCESS, CLEAN_SUCCESS, or DOMINANT.
Nodes in this list immediately become `visible = true` in game state.
Primary mechanism for opening new content outside the act system.

---

## 9. Resource and faction rewards

Add to expedition schema:
```json
{
  "resource_rewards": [
    { "resource_id": "gold-id", "amount": 100, "on": "success" },
    { "resource_id": "essence-id", "amount": 25, "on": "dominant" }
  ],
  "faction_rewards": [
    { "faction_id": "merchant-guild-id", "rep": 50, "on": "success" }
  ]
}
```
`"on"` valid values: `"any"` (all outcomes including fail), `"success"` (NARROW+), `"dominant"`.

---

## 10. Party readiness indicator (UI)

Evaluated in this exact priority order:

```
1. WIPE RISK (black + skull icon):
   party_min_hp < enemy_atk * 0.8
   → Show regardless of power_ratio

2. FAIL LIKELY (red + X icon):
   power_ratio < 0.60

3. NARROW (yellow + ! icon):
   power_ratio 0.60 – 0.89

4. CLEAN (green + check icon):
   power_ratio 0.90 – 1.29

5. DOMINANT (gold + star icon):
   power_ratio >= 1.30
```

Always use icon + color + text label — never color alone (accessibility).

| State   | Color  | Icon | Label        |
|---------|--------|------|--------------|
| Wipe    | #444   | 💀   | Wipe risk    |
| Fail    | #E24B4A| ✕    | Likely fail  |
| Narrow  | #BA7517| ⚠    | Risky        |
| Clean   | #1D9E75| ✓    | Ready        |
| Dominant| #EF9F27| ★    | Dominant     |

### Per-hero status badges in party selector
```
✅ ready
⚡ inspired  (+15%)
😴 exhausted (-10%)
🩸 injured   (-40%, death risk on wipe)
💀 cursed    (-20%, LCK -50%)
```

---

## 11. Editor changes summary

### ExpeditionInspector.jsx — replace/add fields
- REMOVE: Base success chance
- ADD: Level (integer 1–20, number input)
- ADD: Enemy ATK (number)
- ADD: Enemy HP (number)
- ADD: Base XP override (number or null — null = auto from level * 15)
- ADD: Curse chance (0.0–1.0)
- ADD: Resource rewards list (searchable resource dropdown, amount, "on" selector)
- ADD: Faction rewards list (searchable faction dropdown, rep amount, "on" selector)
- ADD: On success unlock (multi-node searchable dropdown, any node type)
- REMOVE: leads_to_boss_id (owned by Act, not Expedition)

### ActInspector.jsx — replace/add fields
- ADD: Expedition IDs (multi-select searchable dropdown, expedition nodes only)
- ADD: Boss expedition ID (searchable dropdown, boss_expedition nodes only)
- KEEP: Completion conditions (additional conditions on top of auto-completion)
- KEEP: Narrative log

### FormPrimitives.jsx — new components
- ADD: SearchableDropdown — single select with type-ahead filtering
  Props: label, value, onChange, options [{id, label, type}], placeholder
- ADD: MultiDropdown — multi-select searchable
  Props: label, values[], onChange, options [{id, label, type}]
- UPDATE: All existing ID reference fields across all inspectors → use SearchableDropdown
  populated from Zustand store nodes filtered by correct type
- KEEP: Manual text input as fallback within the dropdown (editable)
- KEEP: Drag-to-fill (dropping a node onto a dropdown fills it)

### All ID reference fields by inspector
| Inspector | Field | Filter to type |
|-----------|-------|----------------|
| ExpeditionInspector | loot_table_id | loot_table |
| ExpeditionInspector | fail_loot_table_id | loot_table |
| ExpeditionInspector | resource_rewards[].resource_id | resource |
| ExpeditionInspector | faction_rewards[].faction_id | faction |
| ExpeditionInspector | on_success_unlock[] | all types |
| ActInspector | expedition_ids[] | expedition |
| ActInspector | boss_expedition_id | boss_expedition |
| LootTableInspector | entries[].item_id | item |
| RecipeInspector | inputs[].item_id | item |
| RecipeInspector | output_item_id | item |
| BuildingInspector | loot_table_id | loot_table |
| PrestigeInspector | currency_id | resource |

---

## 12. Schema.json changes summary

### expedition node
```
REMOVE: base_success_chance
ADD:    level            (integer, required, 1–20)
ADD:    enemy_atk        (number, default 10)
ADD:    enemy_hp         (number, default 100)
ADD:    base_xp          (number or null, null = auto)
ADD:    curse_chance     (number 0–1, default 0)
ADD:    resource_rewards (array)
ADD:    faction_rewards  (array)
ADD:    on_success_unlock (array of node ids)
REMOVE: leads_to_boss_id (now on act node only)
```

### act node
```
ADD: expedition_ids      (array of expedition node ids)
ADD: boss_expedition_id  (string, boss_expedition node id)
```

### hero runtime state (not schema — in bootstrap.js)
```
ADD: consecutive_runs    (integer, default 0, persisted in save)
ADD: recovery_at         (timestamp ms or null — covers both injury and curse)
ADD: curse_clears_at     (timestamp ms or null)
```

### compiler/rules.js warning updates
```
REMOVE: warning for missing base_success_chance
ADD:    error if expedition.level is missing or not 1–20
ADD:    warning if expedition.enemy_atk or enemy_hp is 0 (unset)
ADD:    warning if act has no expedition_ids
ADD:    warning if act has no boss_expedition_id
```

---

## 13. Post-MVP (do not implement now)

- Buildings that heal (infirmary), inspire (war room), rest (barracks) heroes
- Consumable items used before expeditions (War Horn → inspired status)
- Cursed status cleanse items
- Multi-stage expeditions (dungeon floors)
- Hero retirement / veteran system
- Drag-to-slot party selection screen
- Permadeath mode toggle
- Mercenary system for roster gaps
- Repeat expedition auto-send toggle

---

## 14. Build order for implementation

1. `schema/project.schema.json` — all changes from section 12
2. `editor/src/compiler/rules.js` — updated warnings/errors
3. `editor/src/inspector/FormPrimitives.jsx` — SearchableDropdown, MultiDropdown
4. `editor/src/inspector/ExpeditionInspector.jsx` — new fields, remove leads_to_boss_id
5. `editor/src/inspector/ActInspector.jsx` — expedition_ids, boss_expedition_id
6. All other inspectors — swap ID text fields for SearchableDropdown
7. `engine/systems/expeditions.js` — full resolver rewrite per spec
8. `engine/systems/buildings.js` — XP/level up, exhaustion, death system
9. `engine/index.html` — act-grouped display, readiness bar, status badges
10. `docs/WIKI.md` — full wiki covering all systems

---

## 15. WIKI.md sections

File lives at `guild-engine/docs/WIKI.md`.
Linked from editor toolbar as "📖 Docs" button — opens in browser tab.
Updated by Claude Code every time a feature is added or changed.

Sections:
1. Node types reference (all 14, all fields, what each does in-game)
2. Expedition resolver (exact formulas from this spec)
3. Hero status effects (all 6 statuses, triggers, durations, multipliers)
4. Act structure (grouping, completion rules, boss unlock)
5. Loot system (rolls, weights, guaranteed, LCK bonus, caps)
6. Crafting system (recipes, queues, craft speed multiplier)
7. Upgrade effects (all effect types, multiplier stacking rules)
8. Prestige system (formula, reset list, bonuses, currency)
9. Faction reputation (tiers, unlock gates, discount)
10. Save/load (what persists, localStorage key, offline behavior)
11. Party power calculator (full formula reference)
12. Hero XP scaling table (levels 1–20 with XP required)

---

## Changelog from v2.0

- PATCH 1.1: Readiness indicator now checks HP floor (wipe) first, overrides power_ratio
- PATCH 1.2: Exhaustion resets on expedition COMPLETION, not start
- PATCH 1.3: base_xp uses null for auto-calculate, 0 for explicit zero
- PATCH 2.1: Act completion requires each expedition at least once (NARROW+), not 100% strict
- PATCH 2.2: Death triggers on WIPE outcome only, not on any injured expedition
- PATCH 3.2: Curse recovery is time-based (level * 3 minutes), matches injury system
- PATCH 3.3: LCK bonus rolls hard-capped at 3
- PATCH 4.2: Status multipliers explicitly defined as MULTIPLICATIVE
- PATCH 4.3: All ID dropdowns are searchable with type-ahead filtering
- PATCH 5.1: Readiness uses icon + color + text label (not color alone)
- PATCH 5.2: leads_to_boss_id removed from expedition, lives only on act node
