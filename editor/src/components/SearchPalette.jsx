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