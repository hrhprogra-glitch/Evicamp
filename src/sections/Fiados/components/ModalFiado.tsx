import React, { useState, useEffect } from 'react';
import { X, Save, UserPlus, Package, Search, Plus, Trash2, ChevronDown } from 'lucide-react';
import { supabase } from '../../../db/supabase';
import { formatearCantidad } from '../../../utils/formato';
import type { Fiado, FiadoDetalle, Cliente } from '../types';
import type { Product } from '../../Inventario/types';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { clicConTeclado } from '../../../utils/clicConTeclado';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (fiado: Partial<Fiado>) => void;
  fiadoAEditar?: Fiado | null;
  clientes: Cliente[];
  productos: Product[]; // Recibe el inventario
}

export const ModalFiado: React.FC<Props> = ({ isOpen, onClose, onSave, fiadoAEditar, clientes, productos }) => {
  useCerrarConEscape(isOpen, onClose); // Escape (o "Atrás" del control de TV) cierra la ventana
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string>('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [detalles, setDetalles] = useState<FiadoDetalle[]>([]);
  const [searchProd, setSearchProd] = useState('');
  
  // Nuevos estados para el buscador de clientes
  const [searchCliente, setSearchCliente] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  // Evita que un doble clic (o doble toque) en "Confirmar" dispare handleSave dos veces
  // y cree dos fiados/ventas duplicadas con doble descuento de stock.
  const [isSaving, setIsSaving] = useState(false);

  // Sincronizar datos al abrir
  useEffect(() => {
    if (isOpen) {
      if (fiadoAEditar) {
        setClienteSeleccionado(fiadoAEditar.clienteNombre);
        setSearchCliente(''); // Limpiar búsqueda
        setFechaVencimiento(fiadoAEditar.fechaVencimiento ? fiadoAEditar.fechaVencimiento.split('T')[0] : '');
        setDetalles(fiadoAEditar.detalles || []);
      } else {
        setClienteSeleccionado('');
        setSearchCliente(''); // Limpiar búsqueda
        setFechaVencimiento('');
        setDetalles([]);
      }
      setSearchProd('');
      setIsDropdownOpen(false); // Asegurar que el menú inicie cerrado
    }
  }, [isOpen, fiadoAEditar]);

  if (!isOpen) return null;

  // LÓGICA DE INVENTARIO: Buscar y Agregar
  // Añadimos p.name ? para asegurarnos de que el producto tiene nombre antes de buscar
  // 🔥 FILTRO DE SEGURIDAD: Solo mostramos productos que tengan stock físico
  const prodFiltrados = searchProd.trim() === '' ? [] : productos.filter(p => {
    if (!p.name || p.quantity <= 0) return false; // <--- Solo productos con stock
    const q = searchProd.toLowerCase();
    return p.name.toLowerCase().includes(q) ||
      (p.code || '').toLowerCase().includes(q) ||
      (p.barcode || '').toLowerCase().includes(q);
  }).slice(0, 5);

  const agregarProducto = (prod: Product) => {
    // 🚫 BLOQUEO DE SEGURIDAD: Evitar agregar si no hay stock
    if (prod.quantity <= 0) {
      alert(`⚠️ PRODUCTO AGOTADO\n\nNo puedes fiar "${prod.name}" porque no hay existencias en el inventario.`);
      return;
    }

    const existe = detalles.find(d => d.productoId === prod.id);
    if (existe) {
      // Validar si al sumar 1 excedemos el stock
      if (Number(existe.qty) + 1 > prod.quantity) {
        alert(`⚠️ LÍMITE DE STOCK\n\nSolo tienes ${prod.quantity} unidades de "${prod.name}".`);
        return;
      }
      setDetalles(detalles.map(d => d.productoId === prod.id ? { ...d, qty: Number(d.qty) + 1, subtotal: (Number(d.qty) + 1) * d.price } : d));
    } else {
      const esConsumo = prod.control_type === 'CONSUMO' || 
                        prod.control_type === 'SERVICE' || 
                        (prod as any).unit === 'CONSUMO' ||
                        prod.category?.toUpperCase() === 'SERVICIOS';

      setDetalles([...detalles, { 
        productoId: prod.id, 
        name: prod.name, 
        qty: 1, 
        price: prod.price, 
        subtotal: prod.price,
        control_type: esConsumo ? 'CONSUMO' : prod.control_type 
      }]);
    }
    setSearchProd('');
  };

  // LÓGICA 1: Digitar Cantidad/Kilos -> Calcula Precio
  const updateQty = (idProd: string, newQty: any) => {
    const prodOriginal = productos.find(p => p.id === idProd); // Buscamos el stock real

    setDetalles(detalles.map(d => {
      if (d.productoId === idProd) {
        let numericQty = Number(newQty);
        if (numericQty < 0) return d;

        // 🚫 BLOQUEO DE SEGURIDAD: Validar contra el stock real
        if (prodOriginal && numericQty > prodOriginal.quantity) {
          alert(`⚠️ STOCK INSUFICIENTE\n\nSolo tienes ${prodOriginal.quantity} disponibles.`);
          return d; // No actualiza si se pasa
        }

        if (d.control_type !== 'WEIGHT' && newQty.toString().includes('.')) {
          return d; 
        }

        return { ...d, qty: newQty, subtotal: numericQty * d.price };
      }
      return d;
    }));
  };

  // LÓGICA 2: Digitar Precio Directo -> Calcula Kilos (O acepta el total si es CONSUMO)
  const updateSubtotalDirecto = (idProd: string, newSubtotal: any) => {
    setDetalles(detalles.map(d => {
      if (d.productoId === idProd) {
        const numericSub = Number(newSubtotal);
        if (numericSub < 0) return d;
        
        // REGLA PARA CONSUMO: La cantidad siempre es 1, solo cambia el dinero
        if (d.control_type === 'CONSUMO' || d.control_type === 'SERVICE') {
          return { 
            ...d, 
            qty: 1, 
            subtotal: newSubtotal 
          };
        }

        // Fórmula de mercado para KILOS: Peso = Dinero Pagado / Precio por Kilo
        const calculatedQty = numericSub / d.price;
        
        return { 
          ...d, 
          qty: newSubtotal === '' ? '' : Number(calculatedQty.toFixed(3)), 
          subtotal: newSubtotal 
        };
      }
      return d;
    }));
  };

  const removeProd = (idProd: string) => {
    setDetalles(detalles.filter(d => d.productoId !== idProd));
  };

  // CÁLCULO BLINDADO: Fuerza la conversión a número antes de sumar
  const totalCalculado = detalles.reduce((acc, d) => acc + Number(d.subtotal || 0), 0);

  const handleSave = async () => {
    if (isSaving) return;
    if (!clienteSeleccionado) return alert('Selecciona un cliente.');
    if (detalles.length === 0) return alert('Agrega al menos un producto.');
    if (!fechaVencimiento) return alert('Selecciona una fecha de vencimiento.');

    const cli = clientes.find(c => c.nombre === clienteSeleccionado);

    setIsSaving(true);
    try {
      if (fiadoAEditar) {
        // MODO EDICIÓN: Solo permite modificar la fecha de vencimiento
        const { error } = await supabase.from('fiados').update({
          expected_pay_date: fechaVencimiento
        }).eq('id', fiadoAEditar.id);
        
        if (error) throw error;
        alert('✅ Fecha de vencimiento actualizada correctamente.');
      } else {
        // MODO NUEVO FIADO
        const idVenta = Date.now(); // 🔥 Generamos ID único para Reportes
        const idFiado = idVenta + 1; // 🔥 Generamos ID único para el Fiado

        // === REGISTRO DE VENTA Y FIADO (inserciones directas) ===
        // Nota técnica: esto reemplaza una llamada a supabase.rpc('fn_register_sale', ...) que
        // impedía guardar CUALQUIER fiado nuevo porque esa función no existe en la base de
        // datos. El detalle de productos sigue descontando el stock y el lote correspondiente
        // automáticamente: existe un trigger en la BD (fn_reduce_stock_from_sales) que se
        // dispara al insertar en sale_details.
        const { error: saleError } = await supabase.from('sales').insert([{
          id: idVenta,
          total: totalCalculado,
          // 'FIADO' (igual que el Punto de Venta): Finanzas y el Mini Reporte excluyen de la caja
          // las ventas con este tipo, porque no entró dinero al momento de la venta.
          payment_type: 'FIADO',
          amount_cash: 0,
          amount_yape: 0,
          amount_card: 0,
          amount_credit: totalCalculado,
          taxable_amount: 0,
          igv_amount: 0,
          total_exempt: totalCalculado,
          sunat_status: 'ACEPTADO',
          is_synced: 1,
          created_at: new Date().toISOString()
        }]);

        if (saleError) throw new Error('Error al registrar la venta: ' + saleError.message);

        const { error: fiadoError } = await supabase.from('fiados').insert([{
          id: idFiado,
          sale_id: idVenta,
          customer_id: cli?.id ? Number(cli.id) : null,
          customer_name: clienteSeleccionado,
          amount: totalCalculado,
          date_given: new Date().toISOString(),
          expected_pay_date: fechaVencimiento,
          status: 'PENDIENTE',
          paid_amount: 0,
          is_synced: 1
        }]);

        if (fiadoError) throw new Error('La venta se registró, pero no se pudo registrar la deuda (fiado): ' + fiadoError.message);

        const p_details = detalles.map(d => ({
          sale_id: idVenta,
          product_id: d.productoId,
          product_name: d.name,
          quantity: Number(d.qty),
          price_at_moment: d.price,
          subtotal: Number(d.subtotal),
          is_synced: 1
        }));

        const { error: detailError } = await supabase.from('sale_details').insert(p_details);
        if (detailError) throw new Error('La venta y la deuda se registraron, pero no se pudo guardar el detalle de productos (el stock no se descontó): ' + detailError.message);

        alert('✅ Fiado guardado, venta registrada e inventario descontado.');
      }
      
      onSave({}); // Refrescar la interfaz
    } catch (e: any) {
      alert('Error técnico en BD: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const isEdit = !!fiadoAEditar;

  return (
    <div className="fixed inset-0 bg-[var(--color-ink)]/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-2 sm:p-4 font-mono">
      <div className="bg-white w-full max-w-4xl border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] flex flex-col h-[calc(var(--alto-pantalla)*0.94)] sm:h-[calc(var(--alto-pantalla)*0.85)]">
        
        <div className="bg-[var(--color-ink)] text-white px-4 sm:px-6 py-4 flex justify-between items-center gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <UserPlus className="text-[var(--color-warning)]" size={20} />
            <h2 className="text-sm font-black uppercase tracking-widest text-white">
              {isEdit ? 'Renegociar Fecha de Vencimiento' : 'Nueva Deuda desde Inventario'}
            </h2>
          </div>
          <button onClick={onClose} className="hover:text-[var(--color-danger)] transition-colors"><X size={20} /></button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-y-auto md:overflow-visible">
          {/* PANEL IZQUIERDO: CLIENTE Y PRODUCTOS */}
          <div className="w-full md:w-1/2 p-4 sm:p-6 bg-[var(--color-bg)] border-b-2 md:border-b-0 md:border-r-2 border-[var(--color-border)] flex flex-col gap-4 shrink-0 md:shrink md:overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            
            <div className="space-y-1 relative">
              <label className="text-[12px] font-black uppercase text-[var(--color-muted)]">Seleccionar Cliente *</label>
              
              <div 
                className={`flex items-center justify-between border-2 border-[var(--color-border)] bg-white p-2 cursor-text transition-colors rounded-none ${isEdit ? 'bg-[var(--color-bg)] cursor-not-allowed opacity-70' : 'focus-within:border-[var(--color-warning)]'}`}
                {...clicConTeclado(() => !isEdit && setIsDropdownOpen(true))}
              >
                <input
                  type="text"
                  placeholder="-- BUSCAR / ELEGIR CLIENTE --"
                  value={isDropdownOpen ? searchCliente : clienteSeleccionado}
                  onChange={(e) => {
                    setSearchCliente(e.target.value);
                    setClienteSeleccionado(''); // Al tipear, borramos la selección rígida para forzar a buscar
                    setIsDropdownOpen(true);
                  }}
                  disabled={isEdit}
                  className="w-full text-xs font-black uppercase outline-none bg-transparent disabled:text-[var(--color-subtle)]"
                />
                <button 
                  type="button"
                  disabled={isEdit}
                  onClick={(e) => { e.stopPropagation(); if (!isEdit) setIsDropdownOpen(!isDropdownOpen); }}
                  className="ml-2 text-[var(--color-muted)] hover:text-[var(--color-ink)] cursor-pointer disabled:cursor-not-allowed"
                >
                  {isDropdownOpen ? <X size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>

              {/* LISTA DESPLEGABLE CON FILTRO */}
              {isDropdownOpen && !isEdit && (
                <div className="absolute z-50 top-[100%] left-0 w-full mt-1 bg-white border-2 border-[var(--color-ink)] shadow-[4px_4px_0_0_var(--color-ink)] max-h-48 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] rounded-none">
                  {clientes.filter(c => c.nombre.toLowerCase().includes(searchCliente.toLowerCase())).length === 0 ? (
                    <div className="p-3 text-xs font-bold text-[var(--color-muted)] uppercase text-center bg-[var(--color-bg)]">
                      NO SE ENCONTRARON CLIENTES
                    </div>
                  ) : (
                    clientes
                      .filter(c => c.nombre.toLowerCase().includes(searchCliente.toLowerCase()))
                      .map(c => (
                        <div
                          key={c.id}
                          className="p-3 text-xs font-black uppercase text-[var(--color-ink)] hover:bg-[var(--color-warning)] hover:text-white cursor-pointer border-b border-[var(--color-border)] last:border-0 transition-colors"
                          {...clicConTeclado(() => {
                            setClienteSeleccionado(c.nombre);
                            setSearchCliente('');
                            setIsDropdownOpen(false);
                          })}
                        >
                          {c.nombre} <span className="text-[12px] font-bold text-inherit opacity-70 ml-2">{c.dni ? `(DNI: ${c.dni})` : ''}</span>
                        </div>
                      ))
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[12px] font-black uppercase text-[var(--color-warning)]">Fecha Límite Pago *</label>
              <input type="date" value={fechaVencimiento} onChange={e => setFechaVencimiento(e.target.value)} className="w-full border-2 border-[var(--color-border)] p-2 text-xs font-black focus:border-[var(--color-warning)] outline-none" />
            </div>

            {/* BUSCADOR DE INVENTARIO (OCULTO EN EDICIÓN) */}
            {!isEdit && (
              <div className="mt-4 border-t-2 border-dashed border-[var(--color-border)] pt-4">
                <label className="text-[12px] font-black uppercase text-[var(--color-muted)] flex items-center gap-2 mb-2"><Package size={14}/> Buscar en Inventario</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-subtle)]" />
                  <input
                    type="text"
                    value={searchProd}
                    onChange={e => setSearchProd(e.target.value)}
                    onKeyDown={e => {
                      // 📡 SOPORTE DE ESCÁNER: el lector escribe el código y envía "Enter" automáticamente.
                      if (e.key === 'Enter' && prodFiltrados.length > 0) {
                        e.preventDefault();
                        agregarProducto(prodFiltrados[0]);
                        setSearchProd('');
                      }
                    }}
                    placeholder="ESCANEA O ESCRIBE UN PRODUCTO..."
                    className="w-full bg-white border-2 border-[var(--color-border)] p-2 pl-9 text-xs font-black uppercase outline-none focus:border-[var(--color-info)]"
                  />
                </div>
                {prodFiltrados.length > 0 && (
                  <div className="mt-1 bg-white border-2 border-[var(--color-border)] max-h-40 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {prodFiltrados.map(p => (
                      <div 
                        key={p.id} 
                        {...clicConTeclado(() => agregarProducto(p))}
                        className="flex justify-between items-center p-2 border-b border-[var(--color-border)] hover:bg-[var(--color-bg)] cursor-pointer group"
                      >
                        <div>
                          <p className="text-xs font-black text-[var(--color-ink)] uppercase">{p.name}</p>
                          <p className="text-[12px] font-bold text-[var(--color-muted)]">Stock: {formatearCantidad(p.quantity, p.unit)} | S/ {p.price}</p>
                        </div>
                        <div className="p-1 bg-[var(--color-ink)] text-white group-hover:bg-[var(--color-info)] transition-colors"><Plus size={14}/></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* PANEL DERECHO: CARRITO / DETALLE DE LA DEUDA */}
          <div className="w-full md:w-1/2 p-4 sm:p-6 bg-white flex flex-col min-h-[360px] md:min-h-0">
            <div className="flex flex-col mb-4 border-b-2 border-[var(--color-border)] pb-2">
              <h3 className="text-[12px] font-black uppercase tracking-widest text-[var(--color-ink)]">
                {isEdit ? 'Detalle de la deuda (Solo Lectura)' : 'Productos a fiar'}
              </h3>
              {isEdit && <span className="text-[12px] font-black tracking-widest text-[var(--color-danger)] uppercase mt-1">⚠️ En modo edición solo se puede modificar la fecha. Los productos están bloqueados por seguridad contable.</span>}
            </div>
            
            <div className="flex-1 overflow-y-auto flex flex-col gap-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {detalles.length === 0 ? (
                <p className="text-center text-[var(--color-subtle)] font-bold text-xs mt-10">No hay productos agregados.</p>
              ) : (
                detalles.map(d => (
                  <div key={d.productoId} className="flex justify-between items-center border-2 border-[var(--color-border)] p-2">
                    <div className="flex-1">
                      <p className="text-xs font-black text-[var(--color-ink)] uppercase leading-tight line-clamp-1">{d.name}</p>
                      <p className="text-[12px] font-bold text-[var(--color-muted)]">S/ {d.price.toFixed(2)} c/u</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      
                      {/* CAJA DE CANTIDAD / KILOS / CONSUMO */}
                      <div className="flex flex-col items-center border-2 border-[var(--color-border)] overflow-hidden">
                        {isEdit ? (
                          <span className="w-16 p-1 text-center text-xs font-black bg-[var(--color-bg)] text-[var(--color-subtle)]">{d.qty}</span>
                        ) : d.control_type === 'CONSUMO' || d.control_type === 'SERVICE' ? (
                          <span className="w-16 p-1 text-center text-xs font-black bg-[var(--color-bg)] text-[var(--color-subtle)] cursor-not-allowed">1</span>
                        ) : (
                          <input 
                            type="number" 
                            step={d.control_type === 'WEIGHT' ? "any" : "1"}
                            value={d.qty} 
                            onChange={e => updateQty(d.productoId, e.target.value)} 
                            className="w-16 p-1 text-center text-xs font-black outline-none bg-transparent placeholder:text-[var(--color-line-light)]" 
                            min={0} 
                            placeholder="0"
                            title={d.control_type === 'WEIGHT' ? "Ingresar Kilos" : "Ingresar Unidades"}
                          />
                        )}
                        {/* Indicador visual técnico de medida */}
                        {d.control_type === 'WEIGHT' ? (
                          <div className="bg-[var(--color-ink)] text-white text-[11px] font-black w-full text-center tracking-widest py-0.5 uppercase">Kilo</div>
                        ) : d.control_type === 'CONSUMO' || d.control_type === 'SERVICE' ? (
                          <div className="bg-[var(--color-warning)] text-[var(--color-ink)] text-[11px] font-black w-full text-center tracking-widest py-0.5 uppercase">Serv</div>
                        ) : (
                          <div className="bg-[var(--color-border)] text-[var(--color-muted)] text-[11px] font-black w-full text-center tracking-widest py-0.5 uppercase">Und</div>
                        )}
                      </div>
                      
                      {/* CAJA DE SUBTOTAL (Texto Fijo para UND, Input Editable para KILOS y CONSUMOS) */}
                      {!isEdit && (d.control_type === 'WEIGHT' || d.control_type === 'CONSUMO' || d.control_type === 'SERVICE') ? (
                        <div className="flex items-center border-b-2 border-[var(--color-ink)] w-20 justify-end focus-within:border-[var(--color-warning)] transition-colors group">
                          <span className="text-[12px] font-black text-[var(--color-ink)] mr-1">S/</span>
                          <input 
                            type="number"
                            step="any"
                            value={d.subtotal}
                            onChange={e => updateSubtotalDirecto(d.productoId, e.target.value)}
                            className="w-full text-right text-xs font-black text-[var(--color-warning)] outline-none bg-transparent placeholder:text-[var(--color-line-light)]"
                            placeholder="0.00"
                            title={d.control_type === 'WEIGHT' ? "Ingresar precio directo (Calcula Kilos)" : "Ingresar precio del servicio"}
                          />
                        </div>
                      ) : (
                        <span className="text-xs font-black text-[var(--color-ink)] w-20 text-right">
                          S/ {Number(d.subtotal).toFixed(2)}
                        </span>
                      )}

                      {!isEdit && (
                        <button onClick={() => removeProd(d.productoId)} className="text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)] p-1.5 transition-colors rounded-none border border-transparent hover:border-[var(--color-danger-bg)]">
                          <Trash2 size={16}/>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-4 border-t-2 border-[var(--color-border)]">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-black uppercase">Total Deuda:</span>
                <span className="text-2xl font-black text-[var(--color-warning)]">S/ {totalCalculado.toFixed(2)}</span>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={onClose} disabled={isSaving} className="px-4 py-3 border-2 border-[var(--color-border)] text-[var(--color-muted)] text-[12px] font-black uppercase hover:border-[var(--color-ink)] disabled:opacity-50">Cancelar</button>
                <button onClick={handleSave} disabled={isSaving} className="flex-1 py-3 bg-[var(--color-warning)] text-[var(--color-ink)] border-2 border-[var(--color-ink)] text-xs font-black uppercase flex items-center justify-center gap-2 shadow-[2px_2px_0_0_var(--color-ink)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-50 disabled:pointer-events-none">
                  <Save size={16}/> {isSaving ? 'Guardando...' : (isEdit ? 'Guardar Nueva Fecha' : 'Confirmar y Restar Inventario')}
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};