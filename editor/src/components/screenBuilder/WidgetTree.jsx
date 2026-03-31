import { useEffect, useState } from 'react'
import useWidgetTree from '../../hooks/useWidgetTree'
import { canDrop, getDropPosition, getMoveIntent } from '../../utils/dragDropUtils'
import { isContainerWidgetType } from '../../utils/screenSchema'
import ContextMenu from './ContextMenu'
import ScreenErrors from './ScreenErrors'
import WidgetTreeItem from './WidgetTreeItem'

export default function WidgetTree() {
  const {
    activeScreen,
    rootWidget,
    selectedWidgetId,
    ensureDraft,
    selectWidget,
    addWidget,
    deleteWidget,
    duplicateWidget,
    moveWidget,
    wrapWidget,
  } = useWidgetTree()
  const [collapsedIds, setCollapsedIds] = useState(() => new Set())
  const [menu, setMenu] = useState(null)
  const [dragState, setDragState] = useState(null)

  useEffect(() => {
    ensureDraft()
  }, [ensureDraft])

  useEffect(() => {
    setCollapsedIds(new Set())
  }, [activeScreen?.id])

  useEffect(() => {
    if (!menu) return undefined

    const handleWindowClick = () => setMenu(null)
    const handleEscape = (event) => {
      if (event.key === 'Escape') setMenu(null)
    }

    window.addEventListener('click', handleWindowClick)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('click', handleWindowClick)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [menu])

  const toggleCollapse = (widgetId) => {
    setCollapsedIds((current) => {
      const next = new Set(current)
      if (next.has(widgetId)) next.delete(widgetId)
      else next.add(widgetId)
      return next
    })
  }

  const openMenu = (event, widget) => {
    event.preventDefault()
    event.stopPropagation()
    selectWidget(widget.id)
    setMenu({
      x: Math.min(event.clientX, window.innerWidth - 320),
      y: Math.min(event.clientY, window.innerHeight - 24),
      widgetId: widget.id,
      widgetType: widget.type,
      isContainer: isContainerWidgetType(widget.type),
      isRoot: rootWidget?.id === widget.id,
    })
  }

  const runMenuAction = (action) => {
    if (!menu) return
    action(menu.widgetId)
    setMenu(null)
  }

  const startDrag = (event, widget) => {
    if (rootWidget?.id === widget.id) return

    event.stopPropagation()
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', widget.id)
    setDragState({ draggedId: widget.id, overId: null, placement: null })
  }

  const updateDropTarget = (event, widget) => {
    if (!dragState?.draggedId || !rootWidget) return

    const placement = getDropPosition({
      clientY: event.clientY,
      rect: event.currentTarget.getBoundingClientRect(),
      isContainer: isContainerWidgetType(widget.type),
    })

    if (!canDrop(rootWidget, { draggedId: dragState.draggedId, targetId: widget.id, placement })) {
      setDragState((current) => current ? { ...current, overId: null, placement: null } : current)
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDragState((current) => current ? {
      ...current,
      overId: widget.id,
      placement,
    } : current)
  }

  const commitDrop = (event, widget) => {
    if (!dragState?.draggedId || !rootWidget) {
      setDragState(null)
      return
    }

    const placement = getDropPosition({
      clientY: event.clientY,
      rect: event.currentTarget.getBoundingClientRect(),
      isContainer: isContainerWidgetType(widget.type),
    })
    const intent = getMoveIntent(rootWidget, {
      draggedId: dragState.draggedId,
      targetId: widget.id,
      placement,
    })

    event.preventDefault()

    if (intent) {
      moveWidget(dragState.draggedId, intent.parentId, intent.index)
      selectWidget(dragState.draggedId)
    }

    setDragState(null)
  }

  return (
    <div style={treeWrapStyle} onClick={() => setMenu(null)}>
      <div style={hintStyle}>
        Right-click a container to add widgets. Drag rows to reorder.
      </div>

      <ScreenErrors />

      <div style={treeScrollStyle}>
        {rootWidget ? (
          <WidgetTreeItem
            widget={rootWidget}
            depth={0}
            selectedWidgetId={selectedWidgetId}
            collapsedIds={collapsedIds}
            onSelect={selectWidget}
            onToggleCollapse={toggleCollapse}
            onOpenMenu={openMenu}
            dragState={dragState}
            onDragStart={startDrag}
            onDragOver={updateDropTarget}
            onDrop={commitDrop}
            onDragEnd={() => setDragState(null)}
            rootWidgetId={rootWidget.id}
          />
        ) : (
          <div style={emptyStyle}>No screen loaded yet.</div>
        )}
      </div>

      <ContextMenu
        menu={menu}
        onAddWidget={(type) => runMenuAction((widgetId) => addWidget(widgetId, type))}
        onDuplicate={() => runMenuAction(duplicateWidget)}
        onDelete={() => runMenuAction(deleteWidget)}
        onWrap={(type) => runMenuAction((widgetId) => wrapWidget(widgetId, type))}
      />
    </div>
  )
}

const treeWrapStyle = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  height: '100%',
  overflow: 'hidden',
}

const hintStyle = {
  fontSize: 11,
  lineHeight: 1.4,
  color: '#6e6e92',
  marginBottom: 10,
}

const treeScrollStyle = {
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  paddingRight: 4,
}

const emptyStyle = {
  fontSize: 13,
  color: '#8e8ea8',
  paddingTop: 20,
}
