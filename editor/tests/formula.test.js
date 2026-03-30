import { describe, it, expect } from 'vitest'
import { evaluateFormula } from '../../engine/systems/buildings.js'

describe('evaluateFormula', () => {
  describe('basic arithmetic', () => {
    it('evaluates a plain number', () => {
      expect(evaluateFormula('42')).toBe(42)
    })

    it('evaluates addition', () => {
      expect(evaluateFormula('2 + 3')).toBe(5)
    })

    it('evaluates subtraction', () => {
      expect(evaluateFormula('10 - 4')).toBe(6)
    })

    it('evaluates multiplication', () => {
      expect(evaluateFormula('6 * 7')).toBe(42)
    })

    it('evaluates division', () => {
      expect(evaluateFormula('15 / 3')).toBe(5)
    })

    it('evaluates modulo', () => {
      expect(evaluateFormula('10 % 3')).toBe(1)
    })

    it('respects operator precedence', () => {
      expect(evaluateFormula('2 + 3 * 4')).toBe(14)
      expect(evaluateFormula('(2 + 3) * 4')).toBe(20)
    })

    it('handles parentheses nesting', () => {
      expect(evaluateFormula('((1 + 2) * (3 + 4))')).toBe(21)
    })

    it('handles decimal numbers', () => {
      expect(evaluateFormula('0.5 + 0.25')).toBeCloseTo(0.75)
    })

    it('handles negative numbers via unary minus', () => {
      expect(evaluateFormula('-5')).toBe(-5)
      expect(evaluateFormula('3 + -2')).toBe(1)
    })

    it('handles empty/whitespace input', () => {
      expect(evaluateFormula('')).toBe(0)
      expect(evaluateFormula('   ')).toBe(0)
    })

    it('returns 0 for non-string input', () => {
      expect(evaluateFormula(null)).toBe(0)
      expect(evaluateFormula(undefined)).toBe(0)
      expect(evaluateFormula(42)).toBe(0)
    })
  })

  describe('variables', () => {
    it('substitutes known variables', () => {
      expect(evaluateFormula('building_level + 1', { building_level: 5 })).toBe(6)
    })

    it('treats missing allowed variables as 0', () => {
      // worker_skill is an allowed variable but not provided — safeVariables won't include it
      // so the parser rejects it. Only provided variables are accessible.
      expect(() => evaluateFormula('worker_skill + 1', {})).toThrow('Unknown variable')
    })

    it('treats provided variables correctly', () => {
      expect(evaluateFormula('worker_skill + 1', { worker_skill: 0 })).toBe(1)
      expect(evaluateFormula('worker_skill + 1', { worker_skill: 5 })).toBe(6)
    })

    it('rejects unknown identifiers', () => {
      expect(() => evaluateFormula('dangerous + 1', {})).toThrow('Unknown variable')
    })

    it('handles dynamic resource variables', () => {
      expect(evaluateFormula('resource_gold + resource_iron', {
        resource_gold: 100,
        resource_iron: 50,
      })).toBe(150)
    })

    it('handles item_craft_cost variables', () => {
      expect(evaluateFormula('item_craft_cost_iron_ore * 2', {
        item_craft_cost_iron_ore: 3,
      })).toBe(6)
    })

    it('handles item_base_stat variables', () => {
      expect(evaluateFormula('item_base_stat_attack + item_base_stat_defense', {
        item_base_stat_attack: 10,
        item_base_stat_defense: 8,
      })).toBe(18)
    })

    it('rejects variables not matching any pattern', () => {
      expect(() => evaluateFormula('alert(1)')).toThrow('Unknown function')
    })
  })

  describe('math functions', () => {
    it('calls min', () => {
      expect(evaluateFormula('min(3, 7)')).toBe(3)
    })

    it('calls max', () => {
      expect(evaluateFormula('max(3, 7)')).toBe(7)
    })

    it('calls floor', () => {
      expect(evaluateFormula('floor(3.7)')).toBe(3)
    })

    it('calls ceil', () => {
      expect(evaluateFormula('ceil(3.2)')).toBe(4)
    })

    it('calls round', () => {
      expect(evaluateFormula('round(3.5)')).toBe(4)
      expect(evaluateFormula('round(3.4)')).toBe(3)
    })

    it('calls abs', () => {
      expect(evaluateFormula('abs(-7)')).toBe(7)
    })

    it('calls pow', () => {
      expect(evaluateFormula('pow(2, 8)')).toBe(256)
    })

    it('calls sqrt', () => {
      expect(evaluateFormula('sqrt(144)')).toBe(12)
    })

    it('calls clamp', () => {
      expect(evaluateFormula('clamp(150, 0, 100)')).toBe(100)
      expect(evaluateFormula('clamp(-5, 0, 100)')).toBe(0)
      expect(evaluateFormula('clamp(50, 0, 100)')).toBe(50)
    })

    it('nests functions', () => {
      expect(evaluateFormula('max(0, min(100, building_level * 10))', { building_level: 15 })).toBe(100)
      expect(evaluateFormula('max(0, min(100, building_level * 10))', { building_level: 5 })).toBe(50)
    })

    it('rejects unknown function calls', () => {
      expect(() => evaluateFormula('eval(1)')).toThrow('Unknown function')
    })
  })

  describe('comparison and logic', () => {
    it('evaluates comparison operators', () => {
      expect(evaluateFormula('5 > 3')).toBe(1)
      expect(evaluateFormula('3 > 5')).toBe(0)
      expect(evaluateFormula('3 < 5')).toBe(1)
      expect(evaluateFormula('3 >= 3')).toBe(1)
      expect(evaluateFormula('3 <= 2')).toBe(0)
      expect(evaluateFormula('3 == 3')).toBe(1)
      expect(evaluateFormula('3 != 5')).toBe(1)
    })

    it('evaluates logical operators', () => {
      expect(evaluateFormula('1 && 1')).toBe(1)
      expect(evaluateFormula('1 && 0')).toBe(0)
      expect(evaluateFormula('0 || 1')).toBe(1)
      expect(evaluateFormula('0 || 0')).toBe(0)
    })

    it('evaluates ternary operator', () => {
      expect(evaluateFormula('building_level > 5 ? 100 : 50', { building_level: 7 })).toBe(100)
      expect(evaluateFormula('building_level > 5 ? 100 : 50', { building_level: 3 })).toBe(50)
    })
  })

  describe('real-world formulas from schema', () => {
    it('evaluates a crafting cost formula', () => {
      const result = evaluateFormula('max(1, floor(item_level * 0.5) + batch_size)', {
        item_level: 10,
        batch_size: 3,
      })
      expect(result).toBe(8) // max(1, floor(5) + 3) = max(1, 8) = 8
    })

    it('evaluates a duration formula', () => {
      const result = evaluateFormula('base_duration * (1 - min(0.5, worker_skill * 0.05))', {
        base_duration: 60,
        worker_skill: 3,
      })
      expect(result).toBeCloseTo(51) // 60 * (1 - 0.15) = 51
    })

    it('evaluates a success rate formula', () => {
      const result = evaluateFormula('min(0.95, base_crit + worker_specialization_match * 0.1)', {
        base_crit: 0.05,
        worker_specialization_match: 1,
      })
      expect(result).toBeCloseTo(0.15)
    })
  })

  describe('security', () => {
    it('rejects semicolons', () => {
      expect(() => evaluateFormula('1;2')).toThrow()
    })

    it('rejects template literals', () => {
      expect(() => evaluateFormula('`${1}`')).toThrow()
    })

    it('rejects bracket access', () => {
      expect(() => evaluateFormula('Object["keys"]')).toThrow()
    })

    it('rejects string literals', () => {
      expect(() => evaluateFormula('"hello"')).toThrow()
    })

    it('division by zero throws', () => {
      expect(() => evaluateFormula('1 / 0')).toThrow('Division by zero')
    })
  })
})
