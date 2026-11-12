// src/sections/Clientes/components/ModalDetalleCliente.tsx
// DETALLE DEL CLIENTE (fase 4.1b y 4.2): Enter en un cliente de la pestaña Clientes (o "Ver historial" del estado de cuenta).
// Muestra sus datos, un resumen (deuda, créditos, total comprado, última compra, cada cuánto viene), lo que más lleva y
// su HISTORIAL: Pendientes (deudas), Pagados (créditos cancelados) y Compras (ventas al contado en caja).
// Desde el 12/11/2026 son 3 botones; cada uno abre su ventana con la lista, el buscador y la fecha (ModalHistorialCliente).
// SiuMax Nego (paso 3c): con "Talleres y servicios" muestra también LO QUE SE ATIENDE del cliente (piscina, jardín,
// vehículo, equipo..., de SiuMax Servic), su correo, persona de contacto y notas. Sin "Comercio" no salen el estado de
// cuenta, el resumen de deudas y compras ni los botones del historial.
import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Edit, UserCircle, X, MapPin, Users, UserMinus, Clock, CheckCircle2, ShoppingBag, Plus, Waves, Trees, Car, Cpu, Building2, Box } from 'lucide-react';
import type { Cliente, Fiado, GrupoClientes, BienCliente, TipoBien } from '../types';
import { TIPOS_BIEN } from '../types';
import { useTiposNegocio } from '../../../utils/tiposNegocio';
import { supabase } from '../../../db/supabase';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { ventanaSuperior } from '../../../utils/ventanas';
import { CuerpoVentana, BarraFiltros, TextoBarra, CajaLista, FilaLista, LineaDato, Etiqueta, claseBotonBarra } from '../../../components/ListaVentana';
import { formatearMonto } from '../../../utils/formato';
import { ModalHistorialCliente, fechaUltimoPago, type TipoHistorial } from './ModalHistorialCliente';

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
  // Talleres y servicios: lo que se atiende de ESTE cliente
  bienes?: BienCliente[];
  onNuevoBien?: (c: Cliente) => void;
  onEditarBien?: (b: BienCliente) => void;
}

// Lo que se atiende (de SiuMax Servic)
export const ICONO_BIEN: Record<TipoBien, React.ReactNode> = {
  PISCINA: <Waves size={20} />, JARDIN: <Trees size={20} />, VEHICULO: <Car size={20} />,
  EQUIPO: <Cpu size={20} />, LOCAL: <Building2 size={20} />, OTRO: <Box size={20} />,
};
export const nombreTipoBien = (t: TipoBien) => TIPOS_BIEN.find((x) => x.id === t)?.nombre || t;
const ESTADOS_BIEN = { ACTIVO: ['verde', 'Activo'], MANTENIMIENTO: ['ambar', 'En mantenimiento'], BAJA: ['gris', 'De baja'] } as const;
// Datos propios de cada tipo, en una línea ("Placa ABC-123 · Toyota Hilux 2019")
export const datosDeBien = (b: BienCliente) => [
  b.volumenM3 ? `${b.volumenM3} m³` : null,
  b.placa ? `Placa ${b.placa}` : null,
  [b.marca, b.modelo, b.anio].filter(Boolean).join(' ') || null,
  b.serie ? `Serie ${b.serie}` : null,
].filter(Boolean).join(' · ');

// Botones del historial (cada uno abre su ventana)
const HISTORIAL: Record<TipoHistorial, string> = { PENDIENTES: 'btn-historial-cliente-pendientes', PAGADOS: 'btn-historial-cliente-pagados', COMPRAS: 'btn-historial-cliente-compras' };
const fecha = (f?: string) => (f ? new Date(f).toLocaleDateString('es-PE') : '—');
const soles = (n: number) => `S/ ${formatearMonto(n)}`;
const estaPagado = (f: Fiado) => f.estado === 'PAGADO' || (Number(f.saldoPendiente) || 0) <= 0.05;
export const ModalDetalleCliente: React.FC<Props> = ({ cliente, fiados, onClose, onEditar, onEstadoCuenta, grupo, miembrosGrupo = 0, deudaGrupo = 0, onGrupo, onSacarDeGrupo, bienes = [], onNuevoBien, onEditarBien }) => {
  const tipos = useTiposNegocio();
  const conComercio = tipos.includes('comercio');
  const conServicios = tipos.includes('servicios');
  // Botones de arriba (← →): con grupo aparece también "Sacar del grupo"; "Estado de cuenta" solo con Comercio
  const BOTONES = ['btn-detalle-cliente-editar', ...(conComercio ? ['btn-detalle-cliente-cuenta'] : []), 'btn-detalle-cliente-grupo', ...(grupo ? ['btn-detalle-cliente-sacar'] : [])];
  useCerrarConEscape(!!cliente, onClose);
  // Ventana del historial abierta (Pendientes, Pagados o Compras); null = ninguna
  const [historial, setHistorial] = useState<TipoHistorial | null>(null);
  const [compras, setCompras] = useState<CompraCliente[]>([]);
  const [, setCargandoCompras] = useState(false);

  // Al cerrar la ventana del historial, el selector vuelve al botón que la abrió
  const cerrarHistorial = () => {
    const id = historial ? HISTORIAL[historial] : null;
    setHistorial(null);
    if (id) setTimeout(() => document.getElementById(id)?.focus(), 60);
  };

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
  const pagados = useMemo(() => {
    return creditos
      .filter(estaPagado)
      .sort((a, b) => String(fechaUltimoPago(b)).localeCompare(String(fechaUltimoPago(a))));
  }, [creditos]);

  // Al abrir: el selector en "Editar"
  useEffect(() => {
    if (!cliente) return;
    setHistorial(null);
    const t = setTimeout(() => document.getElementById(BOTONES[0])?.focus(), 50);
    return () => clearTimeout(t);
  }, [cliente?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!cliente) return null;

  const BOTONES_HISTORIAL = conComercio ? [HISTORIAL.PENDIENTES, HISTORIAL.PAGADOS, HISTORIAL.COMPRAS] : [];
  const filasBienes = () => Array.from(document.querySelectorAll('[data-bien-cliente="true"]')) as HTMLElement[];
  // Teclado de toda la ventana: ← → en cada fila de botones; ↓ de los de arriba a los del historial, de ahí a
  // "Agregar" (lo que se atiende) y a su lista; ↑ de vuelta. Enter en una cosa atendida la edita.
  const teclas = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const arriba = ventanaSuperior();
    if (arriba && !arriba.contains(document.getElementById('btn-cerrar-detalle-cliente'))) return;
    const a = document.activeElement as HTMLElement | null;
    if (!a) return;
    const enBoton = BOTONES.includes(a.id);
    const enHistorial = BOTONES_HISTORIAL.includes(a.id);
    const lista = filasBienes();
    const i = lista.indexOf(a);
    const despuesDeArriba = BOTONES_HISTORIAL[0] || (conServicios ? 'btn-nuevo-bien' : '');
    if ((enBoton || enHistorial) && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      e.preventDefault();
      const fila = enBoton ? BOTONES : BOTONES_HISTORIAL;
      const k = fila.indexOf(a.id);
      document.getElementById(fila[Math.min(Math.max(k + (e.key === 'ArrowRight' ? 1 : -1), 0), fila.length - 1)])?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (a.id === 'btn-cerrar-detalle-cliente') document.getElementById(BOTONES[0])?.focus();
      else if (enBoton) document.getElementById(despuesDeArriba)?.focus();
      else if (enHistorial && conServicios) document.getElementById('btn-nuevo-bien')?.focus();
      else if (a.id === 'btn-nuevo-bien') lista[0]?.focus();
      else if (i >= 0 && lista[i + 1]) { lista[i + 1].focus(); lista[i + 1].scrollIntoView({ block: 'nearest' }); }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (enBoton) document.getElementById('btn-cerrar-detalle-cliente')?.focus();
      else if (enHistorial) document.getElementById(BOTONES[0])?.focus();
      else if (a.id === 'btn-nuevo-bien') document.getElementById(BOTONES_HISTORIAL[0] || BOTONES[0])?.focus();
      else if (i > 0) { lista[i - 1].focus(); lista[i - 1].scrollIntoView({ block: 'nearest' }); }
      else if (i === 0) document.getElementById('btn-nuevo-bien')?.focus();
    } else if (e.key === 'Enter' && i >= 0) {
      e.preventDefault();
      const b = bienes[i];
      if (b) onEditarBien?.(b);
    }
  };

  const descEfectivo = Math.max(cliente.descuentoPorcentaje || 0, grupo?.descuentoPorcentaje || 0);
  const datos = [
    descEfectivo > 0 ? `🏷️ DESCUENTO ESPECIAL: ${descEfectivo}%${!cliente.descuentoPorcentaje && grupo?.descuentoPorcentaje ? ` (por ${grupo.nombre})` : ''}` : null,
    cliente.esMayorista ? '⭐ PRECIO MAYORISTA' : null,
    cliente.dni ? `DNI: ${cliente.dni}` : null,
    cliente.ruc ? `RUC: ${cliente.ruc}` : null,
    !cliente.dni && !cliente.ruc ? 'Sin DNI ni RUC' : null,
    cliente.telefono ? `Tel.: ${cliente.telefono}` : null,
    cliente.correo ? cliente.correo : null,
    cliente.direccion ? `Dirección: ${cliente.direccion}` : null,
    cliente.personaContacto ? `Contacto: ${cliente.personaContacto}` : null,
    cliente.diasPlazo ? `Plazo acordado: ${cliente.diasPlazo} días` : null,
  ].filter(Boolean).join(' · ');

  return (
    <>
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 font-mono" onKeyDown={teclas}>
      <div role="dialog" aria-label={`Cliente ${cliente.nombre}`}
        className="ventana-sobria bg-[var(--color-surface)] w-full max-w-6xl border-2 border-[var(--color-ink)] flex flex-col max-h-[96vh]">
        {/* CABECERA */}
        <div style={{ '--icono': 'var(--color-accent-shadow)' } as React.CSSProperties} className="ventana-cabecera bg-[var(--color-ink)] text-white px-4 sm:px-6 py-4 flex justify-between items-center gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <UserCircle size={22} className="text-[var(--color-info)] shrink-0" />
            <div className="min-w-0">
              <h2 id="titulo-detalle-cliente" className="ventana-cabecera__titulo text-sm font-black uppercase tracking-widest truncate">{cliente.nombre}</h2>
              {cliente.referencia && <p className="text-[11px] font-bold opacity-80 truncate">{cliente.referencia}</p>}
            </div>
          </div>
          <button id="btn-cerrar-detalle-cliente" onClick={onClose} title="Cerrar (Escape)"
            className="ventana-cerrar hover:text-[var(--color-danger)] focus:text-[var(--color-danger)] focus:outline-none focus:ring-2 focus:ring-[var(--color-info)] p-1 cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <CuerpoVentana>
          {/* DATOS Y BOTONES */}
          <BarraFiltros>
            <div className="flex flex-wrap gap-2">
              <button id={BOTONES[0]} type="button" onClick={() => onEditar(cliente)} className={claseBotonBarra(false)}><Edit size={14} /> Editar</button>
              {conComercio && <button id="btn-detalle-cliente-cuenta" type="button" onClick={() => onEstadoCuenta(cliente)} className={claseBotonBarra(false)}><BookOpen size={14} /> Estado de cuenta</button>}
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
              {grupo.nombre} ({grupo.tipo === 'EMPRESA' ? 'Empresa' : 'Familia'} · {miembrosGrupo} persona{miembrosGrupo === 1 ? '' : 's'}){conComercio && <> · Deuda del grupo:{' '}
              <span className={deudaGrupo > 0.05 ? 'text-[var(--color-danger)] font-black' : 'text-[var(--color-ink)] font-black'}>{soles(deudaGrupo)}</span></>}
            </p>
          )}
          {cliente.notas && (
            <p id="notas-detalle-cliente" className="text-[12px] font-bold text-[var(--color-muted)] shrink-0 whitespace-pre-line">
              <span className="font-black uppercase tracking-widest text-[var(--color-ink)]">Notas: </span>{cliente.notas}
            </p>
          )}

          {conComercio && (<>
          {/* RESUMEN MEJORADO CON COMPRAS */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 shrink-0" id="resumen-detalle-cliente">
            {[
              ['Deuda actual', soles(resumen.deuda), resumen.deuda > 0.05 ? 'text-[var(--color-danger)]' : 'text-[var(--color-ink)]'],
              ['Créditos', String(creditos.length), 'text-[var(--color-ink)]'],
              ['Total comprado', soles(resumen.totalGeneral), 'text-[var(--color-ink)]'],
              ['Última compra', fecha(resumen.ultimaFecha), 'text-[var(--color-ink)]'],
              ['Viene cada', resumen.cada === null ? '—' : `${resumen.cada} día${resumen.cada === 1 ? '' : 's'}`, 'text-[var(--color-ink)]'],
            ].map(([t, v, c]) => (
              <div key={t} className="border-2 border-[var(--color-border)] bg-white p-2 sm:p-2.5">
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

          {/* HISTORIAL: 3 botones; cada uno abre su ventana con la lista, el buscador y la fecha (12/11/2026) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 shrink-0" id="botones-historial-cliente">
            {([
              ['PENDIENTES', 'Pendientes', pendientes.length, <Clock size={20} />, pendientes.length ? `Debe ${soles(resumen.deuda)}` : 'No debe nada', pendientes.length ? 'text-[var(--color-danger)]' : 'text-[var(--color-muted)]'],
              ['PAGADOS', 'Pagados', pagados.length, <CheckCircle2 size={20} />, `Créditos cancelados · ${soles(pagados.reduce((t, f) => t + (Number(f.montoOriginal) || 0), 0))}`, 'text-[var(--color-muted)]'],
              ['COMPRAS', 'Compras', compras.length, <ShoppingBag size={20} />, `Al contado en caja · ${soles(resumen.totalCompras)}`, 'text-[var(--color-muted)]'],
            ] as const).map(([t, nombre, n, icono, detalle, color]) => (
              <button key={t} id={HISTORIAL[t]} type="button" onClick={() => setHistorial(t)} title={`Ver ${nombre.toLowerCase()} (Enter)`}
                className="group flex items-center gap-3 p-3 sm:p-4 border-2 border-[var(--color-border)] bg-white text-[var(--color-ink)] text-left cursor-pointer rounded-none outline-none transition-colors hover:border-[var(--color-ink)] focus:border-[var(--color-ink)] focus:bg-[var(--color-ink)] focus:text-white">
                <span className="w-10 h-10 shrink-0 flex items-center justify-center border-2 border-[var(--color-ink)] bg-[var(--color-bg)] text-[var(--color-ink)] shadow-[4px_4px_0_0_var(--color-accent)]">{icono}</span>
                <span className="min-w-0">
                  <span className="block text-xs font-black uppercase tracking-widest">{nombre} ({n})</span>
                  <span className={`block text-[11px] font-bold truncate group-focus:text-white/80 ${color}`}>{detalle}</span>
                </span>
              </button>
            ))}
          </div>
          </>)}

          {/* LO QUE SE ATIENDE (Talleres y servicios, de SiuMax Servic) */}
          {conServicios && (<>
            <BarraFiltros>
              <TextoBarra>Lo que se atiende ({bienes.length})</TextoBarra>
              <button id="btn-nuevo-bien" type="button" onClick={() => onNuevoBien?.(cliente)} className={claseBotonBarra(true)}>
                <Plus size={14} /> Agregar
              </button>
            </BarraFiltros>
            <CajaLista className="min-h-[160px]" vacia={!bienes.length} mensaje="Todavía no hay nada registrado: piscina, jardín, vehículo, equipo...">
              {bienes.map((b) => {
                const [tono, texto] = ESTADOS_BIEN[b.estado] || ESTADOS_BIEN.ACTIVO;
                const extra = datosDeBien(b);
                return (
                  <div key={b.id} className="border-b-2 border-[var(--color-border)] last:border-b-0">
                    <FilaLista tabIndex={0} data-bien-cliente="true" data-bien-id={b.id}
                      onClick={() => onEditarBien?.(b)} className="cursor-pointer" atenuada={b.estado === 'BAJA'}
                      icono={ICONO_BIEN[b.tipo]}
                      titulo={b.nombre}
                      subtitulo={<>
                        <LineaDato>{nombreTipoBien(b.tipo)}{extra ? ` · ${extra}` : ''}</LineaDato>
                        {b.direccion && <LineaDato titulo={b.direccion}>{b.direccion}</LineaDato>}
                      </>}
                      centro={<Etiqueta tono={tono}>{texto}</Etiqueta>}
                      derecha={<>
                        {b.ubicacion && (
                          <a href={b.ubicacion} target="_blank" rel="noopener noreferrer" tabIndex={-1} onClick={(e) => e.stopPropagation()}
                            title="Ver ubicación" className="p-2 text-[var(--color-info)] hover:text-[var(--color-ink)]"><MapPin size={18} /></a>
                        )}
                        <Edit size={18} className="text-[var(--color-subtle)]" />
                      </>}
                    />
                  </div>
                );
              })}
            </CajaLista>
          </>)}
        </CuerpoVentana>

      </div>
    </div>

    {/* Ventana del historial: aparte, sobre esta (Escape la cierra primero) */}
    <ModalHistorialCliente tipo={historial} clienteNombre={cliente.nombre} pendientes={pendientes} pagados={pagados} compras={compras} onClose={cerrarHistorial} />
    </>
  );
};

