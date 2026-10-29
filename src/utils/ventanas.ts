// Ventanas flotantes abiertas (modales, avisos, autorización): cualquier capa "fixed inset-0" o con
// role="dialog", sin importar su z-index. Sirve para que los atajos globales (Tab abre el menú lateral)
// no actúen detrás de una ventana y para que el selector nunca se quede fuera de la ventana de arriba.
// El fondo oscuro del menú lateral en celular (data-fondo-menu) no es una ventana.
const SELECTOR_VENTANA = '[role="dialog"], [aria-modal="true"], [data-dialogo-sistema], .fixed.inset-0';

const visible = (el: Element) => el.getClientRects().length > 0;

export const ventanasAbiertas = (): HTMLElement[] => {
  const todas = (Array.from(document.querySelectorAll(SELECTOR_VENTANA)) as HTMLElement[])
    .filter((el) => !el.closest('[data-fondo-menu]') && visible(el));
  // Solo la capa exterior: un role="dialog" dentro de su fondo "fixed inset-0" es la misma ventana
  return todas.filter((el) => !todas.some((otra) => otra !== el && otra.contains(el)));
};

export const hayVentanaAbierta = () => ventanasAbiertas().length > 0;

// La de más arriba: mayor z-index; si empatan, la última en abrirse (la última en la página)
export const ventanaSuperior = (): HTMLElement | null => {
  const z = (el: HTMLElement) => Number(getComputedStyle(el).zIndex) || 0;
  return ventanasAbiertas().reduce<HTMLElement | null>((sup, el) => (!sup || z(el) >= z(sup) ? el : sup), null);
};

export const enfocablesDe = (contenedor: HTMLElement): HTMLElement[] =>
  (Array.from(contenedor.querySelectorAll(
    'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href], [tabindex]',
  )) as HTMLElement[]).filter((el) => el.tabIndex !== -1 && visible(el));

// ---------------------------------------------------------------------------------------------------
// Al CERRAR una ventana, el selector vuelve a lo que estaba seleccionado ANTES de abrirla (pedido del usuario
// 23/10: "cuando selecciono un producto, Enter abre editar y al cerrar el selector regresa al buscador"). Vale
// para todas las sesiones. Se guarda el último elemento enfocado fuera de las ventanas y, al cerrarse la última,
// si el foco quedó perdido (en la página) o lo jaló el imán de la sesión a su buscador, se devuelve ahí. Si la
// lista se volvió a dibujar (al guardar), se busca la misma fila por su texto o por su posición.
interface Recuerdo { el: HTMLElement; id: string; fila: number; texto: string }
// Filas de las listas: casi todas llevan data-row; las de Créditos son <tr role="button">
const FILA = '[data-row="true"], [data-row-prov="true"], [data-fila-cliente="true"], tr[role="button"], [id^="coti-row-"], [id^="ped-row-"]';
const filasVisibles = () => (Array.from(document.querySelectorAll(FILA)) as HTMLElement[])
  .filter((f) => visible(f) && !ventanasAbiertas().some((v) => v.contains(f)));
const textoDe = (el: HTMLElement) => (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 120);
const perdido = (activo: Element | null) => !activo || activo === document.body
  || (activo instanceof HTMLElement && activo.id.startsWith('buscador'));

export const recordarSeleccionEnVentanas = (fallbackRestaurar?: () => void) => {
  let recuerdo: Recuerdo | null = null;
  let habiaVentana = hayVentanaAbierta();
  let cuantasVentanas = ventanasAbiertas().length;
  let teclaDespues = false;     // si la persona ya se movió tras cerrar, no se le quita el selector
  let pendiente = false;
  // Ventanas una sobre otra (ej. el detalle del cliente y encima Editar, Estado de cuenta o Unir): cada ventana
  // recuerda dónde estaba el selector; al cerrarse la de arriba, vuelve ahí (pedido del dueño 28/10/2026)
  const enVentana = new WeakMap<HTMLElement, HTMLElement>();

  const alEnfocar = (e: FocusEvent) => {
    const el = e.target as HTMLElement | null;
    if (!el || !(el instanceof HTMLElement) || el === document.body) return;
    if (hayVentanaAbierta()) {
      const v = ventanasAbiertas().find((x) => x.contains(el));
      if (v) enVentana.set(v, el);
      return;
    }
    if (el.closest('#evicamp-sidebar')) return;
    const fila = el.matches(FILA) ? filasVisibles().indexOf(el) : -1;
    recuerdo = { el, id: el.id, fila, texto: fila >= 0 ? textoDe(el) : '' };
  };

  const destino = (r: Recuerdo): HTMLElement | null => {
    if (r.el.isConnected && visible(r.el)) return r.el;
    if (r.id) { const porId = document.getElementById(r.id); if (porId && visible(porId)) return porId; }
    if (r.fila >= 0) {
      const filas = filasVisibles();
      return filas.find((f) => textoDe(f) === r.texto) || filas[Math.min(r.fila, filas.length - 1)] || null;
    }
    return null;
  };

  // Se usa lo guardado AL CERRAR (el imán de la sesión enfoca su buscador justo después y eso no cuenta)
  const devolver = (r: Recuerdo | null) => {
    if (teclaDespues || hayVentanaAbierta()) return;
    const el = r ? destino(r) : null;
    if (el && el.isConnected && visible(el)) {
      el.focus();
      el.scrollIntoView({ block: 'nearest' });
      return;
    }
    // Si no había elemento guardado o ya no existe, asegurar que el selector no se quede en el vacío
    const a = document.activeElement;
    if (!a || a === document.body) {
      if (fallbackRestaurar) {
        fallbackRestaurar();
      }
    }
  };

  // Se cerró una ventana pero queda otra debajo: el selector vuelve a donde estaba en ESA ventana
  const devolverEnVentana = (v: HTMLElement | null) => {
    if (!v || !v.isConnected || ventanaSuperior() !== v) return;
    const a = document.activeElement;
    if (a && a !== document.body && v.contains(a)) return;   // ya está dentro (la ventana lo puso)
    const guardado = enVentana.get(v);
    const el = guardado && guardado.isConnected && visible(guardado) ? guardado : enfocablesDe(v)[0];
    el?.focus();
  };

  const revisar = () => {
    pendiente = false;
    const hay = hayVentanaAbierta();
    const cuantas = ventanasAbiertas().length;
    if (cuantas > 0 && cuantas < cuantasVentanas) {
      const arriba = ventanaSuperior();
      [0, 60, 150, 300].forEach((ms) => setTimeout(() => devolverEnVentana(arriba), ms));
    }
    cuantasVentanas = cuantas;
    if (habiaVentana && !hay) {
      teclaDespues = false;
      const guardado = recuerdo;
      // Varias veces: el imán de cada sesión y el redibujo de la lista llegan un poco después
      [0, 60, 150, 300, 500].forEach((ms) => setTimeout(() => devolver(guardado), ms));
    }
    habiaVentana = hay;
  };
  const observador = new MutationObserver(() => {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(revisar);
  });
  const alTeclear = () => { if (!hayVentanaAbierta()) teclaDespues = true; };

  document.addEventListener('focusin', alEnfocar, true);
  window.addEventListener('keydown', alTeclear, true);
  observador.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
  return () => {
    document.removeEventListener('focusin', alEnfocar, true);
    window.removeEventListener('keydown', alTeclear, true);
    observador.disconnect();
  };
};
