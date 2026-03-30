/**
 * Screen registry - populated by defineScreen() at bootstrap
 * @type {Map<string, object>}
 */
export const screenRegistry = new Map()

/**
 * Define a screen with its layout configuration
 * @param {string} name - Screen identifier
 * @param {object} config - Screen configuration object
 */
export function defineScreen(name, config) {
  screenRegistry.set(name, config)
}

/**
 * Retrieve a registered screen configuration
 * @param {string} name - Screen identifier
 * @returns {object|null}
 */
export function getScreen(name) {
  return screenRegistry.get(name) ?? null
}

/**
 * Escape HTML special characters for text content
 * @param {string} str
 * @returns {string}
 */
export function escape(str) {
  if (str == null) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Escape HTML special characters for attribute values
 * @param {string} str
 * @returns {string}
 */
export function escapeAttr(str) {
  return escape(str).replace(/"/g, '&quot;')
}

/**
 * Convert style object to CSS string
 * @param {Record<string, string>|undefined} style
 * @returns {string}
 */
export function styleStr(style) {
  if (!style || typeof style !== 'object') return ''
  return Object.entries(style)
    .map(([k, v]) => `${k}:${v}`)
    .join(';')
}

/**
 * Get nested value from object by dot-notation path
 * @param {object} obj
 * @param {string} path
 * @returns {*}
 */
export function getByPath(obj, path) {
  const result = path.split('.').reduce((o, k) => (o ?? {})[k], obj)
  return result === undefined ? null : result
}

/**
 * Resolve {{bindings}} in template string against snapshot
 * @param {string} template
 * @param {object} snapshot
 * @returns {string}
 */
export function resolveBindings(template, snapshot) {
  return String(template).replace(/\{\{([^}]+)\}\}/g, (_, path) => {
    const value = getByPath(snapshot, path.trim())
    return value == null ? '' : escape(String(value))
  })
}

/**
 * Render a container widget (vbox, hbox, grid, stack)
 * @param {object} widget
 * @param {object} snapshot
 * @param {Function} actionHandler
 * @param {number} depth
 * @returns {string}
 */
function renderContainer(widget, snapshot, actionHandler, depth) {
  const { type, children = [], gap = 8, align = 'start', style } = widget
  const displayType = type === 'grid' ? 'grid' : 'flex'
  const flexDirection = type === 'vbox' ? 'column' : type === 'hbox' ? 'row' : 'column'
  const alignItems = align === 'center' ? 'center' : align === 'end' ? 'flex-end' : 'flex-start'
  
  const childHtml = children
    .map((child) => widgetToHTML(child, snapshot, actionHandler, depth + 1))
    .join(`<div style="width:${gap}px;height:0;flex-shrink:0"></div>`)
  
  const baseStyle = `display:${displayType};flex-direction:${flexDirection};align-items:${alignItems}`
  const customStyle = style ? styleStr(style) : ''
  const fullStyle = customStyle ? `${baseStyle};${customStyle}` : baseStyle
  
  return `<div class="widget-${type}" style="${fullStyle}">${childHtml}</div>`
}

/**
 * Render a progressbar widget
 * @param {object} widget
 * @param {object} snapshot
 * @returns {string}
 */
function renderProgressbar(widget, snapshot) {
  const value = resolveBindings(String(widget.value ?? 0), snapshot)
  const max = widget.max ?? 100
  const pct = Math.max(0, Math.min(100, (Number(value) / Number(max)) * 100))
  const color = widget.color ?? '#7F77DD'
  const styleAttr = widget.style ? ` style="${styleStr(widget.style)}"` : ''
  
  return `<div class="widget-progressbar"${styleAttr}>
    <div class="progress-bar-outer" style="height:${widget.height ?? 6}px">
      <div class="progress-bar-inner" style="width:${pct}%;background:${color}"></div>
    </div>
  </div>`
}

/**
 * Render any widget to HTML string
 * @param {object} widget
 * @param {object} snapshot
 * @param {Function} actionHandler
 * @param {number} depth
 * @returns {string}
 */
export function widgetToHTML(widget, snapshot, actionHandler, depth = 0) {
  if (!widget || !widget.type) {
    return `<!-- unknown widget: ${JSON.stringify(widget)} -->`
  }

  switch (widget.type) {
    case 'vbox':
    case 'hbox':
    case 'grid':
    case 'stack':
      return renderContainer(widget, snapshot, actionHandler, depth)

    case 'label':
      return `<span class="widget-label"${widget.style ? ` style="${styleStr(widget.style)}"` : ''}>${resolveBindings(widget.text ?? '', snapshot)}</span>`

    case 'textbutton':
      return `<button class="widget-textbutton" data-action="${escapeAttr(widget.action ?? '')}"${widget.style ? ` style="${styleStr(widget.style)}"` : ''}>${widget.icon ? widget.icon + ' ' : ''}${escape(resolveBindings(widget.label ?? '', snapshot))}</button>`

    case 'iconbutton':
      return `<button class="widget-iconbutton" data-action="${escapeAttr(widget.action ?? '')}"${widget.style ? ` style="${styleStr(widget.style)}"` : ''}>${escape(widget.icon ?? '')}</button>`

    case 'textinput':
      return `<input class="widget-textinput" type="text" placeholder="${escapeAttr(widget.placeholder ?? '')}" value="${escapeAttr(widget.binding ? String(getByPath(snapshot, widget.binding) ?? '') : '')}"${widget.style ? ` style="${styleStr(widget.style)}"` : ''} />`

    case 'progressbar':
      return renderProgressbar(widget, snapshot)

    case 'image':
      return `<img class="widget-image" src="${escapeAttr(widget.src ?? '')}" width="${widget.width ?? ''}" height="${widget.height ?? ''}"${widget.style ? ` style="${styleStr(widget.style)}"` : ''} loading="lazy" />`

    case 'spacer':
      return `<div class="widget-spacer" style="width:${widget.width ?? 0}px;height:${widget.height ?? 0}px"></div>`

    default:
      return `<!-- unknown widget type: ${widget.type} -->`
  }
}

/**
 * Render a registered screen to HTML
 * @param {string} screenName
 * @param {object} snapshot
 * @param {Function} actionHandler
 * @returns {string}
 */
export function renderScreenToHTML(screenName, snapshot, actionHandler) {
  const config = getScreen(screenName)
  if (!config) {
    console.warn(`Screen "${screenName}" not found in registry`)
    return ''
  }

  const layout = config.layout ?? config
  if (!layout || !layout.type) {
    console.warn(`Screen "${screenName}" has no valid layout`)
    return ''
  }

  const containerStyle = config.style ? styleStr(config.style) : ''
  const screenId = `screen-${screenName}`
  const styleAttr = containerStyle ? ` style="${containerStyle}"` : ''
  
  return `<div id="${screenId}" class="widget-screen"${styleAttr}>${widgetToHTML(layout, snapshot, actionHandler, 0)}</div>`
}
