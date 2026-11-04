// Flechas de respaldo para TODO el sistema (pedido del dueño 04/11/2026: "el selector tiene que llegar a todos los
// botones y campos, y moverse de izquierda a derecha"). Si una flecha no hizo nada (nadie la atendió y el selector
// sigue en el mismo sitio), el selector pasa al botón o campo más cercano en esa dirección, dentro de la misma
// ventana (o de la sección si no hay ventana). Las flechas propias de cada pantalla siempre mandan: esto solo
// actúa cuando ellas no hicieron nada.
// No se usa en listas desplegables, calendarios, horas, números ni textos largos (ahí las flechas ya tienen uso).
import { ventanaSuperior, enfocablesDe } from './ventanas';

const FLECHAS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'] as const;
type Flecha = typeof FLECHAS[number];
const FILA = 'tbody tr, [data-row="true"], [data-row-prov="true"], [data-fila-cliente="true"], [data-fila-ticket="true"], tr[role="button"], [id^="coti-row-"], [id^="ped-row-"]';
const TEXTO = ['text', 'search', 'email', 'tel', 'password', 'url', ''];

const ambitoDe = (el: HTMLElement): HTMLElement | null => {
  const v = ventanaSuperior();
  if (v) return v.contains(el) ? v : null;
  if (el.closest('#evicamp-sidebar')) return null;
  return document.querySelector('main');
};

// ¿Esta flecha, en este control, puede pasar a otro control? (en un texto, solo si el cursor ya está en la orilla)
const puedeSalir = (el: HTMLElement, k: Flecha): boolean => {
  if (el.closest(FILA)) return false;                  // las filas y sus botones tienen su propio teclado
  if (el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) return false;
  if (el instanceof HTMLInputElement) {
    const t = el.type;
    if (t === 'checkbox' || t === 'radio' || t === 'button' || t === 'submit') return true;
    if (!TEXTO.includes(t)) return false;              // fecha, hora, número, rango, color…
    const ini = el.selectionStart ?? 0, fin = el.selectionEnd ?? 0, largo = el.value.length;
    if (k === 'ArrowLeft') return ini === 0 && fin === 0;
    if (k === 'ArrowRight') return ini === largo && fin === largo;
    return true;
  }
  return el.tagName === 'BUTTON' || el.tagName === 'A' || el.getAttribute('role') === 'tab' || el.tabIndex >= 0;
};

const masCercano = (desde: HTMLElement, k: Flecha, ambito: HTMLElement): HTMLElement | null => {
  const r = desde.getBoundingClientRect();
  const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
  let mejor: HTMLElement | null = null, puntaje = Infinity;
  for (const el of enfocablesDe(ambito)) {
    if (el === desde || el.closest(FILA) || el.closest('#evicamp-sidebar')) continue;
    const q = el.getBoundingClientRect();
    if (!q.width || !q.height) continue;
    const qx = (q.left + q.right) / 2, qy = (q.top + q.bottom) / 2;
    let principal: number, lateral: number;
    if (k === 'ArrowRight') { if (q.left < r.right - 4) continue; principal = q.left - r.right; lateral = Math.abs(qy - cy); }
    else if (k === 'ArrowLeft') { if (q.right > r.left + 4) continue; principal = r.left - q.right; lateral = Math.abs(qy - cy); }
    else if (k === 'ArrowDown') { if (q.top < r.bottom - 4) continue; principal = q.top - r.bottom; lateral = Math.abs(qx - cx); }
    else { if (q.bottom > r.top + 4) continue; principal = r.top - q.bottom; lateral = Math.abs(qx - cx); }
    // En horizontal tiene que estar más o menos en la misma fila; en vertical se prefiere la misma columna
    if ((k === 'ArrowLeft' || k === 'ArrowRight') && (q.bottom < r.top - 8 || q.top > r.bottom + 8)) continue;
    const p = principal + lateral * 2;
    if (p < puntaje) { puntaje = p; mejor = el; }
  }
  return mejor;
};

export const activarFlechasEspaciales = () => {
  const alTeclear = (e: KeyboardEvent) => {
    if (!(FLECHAS as readonly string[]).includes(e.key) || e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;
    const origen = document.activeElement as HTMLElement | null;
    if (!origen || origen === document.body || !puedeSalir(origen, e.key as Flecha)) return;
    // Se espera a que cada pantalla atienda la tecla con su propio teclado (algunas mueven el selector un poco después)
    setTimeout(() => {
      if (e.defaultPrevented || document.activeElement !== origen || !origen.isConnected) return;
      const ambito = ambitoDe(origen);
      if (!ambito) return;
      const destino = masCercano(origen, e.key as Flecha, ambito);
      if (!destino) return;
      destino.focus();
      destino.scrollIntoView({ block: 'nearest' });
      if (destino instanceof HTMLInputElement && TEXTO.includes(destino.type)) destino.select();
    }, 90);
  };
  document.addEventListener('keydown', alTeclear);
  return () => document.removeEventListener('keydown', alTeclear);
};
