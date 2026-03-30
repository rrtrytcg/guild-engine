import { useMemo } from 'react'
import { defineScreen, renderScreenToHTML } from '../../../../engine/layoutEngine.js'
import useScreenPreview from '../../hooks/useScreenPreview'

export default function ScreenPreview({ onAction }) {
  const { activeScreen, snapshot } = useScreenPreview()

  const html = useMemo(() => {
    if (!activeScreen?.id || !activeScreen?.layout?.type) return ''
    defineScreen(activeScreen.id, activeScreen)
    return renderScreenToHTML(activeScreen.id, snapshot, () => {})
  }, [activeScreen, snapshot])

  if (!activeScreen) {
    return <div style={emptyStyle}>Load a <code>.screen.json</code> file to preview it here.</div>
  }

  return (
    <div
      style={previewWrapStyle}
      onClick={(event) => {
        const actionTarget = event.target instanceof Element
          ? event.target.closest('[data-action]')
          : null
        const action = actionTarget?.getAttribute('data-action')
        if (!action) return

        event.preventDefault()
        event.stopPropagation()
        onAction(action)
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

const previewWrapStyle = {
  width: 'min(100%, 900px)',
  minHeight: 280,
  borderRadius: 18,
  border: '1px solid #31314a',
  background: 'linear-gradient(180deg, #1b1b30 0%, #131322 100%)',
  padding: 28,
  boxShadow: '0 20px 50px rgba(0,0,0,0.32)',
  color: '#f3f3ff',
}

const emptyStyle = {
  color: '#8f8fb0',
  fontSize: 13,
}
