import { describe, it, expect } from 'vitest'
import App from '../src/App.jsx'

describe('App lazy loading', () => {
  it('exports a component', () => {
    expect(typeof App).toBe('function')
  })
})
