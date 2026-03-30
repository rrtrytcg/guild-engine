import { describe, it, expect, beforeEach } from 'vitest'
import {
  escape,
  escapeAttr,
  getByPath,
  resolveBindings,
  styleStr,
  widgetToHTML,
  renderScreenToHTML
} from '../../engine/layoutEngine.js'

describe('escape', () => {
  it('escapes ampersand', () => {
    expect(escape('foo & bar')).toBe('foo &amp; bar')
  })

  it('escapes less-than', () => {
    expect(escape('a < b')).toBe('a &lt; b')
  })

  it('escapes greater-than', () => {
    expect(escape('a > b')).toBe('a &gt; b')
  })

  it('escapes double quotes', () => {
    expect(escape('say "hello"')).toBe('say &quot;hello&quot;')
  })

  it('escapes numbers as strings', () => {
    expect(escape('42')).toBe('42')
    expect(escape('3.14')).toBe('3.14')
  })

  it('handles null input', () => {
    expect(escape(null)).toBe('')
  })

  it('handles undefined input', () => {
    expect(escape(undefined)).toBe('')
  })
})

describe('escapeAttr', () => {
  it('escapes ampersand', () => {
    expect(escapeAttr('foo & bar')).toBe('foo &amp; bar')
  })

  it('escapes less-than', () => {
    expect(escapeAttr('a < b')).toBe('a &lt; b')
  })

  it('escapes greater-than', () => {
    expect(escapeAttr('a > b')).toBe('a &gt; b')
  })

  it('escapes double quotes', () => {
    expect(escapeAttr('say "hello"')).toBe('say &quot;hello&quot;')
  })

  it('escapes single quotes', () => {
    expect(escapeAttr("say 'hello'")).toBe("say &#39;hello&#39;")
  })

  it('handles empty string', () => {
    expect(escapeAttr('')).toBe('')
  })

  it('handles numbers', () => {
    expect(escapeAttr(42)).toBe('42')
  })
})

describe('getByPath', () => {
  const testObj = {
    name: 'test',
    nested: {
      value: 42,
      deep: {
        color: 'blue'
      }
    },
    items: ['a', 'b', 'c']
  }

  it('resolves simple path', () => {
    expect(getByPath(testObj, 'name')).toBe('test')
  })

  it('resolves nested path', () => {
    expect(getByPath(testObj, 'nested.value')).toBe(42)
  })

  it('resolves deeply nested path', () => {
    expect(getByPath(testObj, 'nested.deep.color')).toBe('blue')
  })

  it('returns undefined for missing intermediate path', () => {
    expect(getByPath(testObj, 'nonexistent.value')).toBeUndefined()
  })

  it('returns undefined for missing path', () => {
    expect(getByPath(testObj, 'name.foo')).toBeUndefined()
  })

  it('returns undefined for empty path', () => {
    expect(getByPath(testObj, '')).toBeUndefined()
  })

  it('resolves array index', () => {
    expect(getByPath(testObj, 'items.0')).toBe('a')
    expect(getByPath(testObj, 'items.1')).toBe('b')
    expect(getByPath(testObj, 'items.2')).toBe('c')
  })

  it('returns undefined for out of bounds index', () => {
    expect(getByPath(testObj, 'items.10')).toBeUndefined()
  })
})

describe('resolveBindings', () => {
  it('resolves single binding', () => {
    const result = resolveBindings('Hello {{name}}!', { name: 'World' })
    expect(result).toBe('Hello World!')
  })

  it('resolves multiple bindings', () => {
    const result = resolveBindings('{{greeting}} {{name}}', { greeting: 'Hi', name: 'there' })
    expect(result).toBe('Hi there')
  })

  it('escapes HTML in binding values', () => {
    const result = resolveBindings('{{html}}', { html: '<script>alert("xss")</script>' })
    expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;')
  })

  it('handles missing bindings', () => {
    const result = resolveBindings('Hello {{name}}!', {})
    expect(result).toBe('Hello !')
  })

  it('handles null bindings', () => {
    const result = resolveBindings('Value: {{val}}', { val: null })
    expect(result).toBe('Value: ')
  })

  it('handles undefined bindings', () => {
    const result = resolveBindings('Value: {{val}}', { val: undefined })
    expect(result).toBe('Value: ')
  })

  it('preserves text outside bindings', () => {
    const result = resolveBindings('Prefix {{val}} Suffix', { val: 'test' })
    expect(result).toBe('Prefix test Suffix')
  })

  it('handles whitespace in bindings', () => {
    const result = resolveBindings('{{ name }}', { name: 'test' })
    expect(result).toBe('test')
  })

  it('handles multiple consecutive bindings', () => {
    const result = resolveBindings('{{a}}{{b}}{{c}}', { a: '1', b: '2', c: '3' })
    expect(result).toBe('123')
  })
})

describe('styleStr', () => {
  it('converts object to CSS string', () => {
    const styles = { color: 'red', fontSize: '14px', marginTop: '10px' }
    expect(styleStr(styles)).toBe('color:red;font-size:14px;margin-top:10px;')
  })

  it('handles camelCase property conversion', () => {
    const styles = { backgroundColor: 'blue', fontWeight: 'bold' }
    expect(styleStr(styles)).toBe('background-color:blue;font-weight:bold;')
  })

  it('returns empty string for null', () => {
    expect(styleStr(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(styleStr(undefined)).toBe('')
  })

  it('returns empty string for non-object', () => {
    expect(styleStr('string')).toBe('')
    expect(styleStr(123)).toBe('')
  })
})

describe('widgetToHTML', () => {
  describe('container widgets', () => {
    it('renders vbox with children', () => {
      const widget = {
        type: 'vbox',
        children: [
          { type: 'label', text: 'First' },
          { type: 'label', text: 'Second' }
        ]
      }
      const result = widgetToHTML(widget, {})
      expect(result).toContain('display:flex')
      expect(result).toContain('flex-direction:column')
      expect(result).toContain('First')
      expect(result).toContain('Second')
    })

    it('renders hbox with children', () => {
      const widget = {
        type: 'hbox',
        children: [
          { type: 'label', text: 'Left' },
          { type: 'label', text: 'Right' }
        ]
      }
      const result = widgetToHTML(widget, {})
      expect(result).toContain('display:flex')
      expect(result).toContain('flex-direction:row')
      expect(result).toContain('Left')
      expect(result).toContain('Right')
    })

    it('renders grid with children', () => {
      const widget = {
        type: 'grid',
        children: [
          { type: 'label', text: 'Cell1' },
          { type: 'label', text: 'Cell2' }
        ]
      }
      const result = widgetToHTML(widget, {})
      expect(result).toContain('display:grid')
    })

    it('renders stack with children', () => {
      const widget = {
        type: 'stack',
        children: [
          { type: 'label', text: 'Top' }
        ]
      }
      const result = widgetToHTML(widget, {})
      expect(result).toContain('position:relative')
    })

    it('applies gap to container', () => {
      const widget = {
        type: 'hbox',
        gap: 8,
        children: [{ type: 'label', text: 'A' }]
      }
      const result = widgetToHTML(widget, {})
      expect(result).toContain('gap:8px')
    })

    it('applies align to container', () => {
      const widget = {
        type: 'hbox',
        align: 'center',
        children: [{ type: 'label', text: 'A' }]
      }
      const result = widgetToHTML(widget, {})
      expect(result).toContain('align-items:center')
    })

    it('applies style to container', () => {
      const widget = {
        type: 'vbox',
        style: { backgroundColor: 'gray' },
        children: [{ type: 'label', text: 'A' }]
      }
      const result = widgetToHTML(widget, {})
      expect(result).toContain('background-color:gray')
    })
  })

  describe('display widgets', () => {
    it('renders label with text', () => {
      const widget = { type: 'label', text: 'Hello World' }
      const result = widgetToHTML(widget, {})
      expect(result).toContain('Hello World')
    })

    it('renders label with bindings', () => {
      const widget = { type: 'label', text: '{{message}}' }
      const snapshot = { message: 'Hello World' }
      const result = widgetToHTML(widget, snapshot)
      expect(result).toContain('Hello World')
    })

    it('renders label with style', () => {
      const widget = {
        type: 'label',
        text: 'Styled',
        style: { color: 'blue', fontSize: '16px' }
      }
      const result = widgetToHTML(widget, {})
      expect(result).toContain('color:blue')
      expect(result).toContain('font-size:16px')
    })

    it('renders progressbar with value', () => {
      const widget = { type: 'progressbar', value: 50 }
      const result = widgetToHTML(widget, {})
      expect(result).toContain('width:50%')
      expect(result).toContain('role="progressbar"')
    })

    it('renders progressbar with binding', () => {
      const widget = { type: 'progressbar', value: '{{progress}}' }
      const snapshot = { progress: 75 }
      const result = widgetToHTML(widget, snapshot)
      expect(result).toContain('width:75%')
    })

    it('renders image with src', () => {
      const widget = { type: 'image', src: 'test.png' }
      const result = widgetToHTML(widget, {})
      expect(result).toContain('src="test.png"')
      expect(result).toContain('img')
    })

    it('renders image with style', () => {
      const widget = {
        type: 'image',
        src: 'test.png',
        style: { width: '100px', height: '100px' }
      }
      const result = widgetToHTML(widget, {})
      expect(result).toContain('style="')
      expect(result).toContain('width:100px')
    })

    it('renders spacer with dimensions', () => {
      const widget = { type: 'spacer', width: 50, height: 20 }
      const result = widgetToHTML(widget, {})
      expect(result).toContain('width:50px')
      expect(result).toContain('height:20px')
    })
  })

  describe('interactive widgets', () => {
    it('renders textbutton with action', () => {
      const widget = { type: 'textbutton', text: 'Click me', action: 'onClick' }
      const result = widgetToHTML(widget, {})
      expect(result).toContain('Click me')
      expect(result).toContain('onClick')
    })

    it('renders textbutton with icon', () => {
      const widget = { type: 'textbutton', text: 'Save', icon: 'save-icon' }
      const result = widgetToHTML(widget, {})
      expect(result).toContain('Save')
      expect(result).toContain('save-icon')
    })

    it('renders iconbutton', () => {
      const widget = { type: 'iconbutton', icon: 'settings', action: 'openSettings' }
      const result = widgetToHTML(widget, {})
      expect(result).toContain('iconbutton')
      expect(result).toContain('settings')
    })

    it('renders textinput with placeholder', () => {
      const widget = { type: 'textinput', placeholder: 'Enter text...' }
      const result = widgetToHTML(widget, {})
      expect(result).toContain('placeholder="Enter text..."')
      expect(result).toContain('input')
    })

    it('renders textinput with binding', () => {
      const widget = { type: 'textinput', value: '{{inputValue}}' }
      const snapshot = { inputValue: 'user input' }
      const result = widgetToHTML(widget, snapshot)
      expect(result).toContain('value="user input"')
    })
  })

  describe('error handling', () => {
    it('handles unknown type gracefully', () => {
      const widget = { type: 'unknowntype' }
      const result = widgetToHTML(widget, {})
      expect(result).toBe('')
    })

    it('handles null widget', () => {
      const result = widgetToHTML(null, {})
      expect(result).toBe('')
    })

    it('handles no type property', () => {
      const widget = { text: 'test' }
      const result = widgetToHTML(widget, {})
      expect(result).toBe('')
    })
  })
})

describe('renderScreenToHTML', () => {
  beforeEach(() => {
    // Clear screen registry before each test
    const { screenRegistry } = require('../../../engine/layoutEngine.js')
    Object.keys(screenRegistry).forEach(key => delete screenRegistry[key])
  })

  it('returns empty for unregistered screen', () => {
    const result = renderScreenToHTML('nonexistent', {})
    expect(result).toBe('')
  })

  it('renders screen with layout config', () => {
    const { defineScreen } = require('../../../engine/layoutEngine.js')
    defineScreen('testScreen', {
      layout: {
        type: 'vbox',
        children: [{ type: 'label', text: 'Content' }]
      }
    })
    const result = renderScreenToHTML('testScreen', {})
    expect(result).toContain('Content')
  })

  it('applies screen-level style', () => {
    const { defineScreen } = require('../../../engine/layoutEngine.js')
    defineScreen('styledScreen', {
      style: { backgroundColor: 'black' },
      layout: { type: 'label', text: 'Test' }
    })
    const result = renderScreenToHTML('styledScreen', {})
    expect(result).toContain('background-color:black')
  })

  it('renders nested widget tree', () => {
    const { defineScreen } = require('../../../engine/layoutEngine.js')
    defineScreen('nestedScreen', {
      layout: {
        type: 'vbox',
        children: [
          {
            type: 'hbox',
            children: [
              { type: 'label', text: 'Nested' }
            ]
          }
        ]
      }
    })
    const result = renderScreenToHTML('nestedScreen', {})
    expect(result).toContain('Nested')
    expect(result).toContain('display:flex')
  })

  it('resolves bindings in nested widgets', () => {
    const { defineScreen } = require('../../../engine/layoutEngine.js')
    defineScreen('bindingScreen', {
      layout: {
        type: 'vbox',
        children: [
          { type: 'label', text: '{{title}}' },
          { type: 'progressbar', value: '{{progress}}' }
        ]
      }
    })
    const snapshot = { title: 'My Title', progress: 80 }
    const result = renderScreenToHTML('bindingScreen', snapshot)
    expect(result).toContain('My Title')
    expect(result).toContain('width:80%')
  })
})
