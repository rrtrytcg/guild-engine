// editor/tests/components/SearchPalette.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { PassThrough } from 'stream'
import { renderToPipeableStream } from 'react-dom/server'

const storeState = {
  searchOpen: true,
  closeSearch: vi.fn(),
  selectNode: vi.fn(),
  nodes: [
    { id: 'n1', type: 'resource', data: { label: 'Gold', description: 'A metal' } },
    { id: 'n2', type: 'building', data: { label: 'Mine', description: 'Produces gold' } },
  ],
}

const useStoreMock = vi.fn((selector) => selector(storeState))

vi.mock('../../src/store/useStore.js', () => ({
  default: (selector) => useStoreMock(selector),
}))

vi.mock('../../src/hooks/useSearchIndex.js', () => ({
  useSearchIndex: vi.fn(() => []),
}))

// Mock createPortal to render inline for SSR compatibility
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom')
  return {
    ...actual,
    createPortal: (children) => children,
  }
})

// Import SearchPalette AFTER mocking createPortal
const { default: SearchPalette } = await import('../../src/components/SearchPalette.jsx')

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

describe('SearchPalette', () => {
  beforeEach(() => {
    storeState.searchOpen = true
    storeState.nodes = [
      { id: 'n1', type: 'resource', data: { label: 'Gold', description: 'A metal' } },
      { id: 'n2', type: 'building', data: { label: 'Mine', description: 'Produces gold' } },
    ]
    storeState.closeSearch = vi.fn()
    storeState.selectNode = vi.fn()
    useStoreMock.mockClear()
  })

  it('renders search input when open', async () => {
    const html = await renderAll(React.createElement(SearchPalette))
    expect(html).toContain('Search nodes...')
  })

  it('does not render "No nodes found" with empty query and empty nodes', async () => {
    // Override nodes to empty for this test
    storeState.nodes = []
    const html = await renderAll(React.createElement(SearchPalette))
    // "No nodes found" only appears when query is non-empty AND results.length === 0
    // With empty query, the message does not appear
    expect(html).not.toContain('No nodes found')
  })

  it('renders nothing when search is closed', async () => {
    storeState.searchOpen = false
    const html = await renderAll(React.createElement(SearchPalette))
    // When searchOpen is false, component returns null
    expect(html).not.toContain('Search nodes...')
  })
})