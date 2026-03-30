import { describe, it, expect } from 'vitest'
import { compile } from '../../editor/src/compiler/compiler.js'

function makeNode(id, type, data = {}) {
  return { id, type: 'custom', position: { x: 0, y: 0 }, data: { id, type, label: id, ...data } }
}

function makeEdge(source, target, relation = 'output') {
  return { source, target, data: { relation } }
}

describe('compiler — required fields', () => {
  it('reports missing label on resource', () => {
    const nodes = [makeNode('res-1', 'resource', { label: '' })]
    const { errors } = compile(nodes, [])
    expect(errors.some(e => e.field === 'label')).toBe(true)
  })

  it('passes when all required fields present', () => {
    const nodes = [makeNode('res-1', 'resource', { label: 'Gold', base_cap: 100 })]
    const { errors } = compile(nodes, [])
    // might have other errors but no "missing required field" for label
    expect(errors.filter(e => e.field === 'label')).toHaveLength(0)
  })
})

describe('compiler — duplicate IDs', () => {
  it('reports duplicate node IDs', () => {
    const n1 = makeNode('res-1', 'resource', { label: 'Gold' })
    const n2 = makeNode('res-1', 'resource', { label: 'Silver' })
    const { errors } = compile([n1, n2], [])
    expect(errors.some(e => e.message?.includes('Duplicate'))).toBe(true)
  })
})

describe('compiler — connection rules', () => {
  it('passes valid resource -> building edge', () => {
    const nodes = [
      makeNode('res-1', 'resource', { label: 'Gold', base_cap: 100 }),
      makeNode('bld-1', 'building', { label: 'Mine', max_level: 5 }),
    ]
    const edges = [makeEdge('res-1', 'bld-1', 'production')]
    const { errors } = compile(nodes, edges)
    // should not have connection rule errors for this valid setup
    const connectionErrors = errors.filter(e => e.message?.includes('Cannot connect'))
    expect(connectionErrors).toHaveLength(0)
  })
})

describe('compiler — validation rules', () => {
  it('reports errors for circular building prerequisites', () => {
    const nodes = [
      makeNode('bld-a', 'building', { label: 'Building A', max_level: 3 }),
      makeNode('bld-b', 'building', { label: 'Building B', max_level: 3 }),
      {
        id: 'upg-a', type: 'custom',
        position: { x: 0, y: 0 },
        data: {
          id: 'upg-a', type: 'building_upgrade', label: 'UpgA',
          host_building: 'bld-a',
          level: 1,
          cost: [],
          requires: { cross_building: [{ building_id: 'bld-b' }] },
        },
      },
      {
        id: 'upg-b', type: 'custom',
        position: { x: 0, y: 0 },
        data: {
          id: 'upg-b', type: 'building_upgrade', label: 'UpgB',
          host_building: 'bld-b',
          level: 1,
          cost: [],
          requires: { cross_building: [{ building_id: 'bld-a' }] },
        },
      },
    ]
    const edges = []
    const { errors } = compile(nodes, edges)
    expect(errors.some(e => e.message?.includes('Circular') || e.message?.includes('cycle'))).toBe(true)
  })

  it('passes a well-formed single-resource project', () => {
    const nodes = [makeNode('res-gold', 'resource', { label: 'Gold', base_cap: 999 })]
    const { project } = compile(nodes, [])
    expect(project).toBeDefined()
    expect(project.nodes).toHaveLength(1)
  })
})

describe('compiler — output project', () => {
  it('generates valid project.json structure', () => {
    const nodes = [
      makeNode('res-gold', 'resource', { label: 'Gold', base_cap: 999 }),
      makeNode('bld-mine', 'building', { label: 'Mine', max_level: 3 }),
    ]
    const { project } = compile(nodes, [], { title: 'Test' })
    expect(project.meta.title).toBe('Test')
    expect(project.nodes).toHaveLength(2)
    expect(project.meta.schema_version).toBeDefined()
  })
})
