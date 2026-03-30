import { describe, expect, it } from 'vitest'
import { canDrop, getDropPosition, getMoveIntent } from '../src/utils/dragDropUtils.js'

const layout = {
  id: 'root',
  type: 'vbox',
  children: [
    { id: 'title_label', type: 'label', text: 'Inventory' },
    {
      id: 'sidebar',
      type: 'vbox',
      children: [
        { id: 'close_button', type: 'textbutton', label: 'Close', action: 'close_inventory' },
      ],
    },
  ],
}

describe('dragDropUtils', () => {
  it('derives drop position from pointer zone', () => {
    const rect = { top: 100, height: 90 }

    expect(getDropPosition({ clientY: 105, rect, isContainer: true })).toBe('before')
    expect(getDropPosition({ clientY: 145, rect, isContainer: true })).toBe('inside')
    expect(getDropPosition({ clientY: 185, rect, isContainer: true })).toBe('after')
    expect(getDropPosition({ clientY: 145, rect, isContainer: false })).toBe('after')
  })

  it('rejects invalid drop targets', () => {
    expect(canDrop(layout, { draggedId: 'title_label', targetId: 'title_label', placement: 'before' })).toBe(false)
    expect(canDrop(layout, { draggedId: 'root', targetId: 'sidebar', placement: 'inside' })).toBe(false)
    expect(canDrop(layout, { draggedId: 'sidebar', targetId: 'close_button', placement: 'inside' })).toBe(false)
    expect(canDrop(layout, { draggedId: 'title_label', targetId: 'title_label', placement: 'inside' })).toBe(false)
    expect(canDrop(layout, { draggedId: 'title_label', targetId: 'root', placement: 'before' })).toBe(false)
  })

  it('accepts valid reorder and reparent targets', () => {
    expect(canDrop(layout, { draggedId: 'title_label', targetId: 'sidebar', placement: 'inside' })).toBe(true)
    expect(canDrop(layout, { draggedId: 'title_label', targetId: 'sidebar', placement: 'before' })).toBe(true)
    expect(canDrop(layout, { draggedId: 'close_button', targetId: 'title_label', placement: 'after' })).toBe(true)
  })

  it('builds move intent for before, after, and inside drops', () => {
    expect(getMoveIntent(layout, { draggedId: 'close_button', targetId: 'title_label', placement: 'before' })).toEqual({
      parentId: 'root',
      index: 0,
    })

    expect(getMoveIntent(layout, { draggedId: 'close_button', targetId: 'title_label', placement: 'after' })).toEqual({
      parentId: 'root',
      index: 1,
    })

    expect(getMoveIntent(layout, { draggedId: 'title_label', targetId: 'sidebar', placement: 'inside' })).toEqual({
      parentId: 'sidebar',
      index: 1,
    })
  })
})
