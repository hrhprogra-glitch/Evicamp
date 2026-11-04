import React, { useState, useEffect } from 'react';
import { Store as StoreIcon, Plus, CheckCircle2, XCircle, Building2, MapPin, Phone } from 'lucide-react';
import type { Store } from '../../../types/stores';
import { supabase } from '../../../db/supabase';
import { ModalTienda } from './ModalTienda';

export const PestanaTiendas: React.FC = () => {
  const [tiendas, setTiendas] = useState<Store[]>([]);
  const [cargando, setCargando] = useState(true);
  const [tiendaSeleccionada, setTiendaSeleccionada] = useState<Store | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [filaEnfocada, setFilaEnfocada] = useState(0);

  const cargarTiendas = async () => {
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('id', { ascending: true });

      if (error) throw error;
      setTiendas(data || []);
    } catch (err) {
      console.error('Error al cargar tiendas:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarTiendas();
  }, []);

  const abrirCrear = () => {
    setTiendaSeleccionada(null);
    setModalAbierto(true);
  };

  const abrirEditar = (tienda: Store) => {
    setTiendaSeleccionada(tienda);
    setModalAbierto(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number, tienda: Store) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (index < tiendas.length - 1) {
        setFilaEnfocada(index + 1);
        document.getElementById(`fila-tienda-${index + 1}`)?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (index > 0) {
        setFilaEnfocada(index - 1);
        document.getElementById(`fila-tienda-${index - 1}`)?.focus();
      } else {
        document.getElementById('btn-nueva-tienda')?.focus();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      abrirEditar(tienda);
    }
  };

  return (
    <div className="space-y-4 font-mono text-[var(--color-ink)]">
      {/* Cabecera y botón de acción */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b-2 border-[var(--color-ink)]">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
            <StoreIcon size={18} className="text-[var(--color-accent)]" />
            Tiendas, Sucursales y Almacenes (Fase 9)
          </h2>
          <p className="text-xs text-[var(--color-muted)] font-sans mt-0.5">
            Administra tus locales físicos, depósitos o almacenes para control de stock independiente y traspasos.
          </p>
        </div>

        <button
          id="btn-nueva-tienda"
          type="button"
          onClick={abrirCrear}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              document.getElementById('fila-tienda-0')?.focus();
            }
          }}
          style={{ '--icono': 'var(--color-accent-shadow)' } as React.CSSProperties}
          className="boton-cabecera flex items-center gap-2 bg-[var(--color-surface)] text-[var(--color-ink)] px-4 sm:px-6 py-2.5 border border-[var(--color-border)] font-black text-xs uppercase tracking-widest sm:tracking-[0.2em] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] transition-all cursor-pointer"
        >
          <Plus size={16} /> Nueva Tienda / Almacén
        </button>
      </div>

      {/* Tabla de Tiendas */}
      <div className="tabla-marco overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="tabla-cabecera">
              <th className="py-2.5 px-3 uppercase tracking-wider font-bold">Cód.</th>
              <th className="py-2.5 px-3 uppercase tracking-wider font-bold">Nombre del Local</th>
              <th className="py-2.5 px-3 uppercase tracking-wider font-bold">Tipo</th>
              <th className="py-2.5 px-3 uppercase tracking-wider font-bold">Dirección</th>
              <th className="py-2.5 px-3 uppercase tracking-wider font-bold">Teléfono / WhatsApp</th>
              <th className="py-2.5 px-3 uppercase tracking-wider font-bold">Estado</th>
              <th className="py-2.5 px-3 uppercase tracking-wider font-bold text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="bg-[var(--color-surface)]">
            {cargando ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[var(--color-muted)] font-mono uppercase">
                  Cargando locales...
                </td>
              </tr>
            ) : tiendas.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-0">
                  <div className="vacio-sobrio">
                    <StoreIcon size={32} />
                    No hay tiendas registradas.
                  </div>
                </td>
              </tr>
            ) : (
              tiendas.map((tienda, idx) => (
                <tr
                  key={tienda.id}
                  id={`fila-tienda-${idx}`}
                  tabIndex={0}
                  onKeyDown={(e) => handleKeyDown(e, idx, tienda)}
                  onClick={() => abrirEditar(tienda)}
                  className="tabla-fila cursor-pointer group"
                >
                  <td className="py-2.5 px-3 font-bold font-mono">
                    {tienda.codigo || `T${tienda.id}`}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-sm">
                    {tienda.nombre}
                  </td>
                  <td className="py-2.5 px-3">
                    {tienda.es_almacen_principal ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase bg-purple-100 text-purple-900 border border-purple-300">
                        <Building2 size={12} /> Almacén Principal
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase bg-blue-100 text-blue-900 border border-blue-300">
                        Sucursal / Venta
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-xs font-sans text-[var(--color-muted)] group-focus:text-white/80">
                    {tienda.direccion ? (
                      <span className="flex items-center gap-1">
                        <MapPin size={12} /> {tienda.direccion}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-xs font-mono">
                    {tienda.telefono || tienda.whatsapp ? (
                      <span className="flex items-center gap-1">
                        <Phone size={12} /> {tienda.telefono || tienda.whatsapp}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    {tienda.activo ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[11px] group-focus:text-emerald-300">
                        <CheckCircle2 size={13} /> Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-500 font-bold text-[11px] group-focus:text-red-300">
                        <XCircle size={13} /> Inactivo
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        abrirEditar(tienda);
                      }}
                      className="px-2 py-1 text-[11px] font-bold uppercase underline hover:text-[var(--color-accent)] group-focus:text-[var(--color-accent)]"
                    >
                      Editar [Enter]
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalAbierto && (
        <ModalTienda
          tienda={tiendaSeleccionada}
          onClose={(actualizado) => {
            setModalAbierto(false);
            if (actualizado) cargarTiendas();
          }}
        />
      )}
    </div>
  );
};
