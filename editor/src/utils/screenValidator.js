/**
 * Pure screen validation utility.
 * Validates screen configs and widget trees against the schema rules.
 * Returns { errors, warnings } where each entry has { screenId, widgetId?, path?, message }.
 */

const VALID_WIDGET_TYPES = new Set(['vbox', 'hbox', 'grid', 'stack', 'label', 'textbutton', 'iconbutton', 'textinput', 'progressbar', 'image', 'spacer'])
const CONTAINER_TYPES = new Set(['vbox', 'hbox', 'grid', 'stack'])
const VALID_ALIGN = new Set(['start', 'center', 'end'])
const VALID_GROUPS = new Set(['main', 'secondary', 'debug'])

/**
 * Validate a single screen config object.
 * @param {object} screen - screen config
 * @returns {{ errors: object[], warnings: object[] }}
 */
export function validateScreen(screen) {
  const errors = []
  const warnings = []
  const id = screen?.id ?? 'unknown'

  // ── Top-level screen checks ──────────────────────────────────────────────

  if (!screen) {
    errors.push({ screenId: id, message: 'Screen is null or undefined' })
    return { errors, warnings }
  }

  if (!screen.id || typeof screen.id !== 'string') {
    errors.push({ screenId: id, path: 'id', message: 'Screen must have a string id' })
  } else if (!/^[a-zA-Z0-9._-]+$/.test(screen.id)) {
    errors.push({ screenId: id, path: 'id', message: `Screen id "${screen.id}" contains invalid characters. Use only letters, numbers, dots, underscores, hyphens.` })
  }

  if (!screen.name || typeof screen.name !== 'string') {
    errors.push({ screenId: id, path: 'name', message: 'Screen must have a string name' })
  }

  // ── Nav checks ────────────────────────────────────────────────────────────

  if (screen.nav != null && typeof screen.nav !== 'object') {
    errors.push({ screenId: id, path: 'nav', message: 'nav must be an object' })
  } else if (screen.nav) {
    if (screen.nav.toolbar != null && typeof screen.nav.toolbar !== 'boolean') {
      errors.push({ screenId: id, path: 'nav.toolbar', message: 'nav.toolbar must be a boolean' })
    }
    if (screen.nav.hotkey != null && typeof screen.nav.hotkey !== 'string') {
      errors.push({ screenId: id, path: 'nav.hotkey', message: 'nav.hotkey must be a string' })
    }
    if (screen.nav.group != null && !VALID_GROUPS.has(screen.nav.group)) {
      errors.push({ screenId: id, path: 'nav.group', message: `nav.group must be one of: ${[...VALID_GROUPS].join(', ')}` })
    }
    if (screen.nav.toolbar === true && (!screen.nav.hotkey || !screen.nav.hotkey.trim())) {
      warnings.push({ screenId: id, path: 'nav.hotkey', message: 'Toolbar button has no hotkey — consider adding one for accessibility' })
    }
  }

  // ── Layout checks ────────────────────────────────────────────────────────

  if (!screen.layout) {
    errors.push({ screenId: id, path: 'layout', message: 'Screen must have a layout (root widget)' })
    return { errors, warnings } // can't validate tree without root
  }

  validateWidget(screen.layout, id, errors, warnings)

  // ── Duplicate widget IDs within this screen ──────────────────────────────

  const allIds = []
  collectWidgetIds(screen.layout, allIds)
  const seen = new Set()
  for (const wid of allIds) {
    if (seen.has(wid)) {
      errors.push({ screenId: id, widgetId: wid, message: `Duplicate widget id "${wid}" in screen "${id}"` })
    }
    seen.add(wid)
  }

  return { errors, warnings }
}

/**
 * Validate a widget and its children recursively.
 */
function validateWidget(widget, screenId, errors, warnings, path = 'layout') {
  if (!widget || typeof widget !== 'object') {
    errors.push({ screenId, path, message: 'Widget must be an object' })
    return
  }

  const type = widget.type
  if (!type || typeof type !== 'string') {
    errors.push({ screenId, widgetId: widget.id, path, message: 'Widget is missing a type field' })
    return
  }

  if (!VALID_WIDGET_TYPES.has(type)) {
    errors.push({ screenId, widgetId: widget.id, path, message: `Unknown widget type "${type}". Valid types: ${[...VALID_WIDGET_TYPES].join(', ')}` })
    return
  }

  const wp = path || 'layout'

  // ── Container constraints ─────────────────────────────────────────────

  if (CONTAINER_TYPES.has(type)) {
    const children = widget.children
    if (children != null && !Array.isArray(children)) {
      errors.push({ screenId, widgetId: widget.id, path: `${wp}.children`, message: 'children must be an array' })
    }
    if (widget.gap != null && (typeof widget.gap !== 'number' || widget.gap < 0)) {
      errors.push({ screenId, widgetId: widget.id, path: `${wp}.gap`, message: 'gap must be a non-negative number' })
    }
    if (widget.align != null && !VALID_ALIGN.has(widget.align)) {
      errors.push({ screenId, widgetId: widget.id, path: `${wp}.align`, message: `align must be one of: ${[...VALID_ALIGN].join(', ')}` })
    }
    if (type === 'grid' && widget.columns != null && (typeof widget.columns !== 'number' || widget.columns < 1)) {
      errors.push({ screenId, widgetId: widget.id, path: `${wp}.columns`, message: 'columns must be a positive number' })
    }

    if (Array.isArray(children)) {
      children.forEach((child, index) => {
        validateWidget(child, screenId, errors, warnings, `${wp}.children[${index}]`)
      })
    }
  }

  // ── Type-specific constraints ───────────────────────────────────────────

  if (type === 'label') {
    if (widget.text != null && typeof widget.text !== 'string') {
      errors.push({ screenId, widgetId: widget.id, path: `${wp}.text`, message: 'label text must be a string' })
    }
  }

  if (type === 'textbutton') {
    if (widget.label != null && typeof widget.label !== 'string') {
      errors.push({ screenId, widgetId: widget.id, path: `${wp}.label`, message: 'textbutton label must be a string' })
    }
    if (widget.action != null && typeof widget.action !== 'string') {
      errors.push({ screenId, widgetId: widget.id, path: `${wp}.action`, message: 'textbutton action must be a string' })
    }
    if (!widget.action) {
      warnings.push({ screenId, widgetId: widget.id, path: `${wp}.action`, message: 'textbutton has no action — button will do nothing when clicked' })
    }
  }

  if (type === 'iconbutton') {
    if (widget.icon != null && typeof widget.icon !== 'string') {
      errors.push({ screenId, widgetId: widget.id, path: `${wp}.icon`, message: 'iconbutton icon must be a string' })
    }
    if (widget.action != null && typeof widget.action !== 'string') {
      errors.push({ screenId, widgetId: widget.id, path: `${wp}.action`, message: 'iconbutton action must be a string' })
    }
    if (!widget.action) {
      warnings.push({ screenId, widgetId: widget.id, path: `${wp}.action`, message: 'iconbutton has no action — button will do nothing when clicked' })
    }
  }

  if (type === 'textinput') {
    if (widget.placeholder != null && typeof widget.placeholder !== 'string') {
      errors.push({ screenId, widgetId: widget.id, path: `${wp}.placeholder`, message: 'textinput placeholder must be a string' })
    }
    if (widget.binding != null && typeof widget.binding !== 'string') {
      errors.push({ screenId, widgetId: widget.id, path: `${wp}.binding`, message: 'textinput binding must be a string' })
    }
  }

  if (type === 'progressbar') {
    if (widget.value != null && typeof widget.value !== 'number' && typeof widget.value !== 'string') {
      errors.push({ screenId, widgetId: widget.id, path: `${wp}.value`, message: 'progressbar value must be a number or string' })
    }
    if (widget.max != null && typeof widget.max !== 'number') {
      errors.push({ screenId, widgetId: widget.id, path: `${wp}.max`, message: 'progressbar max must be a number' })
    }
    if (widget.color != null && typeof widget.color !== 'string') {
      errors.push({ screenId, widgetId: widget.id, path: `${wp}.color`, message: 'progressbar color must be a string' })
    }
    if (widget.height != null && typeof widget.height !== 'number') {
      errors.push({ screenId, widgetId: widget.id, path: `${wp}.height`, message: 'progressbar height must be a number' })
    }
  }

  if (type === 'image') {
    if (widget.src != null && typeof widget.src !== 'string') {
      errors.push({ screenId, widgetId: widget.id, path: `${wp}.src`, message: 'image src must be a string' })
    }
    if (widget.width != null && typeof widget.width !== 'number') {
      errors.push({ screenId, widgetId: widget.id, path: `${wp}.width`, message: 'image width must be a number' })
    }
    if (widget.height != null && typeof widget.height !== 'number') {
      errors.push({ screenId, widgetId: widget.id, path: `${wp}.height`, message: 'image height must be a number' })
    }
  }

  if (type === 'spacer') {
    if (widget.width != null && typeof widget.width !== 'number') {
      errors.push({ screenId, widgetId: widget.id, path: `${wp}.width`, message: 'spacer width must be a number' })
    }
    if (widget.height != null && typeof widget.height !== 'number') {
      errors.push({ screenId, widgetId: widget.id, path: `${wp}.height`, message: 'spacer height must be a number' })
    }
  }

  // ── Style checks ────────────────────────────────────────────────────────

  if (widget.style != null && (typeof widget.style !== 'object' || Array.isArray(widget.style))) {
    errors.push({ screenId, widgetId: widget.id, path: `${wp}.style`, message: 'style must be a plain object' })
  }

  // ── Orphaned keys ─────────────────────────────────────────────────────

  const VALID_WIDGET_PROPS = new Set([
    'id', 'type', 'children', 'gap', 'align', 'wrap', 'columns',
    'text', 'label', 'icon', 'action', 'placeholder', 'binding',
    'value', 'max', 'color', 'height', 'src', 'width', 'style',
  ])
  for (const key of Object.keys(widget)) {
    if (!VALID_WIDGET_PROPS.has(key)) {
      warnings.push({ screenId, widgetId: widget.id, path: `${wp}.${key}`, message: `Unknown widget property "${key}"` })
    }
  }
}

/**
 * Collect all widget IDs from a tree.
 */
function collectWidgetIds(widget, out) {
  if (!widget || typeof widget !== 'object') return
  if (widget.id) out.push(widget.id)
  if (Array.isArray(widget.children)) {
    widget.children.forEach((child) => collectWidgetIds(child, out))
  }
}

/**
 * Validate an array of screens.
 * Returns { allErrors, allWarnings } flattened.
 */
export function validateScreens(screens) {
  const allErrors = []
  const allWarnings = []

  if (!Array.isArray(screens)) {
    allErrors.push({ screenId: null, message: 'screens must be an array' })
    return { allErrors, allWarnings }
  }

  if (screens.length === 0) {
    allWarnings.push({ screenId: null, message: 'No screens defined — add a screen to see it in the game UI' })
  }

  // Check for duplicate screen IDs
  const ids = screens.map((s) => s.id).filter(Boolean)
  const seen = new Set()
  for (const id of ids) {
    if (seen.has(id)) {
      allErrors.push({ screenId: id, message: `Duplicate screen id "${id}"` })
    }
    seen.add(id)
  }

  for (const screen of screens) {
    const { errors, warnings } = validateScreen(screen)
    allErrors.push(...errors)
    allWarnings.push(...warnings)
  }

  return { allErrors, allWarnings }
}
