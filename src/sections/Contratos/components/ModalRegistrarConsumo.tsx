import React, { useState, useEffect } from 'react';
import { X, Save, FlaskConical, AlertCircle } from 'lucide-react';
import { supabase } from '../../../db/supabase';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { enterSeQueda } from '../../../utils/enterSeQueda';
import { avisar } from '../../../utils/dialogos';
import type { VisitaContrato } from '../types';

interface ModalRegistrarConsumoProps {
  visita: VisitaContrato;
  onClose: (guardado?: boolean) => void;
}

export const ModalRegistrarConsumo: React.FC<ModalRegistrarConsumoProps> = ({ visita, onClose }) => {
  useCerrarConEscape(true, () => onClose());

  const [productos, setProductos] = useState<{ id: number; name: string; unit: string; quantity: number }[]>([]);
  const [lotes, setLotes] = useState<{ id: number; product_id: number; quantity: number; expiration_date: string | null }[]>([]);
  const [productId, setProductId] = useState<string>('');
  const [batchId, setBatchId] = useState<string>('');
  const [cantidad, setCantidad] = useState<string>('1');
  const [notas, setNotas] = useState('');
  const [esExterno, setEsExterno] = useState(false);
  const [nombreExterno, setNombreExterno] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargarStock();
  }, []);

  const cargarStock = async () => {
    try {
      const [resProd, resLotes] = await Promise.all([
        supabase.from('products').select('id, name, unit, quantity').eq('is_active', 1).order('name'),
        supabase.from('batches').select('id, product_id, quantity, expiration_date').gt('quantity', 0).order('id'),
      ]);

      if (resProd.data) setProductos(resProd.data);
      if (resLotes.data) setLotes(resLotes.data);
    } catch (err) {
      console.error('Error cargando inventario:', err);
    }
  };

  const lotesFiltrados = productId
    ? lotes.filter((l) => l.product_id === Number(productId))
    : [];

  const handleProductoChange = (pid: string) => {
    setProductId(pid);
    const ls = lotes.filter((l) => l.product_id === Number(pid));
    if (ls.length > 0) {
      setBatchId(String(ls[0].id));
    } else {
      setBatchId('');
    }
  };

  // Regla 9 SiuMax: Enter es como un clic, el selector se queda en el campo
  // (en una lista o una fecha, Enter la abre)
  const handleEnterKey = (e: React.KeyboardEvent, _nextId?: string) => enterSeQueda(e);

  const handleGuardar = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();

    const cant = parseFloat(cantidad);
    if (!cant || cant <= 0) {
      avisar('Ingresa una cantidad mayor a 0.');
      document.getElementById('input-cantidad-consumo')?.focus();
      return;
    }

    if (!esExterno && !productId) {
      avisar('Por favor selecciona un producto o marca "Material fuera de inventario".');
      document.getElementById('select-producto-consumo')?.focus();
      return;
    }

    if (esExterno && !nombreExterno.trim()) {
      avisar('Escribe el nombre del insumo o químico.');
      document.getElementById('input-nombre-externo')?.focus();
      return;
    }

    setGuardando(true);
    try {
      const { data, error } = await supabase.rpc('fn_registrar_consumo_visita', {
        p_visita_id: visita.id,
        p_product_id: esExterno ? null : Number(productId),
        p_batch_id: esExterno || !batchId ? null : Number(batchId),
        p_cantidad: cant,
        p_notas: esExterno ? nombreExterno.trim() : (notas.trim() || ''),
        p_usuario: 'Usuario'
      });

      if (error) throw error;

      avisar('Consumo registrado correctamente.');
      onClose(true);
    } catch (err: any) {
      console.error('Error registrando consumo:', err);
      avisar('Error registrando consumo: ' + (err.message || 'Error desconocido'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 font-mono">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo-consumo"
        className="ventana-sobria bg-[var(--color-surface)] border-2 border-[var(--color-ink)] w-full max-w-md flex flex-col max-h-[calc(90dvh/var(--ui-zoom))] overflow-hidden"
      >
        {/* Cabecera SiuMax Sobrio */}
        <div style={{ '--icono': 'var(--color-accent-shadow)' } as React.CSSProperties} className="ventana-cabecera px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="ventana-cabecera__icono">
              <FlaskConical size={18} />
            </div>
            <div>
              <h2 id="modal-titulo-consumo" className="ventana-cabecera__titulo">
                Registrar Consumo
              </h2>
              <p className="ventana-cabecera__subtitulo">
                Materiales o químicos en visita
              </p>
            </div>
          </div>
          <button
            id="btn-cerrar-modal-consumo"
            onClick={() => onClose()}
            className="ventana-cerrar"
            title="Cerrar (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulario */}
        <div className="p-4 space-y-4">
          <div className="p-2.5 bg-[var(--color-bg)] border border-[var(--color-border)] font-mono text-xs">
            <span className="text-[var(--color-muted)]">Visita: </span>
            <span className="font-bold text-[var(--color-ink)]">{visita.fecha_programada}</span>
            {visita.contrato && (
              <span className="text-[var(--color-ink)] block mt-0.5 font-bold">
                {visita.contrato.codigo} · {visita.contrato.titulo}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              id="check-es-externo"
              type="checkbox"
              checked={esExterno}
              onChange={(e) => setEsExterno(e.target.checked)}
              className="accent-[var(--color-ink)] w-4 h-4"
            />
            <label htmlFor="check-es-externo" className="font-mono text-xs font-bold text-[var(--color-ink)] select-none cursor-pointer">
              Material fuera de inventario (compra externa / directo)
            </label>
          </div>

          {!esExterno ? (
            <>
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[var(--color-ink)] mb-1">
                  Producto / Químico de Almacén *
                </label>
                <select
                  id="select-producto-consumo"
                  value={productId}
                  onChange={(e) => handleProductoChange(e.target.value)}
                  onKeyDown={(e) => handleEnterKey(e, 'select-lote-consumo')}
                  className="w-full h-10 px-3 bg-[var(--color-bg)] border border-[var(--color-border)] font-mono text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)]"
                >
                  <option value="">-- Seleccionar Insumo / Producto --</option>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stock: {p.quantity} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              {lotesFiltrados.length > 0 && (
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-[var(--color-ink)] mb-1">
                    Lote de Almacén
                  </label>
                  <select
                    id="select-lote-consumo"
                    value={batchId}
                    onChange={(e) => setBatchId(e.target.value)}
                    onKeyDown={(e) => handleEnterKey(e, 'input-cantidad-consumo')}
                    className="w-full h-10 px-3 bg-[var(--color-bg)] border border-[var(--color-border)] font-mono text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)]"
                  >
                    {lotesFiltrados.map((l) => (
                      <option key={l.id} value={l.id}>
                        Lote #{l.id} - Disp: {l.quantity} {l.expiration_date ? `(Vence: ${l.expiration_date})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          ) : (
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-[var(--color-ink)] mb-1">
                Descripción del Insumo / Químico *
              </label>
              <input
                id="input-nombre-externo"
                type="text"
                placeholder="Ej: Cloro granulado 1kg, Alguicida 500ml..."
                value={nombreExterno}
                onChange={(e) => setNombreExterno(e.target.value)}
                onKeyDown={(e) => handleEnterKey(e, 'input-cantidad-consumo')}
                className="w-full h-10 px-3 bg-[var(--color-bg)] border border-[var(--color-border)] font-mono text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)]"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-[var(--color-ink)] mb-1">
                Cantidad Usada *
              </label>
              <input
                id="input-cantidad-consumo"
                type="number"
                step="0.001"
                min="0.001"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                onKeyDown={(e) => handleEnterKey(e, 'input-notas-consumo')}
                className="w-full h-10 px-3 bg-[var(--color-bg)] border border-[var(--color-border)] font-mono text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-[var(--color-ink)] mb-1">
                Notas / Motivo
              </label>
              <input
                id="input-notas-consumo"
                type="text"
                placeholder="Ej: Dosis de choque..."
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className="w-full h-10 px-3 bg-[var(--color-bg)] border border-[var(--color-border)] font-mono text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)]"
              />
            </div>
          </div>
        </div>

        {/* Pie */}
        <div className="h-14 bg-[var(--color-bg)] border-t border-[var(--color-border)] px-4 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => onClose()}
            className="h-10 px-4 font-mono text-xs font-bold uppercase tracking-wider border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:border-[var(--color-ink)] transition-colors"
          >
            Cancelar
          </button>

          <button
            id="btn-guardar-consumo"
            type="button"
            disabled={guardando}
            onClick={handleGuardar}
            className="h-10 px-6 font-mono text-xs font-black uppercase tracking-widest bg-[var(--color-ink)] text-white hover:bg-[var(--color-accent-dark)] transition-colors flex items-center gap-2 cursor-pointer shadow-sm active:translate-y-0.5"
          >
            <Save size={15} />
            <span>{guardando ? 'Guardando...' : 'Descontar y Guardar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
