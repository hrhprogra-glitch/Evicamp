import React from 'react';
import { Clock } from 'lucide-react';

// SiuMax Nego, paso 3b (12/11/2026): secciones de "Talleres y servicios" que todavía se están trayendo desde
// SiuMax Servic. Dice qué hará cada una y en qué paso de la fase 3 llega. El recuadro se puede seleccionar para
// que el selector del teclado nunca se pierda.
export const SECCIONES_PRONTO: Record<string, { nombre: string; paso: string; texto: string }> = {
  agenda: { nombre: 'Agenda', paso: '3f', texto: 'Calendario de trabajos: qué se hace cada día, a qué cliente y con qué trabajadores.' },
  salidas: { nombre: 'Salidas', paso: '3e', texto: 'Materiales que salen a una obra o servicio, con sus trabajadores, devoluciones y comprobante para imprimir.' },
  contratos: { nombre: 'Contratos', paso: '3g', texto: 'Mantenimientos por período: visitas programadas, lo que se gasta en cada visita y el cobro de cada mes.' },
  taller: { nombre: 'Taller', paso: '3f', texto: 'Equipos que dejan para reparar: recibido → diagnóstico → en proceso → listo → entregado, con repuestos y pagos.' },
  cotizaciones: { nombre: 'Cotizaciones', paso: '3h', texto: 'Cotizaciones en soles o dólares con secciones, datos del banco y pagos parciales; se pueden convertir en trabajo.' },
};

export const Pronto: React.FC<{ seccion: string }> = ({ seccion }) => {
  const s = SECCIONES_PRONTO[seccion];
  if (!s) return null;
  return (
    <div className="h-full flex items-center justify-center p-4">
      <div
        id={`pronto-${seccion}`}
        tabIndex={0}
        className="w-full max-w-lg border-2 border-[var(--color-ink)] bg-[var(--color-surface)] p-6 font-mono text-center outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
      >
        <Clock size={28} className="mx-auto mb-3 text-[var(--color-muted)]" />
        <h1 className="text-base font-black uppercase tracking-[0.15em] text-[var(--color-ink)]">{s.nombre}</h1>
        <p className="mt-1 text-[11px] font-black uppercase tracking-widest text-[var(--color-accent-dark)]">Pronto · paso {s.paso}</p>
        <p className="mt-4 text-sm leading-relaxed text-[var(--color-muted)]">{s.texto}</p>
        <p className="mt-3 text-[11px] font-bold text-[var(--color-muted)]">Se está trayendo desde SiuMax Servic.</p>
      </div>
    </div>
  );
};
