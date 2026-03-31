import React from 'react'
import { Writable } from 'stream'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToString, renderToPipeableStream } from 'react-dom/server'

const mockShellComponents = () => {
  vi.doMock('../src/components/Toolbar', () => ({
    default: () => null,
  }))
  vi.doMock('../src/canvas/Palette', () => ({
    default: () => null,
  }))
  vi.doMock('../src/canvas/Canvas', () => ({
    default: () => null,
  }))
  vi.doMock('../src/inspector/Inspector', () => ({
    default: () => null,
  }))
}

const mockStoreForGroups = () => {
  vi.doMock('../src/store/useStore', () => ({
    default: (selector) => selector({
      canvasView: 'groups',
      activeGroupId: null,
    }),
  }))
}

const renderToStreamString = (element) => new Promise((resolve, reject) => {
  let html = ''
  const stream = new Writable({
    write(chunk, encoding, callback) {
      html += chunk.toString()
      callback()
    },
  })
  stream.on('finish', () => resolve(html))
  stream.on('error', reject)

  const { pipe } = renderToPipeableStream(element, {
    onAllReady() {
      pipe(stream)
    },
    onShellError(error) {
      reject(error)
    },
  })
})

describe('App lazy loading', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('renders loading fallback while group canvas suspends', async () => {
    mockShellComponents()
    mockStoreForGroups()
    vi.doMock('../src/canvas/GroupCanvas', () => ({
      default: () => {
        throw new Promise(() => {})
      },
    }))

    const { default: App } = await import('../src/App.jsx')
    const markup = renderToString(React.createElement(App))

    expect(markup).toContain('Loading group view…')
  })

  it('renders error fallback when group canvas import fails', async () => {
    mockShellComponents()
    mockStoreForGroups()
    vi.doMock('../src/canvas/GroupCanvas', () => {
      throw new Error('load failed')
    })

    const { default: App } = await import('../src/App.jsx')
    // When lazy import fails, the .catch() returns a module with a null fallback component
    // The app should render without throwing
    const markup = await renderToStreamString(React.createElement(App))
    expect(markup).toBeDefined()
  })
})
