import { describe, it, expect } from 'vitest'
import Inspector from '../src/inspector/Inspector.jsx'

describe('Inspector lazy loading', () => {
  it('exports a component', () => {
    expect(typeof Inspector).toBe('function')
  })
})
