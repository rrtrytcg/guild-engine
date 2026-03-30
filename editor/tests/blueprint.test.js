import { describe, it, expect } from 'vitest'
import { injectByPath, createNodeFromParameter, isInputParameter } from '../../editor/src/utils/blueprintUtils.js'

describe('injectByPath', () => {
  function makeBlueprint() {
    return {
      nodes: [
        {
          id: 'wf-1',
          type: 'building_workflow',
          input_rules: [],
          output_rules: [],
        },
        {
          id: 'recipe-1',
          type: 'crafting_recipe',
          inputs: [],
          output_item_id: null,
        },
      ],
    }
  }

  describe('input_rules injection', () => {
    it('adds resource to input_rules if not present', () => {
      const bp = makeBlueprint()
      injectByPath(bp, 'wf-1.input_rules', 'res-gold', { type: 'resource' })
      expect(bp.nodes[0].input_rules).toContainEqual({ resource_id: 'res-gold', amount: 5 })
    })

    it('does not duplicate existing resource in input_rules', () => {
      const bp = makeBlueprint()
      bp.nodes[0].input_rules = [{ resource_id: 'res-gold', amount: 10 }]
      injectByPath(bp, 'wf-1.input_rules', 'res-gold', { type: 'resource' })
      expect(bp.nodes[0].input_rules.filter(r => r.resource_id === 'res-gold')).toHaveLength(1)
    })
  })

  describe('output_rules injection', () => {
    it('adds resource output to output_rules', () => {
      const bp = makeBlueprint()
      injectByPath(bp, 'wf-1.output_rules', 'res-gold', { type: 'resource' })
      expect(bp.nodes[0].output_rules).toContainEqual(
        expect.objectContaining({ output_type: 'resource', target: 'res-gold' })
      )
    })

    it('adds item output to output_rules for item type', () => {
      const bp = makeBlueprint()
      injectByPath(bp, 'wf-1.output_rules', 'item-sword', { type: 'item' })
      expect(bp.nodes[0].output_rules).toContainEqual(
        expect.objectContaining({ output_type: 'item', target: 'item-sword' })
      )
    })

    it('does not duplicate existing target in output_rules', () => {
      const bp = makeBlueprint()
      bp.nodes[0].output_rules = [{ output_type: 'resource', target: 'res-gold', quantity: 2, chance: 1 }]
      injectByPath(bp, 'wf-1.output_rules', 'res-gold', { type: 'resource' })
      expect(bp.nodes[0].output_rules.filter(r => r.target === 'res-gold')).toHaveLength(1)
    })
  })

  describe('inputs injection', () => {
    it('adds item to recipe inputs', () => {
      const bp = makeBlueprint()
      injectByPath(bp, 'recipe-1.inputs', 'item-iron', { type: 'item' })
      expect(bp.nodes[1].inputs).toContainEqual({ item_id: 'item-iron', qty: 5 })
    })

    it('does not duplicate existing item in inputs', () => {
      const bp = makeBlueprint()
      bp.nodes[1].inputs = [{ item_id: 'item-iron', qty: 3 }]
      injectByPath(bp, 'recipe-1.inputs', 'item-iron', { type: 'item' })
      expect(bp.nodes[1].inputs.filter(i => i.item_id === 'item-iron')).toHaveLength(1)
    })
  })

  describe('output_item_id injection', () => {
    it('sets output_item_id if not already set', () => {
      const bp = makeBlueprint()
      injectByPath(bp, 'recipe-1.output_item_id', 'item-sword', { type: 'item' })
      expect(bp.nodes[1].output_item_id).toBe('item-sword')
    })

    it('does not overwrite existing output_item_id', () => {
      const bp = makeBlueprint()
      bp.nodes[1].output_item_id = 'item-shield'
      injectByPath(bp, 'recipe-1.output_item_id', 'item-sword', { type: 'item' })
      expect(bp.nodes[1].output_item_id).toBe('item-shield')
    })
  })

  describe('indexed array access', () => {
    it('injects into indexed inputs field', () => {
      const bp = makeBlueprint()
      bp.nodes[1].inputs = [{}, {}]
      injectByPath(bp, 'recipe-1.inputs[0].item_id', 'item-wood', { type: 'item' })
      expect(bp.nodes[1].inputs[0].item_id).toBe('item-wood')
    })
  })

  describe('edge cases', () => {
    it('ignores unknown node ID', () => {
      const bp = makeBlueprint()
      injectByPath(bp, 'unknown-node.input_rules', 'res-gold', { type: 'resource' })
      // no-op, no error thrown
      expect(bp.nodes[0].input_rules).toHaveLength(0)
    })

    it('ignores unknown field path', () => {
      const bp = makeBlueprint()
      injectByPath(bp, 'wf-1.unknown_field', 'res-gold', { type: 'resource' })
      // no-op, no error
    })
  })
})

describe('isInputParameter', () => {
  it('recognizes input patterns', () => {
    expect(isInputParameter('input_ore')).toBe(true)
    expect(isInputParameter('input_wood')).toBe(true)
    expect(isInputParameter('ingredient_count')).toBe(true)
    expect(isInputParameter('raw_materials')).toBe(true)
    expect(isInputParameter('ore_iron')).toBe(true)
    expect(isInputParameter('herb_count')).toBe(true)
    expect(isInputParameter('berry_type')).toBe(true)
  })

  it('recognizes output patterns', () => {
    expect(isInputParameter('output_ingot')).toBe(false)
    expect(isInputParameter('product_iron')).toBe(false)
    expect(isInputParameter('refined_gold')).toBe(false)
    expect(isInputParameter('potion_output')).toBe(false)
    expect(isInputParameter('brew_type')).toBe(false)
  })

  it('treats generic resource as input', () => {
    expect(isInputParameter('resource_something')).toBe(true)
  })

  it('treats resource_output as output', () => {
    expect(isInputParameter('resource_output')).toBe(false)
  })
})

describe('createNodeFromParameter', () => {
  it('creates a resource node', () => {
    const node = createNodeFromParameter({ type: 'resource', label: 'Iron Ore', icon: '🪨' }, 'res-1', { x: 100, y: 200 })
    expect(node.id).toBe('res-1')
    expect(node.type).toBe('resource')
    expect(node.label).toBe('Iron Ore')
    expect(node.icon).toBe('🪨')
    expect(node.base_cap).toBe(1000)
    expect(node.base_income).toBe(0)
    expect(node.position).toEqual({ x: 100, y: 200 })
    expect(node.canvas_pos).toEqual({ x: 100, y: 200 })
  })

  it('creates an item node', () => {
    const node = createNodeFromParameter({ type: 'item', label: 'Health Potion' }, 'item-1', { x: 50, y: 75 })
    expect(node.id).toBe('item-1')
    expect(node.type).toBe('item')
    expect(node.label).toBe('Health Potion')
    expect(node.subtype).toBe('material')
    expect(node.rarity).toBe('common')
    expect(node.stack_limit).toBe(99)
  })

  it('uses default icons when not provided', () => {
    const resNode = createNodeFromParameter({ type: 'resource', label: 'Gold' }, 'g', { x: 0, y: 0 })
    expect(resNode.icon).toBe('💠')

    const itemNode = createNodeFromParameter({ type: 'item', label: 'Wood' }, 'i', { x: 0, y: 0 })
    expect(itemNode.icon).toBe('📦')
  })

  it('returns null for unknown type', () => {
    const node = createNodeFromParameter({ type: 'unknown', label: 'X' }, 'x', { x: 0, y: 0 })
    expect(node).toBeNull()
  })
})
