import useStore from '../../store/useStore'

const SOURCES = ['live', 'mock', 'snapshot']

export default function PreviewToolbar() {
  const previewDataSource = useStore((s) => s.previewDataSource)
  const setPreviewDataSource = useStore((s) => s.setPreviewDataSource)

  return (
    <div style={toolbarStyle}>
      <div style={labelStyle}>Preview data</div>
      <div style={pillWrapStyle}>
        {SOURCES.map((source) => (
          <button
            key={source}
            type="button"
            onClick={() => setPreviewDataSource(source)}
            style={pillStyle(previewDataSource === source)}
          >
            {source}
          </button>
        ))}
      </div>
    </div>
  )
}

const toolbarStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '0 18px 14px',
  borderBottom: '1px solid #2a2a3e',
}

const labelStyle = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.12em',
  color: '#8f8fb0',
  textTransform: 'uppercase',
}

const pillWrapStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
}

const pillStyle = (active) => ({
  background: active ? '#7F77DD' : '#171727',
  border: `1px solid ${active ? '#7F77DD' : '#2f2f48'}`,
  borderRadius: 999,
  color: active ? '#fff' : '#b9b8d2',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  padding: '5px 10px',
  cursor: 'pointer',
})
