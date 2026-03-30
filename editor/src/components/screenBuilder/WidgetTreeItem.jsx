import { isContainerWidgetType } from '../../utils/screenSchema'

export default function WidgetTreeItem({
  widget,
  depth,
  selectedWidgetId,
  collapsedIds,
  onSelect,
  onToggleCollapse,
  onOpenMenu,
  dragState,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  rootWidgetId,
}) {
  const isContainer = isContainerWidgetType(widget.type)
  const isCollapsed = collapsedIds.has(widget.id)
  const isSelected = selectedWidgetId === widget.id
  const isDragging = dragState?.draggedId === widget.id
  const dropPlacement = dragState?.overId === widget.id ? dragState.placement : null
  const childCount = widget.children?.length ?? 0
  const previewValue = widget.text ?? widget.label ?? widget.action ?? widget.binding ?? widget.src ?? null

  return (
    <div>
      <div
        style={{
          ...rowStyle,
          paddingLeft: 12 + depth * 18,
          background: isSelected ? '#201d47' : 'transparent',
          borderColor: isSelected ? '#4b44a6' : 'transparent',
          opacity: isDragging ? 0.45 : 1,
          boxShadow: dropPlacement === 'inside'
            ? 'inset 0 0 0 1px #7F77DD'
            : dropPlacement === 'before'
              ? 'inset 0 2px 0 #7F77DD'
              : dropPlacement === 'after'
                ? 'inset 0 -2px 0 #7F77DD'
                : 'none',
        }}
        draggable={widget.id !== rootWidgetId}
        onClick={(e) => {
          e.stopPropagation()
          onSelect(widget.id)
        }}
        onContextMenu={(e) => onOpenMenu(e, widget)}
        onDragStart={(e) => onDragStart(e, widget)}
        onDragOver={(e) => onDragOver(e, widget)}
        onDrop={(e) => onDrop(e, widget)}
        onDragEnd={onDragEnd}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            if (isContainer) onToggleCollapse(widget.id)
          }}
          style={toggleStyle(isContainer)}
        >
          {isContainer ? (isCollapsed ? '▶' : '▼') : '•'}
        </button>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span style={typeTagStyle}>[{widget.type}]</span>
            <span style={idTextStyle}>{widget.id}</span>
            {isContainer && <span style={countBadgeStyle}>{childCount}</span>}
          </div>
          {previewValue && (
            <div style={previewTextStyle}>{String(previewValue)}</div>
          )}
        </div>
      </div>

      {isContainer && !isCollapsed && widget.children?.map((child) => (
        <WidgetTreeItem
          key={child.id}
          widget={child}
          depth={depth + 1}
          selectedWidgetId={selectedWidgetId}
          collapsedIds={collapsedIds}
          onSelect={onSelect}
          onToggleCollapse={onToggleCollapse}
          onOpenMenu={onOpenMenu}
          dragState={dragState}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onDragEnd={onDragEnd}
          rootWidgetId={rootWidgetId}
        />
      ))}
    </div>
  )
}

const rowStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 8,
  width: '100%',
  border: '1px solid transparent',
  borderRadius: 10,
  paddingTop: 8,
  paddingRight: 10,
  paddingBottom: 8,
  cursor: 'pointer',
  marginTop: 4,
}

const toggleStyle = (isContainer) => ({
  width: 18,
  border: 'none',
  background: 'transparent',
  color: isContainer ? '#d9d6ff' : '#5f5f77',
  padding: 0,
  marginTop: 1,
  cursor: isContainer ? 'pointer' : 'default',
})

const typeTagStyle = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.08em',
  color: '#8d88d9',
  textTransform: 'uppercase',
  flexShrink: 0,
}

const idTextStyle = {
  fontSize: 13,
  fontWeight: 600,
  color: '#ececff',
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const countBadgeStyle = {
  flexShrink: 0,
  borderRadius: 999,
  border: '1px solid #2f2f48',
  background: '#171727',
  color: '#a9a8c7',
  fontSize: 10,
  fontWeight: 700,
  padding: '2px 6px',
}

const previewTextStyle = {
  marginTop: 4,
  fontSize: 11,
  color: '#8a8aa8',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}
