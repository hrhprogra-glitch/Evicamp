import { estaImprimiendo } from './impresion';

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
const FILA = '[data-row="true"], [data-row-prov="true"], [data-fila-cliente="true"], tr[role="button"], [id^="coti-row-"], [id^="ped-row-"], [id^="mov-row-"], [id^="caja-row-"]';
const filasVisibles = (contenedor?: HTMLElement) => {
  const base = contenedor ? Array.from(contenedor.querySelectorAll(FILA)) : Array.from(document.querySelectorAll(FILA));
  return (base as HTMLElement[]).filter((f) => visible(f) && (contenedor ? true : !ventanasAbiertas().some((v) => v.contains(f))));
};
const textoDe = (el: HTMLElement) => (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 120);
const esBuscador = (el: Element | null): boolean => {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el.tagName === 'INPUT') {
    const type = (el.getAttribute('type') || 'text').toLowerCase();
    if (type === 'text' || type === 'search') return true;
  }
  return el.id.startsWith('buscador') || el.classList.contains('buscador-sobrio__input');
};
const perdido = (activo: Element | null) => !activo || activo === document.body || esBuscador(activo);

export const recordarSeleccionEnVentanas = (fallbackRestaurar?: () => void) => {
  let recuerdo: Recuerdo | null = null;
  let habiaVentana = hayVentanaAbierta();
  let cuantasVentanas = ventanasAbiertas().length;
  let teclaDespues = false;     // si la persona ya se movió tras cerrar, no se le quita el selector
  let pendiente = false;
  // Ventanas una sobre otra (ej. el detalle del cliente y encima Editar, Estado de cuenta o Unir): cada ventana
  // recuerda dónde estaba el selector; al cerrarse la de arriba, vuelve ahí (pedido del dueño 28/10/2026)
  const enVentana = new WeakMap<HTMLElement, Recuerdo>();

  const alEnfocar = (e: FocusEvent) => {
    const el = e.target as HTMLElement | null;
    if (!el || !(el instanceof HTMLElement) || el === document.body) return;
    if (el.classList.contains('ventana-cerrar') || el.id.startsWith('btn-cerrar-')) return;

    if (hayVentanaAbierta()) {
      const v = ventanasAbiertas().find((x) => x.contains(el));
      if (v) {
        const filaEl = (el.matches(FILA) ? el : el.closest(FILA)) as HTMLElement | null;
        const target = filaEl || el;
        const filas = filasVisibles(v);
        const idx = filaEl ? filas.indexOf(filaEl) : -1;
        const anterior = enVentana.get(v);
        // Si el elemento enfocado es un buscador pero ya teníamos guardada una fila en esta ventana,
        // no dejamos que un auto-focus automático pise la fila
        if (esBuscador(el) && anterior && anterior.fila >= 0 && anterior.el !== el) {
          return;
        }
        enVentana.set(v, {
          el: target,
          id: target.id || filaEl?.id || '',
          fila: idx,
          texto: filaEl ? textoDe(filaEl) : (el.innerText || '').slice(0, 120),
        });
      }
      return;
    }
    if (el.closest('#evicamp-sidebar')) return;
    const filaEl = (el.matches(FILA) ? el : el.closest(FILA)) as HTMLElement | null;
    const target = filaEl || el;
    const filas = filasVisibles();
    const idx = filaEl ? filas.indexOf(filaEl) : -1;

    // Si el elemento enfocado es un buscador pero ya teníamos guardada una fila en la página,
    // no dejamos que el imán de la sección pise la fila inmediatamente
    if (esBuscador(el) && recuerdo && recuerdo.fila >= 0 && recuerdo.el !== el && !teclaDespues) {
      return;
    }

    recuerdo = {
      el: target,
      id: target.id || filaEl?.id || '',
      fila: idx,
      texto: filaEl ? textoDe(filaEl) : (el.innerText || '').slice(0, 120),
    };
  };

  const destino = (r: Recuerdo, contenedor?: HTMLElement): HTMLElement | null => {
    if (r.el.isConnected && visible(r.el) && (!contenedor || contenedor.contains(r.el))) return r.el;
    if (r.id) {
      const porId = document.getElementById(r.id);
      if (porId && visible(porId) && (!contenedor || contenedor.contains(porId))) return porId;
    }
    if (r.fila >= 0) {
      const filas = filasVisibles(contenedor);
      return filas.find((f) => textoDe(f) === r.texto) || filas[Math.min(r.fila, filas.length - 1)] || null;
    }
    return null;
  };

  // Se usa lo guardado AL CERRAR (el imán de la sesión enfoca su buscador justo después y eso no cuenta)
  const devolver = (r: Recuerdo | null) => {
    if (teclaDespues || hayVentanaAbierta()) return;
    const a = document.activeElement;
    const el = r ? destino(r) : null;
    // Si el foco quedó en el body, en la nada, o cayó en un buscador habiendo una fila guardada:
    if (!a || a === document.body || (esBuscador(a) && r && (r.fila >= 0 || r.id.includes('row')))) {
      if (el && el.isConnected && visible(el)) {
        el.focus();
        el.scrollIntoView({ block: 'nearest' });
        return;
      }
    }
    if (el && el.isConnected && visible(el) && (!a || a === document.body)) {
      el.focus();
      el.scrollIntoView({ block: 'nearest' });
      return;
    }
    // Si no había elemento guardado o ya no existe, asegurar que el selector no se quede en el vacío
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
    const guardado = enVentana.get(v);

    if (a && a !== document.body && v.contains(a)) {
      // Si el foco cayó en un buscador pero teníamos una fila de tabla guardada,
      // no nos conformamos con el buscador: devolvemos el foco a la fila seleccionada.
      if (esBuscador(a) && guardado && (guardado.fila >= 0 || guardado.id.includes('row') || (guardado.el && guardado.el.matches && guardado.el.matches(FILA)))) {
        const elFila = destino(guardado, v);
        if (elFila && elFila !== a) {
          elFila.focus();
          elFila.scrollIntoView({ block: 'nearest' });
          return;
        }
      }
      return;   // ya está dentro en un elemento legítimo
    }
    const el = guardado ? destino(guardado, v) : null;
    const objetivo = el || enfocablesDe(v)[0];
    if (objetivo) {
      objetivo.focus();
      objetivo.scrollIntoView({ block: 'nearest' });
    }
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

  // ---------------------------------------------------------------------------------------------------
  // Con una ventana abierta, el selector NUNCA se pierde ni sale de ella (pedido del dueño 04/11/2026):
  // - un clic en el fondo oscuro o en un espacio vacío, o volver al sistema desde otro programa → vuelve a lo
  //   último que tenía seleccionado en esa ventana (o a su primer campo/botón);
  // - si algo intenta llevarlo afuera (el imán de la sección, un setTimeout viejo…) → vuelve adentro;
  // - si una ventana se abre y nadie pone el selector en ella → se pone en su primer campo/botón.
  const EVITAR_PRIMERO = /^(cerrar|close|×|x|✕)\b|\(esc\)/i;
  const primeroDe = (v: HTMLElement) => {
    const els = enfocablesDe(v);
    return els.find((el) => !EVITAR_PRIMERO.test((el.innerText || el.title || el.getAttribute('aria-label') || '').trim())) || els[0];
  };
  const asegurarEnVentana = () => {
    if (estaImprimiendo()) return;
    const v = ventanaSuperior();
    if (!v) return;
    const a = document.activeElement as HTMLElement | null;
    if (a && a !== document.body && (v.contains(a) || a.tagName === 'IFRAME')) return;
    const guardado = enVentana.get(v);
    const el = guardado ? destino(guardado, v) : null;
    const objetivo = el || primeroDe(v);
    objetivo?.focus();
  };
  const luego = (ms = 0) => setTimeout(() => { if (!estaImprimiendo() && hayVentanaAbierta()) asegurarEnVentana(); }, ms);
  // El selector se fue al vacío (clic en el fondo o en un texto)
  const alSalirFoco = () => { if (!estaImprimiendo() && hayVentanaAbierta()) luego(0); };
  // El selector se fue a algo fuera de la ventana de arriba
  const alEntrarFoco = (e: FocusEvent) => {
    if (estaImprimiendo()) return;
    const v = ventanaSuperior();
    const el = e.target as HTMLElement | null;
    if (!v || !el || el === document.body || el.tagName === 'IFRAME' || v.contains(el)) return;
    luego(0);
  };
  // Volver al sistema desde otro programa o pestaña
  const alVolverVentana = () => { if (!estaImprimiendo() && hayVentanaAbierta()) luego(80); };
  const alVisible = () => { if (!estaImprimiendo() && document.visibilityState === 'visible' && hayVentanaAbierta()) luego(80); };
  // Una ventana nueva: si en un momento el selector no está en ella, se pone en su primer campo/botón
  let ventanasAntes = ventanasAbiertas().length;
  const observadorNuevas = new MutationObserver(() => {
    const n = ventanasAbiertas().length;
    if (n > ventanasAntes) [150, 400].forEach((ms) => luego(ms));
    ventanasAntes = n;
  });

  document.addEventListener('focusin', alEnfocar, true);
  document.addEventListener('focusin', alEntrarFoco, true);
  document.addEventListener('focusout', alSalirFoco, true);
  window.addEventListener('focus', alVolverVentana);
  document.addEventListener('visibilitychange', alVisible);
  window.addEventListener('keydown', alTeclear, true);
  observador.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
  observadorNuevas.observe(document.body, { childList: true, subtree: true });
  return () => {
    document.removeEventListener('focusin', alEnfocar, true);
    document.removeEventListener('focusin', alEntrarFoco, true);
    document.removeEventListener('focusout', alSalirFoco, true);
    window.removeEventListener('focus', alVolverVentana);
    document.removeEventListener('visibilitychange', alVisible);
    window.removeEventListener('keydown', alTeclear, true);
    observador.disconnect();
    observadorNuevas.disconnect();
  };
};
