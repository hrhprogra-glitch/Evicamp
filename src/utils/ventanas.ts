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
