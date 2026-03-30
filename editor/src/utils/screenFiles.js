import { createDemoScreenDraft } from './screenSchema.js'

export function normalizeScreenDefinition(input, sourceName = 'screen.screen.json') {
  const fallbackId = deriveScreenId(sourceName)
  const layout = input?.layout ?? input?.rootWidget ?? (input?.type ? input : null)

  if (!layout?.type) {
    throw new Error(`Screen file "${sourceName}" is missing a valid layout/rootWidget.`)
  }

  return {
    id: input?.id ?? fallbackId,
    name: input?.name ?? humanizeScreenName(input?.id ?? fallbackId),
    nav: input?.nav ?? { toolbar: false, hotkey: '', group: 'main' },
    style: input?.style ?? undefined,
    mockData: input?.mockData ?? undefined,
    layout,
    sourceName,
  }
}

export function serializeScreenDefinition(screen) {
  if (!screen?.layout?.type) {
    throw new Error('Cannot serialize a screen without a valid layout.')
  }

  return {
    id: screen.id,
    name: screen.name,
    nav: screen.nav,
    style: screen.style,
    mockData: screen.mockData,
    layout: screen.layout,
  }
}

export async function readScreenFile(file) {
  const text = await file.text()
  const parsed = JSON.parse(text)
  return normalizeScreenDefinition(parsed, file.name)
}

export function deriveScreenFileName(screen) {
  if (screen?.sourceName) return screen.sourceName
  return `${deriveScreenId(screen?.id ?? 'screen')}.screen.json`
}

export function createFallbackScreenSet() {
  return [normalizeScreenDefinition(createDemoScreenDraft(), 'demo.inventory.screen.json')]
}

function deriveScreenId(value) {
  return String(value ?? 'screen')
    .replace(/\.screen\.json$/i, '')
    .replace(/\.json$/i, '')
    .replace(/[^a-zA-Z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .toLowerCase() || 'screen'
}

function humanizeScreenName(value) {
  return String(value ?? 'Screen')
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
