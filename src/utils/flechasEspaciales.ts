// Flechas de respaldo para TODO el sistema (pedido del dueño 04/11/2026: "el selector tiene que llegar a todos los
// botones y campos, y moverse de izquierda a derecha"). Si una flecha no hizo nada (nadie la atendió y el selector
// sigue en el mismo sitio), el selector pasa al botón o campo más cercano en esa dirección, dentro de la misma
// ventana (o de la sección si no hay ventana). Las flechas propias de cada pantalla siempre mandan: esto solo
// actúa cuando ellas no hicieron nada.
// No se usa en listas desplegables, calendarios, horas, números ni textos largos (ahí las flechas ya tienen uso).
import { ventanaSuperior, enfocablesDe, ventanasAbiertas } from './ventanas';

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
  if (el instanceof HTMLSelectElement) return true;     // sus flechas ya no cambian el valor (ver alTeclearPrimero)
  // Texto largo: solo sale desde la orilla (↑ en la primera línea, ↓ en la última, ← al inicio, → al final)
  if (el instanceof HTMLTextAreaElement) {
    const ini = el.selectionStart ?? 0, fin = el.selectionEnd ?? 0, v = el.value;
    if (ini !== fin) return false;
    if (k === 'ArrowLeft') return ini === 0;
    if (k === 'ArrowRight') return ini === v.length;
    if (k === 'ArrowUp') return !v.slice(0, ini).includes('\n');
    return !v.slice(ini).includes('\n');
  }
  if (el instanceof HTMLInputElement) {
    const t = el.type;
    if (t === 'checkbox' || t === 'radio' || t === 'button' || t === 'submit' || t === 'number') return true;
    if (!TEXTO.includes(t)) return false;              // fecha, hora, número, rango, color…
    const ini = el.selectionStart ?? 0, fin = el.selectionEnd ?? 0, largo = el.value.length;
    if (k === 'ArrowLeft') return ini === 0 && fin === 0;
    if (k === 'ArrowRight') return ini === largo && fin === largo;
    return true;
  }
  return el.tagName === 'BUTTON' || el.tagName === 'A' || el.getAttribute('role') === 'tab' || el.tabIndex >= 0;
};

// El siguiente en ORDEN DE LECTURA en esa dirección (pedido del dueño 04/11/2026: "cuando estoy en el primero se pasa al
// tercero, eso no tiene que pasar"): ↓ va a la fila de abajo más cercana y, en ella, al que está justo debajo; si varios lo
// están por igual (desde un campo ancho), al de la IZQUIERDA. ↑ igual hacia arriba. ← → van al vecino de la misma fila.
const masCercano = (desde: HTMLElement, k: Flecha, ambito: HTMLElement): HTMLElement | null => {
  const r = desde.getBoundingClientRect();
  const cy = (r.top + r.bottom) / 2;
  const candidatos: { el: HTMLElement; q: DOMRect; distancia: number; cruce: number }[] = [];
  for (const el of enfocablesDe(ambito)) {
    if (el === desde || el.closest(FILA) || el.closest('#evicamp-sidebar')) continue;
    const q = el.getBoundingClientRect();
    if (!q.width || !q.height) continue;
    let distancia: number;
    if (k === 'ArrowRight') { if (q.left < r.right - 4) continue; distancia = q.left - r.right; }
    else if (k === 'ArrowLeft') { if (q.right > r.left + 4) continue; distancia = r.left - q.right; }
    else if (k === 'ArrowDown') { if (q.top < r.bottom - 4) continue; distancia = q.top - r.bottom; }
    else { if (q.bottom > r.top + 4) continue; distancia = r.top - q.bottom; }
    const horizontal = k === 'ArrowLeft' || k === 'ArrowRight';
    // Cuánto se "cruzan" en el otro eje (misma fila para ← →, misma columna para ↑ ↓)
    const cruce = horizontal
      ? Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top)
      : Math.min(r.right, q.right) - Math.max(r.left, q.left);
    if (horizontal && cruce <= 0 && Math.abs((q.top + q.bottom) / 2 - cy) > 12) continue;   // ← → solo en la misma fila
    candidatos.push({ el, q, distancia, cruce });
  }
  if (!candidatos.length) return null;
  // ↑ ↓: la FILA más cercana aunque lo de esa fila esté corrido a un lado (antes se prefería lo alineado y desde la
  // cantidad del combo ↓ saltaba hasta "Guardar" pasando por encima de las casillas de Tienda Web).
  // ← →: los de la misma fila (ya filtrados arriba).
  const lista = candidatos;
  const minima = Math.min(...lista.map((c) => c.distancia));
  const cercanos = lista.filter((c) => c.distancia <= minima + 12);
  // …y en ella, el que más se cruza; si empatan, el de la izquierda (↑ ↓) o el de arriba (← →)
  const mayorCruce = Math.max(...cercanos.map((c) => c.cruce));
  // (si nada está alineado, el cruce es negativo: gana el menos alejado)
  const empatados = cercanos.filter((c) => c.cruce >= (mayorCruce > 0 ? mayorCruce * 0.85 : mayorCruce));
  empatados.sort((a, b) => (k === 'ArrowLeft' || k === 'ArrowRight') ? a.q.top - b.q.top : a.q.left - b.q.left);
  return empatados[0].el;
};

// Cabeceras que bajan de fila en laptops (pestañas arriba, botones en medio, buscador abajo): si entre el selector y su
// destino quedó una fila de esos botones, se pasa primero por ella (el de la izquierda) para no saltarla.
export const filaEnMedio = (origen: Element | null, destino: Element | null, ids: string[]): HTMLElement | null => {
  if (!origen || !destino) return null;
  const a = origen.getBoundingClientRect(), b = destino.getBoundingClientRect();
  const arriba = Math.min(a.bottom, b.bottom), abajo = Math.max(a.top, b.top);
  const enMedio = ids
    .map((id) => document.getElementById(id))
    .filter((el): el is HTMLElement => !!el && el.getClientRects().length > 0 && !(el as HTMLButtonElement).disabled)
    .filter((el) => { const r = el.getBoundingClientRect(); return r.top >= arriba - 4 && r.bottom <= abajo + 4; });
  enMedio.sort((x, y) => x.getBoundingClientRect().left - y.getBoundingClientRect().left);
  return enMedio[0] || null;
};

// REGLA 9 (05/11/2026): "el Enter tiene que ser como el clic, nada de pasar a la siguiente selección", en TODAS las
// ventanas flotantes. Tras un Enter en un campo de una ventana, durante un momento se vigila adónde va el selector: si
// una pantalla lo lleva a OTRO campo o botón de la misma ventana, vuelve al campo de origen. No se toca si el Enter
// abrió o cerró una ventana, si el campo de origen desapareció o se desactivó (cambió de paso), ni si el selector
// entró a una lista que se abrió (opciones). Para moverse están las flechas.
const ES_CAMPO_O_BOTON = 'input, select, textarea, button, [role="button"]';
let guardiaEnter: { origen: HTMLElement; ventana: HTMLElement; ventanas: number; hasta: number } | null = null;
const esCampoDeTexto = (el: HTMLElement | null): el is HTMLInputElement | HTMLSelectElement =>
  (el instanceof HTMLInputElement && !['checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'hidden'].includes(el.type)) ||
  el instanceof HTMLSelectElement;

// Eventos de listas desplegables cuyo "preventDefault" lo puso esta regla (no una pantalla): para saber si alguna
// pantalla sí atendió la flecha
const otraPantallaLoUso = new WeakMap<KeyboardEvent, () => boolean>();

export const activarFlechasEspaciales = () => {
  // REGLAS UNIVERSALES (pedido del dueño 05/11/2026). Va en la fase de captura de window y se registra al abrir la
  // app, así corre ANTES que el teclado de cualquier ventana:
  // 1) Lista desplegable cerrada: las flechas NUNCA cambian el valor (solo mueven el selector); Enter la despliega.
  // 2) Enter en una casilla de marcar = clic: la marca o desmarca y el selector se queda ahí (no pasa al siguiente).
  const alTeclearPrimero = (e: KeyboardEvent) => {
    const el = e.target as HTMLElement | null;
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.key === 'Enter' && el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio') && !el.disabled) {
      e.preventDefault();
      e.stopImmediatePropagation();
      el.click();
      return;
    }
    // Regla 9: Enter en un campo de una ventana → vigilar que el selector no pase al siguiente cuadro
    if (e.key === 'Enter' && !e.shiftKey && esCampoDeTexto(el)) {
      const v = ventanaSuperior();
      guardiaEnter = v && v.contains(el) ? { origen: el, ventana: v, ventanas: ventanasAbiertas().length, hasta: performance.now() + 400 } : null;
    }
    // (también los campos de número: ↑ ↓ ya no suben/bajan la cantidad ni el precio; pedido del dueño 05/11/2026,
    // "en Precio de la variante y en la cantidad del combo el selector se queda atrapado")
    const esNumero = el instanceof HTMLInputElement && el.type === 'number';
    if ((el instanceof HTMLSelectElement || esNumero) && (FLECHAS as readonly string[]).includes(e.key) && !e.shiftKey) {
      const evitar = e.preventDefault.bind(e);
      evitar();                                          // el navegador ya no cambia la opción
      let otra = false;
      Object.defineProperty(e, 'preventDefault', { value: () => { otra = true; evitar(); } });
      otraPantallaLoUso.set(e, () => otra);
    }
  };
  // Enter en una lista desplegable que ninguna pantalla atendió: la despliega
  const alSoltarEnter = (e: KeyboardEvent) => {
    const el = e.target as HTMLElement | null;
    if (e.key !== 'Enter' || !(el instanceof HTMLSelectElement) || e.ctrlKey || e.altKey || e.metaKey) return;
    setTimeout(() => {
      if (e.defaultPrevented || document.activeElement !== el) return;
      try { (el as HTMLSelectElement & { showPicker?: () => void }).showPicker?.(); } catch { /* sin lista */ }
    }, 0);
  };

  const alTeclear = (e: KeyboardEvent) => {
    if (!(FLECHAS as readonly string[]).includes(e.key) || e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;
    const origen = document.activeElement as HTMLElement | null;
    if (!origen || origen === document.body || !puedeSalir(origen, e.key as Flecha)) return;
    // Justo después de que todas las pantallas atendieron la tecla (sin espera fija: con 90 ms el selector se sentía
    // lento al moverse rápido, pedido del dueño 04/11/2026). Si alguna la usó o movió el selector, aquí no se hace nada.
    setTimeout(() => {
      const usada = otraPantallaLoUso.has(e) ? otraPantallaLoUso.get(e)!() : e.defaultPrevented;
      if (usada || document.activeElement !== origen || !origen.isConnected) return;
      const ambito = ambitoDe(origen);
      if (!ambito) return;
      const destino = masCercano(origen, e.key as Flecha, ambito);
      if (!destino) return;
      destino.focus();
      destino.scrollIntoView({ block: 'nearest' });
      if (destino instanceof HTMLInputElement && TEXTO.includes(destino.type)) destino.select();
    }, 0);
  };
  // Regla 9: si tras el Enter el selector se fue a otro campo o botón de la misma ventana, vuelve al de origen
  const alEnfocar = (e: FocusEvent) => {
    const g = guardiaEnter;
    if (!g) return;
    const destino = e.target as HTMLElement | null;
    if (!destino || destino === g.origen) return;
    const origen = g.origen as HTMLInputElement;
    const sigueAhi = origen.isConnected && origen.getClientRects().length > 0 && !origen.disabled;
    if (performance.now() > g.hasta || !sigueAhi || ventanasAbiertas().length !== g.ventanas) { guardiaEnter = null; return; }
    if (!g.ventana.contains(destino) || !destino.matches(ES_CAMPO_O_BOTON)) return;   // otra ventana o una lista que se abrió
    if (destino.closest('[role="listbox"], [role="option"], [role="menu"]')) return;
    setTimeout(() => { if (origen.isConnected && !origen.disabled) origen.focus(); }, 0);
  };
  window.addEventListener('keydown', alTeclearPrimero, true);
  document.addEventListener('keydown', alTeclear);
  document.addEventListener('keydown', alSoltarEnter);
  document.addEventListener('focusin', alEnfocar, true);
  return () => {
    window.removeEventListener('keydown', alTeclearPrimero, true);
    document.removeEventListener('keydown', alTeclear);
    document.removeEventListener('keydown', alSoltarEnter);
    document.removeEventListener('focusin', alEnfocar, true);
  };
};
