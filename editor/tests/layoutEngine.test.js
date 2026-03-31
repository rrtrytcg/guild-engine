import { describe, it, expect, beforeEach } from 'vitest'
import {
  escape,
  escapeAttr,
  getByPath,
  resolveBindings,
  styleStr,
  widgetToHTML,
  renderScreenToHTML,
  defineScreen,
  getScreen,
  screenRegistry,
} from '../../engine/layoutEngine.js'

describe('escape', () => {
  it('escapes ampersands', () => expect(escape('a & b')).toBe('a &amp; b'))
  it('escapes less-than', () => expect(escape('a < b')).toBe('a &lt; b'))
  it('escapes greater-than', () => expect(escape('a > b')).toBe('a &gt; b'))
  it('escapes double quotes', () => expect(escape('a "b"')).toBe('a &quot;b&quot;'))
  it('handles numbers without escaping', () => expect(escape(123)).toBe('123'))
  it('handles null', () => expect(escape(null)).toBe(''))
  it('handles undefined', () => expect(escape(undefined)).toBe(''))
})

describe('escapeAttr', () => {
  it('escapes all HTML chars plus quotes', () => {
    expect(escapeAttr('a < b > "c" &')).toBe('a &lt; b &gt; &quot;c&quot; &amp;')
  })
  it('handles empty string', () => expect(escapeAttr('')).toBe(''))
})

describe('getByPath', () => {
  const obj = { a: { b: { c: 42 }, x: null }, z: 'top' }
  
  it('resolves simple path', () => expect(getByPath(obj, 'z')).toBe('top'))
  it('resolves nested path', () => expect(getByPath(obj, 'a.b.c')).toBe(42))
  it('returns null for missing intermediate', () => expect(getByPath(obj, 'a.missing.c')).toBe(null))
  it('returns null for missing path', () => expect(getByPath(obj, 'nonexistent')).toBe(null))
  it('returns null for empty path', () => expect(getByPath(obj, '')).toBe(null))
  it('handles array index in path', () => {
    const arr = { items: [{ id: 1 }, { id: 2 }] }
    expect(getByPath(arr, 'items.0.id')).toBe(1)
    expect(getByPath(arr, 'items.1.id')).toBe(2)
  })
})

describe('resolveBindings', () => {
  const snapshot = { resources: { gold: 1420 }, hero: { name: 'Alice', level: 5 }, count: 0 }

  it('resolves single binding', () => {
    expect(resolveBindings('Gold: {{resources.gold}}', snapshot)).toBe('Gold: 1420')
  })

  it('resolves multiple bindings', () => {
    expect(resolveBindings('{{hero.name}} - Lv.{{hero.level}}', snapshot)).toBe('Alice - Lv.5')
  })

  it('escapes HTML in resolved values', () => {
    const snap = { ...snapshot, hero: { ...snapshot.hero, name: '<script>alert("xss")</script>' } }
    expect(resolveBindings('{{hero.name}}', snap)).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;')
  })

  it('renders missing bindings as empty string', () => {
    expect(resolveBindings('Missing: {{nonexistent.path}}', snapshot)).toBe('Missing: ')
  })

  it('renders null values as empty string', () => {
    expect(resolveBindings('Null: {{resources.x}}', { resources: { x: null } })).toBe('Null: ')
  })

  it('renders undefined values as empty string', () => {
    expect(resolveBindings('Undefined: {{foo}}', {})).toBe('Undefined: ')
  })

  it('preserves text outside bindings', () => {
    expect(resolveBindings('Prefix {{a}} middle {{b}} suffix', { a: 1, b: 2 })).toBe('Prefix 1 middle 2 suffix')
  })

  it('handles whitespace in bindings', () => {
    expect(resolveBindings('{{ resources.gold }}', snapshot)).toBe('1420')
  })
})

describe('styleStr', () => {
  it('converts style object to CSS string', () => {
    expect(styleStr({ color: 'red', fontSize: '12px' })).toBe('color:red;fontSize:12px')
  })

  it('returns empty string for null/undefined', () => {
    expect(styleStr(null)).toBe('')
    expect(styleStr(undefined)).toBe('')
  })

  it('returns empty string for non-object', () => {
    expect(styleStr('string')).toBe('')
    expect(styleStr(123)).toBe('')
  })
})

describe('widgetToHTML', () => {
  const snapshot = { resources: { gold: 100 }, hero: { name: 'Alice', level: 5 }, value: 42 }

  describe('container widgets', () => {
    it('renders vbox with children', () => {
      const vbox = { type: 'vbox', children: [{ type: 'label', text: 'Hello' }] }
      expect(widgetToHTML(vbox, snapshot, () => {})).toContain('widget-vbox')
      expect(widgetToHTML(vbox, snapshot, () => {})).toContain('Hello')
    })

    it('renders hbox with children', () => {
      const hbox = { type: 'hbox', children: [{ type: 'label', text: 'A' }] }
      expect(widgetToHTML(hbox, snapshot, () => {})).toContain('widget-hbox')
    })

    it('renders stack with children', () => {
      const stack = { type: 'stack', children: [{ type: 'label', text: 'Layered' }] }
      expect(widgetToHTML(stack, snapshot, () => {})).toContain('widget-stack')
    })

    it('renders grid with children', () => {
      const grid = { type: 'grid', children: [{ type: 'label', text: 'Cell' }] }
      expect(widgetToHTML(grid, snapshot, () => {})).toContain('widget-grid')
    })

    it('applies gap between children', () => {
      const vbox = { type: 'vbox', gap: 16, children: [{ type: 'label', text: 'A' }, { type: 'label', text: 'B' }] }
      const html = widgetToHTML(vbox, snapshot, () => {})
      expect(html).toContain('width:16px')
    })

    it('applies align property', () => {
      const vbox = { type: 'vbox', align: 'center', children: [] }
      expect(widgetToHTML(vbox, snapshot, () => {})).toContain('align-items:center')
    })

    it('applies style overrides', () => {
      const vbox = { type: 'vbox', style: { padding: '10px', background: 'blue' }, children: [] }
      expect(widgetToHTML(vbox, snapshot, () => {})).toContain('padding:10px')
      expect(widgetToHTML(vbox, snapshot, () => {})).toContain('background:blue')
    })
  })

describe('display widgets', () => {
  it('renders label with text content', () => {
    const label = { type: 'label', text: 'Hello World', id: 'test' }
    expect(widgetToHTML(label, snapshot, () => {})).toContain('class="widget-label"')
    expect(widgetToHTML(label, snapshot, () => {})).toContain('Hello World')
  })

  it('renders label with bindings', () => {
    const label = { type: 'label', text: 'Gold: {{resources.gold}}', id: 'test' }
    expect(widgetToHTML(label, snapshot, () => {})).toContain('Gold: 100')
  })

    it('renders label with style', () => {
      const label = { type: 'label', text: 'Styled', style: { color: 'red' } }
      expect(widgetToHTML(label, snapshot, () => {})).toContain('color:red')
    })

    it('renders progressbar with value', () => {
      const bar = { type: 'progressbar', value: 50, max: 100 }
      const html = widgetToHTML(bar, snapshot, () => {})
      expect(html).toContain('widget-progressbar')
      expect(html).toContain('width:50%')
    })

    it('renders progressbar with binding', () => {
      const bar = { type: 'progressbar', value: '{{value}}', max: 100 }
      const html = widgetToHTML(bar, { value: 75 }, () => {})
      expect(html).toContain('width:75%')
    })

    it('renders image with src', () => {
      const img = { type: 'image', src: 'test.png', width: 100, height: 50 }
      expect(widgetToHTML(img, snapshot, () => {})).toContain('src="test.png"')
      expect(widgetToHTML(img, snapshot, () => {})).toContain('width="100"')
    })

    it('renders image with style', () => {
      const img = { type: 'image', src: 'test.png', style: { borderRadius: '50%' } }
      expect(widgetToHTML(img, snapshot, () => {})).toContain('borderRadius:50%')
    })

    it('renders spacer with dimensions', () => {
      const spacer = { type: 'spacer', width: 20, height: 10 }
      const html = widgetToHTML(spacer, snapshot, () => {})
      expect(html).toContain('width:20px')
      expect(html).toContain('height:10px')
    })

    it('renders spacer with defaults', () => {
      const spacer = { type: 'spacer' }
      const html = widgetToHTML(spacer, snapshot, () => {})
      expect(html).toContain('width:0px')
      expect(html).toContain('height:0px')
    })
  })

  describe('interactive widgets', () => {
    it('renders textbutton with action', () => {
      const btn = { type: 'textbutton', label: 'Click Me', action: 'doSomething' }
      const html = widgetToHTML(btn, snapshot, () => {})
      expect(html).toContain('widget-textbutton')
      expect(html).toContain('data-action="doSomething"')
      expect(html).toContain('Click Me')
    })

    it('renders textbutton with icon', () => {
      const btn = { type: 'textbutton', label: 'Save', icon: '💾', action: 'save' }
      const html = widgetToHTML(btn, snapshot, () => {})
      expect(html).toContain('💾')
      expect(html).toContain('Save')
    })

    it('escapes label text', () => {
      const btn = { type: 'textbutton', label: '<script>alert("xss")</script>', action: 'x' }
      const html = widgetToHTML(btn, snapshot, () => {})
      expect(html).not.toContain('<script>')
      expect(html).toContain('&lt;script&gt;')
    })

    it('escapes action attribute', () => {
      const btn = { type: 'textbutton', label: 'Test', action: 'a" onclick="alert(1)' }
      const html = widgetToHTML(btn, snapshot, () => {})
      // Verify quotes are escaped to prevent attribute breakout
      expect(html).toContain('&quot;')
      // Verify onclick is properly escaped as part of the string
      expect(html).toContain('onclick=&quot;')
    })

    it('renders iconbutton with icon', () => {
      const btn = { type: 'iconbutton', icon: '⚔️', action: 'attack' }
      const html = widgetToHTML(btn, snapshot, () => {})
      expect(html).toContain('widget-iconbutton')
      expect(html).toContain('data-action="attack"')
      expect(html).toContain('⚔️')
    })

    it('renders textinput with placeholder', () => {
      const input = { type: 'textinput', placeholder: 'Enter name...' }
      const html = widgetToHTML(input, snapshot, () => {})
      expect(html).toContain('widget-textinput')
      expect(html).toContain('placeholder="Enter name..."')
    })

    it('renders textinput with binding', () => {
      const input = { type: 'textinput', binding: 'hero.name' }
      const html = widgetToHTML(input, snapshot, () => {})
      expect(html).toContain('value="Alice"')
    })
  })

  describe('error handling', () => {
    it('renders unknown widget type as comment', () => {
      const unknown = { type: 'unknown-widget' }
      expect(widgetToHTML(unknown, snapshot, () => {})).toContain('unknown widget type: unknown-widget')
    })

    it('renders null widget as comment', () => {
      expect(widgetToHTML(null, snapshot, () => {})).toContain('unknown widget')
    })

    it('renders widget without type as comment', () => {
      expect(widgetToHTML({}, snapshot, () => {})).toContain('unknown widget')
    })
  })
})

describe('renderScreenToHTML', () => {
  beforeEach(() => {
    // Clear registry between tests
    screenRegistry.clear()
  })

  it('returns empty string for unregistered screen', () => {
    expect(renderScreenToHTML('nonexistent', {}, () => {})).toBe('')
  })

  it('renders screen with layout config', () => {
    defineScreen('test-screen', {
      id: 'test-screen',
      name: 'Test Screen',
      layout: { type: 'vbox', children: [{ type: 'label', text: 'Hello' }] }
    })
    
    const html = renderScreenToHTML('test-screen', {}, () => {})
    expect(html).toContain('screen-test-screen')
    expect(html).toContain('Hello')
  })

  it('applies screen-level style', () => {
    defineScreen('styled-screen', {
      id: 'styled-screen',
      name: 'Styled',
      layout: { type: 'vbox', children: [] },
      style: { background: '#111', padding: '20px' }
    })
    
    const html = renderScreenToHTML('styled-screen', {}, () => {})
    expect(html).toContain('background:#111')
    expect(html).toContain('padding:20px')
  })

  it('renders nested widget tree', () => {
    defineScreen('nested-screen', {
      id: 'nested-screen',
      name: 'Nested',
      layout: {
        type: 'vbox',
        children: [
          { type: 'label', text: 'Title' },
          {
            type: 'hbox',
            children: [
              { type: 'textbutton', label: 'A', action: 'actionA' },
              { type: 'textbutton', label: 'B', action: 'actionB' },
            ]
          }
        ]
      }
    })
    
    const html = renderScreenToHTML('nested-screen', {}, () => {})
    expect(html).toContain('Title')
    expect(html).toContain('data-action="actionA"')
    expect(html).toContain('data-action="actionB"')
  })

  it('resolves bindings in nested widgets', () => {
    defineScreen('binding-screen', {
      id: 'binding-screen',
      name: 'Binding Test',
      layout: {
        type: 'vbox',
        children: [
          { type: 'label', text: 'Gold: {{resources.gold}}' },
          { type: 'textbutton', label: 'Spend {{resources.gold}}', action: 'spend' }
        ]
      }
    })
    
    const snapshot = { resources: { gold: 500 } }
    const html = renderScreenToHTML('binding-screen', snapshot, () => {})
    expect(html).toContain('Gold: 500')
    expect(html).toContain('Spend 500')
  })
})
