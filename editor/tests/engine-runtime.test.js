import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { EngineRuntime, initEngine, stopEngine, actions } from '../../engine/engine.js'

const project = {
  meta: { title: 'Test Game' },
  nodes: [],
  edges: [],
}

beforeEach(() => {
  vi.useFakeTimers()
  globalThis.localStorage = {
    getItem: vi.fn().mockReturnValue(null),
    setItem: vi.fn(),
  }
})

afterEach(() => {
  vi.useRealTimers()
  delete globalThis.localStorage
})

describe('EngineRuntime', () => {
  it('initializes and ticks via render callback', () => {
    const engine = new EngineRuntime()
    const snapshots = []
    const snap = engine.init(project, (snapshot) => snapshots.push(snapshot))

    expect(snap.meta.title).toBe('Test Game')
    expect(snapshots.length).toBe(1)

    vi.advanceTimersByTime(250)
    expect(snapshots[snapshots.length - 1].tick).toBeGreaterThan(0)

    const lastTick = snapshots[snapshots.length - 1].tick
    engine.stop()
    vi.advanceTimersByTime(1000)
    expect(snapshots[snapshots.length - 1].tick).toBe(lastTick)
  })

  it('keeps compatibility exports intact', () => {
    let lastSnapshot = null
    initEngine(project, (snapshot) => { lastSnapshot = snapshot })
    expect(lastSnapshot.meta.title).toBe('Test Game')
    expect(typeof actions.saveGame).toBe('function')
    stopEngine()
  })
})
