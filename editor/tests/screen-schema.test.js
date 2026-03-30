import { describe, expect, it } from 'vitest'
import {
  addWidgetToTree,
  cloneWidgetWithFreshIds,
  collectWidgetIds,
  createDemoScreenDraft,
  createWidget,
  deleteWidgetFromTree,
  duplicateWidgetInTree,
  findWidgetById,
  moveWidgetInTree,
  omit,
  pick,
  updateWidgetField,
  updateWidgetInTree,
  wrapWidgetInTree,
} from '../src/utils/screenSchema.js'

describe('screenSchema widget utilities', () => {
  it('creates widgets with generated IDs and defaults', () => {
    const widget = createWidget('textbutton', ['textbutton_1'])

    expect(widget.id).toBe('textbutton_2')
    expect(widget.label).toBe('Button')
    expect(widget.action).toBe('')
  })

  it('adds a widget to a container tree', () => {
    const screen = createDemoScreenDraft()
    const next = addWidgetToTree(screen.layout, 'root', { id: 'label_1', type: 'label', text: 'Details' })

    expect(next.children).toHaveLength(4)
    expect(next.children.at(-1)).toEqual({ id: 'label_1', type: 'label', text: 'Details' })
  })

  it('deletes a nested widget but preserves the root widget', () => {
    const screen = createDemoScreenDraft()
    const next = deleteWidgetFromTree(screen.layout, 'close_button')

    expect(findWidgetById(next, 'close_button')).toBeNull()
    expect(next.id).toBe('root')
  })

  it('duplicates a widget subtree with fresh IDs', () => {
    const screen = createDemoScreenDraft()
    const next = duplicateWidgetInTree(screen.layout, 'gold_label', collectWidgetIds(screen.layout))
    const labels = next.children.filter((child) => child.type === 'label')

    expect(labels).toHaveLength(3)
    expect(labels[1].id).toBe('gold_label')
    expect(labels[2].id).not.toBe('gold_label')
  })

  it('wraps a widget in a new container', () => {
    const screen = createDemoScreenDraft()
    const next = wrapWidgetInTree(screen.layout, 'close_button', 'hbox', collectWidgetIds(screen.layout))
    const wrapper = next.children.at(-1)

    expect(wrapper.type).toBe('hbox')
    expect(wrapper.children).toHaveLength(1)
    expect(wrapper.children[0].id).toBe('close_button')
  })

  it('clones nested widgets with fresh IDs throughout the subtree', () => {
    const source = {
      id: 'vbox_1',
      type: 'vbox',
      children: [
        { id: 'label_1', type: 'label', text: 'Hello' },
        { id: 'textbutton_1', type: 'textbutton', label: 'Go', action: 'go' },
      ],
    }

    const cloned = cloneWidgetWithFreshIds(source, collectWidgetIds(source))

    expect(cloned.id).not.toBe(source.id)
    expect(cloned.children[0].id).not.toBe('label_1')
    expect(cloned.children[1].id).not.toBe('textbutton_1')
  })

  it('reorders widgets within the same parent', () => {
    const screen = createDemoScreenDraft()
    const next = moveWidgetInTree(screen.layout, 'close_button', 'root', 0)

    expect(next.children.map((child) => child.id)).toEqual([
      'close_button',
      'title_label',
      'gold_label',
    ])
  })

  it('moves a widget into another container', () => {
    const source = {
      id: 'root',
      type: 'vbox',
      children: [
        { id: 'title_label', type: 'label', text: 'Inventory' },
        { id: 'sidebar', type: 'vbox', children: [] },
      ],
    }

    const next = moveWidgetInTree(source, 'title_label', 'sidebar', 0)

    expect(next.children[0].id).toBe('sidebar')
    expect(next.children[0].children[0].id).toBe('title_label')
  })

  it('does not move a widget into its own descendant', () => {
    const source = {
      id: 'root',
      type: 'vbox',
      children: [
        {
          id: 'sidebar',
          type: 'vbox',
          children: [
            { id: 'title_label', type: 'label', text: 'Inventory' },
          ],
        },
      ],
    }

    const next = moveWidgetInTree(source, 'sidebar', 'title_label', 0)

    expect(next).toBe(source)
  })
})

describe('omit and pick', () => {
  it('omit removes keys', () => {
    expect(omit({ a: 1, b: 2, c: 3 }, ['b'])).toEqual({ a: 1, c: 3 })
  })

  it('omit handles non-object input', () => {
    expect(omit(null, ['a'])).toBe(null)
    expect(omit(undefined, ['a'])).toBe(undefined)
  })

  it('pick keeps only specified keys', () => {
    expect(pick({ a: 1, b: 2, c: 3 }, ['a', 'c'])).toEqual({ a: 1, c: 3 })
  })

  it('pick handles non-object input', () => {
    expect(pick(null, ['a'])).toEqual({})
  })
})

describe('updateWidgetField', () => {
  it('updates a top-level field', () => {
    const w = { id: 'btn', type: 'textbutton', label: 'Close' }
    const next = updateWidgetField(w, 'label', 'Open')
    expect(next.label).toBe('Open')
    expect(next.id).toBe('btn')
  })

  it('returns same object when value unchanged', () => {
    const w = { id: 'btn', type: 'textbutton', label: 'Close' }
    const next = updateWidgetField(w, 'label', 'Close')
    expect(next).toBe(w)
  })

  it('updates a style sub-key', () => {
    const w = { id: 'btn', type: 'textbutton', style: { color: '#fff' } }
    const next = updateWidgetField(w, 'style.color', '#ff0')
    expect(next.style.color).toBe('#ff0')
    expect(next.style).toEqual({ color: '#ff0' })
  })

  it('adds a style sub-key', () => {
    const w = { id: 'btn', type: 'textbutton' }
    const next = updateWidgetField(w, 'style.color', '#ff0')
    expect(next.style).toEqual({ color: '#ff0' })
  })

  it('removes a style sub-key when set to empty', () => {
    const w = { id: 'btn', type: 'textbutton', style: { color: '#fff', 'font-size': '14px' } }
    const next = updateWidgetField(w, 'style.color', '')
    expect(next.style).toEqual({ 'font-size': '14px' })
  })
})

describe('updateWidgetInTree', () => {
  it('updates a top-level field on the root widget', () => {
    const tree = { id: 'root', type: 'vbox', gap: 8 }
    const next = updateWidgetInTree(tree, 'root', 'gap', 16)
    expect(next.gap).toBe(16)
  })

  it('updates a deep widget field', () => {
    const tree = {
      id: 'root', type: 'vbox', children: [
        { id: 'title', type: 'label', text: 'Inventory' },
      ],
    }
    const next = updateWidgetInTree(tree, 'title', 'text', 'Quests')
    expect(next.children[0].text).toBe('Quests')
  })

  it('updates a style sub-key on a deep widget', () => {
    const tree = {
      id: 'root', type: 'vbox', children: [
        { id: 'title', type: 'label', text: 'Inventory', style: { color: '#fff' } },
      ],
    }
    const next = updateWidgetInTree(tree, 'title', 'style.color', '#ff0')
    expect(next.children[0].style.color).toBe('#ff0')
  })

  it('returns the same tree if target not found', () => {
    const tree = { id: 'root', type: 'vbox' }
    const next = updateWidgetInTree(tree, 'does_not_exist', 'gap', 16)
    expect(next).toBe(tree)
  })

  it('returns the same tree if field value unchanged', () => {
    const tree = { id: 'root', type: 'vbox', gap: 8 }
    const next = updateWidgetInTree(tree, 'root', 'gap', 8)
    expect(next).toBe(tree)
  })

  it('updates id field', () => {
    const tree = { id: 'root', type: 'vbox', children: [{ id: 'btn', type: 'textbutton', label: 'X' }] }
    const next = updateWidgetInTree(tree, 'btn', 'id', 'close_btn')
    expect(next.children[0].id).toBe('close_btn')
  })
})
