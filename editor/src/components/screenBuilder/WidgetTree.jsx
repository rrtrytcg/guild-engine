import { useEffect, useRef, useState } from 'react'
import useWidgetTree from '../../hooks/useWidgetTree'
import useStore from '../../store/useStore'
import { canDrop, getDropPosition, getMoveIntent } from '../../utils/dragDropUtils'
import { isContainerWidgetType } from '../../utils/screenSchema'
import useScreenFiles from '../../hooks/useScreenFiles'
import ConfirmDialog from './ConfirmDialog'
import ContextMenu from './ContextMenu'
import ScreenErrors from './ScreenErrors'
import WidgetTreeItem from './WidgetTreeItem'

export default function WidgetTree() {
  const {
    activeScreen,
    screens,
    rootWidget,
    selectedWidgetId,
    widgetCount,
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
  const [showNewScreenForm, setShowNewScreenForm] = useState(false)
  const [newScreenName, setNewScreenName] = useState('')
  const [renameTarget, setRenameTarget] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const fileInputRef = useRef(null)
  const newScreenInputRef = useRef(null)
  const renameInputRef = useRef(null)
  const { loadFromFiles, saveActiveScreen, selectScreen, isDirty } = useScreenFiles()
  const createScreen = useStore((s) => s.createScreen) ?? (() => {})
  const renameScreen = useStore((s) => s.renameScreen) ?? (() => {})
  const deleteScreen = useStore((s) => s.deleteScreen) ?? (() => {})

  useEffect(() => {
    ensureDraft()
  }, [ensureDraft])

  useEffect(() => {
    setCollapsedIds(new Set())
  }, [activeScreen?.id])

  useEffect(() => {
    if (showNewScreenForm && newScreenInputRef.current) {
      newScreenInputRef.current.focus()
    }
  }, [showNewScreenForm])

  useEffect(() => {
    if (renameTarget !== null && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [renameTarget])

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

  const handleNewScreenSubmit = (e) => {
    e?.preventDefault()
    const name = newScreenName.trim() || 'New Screen'
    createScreen(name)
    setNewScreenName('')
    setShowNewScreenForm(false)
  }

  const handleRenameSubmit = (e) => {
    e?.preventDefault()
    if (renameTarget !== null) {
      renameScreen(renameTarget, renameValue)
    }
    setRenameTarget(null)
    setRenameValue('')
  }

  const handleDeleteConfirm = () => {
    if (deleteTarget !== null) {
      deleteScreen(deleteTarget)
    }
    setDeleteTarget(null)
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
      <div style={headerStyle}>
        <div>
          <div style={eyebrowStyle}>Widget Tree</div>
          <div style={titleStyle}>{activeScreen?.name ?? 'Screen structure'}</div>
        </div>
        <div style={countStyle}>{widgetCount} widgets</div>
      </div>

      <div style={hintStyle}>
        Right-click a container to add widgets. Drag rows to reorder or move them into another container.
      </div>

      <div style={toolbarRowStyle}>
        <button type="button" onClick={() => fileInputRef.current?.click()} style={toolbarButtonStyle}>
          Load
        </button>
        <button type="button" onClick={() => void saveActiveScreen()} style={toolbarButtonStyle}>
          Save
        </button>
        <button type="button" onClick={() => setShowNewScreenForm(true)} style={toolbarButtonStyle}>
          + New
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.screen.json,application/json"
          multiple
          style={{ display: 'none' }}
          onChange={(event) => {
            void loadFromFiles(event.target.files)
            event.target.value = ''
          }}
        />
      </div>

      <ScreenErrors />

      {showNewScreenForm && (
        <form onSubmit={handleNewScreenSubmit} style={newScreenFormStyle}>
          <input
            ref={newScreenInputRef}
            type="text"
            value={newScreenName}
            onChange={(e) => setNewScreenName(e.target.value)}
            placeholder="Screen name..."
            style={newScreenInputStyle}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setShowNewScreenForm(false)
                setNewScreenName('')
              }
            }}
          />
          <button type="submit" style={newScreenSubmitBtnStyle}>Create</button>
          <button
            type="button"
            onClick={() => { setShowNewScreenForm(false); setNewScreenName('') }}
            style={newScreenCancelBtnStyle}
          >
            ✕
          </button>
        </form>
      )}

      <div style={screenTabsWrapStyle}>
        {screens.map((screen) => (
          <div
            key={screen.id}
            style={screenTabOuterStyle(activeScreen?.id === screen.id)}
            onDoubleClick={() => {
              setRenameTarget(screen.id)
              setRenameValue(screen.name)
            }}
          >
            {renameTarget === screen.id ? (
              <form onSubmit={handleRenameSubmit} style={{ display: 'contents' }}>
                <input
                  ref={renameInputRef}
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  style={renameInputStyle}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setRenameTarget(null)
                      setRenameValue('')
                    }
                  }}
                  onBlur={handleRenameSubmit}
                />
              </form>
            ) : (
              <button
                type="button"
                onClick={() => selectScreen(screen.id)}
                style={screenTabBtnStyle(activeScreen?.id === screen.id)}
                title={`${screen.name}\n(Double-click to rename)`}
              >
                {screen.name}
              </button>
            )}
            {screens.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setDeleteTarget({ id: screen.id, name: screen.name })
                }}
                style={deleteTabBtnStyle}
                title="Delete screen"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        {isDirty && <span style={dirtyBadgeStyle}>Unsaved</span>}
      </div>

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

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Screen"
          message={`Delete "${deleteTarget.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          destructive
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

const treeWrapStyle = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  height: '100%',
}

const headerStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 12,
}

const eyebrowStyle = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.14em',
  color: '#7F77DD',
  textTransform: 'uppercase',
}

const titleStyle = {
  fontSize: 18,
  fontWeight: 700,
  color: '#f3f3ff',
  marginTop: 8,
}

const countStyle = {
  borderRadius: 999,
  border: '1px solid #2f2f48',
  background: '#171727',
  color: '#b9b8d2',
  fontSize: 11,
  fontWeight: 700,
  padding: '6px 10px',
}

const hintStyle = {
  fontSize: 12,
  lineHeight: 1.5,
  color: '#9797b2',
  marginTop: 12,
  marginBottom: 14,
}

const treeScrollStyle = {
  minHeight: 0,
  overflowY: 'auto',
  paddingRight: 4,
}

const toolbarRowStyle = {
  display: 'flex',
  gap: 8,
  marginBottom: 12,
}

const toolbarButtonStyle = {
  background: '#171727',
  border: '1px solid #2f2f48',
  borderRadius: 8,
  color: '#d7d7ee',
  fontSize: 12,
  fontWeight: 700,
  padding: '8px 10px',
  cursor: 'pointer',
}

const screenTabsWrapStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
  marginBottom: 12,
}

const screenTabStyle = (active) => ({
  background: active ? '#201d47' : '#151523',
  border: `1px solid ${active ? '#4b44a6' : '#2f2f48'}`,
  borderRadius: 999,
  color: active ? '#f3f3ff' : '#a8a8c4',
  fontSize: 11,
  fontWeight: 700,
  padding: '6px 10px',
  cursor: 'pointer',
})

const dirtyBadgeStyle = {
  borderRadius: 999,
  background: '#3f2d13',
  border: '1px solid #ba7517',
  color: '#efc16d',
  fontSize: 11,
  fontWeight: 700,
  padding: '6px 10px',
}

const emptyStyle = {
  fontSize: 13,
  color: '#8e8ea8',
  paddingTop: 20,
}

const newScreenFormStyle = {
  display: 'flex',
  gap: 6,
  marginBottom: 10,
  alignItems: 'center',
}

const newScreenInputStyle = {
  flex: 1,
  padding: '7px 10px',
  background: '#0e0e1c',
  border: '1px solid #3b3770',
  borderRadius: 8,
  color: '#e0dcff',
  fontSize: 13,
  outline: 'none',
  minWidth: 0,
}

const newScreenSubmitBtnStyle = {
  padding: '7px 12px',
  background: '#201d47',
  border: '1px solid #4b44a6',
  borderRadius: 8,
  color: '#c8c4ff',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

const newScreenCancelBtnStyle = {
  padding: '7px 10px',
  background: 'transparent',
  border: '1px solid #2e2e48',
  borderRadius: 8,
  color: '#8b8baa',
  fontSize: 12,
  cursor: 'pointer',
}

const screenTabOuterStyle = (active) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 2,
  background: active ? '#1e1b40' : 'transparent',
  border: `1px solid ${active ? '#4b44a6' : 'transparent'}`,
  borderRadius: 999,
  padding: active ? '4px 6px 4px 10px' : '4px 6px 4px 10px',
})

const screenTabBtnStyle = (active) => ({
  background: 'transparent',
  border: 'none',
  color: active ? '#f3f3ff' : '#a8a8c4',
  fontSize: 11,
  fontWeight: 700,
  padding: 0,
  cursor: 'pointer',
  maxWidth: 120,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

const renameInputStyle = {
  width: 100,
  padding: '2px 6px',
  background: '#0e0e1c',
  border: '1px solid #4b44a6',
  borderRadius: 6,
  color: '#e0dcff',
  fontSize: 11,
  fontWeight: 700,
  outline: 'none',
}

const deleteTabBtnStyle = {
  background: 'transparent',
  border: 'none',
  color: '#5a5a80',
  fontSize: 10,
  cursor: 'pointer',
  padding: '0 2px',
  borderRadius: 4,
  lineHeight: 1,
}
