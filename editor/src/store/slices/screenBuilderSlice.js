import {
  addWidgetToTree,
  collectWidgetIds,
  createDemoScreenDraft,
  createWidget,
  deleteWidgetFromTree,
  duplicateWidgetInTree,
  getScreenLayout,
  moveWidgetInTree,
  updateWidgetInTree,
  withScreenLayout,
  wrapWidgetInTree,
} from '../../utils/screenSchema.js'
import { validateScreens } from '../../utils/screenValidator.js'

let _screenCounter = 1

function generateScreenId() {
  return `ui.screen_${Date.now()}_${_screenCounter++}`
}

function deriveScreenErrors(screens) {
  const { allErrors, allWarnings } = validateScreens(screens)
  return { screenErrors: allErrors, screenWarnings: allWarnings }
}

export const SCREEN_BUILDER_DEFAULTS = {
  screens: [],
  activeScreen: null,
  activeScreenId: null,
  selectedWidgetId: null,
  previewDataSource: 'live',
  mockData: {},
  isDirty: false,
  screenErrors: [],
  screenWarnings: [],
  canvasZoom: 1.0,
  canvasFitMode: 'manual',
}

export function createScreenBuilderSlice(set) {
  return {
    ...SCREEN_BUILDER_DEFAULTS,

    ensureScreenBuilderDraft: () => set((state) => {
      if (state.activeScreen) return {}

      const draft = createDemoScreenDraft()
      return buildScreenState([draft], draft.id)
    }),

    loadScreens: (screens) => set(() => buildScreenState(screens ?? [])),
    selectScreen: (screenId) => set((state) => buildScreenState(state.screens, screenId)),

    createScreen: (name) => set((state) => {
      const id = generateScreenId()
      const newScreen = {
        id,
        name: name?.trim() || 'New Screen',
        nav: { toolbar: false, hotkey: '', group: 'main' },
        layout: {
          id: `${id}_root`,
          type: 'vbox',
          gap: 8,
          children: [],
        },
      }
      const nextScreens = [...state.screens, newScreen]
      return buildScreenState(nextScreens, id)
    }),

    deleteScreen: (screenId) => set((state) => {
      const remaining = state.screens.filter((s) => s.id !== screenId)
      if (remaining.length === 0) return buildScreenState([])
      return buildScreenState(remaining, state.activeScreenId)
    }),

    renameScreen: (screenId, name) => set((state) => {
      const nextScreens = state.screens.map((s) =>
        s.id === screenId ? { ...s, name: name?.trim() || s.name } : s,
      )
      const nextActive = nextScreens.find((s) => s.id === screenId) ?? state.activeScreen
      return buildScreenStateWithActive(nextScreens, nextActive)
    }),

    updateScreenNav: (screenId, nav) => set((state) => {
      const nextScreens = state.screens.map((s) =>
        s.id === screenId ? { ...s, nav: { ...s.nav, ...nav } } : s,
      )
      const nextActive = nextScreens.find((s) => s.id === screenId) ?? state.activeScreen
      return buildScreenStateWithActive(nextScreens, nextActive)
    }),

    setActiveScreen: (activeScreen) => set((state) => syncActiveScreenState(state, activeScreen, {
      selectedWidgetId: activeScreen?.layout?.id ?? null,
    })),
    setActiveScreenId: (activeScreenId) => set((state) => buildScreenState(state.screens, activeScreenId)),
    setSelectedWidgetId: (selectedWidgetId) => set({ selectedWidgetId }),
    setPreviewDataSource: (previewDataSource) => set({ previewDataSource }),
    setMockData: (mockData) => set({ mockData: mockData ?? {} }),
    setScreenBuilderDirty: (isDirty) => set({ isDirty: Boolean(isDirty) }),

    setCanvasZoom: (zoom) => set((state) => ({
      canvasZoom: Math.min(2.0, Math.max(0.5, zoom)),
      canvasFitMode: 'manual',
    })),

    fitCanvasToViewport: () => set({ canvasFitMode: 'auto' }),

    addScreenWidget: (parentId, type) => set((state) => {
      const layout = getScreenLayout(state.activeScreen)
      if (!layout) return {}

      const existingIds = collectWidgetIds(layout)
      const newWidget = createWidget(type, existingIds)
      const nextLayout = addWidgetToTree(layout, parentId, newWidget)
      if (nextLayout === layout) return {}

      return syncActiveScreenState(state, withScreenLayout(state.activeScreen, nextLayout), {
        selectedWidgetId: newWidget.id,
        isDirty: true,
      })
    }),

    deleteScreenWidget: (widgetId) => set((state) => {
      const layout = getScreenLayout(state.activeScreen)
      if (!layout || layout.id === widgetId) return {}

      const nextLayout = deleteWidgetFromTree(layout, widgetId)
      if (nextLayout === layout) return {}

      return syncActiveScreenState(state, withScreenLayout(state.activeScreen, nextLayout), {
        selectedWidgetId: layout.id,
        isDirty: true,
      })
    }),

    duplicateScreenWidget: (widgetId) => set((state) => {
      const layout = getScreenLayout(state.activeScreen)
      if (!layout || layout.id === widgetId) return {}

      const nextLayout = duplicateWidgetInTree(layout, widgetId, collectWidgetIds(layout))
      if (nextLayout === layout) return {}

      return syncActiveScreenState(state, withScreenLayout(state.activeScreen, nextLayout), {
        isDirty: true,
      })
    }),

    wrapScreenWidget: (widgetId, containerType) => set((state) => {
      const layout = getScreenLayout(state.activeScreen)
      if (!layout || layout.id === widgetId) return {}

      const nextLayout = wrapWidgetInTree(layout, widgetId, containerType, collectWidgetIds(layout))
      if (nextLayout === layout) return {}

      return syncActiveScreenState(state, withScreenLayout(state.activeScreen, nextLayout), {
        isDirty: true,
      })
    }),

    moveScreenWidget: (draggedId, targetParentId, targetIndex) => set((state) => {
      const layout = getScreenLayout(state.activeScreen)
      if (!layout) return {}

      const nextLayout = moveWidgetInTree(layout, draggedId, targetParentId, targetIndex)
      if (nextLayout === layout) return {}

      return syncActiveScreenState(state, withScreenLayout(state.activeScreen, nextLayout), {
        selectedWidgetId: draggedId,
        isDirty: true,
      })
    }),

    updateScreenWidget: (widgetId, path, value) => set((state) => {
      const layout = getScreenLayout(state.activeScreen)
      if (!layout || !widgetId) return {}

      const nextLayout = updateWidgetInTree(layout, widgetId, path, value)
      if (nextLayout === layout) return {}

      return syncActiveScreenState(state, withScreenLayout(state.activeScreen, nextLayout), {
        isDirty: true,
      })
    }),

    resetScreenBuilder: () => set({ ...SCREEN_BUILDER_DEFAULTS }),
  }
}

function buildScreenState(screens, requestedActiveScreenId) {
  const nextScreens = Array.isArray(screens) ? screens.filter(Boolean) : []
  const activeScreen = nextScreens.find((screen) => screen.id === requestedActiveScreenId)
    ?? nextScreens[0]
    ?? null

  return {
    ...deriveScreenErrors(nextScreens),
    screens: nextScreens,
    activeScreen,
    activeScreenId: activeScreen?.id ?? null,
    selectedWidgetId: activeScreen?.layout?.id ?? null,
    isDirty: false,
  }
}

function syncActiveScreenState(state, nextActiveScreen, extraState = {}) {
  if (!nextActiveScreen?.id) {
    return {
      activeScreen: null,
      activeScreenId: null,
      ...extraState,
    }
  }

  const screens = Array.isArray(state.screens) ? state.screens : []
  const index = screens.findIndex((screen) => screen.id === nextActiveScreen.id)
  const nextScreens = index >= 0
    ? screens.map((screen, screenIndex) => (screenIndex === index ? nextActiveScreen : screen))
    : [...screens, nextActiveScreen]

  return {
    ...deriveScreenErrors(nextScreens),
    screens: nextScreens,
    activeScreen: nextActiveScreen,
    activeScreenId: nextActiveScreen.id,
    ...extraState,
  }
}

function buildScreenStateWithActive(screens, activeScreen) {
  const nextScreens = Array.isArray(screens) ? screens.filter(Boolean) : []
  return {
    ...deriveScreenErrors(nextScreens),
    screens: nextScreens,
    activeScreen,
    activeScreenId: activeScreen?.id ?? null,
    selectedWidgetId: activeScreen?.layout?.id ?? null,
    isDirty: true,
  }
}
