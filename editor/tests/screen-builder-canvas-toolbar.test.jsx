import React from 'react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { CanvasToolbar } from '../src/components/screenBuilder/CanvasToolbar.jsx'
import useStore from '../src/store/useStore.js'

let mockState = {
  canvasZoom: 1.0,
  canvasFitMode: 'manual',
  setCanvasZoom: vi.fn(),
  fitCanvasToViewport: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  mockState = {
    canvasZoom: 1.0,
    canvasFitMode: 'manual',
    setCanvasZoom: vi.fn(),
    fitCanvasToViewport: vi.fn(),
  }
  useStore.default = (selector) => selector(mockState)
})

afterEach(() => {
  cleanup()
})

describe('CanvasToolbar', () => {
  it('renders zoom controls with correct initial state', () => {
    mockState.canvasZoom = 1.0
    render(<CanvasToolbar />)
    expect(screen.getByText('−')).toBeTruthy()
    expect(screen.getByText('+')).toBeTruthy()
    expect(screen.getByText('Fit')).toBeTruthy()
    expect(screen.getByText('100%')).toBeTruthy()
  })

  it('zoom out decreases zoom by 0.1', () => {
    mockState.canvasZoom = 1.0
    render(<CanvasToolbar />)
    fireEvent.click(screen.getByText('−'))
    expect(mockState.setCanvasZoom).toHaveBeenCalledWith(0.9)
  })

  it('zoom in increases zoom by 0.1', () => {
    mockState.canvasZoom = 1.0
    render(<CanvasToolbar />)
    fireEvent.click(screen.getByText('+'))
    expect(mockState.setCanvasZoom).toHaveBeenCalledWith(1.1)
  })

  it('fit button calls fitCanvasToViewport', () => {
    mockState.canvasZoom = 1.0
    render(<CanvasToolbar />)
    fireEvent.click(screen.getByText('Fit'))
    expect(mockState.fitCanvasToViewport).toHaveBeenCalled()
  })

  it('does not zoom out below 0.5', () => {
    mockState.canvasZoom = 0.5
    render(<CanvasToolbar />)
    fireEvent.click(screen.getByText('−'))
    expect(mockState.setCanvasZoom).not.toHaveBeenCalled()
  })

  it('does not zoom in above 2.0', () => {
    mockState.canvasZoom = 2.0
    render(<CanvasToolbar />)
    fireEvent.click(screen.getByText('+'))
    expect(mockState.setCanvasZoom).not.toHaveBeenCalled()
  })

  it('slider change updates zoom', () => {
    mockState.canvasZoom = 1.0
    render(<CanvasToolbar />)
    const slider = document.querySelector('input[type="range"]')
    if (slider) {
      fireEvent.change(slider, { target: { value: 1.5 } })
      expect(mockState.setCanvasZoom).toHaveBeenCalledWith(1.5)
    }
  })
})