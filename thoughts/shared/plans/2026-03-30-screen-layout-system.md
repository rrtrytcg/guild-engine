# Declarative Screen/Layout Definition System — Implementation Plan

**Date:** 2026-03-30
**Topic:** screen-layout-system
**Goal:** Add a `defineScreen(name, layoutConfig)` API and layout engine that coexists with existing `renderWorldScreen`/`renderExpeditionScreen`/`renderForgeScreenV2` during transition.

**Architecture:** Data-driven layout system where projects supply JSON layout configs; engine stores them in `screenRegistry` and renders via `layoutEngine` that walks widget tree, resolves `{{bindings}}` against snapshot, and emits HTML via `innerHTML`.

**Constraint:** Must maintain backward compatibility — existing `project.json` (without `screens` array) continues to work unchanged. Existing render functions remain as fallbacks.

---

## Dependency Graph

```
Batch 1 (parallel): 1.1, 1.2, 1.3, 1.4 [foundation - no deps]
Batch 2 (parallel): 2.1, 2.2 [integration into engine.js and bootstrap.js - depends on 1.1]
Batch 3 (serial):   3.1 [index.html integration - depends on 1.1, 2.1, 2.2]
Batch 4 (serial):   4.1 [schema update for screens - depends on all]
```

---

## Batch 1: Foundation (parallel - 4 implementers)

All tasks in this batch have NO dependencies and run simultaneously.

### Task 1.1: Layout Engine Core
**File:** `C:\Games\IRMM\guild-engine\engine\layoutEngine.js`
**Test:** `C:\Games\IRMM\guild-engine\editor\tests\layoutEngine.test.js`
**Depends:** none

**Design requires:**
- `renderScreenToHTML(screenName, snapshot, actionHandler)` - main entry point
- `widgetToHTML(widget, snapshot, actionHandler, depth)` - recursive widget renderer
- `resolveBindings(template, snapshot)` - resolves `{{path}}` syntax
- `getByPath(obj, path)` - nested path access
- `escape(str)` - HTML escaping for text content
- `escapeAttr(str)` - HTML escaping for attribute values
- `styleStr(style)` - converts style object to CSS string

**Complete implementation:**

```javascript
// C:\Games\IRMM\guild-engine\engine\layoutEngine.js

/**
 * Screen registry - populated by defineScreen() at bootstrap
 * @type {Map<string, object>}
 */
export const screenRegistry = new Map()

/**
 * Define a screen with its layout configuration
 * @param {string} name - Screen identifier
 * @param {object} config - Screen configuration object
 */
export function defineScreen(name, config) {
  screenRegistry.set(name, config)
}

/**
 * Retrieve a registered screen configuration
 * @param {string} name - Screen identifier
 * @returns {object|null}
 */
export function getScreen(name) {
  return screenRegistry.get(name) ?? null
}

/**
 * Escape HTML special characters for text content
 * @param {string} str
 * @returns {string}
 */
export function escape(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Escape HTML special characters for attribute values
 * @param {string} str
 * @returns {string}
 */
export function escapeAttr(str) {
  return escape(str).replace(/"/g, '&quot;')
}

/**
 * Convert style object to CSS string
 * @param {Record<string, string>|undefined} style
 * @returns {string}
 */
export function styleStr(style) {
  if (!style || typeof style !== 'object') return ''
  return Object.entries(style)
    .map(([k, v]) => `${k}:${v}`)
    .join(';')
}

/**
 * Get nested value from object by dot-notation path
 * @param {object} obj
 * @param {string} path
 * @returns {*}
 */
export function getByPath(obj, path) {
  return path.split('.').reduce((o, k) => (o ?? {})[k], obj)
}

/**
 * Resolve {{bindings}} in template string against snapshot
 * @param {string} template
 * @param {object} snapshot
 * @returns {string}
 */
export function resolveBindings(template, snapshot) {
  return String(template).replace(/\{\{([^}]+)\}\}/g, (_, path) => {
    const value = getByPath(snapshot, path.trim())
    return value == null ? '' : escape(String(value))
  })
}

/**
 * Render a container widget (vbox, hbox, grid, stack)
 * @param {object} widget
 * @param {object} snapshot
 * @param {Function} actionHandler
 * @param {number} depth
 * @returns {string}
 */
function renderContainer(widget, snapshot, actionHandler, depth) {
  const { type, children = [], gap = 8, align = 'start', style } = widget
  const displayType = type === 'grid' ? 'grid' : 'flex'
  const flexDirection = type === 'vbox' ? 'column' : type === 'hbox' ? 'row' : 'column'
  const alignItems = align === 'center' ? 'center' : align === 'end' ? 'flex-end' : 'flex-start'
  
  const childHtml = children
    .map((child) => widgetToHTML(child, snapshot, actionHandler, depth + 1))
    .join(`<div style="width:${gap}px;height:0;flex-shrink:0"></div>`)
  
  return `<div class="widget-${type}" style="display:${displayType};flex-direction:${flexDirection};align-items:${alignItems};${styleStr(style)}">${childHtml}</div>`
}

/**
 * Render a progressbar widget
 * @param {object} widget
 * @param {object} snapshot
 * @returns {string}
 */
function renderProgressbar(widget, snapshot) {
  const value = resolveBindings(String(widget.value ?? 0), snapshot)
  const max = widget.max ?? 100
  const pct = Math.max(0, Math.min(100, (Number(value) / Number(max)) * 100))
  const color = widget.color ?? '#7F77DD'
  
  return `<div class="widget-progressbar" style="${styleStr(widget.style)}">
    <div class="progress-bar-outer" style="height:${widget.height ?? 6}px">
      <div class="progress-bar-inner" style="width:${pct}%;background:${color}"></div>
    </div>
  </div>`
}

/**
 * Render any widget to HTML string
 * @param {object} widget
 * @param {object} snapshot
 * @param {Function} actionHandler
 * @param {number} depth
 * @returns {string}
 */
export function widgetToHTML(widget, snapshot, actionHandler, depth = 0) {
  if (!widget || !widget.type) {
    return `<!-- unknown widget: ${JSON.stringify(widget)} -->`
  }

  switch (widget.type) {
    case 'vbox':
    case 'hbox':
    case 'grid':
    case 'stack':
      return renderContainer(widget, snapshot, actionHandler, depth)

    case 'label':
      return `<span class="widget-label" style="${styleStr(widget.style)}">${resolveBindings(widget.text ?? '', snapshot)}</span>`

    case 'textbutton':
      return `<button class="widget-textbutton" data-action="${escapeAttr(widget.action ?? '')}" style="${styleStr(widget.style)}">${widget.icon ? widget.icon + ' ' : ''}${escape(widget.label ?? '')}</button>`

    case 'iconbutton':
      return `<button class="widget-iconbutton" data-action="${escapeAttr(widget.action ?? '')}" style="${styleStr(widget.style)}">${escape(widget.icon ?? '')}</button>`

    case 'textinput':
      return `<input class="widget-textinput" type="text" placeholder="${escapeAttr(widget.placeholder ?? '')}" value="${escapeAttr(widget.binding ? String(getByPath(snapshot, widget.binding) ?? '') : '')}" style="${styleStr(widget.style)}" />`

    case 'progressbar':
      return renderProgressbar(widget, snapshot)

    case 'image':
      return `<img class="widget-image" src="${escapeAttr(widget.src ?? '')}" width="${widget.width ?? ''}" height="${widget.height ?? ''}" style="${styleStr(widget.style)}" loading="lazy" />`

    case 'spacer':
      return `<div class="widget-spacer" style="width:${widget.width ?? 0}px;height:${widget.height ?? 0}px"></div>`

    default:
      return `<!-- unknown widget type: ${widget.type} -->`
  }
}

/**
 * Render a registered screen to HTML
 * @param {string} screenName
 * @param {object} snapshot
 * @param {Function} actionHandler
 * @returns {string}
 */
export function renderScreenToHTML(screenName, snapshot, actionHandler) {
  const config = getScreen(screenName)
  if (!config) {
    console.warn(`Screen "${screenName}" not found in registry`)
    return ''
  }

  const layout = config.layout ?? config
  if (!layout || !layout.type) {
    console.warn(`Screen "${screenName}" has no valid layout`)
    return ''
  }

  const containerStyle = styleStr(config.style ?? {})
  const screenId = `screen-${screenName}`
  
  return `<div id="${screenId}" class="widget-screen" style="${containerStyle}">${widgetToHTML(layout, snapshot, actionHandler, 0)}</div>`
}
```

**Verify:** `cd editor && npm test -- tests/layoutEngine.test.js`
**Commit:** `feat(engine): add layout engine for declarative screens`

---

### Task 1.2: Layout Engine Unit Tests
**File:** `C:\Games\IRMM\guild-engine\editor\tests\layoutEngine.test.js`
**Test:** N/A (this IS the test file)
**Depends:** none (but tested against 1.1)

```javascript
// C:\Games\IRMM\guild-engine\editor\tests\layoutEngine.test.js
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
} from '../../../engine/layoutEngine.js'

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
  it('returns null for empty path', () => expect(getByPath(obj, '')).toBe(obj))
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
  const snapshot = { resources: { gold: 100 }, value: 42 }

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
      const label = { type: 'label', text: 'Hello World' }
      expect(widgetToHTML(label, snapshot, () => {})).toBe('<span class="widget-label">Hello World</span>')
    })

    it('renders label with bindings', () => {
      const label = { type: 'label', text: 'Gold: {{resources.gold}}' }
      expect(widgetToHTML(label, snapshot, () => {})).toBe('<span class="widget-label">Gold: 100</span>')
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
      expect(html).toContain('Click Me')
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
      expect(html).not.toContain('onclick')
      expect(html).toContain('&quot;')
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
    // Clear registry between tests by getting fresh module state
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
```

**Verify:** `cd editor && npm test -- tests/layoutEngine.test.js`
**Commit:** `test(engine): add layout engine unit tests`

---

### Task 1.3: Add screenRegistry to engine.js
**File:** `C:\Games\IRMM\guild-engine\engine\engine.js`
**Test:** none (modifies existing file)
**Depends:** none

**Changes to make:**

1. Add import after existing imports (around line 1-12):

```javascript
// Screen registry - populated by defineScreen() at bootstrap
import { screenRegistry, defineScreen as engineDefineScreen, getScreen as engineGetScreen } from './layoutEngine.js'
```

2. Re-export the functions in the `EngineRuntime` class (around line 19, add after `this.tickMs = tickMs`):

```javascript
// Re-export screen registry functions for external use
this.defineScreen = engineDefineScreen
this.getScreen = engineGetScreen
```

3. Add to the exports at the bottom of the file (after existing exports):

```javascript
// Screen layout system exports
export { screenRegistry, defineScreen, getScreen, renderScreenToHTML, widgetToHTML } from './layoutEngine.js'
```

**Verify:** `grep -n "screenRegistry\|defineScreen\|getScreen" engine/engine.js`
**Commit:** `feat(engine): export screen registry functions from engine.js`

---

### Task 1.4: Add screen registration to bootstrap.js
**File:** `C:\Games\IRMM\guild-engine\engine\systems\bootstrap.js`
**Test:** none (modifies existing file)
**Depends:** 1.3

**Read first:** `C:\Games\IRMM\guild-engine\engine\systems\bootstrap.js`

**Changes to make:**

Find the `bootstrapState` function. After the state object is created and all properties are set, but before the return statement, add:

```javascript
// Register declarative screens from project config
if (project.screens && Array.isArray(project.screens)) {
  for (const screen of project.screens) {
    if (screen.id && screen.layout) {
      engine.defineScreen(screen.id, screen.layout)
    }
  }
  // Populate ui.screens array for navigation
  state.ui.screens = project.screens.map(s => ({ id: s.id, name: s.name }))
}
```

The exact insertion point is after `state.ui = { ... }` block but before `return state`.

**Verify:** Read bootstrap.js after changes and confirm state.ui.screens structure
**Commit:** `feat(engine): register declarative screens from project.screens at bootstrap`

---

## Batch 2: Core Integration (parallel - 2 implementers)

### Task 2.1: Integrate layout engine into engine.js exports
**File:** `C:\Games\IRMM\guild-engine\engine\engine.js`
**Test:** none
**Depends:** 1.1, 1.3

**Ensure import of renderScreenToHTML is available in EngineRuntime:**

Add after the existing imports at the top of engine.js:

```javascript
import { renderScreenToHTML } from './layoutEngine.js'
```

Then add to `EngineRuntime` constructor:

```javascript
this.renderScreenToHTML = renderScreenToHTML
```

This allows engine.js to use `renderScreenToHTML` when handling declarative screens.

**Verify:** `grep -n "renderScreenToHTML" engine/engine.js`
**Commit:** `feat(engine): integrate renderScreenToHTML into EngineRuntime`

---

### Task 2.2: Verify bootstrap integration
**File:** `C:\Games\IRMM\guild-engine\engine\systems\bootstrap.js`
**Test:** none
**Depends:** 1.4

Ensure `state.ui.screens` is properly populated. The existing code from Task 1.4 should handle this. Verify that:

1. If `project.screens` exists and is an array, screens are registered via `engine.defineScreen()`
2. `state.ui.screens` is an array of `{ id, name }` objects
3. If `project.screens` is missing or not an array, the behavior is unchanged

**Verify:** Read bootstrap.js and confirm the screen registration logic
**Commit:** `fix(engine): ensure ui.screens populated correctly at bootstrap`

---

## Batch 3: HTML Integration (serial - 1 implementer)

### Task 3.1: Integrate layout engine into index.html
**File:** `C:\Games\IRMM\guild-engine\engine\index.html`
**Test:** none (manual verification)
**Depends:** 1.1, 2.1, 2.2

**Changes (in order):**

#### 3.1.1: Add CSS classes for widget types
Add before `</style>` closing tag (around line 117):

```css
/* ── Declarative Screen Widgets ── */
.widget-screen { display: flex; flex-direction: column; height: 100%; }
.widget-vbox { display: flex; flex-direction: column; }
.widget-hbox { display: flex; flex-direction: row; }
.widget-stack { display: flex; flex-direction: column; position: relative; }
.widget-grid { display: grid; }
.widget-label { color: #e0e0f0; font-size: 12px; }
.widget-textbutton { 
  border: none; border-radius: 7px; font-size: 11px; font-weight: 600; 
  padding: 5px 12px; cursor: pointer; background: #7F77DD; color: #fff;
  transition: opacity .1s;
}
.widget-textbutton:hover { background: #534AB7; opacity: 0.9; }
.widget-textbutton:disabled { opacity: 0.35; cursor: not-allowed; }
.widget-iconbutton {
  border: none; border-radius: 6px; width: 28px; height: 28px;
  cursor: pointer; background: #2a2a3e; color: #c0c0d8; font-size: 14px;
}
.widget-iconbutton:hover { background: #444460; color: #fff; }
.widget-textinput {
  border: 1px solid #2a2a3e; border-radius: 6px; background: #1a1a2e;
  color: #e0e0f0; padding: 6px 10px; font-size: 12px;
}
.widget-textinput:focus { outline: none; border-color: #7F77DD; }
.widget-progressbar { width: 100%; }
.widget-image { max-width: 100%; height: auto; }
.widget-spacer { flex-shrink: 0; }
```

#### 3.1.2: Add `#screen-content` container
Add after existing screen containers. Look for line 108 (after `<div id="screen-forge"></div>`) and add:

```html
<div id="screen-content" style="display:none"></div>
```

#### 3.1.3: Add imports and ACTION_HANDLERS mapping
In the `<script type="module">` section (around line 119), add after the engine.js import:

```javascript
import { renderScreenToHTML, screenRegistry } from './layoutEngine.js'

// Map action names to engine action handlers
// snake_case action names from widgets → camelCase engine actions
window.ACTION_HANDLERS = {}
for (const [key, fn] of Object.entries(engineActions)) {
  // Convert snake_case to camelCase for widget compatibility
  const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
  if (camelKey !== key) {
    window.ACTION_HANDLERS[camelKey] = fn
  }
  // Also keep original snake_case
  window.ACTION_HANDLERS[key] = fn
}
```

#### 3.1.4: Add event delegation listener
Add after the ACTION_HANDLERS setup:

```javascript
// Event delegation for declarative screen widgets
document.addEventListener('click', (e) => {
  const actionEl = e.target.closest('[data-action]')
  if (!actionEl) return
  const action = actionEl.dataset.action
  if (action && window.ACTION_HANDLERS && window.ACTION_HANDLERS[action]) {
    window.ACTION_HANDLERS[action](e)
  }
})
```

#### 3.1.5: Update render function to call declarative screen renderer
In the `render(s)` function (around line 581), modify to:

```javascript
function render(s) {
  renderResources(s)
  renderHeroesV2(s)
  renderHeroRecruitOffers(s)
  renderRecruitPool(s)
  renderEventLog(s)
  renderInventoryPanel(s)
  renderActs(s)
  renderNav(s)
  renderNotification(s)
  renderWorldScreen(s)
  if (detailUiState.activeTab === 'expedition') renderExpeditionScreen(s)
  if (detailUiState.activeTab === 'forge') renderForgeScreenV2(s)
  
  // Render declarative screens (backward compat: only if no legacy screen active)
  const el = document.getElementById('screen-content')
  if (!el) return
  
  // Only render declarative screen if the current screen is registered
  const screenName = s.ui.screen
  if (screenName && screenRegistry.has(screenName)) {
    el.style.display = 'flex'
    el.innerHTML = renderScreenToHTML(screenName, s, (action) => {
      if (window.ACTION_HANDLERS && window.ACTION_HANDLERS[action]) {
        window.ACTION_HANDLERS[action]()
      }
    })
  } else {
    el.style.display = 'none'
  }
}
```

**Verify:**
1. Load the engine with a project.json that has `screens` array
2. Navigate to a declarative screen and verify it renders correctly
3. Click buttons and verify actions fire correctly
4. Verify existing screens (world, expedition, forge) still work without `screens` in project.json

**Commit:** `feat(engine): integrate layout engine into index.html with event delegation`

---

## Batch 4: Schema and Documentation (serial)

### Task 4.1: Update project schema to include screens definition
**File:** `C:\Games\IRMM\guild-engine\schema\project.schema.json`
**Test:** none
**Depends:** All previous

**Read first:** `C:\Games\IRMM\guild-engine\schema\project.schema.json` (last ~600 lines to see properties section)

**Changes to make:**

Add the following definitions to the `definitions` section (around line 786, after `blueprint_meta`):

```json
"screen_widget": {
  "description": "A widget that can be placed in a screen layout.",
  "oneOf": [
    { "$ref": "#/definitions/container_widget" },
    { "$ref": "#/definitions/display_widget" },
    { "$ref": "#/definitions/interactive_widget" }
  ]
},
"container_widget": {
  "type": "object",
  "required": ["type", "children"],
  "properties": {
    "type": { "type": "string", "enum": ["vbox", "hbox", "grid", "stack"] },
    "children": { "type": "array", "items": { "$ref": "#/definitions/screen_widget" } },
    "gap": { "type": "number", "default": 8, "description": "Pixel spacing between children" },
    "align": { "type": "string", "enum": ["start", "center", "end"], "default": "start" },
    "style": { "$ref": "#/definitions/css_properties" }
  }
},
"display_widget": {
  "type": "object",
  "required": ["type"],
  "properties": {
    "type": { "type": "string", "enum": ["label", "progressbar", "image", "spacer"] },
    "style": { "$ref": "#/definitions/css_properties" }
  },
  "oneOf": [
    { "required": ["type", "text"], "properties": { "type": { "const": "label" }, "text": { "type": "string" }, "style": { "$ref": "#/definitions/css_properties" } } },
    { "required": ["type", "value"], "properties": { "type": { "const": "progressbar" }, "value": { "type": ["number", "string"] }, "max": { "type": "number", "default": 100 }, "color": { "type": "string" }, "height": { "type": "number" }, "style": { "$ref": "#/definitions/css_properties" } } },
    { "required": ["type", "src"], "properties": { "type": { "const": "image" }, "src": { "type": "string" }, "width": { "type": "number" }, "height": { "type": "number" }, "style": { "$ref": "#/definitions/css_properties" } } },
    { "required": ["type"], "properties": { "type": { "const": "spacer" }, "width": { "type": "number" }, "height": { "type": "number" }, "style": { "$ref": "#/definitions/css_properties" } } }
  ]
},
"interactive_widget": {
  "type": "object",
  "required": ["type", "action"],
  "properties": {
    "type": { "type": "string", "enum": ["textbutton", "iconbutton", "textinput"] },
    "action": { "type": "string", "description": "Action identifier triggered on click" },
    "style": { "$ref": "#/definitions/css_properties" }
  },
  "oneOf": [
    { "required": ["type", "label", "action"], "properties": { "type": { "const": "textbutton" }, "label": { "type": "string" }, "icon": { "type": "string" }, "action": { "type": "string" }, "style": { "$ref": "#/definitions/css_properties" } } },
    { "required": ["type", "icon", "action"], "properties": { "type": { "const": "iconbutton" }, "icon": { "type": "string" }, "action": { "type": "string" }, "style": { "$ref": "#/definitions/css_properties" } } },
    { "required": ["type"], "properties": { "type": { "const": "textinput" }, "placeholder": { "type": "string" }, "binding": { "type": "string", "description": "Snapshot path for two-way binding" }, "style": { "$ref": "#/definitions/css_properties" } } }
  ]
},
"css_properties": {
  "type": "object",
  "description": "CSS property overrides as key-value pairs.",
  "additionalProperties": { "type": "string" },
  "examples": [{ "color": "#ff0000", "background": "#1a1a2e" }]
},
"screen_config": {
  "type": "object",
  "required": ["id", "name", "layout"],
  "properties": {
    "id": { "type": "string", "description": "Unique screen identifier used in navigation" },
    "name": { "type": "string", "description": "Display name shown in navigation" },
    "layout": { "$ref": "#/definitions/container_widget", "description": "Root widget of the screen layout" },
    "style": { "$ref": "#/definitions/css_properties", "description": "CSS overrides for the screen container" }
  }
}
```

Then add to the `properties` section of the root schema (around line 788, after `nodes`):

```json
"screens": {
  "type": "array",
  "description": "Declarative screen definitions for the data-driven layout system.",
  "items": { "$ref": "#/definitions/screen_config" }
}
```

**Verify:** Validate the schema is valid JSON and doesn't break existing schema parsing
**Commit:** `feat(schema): add screens definition to project schema`

---

## Summary

| Task | File | Description | Verify |
|------|------|-------------|--------|
| 1.1 | `engine/layoutEngine.js` | Core layout engine with all widget renderers | `npm test` |
| 1.2 | `editor/tests/layoutEngine.test.js` | Unit tests for all engine functions | `npm test` |
| 1.3 | `engine/engine.js` | Add screenRegistry, defineScreen, getScreen exports | `grep` |
| 1.4 | `engine/systems/bootstrap.js` | Register screens from project.screens | Read file |
| 2.1 | `engine/engine.js` | Integrate renderScreenToHTML into EngineRuntime | `grep` |
| 2.2 | `engine/systems/bootstrap.js` | Verify ui.screens population | Read file |
| 3.1 | `engine/index.html` | CSS, container, event delegation, render integration | Manual test |
| 4.1 | `schema/project.schema.json` | Add screen_widget, screen_config definitions | Validate JSON |

**Backward Compatibility:** Existing project.json without `screens` array continues to work. Existing renderWorldScreen/renderExpeditionScreen/renderForgeScreenV2 remain as fallbacks.

**Key Constraint Met:** The layout engine uses innerHTML + event delegation on a root container (`#screen-content`) as specified.
