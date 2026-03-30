export const CONTAINER_WIDGET_TYPES = ['vbox', 'hbox', 'grid', 'stack']
export const DISPLAY_WIDGET_TYPES = ['label', 'image', 'progressbar', 'spacer']
export const INTERACTIVE_WIDGET_TYPES = ['textbutton', 'iconbutton', 'textinput']
export const ALL_WIDGET_TYPES = [
  ...CONTAINER_WIDGET_TYPES,
  ...DISPLAY_WIDGET_TYPES,
  ...INTERACTIVE_WIDGET_TYPES,
]

export function isContainerWidgetType(type) {
  return CONTAINER_WIDGET_TYPES.includes(type)
}

export function getScreenLayout(screen) {
  return screen?.layout ?? null
}

export function withScreenLayout(screen, layout) {
  if (!screen) return null
  return { ...screen, layout }
}

export function createDemoScreenDraft() {
  return {
    id: 'ui.inventory',
    name: 'Inventory',
    nav: {
      toolbar: true,
      hotkey: 'I',
      group: 'main',
    },
    layout: {
      id: 'root',
      type: 'vbox',
      gap: 12,
      children: [
        {
          id: 'title_label',
          type: 'label',
          text: 'Inventory',
        },
        {
          id: 'gold_label',
          type: 'label',
          text: 'Gold: {{resources.gold}}',
        },
        {
          id: 'close_button',
          type: 'textbutton',
          label: 'Close',
          action: 'close_inventory',
        },
      ],
    },
  }
}

export function collectWidgetIds(widget) {
  if (!widget?.id) return []

  const ids = [widget.id]
  for (const child of widget.children ?? []) {
    ids.push(...collectWidgetIds(child))
  }
  return ids
}

export function countWidgets(widget) {
  return collectWidgetIds(widget).length
}

export function findWidgetById(widget, targetId) {
  if (!widget || !targetId) return null
  if (widget.id === targetId) return widget

  for (const child of widget.children ?? []) {
    const match = findWidgetById(child, targetId)
    if (match) return match
  }

  return null
}

export function findWidgetMeta(widget, targetId, parentId = null, index = 0) {
  if (!widget || !targetId) return null
  if (widget.id === targetId) {
    return {
      widget,
      parentId,
      index,
    }
  }

  for (let childIndex = 0; childIndex < (widget.children?.length ?? 0); childIndex += 1) {
    const match = findWidgetMeta(widget.children[childIndex], targetId, widget.id, childIndex)
    if (match) return match
  }

  return null
}

export function generateWidgetId(type, existingIds = []) {
  const usedIds = existingIds instanceof Set ? existingIds : new Set(existingIds)
  const base = String(type ?? 'widget')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase() || 'widget'

  let nextIndex = 1
  let candidate = `${base}_${nextIndex}`
  while (usedIds.has(candidate)) {
    nextIndex += 1
    candidate = `${base}_${nextIndex}`
  }

  usedIds.add(candidate)
  return candidate
}

export function createWidget(type, existingIds = []) {
  const id = generateWidgetId(type, existingIds)

  switch (type) {
    case 'vbox':
    case 'hbox':
    case 'grid':
      return { id, type, gap: 8, children: [] }
    case 'stack':
      return { id, type, children: [] }
    case 'label':
      return { id, type, text: 'New Label' }
    case 'image':
      return { id, type, src: '', width: 64, height: 64 }
    case 'progressbar':
      return { id, type, value: 50, max: 100, height: 8 }
    case 'spacer':
      return { id, type, width: 16, height: 16 }
    case 'textbutton':
      return { id, type, label: 'Button', action: '' }
    case 'iconbutton':
      return { id, type, icon: '★', action: '' }
    case 'textinput':
      return { id, type, placeholder: 'Enter text', binding: '' }
    default:
      return { id, type }
  }
}

export function addWidgetToTree(widget, parentId, newWidget) {
  if (!widget || !parentId || !newWidget) return widget

  if (widget.id === parentId && isContainerWidgetType(widget.type)) {
    return {
      ...widget,
      children: [...(widget.children ?? []), newWidget],
    }
  }

  if (!Array.isArray(widget.children) || widget.children.length === 0) {
    return widget
  }

  let didChange = false
  const nextChildren = widget.children.map((child) => {
    const nextChild = addWidgetToTree(child, parentId, newWidget)
    if (nextChild !== child) didChange = true
    return nextChild
  })

  return didChange ? { ...widget, children: nextChildren } : widget
}

export function deleteWidgetFromTree(widget, targetId) {
  if (!widget || !targetId || widget.id === targetId) return widget
  if (!Array.isArray(widget.children) || widget.children.length === 0) return widget

  let didChange = false
  const nextChildren = []

  for (const child of widget.children) {
    if (child.id === targetId) {
      didChange = true
      continue
    }

    const nextChild = deleteWidgetFromTree(child, targetId)
    if (nextChild !== child) didChange = true
    nextChildren.push(nextChild)
  }

  return didChange ? { ...widget, children: nextChildren } : widget
}

export function cloneWidgetWithFreshIds(widget, existingIds = []) {
  const usedIds = existingIds instanceof Set ? new Set(existingIds) : new Set(existingIds)
  return cloneWidgetNode(widget, usedIds)
}

function cloneWidgetNode(widget, usedIds) {
  if (!widget?.type) return widget

  const nextId = generateWidgetId(widget.type, usedIds)
  const nextChildren = Array.isArray(widget.children)
    ? widget.children.map((child) => cloneWidgetNode(child, usedIds))
    : undefined

  const cloned = { ...widget, id: nextId }
  if (nextChildren) cloned.children = nextChildren
  return cloned
}

export function duplicateWidgetInTree(widget, targetId, existingIds = []) {
  if (!widget || !targetId) return widget
  if (!Array.isArray(widget.children) || widget.children.length === 0) return widget

  let didChange = false
  const nextChildren = []

  for (const child of widget.children) {
    nextChildren.push(child)

    if (child.id === targetId) {
      nextChildren.push(cloneWidgetWithFreshIds(child, existingIds))
      didChange = true
      continue
    }

    const nextChild = duplicateWidgetInTree(child, targetId, existingIds)
    if (nextChild !== child) {
      nextChildren[nextChildren.length - 1] = nextChild
      didChange = true
    }
  }

  return didChange ? { ...widget, children: nextChildren } : widget
}

export function wrapWidgetInTree(widget, targetId, containerType, existingIds = []) {
  if (!widget || !targetId || !isContainerWidgetType(containerType)) return widget
  if (!Array.isArray(widget.children) || widget.children.length === 0) return widget

  const usedIds = existingIds instanceof Set ? new Set(existingIds) : new Set(existingIds)
  let didChange = false

  const nextChildren = widget.children.map((child) => {
    if (child.id === targetId) {
      didChange = true
      const wrapper = createWidget(containerType, usedIds)
      return {
        ...wrapper,
        children: [child],
      }
    }

    const nextChild = wrapWidgetInTree(child, targetId, containerType, usedIds)
    if (nextChild !== child) didChange = true
    return nextChild
  })

  return didChange ? { ...widget, children: nextChildren } : widget
}

export function moveWidgetInTree(widget, draggedId, targetParentId, targetIndex) {
  if (!widget || !draggedId || !targetParentId) return widget
  if (widget.id === draggedId) return widget

  const draggedMeta = findWidgetMeta(widget, draggedId)
  const targetParentMeta = findWidgetMeta(widget, targetParentId)

  if (!draggedMeta?.parentId || !targetParentMeta?.widget) return widget
  if (!isContainerWidgetType(targetParentMeta.widget.type)) return widget

  const draggedSubtreeIds = new Set(collectWidgetIds(draggedMeta.widget))
  if (draggedSubtreeIds.has(targetParentId)) return widget

  const detached = detachWidget(widget, draggedId)
  if (!detached.removedWidget) return widget

  let nextIndex = normalizeInsertIndex(targetIndex, targetParentMeta.widget.children?.length ?? 0)
  if (draggedMeta.parentId === targetParentId && draggedMeta.index < nextIndex) {
    nextIndex -= 1
  }

  const nextTree = insertWidgetAt(detached.tree, targetParentId, nextIndex, detached.removedWidget)
  return nextTree ?? widget
}

function detachWidget(widget, targetId) {
  if (!widget || !Array.isArray(widget.children) || widget.children.length === 0) {
    return { tree: widget, removedWidget: null }
  }

  let removedWidget = null
  let didChange = false
  const nextChildren = []

  for (const child of widget.children) {
    if (child.id === targetId) {
      removedWidget = child
      didChange = true
      continue
    }

    const detachedChild = detachWidget(child, targetId)
    if (detachedChild.removedWidget) {
      removedWidget = detachedChild.removedWidget
      didChange = true
      nextChildren.push(detachedChild.tree)
      continue
    }

    nextChildren.push(child)
  }

  return {
    tree: didChange ? { ...widget, children: nextChildren } : widget,
    removedWidget,
  }
}

function insertWidgetAt(widget, parentId, targetIndex, childWidget) {
  if (!widget || !parentId || !childWidget) return widget

  if (widget.id === parentId && isContainerWidgetType(widget.type)) {
    const children = [...(widget.children ?? [])]
    const safeIndex = normalizeInsertIndex(targetIndex, children.length)
    children.splice(safeIndex, 0, childWidget)
    return { ...widget, children }
  }

  if (!Array.isArray(widget.children) || widget.children.length === 0) return widget

  let didChange = false
  const nextChildren = widget.children.map((child) => {
    const nextChild = insertWidgetAt(child, parentId, targetIndex, childWidget)
    if (nextChild !== child) didChange = true
    return nextChild
  })

  return didChange ? { ...widget, children: nextChildren } : widget
}

function normalizeInsertIndex(index, length) {
  if (!Number.isFinite(index)) return length
  return Math.max(0, Math.min(length, Number(index)))
}

/**
 * Shallow-omit keys from an object
 * @param {object} obj
 * @param {string[]} keys
 * @returns {object}
 */
export function omit(obj, keys) {
  if (!obj || typeof obj !== 'object') return obj
  const set = new Set(keys)
  return Object.fromEntries(Object.entries(obj).filter(([k]) => !set.has(k)))
}

/**
 * Shallow-pick keys from an object
 * @param {object} obj
 * @param {string[]} keys
 * @returns {object}
 */
export function pick(obj, keys) {
  if (!obj || typeof obj !== 'object') return {}
  const set = new Set(keys)
  return Object.fromEntries(Object.entries(obj).filter(([k]) => set.has(k)))
}

/**
 * Update specific fields on a widget node (returns new widget, not mutated).
 * Supports dotted paths like "style.color" via manual nested handling here.
 * @param {object} widget
 * @param {string} path - dot-notation path to field
 * @param {*} value
 * @returns {object} new widget
 */
export function updateWidgetField(widget, path, value) {
  if (!widget) return widget

  const parts = path.split('.')
  if (parts.length === 1) {
    // Direct field update
    if (widget[path] === value) return widget
    return { ...widget, [path]: value }
  }

  // Handle top-level "style" merges
  if (parts[0] === 'style' && parts.length === 2) {
    const styleKey = parts[1]
    const prevStyle = widget.style ?? {}
    const nextStyle = value === '' || value == null
      ? omit(prevStyle, [styleKey])
      : { ...prevStyle, [styleKey]: value }
    return {
      ...widget,
      style: Object.keys(nextStyle).length > 0 ? nextStyle : undefined,
    }
  }

  // Generic nested field for children (used for specific child updates)
  // For now, only handle top-level + style
  return widget
}

/**
 * Apply a partial field update to a widget anywhere in the tree.
 * @param {object} widget
 * @param {string} targetId
 * @param {string} path - dot-notation field path
 * @param {*} value
 * @returns {object} new tree
 */
export function updateWidgetInTree(widget, targetId, path, value) {
  if (!widget || !targetId) return widget

  if (widget.id === targetId) {
    const next = updateWidgetField(widget, path, value)
    return next === widget ? widget : next
  }

  if (!Array.isArray(widget.children) || widget.children.length === 0) return widget

  let didChange = false
  const nextChildren = widget.children.map((child) => {
    const next = updateWidgetInTree(child, targetId, path, value)
    if (next !== child) didChange = true
    return next
  })

  return didChange ? { ...widget, children: nextChildren } : widget
}
