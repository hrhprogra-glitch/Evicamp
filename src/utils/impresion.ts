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
