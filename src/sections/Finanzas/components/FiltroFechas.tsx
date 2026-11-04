import React, { useState, useRef, useEffect } from 'react';
import { FilterX } from 'lucide-react';

interface Props {
  onFilter: (desde: string, hasta: string) => void;
  /** También borra el buscador de cajas */
  onLimpiar?: () => void;
}

// Filtros de fecha del historial de cajas, con las piezas de Inventario (filtro-sobrio / limpiar-sobrio).
// Van al lado del buscador de cajas; al elegir una fecha se aplica sola (ya no hace falta "Buscar").
export const FiltroFechas: React.FC<Props> = ({ onFilter, onLimpiar }) => {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const lastDateDesdeRef = useRef(0);
  const lastDateHastaRef = useRef(0);
  const primeraVez = useRef(true);

  // Aplicar al cambiar (con una pequeña espera por si se escribe la fecha con el teclado)
  useEffect(() => {
    if (primeraVez.current) { primeraVez.current = false; return; }
    const t = setTimeout(() => onFilter(desde, hasta), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desde, hasta]);

  const focusPaginacionOPrimerRegistro = () => {
    const btnAnt = document.getElementById('btn-historial-anterior');
    if (btnAnt) { btnAnt.focus(); return; }
    const fila = document.querySelector('tr[data-row="true"][role="button"]') as HTMLElement | null;
    fila?.focus();
    fila?.scrollIntoView({ block: 'nearest' });
  };

  const limpiarFiltros = () => {
    setDesde('');
    setHasta('');
    onLimpiar?.();
  };

  // ↑ a "Ver historial", ↓ a la paginación, ← → entre filtros
  const teclas = (izq: string | null, der: string | null) => (e: React.KeyboardEvent<HTMLElement>) => {
    const acc: Record<string, () => void> = {
      ArrowUp: () => document.getElementById('btn-ver-historial')?.focus(),
      ArrowDown: () => focusPaginacionOPrimerRegistro(),
      ArrowLeft: () => { if (izq) document.getElementById(izq)?.focus(); },
      ArrowRight: () => { if (der) document.getElementById(der)?.focus(); },
    };
    if (acc[e.key]) { e.preventDefault(); e.stopPropagation(); acc[e.key](); }
  };

  // Fecha: Enter abre el calendario y, al elegir, el selector se queda en la fecha
  const fecha = (id: string, valor: string, poner: (v: string) => void, ultima: React.MutableRefObject<number>, titulo: string, izq: string, der: string) => (
    <input
      id={id}
      autoComplete="off"
      type="date"
      value={valor}
      title={titulo}
      onChange={(e) => {
        ultima.current = Date.now();
        poner(e.target.value);
        setTimeout(() => document.getElementById(id)?.focus(), 50);
      }}
      onClick={(e) => { try { (e.currentTarget as HTMLInputElement).showPicker?.(); } catch {} }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          if (Date.now() - ultima.current < 500) { e.currentTarget.focus(); return; }
          try { (e.currentTarget as HTMLInputElement).showPicker?.(); } catch {}
          return;
        }
        teclas(izq, der)(e);
      }}
      className="filtro-sobrio w-full sm:w-auto"
    />
  );

  return (
    <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full xl:w-auto">
      {fecha('filtro-fecha-desde-finanzas', desde, setDesde, lastDateDesdeRef, 'Desde (fecha de apertura)', 'buscador-historial-cajas', 'filtro-fecha-hasta-finanzas')}
      {fecha('filtro-fecha-hasta-finanzas', hasta, setHasta, lastDateHastaRef, 'Hasta (fecha de apertura)', 'filtro-fecha-desde-finanzas', 'btn-limpiar-fechas-finanzas')}
      <button
        id="btn-limpiar-fechas-finanzas"
        type="button"
        onClick={limpiarFiltros}
        onKeyDown={teclas('filtro-fecha-hasta-finanzas', null)}
        className="limpiar-sobrio"
        title="Limpiar todos los filtros"
      >
        <FilterX size={16} />
      </button>
    </div>
  );
};
