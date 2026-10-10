// src/sections/Finanzas/components/TablaMovimientos.tsx
import React, { useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Trash2, Eye, RotateCcw, Receipt } from 'lucide-react';
import type { UnifiedItem } from '../types';
import { clicConTeclado } from '../../../utils/clicConTeclado';
import { usePermiso } from '../../../utils/permisos';

interface Props {
  movimientos: UnifiedItem[];
  onDelete: (id: string, isTicket: boolean) => void;
  onVerTicket: (id: string) => void;
  onAnularTicket: (id: string) => void;
  idsAnulando?: Set<string>;
}

export const TablaMovimientos: React.FC<Props> = ({ movimientos, onDelete, onVerTicket, onAnularTicket, idsAnulando }) => {
  const puedeAnular = usePermiso('reportes_anular_ventas');

  return (
    <div className="w-full bg-white flex flex-col font-mono">
      <div className="overflow-x-auto w-full custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead className="bg-[var(--color-ink)] text-white sticky top-0 z-10">
            <tr>
              <th className="p-4 text-xs font-black tracking-widest uppercase border-b-2 border-[var(--color-ink)]">Fecha y Hora</th>
              <th className="p-4 text-xs font-black tracking-widest uppercase border-b-2 border-[var(--color-ink)]">Nro. Ticket / Detalle</th>
              <th className="p-4 text-xs font-black tracking-widest uppercase border-b-2 border-[var(--color-ink)]">Pago</th>
              <th className="p-4 text-xs font-black tracking-widest uppercase border-b-2 border-[var(--color-ink)]">Estado</th>
              <th className="p-4 text-xs font-black tracking-widest uppercase border-b-2 border-[var(--color-ink)] text-right">Pagado</th>
              <th className="p-4 text-xs font-black tracking-widest uppercase border-b-2 border-[var(--color-ink)] text-right">Deuda</th>
              <th className="p-4 text-xs font-black tracking-widest uppercase border-b-2 border-[var(--color-ink)] text-right">Total</th>
              <th className="p-4 text-xs font-black tracking-widest uppercase border-b-2 border-[var(--color-ink)] text-center">Acciones</th>
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
                  onClick={() => {
                    if (item.isTicket) {
                      onVerTicket(item.id);
                    } else if (item.descripcion?.includes('ABONO DE FIADO')) {
                      alert('ℹ️ DETALLE DE ABONO\n\nEste registro es solo el PAGO de una deuda.\n\nPara ver los productos exactos que se llevó el cliente, ve a la sección de CRÉDITOS, busca al cliente y haz clic en VER HISTORIAL.\nAllí tendrás el detalle de cada ticket fiado.');
                    }
                  }}
                  className={`border-b border-[var(--color-border)] hover:bg-[var(--color-bg)] transition-colors ${item.isTicket || item.descripcion?.includes('ABONO DE FIADO') ? 'cursor-pointer' : ''}`}
                >
                  <td className="p-4 text-xs font-bold text-[var(--color-muted)]">
                    {new Date(item.created_at).toLocaleString('es-PE')}
                  </td>
                  
                  <td className="p-4 text-sm font-black text-[var(--color-ink)] uppercase">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        {item.tipo === 'VENTA' ? <Receipt size={14} className="text-[var(--color-muted)]" /> : item.tipo === 'INGRESO' ? <ArrowUpFromLine size={14} className="text-[var(--color-accent)]" /> : <ArrowDownToLine size={14} className="text-[var(--color-danger)]" />}
                        {item.isTicket ? '#' + String(item.id).slice(-6) : item.descripcion}
                      </div>
                      {item.isTicket && item.es_fiado && item.cliente_nombre && (
                        <span className="text-[12px] text-[var(--color-muted)] font-bold tracking-widest">[{item.cliente_nombre}]</span>
                      )}
                    </div>
                  </td>
                  
                  <td className="p-4 text-xs font-bold text-[var(--color-muted)] uppercase">{item.metodo_pago}</td>
                  
                  <td className="p-4">
                    {item.estado ? (
                      <span className={`px-2 py-1 text-[12px] font-black tracking-wider border rounded-none ${
                        item.estado === 'ANULADO' ? 'bg-[var(--color-surface)] text-[var(--color-danger)] border-[var(--color-danger)]' : 'bg-[var(--color-surface)] text-[var(--color-ink)] border-[var(--color-ink)]'
                      }`}>
                        {item.estado}
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-[12px] font-black tracking-wider border rounded-none bg-[var(--color-surface)] text-[var(--color-ink)] border-[var(--color-ink)]">
                        COMPLETADO
                      </span>
                    )}
                  </td>

                  {/* PAGADO */}
                  <td className="p-4 text-right text-base font-bold text-[var(--color-muted)]">
                    {item.isTicket ? `S/ ${Number(item.monto_pagado || 0).toFixed(2)}` : '-'}
                  </td>

                  {/* DEUDA */}
                  <td className={`p-4 text-right text-base font-black ${Number(item.monto_deuda) > 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-muted)]'}`}>
                    {item.isTicket && Number(item.monto_deuda) > 0 ? `S/ ${Number(item.monto_deuda).toFixed(2)}` : '-'}
                  </td>

                  <td className={`p-4 text-right text-base font-black tracking-tight ${item.tipo === 'INGRESO' ? 'text-[var(--color-accent)]' : item.tipo === 'EGRESO' ? 'text-[var(--color-danger)]' : 'text-[var(--color-ink)]'}`}>
                    {item.tipo === 'INGRESO' ? '+' : item.tipo === 'EGRESO' ? '-' : ''} S/ {Number(item.monto).toFixed(2)}
                  </td>
                  
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-1">
                      {item.isTicket ? (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); onVerTicket(item.id); }} className="p-1.5 bg-[var(--color-surface)] text-[var(--color-ink)] border border-[var(--color-border)] hover:border-[var(--color-ink)] transition-colors cursor-pointer rounded-none" title="Ver Detalles">
                            <Eye size={14} />
                          </button>
                          {item.estado !== 'ANULADO' && puedeAnular && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onAnularTicket(item.id); }}
                              disabled={idsAnulando?.has(item.id)}
                              className="p-1.5 bg-[var(--color-surface)] text-[var(--color-muted)] border border-[var(--color-border)] hover:border-[var(--color-warning)] hover:text-[var(--color-warning)] transition-colors cursor-pointer rounded-none disabled:opacity-40"
                              title="Anular / Devolver"
                            >
                              <RotateCcw size={14} />
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); onDelete(item.id, true); }}
                            className="p-1.5 bg-[var(--color-surface)] text-[var(--color-muted)] border border-[var(--color-border)] hover:border-[var(--color-danger)] hover:text-[var(--color-danger)] transition-colors cursor-pointer rounded-none disabled:opacity-40"
                            title="Eliminar Venta"
                            disabled={idsAnulando?.has(item.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelete(item.id, false); }}
                          className="p-1.5 bg-[var(--color-surface)] text-[var(--color-muted)] border border-[var(--color-border)] hover:border-[var(--color-danger)] hover:text-[var(--color-danger)] transition-colors cursor-pointer rounded-none"
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