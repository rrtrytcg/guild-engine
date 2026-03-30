import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

if (import.meta.env.DEV) {
  const _warn = console.warn.bind(console)
  console.warn = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('nodeTypes or edgeTypes')) return
    _warn(...args)
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
