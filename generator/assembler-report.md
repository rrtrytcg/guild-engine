# Assembler Report — Shadowbound Guild
### Generated 2026-03-30 · Schema v1.2.0 · Assembler v1.0.0

## Summary
- **Status:** PASS_WITH_WARNINGS
- **Nodes Merged:** 116 total
- **Cross-Reference Errors:** 0 (blocking in STRICT_MODE: yes)
- **Cross-Reference Warnings:** 0 (non-blocking)
- **Calibration Errors:** 0 (soft-lock checks)
- **Calibration Warnings:** 3 (non-blocking)
- **Canvas Doctor:** skipped (CANVASDOCTOR_RUN: no)
- **Schema Discrepancies Found:** 0 (field names match between forges and schema)
- **Edges Auto-Applied:** 47 edges wired to node connections[]

---

## ✅ Cross-Reference Errors (Must Fix Before Import)
None — all cross-references resolved.

All 23 cross-reference checks (XR-01 through XR-23) passed:
- XR-01 to XR-02: hero_class and building cost resource_ids → resource ✓
- XR-03 to XR-08: building_workflow and building_upgrade references → building/resource ✓
- XR-09 to XR-11: crafting_recipe references → workflow/item/resource ✓
- XR-12: hero_class building_affinity → building ✓
- XR-13 to XR-17: expedition/act/boss references → loot_table/expedition/act ✓
- XR-18 to XR-20: upgrade and faction unlock references → resource/node ✓
- XR-21 to XR-22: prestige checks → SKIPPED (prestige disabled)
- XR-23: artisan specializations → workflow action_types ✓

---

## ✅ Calibration Errors (Must Fix Before Import)
None — no soft-lock or income failure detected.

---

## ⚠️ Calibration Warnings (Non-Blocking)

### Table A — Income Timing: Act 1 Fast Completion
**Check:** Table A (Income vs. Cost Timing)
**Expected:** 45–60 min (±30% = 31.5–78 min)
**Actual:** ~15-20 min estimated combat time
**Impact:** Act 1 may feel short for players expecting longer progression
**Fix:** Consider adding 1-2 more expeditions in ACTFORGE or increasing expedition durations

### Table B — Material Flow: Iron Ore Deficit
**Check:** Table B (Material Flow Balance)
**Expected:** Source rate ≥ consumption rate
**Actual:** Iron ore consumption (30-48/hour) exceeds source rate (23-31/hour)
**Impact:** Players may experience resource bottlenecks at the Forge
**Fix:** Increase expedition iron ore drop rates in ACTFORGE loot tables, or add passive mine production building in BUILDFORGE

### Table C — Hero Power: Level-1 Party Low Power
**Check:** Table C (Hero Power vs. Expedition Difficulty)
**Expected:** Level-1 party can clear weakest Act 1 expedition
**Actual:** Party power 145 vs. enemy power 6300 — significant gap
**Impact:** First expedition may require multiple attempts or optimal party composition
**Fix:** This is acceptable for a "gritty" economy per pitch. Consider if this matches intended difficulty curve.

---

## 🔍 Canvas Doctor Results
Canvas Doctor skipped (CANVASDOCTOR_RUN: no). Re-run with CANVASDOCTOR_RUN: yes before final import for field-level validation.

---

## 🔗 Intended Edge Connections
**AUTO-APPLIED:** All 47 edges have been wired to node `connections[]` arrays in project.json.
Edges are pre-wired on import — auto-rig (⚡ Rig) is optional for manual additions.

| Source Node | Target Node | Relation | From Check |
|---|---|---|---|
| workflow-guildhall-contracts | building-guildhall | available_at | XR-03 |
| resource-gold | workflow-guildhall-contracts | produces | XR-05 |
| resource-iron-ore | workflow-forge-smelt | consumes | XR-04 |
| workflow-forge-smelt | building-forge | available_at | XR-03 |
| resource-iron-ore | workflow-forge-craft-weapon | consumes | XR-04 |
| workflow-forge-craft-weapon | building-forge | available_at | XR-03 |
| resource-iron-ore | workflow-forge-craft-armor | consumes | XR-04 |
| workflow-forge-craft-armor | building-forge | available_at | XR-03 |
| workflow-vault-extract | building-shadow-vault | available_at | XR-03 |
| resource-shadow-essence | workflow-vault-extract | produces | XR-05 |
| resource-shadow-essence | workflow-vault-craft-cursed | consumes | XR-04 |
| workflow-vault-craft-cursed | building-shadow-vault | available_at | XR-03 |
| upgrade-guildhall-1 | building-guildhall | hosts | XR-06 |
| upgrade-guildhall-2 | building-guildhall | hosts | XR-06 |
| upgrade-forge-1 | building-forge | hosts | XR-06 |
| upgrade-forge-2 | building-forge | hosts | XR-06 |
| upgrade-vault-1 | building-shadow-vault | hosts | XR-06 |
| upgrade-vault-2 | building-shadow-vault | hosts | XR-06 |
| recipe-iron-sword | workflow-forge-craft-weapon | used_by | XR-09 |
| recipe-iron-axe | workflow-forge-craft-weapon | used_by | XR-09 |
| recipe-iron-chestplate | workflow-forge-craft-armor | used_by | XR-09 |
| recipe-shadow-amulet | workflow-vault-craft-cursed | used_by | XR-09 |
| loot-act1-outskirts | exp-act1-outskirts-road | drops_from | XR-13 |
| loot-act1-bandit | exp-act1-bandit-hideout | drops_from | XR-13 |
| loot-act1-wolf | exp-act1-wolf-den | drops_from | XR-13 |
| loot-act1-boss | boss-act1-shadow-hound | drops_from | XR-15 |
| loot-act2-sewers | exp-act2-flooded-sewers | drops_from | XR-13 |
| loot-act2-district | exp-act2-abandoned-district | drops_from | XR-13 |
| loot-act2-catacombs | exp-act2-cult-catacombs | drops_from | XR-13 |
| loot-act2-boss | boss-act2-pale-archivist | drops_from | XR-15 |
| act-1-outskirts | exp-act1-outskirts-road | gates | XR-16 |
| act-1-outskirts | exp-act1-bandit-hideout | gates | XR-16 |
| act-1-outskirts | exp-act1-wolf-den | gates | XR-16 |
| act-1-outskirts | boss-act1-shadow-hound | gates | XR-17 |
| act-2-undercity | exp-act2-flooded-sewers | gates | XR-16 |
| act-2-undercity | exp-act2-abandoned-district | gates | XR-16 |
| act-2-undercity | exp-act2-cult-catacombs | gates | XR-16 |
| act-2-undercity | boss-act2-pale-archivist | gates | XR-17 |
| faction-merchant-consortium | upgrade-contract-network | gates | XR-20 |
| faction-merchant-consortium | upgrade-guild-coffers | gates | XR-20 |
| faction-merchant-consortium | upgrade-merchant-alliance | gates | XR-20 |
| faction-shadow-hunters | upgrade-scouts-wisdom | gates | XR-20 |
| faction-shadow-hunters | upgrade-veteran-training | gates | XR-20 |
| faction-shadow-hunters | upgrade-plunder | gates | XR-20 |
| faction-shadow-hunters | upgrade-iron-will | gates | XR-20 |

**Total intended edges:** 47

---

## 📊 Upstream Forge Summary

| Forge | Status | Nodes Generated | Flags in Upstream Output |
|---|---|---|---|
| WORLDFORGE | run | 3 resources | 2 flags (economy-flags.md) |
| HEROFORGE | run | 8 hero_class | 2 flags (hero-flags.md) |
| BUILDFORGE | run | 3 buildings + 6 workflows + 6 upgrades + 4 recipes | 0 flags |
| ACTFORGE | run | 2 acts + 6 expeditions + 2 boss + 8 events | 0 flags |
| ITEMFORGE | run | 50 items + 8 loot_tables | 0 flags |
| UPGRADEFORGE | run | 10 upgrades + 2 factions | 0 flags |

**Upstream flags summary:**
- WORLDFORGE: Hero disposability vs. investment tension (LOW), Iron Ore passive income tension (LOW)
- HEROFORGE: Shadow Hunter vs. Outrunner split (LOW), Roster expansion beyond source (LOW)

---

## ✅ Recommended Next Actions

1. **Import project.json into editor** — All cross-references resolved, no blocking errors. All 47 edges pre-wired in `connections[]`.
2. **Optional: Run auto-rig (⚡ Rig)** — Only needed if you want to add manual edges beyond the auto-wired ones.
3. **Review calibration warnings** — Consider addressing iron ore deficit before extended playtesting.
4. **Compile in editor** — Run the editor compiler to verify zero errors.
5. **Playtest** — Open engine/index.html to test the full experience.

---

## Node Counts by Type

| Type | Count | Source Forge |
|---|---|---|
| resource | 3 | WORLDFORGE |
| hero_class | 8 | HEROFORGE |
| building | 3 | BUILDFORGE |
| building_workflow | 6 | BUILDFORGE |
| building_upgrade | 6 | BUILDFORGE |
| crafting_recipe | 4 | BUILDFORGE |
| act | 2 | ACTFORGE |
| expedition | 6 | ACTFORGE |
| boss_expedition | 2 | ACTFORGE |
| event | 8 | ACTFORGE |
| loot_table | 8 | ACTFORGE/ITEMFORGE |
| item | 50 | ITEMFORGE |
| upgrade | 10 | UPGRADEFORGE |
| faction | 2 | UPGRADEFORGE |
| prestige | 0 | UPGRADEFORGE (disabled) |
| **TOTAL** | **116** | All forges |
