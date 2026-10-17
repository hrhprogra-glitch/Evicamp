/**
 * src/utils/dialogos.tsx
 * Avisos y confirmaciones DENTRO del sistema (no las ventanas del navegador ni de Windows).
 * En la app de escritorio, alert()/confirm() abrían una ventana de Windows que dejaba la página sin
 * teclado al cerrarse (el selector desaparecía). Aquí el aviso es parte de la página: Enter acepta,
 * Esc cancela, ← → cambian de botón, y al cerrarse el foco vuelve a donde estaba.
 *
 *   avisar('Texto')                  -> se muestra y el código sigue (como alert); await espera a "Aceptar"
 *   if (await confirmar('¿Seguro?'))  -> true con "Aceptar", false con "Cancelar"/Esc
 * window.alert queda redirigido a avisar() para todo el sistema (instalarDialogos en main.tsx).
 */
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { programarRestauracionFoco } from './navegacionSesion';

interface Dialogo { id: number; texto: string; conCancelar: boolean; responder: (si: boolean) => void }

let cola: Dialogo[] = [];
let avisarCambio: (() => void) | null = null;
let contador = 0;

const abrir = (texto: unknown, conCancelar: boolean) => new Promise<boolean>((responder) => {
  cola = [...cola, { id: ++contador, texto: String(texto ?? ''), conCancelar, responder }];
  avisarCambio?.();
});

export const avisar = (texto: unknown) => abrir(texto, false).then(() => undefined);
export const confirmar = (texto: unknown) => abrir(texto, true);

const visible = (el: Element | null): el is HTMLElement =>
  el instanceof HTMLElement && el.isConnected && el !== document.body && el.offsetParent !== null
  && !(el as HTMLButtonElement).disabled;

const VentanaDialogo: React.FC = () => {
  const [, redibujar] = useState(0);
  const [boton, setBoton] = useState(0); // 0 = Aceptar, 1 = Cancelar
  const focoAntes = useRef<Element | null>(null);
  useEffect(() => { avisarCambio = () => redibujar((n) => n + 1); return () => { avisarCambio = null; }; }, []);

  const actual = cola[0];

  // Al abrir: recordar dónde estaba el foco y llevarlo al botón Aceptar
  useEffect(() => {
    if (!actual) return;
    if (!focoAntes.current) focoAntes.current = document.activeElement;
    setBoton(0);
    setTimeout(() => document.getElementById('dialogo-sistema-aceptar')?.focus(), 0);
  }, [actual?.id]);

  const cerrar = (si: boolean) => {
    if (!actual) return;
    cola = cola.slice(1);
    actual.responder(si);
    redibujar((n) => n + 1);
    if (cola.length) return; // hay otro aviso en espera
    const antes = focoAntes.current;
    focoAntes.current = null;
    // Después de que la pantalla reaccione (por ejemplo, cerrar la ventana de merma)
    setTimeout(() => {
      if (document.querySelector('[data-dialogo-sistema]')) return;
      const ahora = document.activeElement;
      if (visible(ahora)) return;                 // la pantalla ya puso el foco donde quería
      if (visible(antes)) antes.focus();          // el botón donde estaba
      else programarRestauracionFoco();           // o el principal de la sección
    }, 80);
  };

  // Teclado: lo maneja SOLO el aviso (no la pantalla de atrás) mientras está abierto
  useEffect(() => {
    if (!actual) return;
    const teclas = (e: KeyboardEvent) => {
      const cantidad = actual.conCancelar ? 2 : 1;
      if (e.key === 'Enter' || e.key === ' ') {
        const enfocado = document.activeElement?.id;
        cerrar(enfocado === 'dialogo-sistema-cancelar' ? false : enfocado === 'dialogo-sistema-aceptar' ? true : boton === 0);
      } else if (e.key === 'Escape') {
        cerrar(false);
      } else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab'].includes(e.key)) {
        const siguiente = (boton + 1) % cantidad;
        setBoton(siguiente);
        document.getElementById(siguiente === 0 ? 'dialogo-sistema-aceptar' : 'dialogo-sistema-cancelar')?.focus();
      } else {
        return; // otras teclas: nada
      }
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    // Si la pantalla de atrás se lleva el foco (p. ej. al cerrar su ventana), vuelve al aviso
    const retener = (e: FocusEvent) => {
      if ((e.target as Element | null)?.closest?.('[data-dialogo-sistema]')) return;
      document.getElementById(boton === 1 ? 'dialogo-sistema-cancelar' : 'dialogo-sistema-aceptar')?.focus();
    };
    window.addEventListener('keydown', teclas, true); // antes que cualquier atajo de la pantalla
    document.addEventListener('focusin', retener, true);
    return () => {
      window.removeEventListener('keydown', teclas, true);
      document.removeEventListener('focusin', retener, true);
    };
  }, [actual?.id, boton]);

  if (!actual) return null;
  return (
    <div data-dialogo-sistema role="dialog" aria-modal="true" aria-labelledby="dialogo-sistema-texto"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 font-mono">
      <div className="w-full max-w-md border-2 border-[var(--color-ink)] bg-[var(--color-surface,#fff)] shadow-[6px_6px_0_0_var(--color-ink)]">
        <div className="bg-[var(--color-ink)] px-4 py-2 text-[11px] font-black uppercase tracking-widest text-[var(--color-accent)]">
          {actual.conCancelar ? 'Confirmar' : 'Aviso'}
        </div>
        <p id="dialogo-sistema-texto" className="max-h-[60vh] overflow-y-auto whitespace-pre-line px-5 py-5 text-sm font-bold text-[var(--color-ink)]">
          {actual.texto}
        </p>
        <div className="flex justify-end gap-3 border-t-2 border-[var(--color-ink)] px-4 py-3">
          {actual.conCancelar && (
            <button id="dialogo-sistema-cancelar" type="button" onClick={() => cerrar(false)} onFocus={() => setBoton(1)}
              className="border-2 border-[var(--color-ink)] px-5 py-2 text-xs font-black uppercase tracking-widest text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] hover:bg-[var(--color-bg)]">
              Cancelar
            </button>
          )}
          <button id="dialogo-sistema-aceptar" type="button" onClick={() => cerrar(true)} onFocus={() => setBoton(0)}
            className="border-2 border-[var(--color-ink)] bg-[var(--color-accent)] px-5 py-2 text-xs font-black uppercase tracking-widest text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] focus:ring-offset-2">
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};

export const instalarDialogos = () => {
  const lugar = document.createElement('div');
  lugar.id = 'dialogos-sistema';
  document.body.appendChild(lugar);
  createRoot(lugar).render(<VentanaDialogo />);
  window.alert = (texto?: unknown) => { void avisar(texto); };
};
