import type React from 'react';

// Regla 7 de SiuMax (el dueño, 12/11/2026: "siempre tiene que ser así"): Enter en un campo NUNCA pasa al siguiente ni
// envía el formulario; el selector se queda y se mueve con flechas. En una lista o en una fecha/hora, Enter la abre.
// En un botón no hace nada aquí (Enter = clic). Las casillas de marcar las atiende la regla general (flechasEspaciales).
// Se usa en las ventanas traídas de SiuMax Servic (Agenda, Taller…), en su onKeyDown del campo o del contenedor.
const CON_LISTA = ['date', 'time', 'datetime-local', 'month', 'week'];

export const enterSeQueda = (e: React.KeyboardEvent) => {
  if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;
  const el = e.target as HTMLElement;
  if (el instanceof HTMLSelectElement || (el instanceof HTMLInputElement && CON_LISTA.includes(el.type))) {
    e.preventDefault();
    try { (el as HTMLInputElement).showPicker(); } catch { /* sin lista */ }
    return;
  }
  if (el instanceof HTMLInputElement && !['checkbox', 'radio', 'button', 'submit', 'reset'].includes(el.type)) e.preventDefault();
};
