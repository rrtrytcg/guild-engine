# Node Search Palette — Design

**Date:** 2026-03-30
**Topic:** node-search
**Status:** draft

---

## Problem Statement

At ~17 node types and potentially many node instances, users have no way to quickly locate a specific node on the canvas. Navigation requires scrolling, panning, or remembering approximate node positions — making large graphs difficult to work with.

---

## Constraints

- **No existing search** — no canvas-level search/filter exists in the codebase
- **Lazy-loading required** — search palette must not bloat the editor bundle
- **Non-blocking** — fuzzy search must not block the main thread
- **Pure functions** — search and ranking logic must be testable in isolation

---

## Approach

A **command palette** (Ctrl+K) that fuzzy-searches all nodes and centers the canvas on selection. This is the right tradeoff: lightweight, familiar UX (VS Code, Figma, Linear all use this pattern), minimal screen real-estate, easy keyboard navigation.

---

## Architecture

### Trigger & Mounting
- `SearchPalette.jsx` is a `React.lazy()` component — zero initial bundle cost
- Mounted via a `Suspense` boundary in `App.jsx` when `searchOpen` state is true
- `App.jsx` listens for Ctrl+K at the window level and toggles `searchOpen`

### Component Hierarchy
```
App.jsx
  └── Suspense fallback={null}
        └── SearchPalette (lazy)
              ├── SearchInput — text field with debounce
              ├── SearchResults — scrollable list, max 8 items
              └── ResultRow — icon, label, type badge, group color
```

### Keyboard Handling
| Key | Action |
|-----|--------|
| `Ctrl+K` | Open palette |
| `↑` / `↓` | Navigate results |
| `Enter` | Select highlighted result |
| `Escape` | Close palette |
| Click outside | Close palette |

---

## Data Flow

### Search Index
Built via `useSearchIndex(nodes)` hook — a pure, memoized transformation:

```js
// Shape of each index entry
{
  id: node.id,
  label: node.data.label,
  type: node.type,
  group: NODE_CONFIG[node.type]?.group,
  description: node.data.description ?? '',
  emoji: node.data.icon,
}
```

### Fuzzy Matching
Pure function `fuzzyMatch(query, entries)`:
- Scores by character sequence continuity and position
- Ranks results: exact prefix > contains > fuzzy scatter
- Returns sorted array with relevance score, limited to top 20

### Selection → Canvas Focus
On result selection:
1. `store.selectNode(id)` — updates inspector
2. `panToNode(id)` — exposed from Canvas via ref, scrolls canvas to center the node
3. Close palette

---

## Components

### `SearchPalette.jsx`
- Lazy-loaded modal rendered via React Portal
- Owns: query state, highlighted index, open/close
- Delegates to `useSearchIndex` and `fuzzyMatch`

### `useSearchIndex(nodes)`
- Pure hook — no side effects, no store access
- Returns memoized search index array

### `fuzzyMatch(query, entries)`
- Pure function, fully unit-testable
- Input: string + array of index entries
- Output: sorted array of `{ entry, score }`

### `panToNode(id)` (Canvas.jsx)
- Exposed via `useImperativeHandle` on the ReactFlow wrapper
- Calls ReactFlow's `fitView()` or `setCenter()` to focus a specific node

---

## State Additions

```js
// useStore.js — minimal additions
{
  searchOpen: false,      // controls palette visibility
  openSearch: () => set({ searchOpen: true }),
  closeSearch: () => set({ searchOpen: false }),
}
```

---

## File Map

| File | Change |
|------|--------|
| `editor/src/store/useStore.js` | Add `searchOpen`, `openSearch`, `closeSearch` |
| `editor/src/App.jsx` | Add `React.lazy(SearchPalette)`, Suspense, Ctrl+K listener |
| `editor/src/components/SearchPalette.jsx` | **New** — palette UI and keyboard logic |
| `editor/src/hooks/useSearchIndex.js` | **New** — pure hook |
| `editor/src/utils/fuzzyMatch.js` | **New** — pure fuzzy matching function |
| `editor/src/canvas/Canvas.jsx` | Expose `panToNode` via ref |
| `editor/tests/utils/fuzzyMatch.test.js` | **New** — unit tests |
| `editor/tests/hooks/useSearchIndex.test.js` | **New** — hook tests |

---

## Testing Strategy

- `fuzzyMatch` — exhaustive unit tests: exact match, partial, no match, special characters, empty query, empty entries
- `useSearchIndex` — verify memoization (not recalculated when unrelated state changes)
- `SearchPalette` — keyboard navigation integration test
- E2E: Ctrl+K opens palette, type query, Enter selects and closes

---

## Open Questions

1. **Should search include groups?** Groups have labels but no `data.label`. Decide whether to index group labels as a secondary result type.
2. **Should multi-select work from palette?** Selecting multiple nodes from palette results would require `setSelectedNodeIds` instead of `selectNode`. Low priority for v1.
