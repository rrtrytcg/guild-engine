import { collectWidgetIds, findWidgetMeta, findWidgetById, isContainerWidgetType } from './screenSchema.js'

export function getDropPosition({ clientY, rect, isContainer }) {
  if (!rect) return isContainer ? 'inside' : 'after'

  const offsetY = clientY - rect.top
  const height = Math.max(rect.height, 1)
  const topZone = height * 0.3
  const bottomZone = height * 0.7

  if (offsetY <= topZone) return 'before'
  if (offsetY >= bottomZone) return 'after'
  return isContainer ? 'inside' : 'after'
}

export function canDrop(layout, { draggedId, targetId, placement }) {
  if (!layout || !draggedId || !targetId || !placement) return false
  if (draggedId === targetId) return false
  if (layout.id === draggedId) return false

  const draggedWidget = findWidgetById(layout, draggedId)
  const targetWidget = findWidgetById(layout, targetId)
  if (!draggedWidget || !targetWidget) return false

  const draggedIds = new Set(collectWidgetIds(draggedWidget))
  if (draggedIds.has(targetId)) return false

  if (placement === 'inside') {
    return isContainerWidgetType(targetWidget.type)
  }

  const targetMeta = findWidgetMeta(layout, targetId)
  if (!targetMeta?.parentId) return false

  return true
}

export function getMoveIntent(layout, { draggedId, targetId, placement }) {
  if (!canDrop(layout, { draggedId, targetId, placement })) return null

  const targetMeta = findWidgetMeta(layout, targetId)
  if (!targetMeta) return null

  if (placement === 'inside') {
    return {
      parentId: targetId,
      index: targetMeta.widget.children?.length ?? 0,
    }
  }

  if (!targetMeta.parentId) return null

  return {
    parentId: targetMeta.parentId,
    index: placement === 'before' ? targetMeta.index : targetMeta.index + 1,
  }
}
