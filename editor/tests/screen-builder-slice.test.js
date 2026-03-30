import { describe, expect, it, vi } from 'vitest'
import { createScreenBuilderSlice } from '../src/store/slices/screenBuilderSlice.js'
import { createDemoScreenDraft } from '../src/utils/screenSchema.js'

describe('createScreenBuilderSlice', () => {
  it('returns the expected initial state', () => {
    const set = vi.fn()
    const slice = createScreenBuilderSlice(set)

    expect(slice.screens).toEqual([])
    expect(slice.activeScreen).toBeNull()
    expect(slice.activeScreenId).toBeNull()
    expect(slice.selectedWidgetId).toBeNull()
    expect(slice.previewDataSource).toBe('live')
    expect(slice.mockData).toEqual({})
    expect(slice.isDirty).toBe(false)
  })

  it('wires screen builder setters through zustand set', () => {
    const set = vi.fn()
    const slice = createScreenBuilderSlice(set)
    const demoScreen = createDemoScreenDraft()

    slice.setActiveScreen(demoScreen)
    slice.setActiveScreenId('ui.inventory')
    slice.setSelectedWidgetId('title_label')
    slice.setPreviewDataSource('snapshot')
    slice.setMockData({ player: { name: 'Aldric' } })
    slice.setScreenBuilderDirty(true)
    slice.resetScreenBuilder()

    expect(set).toHaveBeenNthCalledWith(1, expect.any(Function))
    expect(set).toHaveBeenNthCalledWith(2, expect.any(Function))
    expect(set).toHaveBeenNthCalledWith(3, { selectedWidgetId: 'title_label' })
    expect(set).toHaveBeenNthCalledWith(4, { previewDataSource: 'snapshot' })
    expect(set).toHaveBeenNthCalledWith(5, { mockData: { player: { name: 'Aldric' } } })
    expect(set).toHaveBeenNthCalledWith(6, { isDirty: true })
    expect(set).toHaveBeenNthCalledWith(7, {
      screens: [],
      activeScreen: null,
      activeScreenId: null,
      selectedWidgetId: null,
      previewDataSource: 'live',
      mockData: {},
      isDirty: false,
      screenErrors: [],
      screenWarnings: [],
    })

    const firstUpdate = set.mock.calls[0][0]
    expect(firstUpdate({ screens: [] })).toEqual({
      screens: [demoScreen],
      activeScreen: demoScreen,
      activeScreenId: 'ui.inventory',
      selectedWidgetId: 'root',
      screenErrors: [],
      screenWarnings: [],
    })

    const secondUpdate = set.mock.calls[1][0]
    expect(secondUpdate({ screens: [demoScreen] })).toEqual({
      screens: [demoScreen],
      activeScreen: demoScreen,
      activeScreenId: 'ui.inventory',
      selectedWidgetId: 'root',
      isDirty: false,
      screenErrors: [],
      screenWarnings: [],
    })
  })

  it('loads screens and selects the first active screen', () => {
    const set = vi.fn()
    const slice = createScreenBuilderSlice(set)
    const screens = [createDemoScreenDraft()]

    slice.loadScreens(screens)

    expect(set).toHaveBeenCalledWith(expect.any(Function))
  })
})
