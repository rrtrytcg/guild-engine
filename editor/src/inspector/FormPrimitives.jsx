import { useState } from 'react'
import useStore from '../store/useStore'

// Hook: returns a bound updater for a specific node
export function useNodeUpdater(nodeId) {
  const updateNodeData = useStore((s) => s.updateNodeData)
  return (patch) => updateNodeData(nodeId, patch)
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

  const updateStat = (key, val) => onChange({ ...value, [key]: Number(val) })
  const addStat = () => {
    const key = `stat_${Date.now()}`
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

  const handleDragOver = (e) => { e.preventDefault(); setOver(true) }
  const handleDragLeave = () => setOver(false)
  const handleDrop = (e) => {
    e.preventDefault()
    setOver(false)
    const raw = e.dataTransfer.getData('text/plain')
    if (raw) onChange(raw.split('::')[0])
  }

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
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          width: '100%',
          background: '#1e1e2e',
          border: `1px ${over ? 'dashed' : 'solid'} ${over ? '#7F77DD' : '#2a2a3e'}`,
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
