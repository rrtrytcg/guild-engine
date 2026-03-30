import useWidgetTree from '../../hooks/useWidgetTree'
import useStore from '../../store/useStore'
import {
  TextField,
  NumberField,
  SelectField,
  ColorField,
  ReadOnlyField,
  SectionHeader,
  Divider,
} from './PropertyFields'
import {
  CONTAINER_WIDGET_TYPES,
  DISPLAY_WIDGET_TYPES,
  INTERACTIVE_WIDGET_TYPES,
} from '../../utils/screenSchema'

const NOOP = () => {}

export default function WidgetProperties() {
  const { selectedWidget, selectedWidgetId } = useWidgetTree()
  const updateWidget = useStore((s) => s.updateScreenWidget) ?? NOOP

  if (!selectedWidget || !selectedWidgetId) {
    return (
      <div style={emptyState}>
        <span style={{ fontSize: 28 }}>⊙</span>
        <p style={{ color: '#5555a0', fontSize: 13, margin: '8px 0 0', lineHeight: 1.5 }}>
          Select a widget<br />to edit its properties
        </p>
      </div>
    )
  }

  const { type, id } = selectedWidget
  const isContainer = CONTAINER_WIDGET_TYPES.includes(type)
  const isInteractive = INTERACTIVE_WIDGET_TYPES.includes(type)
  const isDisplay = DISPLAY_WIDGET_TYPES.includes(type)
  const isTextDisplay = type === 'label'
  const isProgressbar = type === 'progressbar'
  const isImage = type === 'image'
  const isSpacer = type === 'spacer'
  const isTextInput = type === 'textinput'
  const isButton = type === 'textbutton' || type === 'iconbutton'

  const handleChange = (path) => (value) => {
    updateWidget(selectedWidgetId, path, value)
  }

  return (
    <div style={panelBody}>
      {/* ── Common ─────────────────────────────── */}
      <SectionHeader>Common</SectionHeader>
      <ReadOnlyField label="Type" value={type} />
      <TextField label="Widget ID" value={id} onChange={handleChange('id')} placeholder="my-widget" />

      {/* ── Layout (containers) ───────────────── */}
      {isContainer && (
        <>
          <Divider />
          <SectionHeader>Layout</SectionHeader>
          {type !== 'stack' && (
            <NumberField
              label="Gap"
              value={selectedWidget.gap}
              onChange={handleChange('gap')}
              min={0}
              max={200}
              hint="px"
            />
          )}
          <SelectField
            label="Align"
            value={selectedWidget.align}
            onChange={handleChange('align')}
            options={[
              { value: 'start', label: 'Start' },
              { value: 'center', label: 'Center' },
              { value: 'end', label: 'End' },
            ]}
          />
          {type === 'grid' && (
            <TextField
              label="Columns"
              value={selectedWidget.columns}
              onChange={handleChange('columns')}
              placeholder="3"
              hint="number"
            />
          )}
          <TextField
            label="Wrap"
            value={selectedWidget.wrap}
            onChange={handleChange('wrap')}
            placeholder="nowrap"
            hint="CSS flex-wrap"
          />
        </>
      )}

      {/* ── Text content ──────────────────────── */}
      {(isTextDisplay || isButton) && (
        <>
          <Divider />
          <SectionHeader>Text</SectionHeader>
          {isTextDisplay && (
            <TextField
              label="Text"
              value={selectedWidget.text}
              onChange={handleChange('text')}
              placeholder="Label text..."
              hint="Supports {{bindings}}"
            />
          )}
          {isButton && (
            <TextField
              label="Label"
              value={selectedWidget.label}
              onChange={handleChange('label')}
              placeholder="Button label..."
            />
          )}
          {type === 'iconbutton' && (
            <TextField
              label="Icon"
              value={selectedWidget.icon}
              onChange={handleChange('icon')}
              placeholder="★"
              hint="Emoji or character"
            />
          )}
        </>
      )}

      {/* ── Interactive actions ───────────────── */}
      {isInteractive && (
        <>
          <Divider />
          <SectionHeader>Action</SectionHeader>
          <TextField
            label="Action"
            value={selectedWidget.action}
            onChange={handleChange('action')}
            placeholder="my_action"
            hint="snake_case action name"
          />
        </>
      )}

      {/* ── Input / binding ───────────────────── */}
      {isTextInput && (
        <>
          <Divider />
          <SectionHeader>Input</SectionHeader>
          <TextField
            label="Placeholder"
            value={selectedWidget.placeholder}
            onChange={handleChange('placeholder')}
            placeholder="Enter text..."
          />
          <TextField
            label="Binding"
            value={selectedWidget.binding}
            onChange={handleChange('binding')}
            placeholder="player.name"
            hint="dot-notation path"
          />
        </>
      )}

      {/* ── Progressbar ───────────────────────── */}
      {isProgressbar && (
        <>
          <Divider />
          <SectionHeader>Progress</SectionHeader>
          <TextField
            label="Value"
            value={selectedWidget.value}
            onChange={handleChange('value')}
            placeholder="50 or {{hero.hp}}"
            hint="number or {{binding}}"
          />
          <TextField
            label="Max"
            value={selectedWidget.max}
            onChange={handleChange('max')}
            placeholder="100"
          />
          <ColorField
            label="Color"
            value={selectedWidget.color}
            onChange={handleChange('color')}
          />
          <NumberField
            label="Height"
            value={selectedWidget.height}
            onChange={handleChange('height')}
            min={1}
            max={64}
            hint="px"
          />
        </>
      )}

      {/* ── Image ─────────────────────────────── */}
      {isImage && (
        <>
          <Divider />
          <SectionHeader>Image</SectionHeader>
          <TextField
            label="Src"
            value={selectedWidget.src}
            onChange={handleChange('src')}
            placeholder="https://..."
          />
          <NumberField
            label="Width"
            value={selectedWidget.width}
            onChange={handleChange('width')}
            min={0}
            hint="px"
          />
          <NumberField
            label="Height"
            value={selectedWidget.height}
            onChange={handleChange('height')}
            min={0}
            hint="px"
          />
        </>
      )}

      {/* ── Spacer ───────────────────────────── */}
      {isSpacer && (
        <>
          <Divider />
          <SectionHeader>Size</SectionHeader>
          <NumberField
            label="Width"
            value={selectedWidget.width}
            onChange={handleChange('width')}
            min={0}
            hint="px"
          />
          <NumberField
            label="Height"
            value={selectedWidget.height}
            onChange={handleChange('height')}
            min={0}
            hint="px"
          />
        </>
      )}

      {/* ── Style overrides ───────────────────── */}
      <Divider />
      <SectionHeader>Style Overrides</SectionHeader>
      <ColorField
        label="Text Color"
        value={selectedWidget.style?.color}
        onChange={handleChange('style.color')}
      />
      <ColorField
        label="Background"
        value={selectedWidget.style?.background}
        onChange={handleChange('style.background')}
      />
      <TextField
        label="Font Size"
        value={selectedWidget.style?.['font-size']}
        onChange={handleChange('style.font-size')}
        placeholder="14px"
        hint="CSS value"
      />
      <SelectField
        label="Font Weight"
        value={selectedWidget.style?.['font-weight']}
        onChange={handleChange('style.font-weight')}
        options={[
          { value: 'normal', label: 'Normal' },
          { value: 'bold', label: 'Bold' },
        ]}
      />
      <TextField
        label="Custom CSS"
        value={selectedWidget.style?._ ?? ''}
        onChange={handleChange('style._')}
        placeholder="margin: 8px"
        hint="additional CSS"
      />
    </div>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const emptyState = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 1,
  minHeight: 0,
  color: '#333355',
}

const panelBody = {
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  padding: '14px 16px 24px',
}
