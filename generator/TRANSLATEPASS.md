# GENERATOR TRANSLATE PASS — Source Analysis to World Template
# Run this AFTER Extract Pass 0 has completed.
# Maps source-analysis.json to world-template.json using hybrid faithful/inventive approach.
# Strict on factions and roles. Inventive on mechanics. Flags everything ambiguous.
#
# Input:  guild-engine/generator/source-analysis.json  (from Extract Pass 0)
# Output: guild-engine/generator/world-template.json   (same format as Pass 1 output)
#         guild-engine/generator/translation-flags.md  (designer decisions needed)

---

## Before doing anything else

Read these files in order:
1. `guild-engine/schema/project.schema.json`
2. `guild-engine/expedition-spec-v2.1.md`
3. `guild-engine/docs/WIKI.md`
4. `guild-engine/generator/CHANGELOG.md`
5. `guild-engine/generator/source-analysis.json` — the extraction to translate

---

## Translation philosophy

**Strict (preserve source intent exactly):**
- Faction names, descriptions, and relationships
- Role/class names and their narrative identity
- Geographic region names and their narrative role
- The world's tone and feel

**Inventive (find the mechanical equivalent):**
- How narrative resources map to game resources
- How power levels map to difficulty numbers
- How social standing maps to faction rep tiers
- How the progression system maps to XP/levels
- How special powers map to ability triggers and effects

**Flagged (designer decides):**
- Source mechanics with no clean equivalent
- Contradictions between source and game system
- Design decisions that significantly affect balance

The goal: when the designer plays the generated game, it should *feel* like the source material, even if the mechanics are simplified or abstracted.

---

## Step 1 — Establish the world identity

From `source-analysis.meta` and `world_structure`, write the world-template meta block:

```json
"meta": {
  "title": "[IP name] — [subtitle if appropriate]",
  "author": "",
  "theme": "[1 sentence capturing the world's essential feel from tone_markers]",
  "hero_fantasy": "[1 sentence — what it feels like to play a role in this world]",
  "resource_fantasy": "[1 sentence — what the accumulation loop feels like]"
}
```

The theme must come from `world_structure.tone_markers`.
The hero_fantasy must come from `roles` descriptions.
The resource_fantasy must come from `accumulates` descriptions.

---

## Step 2 — Translate resources

Map `source-analysis.accumulates` to game resources.

### Translation rules

**Primary resource** — the main currency/power spent on buildings and recruits.
Pick the accumulated thing that:
- Is gained most regularly
- Is spent on the most things
- Has the clearest gain/spend loop

**Secondary resources** — materials, special currencies.
Pick accumulated things that are:
- Gained from specific activities (expeditions, crafting)
- Spent on specific things (cursed items, special abilities)
- Mark as `is_material: true` if used for crafting

**Degrading resources** — if the source has anything that *decreases* over time
(Humanity in VtM, Corruption in Warhammer, Sanity in Lovecraft):
- Still model as a resource
- Set `income_rate` to a negative feel word: "degrading"
- Note in `notes` that this resource counts DOWN not up
- Flag for designer: the engine currently models resources as accumulating.
  A degrading resource needs either inversion (track as "corruption gained"
  instead of "humanity lost") or a new system. Generate option A (inversion)
  as default and flag the choice.

**Resource calibration:**
```
income_rate mapping:
  gained passively and constantly → "medium"
  gained slowly or periodically   → "slow"  
  gained only from specific acts  → "slow" with is_material: true
  gained very rarely              → "slow" with is_material: true

cap_size mapping:
  unlimited or very large pool    → "large" or "unlimited"
  moderate manageable pool        → "medium"
  small precious pool             → "small"
```

For each resource, write:
```json
{
  "key": "snake_case_name",
  "label": "Source Name",
  "icon": "appropriate emoji",
  "income_rate": "slow | medium | fast",
  "cap_size": "small | medium | large | unlimited",
  "is_material": false,
  "notes": "source context + any translation decisions made"
}
```

---

## Step 3 — Translate roles to hero classes

Map `source-analysis.roles` to hero classes.

### Translation rules

One role = one hero class. Keep source names exactly.

**Stat archetype mapping from combat_archetype + defining_traits:**
```
tank (high defense, survives punishment)    → def-heavy
damage (high attack, glass cannon)          → atk-heavy  
support (utility, luck, group benefits)     → lck-heavy
swift/assassin (speed, initiative)          → spd-heavy
balanced/leader (no clear peak)             → balanced
non-combat (social, information roles)      → lck-heavy (luck = social edge)
```

**Slot preference from role archetype:**
```
def-heavy:  [armor, weapon]
atk-heavy:  [weapon, relic]
lck-heavy:  [accessory, armor]
spd-heavy:  [weapon, accessory]
balanced:   [weapon, armor]
```

**Recruit cost calibration from social_standing:**
```
low social standing / common / expendable    → cheap
middle tier / specialist / respected         → moderate
elite / rare / high status                   → expensive
```

**Recruit cost resource:** use the primary resource.

**Powers → abilities:** For each item in `source-analysis.powers` that belongs to this role,
note it in the hero class description. Abilities are post-MVP for the generator
but should be documented in notes for the designer to add manually.

For each hero class, write:
```json
{
  "key": "snake_case_name",
  "label": "Source Name",
  "icon": "appropriate emoji matching the role's aesthetic",
  "description": "source description in 1-2 sentences, in the source's voice",
  "role": "tank | damage | support | hybrid",
  "stat_archetype": "balanced | atk-heavy | def-heavy | spd-heavy | lck-heavy",
  "slot_preference": ["slot1", "slot2"],
  "recruit_cost_resource": "primary_resource_key",
  "recruit_cost_amount": "cheap | moderate | expensive"
}
```

---

## Step 4 — Translate world structure to acts

Map `source-analysis.world_structure.geographic_regions` and `dangerous_places` to acts.

### Act grouping rules

Group dangerous places by `narrative_region`. Each distinct region = one act.
Order acts by `difficulty_feel` (trivial/easy first, lethal last).

If regions aren't clearly defined in source, group by faction control:
- Starting faction's territory = Act 1
- Rival faction's territory = Act 2
- Final confrontation zone = Act 3 (or final act)

If only 1-2 regions are defined, it's fine to have 1-2 acts. Don't invent acts.

**Act difficulty levels from region/zone difficulty_feel:**
```
trivial → easy
easy    → easy  
moderate → medium
hard    → hard
lethal  → hard (with high curse_chance and enemy stats)
```

**Zone (expedition) translation:**
For each dangerous_place in a region:
```json
{
  "key": "snake_case",
  "label": "Source Name",
  "icon": "appropriate emoji",
  "type": "standard | boss",
  "difficulty_level": 1-20,
  "duration": "short | medium | long",
  "loot_theme": "what_can_be_gained from source",
  "curse_chance": 0.0-0.4,
  "notes": "who_or_what_opposes_them from source"
}
```

**Difficulty level calibration:**
```
Act 1 zones:    levels 1-5  (easy feel)
Act 2 zones:    levels 6-12 (medium feel)
Act 3 zones:    levels 13-20 (hard feel)

Within an act:
  easy danger_type:        lower end of act range
  hard/lethal danger_type: upper end of act range
  boss:                    top of act range
```

**Boss identification:**
The climax confrontation of each act becomes a boss expedition.
If the source has a named antagonist per region, that's the boss.
If not, the hardest/most significant dangerous_place becomes the boss.

**Curse chance from danger_type and source tone:**
```
combat (mundane)        → 0.05-0.10
supernatural            → 0.15-0.25
political/social        → 0.05 (cursed in the metaphorical sense)
environmental           → 0.10-0.20
boss fights             → 0.20-0.35
```

---

## Step 5 — Translate factions

Map `source-analysis.factions` to buildings and/or faction nodes.

### Buildings from factions

Factions that control territory, resources, or services the player can access
become **buildings**. The building represents the player's foothold with that faction.

```
faction controls information/library → building that produces secondary resource
faction controls territory/trade     → building that produces primary resource
faction provides training/services   → building that trains hero class
faction is a crafting guild          → building that is_crafting_station: true
```

**Building naming:** "[Faction Name]'s [Hub/Vault/Quarter/Court/etc.]"
Choose the noun based on what the faction controls.

Factions that are pure rivals or enemies do NOT become buildings —
they become expedition enemies and act bosses.

**Max level calibration from faction power_level:**
```
minor    → max_level: 2
moderate → max_level: 3
major    → max_level: 4
dominant → max_level: 4-5
```

### Faction nodes (rep system)

Factions with complex relationships and multiple standings become faction nodes.
Rep tiers named after the source's actual standing titles if available.

---

## Step 6 — Translate objects to items

Map `source-analysis.significant_objects` to items.

### Translation rules

**Equipment items** (category: weapon/armor/accessory/relic):
```json
{
  "key": "snake_case",
  "label": "Source Name",
  "icon": "emoji",
  "subtype": "equipment",
  "slot": "weapon | armor | accessory | relic",
  "rarity": "common | uncommon | rare | epic | legendary",
  "stat_focus": "atk | def | spd | hp | lck | balanced",
  "drops_in_act": 1-3,
  "boss_only": false,
  "notes": "source context"
}
```

**Slot mapping from category:**
```
weapon   → weapon
armor    → armor
accessory/charm/talisman → accessory
relic/artifact/unique    → relic
```

**Stat focus from what_it_does:**
```
offensive, damaging, deadly → atk
protective, defensive       → def
swift, evasive, mobile      → spd
enduring, vital, healing    → hp
lucky, seeking, divining    → lck
balanced, versatile, wise   → balanced
```

**Rarity from rarity_feel in source:**
Direct mapping. If unclear, use social rarity (how rare is it in the source world?).

**drops_in_act from who_uses_it and which faction controls it:**
Act 1 faction items → drops_in_act: 1
Act 2 faction items → drops_in_act: 2
Boss/legendary items → boss_only: true

**Material items** (category: material/currency/consumable):
```json
{
  "key": "snake_case",
  "label": "Source Name",
  "icon": "emoji",
  "subtype": "material",
  "slot": null,
  "rarity": "common | uncommon | rare",
  "stat_focus": null,
  "drops_in_act": 1-3,
  "boss_only": false,
  "notes": "source context and crafting use"
}
```

---

## Step 7 — Set difficulty curve

From `source-analysis.progression` and `world_structure.narrative_arc`:

**act level ranges:**
```
acts_count == 1: act1: [1, 10]
acts_count == 2: act1: [1, 5], act2: [6, 12]
acts_count == 3: act1: [1, 5], act2: [6, 12], act3: [13, 20]
acts_count == 4: act1: [1, 4], act2: [5, 9], act3: [10, 15], act4: [16, 20]
```

**resource_costs_feel from progression.advancement_system:**
```
"you struggle and scrape for every advance"  → tight
"advancement is steady and earnable"          → balanced
"power comes quickly in this world"           → generous
```

**xp_curve_feel from progression.stages count:**
```
2-3 stages (fast mastery arc)   → fast
4-5 stages (standard RPG arc)   → normal
6+ stages (long mastery arc)    → slow
```

---

## Step 8 — Write translation flags

For every translation decision that was ambiguous, invented, or potentially wrong,
write an entry to `guild-engine/generator/translation-flags.md`:

```markdown
# Translation Flags — [IP Name]
# Review these before running Pass 2. Each flag needs a designer decision.
# Mark each as APPROVED, MODIFIED, or REJECTED before running Pass 2.

## FLAG [N]: [Short title]
**Source:** [what the source says, quoted under 15 words]
**Problem:** [why this doesn't map cleanly]
**Translation used:** [what was generated as default]
**Alternative options:**
  A. [option A description] ← DEFAULT
  B. [option B description]  
  C. [option C description]
**Designer action:** [ ] APPROVED  [ ] MODIFIED: ___________  [ ] REJECTED
```

Common flag triggers:
- Degrading resources (Humanity, Sanity, Corruption)
- Non-combat progression systems (social, political, economic)
- Powers that affect game systems not currently implemented
- Factions with mutual exclusivity (can't be allied with both)
- Named legendary items with unique rules
- Progression systems with hard caps (VtM generation, etc.)
- Any source mechanic with no schema equivalent

---

## Step 9 — Write world-template.json

Write the complete world template to `guild-engine/generator/world-template.json`.
This file is identical in format to what Pass 1 produces —
Pass 2 reads it exactly the same way regardless of whether it came from Pass 1 or this pass.

---

## Step 10 — Print summary

```
✓ Translation complete
  guild-engine/generator/world-template.json written
  guild-engine/generator/translation-flags.md written

  [IP name] → Shadowbound Guild Engine
  ─────────────────────────────────────────────────────
  Source richness:  [N]/10
  Resources:        [N] translated ([N] degrading → flagged)
  Hero classes:     [N] translated from [N] source roles
  Acts:             [N] from [N] geographic regions
  Zones:            [N] standard + [N] boss
  Buildings:        [N] from [N] factions
  Items:            [N] translated ([N] legendary → boss_only)
  
  Translation flags: [N] items need designer review
    → guild-engine/generator/translation-flags.md
  
  Faithful translations:  [N] (source name and identity preserved)
  Inventive translations: [N] (mechanics invented from source spirit)
  ─────────────────────────────────────────────────────

Before running Pass 2:
  1. Review guild-engine/generator/translation-flags.md
  2. Mark each flag APPROVED, MODIFIED, or REJECTED
  3. If MODIFIED: edit world-template.json directly
  4. Then run: GENERATORPASS2.md

If you're happy with the template as-is, you can skip flag review and run Pass 2 directly.
Flagged items will use their DEFAULT option.
```

---

## Critical rules

1. NEVER discard a source element because it "doesn't fit." Flag it instead.
2. Keep source names EXACTLY for factions, roles, and named places.
3. When inventing mechanics, stay true to the source's tone and feel.
4. A degrading resource MUST be flagged — never silently converted without noting it.
5. The world-template.json format must be identical to Pass 1 output — Pass 2 must not know the difference.
6. If richness_score < 4, print a warning: "Source is sparse. Consider adding more source files to guild-engine/generator/source/ before translating."
7. Powers/abilities are extracted and noted but not generated as nodes — they go in hero class description notes for the designer to wire manually post-generation.
