/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef, useState } from 'react'
import useStore from '../store/useStore'

// Hook: returns a bound updater for a specific node
export function useNodeUpdater(nodeId) {
  const updateNodeData = useStore((s) => s.updateNodeData)
  return (patch) => updateNodeData(nodeId, patch)
}

export function useNodeOptions(typeFilter) {
  const nodes = useStore((s) => s.nodes)
  return buildNodeOptions(nodes, typeFilter)
}

function buildNodeOptions(nodes, typeFilter) {
  const predicate = getTypePredicate(typeFilter)
  return nodes
    .filter((node) => predicate(node.data?.type))
    .map((node) => ({
      id: node.id,
      label: node.data?.label || node.id,
      type: node.data?.type || 'node',
    }))
    .sort((a, b) => {
      const labelA = a.label.toLowerCase()
      const labelB = b.label.toLowerCase()
      if (labelA !== labelB) return labelA.localeCompare(labelB)
      return a.id.localeCompare(b.id)
    })
}

function getTypePredicate(typeFilter) {
  if (!typeFilter) return () => true
  if (Array.isArray(typeFilter)) {
    const allowed = new Set(typeFilter)
    return (type) => allowed.has(type)
  }
  if (typeof typeFilter === 'function') return typeFilter
  return (type) => type === typeFilter
}

function normalizeOptions(options = []) {
  return options
    .filter(Boolean)
    .map((option) => ({
      id: String(option.id ?? ''),
      label: option.label ?? String(option.id ?? ''),
      type: option.type ?? '',
    }))
    .filter((option) => option.id)
}

function matchesQuery(option, query) {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return [option.id, option.label, option.type]
    .filter(Boolean)
    .some((value) => value.toLowerCase().includes(needle))
}

function getDraggedNodeId(e) {
  const raw =
    e.dataTransfer.getData('application/guild-engine-node-id') ||
    e.dataTransfer.getData('text/plain')
  return raw ? raw.split('::')[0] : ''
}

function pickExactOption(options, rawValue) {
  const needle = rawValue.trim().toLowerCase()
  if (!needle) return null
  return options.find((option) =>
    option.id.toLowerCase() === needle ||
    option.label.toLowerCase() === needle
  ) ?? null
}

// Labeled text input
export function Field({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#666680', marginBottom: 4 }}>
        {label}
      </label>
      <input
        type={type}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
        style={{
          width: '100%',
          background: '#1e1e2e',
          border: '1px solid #2a2a3e',
          borderRadius: 6,
          padding: '6px 8px',
          color: '#e0e0f0',
          fontSize: 12,
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
    </div>
  )
}

// Searchable single-select dropdown backed by node options.
export function SearchableDropdown({
  label,
  value,
  onChange,
  options,
  placeholder = '',
  typeFilter,
}) {
  const storeOptions = useNodeOptions(typeFilter)
  const resolvedOptions = normalizeOptions(options ?? storeOptions)
  const [open, setOpen] = useState(false)
  const [over, setOver] = useState(false)
  const blurTimer = useRef(null)

  useEffect(() => {
    return () => {
      if (blurTimer.current) clearTimeout(blurTimer.current)
    }
  }, [])

  const selected = resolvedOptions.find((option) => option.id === value) ?? null
  const query = value ?? ''
  const filtered = resolvedOptions.filter((option) => matchesQuery(option, query))

  const commitValue = (nextValue) => {
    onChange(nextValue)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setOver(false)
    const droppedId = getDraggedNodeId(e)
    if (droppedId) commitValue(droppedId)
  }

  const handleBlur = () => {
    blurTimer.current = setTimeout(() => setOpen(false), 120)
  }

  const handleFocus = () => {
    if (blurTimer.current) clearTimeout(blurTimer.current)
    setOpen(true)
  }

  const clearValue = () => commitValue('')

  const selectOption = (option) => {
    commitValue(option.id)
    setOpen(false)
  }

  return (
    <div style={{ marginBottom: 12, position: 'relative' }}>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#666680', marginBottom: 4 }}>
        {label}
      </label>
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true) }}
        onDragLeave={(e) => { e.stopPropagation(); setOver(false) }}
        onDrop={handleDrop}
        style={{ position: 'relative' }}
      >
        <input
          value={value ?? ''}
          placeholder={placeholder}
          onChange={(e) => commitValue(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={{
            width: '100%',
            background: '#1e1e2e',
            border: `1px solid ${over ? '#7F77DD' : '#2a2a3e'}`,
            borderRadius: 6,
            padding: '6px 8px',
            paddingRight: value ? 28 : 8,
            color: '#e0e0f0',
            fontSize: 12,
            outline: 'none',
            boxSizing: 'border-box',
            boxShadow: over ? '0 0 0 1px rgba(127,119,221,0.18)' : 'none',
          }}
        />
        {value && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={clearValue}
            title="Clear"
            style={{
              position: 'absolute',
              right: 4,
              top: 4,
              width: 18,
              height: 18,
              border: 'none',
              borderRadius: 4,
              background: '#2a2a3e',
              color: '#8888aa',
              cursor: 'pointer',
              fontSize: 12,
              lineHeight: 1,
              padding: 0,
            }}
          >
            ×
          </button>
        )}
      </div>
      <div style={{ minHeight: 16, marginTop: 4, fontSize: 10, color: selected ? '#8888aa' : '#555570' }}>
        {selected
          ? `${selected.label} · ${selected.type}${selected.id !== value ? ` (${selected.id})` : ''}`
          : value
            ? 'Freeform ID'
            : 'Type to search, or drop a node here.'}
      </div>
      {open && filtered.length > 0 && (
        <div
          style={{
            position: 'absolute',
            zIndex: 40,
            left: 0,
            right: 0,
            marginTop: 2,
            background: '#151522',
            border: '1px solid #2a2a3e',
            borderRadius: 8,
            boxShadow: '0 14px 30px rgba(0,0,0,0.35)',
            maxHeight: 220,
            overflowY: 'auto',
          }}
        >
          {filtered.slice(0, 24).map((option) => (
            <button
              key={option.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                selectOption(option)
              }}
              style={{
                width: '100%',
                border: 'none',
                background: 'transparent',
                color: '#e0e0f0',
                textAlign: 'left',
                padding: '8px 10px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                gap: 8,
                alignItems: 'center',
                borderBottom: '1px solid #1e1e2e',
              }}
            >
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {option.label}
                </span>
                <span style={{ fontSize: 10, color: '#666680', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {option.id}
                </span>
              </span>
              <span style={{ fontSize: 10, color: '#8888aa', textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>
                {option.type}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Searchable multi-select dropdown backed by node options.
export function MultiDropdown({
  label,
  values = [],
  onChange,
  options,
  typeFilter,
  placeholder = '',
}) {
  const storeOptions = useNodeOptions(typeFilter)
  const resolvedOptions = normalizeOptions(options ?? storeOptions)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [over, setOver] = useState(false)
  const blurTimer = useRef(null)

  useEffect(() => {
    return () => {
      if (blurTimer.current) clearTimeout(blurTimer.current)
    }
  }, [])

  const selectedOptions = values
    .map((id) => resolvedOptions.find((option) => option.id === id) ?? { id, label: id, type: '' })
    .filter(Boolean)

  const filtered = resolvedOptions.filter(
    (option) => !values.includes(option.id) && matchesQuery(option, query)
  )

  const commitValues = (nextValues) => {
    onChange(nextValues)
  }

  const addValue = (rawValue) => {
    const exact = pickExactOption(resolvedOptions, rawValue)
    const nextId = exact?.id ?? rawValue.trim()
    if (!nextId) return
    if (values.includes(nextId)) {
      setQuery('')
      return
    }
    commitValues([...values, nextId])
    setQuery('')
    setOpen(true)
  }

  const removeValue = (id) => {
    commitValues(values.filter((value) => value !== id))
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setOver(false)
    const droppedId = getDraggedNodeId(e)
    if (droppedId) addValue(droppedId)
  }

  const handleBlur = () => {
    blurTimer.current = setTimeout(() => setOpen(false), 120)
  }

  const handleFocus = () => {
    if (blurTimer.current) clearTimeout(blurTimer.current)
    setOpen(true)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addValue(query)
    } else if (e.key === 'Backspace' && !query && values.length) {
      commitValues(values.slice(0, -1))
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div style={{ marginBottom: 12, position: 'relative' }}>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#666680', marginBottom: 4 }}>
        {label}
      </label>
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true) }}
        onDragLeave={(e) => { e.stopPropagation(); setOver(false) }}
        onDrop={handleDrop}
        style={{
          background: '#1e1e2e',
          border: `1px solid ${over ? '#7F77DD' : '#2a2a3e'}`,
          borderRadius: 6,
          padding: 6,
          boxShadow: over ? '0 0 0 1px rgba(127,119,221,0.18)' : 'none',
        }}
      >
        {selectedOptions.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
            {selectedOptions.map((option) => (
              <span
                key={option.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '3px 7px',
                  borderRadius: 999,
                  background: '#151522',
                  border: '1px solid #2a2a3e',
                  color: '#c0c0d8',
                  fontSize: 11,
                  maxWidth: '100%',
                }}
              >
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {option.label}
                </span>
                <span style={{ fontSize: 9, color: '#666680', textTransform: 'uppercase' }}>
                  {option.type || 'node'}
                </span>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => removeValue(option.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#555570',
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: 12,
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <input
          value={query}
          placeholder={placeholder || 'Type to search and press Enter'}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            color: '#e0e0f0',
            fontSize: 12,
            outline: 'none',
            padding: '2px 2px 1px',
          }}
        />
      </div>
      <div style={{ minHeight: 16, marginTop: 4, fontSize: 10, color: '#555570' }}>
        {values.length
          ? `${values.length} selected`
          : 'Type an ID, press Enter, or drop a node here.'}
      </div>
      {open && filtered.length > 0 && (
        <div
          style={{
            position: 'absolute',
            zIndex: 40,
            left: 0,
            right: 0,
            marginTop: 2,
            background: '#151522',
            border: '1px solid #2a2a3e',
            borderRadius: 8,
            boxShadow: '0 14px 30px rgba(0,0,0,0.35)',
            maxHeight: 220,
            overflowY: 'auto',
          }}
        >
          {filtered.slice(0, 24).map((option) => (
            <button
              key={option.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                addValue(option.id)
              }}
              style={{
                width: '100%',
                border: 'none',
                background: 'transparent',
                color: '#e0e0f0',
                textAlign: 'left',
                padding: '8px 10px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                gap: 8,
                alignItems: 'center',
                borderBottom: '1px solid #1e1e2e',
              }}
            >
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {option.label}
                </span>
                <span style={{ fontSize: 10, color: '#666680', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {option.id}
                </span>
              </span>
              <span style={{ fontSize: 10, color: '#8888aa', textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>
                {option.type}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Labeled textarea
export function TextArea({ label, value, onChange, rows = 3, placeholder = '' }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#666680', marginBottom: 4 }}>
        {label}
      </label>
      <textarea
        value={value ?? ''}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          background: '#1e1e2e',
          border: '1px solid #2a2a3e',
          borderRadius: 6,
          padding: '6px 8px',
          color: '#e0e0f0',
          fontSize: 12,
          outline: 'none',
          resize: 'vertical',
          fontFamily: 'inherit',
          boxSizing: 'border-box',
        }}
      />
    </div>
  )
}

// Labeled select
export function Select({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#666680', marginBottom: 4 }}>
        {label}
      </label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          background: '#1e1e2e',
          border: '1px solid #2a2a3e',
          borderRadius: 6,
          padding: '6px 8px',
          color: '#e0e0f0',
          fontSize: 12,
          outline: 'none',
          boxSizing: 'border-box',
        }}
      >
        {options.map((o) => (
          <option key={o.value ?? o} value={o.value ?? o}>
            {o.label ?? o}
          </option>
        ))}
      </select>
    </div>
  )
}

// Toggle / checkbox
export function Toggle({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <span style={{ fontSize: 12, color: '#c0c0d8' }}>{label}</span>
      <div
        onClick={() => onChange(!value)}
        style={{
          width: 36,
          height: 20,
          borderRadius: 10,
          background: value ? '#7F77DD' : '#2a2a3e',
          cursor: 'pointer',
          position: 'relative',
          transition: 'background 0.2s',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 2,
            left: value ? 18 : 2,
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.2s',
          }}
        />
      </div>
    </div>
  )
}

// Section divider
export function Section({ title }) {
  return (
    <div style={{
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: '#444460',
      borderBottom: '1px solid #2a2a3e',
      paddingBottom: 4,
      marginBottom: 12,
      marginTop: 4,
    }}>
      {title}
    </div>
  )
}

// Stat block editor (key: number pairs)
export function StatBlock({ label, value = {}, onChange }) {
  const entries = Object.entries(value)
  const nextStatId = useRef(1)

  const updateStat = (key, val) => onChange({ ...value, [key]: Number(val) })
  const addStat = () => {
    let index = nextStatId.current
    while (Object.prototype.hasOwnProperty.call(value, `stat_${index}`)) {
      index += 1
    }
    nextStatId.current = index + 1
    const key = `stat_${index}`
    onChange({ ...value, [key]: 0 })
  }
  const removeStat = (key) => {
    const next = { ...value }
    delete next[key]
    onChange(next)
  }

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#666680' }}>
          {label}
        </label>
        <button onClick={addStat} style={addBtnStyle}>+ stat</button>
      </div>
      {entries.map(([key, val]) => (
        <div key={key} style={{ display: 'flex', gap: 6, marginBottom: 4, alignItems: 'center' }}>
          <input
            value={key}
            onChange={(e) => {
              const next = {}
              entries.forEach(([k, v]) => { next[k === key ? e.target.value : k] = v })
              onChange(next)
            }}
            style={{ ...inputStyle, flex: 1 }}
            placeholder="stat"
          />
          <input
            type="number"
            value={val}
            onChange={(e) => updateStat(key, e.target.value)}
            style={{ ...inputStyle, width: 60 }}
          />
          <button onClick={() => removeStat(key)} style={removeBtnStyle}>×</button>
        </div>
      ))}
    </div>
  )
}

// Droppable labeled field — drag a canvas node onto it to fill the ID
export function DroppableField({ label, value, onChange, type = 'text', placeholder = '' }) {
  const [over, setOver] = useState(false)

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setOver(true)
  }
  const handleDragLeave = (e) => {
    e.stopPropagation()
    setOver(false)
  }
  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setOver(false)
    const raw =
      e.dataTransfer.getData('application/guild-engine-node-id') ||
      e.dataTransfer.getData('text/plain')
    if (raw) onChange(raw.split('::')[0])
  }

  return (
    <div style={{ marginBottom: 12, position: 'relative' }}>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#666680', marginBottom: 4 }}>
        {label}
      </label>
      <input
        type={type}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          width: '100%',
          background: '#1e1e2e',
          border: `1px solid ${over ? '#7F77DD' : '#2a2a3e'}`,
          borderRadius: 6,
          padding: '6px 8px',
          paddingRight: over ? 74 : 8,
          color: '#e0e0f0',
          fontSize: 12,
          outline: 'none',
          boxSizing: 'border-box',
          boxShadow: over ? '0 0 0 1px rgba(127,119,221,0.18)' : 'none',
        }}
      />
      {over && (
        <span
          style={{
            position: 'absolute',
            right: 8,
            top: 24,
            fontSize: 10,
            color: '#7F77DD',
            pointerEvents: 'none',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          drop here
        </span>
      )}
    </div>
  )
}

// Droppable raw input (no label wrapper) — for use inside inline cost/production editors
export function DroppableInput({ value, onChange, placeholder = '', style: baseStyle = {} }) {
  const [over, setOver] = useState(false)

  const handleDragOver = (e) => { e.preventDefault(); setOver(true) }
  const handleDragLeave = () => setOver(false)
  const handleDrop = (e) => {
    e.preventDefault()
    setOver(false)
    const raw = e.dataTransfer.getData('text/plain')
    if (raw) onChange(raw.split('::')[0])
  }

  return (
    <input
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        ...baseStyle,
        border: over ? '1px dashed #7F77DD' : (baseStyle.border ?? '1px solid #2a2a3e'),
      }}
    />
  )
}

const inputStyle = {
  background: '#1e1e2e',
  border: '1px solid #2a2a3e',
  borderRadius: 6,
  padding: '4px 6px',
  color: '#e0e0f0',
  fontSize: 12,
  outline: 'none',
}

const addBtnStyle = {
  background: '#2a2a3e',
  border: 'none',
  borderRadius: 4,
  color: '#8888aa',
  fontSize: 10,
  cursor: 'pointer',
  padding: '2px 6px',
}

const removeBtnStyle = {
  background: 'none',
  border: 'none',
  color: '#555570',
  cursor: 'pointer',
  fontSize: 14,
  padding: '0 2px',
}
