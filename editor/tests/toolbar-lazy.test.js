import { describe, it, expect, vi, afterEach } from 'vitest'
import * as React from 'react'
import { renderToReadableStream, renderToString } from 'react-dom/server'

let stateSequence = []

vi.mock('react', async () => {
  const actual = await vi.importActual('react')
  return {
    ...actual,
    useState: (initial) => {
      const next = stateSequence.length ? stateSequence.shift() : initial
      return [next, vi.fn()]
    },
  }
})

const mockStore = (overrides = {}) => {
  const state = {
    importProject: vi.fn(),
    registerBlueprint: vi.fn(),
    canvasView: 'nodes',
    setCanvasView: vi.fn(),
    nodes: [],
    edges: [],
    selectedNodeIds: [],
    rigSelectedNodes: vi.fn(() => null),
    ...overrides,
  }

  return (selector) => selector(state)
}

const readStream = async (stream) => {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  const chunks = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(typeof value === 'string' ? value : decoder.decode(value))
  }

  return chunks.join('')
}

afterEach(() => {
  stateSequence = []
  vi.resetModules()
  vi.clearAllMocks()
})

describe('Toolbar lazy loading', () => {
  it('renders Suspense fallback while blueprint modal loads', async () => {
    stateSequence = [false, true, false, null]
    vi.doMock('../src/store/useStore', () => ({
      default: mockStore(),
    }))
    vi.doMock('../src/components/BlueprintLibraryModal', () => ({
      default: () => React.createElement('div', null, 'Blueprint library ready'),
    }))

    const { default: Toolbar } = await import('../src/components/Toolbar.jsx')
    const markup = renderToString(React.createElement(Toolbar))

    expect(markup).toContain('Loading blueprint library…')
  })

  it('renders failure fallback when compile modal fails to load', async () => {
    stateSequence = [true, false, false, null]
    vi.doMock('../src/store/useStore', () => ({
      default: mockStore(),
    }))
    vi.doMock('../src/components/CompileModal', () => {
      throw new Error('Load failed')
    })

    const { default: Toolbar } = await import('../src/components/Toolbar.jsx')
    const stream = await renderToReadableStream(React.createElement(Toolbar))
    await stream.allReady
    const markup = await readStream(stream)

    expect(markup).toContain('Compile modal failed to load.')
  })
})
