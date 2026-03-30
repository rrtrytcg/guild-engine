import { useEffect, useRef } from 'react'

/**
 * Lightweight confirmation dialog.
 * Calls `onConfirm` or `onCancel` when the user picks an option.
 */
export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}) {
  const cancelRef = useRef(null)

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onCancel])

  return (
    <div style={overlayStyle} onClick={onCancel}>
      <div
        style={dialogStyle}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <div id="dialog-title" style={titleStyle}>{title}</div>
        {message && <p style={messageStyle}>{message}</p>}

        <div style={actionsStyle}>
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            style={cancelBtnStyle}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={destructive ? destructiveBtnStyle : confirmBtnStyle}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  backdropFilter: 'blur(2px)',
}

const dialogStyle = {
  background: '#141424',
  border: '1px solid #2e2e52',
  borderRadius: 16,
  padding: '28px 28px 24px',
  maxWidth: 360,
  width: '90vw',
  boxShadow: '0 24px 60px rgba(0, 0, 0, 0.5)',
}

const titleStyle = {
  fontSize: 17,
  fontWeight: 700,
  color: '#f0effe',
  marginBottom: 10,
}

const messageStyle = {
  fontSize: 14,
  color: '#9090b0',
  lineHeight: 1.6,
  marginBottom: 24,
}

const actionsStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 10,
}

const baseBtnStyle = {
  padding: '9px 18px',
  borderRadius: 9,
  border: 'none',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
}

const cancelBtnStyle = {
  ...baseBtnStyle,
  background: '#1e1e38',
  color: '#b0aed4',
  border: '1px solid #2e2e52',
}

const confirmBtnStyle = {
  ...baseBtnStyle,
  background: '#201d47',
  color: '#c8c4ff',
}

const destructiveBtnStyle = {
  ...baseBtnStyle,
  background: '#3d1a1a',
  color: '#ff9999',
  border: '1px solid #7d3333',
}
