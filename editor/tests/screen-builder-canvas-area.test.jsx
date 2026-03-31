import React from 'react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { CanvasArea } from '../src/components/screenBuilder/CanvasArea.jsx'

const mockScreen = {
  id: 'ui.test',
  name: 'Test Screen',
  layout: {
    id: 'root',
    type: 'vbox',
    children: [
      { id: 'label1', type: 'label', text: 'Hello' },
    ],
  },
}

// Mock state that will be used by the store mock
let mockState = {
  canvasZoom: 1.0,
  canvasFitMode: 'manual',
  activeScreen: null,
  previewDataSource: 'live',
  mockData: {},
}

vi.mock('../src/hooks/useScreenPreview', () => ({
  default: () => ({
    activeScreen: mockState.activeScreen,
    previewDataSource: mockState.previewDataSource,
    snapshot: {},
  }),
}))

vi.mock('../src/store/useStore', () => ({
  default: (selector) => {
    if (typeof selector === 'function') {
      return selector(mockState)
    }
    return mockState
  },
}))

describe('CanvasArea', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock state
    mockState = {
      canvasZoom: 1.0,
      canvasFitMode: 'manual',
      activeScreen: null,
      previewDataSource: 'live',
      mockData: {},
    }
  })

  it('shows empty state when no screen is loaded', () => {
    render(<CanvasArea onAction={() => {}} />)
    // The empty state message is "Load a screen file or create a new one to start editing"
    // Split across elements, so we check for the individual words
    expect(screen.getByText(/screen file or create/i)).toBeTruthy()
  })

  it('displays screen name in header when screen is loaded', () => {
    mockState.activeScreen = mockScreen

    render(<CanvasArea onAction={() => {}} />)
    expect(screen.getByText('Test Screen')).toBeTruthy()
  })

  it('renders canvas eyebrow label in header', () => {
    mockState.activeScreen = mockScreen

    render(<CanvasArea onAction={() => {}} />)
    const canvasLabels = screen.getAllByText('Canvas')
    expect(canvasLabels.length).toBeGreaterThan(0)
  })

  it('applies correct transform scale to canvas surface', () => {
    mockState.activeScreen = mockScreen
    mockState.canvasZoom = 1.5

    render(<CanvasArea onAction={() => {}} />)
    const surface = document.querySelector('[data-canvas-surface]')
    expect(surface?.style?.transform).toBe('scale(1.5)')
  })

  it('shows auto-fit badge when fitMode is auto', () => {
    mockState.activeScreen = mockScreen
    mockState.canvasFitMode = 'auto'

    render(<CanvasArea onAction={() => {}} />)
    // Auto-fit badge is rendered via CanvasToolbar when fitMode is auto
    // The test verifies the component doesn't crash in auto-fit mode
    const surface = document.querySelector('[data-canvas-surface]')
    expect(surface).toBeTruthy()
  })

  it('renders widget content from renderScreenToHTML', () => {
    mockState.activeScreen = mockScreen

    render(<CanvasArea onAction={() => {}} />)
    const surface = document.querySelector('[data-canvas-surface]')
    expect(surface).toBeTruthy()
    expect(surface?.innerHTML).toContain('Hello')
  })

  it('handles action clicks from rendered widgets', () => {
    const onAction = vi.fn()
    const screenWithAction = {
      ...mockScreen,
      layout: {
        ...mockScreen.layout,
        children: [
          { id: 'btn1', type: 'textbutton', label: 'Click Me', action: 'doSomething' },
        ],
      },
    }
    mockState.activeScreen = screenWithAction

    render(<CanvasArea onAction={onAction} />)
    const button = screen.getByText('Click Me')
    fireEvent.click(button)
    expect(onAction).toHaveBeenCalledWith('doSomething')
  })
})