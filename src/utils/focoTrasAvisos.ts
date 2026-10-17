/**
 * src/utils/focoTrasAvisos.ts
 * Después de un aviso del sistema (alert / confirm / prompt) el foco se perdía: el botón que lo abrió
 * se bloqueó o desapareció (merma confirmada, ventana cerrada) y el selector de teclado no aparecía.
 * En la app de escritorio (Electron, Windows) además la ventana se queda sin teclado tras el aviso
 * hasta cambiar de ventana: se le pide al programa que la recupere (escritorio/main.js → recuperar-foco).
 */
import { programarRestauracionFoco } from './navegacionSesion';

const visible = (el: HTMLElement | null): el is HTMLElement =>
  !!el && el.isConnected && el.offsetParent !== null && !(el as HTMLButtonElement).disabled;

const recuperarFoco = (antes: HTMLElement | null) => {
  try { (window as any).siuhubEscritorio?.recuperarFoco?.(); } catch { /* app de escritorio antigua */ }
  setTimeout(() => {
    const ahora = document.activeElement as HTMLElement | null;
    if (visible(ahora) && ahora !== document.body) return; // la pantalla ya puso el foco donde quería
    if (visible(antes) && antes !== document.body) antes.focus();
    else programarRestauracionFoco(); // al elemento principal de la sección abierta
  }, 60);
};

export const instalarFocoTrasAvisos = () => {
  for (const nombre of ['alert', 'confirm', 'prompt'] as const) {
    const original = window[nombre].bind(window) as (...args: unknown[]) => unknown;
    (window as any)[nombre] = (...args: unknown[]) => {
      const antes = document.activeElement as HTMLElement | null;
      try { return original(...args); } finally { recuperarFoco(antes); }
    };
  }
};
