import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { instalarProteccionTecladoTactil } from './utils/tecladoTactil'
import { iniciarAppInstalable } from './utils/instalarApp'
import { vigilarSuspension } from './db/supabase'
import { iniciarSubidaAutomatica } from './utils/sinInternet'
import { instalarDialogos } from './utils/dialogos'

// App instalable (PWA): service worker + aviso "Instalar app"
iniciarAppInstalable()

// Si el Panel de Control suspende al cliente, el sistema abierto cambia solo a "Servicio suspendido"
vigilarSuspension()

// Modo sin internet: sube solo lo que se hizo sin conexión (ventas, fiados) apenas vuelve el internet
iniciarSubidaAutomatica()
// Avisos y confirmaciones dentro del sistema (no ventanas de Windows): el selector de teclado no se pierde
instalarDialogos()

// Al volver de Mercado Pago el link trae datos del pago (?collection_id=...&status=approved...):
// no se usan (el pago se registra por el aviso verificado), así que se limpian para que el link quede limpio
if (/[?&](collection_id|payment_id|preference_id)=/.test(window.location.search)) {
  window.history.replaceState(null, '', window.location.pathname + window.location.hash)
}

// En celular/tablet: el teclado de la pantalla solo se abre cuando el usuario toca un campo
instalarProteccionTecladoTactil()

// Desactivar autocompletado y sugerencias del navegador en todo el sistema (SiuMax POS)
if (typeof document !== 'undefined') {
  const desactivarAutocompletado = (el: Element | null) => {
    if (!el) return;
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      if (el.getAttribute('autocomplete') !== 'off') {
        el.setAttribute('autocomplete', 'off');
      }
      el.setAttribute('autocorrect', 'off');
      el.setAttribute('autocapitalize', 'off');
      el.setAttribute('spellcheck', 'false');
    }
  };

  document.addEventListener('focusin', (e) => {
    desactivarAutocompletado(e.target as Element);
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
