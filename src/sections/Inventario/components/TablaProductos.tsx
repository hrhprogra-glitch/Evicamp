import React, { useState } from 'react';
import { Database, ArrowUpDown, Search, Edit, Trash2, ChevronLeft, ChevronRight, Check, X, History, Barcode, Tag, Image as ImageIcon } from 'lucide-react';
import { EtiquetaStock } from './EtiquetaStock';
import type { Product } from '../types';
import { usePermiso, avisarSinPermiso } from '../../../utils/permisos';
import { confirmar } from '../../../utils/dialogos';

interface Props {
  loading: boolean;
  productos: Product[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onUpdateProduct?: (updatedProduct: Product) => void;
  onEditProduct?: (product: Product) => void;
  onDeleteProduct?: (product: Product) => void; 
  onViewHistory?: (product: Product) => void; // <-- NUEVA PROP AQUÍ
  onEtiqueta?: (product: Product) => void; // fase 2.5: imprimir etiquetas (components/ModalEtiqueta.tsx)
}

export const TablaProductos: React.FC<Props> = ({ 
  loading, productos, currentPage, totalPages, onPageChange, onUpdateProduct, onEditProduct, onDeleteProduct, onViewHistory, onEtiqueta // <-- AGREGAR AQUÍ
}) => {
  // Sin permiso, el botón de borrar avisa antes de pedir la confirmación
  const puedeEliminar = usePermiso('almacen_eliminar_productos');
  // ESTADOS PARA LA EDICIÓN EN LÍNEA
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});

  const startEditing = (product: Product) => {
    setEditingId(product.id);
    setEditForm(product); // Copiamos los datos actuales a la memoria de edición
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEditing = () => {
    if (onUpdateProduct && editForm.id) {
      onUpdateProduct(editForm as Product);
    } else {
      alert("Simulación: Producto actualizado localmente. (Falta conectar a Supabase)");
    }
    setEditingId(null);
    setEditForm({});
  };

  // Obtener filas visibles y enfocables exclusivamente de esta tabla de productos
  const obtenerFilas = () => {
    const container = document.getElementById('tabla-productos-inventario');
    const root = container || document;
    return (Array.from(root.querySelectorAll('div[data-row="true"][role="button"]')) as HTMLElement[])
      .filter((el) => !el.closest('.hidden') && el.offsetParent !== null);
  };

  // Función para dibujar la paginación
  const renderPagination = (position: 'top' | 'bottom') => {
    if (loading || totalPages <= 0) return null;
    
    const prevId = position === 'top' ? 'btn-pag-prev-inventario' : 'btn-pag-bottom-prev-inventario';
    const nextId = position === 'top' ? 'btn-pag-next-inventario' : 'btn-pag-bottom-next-inventario';
    const isPrevDisabled = currentPage <= 1;
    const isNextDisabled = currentPage >= totalPages;

    return (
      <div className={`${position === 'top' ? 'border-b' : 'border-t'} border-[var(--color-border)] bg-[var(--color-surface)] p-3 flex items-center justify-between shrink-0`}>
        <span className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-widest">
          Página {currentPage} de {totalPages}
        </span>
        <div className="flex gap-2">
          <button 
            id={prevId}
            aria-disabled={isPrevDisabled}
            tabIndex={0}
            onClick={() => {
              if (isPrevDisabled) return;
              onPageChange(currentPage - 1);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById(nextId)?.focus();
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                e.stopPropagation();
                if (position === 'top') {
                  const btnLimpiar = document.getElementById('btn-limpiar-filtros-inventario');
                  if (btnLimpiar) btnLimpiar.focus();
                  else document.getElementById('filtro-orden-inventario')?.focus();
                }
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                if (position === 'top') {
                  const search = document.getElementById('buscador-global-inventario') as HTMLInputElement | null;
                  if (search) {
                    search.focus();
                    search.select();
                  } else {
                    const btnLimpiar = document.getElementById('btn-limpiar-filtros-inventario');
                    if (btnLimpiar) btnLimpiar.focus();
                    else document.getElementById('filtro-orden-inventario')?.focus();
                  }
                } else {
                  const rows = obtenerFilas();
                  if (rows.length > 0) {
                    const target = rows[rows.length - 1];
                    target.focus();
                    target.scrollIntoView({ block: 'nearest' });
                  } else {
                    const search = document.getElementById('buscador-global-inventario') as HTMLInputElement | null;
                    search?.focus();
                    search?.select();
                  }
                }
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                if (position === 'top') {
                  const rows = obtenerFilas();
                  if (rows.length > 0) {
                    const target = rows[0];
                    target.focus();
                    target.scrollIntoView({ block: 'nearest' });
                  }
                }
              }
            }}
            className={`w-8 h-8 flex items-center justify-center bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-white transition-colors rounded-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] focus:bg-[var(--color-ink)] focus:text-white ${
              isPrevDisabled ? 'opacity-40 cursor-not-allowed' : ''
            }`}
          >
            <ChevronLeft size={16} />
          </button>
          <button 
            id={nextId}
            aria-disabled={isNextDisabled}
            tabIndex={0}
            onClick={() => {
              if (isNextDisabled) return;
              onPageChange(currentPage + 1);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById(prevId)?.focus();
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                e.stopPropagation();
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                if (position === 'top') {
                  const search = document.getElementById('buscador-global-inventario') as HTMLInputElement | null;
                  if (search) {
                    search.focus();
                    search.select();
                  } else {
                    const btnLimpiar = document.getElementById('btn-limpiar-filtros-inventario');
                    if (btnLimpiar) btnLimpiar.focus();
                    else document.getElementById('filtro-orden-inventario')?.focus();
                  }
                } else {
                  const rows = obtenerFilas();
                  if (rows.length > 0) {
                    const target = rows[rows.length - 1];
                    target.focus();
                    target.scrollIntoView({ block: 'nearest' });
                  } else {
                    const search = document.getElementById('buscador-global-inventario') as HTMLInputElement | null;
                    search?.focus();
                    search?.select();
                  }
                }
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                if (position === 'top') {
                  const rows = obtenerFilas();
                  if (rows.length > 0) {
                    const target = rows[0];
                    target.focus();
                    target.scrollIntoView({ block: 'nearest' });
                  }
                }
              }
            }}
            className={`w-8 h-8 flex items-center justify-center bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-white transition-colors rounded-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] focus:bg-[var(--color-ink)] focus:text-white ${
              isNextDisabled ? 'opacity-40 cursor-not-allowed' : ''
            }`}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div id="tabla-productos-inventario" className="border border-[var(--color-border)] flex flex-col bg-[var(--color-surface)] relative min-h-[200px]">
      {loading && (
        <div className="absolute inset-0 bg-white/80 dark:bg-[var(--color-surface)]/80 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-[var(--color-border)] border-t-[var(--color-ink)] animate-spin rounded-full"></div>
            <span className="text-[12px] font-black text-[var(--color-ink)] uppercase tracking-widest font-mono">Cargando...</span>
          </div>
        </div>
      )}

      {/* === CONTROLES DE PAGINACIÓN ARRIBA === */}
      {renderPagination('top')}

      {/* CONTENEDOR CON SCROLL HORIZONTAL (CABECERA + FILAS) — SIN SCROLL VERTICAL INTERNO: baja con el scroll de la página */}
      <div className="w-full overflow-x-auto custom-scrollbar">
        <div className="md:min-w-[960px]">

      {/* CABECERAS DE LA TABLA REESTRUCTURADAS (CON COLUMNA DE IMAGEN) */}
      <div className="hidden md:grid grid-cols-12 bg-[var(--color-ink)] text-white p-4 text-sm font-black uppercase tracking-[0.2em] items-center">
        <div className="col-span-1 text-center">Img</div>
        <div className="col-span-2">Códigos</div>
        <div className="col-span-3">Producto / Categoría</div>
        <div className="col-span-2">Inversión (Costo)</div>
        <div className="col-span-1 text-right">Precio</div>
        <div className="col-span-1 text-center flex items-center justify-center gap-1" title="Stock">
          <ArrowUpDown size={10}/> Stock
        </div>
        <div className="col-span-2 text-center">Acciones</div>
      </div>

      {/* LISTA DE PRODUCTOS */}
      <div>
        {!loading && productos.length === 0 ? (
          <div className="p-12 text-center text-[#94A3B8] font-bold uppercase text-[10px] tracking-widest flex flex-col items-center justify-center gap-2">
            <Search size={32} className="text-[#E2E8F0] mb-2" />
            No se registran productos con esos parámetros.
          </div>
        ) : (
          productos.map((item) => {
            
            // CÁLCULO DE TOTAL DE COMPRA
            const totalCompra = ((item.cost || 0) * (item.quantity || 0)).toFixed(2);

            // === MODO EDICIÓN EN LÍNEA ===
            if (editingId === item.id) {
              return (
                <div key={item.id} className="grid grid-cols-12 items-center p-4 border-b-2 border-[var(--color-ink)] bg-[var(--color-bg-2)] shadow-inner">
                  {/* IMAGEN (NO EDITABLE DESDE AQUÍ) */}
                  <div className="col-span-1 flex justify-center pr-2">
                    {item.imageUrl && (item.imageUrl.startsWith('http') || item.imageUrl.startsWith('data:')) ? (
                      <img 
                        src={item.imageUrl} 
                        alt="img" 
                        className="w-10 h-10 object-cover rounded border border-[var(--color-border)]"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-10 h-10 bg-[var(--color-surface)] rounded border border-[var(--color-border)] flex items-center justify-center text-[var(--color-muted)]" title={item.imageUrl?.startsWith('media') ? 'Formato de App móvil no compatible en web' : 'Sin imagen'}>
                        <ImageIcon size={16}/>
                      </div>
                    )}
                  </div>

                  <div className="col-span-2 flex flex-col gap-1 items-start pr-2">
                    <span className="bg-[var(--color-surface)] px-2 py-1 border border-[var(--color-border)] text-[9px] font-bold text-[var(--color-muted)] rounded-none cursor-not-allowed w-full truncate">
                      {item.code}
                    </span>
                    {item.barcode && (
                      <span className="flex items-center gap-1 text-[8px] font-bold text-[#94A3B8] truncate w-full">
                        <Barcode size={10} /> {item.barcode}
                      </span>
                    )}
                  </div>
                  
                  <div className="col-span-3 pr-2 flex flex-col gap-2">
                    <input 
                      type="text" 
                      value={editForm.name || ''} 
                      onChange={e => setEditForm({...editForm, name: e.target.value.toUpperCase()})}
                      placeholder="NOMBRE PRODUCTO"
                      className="w-full bg-[var(--color-surface)] border-2 border-[#E2E8F0] p-1.5 text-[10px] font-black text-[var(--color-ink)] uppercase outline-none focus:border-[var(--color-success)] transition-colors rounded-none"
                    />
                  </div>

                  <div className="col-span-1 pr-2 flex flex-col gap-2">
                    <input 
                      type="number" 
                      value={editForm.cost || 0} 
                      onChange={e => setEditForm({...editForm, cost: Number(e.target.value)})}
                      className="w-full bg-[var(--color-surface)] border-2 border-[#E2E8F0] p-1 text-[10px] font-bold text-[var(--color-ink)] outline-none focus:border-[var(--color-success)] transition-colors rounded-none"
                      title="Costo U."
                    />
                  </div>

                  <div className="col-span-1 flex items-center justify-end pr-2">
                    <input 
                      type="number" 
                      value={editForm.price || 0} 
                      onChange={e => setEditForm({...editForm, price: Number(e.target.value)})}
                      className="w-full bg-[var(--color-surface)] border-2 border-[#E2E8F0] p-1 text-[10px] font-black text-[var(--color-success)] outline-none focus:border-[var(--color-success)] transition-colors rounded-none text-right"
                      title="Precio"
                    />
                  </div>

                  <div className="col-span-2 text-center flex items-center gap-1 justify-center pr-2">
                    <input 
                      type="number" 
                      value={editForm.minStock || 0} 
                      onChange={e => setEditForm({...editForm, minStock: Number(e.target.value)})}
                      className="w-10 bg-[var(--color-surface)] border-2 border-[#E2E8F0] p-1 text-[10px] font-bold text-[var(--color-ink)] outline-none focus:border-[var(--color-danger)] transition-colors rounded-none text-center"
                      title="Stock Mínimo"
                    />
                    <select 
                      value={editForm.unit || 'UND'}
                      onChange={e => setEditForm({...editForm, unit: e.target.value})}
                      className="flex-1 bg-[var(--color-surface)] border-2 border-[#E2E8F0] p-1 text-[8px] font-bold text-[var(--color-ink)] uppercase outline-none focus:border-[var(--color-success)] transition-colors rounded-none cursor-pointer"
                    >
                      <option value="UND">UND</option>
                      <option value="KG">KG</option>
                      <option value="GR">GR</option>
                      <option value="LT">LT</option>
                      <option value="ML">ML</option>
                      <option value="CONSUMO">CONS</option>
                    </select>
                  </div>

                  <div className="col-span-2 flex items-center justify-end gap-2 pr-4 w-full ml-auto">
  <button 
    onClick={saveEditing} 
    className="bg-[var(--color-success)] text-[var(--color-ink)] p-2 border-2 border-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-[var(--color-success)] transition-colors cursor-pointer rounded-none shadow-[2px_2px_0_0_var(--color-ink)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]" 
    title="Guardar Cambios"
  >
    <Check size={16} />
  </button>
  <button 
    onClick={cancelEditing} 
    className="bg-[var(--color-surface)] text-[var(--color-danger)] p-2 border-2 border-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-white transition-colors cursor-pointer rounded-none shadow-[2px_2px_0_0_var(--color-danger)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]" 
    title="Cancelar Edición"
  >
    <X size={16} />
  </button>
</div>
                </div>
              );
            }

            // === MODO VISTA NORMAL ===
            return (
              <div
                key={item.id}
                data-row="true"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    if (onEditProduct) onEditProduct(item);
                    else startEditing(item);
                  }
                }}
                onClick={() => onEditProduct ? onEditProduct(item) : startEditing(item)}
                className="grid grid-cols-[3rem_minmax(0,1fr)_auto] gap-x-3 gap-y-2 md:gap-0 md:grid-cols-12 items-center p-3 md:p-4 border-b border-[var(--color-border)] hover:bg-[var(--color-bg)] focus:outline-none focus-visible:bg-[var(--color-bg-2)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-ink)] transition-colors group cursor-pointer"
                title="Presione Enter o haga clic para editar"
              >
                
                {/* 0. IMAGEN (BLINDADA CONTRA MEDIA://) */}
                <div className="col-start-1 row-start-1 row-span-2 md:col-start-auto md:row-start-auto md:row-span-1 md:col-span-1 flex items-center justify-center md:pr-2">
                  {item.imageUrl && (item.imageUrl.startsWith('http') || item.imageUrl.startsWith('data:')) ? (
                    <img 
                      src={item.imageUrl} 
                      alt={item.name} 
                      className="w-10 h-10 object-cover rounded-md border border-[var(--color-border)] shadow-sm" 
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-10 h-10 bg-[var(--color-bg-2)] rounded-md border border-[var(--color-border)] flex items-center justify-center text-[var(--color-muted)]" title={item.imageUrl?.startsWith('media') ? 'Formato de App móvil no compatible en web' : 'Sin Imagen'}>
                      <ImageIcon size={18} />
                    </div>
                  )}
                </div>

                {/* 1. CÓDIGOS */}
                <div className="col-start-2 row-start-2 md:col-start-auto md:row-start-auto md:col-span-2 flex flex-col gap-1.5 items-start min-w-0">
                  <span className="bg-[var(--color-bg-2)] px-2 py-1 border border-[var(--color-border)] text-sm font-black text-[var(--color-ink)] rounded-none truncate max-w-full" title={item.code}>
                    {item.code}
                  </span>
                  {item.barcode && (
                    <span className="flex items-center gap-1 text-[10px] font-black text-[#64748B] tracking-wider truncate w-full" title="Código de Escáner">
                      <Barcode size={12} className="text-[#94A3B8]" />
                      {item.barcode}
                    </span>
                  )}
                </div>

                {/* 2. PRODUCTO Y CATEGORÍA VISIBLE */}
                <div className="col-start-2 row-start-1 md:col-start-auto md:row-start-auto md:col-span-3 md:pr-4 flex flex-col gap-1 min-w-0">
                  <p className="font-black text-sm uppercase text-[var(--color-ink)] leading-tight line-clamp-2" title={item.name}>
                    {item.name}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                    <span className="self-start text-[10px] font-black text-white bg-[var(--color-ink)] px-2 py-0.5 tracking-widest rounded-none">
                      {item.category}
                    </span>
                    {item.marca && (
                      <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 border border-slate-300 uppercase" title="Marca">
                        🏷️ {item.marca}
                      </span>
                    )}
                    {item.medida && (
                      <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 border border-teal-200 uppercase" title="Medida">
                        📏 {item.medida}
                      </span>
                    )}
                    {item.ubicacion && (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 border border-amber-200 uppercase" title="Ubicación en tienda">
                        📍 {item.ubicacion}
                      </span>
                    )}
                    {Boolean(item.mesesGarantia && item.mesesGarantia > 0) && (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 border border-emerald-200 uppercase" title="Garantía de fábrica">
                        🛡️ {item.mesesGarantia} {item.mesesGarantia === 1 ? 'mes' : 'meses'}
                      </span>
                    )}
                    {item.controlaSeries && (
                      <span className="text-[10px] font-bold text-indigo-800 bg-indigo-50 px-1.5 py-0.5 border border-indigo-200 uppercase" title="Controla número de serie / IMEI por unidad">
                        🔢 Serie/IMEI
                      </span>
                    )}
                    {item.tieneVariantes && (
                      <span className="text-[10px] font-bold text-fuchsia-800 bg-fuchsia-50 dark:bg-fuchsia-950/40 dark:text-fuchsia-300 px-1.5 py-0.5 border border-fuchsia-200 dark:border-fuchsia-800 uppercase" title={[
                        item.stockBase && item.stockBase > 0 ? `Lote/General: ${item.stockBase} und` : null,
                        ...(item.variantes || []).map(v => `${v.nombre_variante}: ${v.quantity} und`)
                      ].filter(Boolean).join(' | ') || 'Con variantes'}>
                        🏷️ {item.variantes?.length || 0} {item.variantes?.length === 1 ? 'variante' : 'variantes'}
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. INVERSIÓN (COSTO Y TOTAL CLAROS) */}
                <div className="col-start-1 col-span-2 row-start-3 md:col-start-auto md:row-start-auto md:col-span-2 flex flex-row flex-wrap md:flex-col gap-x-4 gap-y-1 md:gap-1 justify-start md:justify-center">
                  <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
                    Costo U: <strong className="text-[var(--color-ink)] text-sm">S/ {(item.cost || 0).toFixed(2)}</strong>
                  </span>
                  <span className="text-xs font-bold text-[var(--color-success)] uppercase tracking-wider">
                    Total: <strong className="text-[var(--color-ink)] text-sm">S/ {totalCompra}</strong>
                  </span>
                </div>

                {/* 4. PRECIO DE VENTA Y TODAS LAS ESCALAS/PRESENTACIONES */}
                <div className="col-start-3 row-start-1 md:col-start-auto md:row-start-auto md:col-span-1 font-black text-right md:pr-2">
                  <div className="text-base md:text-lg text-[var(--color-success)] whitespace-nowrap">
                    S/ {(item.price || 0).toFixed(2)}
                  </div>
                  {item.precioMayorista != null && item.precioMayorista > 0 && (
                    <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 leading-tight mt-0.5 whitespace-nowrap" title="Precio Mayorista">
                      ⭐ May: S/ {item.precioMayorista.toFixed(2)}
                    </div>
                  )}
                  {!!item.preciosCantidad?.length && (
                    <div className="flex flex-col items-end gap-0.5 mt-0.5" title="Precios por cantidad (escalas)">
                      {item.preciosCantidad.map((esc, i) => (
                        <span key={i} className="text-[10px] font-bold text-blue-600 dark:text-blue-400 leading-none whitespace-nowrap bg-blue-50 dark:bg-blue-950/40 px-1 py-0.5 border border-blue-200 dark:border-blue-900">
                          x{esc.desde}+ S/ {Number(esc.precio).toFixed(2)}
                        </span>
                      ))}
                    </div>
                  )}
                  {!!item.presentaciones?.length && (
                    <div className="flex flex-col items-end gap-0.5 mt-0.5" title="Presentaciones">
                      {item.presentaciones.map((pres, i) => (
                        <span key={i} className="text-[10px] font-bold text-purple-600 dark:text-purple-400 leading-none whitespace-nowrap bg-purple-50 dark:bg-purple-950/40 px-1 py-0.5 border border-purple-200 dark:border-purple-900">
                          {pres.unidad} x{pres.factor} S/ {Number(pres.precio).toFixed(2)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 5. STOCK */}
                <div className="col-start-3 row-start-2 md:col-start-auto md:row-start-auto md:col-span-1 text-center flex justify-end md:justify-center">
                  <EtiquetaStock qty={item.quantity} minStock={item.minStock} unit={item.unit} />
                </div>

                {/* 6. ACCIONES + BOTÓN HISTORIAL LOTE */}
                <div className="col-start-3 row-start-3 md:col-start-auto md:row-start-auto md:col-span-2 text-center flex items-center justify-end md:justify-center gap-3">
                  <button
                    className="text-[#94A3B8] hover:text-[#3B82F6] focus:text-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] p-1 transition-colors cursor-pointer"
                    title="Historial de Lotes / Movimientos"
                    onClick={(e) => { e.stopPropagation(); onViewHistory ? onViewHistory(item) : alert(`ABRIENDO HISTORIAL DE LOTES PARA: ${item.code}`); }}
                  >
                    <History size={16} />
                  </button>
                  {onEtiqueta && (
                    <button
                      data-accion="etiqueta"
                      className="text-[#94A3B8] hover:text-[var(--color-warning)] focus:text-[var(--color-warning)] focus:outline-none focus:ring-2 focus:ring-[var(--color-warning)] p-1 transition-colors cursor-pointer"
                      title="Imprimir etiquetas (precio / código de barras)"
                      onClick={(e) => { e.stopPropagation(); onEtiqueta(item); }}
                    >
                      <Tag size={16} />
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); onEditProduct ? onEditProduct(item) : startEditing(item); }}
                    className="text-[#94A3B8] hover:text-[var(--color-success)] focus:text-[var(--color-success)] focus:outline-none focus:ring-2 focus:ring-[var(--color-success)] p-1 transition-colors cursor-pointer"
                    title="Editar Producto"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!puedeEliminar) { avisarSinPermiso('eliminar productos'); return; }
                      if (await confirmar(`⚠️ ALERTA DE INTEGRIDAD GEOMÉTRICA\n\nEstá a punto de eliminar el producto:\n"${item.name}"\n\n🚨 ATENCIÓN: Al borrar este producto, TODOS LOS LOTES asociados a él serán eliminados automáticamente para no romper la contabilidad del sistema.\n\n¿Confirma la eliminación del producto y de todos sus lotes?`)) {
                        if (onDeleteProduct) onDeleteProduct(item);
                      }
                    }}
                    className="text-[#94A3B8] hover:text-red-500 focus:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 p-1 transition-colors cursor-pointer"
                    title="Eliminar del Sistema"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

              </div>
            );
          })
        )}
      </div>

        </div>
      </div>

      {/* === CONTROLES DE PAGINACIÓN ABAJO === */}
      {renderPagination('bottom')}

    </div>
  );
};