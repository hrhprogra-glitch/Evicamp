import React, { useState, useEffect } from 'react';
import { X, Users, Plus, Loader2 } from 'lucide-react';
import { supabase } from '../../../db/supabase';
import { TablaProveedores } from '../../Proveedores/components/TablaProveedores';
import { ModalProveedor } from '../../Proveedores/components/ModalProveedor';
import type { Proveedor } from '../../Proveedores/types';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ModalGestionProveedores: React.FC<Props> = ({ isOpen, onClose }) => {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalProveedorOpen, setIsModalProveedorOpen] = useState(false);
  const [proveedorAEditar, setProveedorAEditar] = useState<Proveedor | null>(null);

  useCerrarConEscape(isOpen && !isModalProveedorOpen, onClose);

  // Auto-Focus al abrir el modal (hacia la primera fila o hacia + Nuevo Proveedor)
  useEffect(() => {
    if (isOpen && !isModalProveedorOpen && !loading) {
      const timer = setTimeout(() => {
        const firstRow = document.querySelector('[data-row-prov="true"]') as HTMLElement;
        if (firstRow) {
          firstRow.focus();
        } else {
          document.getElementById('btn-nuevo-proveedor')?.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isModalProveedorOpen, loading]);

  // Focus Trap para ModalGestionProveedores (Captura estricta para evitar que Tab abra Sidebar)
  useEffect(() => {
    if (!isOpen || isModalProveedorOpen) return;

    const handleFormKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement;

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
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
          document.getElementById('btn-nuevo-proveedor')?.focus();
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
        .eq('is_active', 1)
        .order('razon_social');
      
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
        alert('Proveedor actualizado correctamente.');
      } else {
        const { error } = await supabase
          .from('providers')
          .insert([{
            ruc: provData.ruc,
            razon_social: provData.razon_social,
            nombre_comercial: provData.nombre_comercial,
            telefono: provData.telefono,
            email: provData.email,
            direccion: provData.direccion,
            estado: provData.estado
          }]);

        if (error) throw error;
        alert('Proveedor registrado exitosamente.');
      }

      setIsModalProveedorOpen(false);
      setProveedorAEditar(null);
      await fetchProveedores();
    } catch (err: any) {
      console.error('Error al guardar proveedor:', err);
      alert('Error al guardar proveedor: ' + (err?.message || 'Error desconocido'));
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
      <div className="bg-[var(--color-surface)] w-full max-w-5xl max-h-[90vh] flex flex-col border-4 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)]">
        
        {/* HEADER */}
        <div className="flex items-center justify-between p-4 border-b-4 border-[var(--color-ink)] bg-[var(--color-info)] shrink-0">
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
          <div className="flex justify-between items-center shrink-0">
            <p className="text-sm font-bold text-[var(--color-muted)] uppercase tracking-widest">
              Total registrados: {proveedores.length}
            </p>
            <button
              id="btn-nuevo-proveedor"
              onClick={() => {
                setProveedorAEditar(null);
                setIsModalProveedorOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  const firstRow = document.querySelector('[data-row-prov="true"]') as HTMLElement;
                  if (firstRow) {
                    firstRow.focus();
                  }
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  document.getElementById('btn-cerrar-modal-gestion-proveedores')?.focus();
                }
              }}
              className="bg-[var(--color-ink)] text-[var(--color-info)] px-6 py-3 border-2 border-[var(--color-ink)] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] focus:bg-[var(--color-surface)] focus:text-[var(--color-ink)] transition-all cursor-pointer shadow-[4px_4px_0_0_var(--color-ink)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]"
            >
              <Plus size={16} /> Nuevo Proveedor
            </button>
          </div>

          <div className="flex-1 min-h-0 border-2 border-[var(--color-ink)] bg-[var(--color-surface)] relative">
            {loading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--color-surface)]/80">
                <Loader2 className="animate-spin text-[var(--color-ink)] mb-4" size={32} />
                <p className="text-xs font-black uppercase tracking-widest">Cargando proveedores...</p>
              </div>
            ) : (
              <div className="h-full overflow-y-auto custom-scrollbar">
                <TablaProveedores 
                  proveedores={proveedores}
                  onEdit={(p) => {
                    setProveedorAEditar(p);
                    setIsModalProveedorOpen(true);
                  }}
                  onDelete={async (p) => {
                    if (!window.confirm(`¿Seguro que deseas eliminar al proveedor ${p.razon_social}?`)) return;
                    try {
                      const { error } = await supabase.from('providers').update({ is_active: 0 }).eq('id', p.id);
                      if (error) throw error;
                      setProveedores(prev => prev.filter(prov => prov.id !== p.id));
                    } catch (err) {
                      console.error(err);
                      alert('Error eliminando proveedor');
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
