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

// Documento completo con los estilos de la página, para que el ticket salga igual que en pantalla
const armarDocumento = (el: HTMLElement, titulo: string) => {
  const estilos = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((n) => n.outerHTML)
    .join('\n');
  return `<!doctype html><html lang="es"><head><meta charset="UTF-8"><base href="${location.origin}/">
<title>${titulo}</title>${estilos}
<style>@page { margin: 0; } html, body { margin: 0; background: #fff; }</style>
</head><body>${el.outerHTML}</body></html>`;
};

export const useImprimir = (ref: RefObject<HTMLElement | null>, titulo: string) => {
  const imprimirNavegador = useReactToPrint({ contentRef: ref, documentTitle: titulo });

  return async () => {
    const escritorio = puente();
    if (!escritorio || !ref.current) {
      imprimirNavegador();
      return;
    }
    const resultado = await escritorio.imprimir(armarDocumento(ref.current, titulo), titulo);
    if (!resultado.ok) {
      alert(`No se pudo imprimir: ${resultado.motivo}\n\nRevisa que la impresora esté encendida y elegida en el menú de la app (tecla Alt > Impresora de tickets).`);
    }
  };
};
