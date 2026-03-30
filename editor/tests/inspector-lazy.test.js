import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { PassThrough } from 'stream'
import { renderToPipeableStream } from 'react-dom/server'
import Inspector from '../src/inspector/Inspector.jsx'
import { getInspectorImporter } from '../src/inspector/inspectorRegistry'

const storeState = {
  selectedNodeId: null,
  nodes: [],
  deleteNode: vi.fn(),
}

const useStoreMock = vi.fn((selector) => selector(storeState))

vi.mock('../src/store/useStore', () => ({
  default: (selector) => useStoreMock(selector),
}))

vi.mock('../src/inspector/inspectorRegistry', () => ({
  getInspectorImporter: vi.fn(),
}))

const baseNode = {
  id: 'node-1',
  data: {
    type: 'resource',
    label: 'Gold',
  },
}

const renderShell = (element) => new Promise((resolve, reject) => {
  let html = ''
  let didAbort = false
  const stream = renderToPipeableStream(element, {
    onShellReady() {
      const body = new PassThrough()
      body.on('data', (chunk) => {
        html += chunk.toString()
      })
      body.on('end', () => resolve(html))
      body.on('error', reject)
      stream.pipe(body)
      setTimeout(() => {
        didAbort = true
        stream.abort()
      }, 0)
    },
    onError(err) {
      if (didAbort && err?.message?.includes('aborted')) {
        return
      }
      reject(err)
    },
  })
})

const renderAll = (element) => new Promise((resolve, reject) => {
  let html = ''
  const stream = renderToPipeableStream(element, {
    onAllReady() {
      const body = new PassThrough()
      body.on('data', (chunk) => {
        html += chunk.toString()
      })
      body.on('end', () => resolve(html))
      body.on('error', reject)
      stream.pipe(body)
    },
    onError(err) {
      reject(err)
    },
  })
})

describe('Inspector lazy loading', () => {
  beforeEach(() => {
    storeState.selectedNodeId = baseNode.id
    storeState.nodes = [baseNode]
    storeState.deleteNode = vi.fn()
    useStoreMock.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('shows suspense fallback while inspector loads', async () => {
    getInspectorImporter.mockReturnValue(() => new Promise(() => {}))

    const html = await renderShell(React.createElement(Inspector))

    expect(html).toContain('Loading inspector…')
  })

  it('shows failure fallback when importer rejects', async () => {
    getInspectorImporter.mockReturnValue(() => Promise.reject(new Error('nope')))

    const html = await renderAll(React.createElement(Inspector))

    expect(html).toContain('Inspector failed to load. Refresh the editor to retry.')
  })

  it('shows no-importer message when registry returns null', async () => {
    getInspectorImporter.mockReturnValue(null)

    const html = await renderAll(React.createElement(Inspector))

    const normalized = html.replace(/<!--.*?-->/g, '')

    expect(normalized).toContain('No inspector for type: resource')
  })
})
