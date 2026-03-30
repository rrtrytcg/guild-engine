# Declarative Screen/Layout Definition System — Design

**Date:** 2026-03-30
**Topic:** screen-layout-system
**Status:** draft

---

## Problem Statement

The engine hardcodes all UI as innerHTML string concatenation in `engine/index.html`. Every screen (World, Expedition, Forge) is a unique render function with no shared structure. Adding or customizing layouts per project requires editing engine source — making the engine brittle and project-specific. The goal is a data-driven layout system where projects can define their own screens declaratively.

---

## Constraints

- **Retrofit, not rewrite** — must coexist with existing `renderWorldScreen`, `renderExpeditionScreen`, `renderForgeScreenV2` during transition
- **innerHTML + event delegation** — preserve the existing rendering pattern; event delegation on a root container avoids per-widget event binding overhead
- **No new runtime dependencies** — no template engine library; pure JS implementation
- **Binding safety** — snapshot values must be escaped before interpolation to prevent XSS in user-supplied project configs
- **Backward compatibility** — existing `project.json` (without `screens` array) must continue to work unchanged

---

## Approach

Inspired by Ren'Py's `screen` DSL, introduce a **`defineScreen(name, layoutConfig)` API** at bootstrap time. Projects supply a JSON layout config; the engine stores it in a `screenRegistry` map and renders it via a **layout engine** that walks the widget tree, resolves bindings against the game snapshot, and emits HTML.

**Ren'Py analogy:**
```python
# Ren'Py
screen inventory():
    vbox:
        textbutton "Use" action UseItem()
        textbutton "Discard" action DiscardItem()
```

**Proposed engine equivalent:**
```js
defineScreen("inventory", {
  type: "vbox",
  children: [
    { type: "textbutton", label: "Use", action: "UseItem" },
    { type: "textbutton", label: "Discard", action: "DiscardItem" },
  ]
})
```

---

## Layout Config Schema

```ts
// Container widgets — define layout structure
type ContainerWidget = {
  type: "vbox" | "hbox" | "grid" | "stack"
  children: Widget[]
  gap?: number          // px, default 8
  align?: "start" | "center" | "end"  // default "start"
  style?: Record<string, string>  // CSS overrides
}

// Display widgets — read-only content
type DisplayWidget =
  | { type: "label"; text: string; style?: Record<string, string> }
  | { type: "progressbar"; value: number; max?: number; style?: Record<string, string> }
  | { type: "image"; src: string; width?: number; height?: number; style?: Record<string, string> }
  | { type: "spacer"; width?: number; height?: number }

// Interactive widgets — trigger actions
type InteractiveWidget =
  | { type: "textbutton"; label: string; icon?: string; action: string; style?: Record<string, string> }
  | { type: "iconbutton"; icon: string; action: string; style?: Record<string, string> }
  | { type: "textinput"; placeholder?: string; binding?: string; style?: Record<string, string> }

type Widget = ContainerWidget | DisplayWidget | InteractiveWidget

type ScreenConfig = {
  id: string
  name: string
  layout: ContainerWidget
  style?: Record<string, string>  // root container CSS overrides
}
```

---

## Engine API

### Registration
```js
// engine/engine.js
const screenRegistry = new Map()

function defineScreen(name, config) {
  screenRegistry.set(name, config)
}

function getScreen(name) {
  return screenRegistry.get(name) ?? null
}
```

### Layout Engine
```js
// engine/layoutEngine.js — pure rendering logic
function renderScreenToHTML(screenName, snapshot, actionHandler) {
  const config = getScreen(screenName)
  if (!config) return ''
  return widgetToHTML(config.layout, snapshot, actionHandler)
}

function widgetToHTML(widget, snapshot, actionHandler, depth = 0) {
  switch (widget.type) {
    case 'vbox':
    case 'hbox':
    case 'stack':
      return renderContainer(widget, snapshot, actionHandler, depth)
    case 'label':
      return `<span class="widget-label" style="${styleStr(widget.style)}">${resolveBindings(widget.text, snapshot)}</span>`
    case 'textbutton':
      return `<button class="widget-textbutton" data-action="${escapeAttr(widget.action)}" style="${styleStr(widget.style)}">${widget.icon ? widget.icon + ' ' : ''}${escape(widget.label)}</button>`
    case 'progressbar':
      return renderProgressbar(widget, snapshot)
    case 'image':
      return `<img class="widget-image" src="${escapeAttr(widget.src)}" width="${widget.width ?? ''}" height="${widget.height ?? ''}" style="${styleStr(widget.style)}" />`
    case 'spacer':
      return `<div class="widget-spacer" style="width:${widget.width ?? 0}px;height:${widget.height ?? 0}px"></div>`
    default:
      return `<!-- unknown widget type: ${widget.type} -->`
  }
}
```

### Binding Resolution
Snapshot values interpolated into widget props using `{{path}}` syntax:
```js
// Input config
{ "type": "label", "text": "Gold: {{resources.gold}}" }

// Snapshot
{ "resources": { "gold": 1420 } }

// Resolved
<span class="widget-label">Gold: 1420</span>
```

```js
function resolveBindings(template, snapshot) {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
    const value = getByPath(snapshot, path.trim())
    return value == null ? '' : escape(String(value))
  })
}

function getByPath(obj, path) {
  return path.split('.').reduce((o, k) => (o ?? {})[k], obj)
}

function escape(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeAttr(str) {
  return escape(str).replace(/"/g, '&quot;')
}
```

### Event Delegation
Root screen container has a single `click` listener:
```js
document.getElementById('screen-content').addEventListener('click', (e) => {
  const action = e.target.closest('[data-action]')?.dataset.action
  if (action) {
    const handler = ACTION_HANDLERS[action]
    if (handler) handler(e)
  }
})
```

Action handlers are registered at init time from `engineActions`:
```js
const ACTION_HANDLERS = {
  UseItem: () => engineActions.useItem(),
  DiscardItem: () => engineActions.discardItem(),
  // ... derived from engineActions keys, snake_case → camelCase
}
```

---

## Bootstrap Integration

```js
// engine/systems/bootstrap.js
function bootstrapState(project) {
  const state = { /* ... */ }
  
  // Register declarative screens
  if (project.screens && Array.isArray(project.screens)) {
    for (const screen of project.screens) {
      defineScreen(screen.id, screen.layout)
    }
    // Derive nav from registered screens
    state.ui.screens = project.screens.map(s => ({ id: s.id, name: s.name }))
  }
  
  return state
}
```

### Backward Compatibility
- If `project.json` has no `screens` key, `bootstrapState` behaves identically to before
- Existing hardcoded `renderWorldScreen` / `renderExpeditionScreen` / `renderForgeScreenV2` remain as fallbacks when `getScreen(name)` returns null
- The engine renders `state.ui.screen` as today — no change to navigation flow

---

## Rendering Pipeline

```
project.json (screens[]) ──bootstrap──→ defineScreen() → screenRegistry
                                                          ↓
render loop ──getSnapshot()──→ renderScreen(name, snapshot)
                                        ↓
                               layoutEngine(config.layout, snapshot)
                                        ↓
                               widgetToHTML() recursive walk
                                        ↓
                               innerHTML on #screen-{name} container
                                                          ↓
                               click event delegation → engineActions
```

---

## Migration Path

**Phase 1 (backward compat):** Add `defineScreen` API and `layoutEngine` alongside existing render functions. Existing projects work unchanged.

**Phase 2 (one screen):** Convert one hardcoded screen (e.g., Event Log) to declarative. Validates the system in production.

**Phase 3 (full migration):** Replace `renderWorldScreen` / `renderExpeditionScreen` / `renderForgeScreenV2` with calls to `renderScreen(name, snapshot)`. Remove old render functions.

---

## File Map

| File | Change |
|------|--------|
| `engine/engine.js` | Add `screenRegistry`, `defineScreen()`, `getScreen()` |
| `engine/layoutEngine.js` | **New** — `renderScreenToHTML`, `widgetToHTML`, `resolveBindings`, `getByPath`, `escape`, `escapeAttr` |
| `engine/systems/bootstrap.js` | Call `defineScreen()` per entry in `project.screens`; populate `state.ui.screens` |
| `engine/index.html` | Add `#screen-content` container; replace one hardcoded screen with `renderScreen()`; add event delegation listener; add `.widget-*` CSS classes |
| `engine/tests/layoutEngine.test.js` | **New** — unit tests for `resolveBindings`, `getByPath`, `widgetToHTML` for each widget type |
| `project.json` (example) | Add `screens: ScreenConfig[]` to validate the schema |

---

## Testing Strategy

- **Unit tests** — `resolveBindings` (all binding patterns), `getByPath` (nested paths, null safety), `escape` / `escapeAttr` (XSS prevention)
- **Widget tests** — each widget type renders correct HTML string
- **Integration test** — bootstrap a minimal project with screens, verify `screenRegistry` populated correctly
- **Binding tests** — snapshot values with `{{}}` syntax resolve correctly; missing paths render as empty string (not `undefined` or `NaN`)

---

## Open Questions

1. **Conditional rendering** — how to show/hide widgets based on game state (e.g., "Hire" button only when gold > cost)? Could add a `visibleWhen` prop like `{ type: "textbutton", visibleWhen: "heroes.length < 5" }`.
2. **List/loop rendering** — how to render dynamic lists (e.g., hero roster)? Could add a `repeat` prop like `{ type: "hbox", repeat: "heroes", children: [...] }` where `repeat` is a snapshot path.
3. **Project.json schema validation** — should there be a JSON Schema for `ScreenConfig` to catch errors at load time? Low priority for v1.
