// ====================================================================
// main.jsx — React Application Entry Point
// This is the very first JS file that runs when the app loads.
// It mounts the root React component (<App />) into the HTML page.
// ====================================================================

// StrictMode is a development helper that deliberately runs effects twice
// to catch bugs like missing cleanup functions or impure renders.
import { StrictMode } from 'react'

// createRoot is React 18's new API to mount the app into the DOM.
// It enables concurrent rendering features.
import { createRoot } from 'react-dom/client'

// Global CSS styles (Tailwind utilities + custom design tokens)
import './index.css'

// The root component of the whole app
import App from './App.jsx'

// Mount <App /> inside the <div id="root"> element defined in index.html.
// StrictMode wraps it to enable extra runtime warnings in development.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
