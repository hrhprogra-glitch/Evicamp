import React, { useState, useEffect, useRef } from 'react';
import { Search, ShieldCheck, ShieldAlert, ShieldX, X, Calendar, User, Receipt, Package, RefreshCw } from 'lucide-react';
import { supabase } from '../../../db/supabase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialSerie?: string;
}

interface ResultadoGarantia {
  id: number;
  sale_id: number;
  product_id: number;
  product_name: string;
  numero_serie: string;
  garantia_hasta: string | null;
  sale_date: string;
  customer_name: string | null;
  marca?: string | null;
  modelo?: string | null;
  meses_garantia?: number;
  // Historial si fue cambiado
  fueCambiado?: boolean;
  detalleCambio?: {
    fecha: string;
    motivo: string | null;
    productoNuevo: string;
  };
}

export const ModalConsultarGarantia: React.FC<Props> = ({ isOpen, onClose, initialSerie = '' }) => {
  const [serieBusqueda, setSerieBusqueda] = useState(initialSerie);
  const [buscando, setBuscando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoGarantia | null>(null);
  const [noEncontrado, setNoEncontrado] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSerieBusqueda(initialSerie);
      setResultado(null);
      setNoEncontrado(false);
      setErrorMsg(null);

      const enfocar = () => inputRef.current?.focus();
      enfocar();
      const t1 = setTimeout(enfocar, 50);
      const t2 = setTimeout(enfocar, 150);

      if (initialSerie.trim()) {
        void buscarSerie(initialSerie.trim());
      }

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [isOpen, initialSerie]);

  // Focus trap y navegación por teclado
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Focus trap
      if (e.key === 'Tab') {
        const modal = document.getElementById('modal-consultar-garantia');
        if (!modal) return;
        const focusables = modal.querySelectorAll<HTMLElement>(
          'input:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const buscarSerie = async (query: string) => {
    const q = query.trim();
    if (!q) return;

    setBuscando(true);
    setResultado(null);
    setNoEncontrado(false);
    setErrorMsg(null);

    try {
      // 1. Buscar en sale_details por numero_serie
      const { data: details, error: errDetails } = await supabase
        .from('sale_details')
        .select(`
          id,
          sale_id,
          product_id,
          product_name,
          numero_serie,
          garantia_hasta,
          sales (
            id,
            created_at,
            customer_name
          ),
          products (
            marca,
            modelo,
            meses_garantia
          )
        `)
        .ilike('numero_serie', `%${q}%`)
        .order('id', { ascending: false })
        .limit(1);

      if (errDetails) throw errDetails;

      if (!details || details.length === 0) {
        // También revisar si figura en cambios_productos
        const { data: cambio } = await supabase
          .from('cambios_productos')
          .select('*')
          .or(`serie_devuelta.ilike.%${q}%,serie_nueva.ilike.%${q}%`)
          .order('id', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cambio) {
          setResultado({
            id: cambio.id,
            sale_id: cambio.sale_id,
            product_id: cambio.producto_nuevo_id || cambio.producto_devuelto_id || 0,
            product_name: cambio.producto_nuevo_nombre || cambio.producto_devuelto_nombre,
            numero_serie: cambio.serie_nueva || cambio.serie_devuelta || q,
            garantia_hasta: null,
            sale_date: cambio.fecha || cambio.created_at,
            customer_name: cambio.customer_name || 'CLIENTE',
            fueCambiado: true,
            detalleCambio: {
              fecha: cambio.fecha || cambio.created_at,
              motivo: cambio.motivo,
              productoNuevo: cambio.producto_nuevo_nombre
            }
          });
          return;
        }

        setNoEncontrado(true);
        return;
      }

      const item = details[0] as any;
      const venta = item.sales;
      const prod = item.products;

      // Verificar si después de la venta este número de serie fue devuelto o cambiado
      const { data: cambioAsociado } = await supabase
        .from('cambios_productos')
        .select('*')
        .eq('serie_devuelta', item.numero_serie)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

      setResultado({
        id: item.id,
        sale_id: item.sale_id,
        product_id: item.product_id,
        product_name: item.product_name,
        numero_serie: item.numero_serie,
        garantia_hasta: item.garantia_hasta,
        sale_date: venta?.created_at || 'Sin fecha',
        customer_name: venta?.customer_name || 'PÚBLICO GENERAL',
        marca: prod?.marca || null,
        modelo: prod?.modelo || null,
        meses_garantia: prod?.meses_garantia || 0,
        fueCambiado: Boolean(cambioAsociado),
        detalleCambio: cambioAsociado ? {
          fecha: cambioAsociado.fecha || cambioAsociado.created_at,
          motivo: cambioAsociado.motivo,
          productoNuevo: cambioAsociado.producto_nuevo_nombre
        } : undefined
      });

    } catch (err: any) {
      console.error('Error buscando garantía:', err);
      setErrorMsg(err.message || 'Error al consultar la serie');
    } finally {
      setBuscando(false);
    }
  };

  const calcularEstadoGarantia = (garantiaHasta: string | null) => {
    if (!garantiaHasta) {
      return { estado: 'SIN_GARANTIA', texto: 'Sin garantía configurada', dias: 0 };
    }
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaVenc = new Date(garantiaHasta + 'T23:59:59');
    const diffMs = fechaVenc.getTime() - hoy.getTime();
    const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDias >= 0) {
      return {
        estado: 'VIGENTE',
        texto: `Vigente (${diffDias === 0 ? 'Vence hoy' : `Quedan ${diffDias} ${diffDias === 1 ? 'día' : 'días'}`})`,
        dias: diffDias
      };
    } else {
      return {
        estado: 'VENCIDA',
        texto: `Vencida (Expiró hace ${Math.abs(diffDias)} ${Math.abs(diffDias) === 1 ? 'día' : 'días'})`,
        dias: diffDias
      };
    }
  };

  if (!isOpen) return null;

  const estadoGarantia = resultado ? calcularEstadoGarantia(resultado.garantia_hasta) : null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      id="modal-consultar-garantia"
      aria-labelledby="modal-garantia-title"
    >
      <div className="bg-[var(--color-surface)] border-2 border-[var(--color-ink)] shadow-[8px_8px_0px_0px_rgba(var(--color-ink-rgb),1)] rounded-none w-full max-w-lg flex flex-col font-mono">
        {/* CABECERA */}
        <div className="flex justify-between items-center border-b-2 border-[var(--color-ink)] bg-[var(--color-bg)] p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-100 border border-emerald-600 flex items-center justify-center text-emerald-800">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h2 id="modal-garantia-title" className="text-[var(--color-ink)] font-black text-sm sm:text-base uppercase tracking-wider">
                Consultar Garantía y Serie
              </h2>
              <p className="text-[10px] text-[var(--color-muted)] font-bold uppercase tracking-widest">
                Validar autenticidad, ticket y vigencia de garantía
              </p>
            </div>
          </div>

          <button 
            ref={closeBtnRef}
            onClick={onClose} 
            title="Cerrar ventana (Esc)"
            className="p-1.5 bg-[var(--color-surface)] border-2 border-[var(--color-ink)] text-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-white transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* BUSCADOR */}
        <div className="p-4 border-b-2 border-[var(--color-ink)] bg-white">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              void buscarSerie(serieBusqueda);
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <input
                ref={inputRef}
                id="input-serie-garantia"
                type="text"
                autoComplete="off"
                placeholder="Escanear o ingresar número de serie o IMEI..."
                value={serieBusqueda}
                onChange={(e) => setSerieBusqueda(e.target.value)}
                className="w-full bg-[var(--color-bg)] border-2 border-[var(--color-ink)] text-xs sm:text-sm font-black p-2.5 pl-8 uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]"
              />
              <Search size={16} className="absolute left-2.5 top-3 text-[var(--color-muted)]" />
            </div>

            <button
              id="btn-buscar-serie"
              type="submit"
              disabled={buscando || !serieBusqueda.trim()}
              className="bg-[var(--color-ink)] text-white hover:bg-[var(--color-accent)] hover:text-black font-black text-xs uppercase px-4 py-2.5 border-2 border-[var(--color-ink)] shadow-[2px_2px_0_0_var(--color-ink)] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer disabled:opacity-50"
            >
              {buscando ? 'Buscando...' : 'Buscar'}
            </button>
          </form>
        </div>

        {/* CONTENIDO / RESULTADO */}
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar bg-[var(--color-bg)]">
          {errorMsg && (
            <div className="p-3 border-2 border-red-600 bg-red-50 text-red-700 text-xs font-bold">
              ❌ {errorMsg}
            </div>
          )}

          {noEncontrado && (
            <div className="p-6 text-center border-2 border-dashed border-red-400 bg-white space-y-2">
              <ShieldX size={36} className="mx-auto text-red-500" />
              <p className="text-xs font-black text-red-600 uppercase">
                No se encontró ninguna venta registrada con la serie:
              </p>
              <p className="font-mono font-bold text-sm bg-red-100 p-1.5 border border-red-200 inline-block uppercase">
                {serieBusqueda}
              </p>
              <p className="text-[11px] text-[var(--color-muted)]">
                Verifica que el número de serie esté bien escrito o que el producto haya sido vendido con control de series.
              </p>
            </div>
          )}

          {resultado && (
            <div className="border-2 border-[var(--color-ink)] bg-white p-4 shadow-[4px_4px_0_0_var(--color-ink)] space-y-3">
              {/* ESTADO DE GARANTÍA BADGE */}
              <div className="flex items-center justify-between pb-2 border-b-2 border-dashed border-[var(--color-border)]">
                <span className="text-[11px] font-black uppercase text-[var(--color-muted)]">
                  Estado de Garantía
                </span>
                {estadoGarantia?.estado === 'VIGENTE' && (
                  <span className="flex items-center gap-1 text-xs font-black uppercase text-emerald-800 bg-emerald-100 border-2 border-emerald-600 px-2.5 py-1">
                    <ShieldCheck size={14} /> {estadoGarantia.texto}
                  </span>
                )}
                {estadoGarantia?.estado === 'VENCIDA' && (
                  <span className="flex items-center gap-1 text-xs font-black uppercase text-red-800 bg-red-100 border-2 border-red-600 px-2.5 py-1">
                    <ShieldAlert size={14} /> {estadoGarantia.texto}
                  </span>
                )}
                {estadoGarantia?.estado === 'SIN_GARANTIA' && (
                  <span className="flex items-center gap-1 text-xs font-black uppercase text-gray-700 bg-gray-100 border-2 border-gray-400 px-2 py-1">
                    <ShieldX size={14} /> Sin Garantía Especificada
                  </span>
                )}
              </div>

              {/* SI FUE CAMBIADO PREVIAMENTE */}
              {resultado.fueCambiado && (
                <div className="p-2.5 bg-amber-50 border-2 border-amber-500 text-amber-900 text-xs font-bold flex items-start gap-2">
                  <RefreshCw size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-black uppercase">⚠️ AVISO: ESTE PRODUCTO FUE CAMBIADO / DEVUELTO</span>
                    {resultado.detalleCambio && (
                      <p className="text-[11px] font-normal mt-0.5">
                        El {new Date(resultado.detalleCambio.fecha).toLocaleDateString('es-PE')} se cambió por: <b>{resultado.detalleCambio.productoNuevo}</b>
                        {resultado.detalleCambio.motivo ? ` · Motivo: "${resultado.detalleCambio.motivo}"` : ''}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* DATOS DEL PRODUCTO */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1 text-[11px] font-black text-[var(--color-muted)] uppercase">
                  <Package size={13} /> Producto Vendido
                </div>
                <p className="text-sm font-black text-[var(--color-ink)] uppercase">
                  {resultado.product_name}
                </p>
                {(resultado.marca || resultado.modelo) && (
                  <p className="text-[11px] text-[var(--color-muted)] font-bold uppercase">
                    {resultado.marca ? `Marca: ${resultado.marca}` : ''} {resultado.modelo ? `· Modelo: ${resultado.modelo}` : ''}
                  </p>
                )}
              </div>

              {/* SERIE IDENTIFICADA */}
              <div className="p-2 bg-gray-50 border border-[var(--color-border)]">
                <span className="text-[10px] font-black text-[var(--color-muted)] uppercase block">
                  Número de Serie / IMEI Registrado
                </span>
                <span className="text-sm font-black font-mono text-[var(--color-ink)] tracking-wider">
                  {resultado.numero_serie}
                </span>
              </div>

              {/* DATOS DEL TICKET */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-dashed border-[var(--color-border)] text-xs">
                <div>
                  <span className="text-[10px] font-black text-[var(--color-muted)] uppercase flex items-center gap-1">
                    <Receipt size={12} /> Ticket de Venta
                  </span>
                  <p className="font-black font-mono text-[var(--color-ink)]">
                    #{String(resultado.sale_id).slice(-6)}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-black text-[var(--color-muted)] uppercase flex items-center gap-1">
                    <Calendar size={12} /> Fecha de Venta
                  </span>
                  <p className="font-bold text-[var(--color-ink)]">
                    {resultado.sale_date ? new Date(resultado.sale_date).toLocaleDateString('es-PE') : '-'}
                  </p>
                </div>

                <div className="col-span-2">
                  <span className="text-[10px] font-black text-[var(--color-muted)] uppercase flex items-center gap-1">
                    <User size={12} /> Cliente
                  </span>
                  <p className="font-bold text-[var(--color-ink)] uppercase">
                    {resultado.customer_name || 'PÚBLICO GENERAL'}
                  </p>
                </div>

                {resultado.garantia_hasta && (
                  <div className="col-span-2 p-2 bg-emerald-50/60 border border-emerald-300">
                    <span className="text-[10px] font-black text-emerald-900 uppercase block">
                      Vencimiento de la Garantía
                    </span>
                    <p className="font-black text-emerald-950">
                      {new Date(resultado.garantia_hasta + 'T12:00:00').toLocaleDateString('es-PE', {
                        day: '2-digit', month: 'long', year: 'numeric'
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* PIE */}
        <div className="p-3 border-t-2 border-[var(--color-ink)] bg-[var(--color-bg)] flex justify-end">
          <button
            id="btn-cerrar-garantia"
            type="button"
            onClick={onClose}
            className="bg-white text-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-white font-black text-xs uppercase px-4 py-2 border-2 border-[var(--color-ink)] shadow-[2px_2px_0_0_var(--color-ink)] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
          >
            Cerrar [ESC]
          </button>
        </div>
      </div>
    </div>
  );
};
