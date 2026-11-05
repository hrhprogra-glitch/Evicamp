// Flechas entre los botones de la Caja que no son el buscador ni las líneas del ticket (pedido del dueño 04/11/2026:
// "el selector tiene que llegar a todos los botones"). Cada botón dice a dónde va con ← → ↑ ↓; si el primero de la
// lista no está (sin cliente, sin permiso, ticket vacío…), prueba el siguiente.
//
//   [Cliente][✕][Por cobrar]   →   [Caja actual][S/ monto][👁]
//   [ buscador ............ ]       [ Efectivo | Yape | Tarjeta | Fiados ]
//   [ productos ........... ]       [Espera][Vaciar]
//                                   líneas del ticket
//                                   [Proceder al pago]
//                                   [Cotización][Pedido]
import type React from 'react';

type Flecha = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';
type Mapa = Partial<Record<Flecha, string[]>>;

const usable = (el: HTMLElement | null): el is HTMLElement =>
  !!el && el.getClientRects().length > 0 && !(el as HTMLButtonElement).disabled;

export const irA = (...ids: string[]): boolean => {
  for (const id of ids) {
    const el = document.getElementById(id);
    if (usable(el)) {
      el.focus();
      if (el instanceof HTMLInputElement && el.type === 'text') el.select();
      el.scrollIntoView({ block: 'nearest' });
      return true;
    }
  }
  return false;
};

const CABECERA_IZQ = ['btn-por-cobrar-pos', 'btn-limpiar-cliente-pos', 'btn-pos-header-cliente'];
const TICKET_ARRIBA = ['btn-pausar-ticket', 'btn-vaciar-ticket'];
const TICKET_ABAJO = ['edit-input-0', 'edit-price-0', 'btn-proceder-pago'];

export const MAPA_CAJA: Record<string, Mapa> = {
  'btn-pos-header-cliente': { ArrowRight: ['btn-limpiar-cliente-pos', 'btn-por-cobrar-pos', 'btn-caja-actual-pos', ...TICKET_ARRIBA], ArrowDown: ['buscador-global-pos'] },
  'btn-limpiar-cliente-pos': { ArrowLeft: ['btn-pos-header-cliente'], ArrowRight: ['btn-por-cobrar-pos', 'btn-caja-actual-pos', ...TICKET_ARRIBA], ArrowDown: ['buscador-global-pos'] },
  'btn-por-cobrar-pos': { ArrowLeft: ['btn-limpiar-cliente-pos', 'btn-pos-header-cliente'], ArrowRight: ['btn-caja-actual-pos', ...TICKET_ARRIBA], ArrowDown: ['buscador-global-pos'] },
  'btn-caja-actual-pos': { ArrowLeft: [...CABECERA_IZQ, 'buscador-global-pos'], ArrowRight: ['btn-monto-caja-pos'], ArrowDown: ['btn-montos-caja-pos', ...TICKET_ARRIBA] },
  'btn-monto-caja-pos': { ArrowLeft: ['btn-caja-actual-pos'], ArrowRight: ['btn-ojo-caja-pos'], ArrowDown: ['btn-montos-caja-pos', ...TICKET_ARRIBA] },
  'btn-ojo-caja-pos': { ArrowLeft: ['btn-monto-caja-pos'], ArrowDown: ['btn-montos-caja-pos', ...TICKET_ARRIBA] },
  'btn-montos-caja-pos': { ArrowLeft: ['buscador-global-pos'], ArrowUp: ['btn-caja-actual-pos'], ArrowDown: [...TICKET_ARRIBA, ...TICKET_ABAJO] },
  'btn-pausar-ticket': { ArrowLeft: ['buscador-global-pos'], ArrowRight: ['btn-vaciar-ticket'], ArrowUp: ['btn-montos-caja-pos', ...CABECERA_IZQ], ArrowDown: TICKET_ABAJO },
  'btn-vaciar-ticket': { ArrowLeft: ['btn-pausar-ticket', 'buscador-global-pos'], ArrowUp: ['btn-montos-caja-pos', ...CABECERA_IZQ], ArrowDown: TICKET_ABAJO },
  'btn-pos-cotizacion': { ArrowRight: ['btn-pos-pedido'], ArrowUp: ['btn-proceder-pago'], ArrowLeft: ['buscador-global-pos'] },
  'btn-pos-pedido': { ArrowLeft: ['btn-pos-cotizacion'], ArrowUp: ['btn-proceder-pago'] },
};

// onKeyDown para un botón del mapa: mueve el selector y no deja que la tecla llegue a los atajos de la Caja
export const flechasCaja = (id: string) => (e: React.KeyboardEvent<HTMLElement>) => {
  const destinos = MAPA_CAJA[id]?.[e.key as Flecha];
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
  e.preventDefault();
  e.stopPropagation();
  e.nativeEvent.stopImmediatePropagation();
  if (destinos) irA(...destinos);
};
