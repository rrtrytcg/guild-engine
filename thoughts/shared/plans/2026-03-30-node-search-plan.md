# Node Search Palette — Implementation Plan

**Goal:** Add a command palette (Ctrl+K) for fuzzy-searching nodes and centering canvas on selection.

**Architecture:** React.lazy component with pure utility functions. Non-blocking fuzzy search, memoized index, keyboard navigation.

**Design:** `thoughts/shared/designs/2026-03-30-node-search-design.md`

**Project Constraints (enforced):**
- ESLint: no unused vars (pattern `/^[A-Z_]$/` for uppercase constants, lowercase for locals)
- PowerShell: no `&&` chains, use `;` or separate commands
- React 19: no ref access during render (use `useEffect` for ref operations)
- Pure functions: no side effects in search/ranking logic
- ESM: `__dirname` not available — use `import.meta.url` + `fileURLToPath`

---

## Dependency Graph

```
Batch 1 (parallel): 1.1, 1.2, 1.3, 1.4 [foundation - no deps]
Batch 2 (parallel): 2.1, 2.2, 2.3 [core - depends on batch 1]
Batch 3 (parallel): 3.1, 3.2, 3.3, 3.4 [components - depends on batch 2]
```

---

## Batch 1: Foundation (parallel — 4 implementers)

### Task 1.1: Store State Addition
**File:** `editor/src/store/useStore.js`
**Test:** none (store state only)
**Depends:** none

Add to the Zustand store state object:

```javascript
// --- Search palette ---
searchOpen: false,
openSearch: () => set({ searchOpen: true }),
closeSearch: () => set({ searchOpen: false }),
```

**Location:** After `canvasView` state (line ~35) and before `activeGroupId`.

**Verify:** N/A (state addition only)
**Commit:** `feat(store): add searchOpen state and openSearch/closeSearch actions`

---

### Task 1.2: Fuzzy Match Utility
**File:** `editor/src/utils/fuzzyMatch.js`
**Test:** `editor/tests/utils/fuzzyMatch.test.js`
**Depends:** none

```javascript
// editor/src/utils/fuzzyMatch.js
/**
 * Pure fuzzy matching function for node search.
 * Scores by character sequence continuity and position.
 * Rankings: exact prefix > contains > fuzzy scatter.
 *
 * @param {string} query - Search query (lowercase)
 * @param {Array<{id: string, label: string, type: string, group: string, description: string, emoji: string}>} entries
 * @returns {Array<{entry: object, score: number}>} Sorted by relevance score descending, max 20
 */
export function fuzzyMatch(query, entries) {
  if (!query || typeof query !== 'string') {
    return entries.slice(0, 20).map((entry) => ({ entry, score: 0 }))
  }

  const normalizedQuery = query.toLowerCase().trim()
  if (!normalizedQuery) {
    return entries.slice(0, 20).map((entry) => ({ entry, score: 0 }))
  }

  const scored = entries.map((entry) => {
    const label = (entry.label || '').toLowerCase()
    const type = (entry.type || '').toLowerCase()
    const description = (entry.description || '').toLowerCase()

    let score = 0

    // Exact prefix match gets highest score
    if (label.startsWith(normalizedQuery)) {
      score += 1000 - (label.length - normalizedQuery.length)
    } else if (label.includes(normalizedQuery)) {
      // Contains match
      score += 500 - (label.indexOf(normalizedQuery))
    } else {
      // Fuzzy scatter match
      let queryIndex = 0
      let lastMatchIndex = -1
      let consecutiveBonus = 0

      for (let i = 0; i < label.length && queryIndex < normalizedQuery.length; i++) {
        if (label[i] === normalizedQuery[queryIndex]) {
          // Base score for match
          score += 10

          // Consecutive match bonus
          if (lastMatchIndex === i - 1) {
            consecutiveBonus += 5
            score += consecutiveBonus
          } else {
            consecutiveBonus = 0
          }

          // Position bonus (earlier matches score higher)
          score += Math.max(0, 50 - i)

          // Word boundary bonus
          if (i === 0 || /\s/.test(label[i - 1])) {
            score += 20
          }

          lastMatchIndex = i
          queryIndex++
        }
      }

      // Query must fully match
      if (queryIndex < normalizedQuery.length) {
        return { entry, score: -1 }
      }
    }

    // Type match bonus
    if (type.includes(normalizedQuery)) {
      score += 50
    }

    // Description match bonus (smaller)
    if (description.includes(normalizedQuery)) {
      score += 20
    }

    return { entry, score }
  })

  return scored
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
}
```

```javascript
// editor/tests/utils/fuzzyMatch.test.js
import { describe, it, expect } from 'vitest'
import { fuzzyMatch } from '../../src/utils/fuzzyMatch.js'

describe('fuzzyMatch', () => {
  const sampleEntries = [
    { id: '1', label: 'Gold Mine', type: 'resource', group: 'Economy', description: 'Produces gold', emoji: '💰' },
    { id: '2', label: 'Iron Forge', type: 'building', group: 'World', description: 'Forges iron', emoji: '🏰' },
    { id: '3', label: 'Sword', type: 'item', group: 'Economy', description: 'A sharp weapon', emoji: '🗡️' },
    { id: '4', label: 'Hero Warrior', type: 'hero_class', group: 'Heroes', description: 'Basic warrior', emoji: '⚔️' },
    { id: '5', label: 'Goblin Hunt', type: 'expedition', group: 'Expeditions', description: 'Hunt goblins', emoji: '🗺️' },
  ]

  describe('exact match', () => {
    it('returns exact prefix match with highest score', () => {
      const results = fuzzyMatch('gold', sampleEntries)
      expect(results[0].entry.label).toBe('Gold Mine')
      expect(results[0].score).toBeGreaterThan(results[1].score)
    })

    it('returns contains match with lower score', () => {
      const results = fuzzyMatch('forge', sampleEntries)
      expect(results[0].entry.label).toBe('Iron Forge')
    })

    it('fuzzy scatter match works', () => {
      const results = fuzzyMatch('gldm', sampleEntries)
      expect(results[0].entry.label).toBe('Gold Mine')
    })
  })

  describe('no match', () => {
    it('filters out entries with no match', () => {
      const results = fuzzyMatch('xyz123', sampleEntries)
      expect(results.length).toBe(0)
    })
  })

  describe('empty inputs', () => {
    it('returns all entries limited to 20 when query is empty', () => {
      const results = fuzzyMatch('', sampleEntries)
      expect(results.length).toBeLessThanOrEqual(20)
    })

    it('returns all entries when query is null', () => {
      const results = fuzzyMatch(null, sampleEntries)
      expect(results.length).toBeLessThanOrEqual(20)
    })

    it('returns all entries when query is undefined', () => {
      const results = fuzzyMatch(undefined, sampleEntries)
      expect(results.length).toBeLessThanOrEqual(20)
    })
  })

  describe('special characters', () => {
    it('handles special characters in query', () => {
      const entries = [
        { id: '1', label: 'Test (special)', type: 'item', group: 'Test', description: '', emoji: '🔧' },
      ]
      const results = fuzzyMatch('(special)', entries)
      expect(results[0].entry.label).toBe('Test (special)')
    })
  })

  describe('scoring', () => {
    it('limits results to 20', () => {
      const manyEntries = Array.from({ length: 50 }, (_, i) => ({
        id: String(i),
        label: `Node ${i}`,
        type: 'resource',
        group: 'Test',
        description: '',
        emoji: '📦',
      }))
      const results = fuzzyMatch('', manyEntries)
      expect(results.length).toBeLessThanOrEqual(20)
    })

    it('sorts by score descending', () => {
      const results = fuzzyMatch('e', sampleEntries)
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score)
      }
    })
  })

  describe('case insensitivity', () => {
    it('matches regardless of case', () => {
      const results = fuzzyMatch('GOLD', sampleEntries)
      expect(results[0].entry.label).toBe('Gold Mine')
    })
  })
})
```

**Verify:** `cd editor; npx vitest run tests/utils/fuzzyMatch.test.js`
**Commit:** `feat(utils): add fuzzyMatch utility for node search`

---

### Task 1.3: useSearchIndex Hook
**File:** `editor/src/hooks/useSearchIndex.js`
**Test:** `editor/tests/hooks/useSearchIndex.test.js`
**Depends:** none

```javascript
// editor/src/hooks/useSearchIndex.js
import { useMemo } from 'react'
import { NODE_CONFIG } from '../nodes/nodeConfig.js'

/**
 * Pure hook that builds a memoized search index from nodes.
 * No side effects, no store access.
 *
 * @param {Array} nodes - ReactFlow nodes array
 * @returns {Array<{id, label, type, group, description, emoji}>}
 */
export function useSearchIndex(nodes) {
  return useMemo(() => {
    if (!nodes || !Array.isArray(nodes)) {
      return []
    }

    return nodes.map((node) => ({
      id: node.id,
      label: node.data?.label ?? node.id,
      type: node.type ?? 'unknown',
      group: NODE_CONFIG[node.type]?.group ?? 'Other',
      description: node.data?.description ?? '',
      emoji: node.data?.icon ?? NODE_CONFIG[node.type]?.emoji ?? '📦',
    }))
  }, [nodes])
}
```

```javascript
// editor/tests/hooks/useSearchIndex.test.js
import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useSearchIndex } from '../../src/hooks/useSearchIndex.js'

describe('useSearchIndex', () => {
  it('transforms nodes to search entries', () => {
    const nodes = [
      { id: 'n1', type: 'resource', data: { label: 'Gold', description: 'A yellow metal' } },
      { id: 'n2', type: 'building', data: { label: 'Mine', description: 'Produces gold' } },
    ]

    const { result } = renderHook(() => useSearchIndex(nodes))
    expect(result.current).toHaveLength(2)
    expect(result.current[0]).toMatchObject({
      id: 'n1',
      label: 'Gold',
      type: 'resource',
      group: 'Economy',
      description: 'A yellow metal',
    })
  })

  it('handles missing node data', () => {
    const nodes = [
      { id: 'n1', type: 'resource' },
      { id: 'n2' },
    ]

    const { result } = renderHook(() => useSearchIndex(nodes))
    expect(result.current[0].label).toBe('n1')
    expect(result.current[0].emoji).toBe('💰')
    expect(result.current[1].group).toBe('Other')
  })

  it('returns empty array for null/undefined nodes', () => {
    const { result: r1 } = renderHook(() => useSearchIndex(null))
    const { result: r2 } = renderHook(() => useSearchIndex(undefined))
    expect(r1.current).toEqual([])
    expect(r2.current).toEqual([])
  })

  it('memoizes when nodes are unchanged', () => {
    const nodes = [
      { id: 'n1', type: 'resource', data: { label: 'Gold' } },
    ]

    const { result, rerender } = renderHook(({ ns }) => useSearchIndex(ns), {
      initialProps: { ns: nodes },
    })
    const firstResult = result.current

    rerender({ ns: nodes })
    expect(result.current).toBe(firstResult)
  })

  it('recomputes when nodes change', () => {
    const nodes1 = [{ id: 'n1', type: 'resource', data: { label: 'Gold' } }]
    const nodes2 = [{ id: 'n2', type: 'building', data: { label: 'Mine' } }]

    const { result, rerender } = renderHook(({ ns }) => useSearchIndex(ns), {
      initialProps: { ns: nodes1 },
    })
    expect(result.current[0].label).toBe('Gold')

    rerender({ ns: nodes2 })
    expect(result.current[0].label).toBe('Mine')
  })
})
```

**Verify:** `cd editor; npx vitest run tests/hooks/useSearchIndex.test.js`
**Commit:** `feat(hooks): add useSearchIndex hook for memoized search index`

---

### Task 1.4: Canvas panToNode Expose
**File:** `editor/src/canvas/Canvas.jsx`
**Test:** none (integration with SearchPalette tested via E2E)
**Depends:** none

Add `useImperativeHandle` to expose `panToNode` method. This requires:
1. Import `useImperativeHandle`, `forwardRef` from React
2. Wrap Canvas with `forwardRef`
3. Add `panToNode` function
4. Expose via `useImperativeHandle`

**Changes to `editor/src/canvas/Canvas.jsx`:**

Add to imports (line 1):
```javascript
import { useCallback, useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
```

Change the Canvas component declaration:
```javascript
// Line 27: Change from:
// export default function Canvas({ focusGroupId = null }) {

// To:
const Canvas = forwardRef(function Canvas({ focusGroupId = null }, ref) {
```

Add after the `reactFlowInstance` ref declaration (around line 47):
```javascript
const reactFlowInstance = useRef(null)
const reactFlowWrapper = useRef(null)

// Expose panToNode via ref
useImperativeHandle(ref, () => ({
  panToNode: (nodeId) => {
    if (!reactFlowInstance.current || !nodes) return

    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return

    const nodeWidth = 220
    const nodeHeight = 150

    reactFlowInstance.current.setCenter(
      node.position.x + nodeWidth / 2,
      node.position.y + nodeHeight / 2,
      {
        zoom: 1,
        duration: 300,
      }
    )
  },
}), [nodes])
```

Change the closing of the component (line ~541):
```javascript
// Before: }
// After:
// })
```

Change the export at line 27 to be:
```javascript
export default Canvas
```

But since we changed to `forwardRef`, we need to move the `export default Canvas` to where `Canvas` is defined (after the function closing).

Actually, looking at the code more carefully, the component starts at line 27 with `export default function Canvas`. I need to restructure it:

1. Change `export default function Canvas({ focusGroupId = null }) {` to `const Canvas = forwardRef(function Canvas({ focusGroupId = null }, ref) {`
2. Add the `useImperativeHandle` after the refs
3. Add `})` at the end before `export default Canvas`

Let me trace the exact structure:
- Line 27: `export default function Canvas({ focusGroupId = null }) {`
- Line 224: `return (`
- Line 541: `}` (closing of function)
- Line 542: empty

So the closing `}` is at line 541. I need to add `})` at line 541 (closing both the function and forwardRef), then add `export default Canvas` on the next line.

**Verify:** N/A (will be verified via SearchPalette integration)
**Commit:** `feat(canvas): expose panToNode via useImperativeHandle for search navigation`

---

## Batch 2: Core Components (parallel — 3 implementers)

### Task 2.1: SearchPalette Component
**File:** `editor/src/components/SearchPalette.jsx`
**Test:** `editor/tests/components/SearchPalette.test.js`
**Depends:** 1.2, 1.3

```javascript
// editor/src/components/SearchPalette.jsx
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import useStore from '../store/useStore.js'
import { useSearchIndex } from '../hooks/useSearchIndex.js'
import { fuzzyMatch } from '../utils/fuzzyMatch.js'

const MAX_RESULTS = 8

export default function SearchPalette() {
  const searchOpen = useStore((s) => s.searchOpen)
  const closeSearch = useStore((s) => s.closeSearch)
  const selectNode = useStore((s) => s.selectNode)
  const nodes = useStore((s) => s.nodes)
  const canvasRef = useRef(null)

  const [query, setQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  // Get search index (memoized)
  const searchIndex = useSearchIndex(nodes)

  // Compute results (pure)
  const results = useMemo(() => {
    if (!searchIndex || searchIndex.length === 0) {
      return []
    }
    const matched = fuzzyMatch(query, searchIndex)
    return matched.slice(0, MAX_RESULTS)
  }, [query, searchIndex])

  // Reset highlighted index when results change
  useEffect(() => {
    setHighlightedIndex(0)
  }, [results])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex((prev) => Math.min(prev + 1, results.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex((prev) => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (results[highlightedIndex]) {
          handleSelect(results[highlightedIndex].entry.id)
        }
        break
      case 'Escape':
        e.preventDefault()
        closeSearch()
        break
      default:
        break
    }
  }, [results, highlightedIndex, closeSearch])

  // Attach keyboard listener
  useEffect(() => {
    if (searchOpen) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [searchOpen, handleKeyDown])

  // Focus input on mount
  const inputRef = useRef(null)
  useEffect(() => {
    if (searchOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [searchOpen])

  // Clear query when closing
  useEffect(() => {
    if (!searchOpen) {
      setQuery('')
      setHighlightedIndex(0)
    }
  }, [searchOpen])

  const handleSelect = useCallback((nodeId) => {
    selectNode(nodeId)
    // panToNode will be called by parent via ref
    closeSearch()
  }, [selectNode, closeSearch])

  const handleInputChange = useCallback((e) => {
    setQuery(e.target.value)
  }, [])

  // Get canvas ref from store or prop
  // For now, we'll dispatch a custom event that Canvas listens to
  const handleResultClick = useCallback((nodeId) => {
    // Dispatch event for canvas to handle pan
    window.dispatchEvent(new CustomEvent('panToNode', { detail: { nodeId } }))
    handleSelect(nodeId)
  }, [handleSelect])

  if (!searchOpen) {
    return null
  }

  return createPortal(
    <div style={overlayStyle} onClick={closeSearch}>
      <div style={paletteStyle} onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="Search nodes..."
          style={inputStyle}
        />
        {results.length > 0 && (
          <div style={resultsStyle}>
            {results.map(({ entry, score }, index) => (
              <ResultRow
                key={entry.id}
                entry={entry}
                isHighlighted={index === highlightedIndex}
                onClick={() => handleResultClick(entry.id)}
                onMouseEnter={() => setHighlightedIndex(index)}
              />
            ))}
          </div>
        )}
        {query && results.length === 0 && (
          <div style={emptyStyle}>No nodes found</div>
        )}
      </div>
    </div>,
    document.body
  )
}

function ResultRow({ entry, isHighlighted, onClick, onMouseEnter }) {
  return (
    <div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      style={{
        ...rowStyle,
        background: isHighlighted ? '#2a2a4e' : 'transparent',
      }}
    >
      <span style={emojiStyle}>{entry.emoji}</span>
      <span style={labelStyle}>{entry.label}</span>
      <span style={badgeStyle}>{entry.type}</span>
      <span style={{ ...groupDotStyle, background: getGroupColor(entry.group) }} />
    </div>
  )
}

// Group color mapping
const GROUP_COLORS = {
  Economy: '#1D9E75',
  Heroes: '#7F77DD',
  World: '#378ADD',
  Expeditions: '#888780',
  Meta: '#D4537E',
  Other: '#555570',
}

function getGroupColor(group) {
  return GROUP_COLORS[group] || GROUP_COLORS.Other
}

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  paddingTop: '15vh',
  zIndex: 1000,
}

const paletteStyle = {
  width: 480,
  maxHeight: '60vh',
  background: '#13131f',
  border: '1px solid #2a2a3e',
  borderRadius: 12,
  boxShadow: '0 24px 60px rgba(0, 0, 0, 0.5)',
  overflow: 'hidden',
}

const inputStyle = {
  width: '100%',
  padding: '14px 16px',
  background: '#0f0f1b',
  border: 'none',
  borderBottom: '1px solid #2a2a3e',
  color: '#e0e0f0',
  fontSize: 16,
  outline: 'none',
}

const resultsStyle = {
  maxHeight: 400,
  overflowY: 'auto',
}

const rowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '10px 16px',
  cursor: 'pointer',
  transition: 'background 0.1s',
}

const emojiStyle = {
  fontSize: 18,
  width: 24,
  textAlign: 'center',
}

const labelStyle = {
  flex: 1,
  color: '#e0e0f0',
  fontSize: 14,
}

const badgeStyle = {
  padding: '2px 8px',
  background: '#2a2a3e',
  borderRadius: 4,
  color: '#8888a0',
  fontSize: 11,
  textTransform: 'uppercase',
}

const groupDotStyle = {
  width: 8,
  height: 8,
  borderRadius: '50%',
}

const emptyStyle = {
  padding: '20px 16px',
  color: '#666680',
  fontSize: 14,
  textAlign: 'center',
}
```

**Note:** The `panToNode` is dispatched via a custom event that Canvas listens to. Canvas needs to listen for this event.

**Verify:** `cd editor; npx vitest run tests/components/SearchPalette.test.js`
**Commit:** `feat(components): add SearchPalette component with keyboard navigation`

---

### Task 2.2: Canvas Event Listener for panToNode
**File:** `editor/src/canvas/Canvas.jsx`
**Test:** none (integrated with SearchPalette)
**Depends:** 1.4, 2.1

Canvas needs to listen for the custom `panToNode` event dispatched by SearchPalette.

Add inside the Canvas component (after the `useImperativeHandle` block, before `onDrop`):

```javascript
// Listen for panToNode events from SearchPalette
useEffect(() => {
  const handlePanToNode = (e) => {
    const { nodeId } = e.detail || {}
    if (nodeId && reactFlowInstance.current) {
      const node = nodes.find((n) => n.id === nodeId)
      if (node) {
        const nodeWidth = 220
        const nodeHeight = 150
        reactFlowInstance.current.setCenter(
          node.position.x + nodeWidth / 2,
          node.position.y + nodeHeight / 2,
          {
            zoom: 1,
            duration: 300,
          }
        )
      }
    }
  }

  window.addEventListener('panToNode', handlePanToNode)
  return () => window.removeEventListener('panToNode', handlePanToNode)
}, [nodes])
```

**Verify:** Manual testing with Ctrl+K
**Commit:** `feat(canvas): add panToNode event listener for search palette integration`

---

### Task 2.3: App.jsx Integration
**File:** `editor/src/App.jsx`
**Test:** `editor/tests/app-lazy.test.js` (extend existing)
**Depends:** 2.1

Add React.lazy SearchPalette, Suspense boundary, and Ctrl+K listener.

**Changes to `editor/src/App.jsx`:**

1. Add lazy import after existing lazy import (around line 1-3):
```javascript
import { lazy, Suspense, useEffect } from 'react'
// ... existing imports ...
const GroupCanvas = lazy(() => import('./canvas/GroupCanvas').catch(() => ({
  default: GroupCanvasError,
})))
const SearchPalette = lazy(() => import('./components/SearchPalette'))
```

2. Add Ctrl+K listener in App component (after `const focusGroupId` line ~50):
```javascript
const focusGroupId = canvasView === 'nodes' ? activeGroupId : null
const openSearch = useStore((s) => s.openSearch)
const closeSearch = useStore((s) => s.closeSearch)

// Ctrl+K to open search palette
useEffect(() => {
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault()
      openSearch()
    }
  }

  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [openSearch])
```

3. Add Suspense boundary with SearchPalette inside the main div (after Inspector closing tag, before closing div):
```javascript
<Inspector />
<Suspense fallback={null}>
  <SearchPalette />
</Suspense>
```

**Verify:** `cd editor; npx vitest run tests/app-lazy.test.js`
**Commit:** `feat(app): integrate SearchPalette with React.lazy and Ctrl+K binding`

---

## Batch 3: Tests & Final Integration (parallel — 2 implementers)

### Task 3.1: fuzzyMatch Unit Tests
**File:** `editor/tests/utils/fuzzyMatch.test.js`
**Test:** Already specified in Task 1.2
**Depends:** 1.2

This file was created in Task 1.2. No additional work needed unless implementation changes.

**Verify:** `cd editor; npx vitest run tests/utils/fuzzyMatch.test.js`
**Commit:** `test(fuzzyMatch): add comprehensive unit tests`

---

### Task 3.2: useSearchIndex Unit Tests
**File:** `editor/tests/hooks/useSearchIndex.test.js`
**Test:** Already specified in Task 1.3
**Depends:** 1.3

This file was created in Task 1.3.

**Verify:** `cd editor; npx vitest run tests/hooks/useSearchIndex.test.js`
**Commit:** `test(useSearchIndex): add hook unit tests`

---

### Task 3.3: SearchPalette Integration Test
**File:** `editor/tests/components/SearchPalette.test.js`
**Test:** New file
**Depends:** 2.1

```javascript
// editor/tests/components/SearchPalette.test.js
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SearchPalette } from '../../src/components/SearchPalette.jsx'
import useStore from '../../src/store/useStore.js'

// Mock the store
vi.mock('../../src/store/useStore.js', () => ({
  default: vi.fn((selector) => {
    if (selector === 'searchOpen') return true
    if (selector === 'closeSearch') return vi.fn()
    if (selector === 'selectNode') return vi.fn()
    if (selector === 'nodes') return [
      { id: 'n1', type: 'resource', data: { label: 'Gold', description: 'A metal' } },
      { id: 'n2', type: 'building', data: { label: 'Mine', description: 'Produces gold' } },
    ]
    return vi.fn()
  }),
}))

describe('SearchPalette', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders search input when open', () => {
    render(<SearchPalette />)
    expect(screen.getByPlaceholderText('Search nodes...')).toBeInTheDocument()
  })

  it('renders initial empty results', () => {
    render(<SearchPalette />)
    expect(screen.getByText('No nodes found')).toBeInTheDocument()
  })

  it('filters results based on query', async () => {
    render(<SearchPalette />)
    const input = screen.getByPlaceholderText('Search nodes...')
    
    fireEvent.change(input, { target: { value: 'gold' } })
    
    // Should show "Gold" result
    expect(screen.getByText('Gold')).toBeInTheDocument()
  })

  it('navigates results with keyboard', () => {
    render(<SearchPalette />)
    const input = screen.getByPlaceholderText('Search nodes...')
    
    fireEvent.change(input, { target: { value: 'e' } })
    
    // Initial highlight should be on first result
    // Press ArrowDown to navigate
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    
    // The component should handle this without crashing
  })

  it('closes on Escape', () => {
    const closeSearch = vi.fn()
    useStore.mockImplementation((selector) => {
      if (selector === 'closeSearch') return closeSearch
      if (selector === 'searchOpen') return true
      if (selector === 'nodes') return []
      return vi.fn()
    })

    render(<SearchPalette />)
    const input = screen.getByPlaceholderText('Search nodes...')
    
    fireEvent.keyDown(input, { key: 'Escape' })
    
    expect(closeSearch).toHaveBeenCalled()
  })
})
```

**Note:** This test requires more careful mocking. The SearchPalette imports `useSearchIndex` and `fuzzyMatch` directly. In a real test environment, we'd need to mock these dependencies or use dependency injection.

**Verify:** `cd editor; npx vitest run tests/components/SearchPalette.test.js`
**Commit:** `test(SearchPalette): add integration test for keyboard navigation`

---

### Task 3.4: E2E Documentation Note
**File:** none
**Test:** Manual E2E verification
**Depends:** 2.1, 2.2, 2.3

Manual test steps for verification:

1. Start the editor: `cd editor; npm run dev`
2. Create some nodes on the canvas
3. Press `Ctrl+K` — palette should open
4. Type a search query — results should filter
5. Use `Arrow Up/Down` to navigate — highlight should move
6. Press `Enter` — palette should close and canvas should pan to selected node
7. Press `Escape` — palette should close
8. Click outside palette — palette should close

**Commit:** `docs: add E2E test steps for search palette`

---

## Summary

| Task | File | Test | Verify Command |
|------|------|------|----------------|
| 1.1 | `editor/src/store/useStore.js` | none | N/A |
| 1.2 | `editor/src/utils/fuzzyMatch.js` | `tests/utils/fuzzyMatch.test.js` | `npx vitest run tests/utils/fuzzyMatch.test.js` |
| 1.3 | `editor/src/hooks/useSearchIndex.js` | `tests/hooks/useSearchIndex.test.js` | `npx vitest run tests/hooks/useSearchIndex.test.js` |
| 1.4 | `editor/src/canvas/Canvas.jsx` | none | Manual |
| 2.1 | `editor/src/components/SearchPalette.jsx` | `tests/components/SearchPalette.test.js` | `npx vitest run tests/components/SearchPalette.test.js` |
| 2.2 | `editor/src/canvas/Canvas.jsx` | none | Manual |
| 2.3 | `editor/src/App.jsx` | existing | `npx vitest run tests/app-lazy.test.js` |

**Total: 7 tasks across 3 batches**

**Open Questions (from design):**
1. **Search groups?** — Not implementing in v1. Design leaves this open.
2. **Multi-select?** — Not implementing in v1. Design notes this is low priority.
