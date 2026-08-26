import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import Guard from './components/Guard'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Guard>
      <App />
    </Guard>
  </StrictMode>,
)
