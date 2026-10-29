// src/sections/Clientes/components/ModalDetalleCliente.tsx
// DETALLE DEL CLIENTE (fase 4.1b y 4.2): Enter en un cliente de la pestaña Clientes (o "Ver historial" del estado de cuenta).
// Muestra sus datos, un resumen (deuda, créditos, total comprado, última compra, cada cuánto viene), lo que más lleva y
// su HISTORIAL con 3 pestañas: Pendientes (deudas), Pagados (créditos cancelados) y Compras (ventas al contado en caja).
// Buscador de producto o monto, filtro por fecha, y Enter despliega los productos y abonos.
import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Edit, UserCircle, X, ReceiptText, FilterX, Search, MapPin, Users, UserMinus } from 'lucide-react';
import type { Cliente, Fiado, GrupoClientes } from '../types';
import { supabase } from '../../../db/supabase';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { ventanaSuperior } from '../../../utils/ventanas';
import { CuerpoVentana, BarraFiltros, TextoBarra, CajaLista, FilaLista, LineaDato, Etiqueta, DatoFila, claseBotonBarra, claseCampoBarra } from '../../../components/ListaVentana';

export interface CompraCliente {
  id: string;
  fecha: string;
  total: number;
  metodoPago: string;
  vendedor?: string;
  detalles: Array<{
    name: string;
    qty: number;
    price: number;
    subtotal: number;
  }>;
}

interface Props {
  cliente: Cliente | null;          // null = cerrada
  fiados: Fiado[];
  onClose: () => void;
  onEditar: (c: Cliente) => void;
  onEstadoCuenta: (c: Cliente) => void;
  // Grupo de clientes (familia o empresa)
  grupo?: GrupoClientes | null;
  miembrosGrupo?: number;
  deudaGrupo?: number;
  onGrupo: (c: Cliente) => void;          // sin grupo: elegir uno; con grupo: ver el grupo
  onSacarDeGrupo: (c: Cliente) => void;
}

type PestanaHistorial = 'PENDIENTES' | 'PAGADOS' | 'COMPRAS';
const fecha = (f?: string) => (f ? new Date(f).toLocaleDateString('es-PE') : '—');
const soles = (n: number) => `S/ ${n.toFixed(2)}`;
const estaPagado = (f: Fiado) => f.estado === 'PAGADO' || (Number(f.saldoPendiente) || 0) <= 0.05;
// Fecha como AAAA-MM-DD en hora local (para el filtro de fecha)
const diaLocal = (f: string) => { const d = new Date(f); return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-CA'); };

export const ModalDetalleCliente: React.FC<Props> = ({ cliente, fiados, onClose, onEditar, onEstadoCuenta, grupo, miembrosGrupo = 0, deudaGrupo = 0, onGrupo, onSacarDeGrupo }) => {
  // Botones de arriba (← →): con grupo aparece también "Sacar del grupo"
  const BOTONES = ['btn-detalle-cliente-editar', 'btn-detalle-cliente-cuenta', 'btn-detalle-cliente-grupo', ...(grupo ? ['btn-detalle-cliente-sacar'] : [])];
  useCerrarConEscape(!!cliente, onClose);
  const [pestana, setPestana] = useState<PestanaHistorial>('PENDIENTES');
  const [busqueda, setBusqueda] = useState('');
  const [dia, setDia] = useState('');
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());
  const [compras, setCompras] = useState<CompraCliente[]>([]);
  const [, setCargandoCompras] = useState(false);

  // Cargar compras al contado hechas en caja
  useEffect(() => {
    if (!cliente) {
      setCompras([]);
      return;
    }
    let activo = true;
    const fetchCompras = async () => {
      setCargandoCompras(true);
      try {
        const cId = cliente.id && !isNaN(Number(cliente.id)) ? Number(cliente.id) : null;
        const cNombre = (cliente.nombre || '').trim();

        let q = supabase
          .from('sales')
          .select('id, total, payment_type, created_at, customer_id, customer_name, amount_cash, amount_yape, amount_card, amount_transfer, amount_credit, vendedor')
          .order('created_at', { ascending: false });

        if (cId && cNombre) {
          q = q.or(`customer_id.eq.${cId},customer_name.eq.${cNombre}`);
        } else if (cId) {
          q = q.eq('customer_id', cId);
        } else if (cNombre) {
          q = q.eq('customer_name', cNombre);
        }

        const { data: salesData, error: salesErr } = await q;
        if (salesErr || !salesData || !activo) return;

        // Excluir ventas que ya están registradas como fiados para no duplicar
        const fiadoSaleIds = new Set(fiados.map((f: any) => String(f.sale_id || f.id)).filter(Boolean));
        const ventasContado = salesData.filter((s: any) => !fiadoSaleIds.has(String(s.id)) && (Number(s.amount_credit || 0) <= 0 || s.payment_type !== 'FIADO'));

        if (ventasContado.length === 0) {
          if (activo) setCompras([]);
          return;
        }

        const saleIds = ventasContado.map((v: any) => v.id);
        const { data: detailsData } = await supabase
          .from('sale_details')
          .select('sale_id, product_name, quantity, price_at_moment, subtotal')
          .in('sale_id', saleIds);

        if (!activo) return;

        const detailsPorSale = new Map<string, any[]>();
        (detailsData || []).forEach((d: any) => {
          const sId = String(d.sale_id);
          if (!detailsPorSale.has(sId)) detailsPorSale.set(sId, []);
          detailsPorSale.get(sId)!.push({
            name: d.product_name || 'Producto',
            qty: Number(d.quantity) || 1,
            price: Number(d.price_at_moment) || 0,
            subtotal: Number(d.subtotal) || 0
          });
        });

        const lista: CompraCliente[] = ventasContado.map((s: any) => ({
          id: String(s.id),
          fecha: s.created_at,
          total: Number(s.total) || 0,
          metodoPago: s.payment_type || 'EFECTIVO',
          vendedor: s.vendedor || undefined,
          detalles: detailsPorSale.get(String(s.id)) || []
        }));

        setCompras(lista);
      } catch (err) {
        console.error('Error cargando compras del cliente:', err);
      } finally {
        if (activo) setCargandoCompras(false);
      }
    };

    fetchCompras();
    return () => { activo = false; };
  }, [cliente?.id, cliente?.nombre, fiados]);

  // Sus créditos: por id o, los antiguos sin id, por nombre (del más nuevo al más antiguo)
  const creditos = useMemo(() => {
    if (!cliente) return [];
    const cId = String(cliente.id || '').trim();
    const cNombre = (cliente.nombre || '').trim().toUpperCase();
    return fiados.filter((f) => {
      const fId = String(f.clienteId || '').trim();
      const fNombre = (f.clienteNombre || '').trim().toUpperCase();
      if (fId && cId && fId === cId) return true;
      if (fNombre && cNombre && fNombre === cNombre) return true;
      return false;
    }).sort((a, b) => String(b.fechaEmision).localeCompare(String(a.fechaEmision)));
  }, [cliente, fiados]);

  const resumen = useMemo(() => {
    const deuda = creditos.reduce((t, f) => t + (Number(f.saldoPendiente) || 0), 0);
    const totalFiado = creditos.reduce((t, f) => t + (Number(f.montoOriginal) || 0), 0);
    const totalCompras = compras.reduce((t, c) => t + c.total, 0);
    const totalGeneral = totalFiado + totalCompras;

    // Todas las fechas de visita (créditos + compras)
    const todasLasFechas = [
      ...creditos.map((f) => f.fechaEmision),
      ...compras.map((c) => c.fecha)
    ].filter(Boolean);

    const dias = [...new Set(todasLasFechas.map((f) => new Date(f).toDateString()).filter((d) => d !== 'Invalid Date'))]
      .map((d) => Date.parse(d)).sort((a, b) => a - b);
    const cada = dias.length >= 2 ? Math.max(1, Math.round((dias[dias.length - 1] - dias[0]) / (dias.length - 1) / 86400000)) : null;

    // Fecha más reciente
    const ultimaFecha = todasLasFechas.sort((a, b) => String(b).localeCompare(String(a)))[0];

    // Lo que más lleva (por cantidad, en sus créditos y compras)
    const porProducto = new Map<string, number>();
    creditos.forEach((f) => (f.detalles || []).forEach((d) => porProducto.set(d.name, (porProducto.get(d.name) || 0) + (Number(d.qty) || 0))));
    compras.forEach((c) => c.detalles.forEach((d) => porProducto.set(d.name, (porProducto.get(d.name) || 0) + d.qty)));

    const top = [...porProducto.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { deuda, totalFiado, totalCompras, totalGeneral, ultimaFecha, cada, top };
  }, [creditos, compras]);

  const pendientes = creditos.filter((f) => !estaPagado(f));
  const pagados = creditos.filter(estaPagado);

  // Historial: la pestaña elegida + buscador (producto, monto o estado) + fecha
  const historial = useMemo(() => {
    let lista = pestana === 'PENDIENTES' ? pendientes : pagados;
    if (dia) lista = lista.filter((f) => diaLocal(f.fechaEmision) === dia);
    const q = busqueda.trim().toLowerCase();
    if (q) {
      lista = lista.filter((f) => String(f.montoOriginal).includes(q) || String(f.saldoPendiente).includes(q)
        || (f.detalles || []).some((d) => String(d.name).toLowerCase().includes(q) || String(d.subtotal).includes(q)));
    }
    return lista;
  }, [pestana, pendientes, pagados, dia, busqueda]);

  const comprasFiltradas = useMemo(() => {
    let lista = compras;
    if (dia) lista = lista.filter((c) => diaLocal(c.fecha) === dia);
    const q = busqueda.trim().toLowerCase();
    if (q) {
      lista = lista.filter((c) =>
        c.id.includes(q) ||
        String(c.total).includes(q) ||
        c.metodoPago.toLowerCase().includes(q) ||
        c.detalles.some((d) => d.name.toLowerCase().includes(q))
      );
    }
    return lista;
  }, [compras, dia, busqueda]);

  // Al abrir: pestaña Pendientes si debe algo, sino Pagados o Compras
  useEffect(() => {
    if (!cliente) return;
    const tienePendientes = creditos.some((f) => !estaPagado(f));
    if (tienePendientes) {
      setPestana('PENDIENTES');
    } else if (pagados.length > 0) {
      setPestana('PAGADOS');
    } else {
      setPestana('COMPRAS');
    }
    setBusqueda(''); setDia(''); setAbiertos(new Set());
    const t = setTimeout(() => document.getElementById(BOTONES[0])?.focus(), 50);
    return () => clearTimeout(t);
  }, [cliente?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Si no tenía créditos pero se cargan compras, cambiar a COMPRAS para no ver vacío
  useEffect(() => {
    if (compras.length > 0 && pagados.length === 0 && pendientes.length === 0) {
      setPestana('COMPRAS');
    }
  }, [compras.length, pagados.length, pendientes.length]);

  if (!cliente) return null;

  const hayFiltros = !!busqueda || !!dia;
  const barra = [
    'tab-historial-cliente-pendientes',
    'tab-historial-cliente-pagados',
    'tab-historial-cliente-compras',
    'buscar-historial-cliente',
    'fecha-historial-cliente',
    ...(hayFiltros ? ['btn-limpiar-historial-cliente'] : [])
  ];
  const idPestana = pestana === 'PENDIENTES' ? barra[0] : pestana === 'PAGADOS' ? barra[1] : barra[2];
  const filas = () => Array.from(document.querySelectorAll('[data-credito-cliente="true"], [data-compra-cliente="true"]')) as HTMLElement[];
  const alternar = (id: string) => setAbiertos((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  // Teclado de toda la ventana
  const teclas = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const arriba = ventanaSuperior();
    if (arriba && !arriba.contains(document.getElementById('btn-cerrar-detalle-cliente'))) return;
    const a = document.activeElement as HTMLElement | null;
    if (!a) return;
    const enBoton = BOTONES.includes(a.id);
    const enBarra = barra.includes(a.id);
    const lista = filas();
    const i = lista.indexOf(a);
    const esTexto = a instanceof HTMLInputElement && a.type === 'text';
    if ((enBoton || enBarra) && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      if (esTexto && (e.key === 'ArrowRight' ? a.selectionEnd !== a.value.length : a.selectionStart !== 0)) return;
      e.preventDefault();
      const fila = enBoton ? BOTONES : barra;
      const k = fila.indexOf(a.id);
      document.getElementById(fila[Math.min(Math.max(k + (e.key === 'ArrowRight' ? 1 : -1), 0), fila.length - 1)])?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (a.id === 'btn-cerrar-detalle-cliente') document.getElementById(BOTONES[0])?.focus();
      else if (enBoton) document.getElementById(idPestana)?.focus();
      else if (enBarra) lista[0]?.focus();
      else if (i >= 0 && lista[i + 1]) { lista[i + 1].focus(); lista[i + 1].scrollIntoView({ block: 'nearest' }); }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (enBoton) document.getElementById('btn-cerrar-detalle-cliente')?.focus();
      else if (enBarra) document.getElementById(BOTONES[0])?.focus();
      else if (i > 0) { lista[i - 1].focus(); lista[i - 1].scrollIntoView({ block: 'nearest' }); }
      else if (i === 0) document.getElementById(idPestana)?.focus();
    } else if ((e.key === 'Enter' || e.key === ' ') && (a.id === barra[0] || a.id === barra[1] || a.id === barra[2])) {
      e.preventDefault();
      if (a.id === barra[0]) setPestana('PENDIENTES');
      else if (a.id === barra[1]) setPestana('PAGADOS');
      else if (a.id === barra[2]) setPestana('COMPRAS');
    } else if ((e.key === 'Enter' || e.key === ' ') && a.id === 'fecha-historial-cliente') {
      e.preventDefault();
      try { (a as HTMLInputElement).showPicker(); } catch { /* sin calendario */ }
    } else if (e.key === 'Enter' && a.id === 'buscar-historial-cliente') {
      e.preventDefault(); lista[0]?.focus();
    } else if ((e.key === 'Enter' || e.key === ' ') && i >= 0) {
      e.preventDefault();
      const idActual = pestana === 'COMPRAS' ? comprasFiltradas[i]?.id : historial[i]?.id;
      if (idActual) alternar(idActual);
    }
  };

  const datos = [
    cliente.dni ? `DNI: ${cliente.dni}` : null,
    cliente.ruc ? `RUC: ${cliente.ruc}` : null,
    !cliente.dni && !cliente.ruc ? 'Sin DNI ni RUC' : null,
    cliente.telefono ? `Tel.: ${cliente.telefono}` : null,
    cliente.direccion ? `Dirección: ${cliente.direccion}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 font-mono" onKeyDown={teclas}>
      <div role="dialog" aria-label={`Cliente ${cliente.nombre}`}
        className="bg-[var(--color-surface)] w-full max-w-5xl border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] flex flex-col h-[calc(var(--alto-pantalla)*0.94)] sm:h-[calc(var(--alto-pantalla)*0.88)]">
        {/* CABECERA */}
        <div className="bg-[var(--color-ink)] text-white px-4 sm:px-6 py-4 flex justify-between items-center gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <UserCircle size={22} className="text-[var(--color-info)] shrink-0" />
            <div className="min-w-0">
              <h2 id="titulo-detalle-cliente" className="text-sm font-black uppercase tracking-widest truncate">{cliente.nombre}</h2>
              {cliente.referencia && <p className="text-[11px] font-bold opacity-80 truncate">{cliente.referencia}</p>}
            </div>
          </div>
          <button id="btn-cerrar-detalle-cliente" onClick={onClose} title="Cerrar (Escape)"
            className="hover:text-[var(--color-danger)] focus:text-[var(--color-danger)] focus:outline-none focus:ring-2 focus:ring-[var(--color-info)] p-1 cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <CuerpoVentana>
          {/* DATOS Y BOTONES */}
          <BarraFiltros>
            <div className="flex flex-wrap gap-2">
              <button id={BOTONES[0]} type="button" onClick={() => onEditar(cliente)} className={claseBotonBarra(false)}><Edit size={14} /> Editar</button>
              <button id={BOTONES[1]} type="button" onClick={() => onEstadoCuenta(cliente)} className={claseBotonBarra(false)}><BookOpen size={14} /> Estado de cuenta</button>
              <button id="btn-detalle-cliente-grupo" type="button" onClick={() => onGrupo(cliente)} className={claseBotonBarra(false)}>
                <Users size={14} /> {grupo ? `Grupo: ${grupo.nombre}` : 'Agregar a un grupo'}
              </button>
              {grupo && <button id="btn-detalle-cliente-sacar" type="button" onClick={() => onSacarDeGrupo(cliente)} className={claseBotonBarra(false)}><UserMinus size={14} /> Sacar del grupo</button>}
            </div>
            <TextoBarra><span id="datos-detalle-cliente" className="text-[var(--color-ink)] normal-case">{datos}</span></TextoBarra>
            {cliente.ubicacion && (
              <a id="btn-detalle-cliente-ubicacion" href={cliente.ubicacion} target="_blank" rel="noopener noreferrer"
                className={`${claseBotonBarra(false)} no-underline`}><MapPin size={14} /> Ver ubicación</a>
            )}
          </BarraFiltros>

          {grupo && (
            <p id="info-grupo-cliente" className="text-[12px] font-bold text-[var(--color-muted)] shrink-0">
              <span className="font-black uppercase tracking-widest text-[var(--color-ink)]">Grupo: </span>
              {grupo.nombre} ({grupo.tipo === 'EMPRESA' ? 'Empresa' : 'Familia'} · {miembrosGrupo} persona{miembrosGrupo === 1 ? '' : 's'}) · Deuda del grupo:{' '}
              <span className={deudaGrupo > 0.05 ? 'text-[var(--color-danger)] font-black' : 'text-[var(--color-ink)] font-black'}>{soles(deudaGrupo)}</span>
            </p>
          )}

          {/* RESUMEN MEJORADO CON COMPRAS */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 shrink-0" id="resumen-detalle-cliente">
            {[
              ['Deuda actual', soles(resumen.deuda), resumen.deuda > 0.05 ? 'text-[var(--color-danger)]' : 'text-[var(--color-ink)]'],
              ['Créditos', String(creditos.length), 'text-[var(--color-ink)]'],
              ['Total comprado', soles(resumen.totalGeneral), 'text-[var(--color-ink)]'],
              ['Última compra', fecha(resumen.ultimaFecha), 'text-[var(--color-ink)]'],
              ['Viene cada', resumen.cada === null ? '—' : `${resumen.cada} día${resumen.cada === 1 ? '' : 's'}`, 'text-[var(--color-ink)]'],
            ].map(([t, v, c]) => (
              <div key={t} className="border-2 border-[var(--color-border)] bg-white p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-muted)]">{t}</p>
                <p className={`font-black ${c}`}>{v}</p>
              </div>
            ))}
          </div>
          {resumen.top.length > 0 && (
            <p id="top-detalle-cliente" className="text-[12px] font-bold text-[var(--color-muted)] shrink-0">
              <span className="font-black uppercase tracking-widest text-[var(--color-ink)]">Lo que más lleva: </span>
              {resumen.top.map(([n, q]) => `${n} (${q % 1 ? q.toFixed(2) : q})`).join(' · ')}
            </p>
          )}

          {/* HISTORIAL: PENDIENTES | PAGADOS | COMPRAS + BUSCADOR + FECHA */}
          <BarraFiltros>
            <div className="flex items-center gap-2 shrink-0" role="tablist" aria-label="Historial de compras y créditos">
              <button id={barra[0]} type="button" role="tab" aria-selected={pestana === 'PENDIENTES'} onClick={() => setPestana('PENDIENTES')}
                className={`h-[40px] px-3 sm:px-4 border-2 font-black text-xs uppercase tracking-widest flex items-center gap-2 cursor-pointer rounded-none transition-colors outline-none shrink-0 focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-ink)] ${pestana === 'PENDIENTES' ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]' : 'bg-white text-[var(--color-ink)] border-[var(--color-border)] hover:border-[var(--color-ink)]'}`}>
                Pendientes ({pendientes.length})
              </button>
              <button id={barra[1]} type="button" role="tab" aria-selected={pestana === 'PAGADOS'} onClick={() => setPestana('PAGADOS')}
                className={`h-[40px] px-3 sm:px-4 border-2 font-black text-xs uppercase tracking-widest flex items-center gap-2 cursor-pointer rounded-none transition-colors outline-none shrink-0 focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-ink)] ${pestana === 'PAGADOS' ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]' : 'bg-white text-[var(--color-ink)] border-[var(--color-border)] hover:border-[var(--color-ink)]'}`}>
                Pagados ({pagados.length})
              </button>
              <button id={barra[2]} type="button" role="tab" aria-selected={pestana === 'COMPRAS'} onClick={() => setPestana('COMPRAS')}
                className={`h-[40px] px-3 sm:px-4 border-2 font-black text-xs uppercase tracking-widest flex items-center gap-2 cursor-pointer rounded-none transition-colors outline-none shrink-0 focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-ink)] ${pestana === 'COMPRAS' ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]' : 'bg-white text-[var(--color-ink)] border-[var(--color-border)] hover:border-[var(--color-ink)]'}`}>
                Compras ({compras.length})
              </button>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end flex-nowrap min-w-0">
              <div className="relative flex-1 min-w-[150px] max-w-[240px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-subtle)]" />
                <input id="buscar-historial-cliente" type="text" autoComplete="off" spellCheck={false} data-lpignore="true" value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)} placeholder="PRODUCTO O MONTO..."
                  className="w-full h-[40px] border-2 border-[var(--color-border)] pl-8 pr-3 text-xs font-black uppercase text-[var(--color-ink)] outline-none bg-white rounded-none focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)]" />
              </div>
              <input id="fecha-historial-cliente" type="date" value={dia} onChange={(e) => setDia(e.target.value)} title="Filtrar por fecha (Enter abre el calendario)"
                className="h-[40px] w-[145px] sm:w-[155px] border-2 border-[var(--color-border)] px-3 text-xs font-black uppercase text-[var(--color-ink)] outline-none bg-white rounded-none focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)] shrink-0 cursor-pointer" />
              {hayFiltros && (
                <button id="btn-limpiar-historial-cliente" type="button" title="Limpiar filtros"
                  onClick={() => { setBusqueda(''); setDia(''); setTimeout(() => document.getElementById('buscar-historial-cliente')?.focus(), 30); }}
                  className="h-[40px] w-[40px] flex items-center justify-center border-2 border-[var(--color-border)] bg-[var(--color-danger-bg)] text-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] cursor-pointer shrink-0">
                  <FilterX size={16} />
                </button>
              )}
            </div>
          </BarraFiltros>

          {/* LISTA DE REGISTROS (Enter despliega productos y abonos) */}
          <CajaLista
            vacia={pestana === 'COMPRAS' ? !comprasFiltradas.length : !historial.length}
            mensaje={
              hayFiltros
                ? 'No hay registros con esos filtros.'
                : pestana === 'PENDIENTES'
                ? 'No debe nada: no tiene créditos pendientes.'
                : pestana === 'PAGADOS'
                ? 'Todavía no tiene créditos pagados.'
                : 'Todavía no tiene compras registradas en caja.'
            }
          >
            {pestana === 'COMPRAS' ? (
              comprasFiltradas.map((c) => {
                const abierto = abiertos.has(c.id);
                const productos = c.detalles.map((d) => d.name).slice(0, 3).join(', ') + (c.detalles.length > 3 ? '…' : '');
                return (
                  <div key={c.id} className="border-b-2 border-[var(--color-border)] last:border-b-0">
                    <FilaLista
                      tabIndex={0}
                      data-compra-cliente="true"
                      data-row="true"
                      aria-expanded={abierto}
                      onClick={() => alternar(c.id)}
                      icono={<ReceiptText size={28} />}
                      titulo={`Ticket #${c.id.slice(-6)} · ${fecha(c.fecha)} ${new Date(c.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                      subtitulo={
                        <>
                          <LineaDato titulo={productos}>{productos || 'Sin detalle de productos'}</LineaDato>
                          <LineaDato>Total {soles(c.total)} · Pago: {c.metodoPago} · {abierto ? 'Enter: ocultar' : 'Enter: ver productos'}</LineaDato>
                        </>
                      }
                      centro={<Etiqueta tono="azul">{c.metodoPago}</Etiqueta>}
                      derecha={<DatoFila etiqueta="Total" valor={soles(c.total)} tono="normal" />}
                    />
                    {abierto && (
                      <div data-compra-abierta="true" className="px-4 sm:px-16 pb-4 pt-1 flex flex-col gap-2 bg-[var(--color-bg)] text-sm">
                        <p className="text-[11px] font-black uppercase tracking-widest text-[var(--color-muted)] mb-0.5">Productos comprados</p>
                        {c.detalles.length ? (
                          c.detalles.map((d, k) => (
                            <div key={k} className="flex justify-between font-bold text-[var(--color-ink)]">
                              <span>{d.qty} x {d.name} {d.price ? `(c/u ${soles(d.price)})` : ''}</span>
                              <span>{soles(d.subtotal)}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-[var(--color-muted)] font-bold">Sin detalle de productos.</p>
                        )}
                        {c.vendedor && (
                          <p className="text-[11px] font-bold text-[var(--color-muted)] mt-1 border-t border-[var(--color-border)] pt-1">
                            Atendido por: <span className="text-[var(--color-ink)] font-black uppercase">{c.vendedor}</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              historial.map((f) => {
                const pagado = estaPagado(f);
                const abierto = abiertos.has(f.id);
                const productos = (f.detalles || []).map((d) => d.name).slice(0, 3).join(', ') + ((f.detalles || []).length > 3 ? '…' : '');
                return (
                  <div key={f.id} className="border-b-2 border-[var(--color-border)] last:border-b-0">
                    <FilaLista tabIndex={0} data-credito-cliente="true" data-row="true" aria-expanded={abierto}
                      onClick={() => alternar(f.id)}
                      icono={<ReceiptText size={28} />}
                      titulo={`Crédito del ${fecha(f.fechaEmision)}`}
                      subtitulo={<><LineaDato titulo={productos}>{productos || 'Sin detalle de productos'}</LineaDato><LineaDato>Monto {soles(Number(f.montoOriginal) || 0)} · abonado {soles(Number(f.montoPagado) || 0)} · {abierto ? 'Enter: ocultar' : 'Enter: ver productos y abonos'}</LineaDato></>}
                      centro={<Etiqueta tono={pagado ? 'verde' : 'rojo'}>{pagado ? 'Pagado' : 'Debe'}</Etiqueta>}
                      derecha={<DatoFila etiqueta="Debe" valor={soles(Number(f.saldoPendiente) || 0)} tono={pagado ? 'normal' : 'rojo'} />}
                    />
                    {abierto && (
                      <div data-credito-abierto="true" className="px-4 sm:px-16 pb-4 pt-1 flex flex-col gap-3 bg-[var(--color-bg)] text-sm">
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-widest text-[var(--color-muted)] mb-1">Productos sacados</p>
                          {(f.detalles || []).length ? (f.detalles || []).map((d, k) => (
                            <div key={k} className="flex justify-between font-bold text-[var(--color-ink)]">
                              <span>{d.qty} x {d.name}</span><span>{soles(Number(d.subtotal) || 0)}</span>
                            </div>
                          )) : <p className="text-[var(--color-muted)] font-bold">Sin detalle de productos.</p>}
                        </div>
                        <div className="border-t border-[var(--color-border)] pt-2">
                          <p className="text-[11px] font-black uppercase tracking-widest text-[var(--color-success)] mb-1">Abonos a esta deuda</p>
                          {(f.pagos || []).length ? (f.pagos || []).map((p, k) => (
                            <div key={k} className="flex justify-between items-center font-bold text-[var(--color-muted)]">
                              <span>{new Date(p.fecha).toLocaleString('es-PE')} · <span className="uppercase">{p.metodo}</span></span>
                              <span className="text-[var(--color-success)] font-black">+ {soles(Number(p.monto) || 0)}</span>
                            </div>
                          )) : <p className="text-[var(--color-muted)] font-bold">No se registraron abonos para esta deuda.</p>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CajaLista>
        </CuerpoVentana>
      </div>
    </div>
  );
};

