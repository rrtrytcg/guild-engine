export const DEFAULT_PREVIEW_SNAPSHOT = {
  resources: {
    gold: 1250,
    wood: 84,
    stone: 36,
  },
  player: {
    name: 'Aldric',
    health: 72,
    maxHealth: 100,
  },
  ui: {
    activeScreen: 'inventory',
  },
}

export function getPreviewSnapshot(source, mockData = {}, snapshotState = {}) {
  const baseLive = snapshotState.live ?? DEFAULT_PREVIEW_SNAPSHOT
  const baseSnapshot = snapshotState.snapshot ?? baseLive

  if (source === 'mock') {
    return deepMerge(baseLive, mockData ?? {})
  }

  if (source === 'snapshot') {
    return baseSnapshot
  }

  return baseLive
}

function deepMerge(base, extra) {
  if (!isPlainObject(base) || !isPlainObject(extra)) {
    return extra ?? base
  }

  const merged = { ...base }
  for (const [key, value] of Object.entries(extra)) {
    merged[key] = isPlainObject(value) && isPlainObject(base[key])
      ? deepMerge(base[key], value)
      : value
  }
  return merged
}

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}
