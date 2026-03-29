# Generator How-To: Parameter Injection System

**Status:** IMPLEMENTED (2026-03-29)  
**Tier:** TIER 1 - Immediate Wins (Low Risk, High Value)

---

## Overview

The Parameter Injection System automates the wiring of resources and items when importing blueprints. Instead of manually connecting nodes after dropping a blueprint, users are prompted to map required resources/items before import, with automatic edge creation.

---

## What It Does

When dropping a blueprint that declares `parameters` in its metadata:

1. **Modal Prompt** — Shows a dialog listing required resources/items
2. **Mapping Options** — For each parameter:
   - Select an existing node from dropdown
   - Create a new node with custom name/icon
3. **Auto-Wiring** — Injects mappings into workflow `input_rules` and `output_rules`
4. **Skip Option** — "Skip and wire manually" for advanced users

---

## Blueprint Schema

Add `parameters` array to `blueprint_meta`:

```json
{
  "blueprint_meta": {
    "id": "blueprint-forge-chain-medium",
    "label": "Forge Chain",
    "parameters": [
      {
        "key": "ore_resource",
        "label": "Ore Resource",
        "type": "resource",
        "required": true,
        "description": "The raw ore resource to smelt",
        "injects_into": ["bp-fc-workflow-smelt.input_rules"]
      },
      {
        "key": "ingot_resource",
        "label": "Ingot Resource",
        "type": "resource",
        "required": true,
        "description": "The refined ingot output",
        "injects_into": [
          "bp-fc-workflow-forge.input_rules",
          "bp-fc-workflow-smelt.output_rules"
        ]
      },
      {
        "key": "weapon_item",
        "label": "Weapon Item",
        "type": "item",
        "required": true,
        "description": "The finished weapon",
        "injects_into": ["bp-fc-recipe-forge.output_item_id"]
      }
    ]
  }
}
```

### Parameter Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `key` | string | yes | Internal identifier (used in code) |
| `label` | string | yes | Display name in modal |
| `type` | string | yes | `resource` or `item` |
| `required` | boolean | no | If true, must be mapped before import |
| `description` | string | no | Helper text shown in modal |
| `injects_into` | string[] | no | **Explicit paths** for injection (see below) |

### Injection Paths

The `injects_into` field specifies exact injection targets using path syntax:

```
"nodeId.field"
```

**Supported fields:**
- `input_rules` — Appends `{ resource_id: targetNodeId, amount: 5 }`
- `output_rules` — Appends `{ output_type: ..., target: targetNodeId, quantity: 2 }`
- `inputs` — Appends `{ item_id: targetNodeId, qty: 5 }`
- `output_item_id` — Sets directly

**Examples:**
```javascript
// Inject into workflow input
"bp-fc-workflow-smelt.input_rules"

// Inject into multiple targets (ingot is input to forge, output from smelt)
[
  "bp-fc-workflow-forge.input_rules",
  "bp-fc-workflow-smelt.output_rules"
]

// Set recipe output
"bp-fc-recipe-forge.output_item_id"
```

### Fallback Behavior

If `injects_into` is NOT provided, the system uses heuristic-based injection:
- Input patterns (`input`, `ingredient`, `raw`, `ore`, `herb`) → adds to `input_rules`
- Output patterns (`output`, `product`, `refined`, `ingot`, `potion`) → adds to `output_rules`

---

## Updated Blueprints

| Blueprint | Parameters |
|-----------|------------|
| **Basic** | |
| `smelt` | input_resource, output_resource |
| `brew` | ingredient_resource, potion_resource |
| `research` | knowledge_resource |
| **Medium** | |
| `forge-chain` | ore_resource, ingot_resource, weapon_item |
| `apothecary-chain` | herb_resource, concentrate_resource, potion_item |
| `library-chain` | knowledge_resource |
| **Complex** | |
| `forge-system` | ore_resource, ingot_resource, weapon_item, armor_item |
| `apothecary-system` | herb_resource, extract_resource, potion_resource, consumable_item |
| `library-system` | knowledge_resource |

---

## Implementation Files

| File | Change |
|------|--------|
| `editor/src/components/ParameterMappingModal.jsx` | NEW — Modal UI component |
| `editor/src/store/useStore.js` | MODIFIED — `importBlueprint()` + helper functions |
| `editor/src/components/BlueprintLibraryModal.jsx` | MODIFIED — Parameter modal integration |
| `editor/src/blueprints/basic/smelt.blueprint.json` | MODIFIED — Added parameters |
| `editor/src/blueprints/basic/brew.blueprint.json` | MODIFIED — Added parameters |
| `editor/src/blueprints/basic/research.blueprint.json` | MODIFIED — Added parameters |

---

## Usage Example

### Smelt Blueprint

```javascript
// Blueprint declares:
parameters: [
  { key: 'input_resource', label: 'Input Resource', type: 'resource' },
  { key: 'output_resource', label: 'Output Resource', type: 'resource' }
]

// User maps:
// - input_resource → existing "Iron Ore" resource
// - output_resource → create new "Iron Bar" resource

// Result after import:
// 1. Iron Bar resource node created
// 2. Workflow input_rules: [{ resource_id: 'Iron-Ore-ID', amount: 5 }]
// 3. Workflow output_rules: [{ output_type: 'resource', target: 'Iron-Bar-ID', quantity: 2 }]
// 4. Edges automatically wired via rigSelectedNodes()
```

---

## Code Flow

```
User drops blueprint
       ↓
BlueprintLibraryModal.handleDropRequest()
       ↓
Has parameters? → Show ParameterMappingModal
       ↓
User fills mappings → handleParameterConfirm()
       ↓
importBlueprint(blueprint, dropPosition, mappings)
       ↓
applyParameterMappingsToBlueprint()
  - Creates new nodes if requested
  - Injects IDs into workflow input_rules/output_rules
       ↓
Normal import flow continues
       ↓
Nodes appear on canvas with pre-wired connections
```

---

## Helper Functions (useStore.js)

```javascript
// Main injection function
applyParameterMappingsToBlueprint(blueprint, mappings, existingNodes)

// Creates resource/item node from parameter
createNodeFromParameter(mapping, nodeId)

// Injects mapping into workflow node
injectParameterIntoWorkflow(workflowNode, config, targetNodeId, paramKey)

// Injects mapping into recipe node
injectParameterIntoRecipe(recipeNode, config, targetNodeId, paramKey)

// Determines input vs output
isInputParameter(paramKey)
```

---

## Future Enhancements

- [ ] Support for `hero_class` parameters (e.g., "select a combat hero")
- [ ] Support for `building` parameters (e.g., "select a crafting station")
- [ ] Validation rules (e.g., "must be a material resource")
- [ ] Default value suggestions (auto-select by name match)
- [ ] Multi-select for array parameters
- [ ] Blueprint-level parameter defaults in JSON

---

## Testing Checklist

- [ ] Drop smelt blueprint → modal appears
- [ ] Select existing resources → imports with wired connections
- [ ] Create new resources → nodes created and wired
- [ ] Click "Skip and wire manually" → imports without mappings
- [ ] Click "Cancel" → modal closes, no import
- [ ] Drop blueprint without parameters → imports directly (no modal)
- [ ] Multiple blueprints in sequence → each shows modal independently

---

## Designer Notes

**When to use parameters:**
- Blueprints that need specific resources (ore → bar, herb → potion)
- Crafting chains where inputs/outputs vary by game
- Any blueprint that says "wire your X resource here"

**When NOT to use parameters:**
- Self-contained systems (all nodes internal)
- Fixed resource loops (gold → upgrade → more gold)
- Template blueprints meant for copying structure only

---

## Related Files

- `generator/GENERATORPASS2.md` — Blueprint generation rules
- `editor/src/blueprints/` — Existing blueprint library
- `editor/src/store/useStore.js:importBlueprint()` — Import logic
