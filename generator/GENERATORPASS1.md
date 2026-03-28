# GENERATOR PASS 1 — World Template Extraction
# Run this in Claude Code. It reads a pitch file and writes a structured world template.
# Input:  guild-engine/generator/pitch.txt  (write your game pitch here first)
# Output: guild-engine/generator/world-template.json

---

## Your task

Read `guild-engine/generator/pitch.txt`. This file contains a free-form description of a game world the designer wants to create. It might be a paragraph, a page, or bullet points. Extract the design intent and produce a structured `world-template.json` that Pass 2 will use to generate a complete playable `project.json`.

Also read `guild-engine/schema/project.schema.json` and `guild-engine/expedition-spec-v2.1.md` so you understand the full system before making decisions.

---

## Extraction rules

### What to extract

From the pitch, identify:

**World identity**
- `title` — the game's name (invent one if not given)
- `author` — leave blank
- `theme` — one sentence describing the world's tone and setting
- `hero_fantasy` — what does the player's hero roster feel like? (e.g. "a scrappy band of mercenaries", "an ancient order of mages")
- `resource_fantasy` — what is the core resource loop about? (e.g. "trading gold for guild upgrades", "harvesting arcane essence to power rituals")

**Resource loop (2–4 resources)**
- Primary resource: the main currency earned passively and spent on buildings/recruits
- Secondary resource(s): materials earned from expeditions, used for crafting or unlocking
- Each resource needs: name, icon emoji, rough income rate (slow/medium/fast), rough cap (small/medium/large), whether it's a crafting material

**Hero classes (1–3 classes)**
- Name, fantasy description, combat role (tank/damage/support/hybrid)
- Slot preference (weapon-heavy, armor-heavy, balanced)
- Rough stat archetype: which of ATK/DEF/SPD/HP/LCK is highest?

**Acts (2–3 acts for MVP)**
- Act number, name, narrative flavour (1–2 sentences)
- Number of zones (expeditions) in the act: 2–4 standard + 1 boss
- Overall difficulty curve: easy/medium/hard
- Zone flavour names (forest, ruins, dungeon, etc.)

**Buildings (3–5 buildings)**
- Name, purpose, max level (2–4)
- Does it produce resources? Which? How much?
- Is it a crafting station?
- Rough recruit connection (which hero class trains here?)

**Items (4–8 items)**
- Equipment items (2–4): name, slot, rarity, rough stat focus
- Crafting materials (2–4): name, what they're used for thematically

**Loot theme**
- What kinds of items drop in early zones vs late zones?
- Any guaranteed boss drops?

---

## What to INVENT if the pitch doesn't specify

The pitch may be vague. Use the theme and fantasy to invent sensible defaults:
- If no buildings mentioned: invent 3 that fit the theme
- If no items mentioned: invent 4 that fit the combat fantasy
- If act count not specified: use 2 acts
- If resource loop not clear: invent a gold-equivalent + one expedition material
- Always stay true to the pitch's tone

---

## Output format

Write the output to `guild-engine/generator/world-template.json`. The file must be valid JSON matching this exact structure. Do not add extra fields. Do not omit required fields.

```json
{
  "meta": {
    "title": "string",
    "author": "",
    "theme": "string — one sentence",
    "hero_fantasy": "string — one sentence",
    "resource_fantasy": "string — one sentence"
  },
  "resources": [
    {
      "key": "gold",
      "label": "Gold",
      "icon": "💰",
      "income_rate": "slow | medium | fast",
      "cap_size": "small | medium | large | unlimited",
      "is_material": false,
      "notes": "optional designer note"
    }
  ],
  "hero_classes": [
    {
      "key": "warrior",
      "label": "Warrior",
      "icon": "⚔️",
      "description": "string",
      "role": "tank | damage | support | hybrid",
      "stat_archetype": "balanced | atk-heavy | def-heavy | spd-heavy | lck-heavy",
      "slot_preference": ["weapon", "armor"],
      "recruit_cost_resource": "gold",
      "recruit_cost_amount": "cheap | moderate | expensive"
    }
  ],
  "acts": [
    {
      "number": 1,
      "label": "string",
      "narrative": "string — 1-2 sentences",
      "difficulty": "easy | medium | hard",
      "zones": [
        {
          "key": "forest_path",
          "label": "Forest Path",
          "icon": "🌲",
          "type": "standard",
          "difficulty_level": 2,
          "duration": "short | medium | long",
          "loot_theme": "string — what drops here",
          "curse_chance": 0.0,
          "notes": ""
        },
        {
          "key": "forest_king",
          "label": "Forest King",
          "icon": "👑",
          "type": "boss",
          "difficulty_level": 5,
          "duration": "long",
          "loot_theme": "unique boss drops",
          "curse_chance": 0.25,
          "notes": "guaranteed epic drop"
        }
      ]
    }
  ],
  "buildings": [
    {
      "key": "guild_hall",
      "label": "Guild Hall",
      "icon": "🏰",
      "description": "string",
      "max_level": 3,
      "produces_resource": "gold | null",
      "is_crafting_station": false,
      "trains_hero_class": "warrior | null",
      "notes": ""
    }
  ],
  "items": [
    {
      "key": "iron_sword",
      "label": "Iron Sword",
      "icon": "🗡️",
      "subtype": "equipment | material",
      "slot": "weapon | armor | accessory | relic | null",
      "rarity": "common | uncommon | rare | epic | legendary",
      "stat_focus": "atk | def | spd | hp | lck | balanced | null",
      "drops_in_act": 1,
      "boss_only": false,
      "notes": ""
    }
  ],
  "difficulty_curve": {
    "act1_level_range": [1, 5],
    "act2_level_range": [6, 12],
    "act3_level_range": [13, 20],
    "resource_costs_feel": "generous | balanced | tight",
    "xp_curve_feel": "fast | normal | slow"
  }
}
```

---

## Quality checks before writing

Before writing the file, verify:
- [ ] Every act has exactly one zone with `"type": "boss"`
- [ ] Every act has at least 2 standard zones
- [ ] Resource keys are unique (no duplicates)
- [ ] Item keys are unique
- [ ] Building keys are unique
- [ ] At least one building produces a resource
- [ ] At least one item per equipment slot represented in the roster's slot_preference
- [ ] Boss zones have higher difficulty_level than standard zones in the same act
- [ ] difficulty_level values are consistent with the act's difficulty field

---

## After writing

Print a summary:
```
✓ World template written to guild-engine/generator/world-template.json
  Title:    [title]
  Acts:     [N] acts, [N] total zones
  Heroes:   [N] classes
  Resources:[N] resources
  Buildings:[N] buildings
  Items:    [N] items
  
Ready for Pass 2.
```

Do not generate project.json. That is Pass 2's job.

---

## Generator self-maintenance

Before doing anything else, read these files in this order:
1. `guild-engine/schema/project.schema.json` — authoritative field list
2. `guild-engine/expedition-spec-v2.1.md` — resolver and stat rules
3. `guild-engine/docs/WIKI.md` — full system reference
4. `guild-engine/generator/CHANGELOG.md` — what the generator currently supports

After reading CHANGELOG.md, check every PENDING entry. If any PENDING item with SCOPE PASS1 or BOTH has since been implemented in the schema (you can verify by checking if its fields exist in project.schema.json), update its STATUS from PENDING to IMPLEMENTED and note the date.

After writing world-template.json, append this entry to CHANGELOG.md:
```
### Run log — [ISO date]
- INPUT: [first 10 words of pitch.txt]
- OUTPUT: world-template.json
- PASS1 VERSION: v[current]
- NOTES: [any decisions made, anything invented, any ambiguities in the pitch]
```
