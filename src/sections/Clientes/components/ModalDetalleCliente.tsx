// src/sections/Clientes/components/ModalDetalleCliente.tsx
// DETALLE DEL CLIENTE (fase 4.1b): Enter en un cliente de la pestaña Clientes (o "Ver historial" del estado de cuenta).
// Muestra sus datos, un resumen (deuda, créditos, total fiado, último crédito, cada cuánto viene), lo que más lleva y
// la lista de sus créditos (Enter abre el detalle de ese crédito). Botones: Editar, Estado de cuenta y Unir con otro
// cliente (para los repetidos). Las compras al contado se agregarán cuando la Caja guarde el cliente (fase 4.2).
// Teclado: ← → entre los botones de arriba, ↓ baja a los créditos, ↑ sube; Esc cierra.
import React, { useEffect, useMemo } from 'react';
import { BookOpen, Edit, GitMerge, UserCircle, X, ReceiptText } from 'lucide-react';
import type { Cliente, Fiado } from '../types';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { ventanaSuperior } from '../../../utils/ventanas';
import { CuerpoVentana, BarraFiltros, TextoBarra, CajaLista, FilaLista, LineaDato, Etiqueta, DatoFila, SeparadorLista, claseBotonBarra } from '../../../components/ListaVentana';

interface Props {
  cliente: Cliente | null;          // null = cerrada
  fiados: Fiado[];
  onClose: () => void;
  onEditar: (c: Cliente) => void;
  onEstadoCuenta: (c: Cliente) => void;
  onUnir: (c: Cliente) => void;
  onVerCredito: (f: Fiado) => void;
}

const fecha = (f?: string) => (f ? new Date(f).toLocaleDateString('es-PE') : '—');
const soles = (n: number) => `S/ ${n.toFixed(2)}`;
const BOTONES = ['btn-detalle-cliente-editar', 'btn-detalle-cliente-cuenta', 'btn-detalle-cliente-unir'];

export const ModalDetalleCliente: React.FC<Props> = ({ cliente, fiados, onClose, onEditar, onEstadoCuenta, onUnir, onVerCredito }) => {
  useCerrarConEscape(!!cliente, onClose);

  // Sus créditos: por id o, los antiguos sin id, por nombre (del más nuevo al más antiguo)
  const creditos = useMemo(() => (cliente
    ? fiados.filter((f) => (f.clienteId ? f.clienteId === cliente.id : f.clienteNombre === cliente.nombre))
      .sort((a, b) => String(b.fechaEmision).localeCompare(String(a.fechaEmision)))
    : []), [cliente, fiados]);

  const resumen = useMemo(() => {
    const deuda = creditos.reduce((t, f) => t + (Number(f.saldoPendiente) || 0), 0);
    const total = creditos.reduce((t, f) => t + (Number(f.montoOriginal) || 0), 0);
    // Cada cuánto viene: días promedio entre los DÍAS distintos en que sacó crédito (dos el mismo día = una visita)
    const dias = [...new Set(creditos.map((f) => new Date(f.fechaEmision).toDateString()).filter((d) => d !== 'Invalid Date'))]
      .map((d) => Date.parse(d)).sort((a, b) => a - b);
    const cada = dias.length >= 2 ? Math.max(1, Math.round((dias[dias.length - 1] - dias[0]) / (dias.length - 1) / 86400000)) : null;
    // Lo que más lleva (por cantidad, en sus créditos)
    const porProducto = new Map<string, number>();
    creditos.forEach((f) => (f.detalles || []).forEach((d) => porProducto.set(d.name, (porProducto.get(d.name) || 0) + (Number(d.qty) || 0))));
    const top = [...porProducto.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { deuda, total, cada, top };
  }, [creditos]);

  // Al abrir: el selector en "Editar"
  useEffect(() => {
    if (!cliente) return;
    const t = setTimeout(() => document.getElementById(BOTONES[0])?.focus(), 50);
    return () => clearTimeout(t);
  }, [cliente?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!cliente) return null;

  const filas = () => Array.from(document.querySelectorAll('[data-credito-cliente="true"]')) as HTMLElement[];
  // Teclado de toda la ventana (solo si es la de arriba: el detalle de un crédito o la ficha pueden estar encima)
  const teclas = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const arriba = ventanaSuperior();
    if (arriba && !arriba.contains(document.getElementById('btn-cerrar-detalle-cliente'))) return;
    const a = document.activeElement as HTMLElement | null;
    const enBoton = !!a && BOTONES.includes(a.id);
    const lista = filas();
    const i = a ? lista.indexOf(a) : -1;
    if (enBoton && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      e.preventDefault();
      const k = BOTONES.indexOf(a!.id);
      document.getElementById(BOTONES[Math.min(Math.max(k + (e.key === 'ArrowRight' ? 1 : -1), 0), BOTONES.length - 1)])?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (a?.id === 'btn-cerrar-detalle-cliente') document.getElementById(BOTONES[0])?.focus();
      else if (enBoton) lista[0]?.focus();
      else if (i >= 0 && lista[i + 1]) { lista[i + 1].focus(); lista[i + 1].scrollIntoView({ block: 'nearest' }); }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (enBoton) document.getElementById('btn-cerrar-detalle-cliente')?.focus();
      else if (i > 0) { lista[i - 1].focus(); lista[i - 1].scrollIntoView({ block: 'nearest' }); }
      else if (i === 0) document.getElementById(BOTONES[0])?.focus();
    } else if (e.key === 'Enter' && i >= 0) {
      e.preventDefault();
      onVerCredito(creditos[i]);
    }
  };

  const datos = [
    cliente.dni ? `${cliente.tipoDoc || 'DOC'}: ${cliente.dni}` : 'Sin documento',
    cliente.telefono ? `Tel.: ${cliente.telefono}` : null,
    cliente.direccion ? `Dirección: ${cliente.direccion}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 font-mono" onKeyDown={teclas}>
      <div role="dialog" aria-label={`Cliente ${cliente.nombre}`}
        className="bg-[var(--color-surface)] w-full max-w-5xl border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] flex flex-col h-[calc(var(--alto-pantalla)*0.94)] sm:h-[calc(var(--alto-pantalla)*0.85)]">
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
              <button id={BOTONES[2]} type="button" onClick={() => onUnir(cliente)} className={claseBotonBarra(false)}><GitMerge size={14} /> Unir con otro cliente</button>
            </div>
            <TextoBarra><span id="datos-detalle-cliente" className="text-[var(--color-ink)] normal-case">{datos}</span></TextoBarra>
          </BarraFiltros>

          {/* RESUMEN */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 shrink-0" id="resumen-detalle-cliente">
            {[
              ['Deuda actual', soles(resumen.deuda), resumen.deuda > 0.05 ? 'text-[var(--color-danger)]' : 'text-[var(--color-ink)]'],
              ['Créditos', String(creditos.length), 'text-[var(--color-ink)]'],
              ['Total fiado', soles(resumen.total), 'text-[var(--color-ink)]'],
              ['Último crédito', fecha(creditos[0]?.fechaEmision), 'text-[var(--color-ink)]'],
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

          {/* CRÉDITOS */}
          <CajaLista vacia={!creditos.length} mensaje="Este cliente todavía no tiene créditos.">
            <SeparadorLista>Créditos ({creditos.length}) · las compras al contado aparecerán cuando la Caja guarde el cliente</SeparadorLista>
            {creditos.map((f) => {
              const pagado = f.saldoPendiente <= 0.05;
              const productos = (f.detalles || []).map((d) => d.name).slice(0, 3).join(', ') + ((f.detalles || []).length > 3 ? '…' : '');
              return (
                <FilaLista key={f.id} tabIndex={0} data-credito-cliente="true" data-row="true"
                  onClick={() => onVerCredito(f)}
                  icono={<ReceiptText size={28} />}
                  titulo={`Crédito del ${fecha(f.fechaEmision)}`}
                  subtitulo={<><LineaDato titulo={productos}>{productos || 'Sin detalle de productos'}</LineaDato><LineaDato>Pagado {soles(Number(f.montoPagado) || 0)} de {soles(Number(f.montoOriginal) || 0)}</LineaDato></>}
                  centro={<Etiqueta tono={pagado ? 'verde' : 'rojo'}>{pagado ? 'Pagado' : 'Debe'}</Etiqueta>}
                  derecha={<DatoFila etiqueta="Saldo" valor={soles(Number(f.saldoPendiente) || 0)} tono={pagado ? 'normal' : 'rojo'} />}
                />
              );
            })}
          </CajaLista>
        </CuerpoVentana>
      </div>
    </div>
  );
};
