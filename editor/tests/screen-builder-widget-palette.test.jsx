import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WidgetPalette } from '../src/components/screenBuilder/WidgetPalette.jsx'

describe('WidgetPalette', () => {
  it('renders widget categories', () => {
    render(<WidgetPalette />)
    expect(screen.getByText('Containers')).toBeTruthy()
    expect(screen.getByText('Display')).toBeTruthy()
    expect(screen.getByText('Interactive')).toBeTruthy()
  })

  it('renders container widget types', () => {
    render(<WidgetPalette />)
    expect(screen.getByText('vbox')).toBeTruthy()
    expect(screen.getByText('hbox')).toBeTruthy()
    expect(screen.getByText('grid')).toBeTruthy()
    expect(screen.getByText('stack')).toBeTruthy()
  })

  it('renders display widget types', () => {
    render(<WidgetPalette />)
    expect(screen.getByText('label')).toBeTruthy()
    expect(screen.getByText('image')).toBeTruthy()
    expect(screen.getByText('spacer')).toBeTruthy()
    expect(screen.getByText('progressbar')).toBeTruthy()
  })

  it('renders interactive widget types', () => {
    render(<WidgetPalette />)
    expect(screen.getByText('textbutton')).toBeTruthy()
    expect(screen.getByText('iconbutton')).toBeTruthy()
    expect(screen.getByText('textinput')).toBeTruthy()
  })

  it('all widget items are draggable', () => {
    render(<WidgetPalette />)
    const items = document.querySelectorAll('[draggable="true"]')
    expect(items.length).toBeGreaterThan(0)
  })
})