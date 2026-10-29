import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FileText, Search, Printer, MessageCircle, ShoppingBag, X, Calendar, User, Phone, CheckCircle2, AlertTriangle, ArrowUpDown } from 'lucide-react';
import { supabase } from '../../../db/supabase';
import type { Cotizacion, DetalleCotizacion } from '../types';
import { traerTodo } from '../../../utils/traerTodo';
import { coincideBusqueda } from '../../../utils/busqueda';

interface Props {
  onNavigatePOS?: () => void;
}

export const PestanaCotizaciones: React.FC<Props> = ({ onNavigatePOS }) => {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'TODAS' | 'VIGENTE' | 'CONVERTIDA' | 'VENCIDA' | 'ANULADA'>('TODAS');
  const [cotiSeleccionada, setCotiSeleccionada] = useState<Cotizacion | null>(null);
  const [detallesModal, setDetallesModal] = useState<DetalleCotizacion[]>([]);
  const [cargandoDetalles, setCargandoDetalles] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Cargar cotizaciones
  const cargarCotizaciones = async () => {
    setLoading(true);
    try {
      const { data, error } = await traerTodo(() =>
        supabase
          .from('cotizaciones')
          .select('*')
          .order('id', { ascending: false })
      );

      if (error) throw error;

      if (data) {
        // Verificar automáticamente vencidas
        const ahora = new Date();
        const procesadas: Cotizacion[] = data.map((c: any) => {
          let estado = c.estado;
          if (estado === 'VIGENTE' && c.fecha_vencimiento) {
            const vence = new Date(c.fecha_vencimiento);
            if (ahora > vence) {
              estado = 'VENCIDA';
            }
          }
          return {
            id: c.id,
            numero: c.numero,
            cliente_id: c.cliente_id,
            cliente_nombre: c.cliente_nombre,
            cliente_documento: c.cliente_documento,
            cliente_telefono: c.cliente_telefono,
            fecha_emision: c.fecha_emision,
            fecha_vencimiento: c.fecha_vencimiento,
            estado,
            total: Number(c.total) || 0,
            observaciones: c.observaciones,
            sale_id: c.sale_id,
            vendedor: c.vendedor
          };
        });
        setCotizaciones(procesadas);
      }
    } catch (err) {
      console.error('Error cargando cotizaciones:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarCotizaciones();
  }, []);

  // Filtrado
  const cotizacionesFiltradas = useMemo(() => {
    return cotizaciones.filter((c) => {
      const coincideTexto = coincideBusqueda([c.numero, c.cliente_nombre, c.cliente_documento, c.cliente_telefono], search);
      const coincideEst = filtroEstado === 'TODAS' || c.estado === filtroEstado;
      return coincideTexto && coincideEst;
    });
  }, [cotizaciones, search, filtroEstado]);

  // Selector con teclado
  useEffect(() => {
    setSelectedIndex(0);
  }, [search, filtroEstado]);

  const cerrarDetalle = () => {
    setCotiSeleccionada(null);
    setTimeout(() => {
      const fila = document.getElementById(`coti-row-${selectedIndex}`) || document.getElementById('coti-row-0');
      if (fila) {
        fila.focus();
        fila.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        document.getElementById('buscador-cotizaciones')?.focus();
      }
    }, 60);
  };

  const abrirDetalle = async (coti: Cotizacion, index?: number) => {
    if (typeof index === 'number') setSelectedIndex(index);
    setCotiSeleccionada(coti);
    setCargandoDetalles(true);
    try {
      const { data, error } = await supabase
        .from('cotizacion_detalles')
        .select('*')
        .eq('cotizacion_id', coti.id)
        .order('id');

      if (!error && data) {
        setDetallesModal(data.map((d: any) => ({
          id: d.id,
          cotizacion_id: d.cotizacion_id,
          product_id: d.product_id,
          product_name: d.product_name,
          quantity: Number(d.quantity),
          price: Number(d.price),
          subtotal: Number(d.subtotal),
          es_mayorista: d.es_mayorista
        })));
      }
    } catch (err) {
      console.error('Error cargando detalles de cotización:', err);
    } finally {
      setCargandoDetalles(false);
    }
  };

  const ESTADOS_COTI = ['TODAS', 'VIGENTE', 'CONVERTIDA', 'VENCIDA', 'ANULADA'] as const;

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (cotizacionesFiltradas.length > 0) {
        const targetIdx = Math.min(selectedIndex, cotizacionesFiltradas.length - 1);
        const row = document.getElementById(`coti-row-${targetIdx}`) || document.getElementById('coti-row-0');
        row?.focus();
        row?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    } else if (e.key === 'ArrowRight') {
      const input = e.currentTarget;
      if (input.selectionStart === input.value.length) {
        e.preventDefault();
        document.getElementById(`btn-filtro-coti-${filtroEstado}`)?.focus();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (cotizacionesFiltradas.length > 0) {
        const targetIdx = Math.min(selectedIndex, cotizacionesFiltradas.length - 1);
        const row = document.getElementById(`coti-row-${targetIdx}`) || document.getElementById('coti-row-0');
        row?.focus();
        row?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  };

  const handleFiltroKeyDown = (e: React.KeyboardEvent, index: number, est: typeof ESTADOS_COTI[number]) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (index === 0) {
        document.getElementById('buscador-cotizaciones')?.focus();
      } else {
        document.getElementById(`btn-filtro-coti-${ESTADOS_COTI[index - 1]}`)?.focus();
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (index < ESTADOS_COTI.length - 1) {
        document.getElementById(`btn-filtro-coti-${ESTADOS_COTI[index + 1]}`)?.focus();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (cotizacionesFiltradas.length > 0) {
        const targetIdx = Math.min(selectedIndex, cotizacionesFiltradas.length - 1);
        const row = document.getElementById(`coti-row-${targetIdx}`) || document.getElementById('coti-row-0');
        row?.focus();
        row?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      document.getElementById('tab-clientes-cotizaciones')?.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setFiltroEstado(est);
    }
  };

  const handleRowKeyDown = (e: React.KeyboardEvent, idx: number, coti: Cotizacion) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (idx < cotizacionesFiltradas.length - 1) {
        setSelectedIndex(idx + 1);
        const next = document.getElementById(`coti-row-${idx + 1}`);
        next?.focus();
        next?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (idx > 0) {
        setSelectedIndex(idx - 1);
        const prev = document.getElementById(`coti-row-${idx - 1}`);
        prev?.focus();
        prev?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        document.getElementById('buscador-cotizaciones')?.focus();
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const btn = document.getElementById(`btn-detalle-coti-${idx}`);
      btn?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      document.getElementById(`btn-filtro-coti-${filtroEstado}`)?.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      abrirDetalle(coti, idx);
    }
  };

  const handleBtnDetalleKeyDown = (e: React.KeyboardEvent, idx: number, coti: Cotizacion) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      document.getElementById(`coti-row-${idx}`)?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (idx < cotizacionesFiltradas.length - 1) {
        setSelectedIndex(idx + 1);
        const nextBtn = document.getElementById(`btn-detalle-coti-${idx + 1}`);
        if (nextBtn) {
          nextBtn.focus();
        } else {
          document.getElementById(`coti-row-${idx + 1}`)?.focus();
        }
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (idx > 0) {
        setSelectedIndex(idx - 1);
        const prevBtn = document.getElementById(`btn-detalle-coti-${idx - 1}`);
        if (prevBtn) {
          prevBtn.focus();
        } else {
          document.getElementById(`coti-row-${idx - 1}`)?.focus();
        }
      } else {
        document.getElementById('buscador-cotizaciones')?.focus();
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      abrirDetalle(coti, idx);
    }
  };

  // Imán de foco y oyentes globales para PestanaCotizaciones
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (cotiSeleccionada || document.querySelector('[role="dialog"]')) {
        if (e.key === 'Escape' && cotiSeleccionada) {
          e.preventDefault();
          cerrarDetalle();
        }
        return;
      }

      const sidebar = document.getElementById('evicamp-sidebar');
      if (sidebar?.getAttribute('data-sidebar-open') === 'true') return;

      const active = document.activeElement as HTMLElement | null;
      const activeTag = active?.tagName;

      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA' && activeTag !== 'SELECT') {
          const searchInput = document.getElementById('buscador-cotizaciones') as HTMLInputElement | null;
          if (searchInput) {
            searchInput.focus();
          }
        }
      }
    };

    const enforceFocus = () => {
      if (cotiSeleccionada || document.querySelector('[role="dialog"]')) return;
      const sidebar = document.getElementById('evicamp-sidebar');
      if (sidebar?.getAttribute('data-sidebar-open') === 'true') return;

      const active = document.activeElement;
      const activeTag = active?.tagName;
      if (
        activeTag === 'INPUT' ||
        activeTag === 'TEXTAREA' ||
        activeTag === 'BUTTON' ||
        activeTag === 'SELECT' ||
        activeTag === 'A' ||
        active?.closest('[role="button"]') ||
        active?.hasAttribute('data-row')
      ) {
        return;
      }

      const row = document.getElementById(`coti-row-${selectedIndex}`) || document.getElementById('coti-row-0');
      if (row) {
        row.focus();
      } else {
        const searchInput = document.getElementById('buscador-cotizaciones') as HTMLInputElement | null;
        if (searchInput) {
          searchInput.focus();
        }
      }
    };

    const handleWindowFocus = () => setTimeout(enforceFocus, 50);
    const handleGlobalClick = () => setTimeout(enforceFocus, 50);

    setTimeout(enforceFocus, 100);

    window.addEventListener('keydown', handleGlobalKeyDown);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('click', handleGlobalClick);

    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('click', handleGlobalClick);
    };
  }, [cotiSeleccionada, selectedIndex, cotizacionesFiltradas.length]);

  const handleConvertirEnVenta = async (coti: Cotizacion) => {
    if (coti.estado === 'CONVERTIDA') {
      alert('Esta cotización ya fue convertida en venta anteriormente.');
      return;
    }
    if (coti.estado === 'ANULADA') {
      alert('No se puede convertir una cotización anulada.');
      return;
    }

    // Cargar detalles si aún no están en memoria
    let items = detallesModal;
    if (items.length === 0) {
      const { data } = await supabase
        .from('cotizacion_detalles')
        .select('*')
        .eq('cotizacion_id', coti.id);
      if (data) {
        items = data.map((d: any) => ({
          id: d.id,
          cotizacion_id: d.cotizacion_id,
          product_id: d.product_id,
          product_name: d.product_name,
          quantity: Number(d.quantity),
          price: Number(d.price),
          subtotal: Number(d.subtotal),
          es_mayorista: d.es_mayorista
        }));
      }
    }

    if (items.length === 0) {
      alert('La cotización no tiene productos.');
      return;
    }

    // Convertir a CartItem para la caja
    const carritoPOS = items.map((it) => ({
      id: String(it.product_id || it.id),
      name: it.product_name,
      price: it.price,
      cost: 0,
      quantity: 9999, // se validará con el stock real al entrar a caja
      minStock: 0,
      code: 'PROD',
      barcode: '',
      category: 'GENERAL',
      unit: 'UND',
      cartQuantity: it.quantity,
      subtotal: it.subtotal,
      esMayoristaAplicado: it.es_mayorista
    }));

    // Guardar en almacenamiento de la caja
    localStorage.setItem('evicamp_cart', JSON.stringify(carritoPOS));

    // Si tiene cliente asociado
    if (coti.cliente_nombre) {
      const clienteObj = {
        id: coti.cliente_id || `CLI-${Date.now()}`,
        nombre: coti.cliente_nombre,
        dni: coti.cliente_documento || '',
        telefono: coti.cliente_telefono || ''
      };
      localStorage.setItem('evicamp_cliente_pos', JSON.stringify(clienteObj));
    }

    // Registrar ID de la cotización para marcarla CONVERTIDA cuando se cobre la venta
    sessionStorage.setItem('evicamp_coti_activa', String(coti.id));

    setCotiSeleccionada(null);

    // Navegar a la caja
    if (onNavigatePOS) {
      onNavigatePOS();
    } else {
      window.location.hash = '#pos';
      window.location.reload();
    }
  };

  const handleAnular = async (coti: Cotizacion) => {
    if (!confirm(`¿Está seguro de anular la cotización ${coti.numero}?`)) return;
    try {
      const { error } = await supabase
        .from('cotizaciones')
        .update({ estado: 'ANULADA' })
        .eq('id', coti.id);

      if (error) throw error;
      setCotizaciones((prev) =>
        prev.map((c) => (c.id === coti.id ? { ...c, estado: 'ANULADA' } : c))
      );
      if (cotiSeleccionada?.id === coti.id) {
        setCotiSeleccionada({ ...cotiSeleccionada, estado: 'ANULADA' });
      }
    } catch (err) {
      console.error('Error anulando cotización:', err);
      alert('No se pudo anular la cotización.');
    }
  };

  const handleWhatsApp = (coti: Cotizacion, items: DetalleCotizacion[]) => {
    const tel = (coti.cliente_telefono || '').replace(/[^0-9]/g, '');
    const telefonoDestino = tel.length === 9 ? `51${tel}` : tel;

    const lineas = items
      .map((d) => `• ${d.quantity}x ${d.product_name} - S/ ${d.subtotal.toFixed(2)}`)
      .join('\n');

    const venceStr = coti.fecha_vencimiento ? new Date(coti.fecha_vencimiento).toLocaleDateString() : '7 días';

    const mensaje = encodeURIComponent(
      `*COTIZACIÓN ${coti.numero}*\n` +
      `Estimado(a) ${coti.cliente_nombre}:\n` +
      `Le recordamos el detalle de su cotización:\n\n` +
      `${lineas}\n\n` +
      `*TOTAL: S/ ${coti.total.toFixed(2)}*\n` +
      `Validez hasta: ${venceStr}\n\n` +
      `Si desea concretar su pedido o resolver dudas, estamos a su completa disposición.`
    );

    const url = telefonoDestino
      ? `https://wa.me/${telefonoDestino}?text=${mensaje}`
      : `https://wa.me/?text=${mensaje}`;

    window.open(url, '_blank');
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white border-2 border-[var(--color-ink)]">
      
      {/* BARRA SUPERIOR: BUSCADOR Y FILTROS */}
      <div className="p-3 bg-[var(--color-bg)] border-b-2 border-[var(--color-ink)] flex flex-wrap gap-2 items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
            <input
              id="buscador-cotizaciones"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Buscar por Nro, Cliente, DNI, Teléfono..."
              className="w-full pl-8 pr-3 py-1.5 text-xs font-black uppercase border-2 border-[var(--color-ink)] outline-none bg-white focus:ring-4 focus:ring-[var(--color-ink)]"
            />
          </div>
          {search && (
            <button
              onClick={() => {
                setSearch('');
                document.getElementById('buscador-cotizaciones')?.focus();
              }}
              className="px-2 py-1 text-xs font-bold border-2 border-[var(--color-ink)] bg-white hover:bg-gray-100 cursor-pointer"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* FILTRO DE ESTADO */}
        <div className="flex gap-1 overflow-x-auto">
          {ESTADOS_COTI.map((est, index) => (
            <button
              key={est}
              id={`btn-filtro-coti-${est}`}
              type="button"
              onClick={() => setFiltroEstado(est)}
              onKeyDown={(e) => handleFiltroKeyDown(e, index, est)}
              className={`px-2.5 py-1 text-[11px] font-black uppercase border-2 border-[var(--color-ink)] transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] ${
                filtroEstado === est
                  ? 'bg-[var(--color-ink)] text-white shadow-[2px_2px_0_0_black]'
                  : 'bg-white text-[var(--color-ink)] hover:bg-gray-100'
              }`}
            >
              {est}
            </button>
          ))}
        </div>
      </div>

      {/* TABLA DE COTIZACIONES */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="p-12 text-center text-xs font-bold text-[var(--color-muted)] uppercase tracking-widest">
            Cargando cotizaciones...
          </div>
        ) : cotizacionesFiltradas.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-2 text-[var(--color-muted)]">
            <FileText size={32} />
            <span className="text-xs font-black uppercase tracking-widest">
              No hay cotizaciones con estos filtros
            </span>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {cotizacionesFiltradas.map((coti, idx) => {
              const isSelected = selectedIndex === idx;
              const emisionStr = coti.fecha_emision ? new Date(coti.fecha_emision).toLocaleDateString() : '-';
              const vencimientoStr = coti.fecha_vencimiento ? new Date(coti.fecha_vencimiento).toLocaleDateString() : 'Sin fecha';

              const badgeEstado = {
                VIGENTE: 'bg-emerald-100 text-emerald-800 border-emerald-500',
                CONVERTIDA: 'bg-blue-100 text-blue-800 border-blue-500',
                VENCIDA: 'bg-amber-100 text-amber-800 border-amber-500',
                ANULADA: 'bg-red-100 text-red-800 border-red-500'
              }[coti.estado] || 'bg-gray-100 text-gray-800 border-gray-400';

              return (
                <div
                  key={coti.id}
                  id={`coti-row-${idx}`}
                  data-row="true"
                  data-coti-id={coti.id}
                  role="button"
                  tabIndex={0}
                  onFocus={() => setSelectedIndex(idx)}
                  onClick={() => abrirDetalle(coti, idx)}
                  onKeyDown={(e) => handleRowKeyDown(e, idx, coti)}
                  className={`p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 cursor-pointer transition-all border-2 ${
                    isSelected
                      ? 'bg-amber-100/90 border-[var(--color-ink)] shadow-[2px_2px_0_0_black] ring-2 ring-[var(--color-ink)]'
                      : 'bg-white border-transparent hover:bg-amber-50/50'
                  } focus:outline-none focus:ring-4 focus:ring-[var(--color-ink)] focus:bg-amber-100/90 focus:border-[var(--color-ink)]`}
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-[var(--color-ink)] tracking-wider">
                        {coti.numero}
                      </span>
                      <span className={`px-2 py-0.5 text-[9px] font-black uppercase border ${badgeEstado}`}>
                        {coti.estado}
                      </span>
                    </div>
                    <span className="text-xs font-black uppercase text-[var(--color-ink)] truncate">
                      {coti.cliente_nombre}
                    </span>
                    <span className="text-[11px] font-bold text-[var(--color-muted)] flex items-center gap-2">
                      <span>Emisión: {emisionStr}</span>
                      <span>·</span>
                      <span>Vence: {vencimientoStr}</span>
                      {coti.vendedor && (
                        <>
                          <span>·</span>
                          <span>Atendido por: {coti.vendedor}</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-center">
                    <div className="text-right">
                      <span className="block text-[10px] font-bold uppercase text-[var(--color-muted)]">
                        Total Cotizado
                      </span>
                      <span className="text-base sm:text-lg font-black text-[var(--color-ink)]">
                        S/ {coti.total.toFixed(2)}
                      </span>
                    </div>

                    <button
                      id={`btn-detalle-coti-${idx}`}
                      data-btn-detalle="true"
                      type="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        abrirDetalle(coti, idx);
                      }}
                      onKeyDown={(e) => handleBtnDetalleKeyDown(e, idx, coti)}
                      className="px-3 py-1.5 border-2 border-[var(--color-ink)] bg-white hover:bg-[var(--color-accent)] text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_0_black] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] focus:bg-[var(--color-accent)] cursor-pointer"
                    >
                      Ver Detalle
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DETALLE DE COTIZACIÓN */}
      {cotiSeleccionada && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) cerrarDetalle();
          }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-2 sm:p-4"
        >
          <div className="bg-white border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] flex flex-col max-h-[92vh] w-full max-w-xl animate-fade-in">
            
            {/* CABECERA */}
            <div className="bg-[var(--color-ink)] text-white p-3 sm:p-4 flex justify-between items-center border-b-2 border-[var(--color-ink)]">
              <div>
                <h3 className="text-base font-black uppercase tracking-wider flex items-center gap-2">
                  <FileText size={18} className="text-[var(--color-accent)]" />
                  {cotiSeleccionada.numero} · Detalle de Proforma
                </h3>
                <span className="text-[11px] font-bold text-gray-300">
                  Estado: <strong>{cotiSeleccionada.estado}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={cerrarDetalle}
                className="p-1 hover:rotate-90 transition-transform cursor-pointer text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* CUERPO */}
            <div className="p-4 overflow-y-auto flex flex-col gap-4 custom-scrollbar">
              
              {/* DATOS CLIENTE */}
              <div className="bg-[var(--color-bg)] p-3 border-2 border-[var(--color-border)] text-xs flex flex-col gap-1">
                <div>Cliente: <strong className="uppercase">{cotiSeleccionada.cliente_nombre}</strong></div>
                {cotiSeleccionada.cliente_documento && <div>Doc: <strong>{cotiSeleccionada.cliente_documento}</strong></div>}
                {cotiSeleccionada.cliente_telefono && <div>Teléfono: <strong>{cotiSeleccionada.cliente_telefono}</strong></div>}
                <div>Emisión: <strong>{new Date(cotiSeleccionada.fecha_emision).toLocaleString()}</strong></div>
                {cotiSeleccionada.fecha_vencimiento && (
                  <div>Vencimiento: <strong>{new Date(cotiSeleccionada.fecha_vencimiento).toLocaleDateString()}</strong></div>
                )}
                {cotiSeleccionada.observaciones && (
                  <div className="mt-1 pt-1 border-t border-[var(--color-border)] text-[11px] italic">
                    Notas: {cotiSeleccionada.observaciones}
                  </div>
                )}
              </div>

              {/* LISTA DE PRODUCTOS */}
              <div>
                <span className="text-[11px] font-black uppercase tracking-widest text-[var(--color-muted)] mb-1 block">
                  Artículos Cotizados
                </span>
                {cargandoDetalles ? (
                  <div className="p-6 text-center text-xs font-bold text-gray-500">
                    Cargando productos...
                  </div>
                ) : (
                  <div className="border-2 border-[var(--color-ink)] divide-y divide-[var(--color-border)] max-h-48 overflow-y-auto">
                    {detallesModal.map((det, i) => (
                      <div key={i} className="p-2 flex justify-between items-center text-xs">
                        <div className="min-w-0 pr-2">
                          <p className="font-black uppercase text-[var(--color-ink)] truncate">
                            {det.product_name}
                          </p>
                          <span className="text-[10px] text-[var(--color-muted)] font-bold">
                            {det.quantity} x S/ {det.price.toFixed(2)}
                            {det.es_mayorista && <span className="ml-1 text-amber-600 font-black">⭐ MAYORISTA</span>}
                          </span>
                        </div>
                        <span className="font-black text-sm text-[var(--color-ink)] shrink-0">
                          S/ {det.subtotal.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* TOTAL */}
              <div className="flex justify-between items-center p-3 bg-amber-50 border-2 border-amber-300">
                <span className="text-xs font-black uppercase text-amber-900 tracking-wider">
                  Total de la Cotización:
                </span>
                <span className="text-xl font-black text-amber-900">
                  S/ {cotiSeleccionada.total.toFixed(2)}
                </span>
              </div>

              {/* ACCIONES */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                {cotiSeleccionada.estado === 'VIGENTE' && (
                  <button
                    type="button"
                    onClick={() => handleConvertirEnVenta(cotiSeleccionada)}
                    className="py-2.5 px-3 border-2 border-[var(--color-ink)] bg-emerald-600 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[3px_3px_0_0_black] hover:bg-emerald-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]"
                  >
                    <ShoppingBag size={16} /> Convertir en Venta
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleWhatsApp(cotiSeleccionada, detallesModal)}
                  className="py-2.5 px-3 border-2 border-[var(--color-ink)] bg-green-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[3px_3px_0_0_black] hover:bg-green-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]"
                >
                  <MessageCircle size={16} /> Compartir WhatsApp
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="py-2.5 px-3 border-2 border-[var(--color-ink)] bg-white text-[var(--color-ink)] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[3px_3px_0_0_black] hover:bg-gray-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]"
                >
                  <Printer size={16} /> Imprimir
                </button>

                {cotiSeleccionada.estado === 'VIGENTE' && (
                  <button
                    type="button"
                    onClick={() => handleAnular(cotiSeleccionada)}
                    className="py-2.5 px-3 border-2 border-red-600 bg-white text-red-600 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[3px_3px_0_0_red] hover:bg-red-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-600"
                  >
                    <X size={16} /> Anular Cotización
                  </button>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
