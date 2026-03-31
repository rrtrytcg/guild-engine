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
    expect(screen.getAllByText('vbox').length).toBeGreaterThan(0)
    expect(screen.getAllByText('hbox').length).toBeGreaterThan(0)
    expect(screen.getAllByText('grid').length).toBeGreaterThan(0)
    expect(screen.getAllByText('stack').length).toBeGreaterThan(0)
  })

  it('renders display widget types', () => {
    render(<WidgetPalette />)
    expect(screen.getAllByText('label').length).toBeGreaterThan(0)
    expect(screen.getAllByText('image').length).toBeGreaterThan(0)
    expect(screen.getAllByText('spacer').length).toBeGreaterThan(0)
    expect(screen.getAllByText('progressbar').length).toBeGreaterThan(0)
  })

  it('renders interactive widget types', () => {
    render(<WidgetPalette />)
    expect(screen.getAllByText('textbutton').length).toBeGreaterThan(0)
    expect(screen.getAllByText('iconbutton').length).toBeGreaterThan(0)
    expect(screen.getAllByText('textinput').length).toBeGreaterThan(0)
  })

  it('all widget items are draggable', () => {
    render(<WidgetPalette />)
    const items = document.querySelectorAll('[draggable="true"]')
    expect(items.length).toBeGreaterThan(0)
  })
})