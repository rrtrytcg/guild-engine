let idCounter = 0

export function generateId(prefix = 'id') {
  idCounter++
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}`
}
