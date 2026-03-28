import { useCallback, useRef } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
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
  const addNode = useStore((s) => s.addNode)

  const reactFlowWrapper = useRef(null)
  const reactFlowInstance = useRef(null)

  // Drop handler — converts screen coords to ReactFlow canvas coords
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

  return (
    <div
      ref={reactFlowWrapper}
      style={{ flex: 1, background: '#0d0d1a' }}
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={clearSelection}
        onInit={(instance) => (reactFlowInstance.current = instance)}
        nodeTypes={nodeTypes}
        fitView
        deleteKeyCode="Delete"
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
