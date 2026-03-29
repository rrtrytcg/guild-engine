import { useCallback, useRef, useState } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  SelectionMode,
} from 'reactflow'
import 'reactflow/dist/style.css'

import useStore from '../store/useStore'
import GuildNode from '../nodes/GuildNode'
import { NODE_CONFIG } from '../nodes/nodeConfig'

// Map every node type string to our single GuildNode component.
// ReactFlow requires this object to be stable (defined outside component).
const nodeTypes = Object.fromEntries(
  Object.keys(NODE_CONFIG).map((type) => [type, GuildNode])
)

export default function Canvas() {
  const nodes = useStore((s) => s.nodes)
  const edges = useStore((s) => s.edges)
  const onNodesChange = useStore((s) => s.onNodesChange)
  const onEdgesChange = useStore((s) => s.onEdgesChange)
  const onConnect = useStore((s) => s.onConnect)
  const clearSelection = useStore((s) => s.clearSelection)
  const selectNode = useStore((s) => s.selectNode)
  const addNode = useStore((s) => s.addNode)
  const deleteNodes = useStore((s) => s.deleteNodes)

  const reactFlowWrapper = useRef(null)
  const reactFlowInstance = useRef(null)
  const [selectedNodeIds, setSelectedNodeIds] = useState([])

  // Drop handler - converts screen coords to ReactFlow canvas coords
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

  const handleSelectionChange = useCallback((selection) => {
    const nextIds = (selection?.nodes ?? []).map((node) => node.id)
    setSelectedNodeIds((currentIds) => {
      if (
        currentIds.length === nextIds.length &&
        currentIds.every((id, index) => id === nextIds[index])
      ) {
        return currentIds
      }
      return nextIds
    })
  }, [])

  const handleDeleteSelected = useCallback(() => {
    deleteNodes(selectedNodeIds)
    setSelectedNodeIds([])
  }, [deleteNodes, selectedNodeIds])

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
          <button type="button" style={labelBtn} disabled>
            Group move
          </button>
          <span style={{ fontSize: 11, color: '#555570' }}>{selectedNodeIds.length} selected</span>
          <button type="button" onClick={handleDeleteSelected} style={deleteBtn}>
            Delete selected
          </button>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={() => {
          setSelectedNodeIds([])
          clearSelection()
        }}
        onPaneContextMenu={(e) => {
          e.preventDefault()
          setSelectedNodeIds([])
          clearSelection()
        }}
        onNodeContextMenu={(e, node) => {
          e.preventDefault()
          selectNode(node.id)
        }}
        onSelectionChange={handleSelectionChange}
        onInit={(instance) => (reactFlowInstance.current = instance)}
        nodeTypes={nodeTypes}
        nodesDraggable
        fitView
        deleteKeyCode="Delete"
        selectionMode={SelectionMode.Partial}
        multiSelectionKeyCode="Shift"
        selectionKeyCode="Meta"
        selectNodesOnDrag={false}
        snapToGrid
        snapGrid={[16, 16]}
        defaultEdgeOptions={{
          style: { stroke: '#444466', strokeWidth: 1.5 },
          animated: false,
        }}
        connectionLineStyle={{ stroke: '#7F77DD', strokeWidth: 1.5 }}
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
    </div>
  )
}

const labelBtn = {
  background: '#1e1e2e',
  border: '1px solid #2a2a3e',
  borderRadius: 7,
  color: '#8888aa',
  fontSize: 11,
  fontWeight: 600,
  padding: '6px 10px',
  cursor: 'default',
  opacity: 0.9,
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
}
