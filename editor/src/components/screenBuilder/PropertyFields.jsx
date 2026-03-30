import { useCallback } from 'react'

/**
 * Generic text field for a property.
 * Shows a plain text input with a label.
 */
export function TextField({ label, value, onChange, placeholder, hint }) {
  return (
    <FieldWrap label={label} hint={hint}>
      <input
        type="text"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={inputStyle}
      />
    </FieldWrap>
  )
}

/**
 * Number field with stepper for numeric properties.
 */
export function NumberField({ label, value, onChange, min, max, step = 1, hint }) {
  return (
    <FieldWrap label={label} hint={hint}>
      <input
        type="number"
        value={value ?? ''}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        style={inputStyle}
      />
    </FieldWrap>
  )
}

/**
 * Color picker field.
 */
export function ColorField({ label, value, onChange }) {
  return (
    <FieldWrap label={label}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="color"
          value={value ?? '#000000'}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: 36, height: 28, padding: 2, borderRadius: 6, border: '1px solid #333', cursor: 'pointer' }}
        />
        <span style={{ fontSize: 12, color: '#8b8baa', fontFamily: 'monospace' }}>{value ?? '#000000'}</span>
      </div>
    </FieldWrap>
  )
}

/**
 * Select field for enum-like choices.
 */
export function SelectField({ label, value, onChange, options, hint }) {
  return (
    <FieldWrap label={label} hint={hint}>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputStyle, cursor: 'pointer' }}
      >
        <option value="">—</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </FieldWrap>
  )
}

/**
 * Toggle/checkbox for boolean properties.
 */
export function BoolField({ label, value, onChange, hint }) {
  return (
    <FieldWrap label={label} hint={hint}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span style={{ fontSize: 12, color: '#c8c4ff' }}>{value ? 'Yes' : 'No'}</span>
      </label>
    </FieldWrap>
  )
}

/**
 * Read-only display of a property value.
 */
export function ReadOnlyField({ label, value }) {
  return (
    <FieldWrap label={label}>
      <span style={{ fontSize: 13, color: '#8b8baa', fontFamily: 'monospace' }}>{String(value ?? '—')}</span>
    </FieldWrap>
  )
}

/**
 * Section header within the properties panel.
 */
export function SectionHeader({ children }) {
  return (
    <div style={sectionHeaderStyle}>{children}</div>
  )
}

/**
 * Thin separator between sections.
 */
export function Divider() {
  return <div style={{ height: 1, background: '#1e1e32', margin: '10px 0' }} />
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function FieldWrap({ label, hint, children }) {
  return (
    <div style={fieldWrapStyle}>
      <div style={fieldLabelRow}>
        <span style={fieldLabelStyle}>{label}</span>
        {hint && <span style={fieldHintStyle}>{hint}</span>}
      </div>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '6px 10px',
  background: '#0e0e1c',
  border: '1px solid #2e2e48',
  borderRadius: 8,
  color: '#e0dcff',
  fontSize: 13,
  outline: 'none',
  transition: 'border-color 0.15s',
}

const fieldWrapStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  marginBottom: 10,
}

const fieldLabelStyle = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.08em',
  color: '#7b78bb',
  textTransform: 'uppercase',
}

const fieldLabelRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}

const fieldHintStyle = {
  fontSize: 10,
  color: '#555570',
  fontWeight: 400,
}

const sectionHeaderStyle = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.12em',
  color: '#5552a0',
  textTransform: 'uppercase',
  marginTop: 12,
  marginBottom: 6,
}
