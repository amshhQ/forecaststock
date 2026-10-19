import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <main className="flex min-h-screen items-center justify-center bg-stone-50">
      <h1 className="text-2xl font-semibold text-stone-900">ForecastStock</h1>
    </main>
  </StrictMode>,
)
