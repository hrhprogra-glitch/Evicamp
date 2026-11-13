// Pestañas de Utilidades en SiuMax Nego (paso 3h): "Productos" (lo de Comerc, ventas de la Caja) y las de
// Talleres y servicios (Rentabilidad, Técnicos, Materiales, Cobranzas; de SiuMax Servic). Las mismas pestañas en las
// dos vistas, para no perderse. Solo salen las del tipo de negocio; con una sola pestaña no se muestran.
import React from 'react';
import { BarChart3, Layers, Users, Package, DollarSign } from 'lucide-react';
import type { PestanaServicios } from './servicios/types';

export type PestanaUtilidades = 'productos' | PestanaServicios;

const TODAS: { id: PestanaUtilidades; label: string; Icono: typeof Layers; tipo: 'comercio' | 'servicios' }[] = [
  { id: 'productos', label: 'Productos', Icono: BarChart3, tipo: 'comercio' },
  { id: 'rentabilidad', label: 'Rentabilidad', Icono: Layers, tipo: 'servicios' },
  { id: 'tecnicos', label: 'Técnicos', Icono: Users, tipo: 'servicios' },
  { id: 'materiales', label: 'Materiales', Icono: Package, tipo: 'servicios' },
  { id: 'cobranzas', label: 'Cobranzas', Icono: DollarSign, tipo: 'servicios' },
];

export const pestanasDe = (conComercio: boolean, conServicios: boolean) =>
  TODAS.filter((t) => (t.tipo === 'comercio' ? conComercio : conServicios));

interface Props {
  activa: PestanaUtilidades;
  conComercio: boolean;
  conServicios: boolean;
  onCambiar: (p: PestanaUtilidades) => void;
  idDerecha: string;   // botón de la derecha de la cabecera (→ desde la última pestaña)
  idAbajo: string;     // buscador de la sub-barra (↓)
}

export const PestanasUtilidades: React.FC<Props> = ({ activa, conComercio, conServicios, onCambiar, idDerecha, idAbajo }) => {
  const tabs = pestanasDe(conComercio, conServicios);
  if (tabs.length < 2) return null;
  const ir = (id: string) => document.getElementById(id)?.focus();
  return (
    <div role="tablist" aria-label="Utilidades" className="pestanas-sobrias flex min-w-0 w-full md:w-auto">
      {tabs.map(({ id, label, Icono }, i) => (
        <button
          key={id}
          id={`btn-tab-util-${id}`}
          role="tab"
          aria-selected={activa === id}
          data-activa={activa === id}
          type="button"
          onClick={() => onCambiar(id)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') { e.preventDefault(); ir(i < tabs.length - 1 ? `btn-tab-util-${tabs[i + 1].id}` : idDerecha); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); if (i > 0) ir(`btn-tab-util-${tabs[i - 1].id}`); }
            else if (e.key === 'ArrowDown') { e.preventDefault(); ir(idAbajo); }
            else if (e.key === 'ArrowUp') e.preventDefault();
          }}
          className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 2xl:px-4 py-2.5 lg:py-3 text-[10px] sm:text-xs font-black uppercase tracking-wider whitespace-nowrap rounded-none cursor-pointer"
        >
          <Icono size={14} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
};
