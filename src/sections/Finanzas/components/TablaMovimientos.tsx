// src/sections/Finanzas/components/TablaMovimientos.tsx
import React, { useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Trash2, Eye, RotateCcw, Receipt } from 'lucide-react';
import type { UnifiedItem } from '../types';
import { clicConTeclado } from '../../../utils/clicConTeclado';
import { usePermiso, avisar, avisarSinPermiso } from '../../../utils/permisos';

interface Props {
  movimientos: UnifiedItem[];
  onDelete: (id: string, isTicket: boolean) => void;
  onVerTicket: (id: string) => void;
  onAnularTicket: (id: string) => void;
  idsAnulando?: Set<string>;
}

export const TablaMovimientos: React.FC<Props> = ({ movimientos, onDelete, onVerTicket, onAnularTicket, idsAnulando }) => {
  const esAdmin = usePermiso('sistema_acceso_total');

  return (
    <div className="w-full bg-white flex flex-col font-mono">
      <div className="overflow-x-auto w-full custom-scrollbar">
        <table id="tabla-movimientos-caja" className="w-full text-left border-collapse min-w-full">
          <thead className="bg-[var(--color-ink)] text-white sticky top-0 z-10">
            <tr>
              <th className="p-2.5 sm:p-3 text-[11px] font-black tracking-widest uppercase border-b-2 border-[var(--color-ink)] md:whitespace-nowrap w-[90px] md:w-[150px]">Fecha y Hora</th>
              <th className="p-2.5 sm:p-3 text-[11px] font-black tracking-widest uppercase border-b-2 border-[var(--color-ink)]">Nro. Ticket / Detalle</th>
              <th className="hidden md:table-cell p-2.5 sm:p-3 text-[11px] font-black tracking-widest uppercase border-b-2 border-[var(--color-ink)] whitespace-nowrap text-center w-[80px]">Pago</th>
              <th className="p-2.5 sm:p-3 text-[11px] font-black tracking-widest uppercase border-b-2 border-[var(--color-ink)] whitespace-nowrap text-center w-[110px]">Estado</th>
              <th className="hidden md:table-cell p-2.5 sm:p-3 text-[11px] font-black tracking-widest uppercase border-b-2 border-[var(--color-ink)] text-right whitespace-nowrap w-[90px]">Pagado</th>
              <th className="hidden md:table-cell p-2.5 sm:p-3 text-[11px] font-black tracking-widest uppercase border-b-2 border-[var(--color-ink)] text-right whitespace-nowrap w-[80px]">Deuda</th>
              <th className="p-2.5 sm:p-3 text-[11px] font-black tracking-widest uppercase border-b-2 border-[var(--color-ink)] text-right whitespace-nowrap w-[95px]">Total</th>
              <th className="p-2.5 sm:p-3 text-[11px] font-black tracking-widest uppercase border-b-2 border-[var(--color-ink)] text-center whitespace-nowrap w-[95px]">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {movimientos.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-3 lg:p-4 text-center text-[var(--color-muted)] font-bold text-xs uppercase bg-[var(--color-surface)]">
                  No hay datos registrados.
                </td>
              </tr>
            ) : (
              movimientos.map((item) => (
                <tr 
                  key={item.id} 
                  data-row="true"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      if (item.isTicket) {
                        onVerTicket(item.id);
                      } else if (item.descripcion?.includes('ABONO DE FIADO')) {
                        alert('ℹ️ DETALLE DE ABONO\n\nEste registro es solo el PAGO de una deuda.\n\nPara ver los productos exactos que se llevó el cliente, ve a la sección de CRÉDITOS, busca al cliente y haz clic en VER HISTORIAL.\nAllí tendrás el detalle de cada ticket fiado.');
                      }
                    }
                  }}
                  onClick={() => {
                    if (item.isTicket) {
                      onVerTicket(item.id);
                    } else if (item.descripcion?.includes('ABONO DE FIADO')) {
                      alert('ℹ️ DETALLE DE ABONO\n\nEste registro es solo el PAGO de una deuda.\n\nPara ver los productos exactos que se llevó el cliente, ve a la sección de CRÉDITOS, busca al cliente y haz clic en VER HISTORIAL.\nAllí tendrás el detalle de cada ticket fiado.');
                    }
                  }}
                  className={`border-b border-[var(--color-border)] hover:bg-[var(--color-bg)] focus:bg-amber-50/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-ink)] transition-colors cursor-pointer group`}
                >
                  <td className="p-2.5 sm:p-3 text-xs font-bold text-[var(--color-muted)] md:whitespace-nowrap">
                    {new Date(item.created_at).toLocaleString('es-PE')}
                  </td>
                  
                  <td className="p-2.5 sm:p-3 text-sm font-black text-[var(--color-ink)]">
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.tipo === 'VENTA' ? (
                          <Receipt size={14} className="text-[var(--color-muted)] shrink-0" />
                        ) : item.tipo === 'INGRESO' ? (
                          <ArrowUpFromLine size={14} className="text-[var(--color-accent)] shrink-0" />
                        ) : (
                          <ArrowDownToLine size={14} className="text-[var(--color-danger)] shrink-0" />
                        )}
                        <span className="font-black tracking-wider text-xs sm:text-sm uppercase">
                          {item.isTicket ? '#' + String(item.id).slice(-6) : item.descripcion}
                        </span>
                        {item.isTicket && item.cliente_nombre && (
                          <span className="text-[10px] text-[var(--color-info)] font-bold tracking-widest uppercase bg-blue-50 px-1.5 py-0.5 border border-blue-200 whitespace-nowrap">
                            [{item.cliente_nombre}]
                          </span>
                        )}
                      </div>
                      {item.isTicket && item.vendedor && (
                        <p className="text-[11px] font-bold text-[var(--color-ink)] uppercase tracking-wide leading-tight">
                          Vendió: {item.vendedor}
                        </p>
                      )}
                      {item.isTicket && item.devolucion && (
                        <p className="text-[11px] font-bold text-[var(--color-danger)] uppercase tracking-wide leading-tight">
                          ↩ Devuelto S/ {item.devolucion.monto.toFixed(2)}{item.devolucion.autor ? ` · por ${item.devolucion.autor}` : ''}
                        </p>
                      )}
                      {item.isTicket && item.productosStr && (
                        <p 
                          className="text-[11px] font-medium text-[var(--color-muted)] normal-case line-clamp-2 leading-tight" 
                          title={item.productosStr}
                        >
                          {item.productosStr}
                        </p>
                      )}
                    </div>
                  </td>
                  
                  <td className="hidden md:table-cell p-2.5 sm:p-3 text-xs font-bold text-[var(--color-muted)] uppercase whitespace-nowrap text-center">{item.metodo_pago}</td>
                  
                  <td className="p-2.5 sm:p-3 whitespace-nowrap text-center">
                    {item.estado ? (
                      <span className={`px-2 py-0.5 text-[10px] font-black tracking-wider border rounded-none whitespace-nowrap ${
                        item.estado === 'ANULADO' ? 'bg-[var(--color-surface)] text-[var(--color-danger)] border-[var(--color-danger)]' : 'bg-[var(--color-surface)] text-[var(--color-ink)] border-[var(--color-ink)]'
                      }`}>
                        {item.estado}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-black tracking-wider border rounded-none bg-[var(--color-surface)] text-[var(--color-ink)] border-[var(--color-ink)] whitespace-nowrap">
                        COMPLETADO
                      </span>
                    )}
                  </td>

                  {/* PAGADO */}
                  <td className="hidden md:table-cell p-2.5 sm:p-3 text-right text-xs sm:text-sm font-bold text-[var(--color-muted)] whitespace-nowrap">
                    {item.isTicket ? `S/ ${Number(item.monto_pagado || 0).toFixed(2)}` : '-'}
                  </td>

                  {/* DEUDA */}
                  <td className={`hidden md:table-cell p-2.5 sm:p-3 text-right text-xs sm:text-sm font-black whitespace-nowrap ${Number(item.monto_deuda) > 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-muted)]'}`}>
                    {item.isTicket && Number(item.monto_deuda) > 0 ? `S/ ${Number(item.monto_deuda).toFixed(2)}` : '-'}
                  </td>

                  <td className={`p-2.5 sm:p-3 text-right text-xs sm:text-sm font-black tracking-tight whitespace-nowrap ${item.tipo === 'INGRESO' ? 'text-[var(--color-accent)]' : item.tipo === 'EGRESO' ? 'text-[var(--color-danger)]' : 'text-[var(--color-ink)]'}`}>
                    {item.tipo === 'INGRESO' ? '+' : item.tipo === 'EGRESO' ? '-' : ''} S/ {Number(item.monto).toFixed(2)}
                  </td>
                  
                  <td className="p-2.5 sm:p-3 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-1">
                      {item.isTicket ? (
                        <>
                          <button 
                            onClick={(e) => { e.stopPropagation(); onVerTicket(item.id); }} 
                            className="p-1.5 bg-[var(--color-surface)] text-[var(--color-ink)] border border-[var(--color-border)] hover:border-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] transition-colors cursor-pointer rounded-none" 
                            title="Ver Detalles"
                          >
                            <Eye size={14} />
                          </button>
                          {item.estado !== 'ANULADO' && ( /* sin permiso: pide la clave del administrador (Finanzas → conAutorizacion) */
                            <button
                              onClick={(e) => { e.stopPropagation(); onAnularTicket(item.id); }}
                              disabled={idsAnulando?.has(item.id)}
                              className="p-1.5 bg-[var(--color-surface)] text-[var(--color-muted)] border border-[var(--color-border)] hover:border-[var(--color-warning)] hover:text-[var(--color-warning)] focus:outline-none focus:ring-2 focus:ring-[var(--color-warning)] transition-colors cursor-pointer rounded-none disabled:opacity-40"
                              title="Anular / Devolver"
                            >
                              <RotateCcw size={14} />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Una venta no se borra: primero la devolución; y una anulada solo la borra el administrador
                              if (item.estado !== 'ANULADO') {
                                avisar('🔁 Primero haz la devolución de esta venta (botón ↺). Una venta no se borra: se anula para que el stock y la caja cuadren.');
                                return;
                              }
                              if (!esAdmin) { avisarSinPermiso('borrar ventas (solo el administrador)'); return; }
                              onDelete(item.id, true);
                            }}
                            className="p-1.5 bg-[var(--color-surface)] text-[var(--color-muted)] border border-[var(--color-border)] hover:border-[var(--color-danger)] hover:text-[var(--color-danger)] focus:outline-none focus:ring-2 focus:ring-[var(--color-danger)] transition-colors cursor-pointer rounded-none disabled:opacity-40"
                            title="Eliminar Venta"
                            disabled={idsAnulando?.has(item.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Borrar una devolución borra el registro de que salió dinero: solo el administrador
                            if (String(item.flujo) === 'DEVOLUCION' && !esAdmin) { avisarSinPermiso('borrar devoluciones (solo el administrador)'); return; }
                            onDelete(item.id, false);
                          }}
                          className="p-1.5 bg-[var(--color-surface)] text-[var(--color-muted)] border border-[var(--color-border)] hover:border-[var(--color-danger)] hover:text-[var(--color-danger)] focus:outline-none focus:ring-2 focus:ring-[var(--color-danger)] transition-colors cursor-pointer rounded-none"
                          title="Eliminar Movimiento"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};