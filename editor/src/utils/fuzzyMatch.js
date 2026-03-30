// editor/src/utils/fuzzyMatch.js
/**
 * Pure fuzzy matching function for node search.
 * Scores by character sequence continuity and position.
 * Rankings: exact prefix > contains > fuzzy scatter.
 *
 * @param {string} query - Search query (lowercase)
 * @param {Array<{id: string, label: string, type: string, group: string, description: string, emoji: string}>} entries
 * @returns {Array<{entry: object, score: number}>} Sorted by relevance score descending, max 20
 */
export function fuzzyMatch(query, entries) {
  if (!query || typeof query !== 'string') {
    return entries.slice(0, 20).map((entry) => ({ entry, score: 0 }))
  }

  const normalizedQuery = query.toLowerCase().trim()
  if (!normalizedQuery) {
    return entries.slice(0, 20).map((entry) => ({ entry, score: 0 }))
  }

  const scored = entries.map((entry) => {
    const label = (entry.label || '').toLowerCase()
    const type = (entry.type || '').toLowerCase()
    const description = (entry.description || '').toLowerCase()

    let score = 0

    // Exact prefix match gets highest score
    if (label.startsWith(normalizedQuery)) {
      score += 1000 - (label.length - normalizedQuery.length)
    } else if (label.includes(normalizedQuery)) {
      // Contains match
      score += 500 - (label.indexOf(normalizedQuery))
    } else {
      // Fuzzy scatter match
      let queryIndex = 0
      let lastMatchIndex = -1
      let consecutiveBonus = 0

      for (let i = 0; i < label.length && queryIndex < normalizedQuery.length; i++) {
        if (label[i] === normalizedQuery[queryIndex]) {
          // Base score for match
          score += 10

          // Consecutive match bonus
          if (lastMatchIndex === i - 1) {
            consecutiveBonus += 5
            score += consecutiveBonus
          } else {
            consecutiveBonus = 0
          }

          // Position bonus (earlier matches score higher)
          score += Math.max(0, 50 - i)

          // Word boundary bonus
          if (i === 0 || /\s/.test(label[i - 1])) {
            score += 20
          }

          lastMatchIndex = i
          queryIndex++
        }
      }

      // Query must fully match
      if (queryIndex < normalizedQuery.length) {
        return { entry, score: -1 }
      }
    }

    // Type match bonus
    if (type.includes(normalizedQuery)) {
      score += 50
    }

    // Description match bonus (smaller)
    if (description.includes(normalizedQuery)) {
      score += 20
    }

    return { entry, score }
  })

  return scored
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
}