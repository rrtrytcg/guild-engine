# Generator How-To

Quick reference for running the generator passes.

---

## Standard Workflow

### Pass 1 — World Template Extraction
```
"Follow guild-engine/generator/GENERATORPASS1.md exactly."
```
**Input:** `guild-engine/generator/pitch.txt` (write your game pitch here)  
**Output:** `guild-engine/generator/world-template.json`

---

### Pass 2 — Full Project Generation
```
"Follow guild-engine/generator/GENERATORPASS2.md exactly."
```
**Input:** `guild-engine/generator/world-template.json`  
**Output:** `guild-engine/generator/generated-project.json`

---

### Pass 3 — World Expansion (Optional, Repeatable)
```
"Follow guild-engine/generator/GENERATORPASS3.md exactly."
```
**Input:** `guild-engine/generator/expansion-prompt.txt` (what to add)  
**Output:** `guild-engine/generator/generated-project.json` (patched in place)

---

## TIER 1: Implemented Features

### Parameter Injection System ✅

**Status:** IMPLEMENTED (2026-03-29)

When dropping a blueprint with `parameters` in its metadata, the editor shows a modal prompting for resource/item mappings before creating nodes.

**Files:**
- `editor/src/components/ParameterMappingModal.jsx` — Modal UI
- `editor/src/store/useStore.js` — `importBlueprint()` + injection helpers
- `editor/src/blueprints/basic/*.json` — Updated basic blueprints

**Usage:**
```json
{
  "blueprint_meta": {
    "parameters": [
      {
        "key": "input_resource",
        "label": "Input Resource",
        "type": "resource",
        "required": true,
        "description": "The raw material to process"
      }
    ]
  }
}
```

**Docs:** See `PARAMETER-INJECTION-HOWTO.md` for full details.

---

## Future Tiers (Backlog)

### TIER 2: Validation & Safety
- Schema validation on import
- Circular dependency detection
- Cost/production balance checker

### TIER 3: Advanced Generation
- Multi-building system blueprints
- Act-wide event chains
- Faction reputation systems

---
