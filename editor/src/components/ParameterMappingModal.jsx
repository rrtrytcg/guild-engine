import { useState } from 'react'
import useStore from '../store/useStore'

const TYPE_ICONS = {
  resource: '💠',
  item: '📦',
  hero_class: '🧑',
  building: '🏗',
}

const TYPE_COLORS = {
  resource: '#1D9E75',
  item: '#BA7517',
  hero_class: '#D4537E',
  building: '#378ADD',
}

export default function ParameterMappingModal({ parameters, onConfirm, onCancel }) {
  const nodes = useStore((s) => s.nodes)

  const [mappings, setMappings] = useState(() => {
    const initial = {}
    parameters.forEach((param) => {
      initial[param.key] = { mode: 'existing', value: '', newNode: null }
    })
    return initial
  })

  const [errors, setErrors] = useState({})

  const existingNodesByType = nodes.filter((n) =>
    parameters.some((p) => n.data?.type === p.type || n.type === p.type)
  )

  const handleModeChange = (paramKey, mode) => {
    setMappings((prev) => ({
      ...prev,
      [paramKey]: { mode, value: '', newNode: null },
    }))
    if (errors[paramKey]) {
      setErrors((prev) => ({ ...prev, [paramKey]: null }))
    }
  }

  const handleExistingSelect = (paramKey, nodeId) => {
    setMappings((prev) => ({
      ...prev,
      [paramKey]: { ...prev[paramKey], value: nodeId },
    }))
    if (errors[paramKey]) {
      setErrors((prev) => ({ ...prev, [paramKey]: null }))
    }
  }

  const handleNewNodeChange = (paramKey, field, value) => {
    setMappings((prev) => ({
      ...prev,
      [paramKey]: {
        ...prev[paramKey],
        newNode: { ...prev[paramKey].newNode, [field]: value },
      },
    }))
    if (errors[paramKey]) {
      setErrors((prev) => ({ ...prev, [paramKey]: null }))
    }
  }

  const validate = () => {
    const newErrors = {}
    let isValid = true

    parameters.forEach((param) => {
      const mapping = mappings[param.key]
      if (param.required) {
        if (mapping.mode === 'existing' && !mapping.value) {
          newErrors[param.key] = 'Please select an existing node or create a new one'
          isValid = false
        }
        if (mapping.mode === 'new' && (!mapping.newNode?.label || !mapping.newNode.label.trim())) {
          newErrors[param.key] = 'Please provide a name for the new node'
          isValid = false
        }
      }
    })

    setErrors(newErrors)
    return isValid
  }

  const handleConfirm = () => {
    if (!validate()) return

    const result = {
      action: 'import',
      mappings: {},
    }

    parameters.forEach((param) => {
      const mapping = mappings[param.key]
      if (mapping.mode === 'existing') {
        result.mappings[param.key] = mapping.value
      } else if (mapping.mode === 'new') {
        result.mappings[param.key] = {
          create: true,
          type: param.type,
          label: mapping.newNode.label.trim(),
          icon: mapping.newNode.icon || TYPE_ICONS[param.type] || '📦',
        }
      }
    })

    onConfirm(result)
  }

  const handleSkip = () => {
    onConfirm({ action: 'skip', mappings: {} })
  }

  return (
    <div
      onClick={onCancel}
      style={overlayStyle}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={modalStyle}
      >
        <div style={headerStyle}>
          <div>
            <div style={titleStyle}>Blueprint Parameters</div>
            <div style={subtitleStyle}>
              Map required resources/items before importing this blueprint
            </div>
          </div>
          <button onClick={onCancel} style={closeBtn}>×</button>
        </div>

        <div style={contentStyle}>
          {parameters.map((param) => (
            <ParameterField
              key={param.key}
              param={param}
              mapping={mappings[param.key]}
              existingNodes={existingNodesByType.filter(
                (n) => n.data?.type === param.type || n.type === param.type
              )}
              onModeChange={(mode) => handleModeChange(param.key, mode)}
              onExistingSelect={(nodeId) => handleExistingSelect(param.key, nodeId)}
              onNewNodeChange={(field, value) => handleNewNodeChange(param.key, field, value)}
              error={errors[param.key]}
            />
          ))}
        </div>

        <div style={footerStyle}>
          <button onClick={handleSkip} style={skipBtn}>
            Skip and wire manually
          </button>
          <div style={footerButtons}>
            <button onClick={onCancel} style={cancelBtn}>
              Cancel
            </button>
            <button onClick={handleConfirm} style={confirmBtn}>
              Import Blueprint
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ParameterField({
  param,
  mapping,
  existingNodes,
  onModeChange,
  onExistingSelect,
  onNewNodeChange,
  error,
}) {
  const typeColor = TYPE_COLORS[param.type] || '#7F77DD'
  const typeIcon = TYPE_ICONS[param.type] || '📦'

  return (
    <div style={fieldStyle}>
      <div style={fieldHeader}>
        <div style={fieldLabel}>
          <span style={iconBadge(typeColor)}>{typeIcon}</span>
          <span>{param.label}</span>
          {param.required && <span style={requiredStar}>*</span>}
        </div>
      </div>

      {param.description && (
        <div style={fieldDescription}>{param.description}</div>
      )}

      <div style={modeRow}>
        <label style={radioLabel}>
          <input
            type="radio"
            checked={mapping.mode === 'existing'}
            onChange={() => onModeChange('existing')}
            style={radioInput}
          />
          <span style={radioText}>Use existing</span>
        </label>
        <label style={radioLabel}>
          <input
            type="radio"
            checked={mapping.mode === 'new'}
            onChange={() => onModeChange('new')}
            style={radioInput}
          />
          <span style={radioText}>Create new</span>
        </label>
      </div>

      {mapping.mode === 'existing' ? (
        <div style={existingSection}>
          {existingNodes.length > 0 ? (
            <select
              value={mapping.value}
              onChange={(e) => onExistingSelect(e.target.value)}
              style={selectStyle(error)}
            >
              <option value="">Select a {param.type}...</option>
              {existingNodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.data?.label || node.data?.id || node.id}
                </option>
              ))}
            </select>
          ) : (
            <div style={noNodesStyle}>
              No existing {param.type} nodes found. Create a new one below.
            </div>
          )}
        </div>
      ) : (
        <div style={newSection}>
          <div style={inputRow}>
            <input
              type="text"
              placeholder={`${param.label} name...`}
              value={mapping.newNode?.label || ''}
              onChange={(e) => onNewNodeChange('label', e.target.value)}
              style={inputStyle(error)}
            />
            <input
              type="text"
              placeholder="Icon (emoji)"
              value={mapping.newNode?.icon || ''}
              onChange={(e) => onNewNodeChange('icon', e.target.value)}
              style={iconInputStyle}
              maxLength={2}
            />
          </div>
          <div style={previewStyle}>
            <span style={previewIcon}>{mapping.newNode?.icon || TYPE_ICONS[param.type] || '📦'}</span>
            <span style={previewLabel}>
              {mapping.newNode?.label?.trim() || `New ${param.type}`}
            </span>
          </div>
        </div>
      )}

      {error && <div style={errorStyle}>{error}</div>}
    </div>
  )
}

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(5, 5, 12, 0.85)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1100,
  padding: 24,
  backdropFilter: 'blur(4px)',
}

const modalStyle = {
  background: 'linear-gradient(180deg, #151523 0%, #10101a 100%)',
  border: '1px solid #2a2a3e',
  borderRadius: 18,
  width: 560,
  maxWidth: '100%',
  maxHeight: '80vh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  boxShadow: '0 28px 80px rgba(0, 0, 0, 0.65)',
}

const headerStyle = {
  padding: '20px 22px 16px',
  borderBottom: '1px solid #26263b',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 16,
}

const titleStyle = {
  fontSize: 18,
  fontWeight: 800,
  color: '#f2f2ff',
  marginBottom: 4,
}

const subtitleStyle = {
  fontSize: 12,
  color: '#8d8daa',
  lineHeight: 1.4,
}

const closeBtn = {
  background: 'transparent',
  border: '1px solid #2f2f46',
  borderRadius: 10,
  color: '#7e7e9d',
  cursor: 'pointer',
  fontSize: 20,
  lineHeight: 1,
  width: 34,
  height: 34,
}

const contentStyle = {
  overflowY: 'auto',
  padding: '18px 22px',
  flex: 1,
}

const fieldStyle = {
  marginBottom: 20,
  padding: 16,
  background: '#171728',
  border: '1px solid #2c2c43',
  borderRadius: 12,
}

const fieldHeader = {
  marginBottom: 8,
}

const fieldLabel = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 13,
  fontWeight: 700,
  color: '#e6e6f5',
}

const iconBadge = (color) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 24,
  height: 24,
  borderRadius: 6,
  background: `${color}22`,
  border: `1px solid ${color}44`,
  fontSize: 14,
  lineHeight: 1,
})

const requiredStar = {
  color: '#D4537E',
  fontWeight: 800,
}

const fieldDescription = {
  fontSize: 11,
  color: '#8d8daa',
  lineHeight: 1.5,
  marginBottom: 12,
  paddingLeft: 32,
}

const modeRow = {
  display: 'flex',
  gap: 16,
  marginBottom: 12,
  paddingLeft: 32,
}

const radioLabel = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  cursor: 'pointer',
  fontSize: 12,
  color: '#b3b3cd',
}

const radioInput = {
  cursor: 'pointer',
  accentColor: '#5d54d8',
}

const radioText = {
  fontWeight: 600,
}

const existingSection = {
  paddingLeft: 32,
}

const newSection = {
  paddingLeft: 32,
}

const inputRow = {
  display: 'flex',
  gap: 8,
  marginBottom: 8,
}

const selectStyle = (hasError) => ({
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  background: '#10101a',
  border: `1px solid ${hasError ? '#D4537E' : '#2f2f46'}`,
  color: '#e6e6f5',
  fontSize: 13,
  fontWeight: 500,
  outline: 'none',
  cursor: 'pointer',
})

const inputStyle = (hasError) => ({
  flex: 1,
  padding: '10px 12px',
  borderRadius: 8,
  background: '#10101a',
  border: `1px solid ${hasError ? '#D4537E' : '#2f2f46'}`,
  color: '#e6e6f5',
  fontSize: 13,
  fontWeight: 500,
  outline: 'none',
})

const iconInputStyle = {
  width: 100,
  padding: '10px 12px',
  borderRadius: 8,
  background: '#10101a',
  border: '1px solid #2f2f46',
  color: '#e6e6f5',
  fontSize: 16,
  fontWeight: 500,
  outline: 'none',
  textAlign: 'center',
}

const noNodesStyle = {
  fontSize: 12,
  color: '#8d8daa',
  fontStyle: 'italic',
  padding: '8px 0',
}

const previewStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 12px',
  background: '#0d0d14',
  borderRadius: 8,
  border: '1px solid #26263b',
}

const previewIcon = {
  fontSize: 16,
  lineHeight: 1,
}

const previewLabel = {
  fontSize: 12,
  color: '#8d8daa',
  fontWeight: 500,
}

const errorStyle = {
  marginTop: 8,
  paddingLeft: 32,
  fontSize: 11,
  color: '#D4537E',
  fontWeight: 600,
}

const footerStyle = {
  padding: '16px 22px',
  borderTop: '1px solid #26263b',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
}

const skipBtn = {
  background: 'transparent',
  border: '1px dashed #3f3f5f',
  borderRadius: 10,
  color: '#6e6e8f',
  fontSize: 12,
  fontWeight: 600,
  padding: '10px 16px',
  cursor: 'pointer',
}

const footerButtons = {
  display: 'flex',
  gap: 10,
}

const cancelBtn = {
  background: 'transparent',
  border: '1px solid #2f2f46',
  borderRadius: 10,
  color: '#9999b8',
  fontSize: 12,
  fontWeight: 700,
  padding: '10px 16px',
  cursor: 'pointer',
}

const confirmBtn = {
  background: 'linear-gradient(135deg, #5d54d8 0%, #7F77DD 100%)',
  border: 'none',
  borderRadius: 10,
  color: '#fff',
  fontSize: 12,
  fontWeight: 800,
  padding: '10px 20px',
  cursor: 'pointer',
  boxShadow: '0 4px 16px rgba(93, 84, 216, 0.35)',
}
