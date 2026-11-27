/**
 * src/utils/impresion.ts
 * Imprimir tickets: en la app de escritorio SiuMax va directo a la impresora elegida (sin ventana);
 * en el navegador o la app instalable (PWA) abre la ventana de impresión de siempre (react-to-print).
 */
import type { RefObject } from 'react';
import { useReactToPrint } from 'react-to-print';

interface PuenteEscritorio {
  version: string;
  imprimir: (html: string, titulo?: string) => Promise<{ ok: boolean; motivo: string | null }>;
}

const puente = (): PuenteEscritorio | undefined =>
  (window as Window & { siuhubEscritorio?: PuenteEscritorio }).siuhubEscritorio;

export const esAppEscritorio = () => !!puente();

/** App de escritorio: manda un documento HTML completo directo a la ticketera elegida (sin ventana).
 *  Fuera de la app devuelve null: ahí se usa la ventana de impresión del navegador. */
export const imprimirEnTicketera = async (html: string, titulo: string) => {
  const escritorio = puente();
  return escritorio ? escritorio.imprimir(html, titulo) : null;
};

let imprimiendoTicket80 = false;
/** Imprime un ticket 80mm ya armado como HTML completo.
 *  Escritorio: ticketera directa. Navegador: iframe oculto de tamaño real (no 0x0),
 *  print tras onload+300ms, limpieza en afterprint y fallback 60s, guard anti doble diálogo. */
export const imprimirTicket80mm = async (html: string, titulo: string): Promise<{ ok: boolean; motivo: string | null }> => {
  const escritorio = puente();
  if (escritorio) return escritorio.imprimir(html, titulo);
  if (imprimiendoTicket80) return { ok: true, motivo: null };
  imprimiendoTicket80 = true;
  imprimiendo = true;
  return new Promise((resolve) => {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;left:0;top:0;width:80mm;height:100vh;border:0;opacity:0;pointer-events:none;z-index:-1;';
    let resuelto = false;
    const limpiar = (ok: boolean, motivo: string | null = null) => {
      if (resuelto) return;
      resuelto = true;
      window.clearTimeout(fallback);
      try { frame.remove(); } catch { /* ya se quitó */ }
      imprimiendoTicket80 = false;
      imprimiendo = false;
      resolve({ ok, motivo });
    };
    const fallback = window.setTimeout(() => limpiar(true), 60000);
    frame.onload = () => {
      window.setTimeout(() => {
        try {
          const win = frame.contentWindow;
          if (!win) { limpiar(false, 'No se pudo abrir la ventana de impresión.'); return; }
          win.addEventListener('afterprint', () => limpiar(true), { once: true });
          win.focus();
          win.print();
        } catch (e) {
          limpiar(false, e instanceof Error ? e.message : 'Error al imprimir.');
        }
      }, 300);
    };
    frame.srcdoc = html;
    document.body.appendChild(frame);
  });
};

// Documento completo con los estilos de la página, para que el ticket salga igual que en pantalla.
// Los estilos van COPIADOS dentro (no como <link>): el CSS del sistema se carga con crossorigin y el servidor no manda
// permiso CORS, así que desde la ventana invisible de impresión (otra "procedencia") el navegador lo bloqueaba y el
// ticket salía sin diseño (letra común, nada centrado, totales desordenados). Arreglado 06/11/2026.
const cssDeLaPagina = () => Array.from(document.styleSheets).map((hoja) => {
  try { return Array.from(hoja.cssRules).map((regla) => regla.cssText).join('\n'); } catch { return ''; }
}).join('\n');
const armarDocumento = (el: HTMLElement, titulo: string) => {
  const estilos = `<style>${cssDeLaPagina()}</style>`;
  return `<!doctype html><html lang="es"><head><meta charset="UTF-8"><base href="${location.origin}/">
<title>${titulo}</title>${estilos}
<style>@page { margin: 0; } html, body { margin: 0; background: #fff; }</style>
</head><body>${el.outerHTML}</body></html>`;
};

let imprimiendo = false;
export const estaImprimiendo = () => imprimiendo;
export const setEstaImprimiendo = (val: boolean) => { imprimiendo = val; };

if (typeof window !== 'undefined') {
  window.addEventListener('beforeprint', () => {
    imprimiendo = true;
  });
  window.addEventListener('afterprint', () => {
    imprimiendo = false;
    setTimeout(() => {
      const btn = document.getElementById('btn-reimprimir-ticket') || document.getElementById('btn-imprimir-nota');
      btn?.focus();
    }, 80);
  });
}

export const useImprimir = (ref: RefObject<HTMLElement | null>, titulo: string) => {
  const imprimirNavegador = useReactToPrint({
    contentRef: ref,
    documentTitle: titulo,
    onBeforePrint: async () => { imprimiendo = true; },
    onAfterPrint: () => { imprimiendo = false; },
  });

  return async () => {
    const escritorio = puente();
    if (!escritorio || !ref.current) {
      imprimiendo = true;
      try {
        imprimirNavegador();
      } finally {
        setTimeout(() => {
          // Respaldo de seguridad: si después de 2 minutos el diálogo cerró sin evento
          if (imprimiendo) imprimiendo = false;
        }, 120000);
      }
      return;
    }
    const resultado = await escritorio.imprimir(armarDocumento(ref.current, titulo), titulo);
    if (!resultado.ok) {
      alert(`No se pudo imprimir: ${resultado.motivo}\n\nRevisa que la impresora esté encendida y elegida en el menú de la app (tecla Alt > Impresora de tickets).`);
    }
  };
};
