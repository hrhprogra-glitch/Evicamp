import React, { useState, useEffect, useRef } from 'react';
import { X, Users, Plus, Loader2, Search } from 'lucide-react';
import { supabase } from '../../../db/supabase';
import { TablaProveedores } from '../../Proveedores/components/TablaProveedores';
import { ModalProveedor } from '../../Proveedores/components/ModalProveedor';
import type { Proveedor } from '../../Proveedores/types';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { avisar, confirmar } from '../../../utils/dialogos';
import { coincideBusqueda } from '../../../utils/busqueda';

type FiltroEstado = 'TODOS' | 'ACTIVO' | 'INACTIVO';
const FILTROS: [FiltroEstado, string][] = [['TODOS', 'Todos'], ['ACTIVO', 'Activos'], ['INACTIVO', 'Inactivos']];
// Fila de arriba (buscador, filtros y "Nuevo proveedor"): ← → la recorren, ↓ baja a la tabla, ↑ sube a la X
const FILA_ARRIBA = ['buscador-proveedores-gestion', 'btn-prov-filtro-TODOS', 'btn-prov-filtro-ACTIVO', 'btn-prov-filtro-INACTIVO', 'btn-nuevo-proveedor'];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ModalGestionProveedores: React.FC<Props> = ({ isOpen, onClose }) => {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalProveedorOpen, setIsModalProveedorOpen] = useState(false);
  const [proveedorAEditar, setProveedorAEditar] = useState<Proveedor | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<FiltroEstado>('TODOS');
  const visibles = proveedores.filter((p) => (filtro === 'TODOS' || p.estado === filtro)
    && coincideBusqueda([p.razon_social, p.nombre_comercial, p.ruc, p.telefono, p.email], busqueda));

  // Teclas de la fila de arriba
  const teclasArriba = (e: React.KeyboardEvent<HTMLElement>) => {
    const t = e.currentTarget;
    const i = FILA_ARRIBA.indexOf(t.id);
    const enTexto = t instanceof HTMLInputElement && t.value;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      // En el buscador con texto, ← → mueven el cursor salvo en el borde
      if (enTexto && (e.key === 'ArrowLeft' ? (t as HTMLInputElement).selectionStart !== 0 : (t as HTMLInputElement).selectionEnd !== (t as HTMLInputElement).value.length)) return;
      const destino = document.getElementById(FILA_ARRIBA[i + (e.key === 'ArrowRight' ? 1 : -1)] || '');
      if (destino) { e.preventDefault(); destino.focus(); }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      (document.querySelector('#modal-gestion-proveedores-container [data-row-prov="true"]') as HTMLElement | null)?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      document.getElementById('btn-cerrar-modal-gestion-proveedores')?.focus();
    } else if (e.key === 'Enter' && t instanceof HTMLInputElement) {
      e.preventDefault();
      (document.querySelector('#modal-gestion-proveedores-container [data-row-prov="true"]') as HTMLElement | null)?.focus();
    }
  };

  useCerrarConEscape(isOpen && !isModalProveedorOpen, onClose);

  // Al abrir: el selector va al buscador. Al cerrar el formulario sin guardar, a la fila que se editaba (o al buscador)
  const volverA = useRef<string | null>(null);
  useEffect(() => {
    if (isOpen && !isModalProveedorOpen && !loading) {
      const timer = setTimeout(() => {
        const fila = volverA.current && document.querySelector<HTMLElement>(`[data-prov-id="${volverA.current}"]`);
        if (fila) { fila.focus(); fila.scrollIntoView({ block: 'nearest' }); return; }
        if (document.querySelector('[data-dialogo-sistema]')) return; // hay un aviso: él devuelve el foco
        document.getElementById('buscador-proveedores-gestion')?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isModalProveedorOpen, loading]);
  useEffect(() => { if (isOpen) { setBusqueda(''); setFiltro('TODOS'); volverA.current = null; } }, [isOpen]);

  // Focus Trap para ModalGestionProveedores (Captura estricta para evitar que Tab abra Sidebar)
  useEffect(() => {
    if (!isOpen || isModalProveedorOpen) return;

    const handleFormKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement;

      if (e.key === 'Escape') {
        if (document.querySelector('[data-dialogo-sistema]')) return; // Esc es del aviso
        e.preventDefault();
        e.stopPropagation();
        // Esc en el buscador con texto: primero lo borra
        if (active?.id === 'buscador-proveedores-gestion' && (active as HTMLInputElement).value) { setBusqueda(''); return; }
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        e.stopPropagation();
        const allFocusables = Array.from(document.querySelectorAll('input:not([type="file"]), select, button:not([disabled]), textarea, [data-row-prov="true"]')) as HTMLElement[];
        const modalFocusables = allFocusables.filter(el =>
          el.closest('#modal-gestion-proveedores-container') &&
          !el.closest('#modal-proveedor-container') &&
          el.tabIndex !== -1 &&
          !el.classList.contains('hidden') &&
          el.offsetParent !== null
        );

        if (modalFocusables.length > 0) {
          e.preventDefault();
          const currentIndex = modalFocusables.indexOf(active);
          if (e.shiftKey) {
            const prevIndex = currentIndex <= 0 ? modalFocusables.length - 1 : currentIndex - 1;
            modalFocusables[prevIndex]?.focus();
          } else {
            const nextIndex = currentIndex === -1 || currentIndex >= modalFocusables.length - 1 ? 0 : currentIndex + 1;
            modalFocusables[nextIndex]?.focus();
          }
        }
        return;
      }

      if (e.key === 'ArrowDown') {
        if (active?.id === 'btn-cerrar-modal-gestion-proveedores') {
          e.preventDefault();
          document.getElementById('buscador-proveedores-gestion')?.focus();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleFormKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleFormKeyDown, { capture: true });
  }, [isOpen, isModalProveedorOpen]);

  const fetchProveedores = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('providers')
        .select('*')
        // La tabla providers no tiene is_active (usa estado): ese filtro hacía fallar la consulta y la lista salía vacía
        .neq('estado', 'ELIMINADO')
        .order('created_at', { ascending: false }); // el último que se ingresó sale primero

      if (error) throw error;
      setProveedores(data || []);
    } catch (err) {
      console.error('Error fetching proveedores:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProveedor = async (provData: Partial<Proveedor>) => {
    try {
      let idGuardado: string | null = proveedorAEditar?.id ? String(proveedorAEditar.id) : null;
      let mensaje = '';
      if (proveedorAEditar?.id) {
        const { error } = await supabase
          .from('providers')
          .update({
            ruc: provData.ruc,
            razon_social: provData.razon_social,
            nombre_comercial: provData.nombre_comercial,
            telefono: provData.telefono,
            email: provData.email,
            direccion: provData.direccion,
            estado: provData.estado
          })
          .eq('id', proveedorAEditar.id);

        if (error) throw error;
        mensaje = 'Proveedor actualizado correctamente.';
      } else {
        const { data, error } = await supabase
          .from('providers')
          .insert([{
            ruc: provData.ruc,
            razon_social: provData.razon_social,
            nombre_comercial: provData.nombre_comercial,
            telefono: provData.telefono,
            email: provData.email,
            direccion: provData.direccion,
            estado: provData.estado
          }]).select('id').single();

        if (error) throw error;
        idGuardado = data?.id ? String(data.id) : null;
        mensaje = 'Proveedor registrado exitosamente.';
        setBusqueda(''); setFiltro('TODOS'); // que el nuevo se vea (sale primero)
      }

      // Primero se cierra el formulario y se recarga la lista; después el aviso, y al cerrarlo el selector
      // queda en el proveedor guardado (antes el aviso salía mientras la lista se recargaba y el selector se perdía)
      volverA.current = idGuardado;
      setIsModalProveedorOpen(false);
      setProveedorAEditar(null);
      await fetchProveedores();
      await avisar(mensaje);
      setTimeout(() => {
        const fila = (idGuardado && document.querySelector<HTMLElement>(`[data-prov-id="${idGuardado}"]`))
          || document.getElementById('buscador-proveedores-gestion');
        fila?.focus();
        fila?.scrollIntoView({ block: 'nearest' });
      }, 350); // después de que el aviso devuelva su foco
    } catch (err: any) {
      console.error('Error al guardar proveedor:', err);
      void avisar('Error al guardar proveedor: ' + (err?.message || 'Error desconocido'));
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchProveedores();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div id="modal-gestion-proveedores-container" className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--color-surface)] w-full max-w-5xl max-h-[90vh] flex flex-col border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)]">

        {/* HEADER */}
        <div className="flex items-center justify-between p-4 border-b-2 border-[var(--color-ink)] bg-[var(--color-info)] shrink-0">
          <div className="flex items-center gap-3 text-[var(--color-ink)]">
            <Users size={24} strokeWidth={2.5} />
            <h2 className="text-xl font-black uppercase tracking-widest">Gestión de Proveedores</h2>
          </div>
          <button
            id="btn-cerrar-modal-gestion-proveedores"
            onClick={onClose}
            className="text-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-[var(--color-info)] focus:bg-[var(--color-ink)] focus:text-[var(--color-info)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] p-1 transition-colors border-2 border-transparent hover:border-[var(--color-ink)]"
            title="Cerrar ventana (Escape)"
          >
            <X size={24} strokeWidth={2.5} />
          </button>
        </div>

        {/* ACCIONES Y TABLA */}
        <div className="p-4 flex-1 min-h-0 flex flex-col gap-4 bg-[var(--color-bg)]">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 shrink-0">
            <div className="relative flex-1 min-w-0">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] pointer-events-none" />
              <input
                id="buscador-proveedores-gestion"
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                onKeyDown={teclasArriba}
                placeholder="Buscar por nombre, RUC, teléfono..."
                aria-label="Buscar proveedores"
                autoComplete="off"
                className="w-full pl-9 pr-3 py-3 border-2 border-[var(--color-ink)] bg-[var(--color-surface)] text-sm font-bold text-[var(--color-ink)] outline-none focus:ring-2 focus:ring-[var(--color-ink)]"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {FILTROS.map(([f, nombre]) => (
                <button key={f} id={`btn-prov-filtro-${f}`} type="button" aria-pressed={filtro === f} onClick={() => setFiltro(f)} onKeyDown={teclasArriba}
                  className={`px-3 py-3 border-2 border-[var(--color-ink)] text-xs font-black uppercase tracking-widest cursor-pointer focus:outline-none focus:ring-4 focus:ring-[var(--color-info)] ${filtro === f ? 'bg-[var(--color-ink)] text-[var(--color-info)]' : 'bg-[var(--color-surface)] text-[var(--color-ink)]'}`}>
                  {nombre} ({f === 'TODOS' ? proveedores.length : proveedores.filter((p) => p.estado === f).length})
                </button>
              ))}
            <button
              id="btn-nuevo-proveedor"
              onClick={() => {
                volverA.current = null;
                setProveedorAEditar(null);
                setIsModalProveedorOpen(true);
              }}
              onKeyDown={teclasArriba}
              className="bg-[var(--color-ink)] text-[var(--color-info)] px-6 py-3 border-2 border-[var(--color-ink)] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] focus:bg-[var(--color-surface)] focus:text-[var(--color-ink)] transition-all cursor-pointer shadow-[4px_4px_0_0_var(--color-ink)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]"
            >
              <Plus size={16} /> Nuevo Proveedor
            </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar border-2 border-[var(--color-ink)] bg-[var(--color-surface)] relative">
            {loading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--color-surface)]/80">
                <Loader2 className="animate-spin text-[var(--color-ink)] mb-4" size={32} />
                <p className="text-xs font-black uppercase tracking-widest">Cargando proveedores...</p>
              </div>
            ) : (
              <div className="h-full overflow-y-auto custom-scrollbar">
                <TablaProveedores
                  key={`${filtro}|${busqueda}`}
                  proveedores={visibles}
                  onEdit={(p) => {
                    volverA.current = String(p.id);
                    setProveedorAEditar(p);
                    setIsModalProveedorOpen(true);
                  }}
                  onDelete={async (p) => {
                    if (!await confirmar(`¿Seguro que deseas eliminar al proveedor ${p.razon_social}?`)) return;
                    try {
                      const { error } = await supabase.from('providers').update({ estado: 'ELIMINADO' }).eq('id', p.id);
                      if (error) throw error;
                      setProveedores(prev => prev.filter(prov => prov.id !== p.id));
                    } catch (err) {
                      console.error(err);
                      void avisar('Error eliminando proveedor');
                    }
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <ModalProveedor
          isOpen={isModalProveedorOpen}
          proveedorAEditar={proveedorAEditar}
          proveedoresExistentes={proveedores}
          onClose={() => {
            setIsModalProveedorOpen(false);
            setProveedorAEditar(null);
          }}
          onSave={handleSaveProveedor}
        />
      </div>
    </div>
  );
};
