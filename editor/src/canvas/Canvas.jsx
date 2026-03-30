import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  SelectionMode,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { generateId } from '../utils/ids'

import useStore from '../store/useStore'
import GuildNode from '../nodes/GuildNode'
import { NODE_CONFIG } from '../nodes/nodeConfig'
import { inferRelation, relationColor } from './inferRelation'

const NODE_WIDTH = 220
const NODE_HEIGHT = 150
const DEFAULT_EDGE_OPTIONS = { style: { stroke: '#444466', strokeWidth: 1.5 }, animated: false }
const CONNECTION_LINE_STYLE = { stroke: '#7F77DD', strokeWidth: 1.5 }
const SNAP_GRID = [16, 16]

export default function Canvas({ focusGroupId = null }) {
  const nodes = useStore((s) => s.nodes)
  const edges = useStore((s) => s.edges)
  const groups = useStore((s) => s.groups)
  const onNodesChange = useStore((s) => s.onNodesChange)
  const onEdgesChange = useStore((s) => s.onEdgesChange)
  const storeOnConnect = useStore((s) => s.onConnect)
  const clearSelection = useStore((s) => s.clearSelection)
  const selectNode = useStore((s) => s.selectNode)
  const addNode = useStore((s) => s.addNode)
  const createGroup = useStore((s) => s.createGroup)
  const addNodesToGroup = useStore((s) => s.addNodesToGroup)
  const removeNodesFromGroup = useStore((s) => s.removeNodesFromGroup)
  const deleteNodes = useStore((s) => s.deleteNodes)
  const setActiveGroup = useStore((s) => s.setActiveGroup)
  const setSelectedNodeIds = useStore((s) => s.setSelectedNodeIds)
  const rigSelectedNodes = useStore((s) => s.rigSelectedNodes)
  const storeNodes = useStore((s) => s.nodes)

  const reactFlowWrapper = useRef(null)
  const reactFlowInstance = useRef(null)
  const [reactFlowReady, setReactFlowReady] = useState(false)
  const [selectedNodeIds, setSelectedNodeIds_local] = useState([])
  const [isCreatingSelectionGroup, setIsCreatingSelectionGroup] = useState(false)
  const [selectionGroupLabel, setSelectionGroupLabel] = useState('')
  const [contextMenu, setContextMenu] = useState(null)
  const [legendOpen, setLegendOpen] = useState(false)
  const [rigNotification, setRigNotification] = useState(null)

  const nodeTypes = useMemo(() => Object.fromEntries(
    Object.keys(NODE_CONFIG).map((type) => [type, GuildNode])
  ), [])

  const onDrop = useCallback(
    (e) => {
      e.preventDefault()
      const nodeType = e.dataTransfer.getData('application/guild-engine-node')
      if (!nodeType || !reactFlowInstance.current) return

      const bounds = reactFlowWrapper.current.getBoundingClientRect()
      const position = reactFlowInstance.current.project({
        x: e.clientX - bounds.left,
        y: e.clientY - bounds.top,
      })
      addNode(nodeType, position)
    },
    [addNode]
  )

  const onDragOver = useCallback((e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const suppressContextMenu = useCallback((e) => {
    e.preventDefault()
  }, [])

  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  useEffect(() => {
    if (!contextMenu) return undefined

    const handleWindowClick = () => {
      setContextMenu(null)
    }

    window.addEventListener('click', handleWindowClick)
    return () => window.removeEventListener('click', handleWindowClick)
  }, [contextMenu])

  useEffect(() => {
    if (!reactFlowReady || !focusGroupId || !reactFlowInstance.current) return

    const targetGroup = groups.find((group) => group.id === focusGroupId)
    if (!targetGroup || targetGroup.nodeIds.length === 0) return

    const targetNodes = nodes.filter((node) => targetGroup.nodeIds.includes(node.id))
    if (targetNodes.length === 0) return

    const frame = window.requestAnimationFrame(() => {
      reactFlowInstance.current?.fitBounds(calculateNodesBounds(targetNodes), {
        padding: 0.18,
        duration: 240,
      })
      setActiveGroup(null)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [focusGroupId, groups, nodes, reactFlowReady, setActiveGroup])

  const onConnect = useCallback((connection) => {
    const nodeMap = new Map(storeNodes.map((n) => [n.id, n]))
    const sourceNode = nodeMap.get(connection.source)
    const targetNode = nodeMap.get(connection.target)
    if (sourceNode && targetNode) {
      const relation = inferRelation(sourceNode.data.type, targetNode.data.type)
      const edge = {
        ...connection,
        id: generateId('e'),
        data: { relation },
        label: relation,
        labelStyle: { fontSize: 10, fill: '#666680' },
        labelBgStyle: { fill: '#13131f', fillOpacity: 0.8 },
        style: { stroke: relationColor(relation), strokeWidth: 1.5 },
        animated: false,
      }
      storeOnConnect(edge)
    } else {
      storeOnConnect({ ...connection, id: generateId('e') })
    }
  }, [storeNodes, storeOnConnect])

  const handleSelectionChange = useCallback((selection) => {
    const nextIds = (selection?.nodes ?? []).map((node) => node.id)

    if (nextIds.length < 2) {
      setIsCreatingSelectionGroup(false)
      setSelectionGroupLabel('')
    }

    setSelectedNodeIds(nextIds)

    setSelectedNodeIds_local((currentIds) => {
      if (
        currentIds.length === nextIds.length &&
        currentIds.every((id, index) => id === nextIds[index])
      ) {
        return currentIds
      }
      return nextIds
    })
  }, [setSelectedNodeIds])

  const resetCanvasSelection = useCallback(() => {
    setSelectedNodeIds([])
    setSelectedNodeIds_local([])
    setIsCreatingSelectionGroup(false)
    setSelectionGroupLabel('')
    clearSelection()
    closeContextMenu()
  }, [clearSelection, closeContextMenu, setSelectedNodeIds])

  const handleDeleteSelected = useCallback(() => {
    deleteNodes(selectedNodeIds)
    setSelectedNodeIds([])
    setSelectedNodeIds_local([])
    setIsCreatingSelectionGroup(false)
    setSelectionGroupLabel('')
  }, [deleteNodes, selectedNodeIds, setSelectedNodeIds])

  const submitSelectionGroup = useCallback(() => {
    const trimmedLabel = selectionGroupLabel.trim()
    if (!trimmedLabel || selectedNodeIds.length < 2) return

    createGroup(selectedNodeIds, trimmedLabel)
    setIsCreatingSelectionGroup(false)
    setSelectionGroupLabel('')
  }, [createGroup, selectedNodeIds, selectionGroupLabel])

  const openNodeContextMenu = useCallback((event, node) => {
    const bounds = reactFlowWrapper.current?.getBoundingClientRect()
    if (!bounds) return

    event.preventDefault()
    selectNode(node.id)
    setSelectedNodeIds([node.id])
    setSelectedNodeIds_local([node.id])
    setIsCreatingSelectionGroup(false)
    setSelectionGroupLabel('')

    setContextMenu({
      nodeId: node.id,
      x: event.clientX - bounds.left + 8,
      y: event.clientY - bounds.top + 8,
      showAddMenu: false,
      createMode: false,
      draftLabel: '',
    })
  }, [selectNode, setSelectedNodeIds])

  const submitContextGroup = useCallback(() => {
    const trimmedLabel = contextMenu?.draftLabel?.trim() ?? ''
    if (!contextMenu?.nodeId || !trimmedLabel) return

    createGroup([contextMenu.nodeId], trimmedLabel)
    setContextMenu(null)
  }, [contextMenu, createGroup])

  const updateContextMenu = useCallback((patch) => {
    setContextMenu((currentMenu) => (
      currentMenu ? { ...currentMenu, ...patch } : currentMenu
    ))
  }, [])

  const contextGroup = contextMenu
    ? groups.find((group) => group.nodeIds.includes(contextMenu.nodeId))
    : null

  return (
    <div
      ref={reactFlowWrapper}
      style={{ flex: 1, background: '#0d0d1a', position: 'relative' }}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onContextMenu={suppressContextMenu}
    >
      {selectedNodeIds.length >= 2 && (
        <div
          style={{
            position: 'absolute',
            top: 14,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 10px',
            background: '#13131f',
            border: '1px solid #2a2a3e',
            borderRadius: 10,
            boxShadow: '0 14px 30px rgba(0,0,0,0.35)',
          }}
        >
          <span style={{ fontSize: 11, color: '#555570' }}>
            {selectedNodeIds.length} selected
          </span>

          {!isCreatingSelectionGroup && (
            <button
              type="button"
              onClick={() => setIsCreatingSelectionGroup(true)}
              style={ghostBtn}
            >
              Group
            </button>
          )}

          {isCreatingSelectionGroup && (
            <input
              autoFocus
              value={selectionGroupLabel}
              onChange={(e) => setSelectionGroupLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitSelectionGroup()
                if (e.key === 'Escape') {
                  setIsCreatingSelectionGroup(false)
                  setSelectionGroupLabel('')
                }
              }}
              onBlur={() => {
                if (!selectionGroupLabel.trim()) {
                  setIsCreatingSelectionGroup(false)
                  setSelectionGroupLabel('')
                }
              }}
              placeholder="Group name"
              style={toolbarInput}
            />
          )}

          <button
            type="button"
            onClick={() => {
              const result = rigSelectedNodes()
              if (result && result.rigged > 0) {
                setRigNotification(`Rigged ${result.rigged} node${result.rigged !== 1 ? 's' : ''} — ${result.relations.join(', ')}`)
                setTimeout(() => setRigNotification(null), 4000)
              } else {
                setRigNotification('No fields to rig in this selection')
                setTimeout(() => setRigNotification(null), 2500)
              }
            }}
            style={rigBtn}
            title="Fill ID references from drawn connections"
          >
            ⚡ Rig selected
          </button>

          <button type="button" onClick={handleDeleteSelected} style={deleteBtn}>
            Delete selected
          </button>
        </div>
      )}

      {contextMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 25,
            width: 220,
            padding: 6,
            background: '#13131f',
            border: '1px solid #2a2a3e',
            borderRadius: 10,
            boxShadow: '0 18px 42px rgba(0,0,0,0.38)',
          }}
        >
          <div
            style={{ position: 'relative' }}
            onMouseEnter={() => updateContextMenu({ showAddMenu: true })}
            onMouseLeave={() => updateContextMenu({ showAddMenu: false })}
          >
            <button
              type="button"
              disabled={groups.length === 0}
              style={{
                ...contextMenuBtn,
                color: groups.length === 0 ? '#555570' : '#e0e0f0',
                cursor: groups.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              Add to group {'>'}
            </button>

            {contextMenu.showAddMenu && groups.length > 0 && (
              <div style={submenuStyle}>
                {groups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => {
                      addNodesToGroup(group.id, [contextMenu.nodeId])
                      setContextMenu(null)
                    }}
                    style={contextMenuBtn}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        background: group.color,
                        flexShrink: 0,
                      }}
                    />
                    <span>{group.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {contextGroup && (
            <button
              type="button"
              onClick={() => {
                removeNodesFromGroup([contextMenu.nodeId])
                setContextMenu(null)
              }}
              style={contextMenuBtn}
            >
              Remove from group
            </button>
          )}

          <button
            type="button"
            onClick={() => updateContextMenu({ createMode: true, showAddMenu: false })}
            style={contextMenuBtn}
          >
            Create new group
          </button>

          {contextMenu.createMode && (
            <input
              autoFocus
              value={contextMenu.draftLabel}
              onChange={(e) => updateContextMenu({ draftLabel: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitContextGroup()
                if (e.key === 'Escape') setContextMenu(null)
              }}
              placeholder="Group name"
              style={{ ...toolbarInput, width: '100%', marginTop: 6 }}
            />
          )}
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={resetCanvasSelection}
        onPaneContextMenu={(e) => {
          e.preventDefault()
          resetCanvasSelection()
        }}
        onNodeContextMenu={openNodeContextMenu}
        onSelectionChange={handleSelectionChange}
        onInit={(instance) => {
          reactFlowInstance.current = instance
          setReactFlowReady(true)
        }}
        nodeTypes={nodeTypes}
        nodesDraggable
        fitView={!focusGroupId}
        deleteKeyCode="Delete"
        selectionMode={SelectionMode.Partial}
        multiSelectionKeyCode="Shift"
        selectionKeyCode="Meta"
        selectNodesOnDrag={false}
        snapToGrid
        snapGrid={SNAP_GRID}
        defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
        connectionLineStyle={CONNECTION_LINE_STYLE}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="#2a2a3e"
        />
        <Controls
          style={{
            background: '#1e1e2e',
            border: '1px solid #2a2a3e',
            borderRadius: 8,
          }}
        />
        <MiniMap
          style={{
            background: '#13131f',
            border: '1px solid #2a2a3e',
            borderRadius: 8,
          }}
          nodeColor={(n) => NODE_CONFIG[n.type]?.color ?? '#555'}
          maskColor="rgba(0,0,0,0.6)"
        />
      </ReactFlow>

      {/* Edge relation legend */}
      <div
        style={{
          position: 'absolute',
          bottom: 120,
          left: 10,
          zIndex: 10,
          background: '#13131f',
          border: '1px solid #2a2a3e',
          borderRadius: 8,
          overflow: 'hidden',
          minWidth: 140,
        }}
      >
        <button
          type="button"
          onClick={() => setLegendOpen((v) => !v)}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            color: '#a0a0bc',
            fontSize: 11,
            fontWeight: 700,
            padding: '6px 10px',
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>{legendOpen ? '▾' : '▸'}</span> Legend
        </button>
        {legendOpen && (
          <div style={{ padding: '4px 10px 8px' }}>
            {[
              { label: 'produces / drops_from', color: '#1D9E75' },
              { label: 'consumes / used_by', color: '#BA7517' },
              { label: 'unlocks / gates', color: '#7F77DD' },
              { label: 'modifies', color: '#378ADD' },
              { label: 'trains / assigned_to', color: '#D4537E' },
              { label: 'triggers / affects_rep', color: '#639922' },
              { label: 'other', color: '#444466' },
            ].map(({ label, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ width: 12, height: 3, background: color, borderRadius: 2, flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: '#a0a0bc' }}>{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rig notification */}
      {rigNotification && (
        <div
          style={{
            position: 'absolute',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 30,
            background: '#1a1208',
            border: '1px solid #BA7517',
            borderRadius: 8,
            color: '#e8c06a',
            fontSize: 12,
            fontWeight: 600,
            padding: '8px 16px',
            pointerEvents: 'none',
          }}
        >
          ⚡ {rigNotification}
        </div>
      )}
    </div>
  )
}

function calculateNodesBounds(nodes) {
  const minX = Math.min(...nodes.map((node) => Number(node.position?.x ?? 0)))
  const minY = Math.min(...nodes.map((node) => Number(node.position?.y ?? 0)))
  const maxX = Math.max(...nodes.map((node) => Number(node.position?.x ?? 0) + NODE_WIDTH))
  const maxY = Math.max(...nodes.map((node) => Number(node.position?.y ?? 0) + NODE_HEIGHT))

  return {
    x: minX - 80,
    y: minY - 80,
    width: (maxX - minX) + 160,
    height: (maxY - minY) + 160,
  }
}

const ghostBtn = {
  background: '#1e1e2e',
  border: '1px solid #2a2a3e',
  borderRadius: 7,
  color: '#c0c0d8',
  fontSize: 11,
  fontWeight: 600,
  padding: '6px 10px',
  cursor: 'pointer',
  touchAction: 'manipulation',
  WebkitTapHighlightColor: 'transparent',
  userSelect: 'none',
  WebkitUserSelect: 'none',
}

const deleteBtn = {
  background: '#E24B4A',
  border: 'none',
  borderRadius: 7,
  color: '#fff',
  fontSize: 11,
  fontWeight: 600,
  padding: '6px 10px',
  cursor: 'pointer',
  touchAction: 'manipulation',
  WebkitTapHighlightColor: 'transparent',
  userSelect: 'none',
  WebkitUserSelect: 'none',
}

const rigBtn = {
  background: '#BA7517',
  border: 'none',
  borderRadius: 7,
  color: '#fff',
  fontSize: 11,
  fontWeight: 600,
  padding: '6px 10px',
  cursor: 'pointer',
  touchAction: 'manipulation',
  WebkitTapHighlightColor: 'transparent',
  userSelect: 'none',
  WebkitUserSelect: 'none',
}

const toolbarInput = {
  background: '#0f0f1b',
  border: '1px solid #2a2a3e',
  borderRadius: 7,
  color: '#e0e0f0',
  fontSize: 11,
  fontWeight: 500,
  padding: '6px 10px',
  outline: 'none',
}

const contextMenuBtn = {
  width: '100%',
  background: 'transparent',
  border: 'none',
  borderRadius: 8,
  color: '#e0e0f0',
  fontSize: 12,
  fontWeight: 500,
  padding: '9px 10px',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  textAlign: 'left',
  cursor: 'pointer',
}

const submenuStyle = {
  position: 'absolute',
  top: 0,
  left: 'calc(100% + 6px)',
  width: 200,
  padding: 6,
  background: '#13131f',
  border: '1px solid #2a2a3e',
  borderRadius: 10,
  boxShadow: '0 18px 42px rgba(0,0,0,0.38)',
}
