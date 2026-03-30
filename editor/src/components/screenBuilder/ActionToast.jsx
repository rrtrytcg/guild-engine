export default function ActionToast({ action }) {
  if (!action) return null

  return (
    <div style={toastStyle}>
      Action: {action}
    </div>
  )
}

const toastStyle = {
  position: 'absolute',
  right: 20,
  bottom: 20,
  zIndex: 2,
  borderRadius: 10,
  border: '1px solid #4b44a6',
  background: '#201d47',
  color: '#eceaff',
  fontSize: 12,
  fontWeight: 700,
  padding: '10px 12px',
  boxShadow: '0 12px 24px rgba(0,0,0,0.3)',
}
