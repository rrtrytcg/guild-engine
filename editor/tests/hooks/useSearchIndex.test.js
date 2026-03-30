// editor/tests/hooks/useSearchIndex.test.js
import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useSearchIndex } from '../../src/hooks/useSearchIndex.js'

describe('useSearchIndex', () => {
  it('transforms nodes to search entries', () => {
    const nodes = [
      { id: 'n1', type: 'resource', data: { label: 'Gold', description: 'A yellow metal' } },
      { id: 'n2', type: 'building', data: { label: 'Mine', description: 'Produces gold' } },
    ]

    const { result } = renderHook(() => useSearchIndex(nodes))
    expect(result.current).toHaveLength(2)
    expect(result.current[0]).toMatchObject({
      id: 'n1',
      label: 'Gold',
      type: 'resource',
      group: 'Economy',
      description: 'A yellow metal',
    })
  })

  it('handles missing node data', () => {
    const nodes = [
      { id: 'n1', type: 'resource' },
      { id: 'n2' },
    ]

    const { result } = renderHook(() => useSearchIndex(nodes))
    expect(result.current[0].label).toBe('n1')
    expect(result.current[0].emoji).toBe('💰')
    expect(result.current[1].group).toBe('Other')
  })

  it('returns empty array for null/undefined nodes', () => {
    const { result: r1 } = renderHook(() => useSearchIndex(null))
    const { result: r2 } = renderHook(() => useSearchIndex(undefined))
    expect(r1.current).toEqual([])
    expect(r2.current).toEqual([])
  })

  it('memoizes when nodes are unchanged', () => {
    const nodes = [
      { id: 'n1', type: 'resource', data: { label: 'Gold' } },
    ]

    const { result, rerender } = renderHook(({ ns }) => useSearchIndex(ns), {
      initialProps: { ns: nodes },
    })
    const firstResult = result.current

    rerender({ ns: nodes })
    expect(result.current).toBe(firstResult)
  })

  it('recomputes when nodes change', () => {
    const nodes1 = [{ id: 'n1', type: 'resource', data: { label: 'Gold' } }]
    const nodes2 = [{ id: 'n2', type: 'building', data: { label: 'Mine' } }]

    const { result, rerender } = renderHook(({ ns }) => useSearchIndex(ns), {
      initialProps: { ns: nodes1 },
    })
    expect(result.current[0].label).toBe('Gold')

    rerender({ ns: nodes2 })
    expect(result.current[0].label).toBe('Mine')
  })
})