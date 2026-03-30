import { useMemo } from 'react'
import useStore from '../store/useStore'
import { countWidgets, findWidgetById, getScreenLayout } from '../utils/screenSchema'

const NOOP = () => {}

export default function useWidgetTree() {
  const activeScreen = useStore((s) => s.activeScreen)
  const selectedWidgetId = useStore((s) => s.selectedWidgetId)
  const ensureDraft = useStore((s) => s.ensureScreenBuilderDraft) ?? NOOP
  const selectWidget = useStore((s) => s.setSelectedWidgetId) ?? NOOP
  const addWidget = useStore((s) => s.addScreenWidget) ?? NOOP
  const deleteWidget = useStore((s) => s.deleteScreenWidget) ?? NOOP
  const duplicateWidget = useStore((s) => s.duplicateScreenWidget) ?? NOOP
  const wrapWidget = useStore((s) => s.wrapScreenWidget) ?? NOOP
  const moveWidget = useStore((s) => s.moveScreenWidget) ?? NOOP
  const screens = useStore((s) => s.screens)

  const rootWidget = activeScreen?.layout ?? null
  const selectedWidget = useMemo(
    () => findWidgetById(rootWidget, selectedWidgetId),
    [rootWidget, selectedWidgetId],
  )
  const widgetCount = useMemo(() => countWidgets(rootWidget), [rootWidget])

  return {
    activeScreen,
    screens,
    rootWidget,
    selectedWidgetId,
    selectedWidget,
    widgetCount,
    layoutType: getScreenLayout(activeScreen)?.type ?? null,
    ensureDraft,
    selectWidget,
    addWidget,
    deleteWidget,
    duplicateWidget,
    wrapWidget,
    moveWidget,
  }
}
