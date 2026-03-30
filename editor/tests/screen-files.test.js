import { describe, expect, it } from 'vitest'
import {
  deriveScreenFileName,
  normalizeScreenDefinition,
  serializeScreenDefinition,
} from '../src/utils/screenFiles.js'

describe('screenFiles', () => {
  it('normalizes rootWidget files into runtime screen shape', () => {
    const normalized = normalizeScreenDefinition({
      id: 'ui.inventory',
      name: 'Inventory',
      rootWidget: {
        id: 'root',
        type: 'vbox',
        children: [],
      },
    }, 'inventory.screen.json')

    expect(normalized.id).toBe('ui.inventory')
    expect(normalized.layout.type).toBe('vbox')
    expect(normalized.sourceName).toBe('inventory.screen.json')
  })

  it('derives screen id and name from file name when missing', () => {
    const normalized = normalizeScreenDefinition({
      layout: { id: 'root', type: 'vbox', children: [] },
    }, 'guild.inventory.screen.json')

    expect(normalized.id).toBe('guild.inventory')
    expect(normalized.name).toBe('Guild Inventory')
  })

  it('serializes screen definitions for saving', () => {
    const json = serializeScreenDefinition({
      id: 'ui.inventory',
      name: 'Inventory',
      nav: { toolbar: true, hotkey: 'I', group: 'main' },
      layout: { id: 'root', type: 'vbox', children: [] },
      sourceName: 'inventory.screen.json',
    })

    expect(json).toEqual({
      id: 'ui.inventory',
      name: 'Inventory',
      nav: { toolbar: true, hotkey: 'I', group: 'main' },
      style: undefined,
      mockData: undefined,
      layout: { id: 'root', type: 'vbox', children: [] },
    })
  })

  it('prefers the original source name for save downloads', () => {
    expect(deriveScreenFileName({ id: 'ui.inventory', sourceName: 'inventory.screen.json' })).toBe('inventory.screen.json')
    expect(deriveScreenFileName({ id: 'ui.inventory' })).toBe('ui.inventory.screen.json')
  })
})
