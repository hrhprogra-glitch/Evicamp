import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { instalarProteccionTecladoTactil } from './utils/tecladoTactil'
import { iniciarAppInstalable } from './utils/instalarApp'
import { vigilarSuspension } from './db/supabase'

// App instalable (PWA): service worker + aviso "Instalar app"
iniciarAppInstalable()

// Si el Panel de Control suspende al cliente, el sistema abierto cambia solo a "Servicio suspendido"
vigilarSuspension()

// En celular/tablet: el teclado de la pantalla solo se abre cuando el usuario toca un campo
instalarProteccionTecladoTactil()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
