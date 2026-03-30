import { describe, expect, it } from 'vitest'
import { DEFAULT_PREVIEW_SNAPSHOT, getPreviewSnapshot } from '../src/utils/previewData.js'

describe('previewData', () => {
  it('returns live snapshot by default', () => {
    expect(getPreviewSnapshot('live')).toEqual(DEFAULT_PREVIEW_SNAPSHOT)
  })

  it('merges mock data over the live snapshot', () => {
    const snapshot = getPreviewSnapshot('mock', { resources: { gold: 9999 }, player: { name: 'Mira' } })

    expect(snapshot.resources.gold).toBe(9999)
    expect(snapshot.player.name).toBe('Mira')
    expect(snapshot.player.health).toBe(DEFAULT_PREVIEW_SNAPSHOT.player.health)
  })

  it('returns snapshot mode data when provided', () => {
    const snapshot = getPreviewSnapshot('snapshot', {}, { snapshot: { resources: { gold: 12 } } })

    expect(snapshot).toEqual({ resources: { gold: 12 } })
  })
})
