import { traerTodo } from '../../../utils/traerTodo';
import { coincideBusqueda } from '../../../utils/busqueda';
import React, { useState, useEffect } from 'react';
import { Database,Layers, Edit, Trash2, History, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../../db/supabase';
import { formatearCantidad } from '../../../utils/formato';
import { usePermiso, avisarSinPermiso } from '../../../utils/permisos';

interface Lote {
  id: string;
  product_id: string;
  quantity: number;
  initial_quantity: number;
  expiration_date: string | null;
  created_at: string;
  cost_unit: number;
  product_name: string;
  document_ref: string;
  category: string;
  mermas_count?: number; // Cantidad de veces que se registró merma
  mermas_total?: number; // Suma total de unidades perdidas
  unit?: string; // <-- AÑADIDO PARA LA UNIDAD
  supplier?: string; // <-- AÑADIDO PARA EL PROVEEDOR
}

interface Props {
  searchQuery: string;
  filtroCategoria: string;
  filtroEstado: string;
  filtroOrden: string;
  nuevoLoteInyectado?: any;
  onViewMermas?: (lote: any) => void;
  onViewHistory?: (lote: any) => void;
  onEditLote?: (lote: any) => void;
  onLoteDeleted?: (productId: string, quantityRemoved: number) => void; // <-- AÑADIR ESTA LÍNEA
}

export const TablaLotes: React.FC<Props> = ({ 
  searchQuery, filtroCategoria, filtroEstado, filtroOrden, nuevoLoteInyectado, onViewMermas, onViewHistory, onEditLote, onLoteDeleted // <-- AÑADIR AQUÍ
}) => {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(true);
  // Retirar un lote: permiso de ingresar lotes o de eliminar productos (el servidor también lo exige)
  const puedeIngresarLotes = usePermiso('almacen_ingresar_lotes');
  const puedeEliminarProductos = usePermiso('almacen_eliminar_productos');
  const puedeRetirarLote = puedeIngresarLotes || puedeEliminarProductos;

  useEffect(() => {
    const fetchLotes = async () => {
      setLoading(true);
      try {
        // 🛡️ OPTIMIZACIÓN: Ocultamos los lotes que fueron eliminados (is_active: 0)
        const { data, error } = await supabase
          .from('batches')
          .select(`
            *,
            products!batches_product_id_fkey (*)
          `)
          .neq('is_active', 0) // 🔥 EL ESCUDO: Ya no descarga los eliminados
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data) {
          const mapeados: Lote[] = data.map((b: any) => ({
            id: b.id,
            product_id: b.product_id,
            quantity: Number(b.quantity) || 0,
            initial_quantity: Number(b.initial_quantity) || 0,
            expiration_date: b.expiration_date,
            created_at: new Date(b.created_at).toLocaleDateString(),
            cost_unit: Number(b.cost_unit) || 0,
            product_name: b.products?.name || 'PRODUCTO DESCONOCIDO',
            document_ref: b.document_ref || 'INT-S/R',
            supplier: b.supplier || '',
            category: b.products?.category || 'GENERAL',
            unit: b.products?.unit === 'CONSUMO' || b.products?.control_type === 'CONSUMO' || b.products?.control_type === 'SERVICE' ? 'CONSUMO' : (b.products?.unit || b.products?.weight_unit || (b.products?.control_type === 'WEIGHT' ? 'KG' : 'UND'))
          }));
          setLotes(mapeados);
        }
      } catch (error: any) {
        console.error("Error cargando lotes:", error.message || error.details || JSON.stringify(error));
      } finally {
        setLoading(false);
      }
    };

    fetchLotes();
  }, []);
  // === INYECCIÓN OPTIMISTA (AGREGA O EDITA EL LOTE SIN RECARGAR LA PANTALLA) ===
  useEffect(() => {
    if (nuevoLoteInyectado) {
      
      // INTERCEPCIÓN TÉCNICA: Formateamos la fecha si viene cruda desde Supabase (ISO 8601)
      const loteFormateado = {
        ...nuevoLoteInyectado,
        created_at: nuevoLoteInyectado.created_at && nuevoLoteInyectado.created_at.includes('T') 
          ? new Date(nuevoLoteInyectado.created_at).toLocaleDateString() 
          : nuevoLoteInyectado.created_at
      };

      setLotes(prev => {
        const existe = prev.some(l => l.id === loteFormateado.id);
        if (existe) {
          // Si el lote ya existe, lo ACTUALIZAMOS (Modo Edición)
          return prev.map(l => l.id === loteFormateado.id ? { ...l, ...loteFormateado } : l);
        }
        // Si no existe, lo AGREGAMOS al inicio (Modo Creación)
        return [loteFormateado, ...prev];
      });
    }
  }, [nuevoLoteInyectado]);

  // === MOTOR DE FILTRADO Y ORDENAMIENTO PARA LOS LOTES ===
  // 🔥 INTELIGENCIA DE BÚSQUEDA: Detectar si hay un producto que se llame EXACTAMENTE igual a lo que se busca
  const filteredLotes = lotes.filter(lote => {
    // 1. Filtro de Búsqueda de Texto Inteligente (coincidencia flexible)
    if (searchQuery && searchQuery.trim()) {
      if (!coincideBusqueda([lote.product_name, lote.document_ref], searchQuery)) {
        return false;
      }
    }
    
    // 2. Filtro por Categoría
    if (filtroCategoria && lote.category !== filtroCategoria) {
      return false;
    }

    // 3. Filtro por Estado 
    if (filtroEstado === 'CON_STOCK' && lote.quantity <= 0) return false;
    if (filtroEstado === 'SIN_STOCK' && lote.quantity > 0) return false;
    if (filtroEstado === 'CRITICO') {
      // Un lote es crítico si está vencido o le queda el 20% o menos de su capacidad inicial
      const isExpired = lote.expiration_date && new Date(lote.expiration_date) < new Date();
      const isLow = lote.quantity > 0 && lote.quantity <= (lote.initial_quantity * 0.2);
      if (!isExpired && !isLow) return false;
    }

    return true;
  }).sort((a, b) => {
    // 4. Filtro de Ordenamiento Alfabético o Matemático
    if (filtroOrden === 'NOMBRE_ASC') return a.product_name.localeCompare(b.product_name);
    if (filtroOrden === 'NOMBRE_DESC') return b.product_name.localeCompare(a.product_name);
    if (filtroOrden === 'STOCK_ASC') return a.quantity - b.quantity;
    if (filtroOrden === 'STOCK_DESC') return b.quantity - a.quantity;
    if (filtroOrden === 'PRECIO_ASC') return a.cost_unit - b.cost_unit;
    if (filtroOrden === 'PRECIO_DESC') return b.cost_unit - a.cost_unit;
    return 0;
  });

  // === ESTADOS Y LÓGICA DE PAGINACIÓN ===
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  // Reiniciar a la página 1 si cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filtroCategoria, filtroEstado, filtroOrden]);

  const totalPages = Math.ceil(filteredLotes.length / ITEMS_PER_PAGE);
  const paginatedLotes = filteredLotes.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Generador de controles de paginación
  // Igual que la paginación de Productos: se puede enfocar con flechas aunque esté en el límite
  // (aria-disabled en vez de disabled, porque un botón disabled no recibe el selector)
  const renderPagination = (position: 'top' | 'bottom') => {
    if (loading || totalPages <= 0) return null;
    const prevId = position === 'top' ? 'btn-pag-prev-lotes' : 'btn-pag-bottom-prev-lotes';
    const nextId = position === 'top' ? 'btn-pag-next-lotes' : 'btn-pag-bottom-next-lotes';
    const isPrevDisabled = currentPage === 1;
    const isNextDisabled = currentPage === totalPages;
    const filas = () => (Array.from(document.querySelectorAll('div[data-row="true"][role="button"]')) as HTMLElement[])
      .filter((f) => !f.closest('.hidden'));
    const teclas = (e: React.KeyboardEvent, otroId: string, haciaOtro: 'ArrowLeft' | 'ArrowRight') => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.key === haciaOtro) document.getElementById(otroId)?.focus();
      else if (e.key === 'ArrowUp') {
        if (position === 'top') document.getElementById('buscador-global-inventario')?.focus();
        else filas().at(-1)?.focus();
      } else if (e.key === 'ArrowDown' && position === 'top') filas()[0]?.focus();
    };
    const clase = (deshabilitado: boolean) => `w-8 h-8 flex items-center justify-center bg-[var(--color-surface)] border border-[#E2E8F0] text-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-white transition-colors rounded-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] focus:bg-[var(--color-ink)] focus:text-white ${deshabilitado ? 'opacity-40 cursor-not-allowed' : ''}`;
    return (
      <div className={`${position === 'top' ? 'border-b' : 'border-t'} border-[#E2E8F0] bg-[#F8FAFC] p-3 flex items-center justify-between shrink-0`}>
        <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest">
          Página {currentPage} de {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            id={prevId}
            aria-disabled={isPrevDisabled}
            onClick={() => { if (!isPrevDisabled) setCurrentPage(prev => Math.max(prev - 1, 1)); }}
            onKeyDown={(e) => teclas(e, nextId, 'ArrowRight')}
            className={clase(isPrevDisabled)}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            id={nextId}
            aria-disabled={isNextDisabled}
            onClick={() => { if (!isNextDisabled) setCurrentPage(prev => Math.min(prev + 1, totalPages)); }}
            onKeyDown={(e) => teclas(e, prevId, 'ArrowLeft')}
            className={clase(isNextDisabled)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="border border-[#E2E8F0] flex flex-col bg-[var(--color-surface)] relative min-h-[200px]">
      {loading && (
        <div className="absolute inset-0 bg-white/80 dark:bg-[var(--color-surface)]/80 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-[var(--color-border)] border-t-[var(--color-ink)] animate-spin rounded-full"></div>
            <span className="text-[12px] font-black text-[var(--color-ink)] uppercase tracking-widest font-mono">Cargando...</span>
          </div>
        </div>
      )}

      {/* Paginación Superior */}
      {renderPagination('top')}

      {/* CONTENEDOR CON SCROLL HORIZONTAL (CABECERA + FILAS) — SIN SCROLL VERTICAL INTERNO: baja con el scroll de la página */}
      <div className="w-full overflow-x-auto custom-scrollbar">
        <div className="min-w-[960px]">

      {/* Cabecera de la Tabla (TEXTO AGRANDADO a text-sm) */}
      <div className="grid grid-cols-12 bg-[var(--color-ink)] text-white p-4 text-sm font-black uppercase tracking-[0.1em]">
        <div className="col-span-2">Fecha / Doc / Prov.</div>
        <div className="col-span-3">Producto</div>
        <div className="col-span-2 text-center">Estado / Vence</div>
        <div className="col-span-1 text-right">Costo U.</div>
        <div className="col-span-1 text-right">T. Compra</div>
        <div className="col-span-1 text-center">Mermas</div>
        <div className="col-span-1 text-center">Stock</div>
        <div className="col-span-1 text-center">Acción</div>
      </div>

      {/* Cuerpo de la Tabla */}
      <div>
        {!loading && paginatedLotes.length === 0 ? (
          <div className="p-12 text-center text-[#94A3B8] font-bold uppercase text-[10px] tracking-widest flex flex-col items-center justify-center gap-2">
            <Layers size={32} className="text-[#E2E8F0] mb-2" />
            No hay lotes que coincidan con la búsqueda.
          </div>
        ) : (
          paginatedLotes.map((lote) => {
  // LÓGICA DE VIGENCIA Y CÁLCULOS TÉCNICOS
  const isExpired = lote.expiration_date && new Date(lote.expiration_date) < new Date();
  const isVigente = lote.quantity > 0 && !isExpired;
  const totalCompra = (lote.initial_quantity * lote.cost_unit).toFixed(2);

  return (
    // SE AGRANDÓ LA LETRA BASE DE LA FILA (text-base)
    <div
      key={lote.id}
      data-row="true"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          if (onEditLote) onEditLote(lote);
        }
      }}
      onClick={() => onEditLote && onEditLote(lote)}
      className="grid grid-cols-12 items-center p-4 border-b border-[#F1F5F9] hover:bg-[#F8FAFC] focus:bg-amber-50/50 dark:focus:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-ink)] transition-colors group text-base cursor-pointer"
      title="Presione Enter o haga clic para editar"
    >
      
      {/* 1. INGRESO Y REFERENCIA / SUSTENTO / PROVEEDOR */}
      <div className="col-span-2 flex flex-col gap-1 pr-2">
        <span className="text-[var(--color-ink)] font-black">{lote.created_at}</span>
        
        {/* Documento o Sustento Guardado */}
        <span className="text-xs font-black text-[#64748B] uppercase truncate" title={lote.document_ref}>
          {lote.document_ref}
        </span>
        
        {/* Proveedor en color azul para resaltarlo */}
        {lote.supplier && (
          <span className="text-[10px] font-black text-[#3B82F6] uppercase truncate" title={lote.supplier}>
            PROV: {lote.supplier}
          </span>
        )}
      </div>

      {/* 2. PRODUCTO Y CATEGORÍA */}
      <div className="col-span-3 pr-4">
        <p className="font-black uppercase text-[var(--color-ink)] truncate" title={lote.product_name}>
          {lote.product_name}
        </p>
        <span className="text-xs font-black bg-[#E2E8F0] px-2 py-1 text-[#64748B] uppercase mt-1 inline-block w-max">
          {lote.category}
        </span>
      </div>

      {/* 3. ESTADO DINÁMICO Y VENCIMIENTO */}
      <div className="col-span-2 flex flex-col items-center gap-1">
        <div className={`px-3 py-1 text-xs font-black uppercase border-2 ${
          isVigente ? 'bg-[#ECFDF5] text-[var(--color-success)] border-[var(--color-success)]' : 'bg-[#FEF2F2] text-[var(--color-danger)] border-[var(--color-danger)]'
        }`}>
          {isVigente ? 'VIGENTE' : isExpired ? 'CADUCADO' : 'AGOTADO'}
        </div>
        <span className="text-xs font-black text-[#64748B]">
          {lote.expiration_date || 'SIN VENC.'}
        </span>
      </div>

      {/* 4. COSTO UNITARIO */}
      <div className="col-span-1 text-right">
        <p className="font-black text-[#64748B]">S/ {lote.cost_unit.toFixed(2)}</p>
      </div>

      {/* 5. TOTAL COMPRA */}
      <div className="col-span-1 text-right">
        <p className="font-black text-[var(--color-ink)]">S/ {totalCompra}</p>
      </div>

      {/* 6. TRAZABILIDAD DE MERMAS */}
      <div className="col-span-1 text-center">
        {lote.mermas_total && lote.mermas_total > 0 ? (
          <div className="bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 text-[11px] font-black inline-block mx-auto rounded-none" title={`Eventos: ${lote.mermas_count}`}>
            -{lote.mermas_total}
          </div>
        ) : (
          <span className="text-[#CBD5E1] font-bold text-xs">-</span>
        )}
      </div>

      {/* 7. STOCK ACTUAL (Con Unidad de Medida) */}
      <div className="col-span-1 text-center flex flex-col items-center px-1">
        <div 
          className={`flex flex-col items-center justify-center px-1 py-0.5 text-sm font-black border-2 w-full max-w-[60px] overflow-hidden text-ellipsis ${
            isVigente ? 'border-[var(--color-ink)] bg-[var(--color-surface)] text-[var(--color-ink)]' : 'border-[#CBD5E1] bg-[#F1F5F9] text-[#94A3B8]'
          }`} 
          title={`Stock exacto en DB: ${lote.quantity} ${lote.unit || 'UND'}`}
        >
          <span className="leading-none">{formatearCantidad(lote.quantity, lote.unit)}</span>
          <span className="text-[8px] opacity-70 leading-tight mt-0.5">{lote.unit || 'UND'}</span>
        </div>
      </div>

      {/* 8. ACCIONES: HISTORIAL, EDITAR Y ELIMINAR (Íconos más grandes) */}
      <div className="col-span-1 text-center flex items-center justify-center gap-3">
        {/* BOTÓN HISTORIAL DE LOTES / MOVIMIENTOS */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onViewHistory) {
              onViewHistory(lote);
            } else if (onViewMermas) {
              onViewMermas(lote);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation();
            }
          }}
          className="text-[#94A3B8] hover:text-[#3B82F6] focus:text-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] p-1 transition-colors cursor-pointer"
          title="Historial de Lotes / Movimientos"
        >
          <History size={18} />
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); onEditLote && onEditLote(lote); }}
          className="text-[#94A3B8] hover:text-[var(--color-success)] focus:text-[var(--color-success)] focus:outline-none focus:ring-2 focus:ring-[var(--color-success)] p-1 transition-colors cursor-pointer"
          title="Editar datos del Lote"
        >
          <Edit size={18} />
        </button>

        <button
          onClick={async (e) => {
            e.stopPropagation();
            if (!puedeRetirarLote) { avisarSinPermiso('retirar lotes'); return; }
            if (window.confirm(`MANTENIMIENTO DE INTEGRIDAD\n\n¿Confirma el retiro del lote de "${lote.product_name}"?\n\nEsta acción descargará el stock actual pero mantendrá intacto el historial de ventas, utilidades y contabilidad.`)) {
              try {
                // 🛡️ EVICAMP: Ejecución Transaccional Segura desde la Base de Datos
                const { error: dbError } = await supabase.rpc('fn_soft_delete_batch', {
                  p_batch_id: String(lote.id),
                  p_user_name: 'Admin'
                });

                if (dbError) throw dbError;

                // 4. Sincronizar memoria visual
                if (onLoteDeleted) {
                  onLoteDeleted(lote.product_id, Number(lote.quantity));
                }

                // 5. Remover el lote de la pantalla actual
                setLotes(prev => prev.filter(l => l.id !== lote.id));
                
              } catch (err: any) {
                console.error("[ DB ERROR ]:", err);
                alert("⚠️ ERROR: No se pudo procesar la solicitud de retiro técnico.");
              }
            }
          }}
          className="text-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-[#FFFFFF] focus:bg-[var(--color-ink)] focus:text-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-red-500 border border-transparent hover:border-[#E2E8F0] p-1 rounded-none transition-colors cursor-pointer"
          title="Eliminar Lote"
        >
          <Trash2 size={18} />
        </button>
      </div>

    </div>
  );
})
        )}
      </div>

        </div>
      </div>

      {/* Paginación Inferior */}
      {renderPagination('bottom')}
    </div>
  );
};