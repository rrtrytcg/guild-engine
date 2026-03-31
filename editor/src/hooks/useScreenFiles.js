import { useMemo } from 'react'
import useStore from '../store/useStore'
import { deriveScreenFileName, readScreenFile, serializeScreenDefinition } from '../utils/screenFiles'

export default function useScreenFiles() {
  const screens = useStore((s) => s.screens)
  const activeScreen = useStore((s) => s.activeScreen)
  const activeScreenId = useStore((s) => s.activeScreenId)
  const isDirty = useStore((s) => s.isDirty)
  const loadScreens = useStore((s) => s.loadScreens)
  const selectScreen = useStore((s) => s.selectScreen)

  const screenOptions = useMemo(() => {
    if (!Array.isArray(screens)) return []
    return screens.map((screen) => ({
      id: screen.id,
      name: screen.name,
      sourceName: screen.sourceName,
    }))
  }, [screens])

  async function loadFromFiles(fileList) {
    const files = Array.from(fileList ?? [])
    if (files.length === 0) return { loaded: 0 }

    const parsed = await Promise.all(files.map((file) => readScreenFile(file)))
    loadScreens(parsed)
    return { loaded: parsed.length }
  }

  async function saveActiveScreen() {
    if (!activeScreen) return false

    const json = JSON.stringify(serializeScreenDefinition(activeScreen), null, 2)
    const suggestedName = deriveScreenFileName(activeScreen)

    if (typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function') {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [{
          description: 'Screen JSON',
          accept: { 'application/json': ['.json', '.screen.json'] },
        }],
      })
      const writable = await handle.createWritable()
      await writable.write(json)
      await writable.close()
      return true
    }

    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = suggestedName
    anchor.click()
    URL.revokeObjectURL(url)
    return true
  }

  return {
    screens: screenOptions,
    activeScreen,
    activeScreenId,
    isDirty,
    loadFromFiles,
    saveActiveScreen,
    selectScreen,
  }
}
