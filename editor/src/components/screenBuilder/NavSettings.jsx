import useStore from '../../store/useStore'
import useWidgetTree from '../../hooks/useWidgetTree'
import { TextField, BoolField, SelectField, SectionHeader, Divider } from './PropertyFields'

const NOOP = () => {}

export default function NavSettings() {
  const activeScreen = useStore((s) => s.activeScreen)
  const updateScreenNav = useStore((s) => s.updateScreenNav) ?? NOOP

  const nav = activeScreen?.nav ?? {}
  const screenId = activeScreen?.id ?? null

  if (!screenId) {
    return (
      <div style={emptyStyle}>
        No screen selected
      </div>
    )
  }

  const handleNavChange = (key) => (value) => {
    updateScreenNav(screenId, { [key]: value })
  }

  return (
    <div style={wrapStyle}>
      <SectionHeader>Navigation</SectionHeader>

      <BoolField
        label="Show in Toolbar"
        value={nav.toolbar}
        onChange={handleNavChange('toolbar')}
      />

      <TextField
        label="Hotkey"
        value={nav.hotkey}
        onChange={handleNavChange('hotkey')}
        placeholder="I"
        hint="Single key (e.g. I, F1, ~)"
      />

      <SelectField
        label="Toolbar Group"
        value={nav.group}
        onChange={handleNavChange('group')}
        options={[
          { value: 'main', label: 'Main' },
          { value: 'secondary', label: 'Secondary' },
          { value: 'debug', label: 'Debug' },
        ]}
      />

      <Divider />

      <div style={screenIdStyle}>
        <span style={screenIdLabel}>Screen ID</span>
        <span style={screenIdValue}>{screenId}</span>
      </div>
    </div>
  )
}

const emptyStyle = {
  fontSize: 13,
  color: '#5555a0',
  padding: '12px 0',
}

const wrapStyle = {
  padding: '14px 16px 0',
}

const screenIdStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 3,
  marginTop: 4,
}

const screenIdLabel = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.08em',
  color: '#5552a0',
  textTransform: 'uppercase',
}

const screenIdValue = {
  fontSize: 11,
  color: '#8b8baa',
  fontFamily: 'monospace',
  wordBreak: 'break-all',
}
