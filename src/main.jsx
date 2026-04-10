import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

window.__APP_VERSION__ = '2026.04.10.v5'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
