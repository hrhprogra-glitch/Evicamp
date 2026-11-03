import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Store as StoreIcon, Loader2 } from 'lucide-react';
import type { Store } from '../../../types/stores';
import { supabase } from '../../../db/supabase';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { avisar } from '../../../utils/dialogos';

interface ModalTiendaProps {
  tienda: Store | null;
  onClose: (actualizado?: boolean) => void;
}

export const ModalTienda: React.FC<ModalTiendaProps> = ({ tienda, onClose }) => {
  useCerrarConEscape(true, () => onClose());

  const [nombre, setNombre] = useState(tienda?.nombre || '');
  const [codigo, setCodigo] = useState(tienda?.codigo || '');
  const [direccion, setDireccion] = useState(tienda?.direccion || '');
  const [telefono, setTelefono] = useState(tienda?.telefono || '');
  const [whatsapp, setWhatsapp] = useState(tienda?.whatsapp || '');
  const [esAlmacenPrincipal, setEsAlmacenPrincipal] = useState(tienda?.es_almacen_principal ?? false);
  const [activo, setActivo] = useState(tienda?.activo ?? true);
  const [guardando, setGuardando] = useState(false);

  const inputNombreRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputNombreRef.current?.focus();
    inputNombreRef.current?.select();
  }, []);

  const handleGuardar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!nombre.trim()) {
      avisar('Escribe el nombre de la tienda o almacén.');
      inputNombreRef.current?.focus();
      return;
    }

    setGuardando(true);
    try {
      const datos = {
        nombre: nombre.trim(),
        codigo: codigo.trim() || null,
        direccion: direccion.trim() || null,
        telefono: telefono.trim() || null,
        whatsapp: whatsapp.trim() || null,
        es_almacen_principal: esAlmacenPrincipal,
        activo: activo,
      };

      if (tienda?.id) {
        // Actualizar
        const { error } = await supabase
          .from('stores')
          .update(datos)
          .eq('id', tienda.id);

        if (error) throw error;
      } else {
        // Crear nueva
        const { error } = await supabase
          .from('stores')
          .insert([datos]);

        if (error) throw error;
      }

      onClose(true);
      avisar(tienda ? 'Local actualizado correctamente.' : 'Nueva tienda o almacén creado.');
    } catch (err: any) {
      console.error('Error al guardar tienda:', err);
      avisar(err.message || 'No se pudo guardar los datos del local.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
      <div 
        role="dialog"
        aria-modal="true"
        id="modal-tienda"
        aria-labelledby="titulo-modal-tienda"
        className="w-full max-w-lg bg-[var(--color-bg)] border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between px-4 py-3 bg-[var(--color-ink)] text-white border-b-2 border-[var(--color-ink)] select-none">
          <div className="flex items-center gap-2">
            <StoreIcon size={18} className="text-[var(--color-accent)]" />
            <h2 id="titulo-modal-tienda" className="text-xs font-black uppercase tracking-widest text-[var(--color-accent)]">
              {tienda ? 'Editar Tienda / Almacén' : 'Nueva Tienda o Almacén'}
            </h2>
          </div>
          <button
            onClick={() => onClose()}
            className="p-1 hover:bg-white/20 text-white rounded-none transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            title="Cerrar (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleGuardar} className="p-4 overflow-y-auto space-y-4 custom-scrollbar text-[var(--color-ink)] font-mono">
          <div>
            <label className="block text-xs font-bold uppercase mb-1">
              Nombre del Local <span className="text-red-500">*</span>
            </label>
            <input
              ref={inputNombreRef}
              id="input-tienda-nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Tienda Central, Almacén 2..."
              required
              className="w-full px-3 py-2 border-2 border-[var(--color-ink)] bg-[var(--color-surface)] text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase mb-1">
                Código Corto
              </label>
              <input
                id="input-tienda-codigo"
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                placeholder="Ej. T01, AL02"
                maxLength={10}
                className="w-full px-3 py-2 border-2 border-[var(--color-ink)] bg-[var(--color-surface)] text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded-none uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-1">
                Teléfono
              </label>
              <input
                id="input-tienda-telefono"
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej. 01 2345678"
                className="w-full px-3 py-2 border-2 border-[var(--color-ink)] bg-[var(--color-surface)] text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase mb-1">
              WhatsApp para Pedidos
            </label>
            <input
              id="input-tienda-whatsapp"
              type="text"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="Ej. 987654321"
              className="w-full px-3 py-2 border-2 border-[var(--color-ink)] bg-[var(--color-surface)] text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase mb-1">
              Dirección Física
            </label>
            <input
              id="input-tienda-direccion"
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Ej. Av. Central 123, Mz B Lote 4"
              className="w-full px-3 py-2 border-2 border-[var(--color-ink)] bg-[var(--color-surface)] text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded-none"
            />
          </div>

          <div className="pt-2 border-t border-[var(--color-border)] space-y-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                id="check-tienda-almacen-principal"
                type="checkbox"
                checked={esAlmacenPrincipal}
                onChange={(e) => setEsAlmacenPrincipal(e.target.checked)}
                className="w-4 h-4 text-[var(--color-accent)] focus:ring-[var(--color-accent)] border-[var(--color-ink)]"
              />
              <span className="text-xs font-bold uppercase">Es Almacén Principal / Depósito Central</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                id="check-tienda-activo"
                type="checkbox"
                checked={activo}
                onChange={(e) => setActivo(e.target.checked)}
                className="w-4 h-4 text-[var(--color-accent)] focus:ring-[var(--color-accent)] border-[var(--color-ink)]"
              />
              <span className="text-xs font-bold uppercase">Local Activo (Operativo)</span>
            </label>
          </div>

          {/* Pie con botón guardar */}
          <div className="flex justify-end pt-3 border-t-2 border-[var(--color-ink)]">
            <button
              id="btn-guardar-tienda"
              type="submit"
              disabled={guardando}
              className="flex items-center gap-2 px-6 py-2.5 bg-[var(--color-accent)] text-[var(--color-ink)] border-2 border-[var(--color-ink)] font-black text-xs uppercase tracking-widest hover:bg-[var(--color-ink)] hover:text-[var(--color-accent)] transition-all cursor-pointer shadow-[3px_3px_0_0_var(--color-ink)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] disabled:opacity-50"
            >
              {guardando ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Guardando...
                </>
              ) : (
                <>
                  <Save size={16} /> Guardar Local
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
