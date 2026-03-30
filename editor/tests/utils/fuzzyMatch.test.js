// editor/tests/utils/fuzzyMatch.test.js
import { describe, it, expect } from 'vitest'
import { fuzzyMatch } from '../../src/utils/fuzzyMatch.js'

describe('fuzzyMatch', () => {
  const sampleEntries = [
    { id: '1', label: 'Gold Mine', type: 'resource', group: 'Economy', description: 'Produces gold', emoji: '💰' },
    { id: '2', label: 'Iron Forge', type: 'building', group: 'World', description: 'Forges iron', emoji: '🏰' },
    { id: '3', label: 'Sword', type: 'item', group: 'Economy', description: 'A sharp weapon', emoji: '🗡️' },
    { id: '4', label: 'Hero Warrior', type: 'hero_class', group: 'Heroes', description: 'Basic warrior', emoji: '⚔️' },
    { id: '5', label: 'Goblin Hunt', type: 'expedition', group: 'Expeditions', description: 'Hunt goblins', emoji: '🗺️' },
  ]

  describe('exact match', () => {
    it('returns exact prefix match with highest score', () => {
      const results = fuzzyMatch('gold', sampleEntries)
      expect(results[0].entry.label).toBe('Gold Mine')
    })

    it('returns contains match with lower score', () => {
      const results = fuzzyMatch('forge', sampleEntries)
      expect(results[0].entry.label).toBe('Iron Forge')
    })

    it('fuzzy scatter match works', () => {
      const results = fuzzyMatch('gldm', sampleEntries)
      expect(results[0].entry.label).toBe('Gold Mine')
    })
  })

  describe('no match', () => {
    it('filters out entries with no match', () => {
      const results = fuzzyMatch('xyz123', sampleEntries)
      expect(results.length).toBe(0)
    })
  })

  describe('empty inputs', () => {
    it('returns all entries limited to 20 when query is empty', () => {
      const results = fuzzyMatch('', sampleEntries)
      expect(results.length).toBeLessThanOrEqual(20)
    })

    it('returns all entries when query is null', () => {
      const results = fuzzyMatch(null, sampleEntries)
      expect(results.length).toBeLessThanOrEqual(20)
    })

    it('returns all entries when query is undefined', () => {
      const results = fuzzyMatch(undefined, sampleEntries)
      expect(results.length).toBeLessThanOrEqual(20)
    })
  })

  describe('special characters', () => {
    it('handles special characters in query', () => {
      const entries = [
        { id: '1', label: 'Test (special)', type: 'item', group: 'Test', description: '', emoji: '🔧' },
      ]
      const results = fuzzyMatch('(special)', entries)
      expect(results[0].entry.label).toBe('Test (special)')
    })
  })

  describe('scoring', () => {
    it('limits results to 20', () => {
      const manyEntries = Array.from({ length: 50 }, (_, i) => ({
        id: String(i),
        label: `Node ${i}`,
        type: 'resource',
        group: 'Test',
        description: '',
        emoji: '📦',
      }))
      const results = fuzzyMatch('', manyEntries)
      expect(results.length).toBeLessThanOrEqual(20)
    })

    it('sorts by score descending', () => {
      const results = fuzzyMatch('e', sampleEntries)
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score)
      }
    })
  })

  describe('case insensitivity', () => {
    it('matches regardless of case', () => {
      const results = fuzzyMatch('GOLD', sampleEntries)
      expect(results[0].entry.label).toBe('Gold Mine')
    })
  })
})
