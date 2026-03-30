import { describe, it, expect } from 'vitest'
import { INSPECTOR_IMPORTERS, getInspectorImporter } from '../src/inspector/inspectorRegistry.js'

describe('inspectorRegistry', () => {
  it('exposes known inspector importers', () => {
    expect(Object.keys(INSPECTOR_IMPORTERS)).toContain('resource')
    expect(Object.keys(INSPECTOR_IMPORTERS)).toContain('building')
    expect(typeof INSPECTOR_IMPORTERS.resource).toBe('function')
  })

  it('returns null for unknown types', () => {
    expect(getInspectorImporter('unknown_type')).toBe(null)
  })
})
