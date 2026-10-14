import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { instalarProteccionTecladoTactil } from './utils/tecladoTactil'

// En celular/tablet: el teclado de la pantalla solo se abre cuando el usuario toca un campo
instalarProteccionTecladoTactil()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
