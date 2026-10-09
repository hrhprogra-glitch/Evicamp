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

  useCerrarConEscape(isOpen, onClose);

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

  useEffect(() => {
    if (isOpen) {
      fetchProveedores();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--color-surface)] w-full max-w-5xl max-h-[90vh] flex flex-col border-4 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)]">
        
        {/* HEADER */}
        <div className="flex items-center justify-between p-4 border-b-4 border-[var(--color-ink)] bg-[var(--color-info)] shrink-0">
          <div className="flex items-center gap-3 text-[var(--color-ink)]">
            <Users size={24} strokeWidth={2.5} />
            <h2 className="text-xl font-black uppercase tracking-widest">Gestión de Proveedores</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-[var(--color-info)] p-1 transition-colors border-2 border-transparent hover:border-[var(--color-ink)]"
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
              onClick={() => {
                setProveedorAEditar(null);
                setIsModalProveedorOpen(true);
              }}
              className="bg-[var(--color-ink)] text-[var(--color-info)] px-6 py-3 border-2 border-[var(--color-ink)] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)] transition-all cursor-pointer shadow-[4px_4px_0_0_var(--color-ink)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]"
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
          onClose={() => setIsModalProveedorOpen(false)}
          onSave={() => fetchProveedores()}
        />
      </div>
    </div>
  );
};
