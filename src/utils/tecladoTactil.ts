/**
 * src/utils/tecladoTactil.ts
 * En pantallas táctiles (celular, tablet) evita que el teclado de la pantalla se abra solo.
 *
 * Las sesiones ponen el foco automáticamente en su buscador para que en PC se pueda escanear
 * o escribir sin tocar nada. En táctil ese foco automático abre el teclado virtual y tapa la pantalla.
 * Regla: en táctil, un campo de texto solo conserva el foco si el usuario lo tocó
 * o si está usando un teclado físico / control remoto. En PC con mouse no cambia nada.
 */

// Margen para considerar que el foco vino de un toque o una tecla del usuario
const MARGEN_INTERACCION_MS = 1000;

// Tipos de <input> que abren el teclado de la pantalla
const TIPOS_CON_TECLADO = new Set(['', 'text', 'search', 'number', 'tel', 'email', 'password', 'url']);

const esPantallaTactil = () => window.matchMedia('(pointer: coarse)').matches;

const abreTeclado = (el: Element): el is HTMLElement => {
  if (el instanceof HTMLTextAreaElement) return !el.readOnly;
  if (el instanceof HTMLInputElement) {
    return TIPOS_CON_TECLADO.has((el.getAttribute('type') || '').toLowerCase()) && !el.readOnly;
  }
  return el instanceof HTMLElement && el.isContentEditable;
};

let instalado = false;

export const instalarProteccionTecladoTactil = () => {
  if (instalado || typeof window === 'undefined') return;
  instalado = true;

  let ultimoToque = 0;
  let ultimoObjetivoTocado: EventTarget | null = null;
  let ultimaTecla = 0;

  const alTocar = (e: PointerEvent | TouchEvent) => {
    ultimoToque = Date.now();
    ultimoObjetivoTocado = e.target;
  };

  // Tocar el campo, algo dentro de él o su <label> cuenta como "lo tocó el usuario"
  const fueTocado = (el: HTMLElement) => {
    if (Date.now() - ultimoToque > MARGEN_INTERACCION_MS) return false;
    const tocado = ultimoObjetivoTocado as Node | null;
    if (!tocado) return false;
    if (tocado === el || el.contains(tocado)) return true;
    const label = tocado instanceof Element ? tocado.closest('label') : null;
    return !!label && (label.control === el || label.contains(el));
  };

  const alEnfocar = (e: FocusEvent) => {
    if (!esPantallaTactil()) return;
    const el = e.target as Element;
    if (!abreTeclado(el)) return;
    if (fueTocado(el)) return;
    // Teclado físico o control remoto: el usuario está navegando con teclas, se respeta el foco
    if (Date.now() - ultimaTecla < MARGEN_INTERACCION_MS) return;
    el.blur();
  };

  document.addEventListener('pointerdown', alTocar, { capture: true, passive: true });
  document.addEventListener('touchstart', alTocar, { capture: true, passive: true });
  document.addEventListener('keydown', () => { ultimaTecla = Date.now(); }, { capture: true });
  document.addEventListener('focusin', alEnfocar, { capture: true });
};
