import { describe, it, expect } from 'vitest'
import Toolbar from '../src/components/Toolbar.jsx'

describe('Toolbar lazy loading', () => {
  it('exports a component', () => {
    expect(typeof Toolbar).toBe('function')
  })
})
