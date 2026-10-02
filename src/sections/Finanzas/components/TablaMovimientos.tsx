// src/sections/Finanzas/components/TablaMovimientos.tsx
import React from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Trash2 } from 'lucide-react'; // <-- Agregamos el ícono Trash2
import type { CashMovement } from '../types';

interface Props {
  movimientos: CashMovement[];
  onDelete: (id: string) => void; // <-- Avisamos a TypeScript que recibiremos esta función
}

export const TablaMovimientos: React.FC<Props> = ({ movimientos, onDelete }) => {
  return (
    <div className="w-full bg-white flex flex-col font-mono h-full overflow-hidden">
      <div className="overflow-x-auto flex-1 custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead className="bg-[var(--color-ink)] text-white sticky top-0">
            <tr>
              <th className="p-4 text-xs font-black tracking-widest uppercase border-b-2 border-[var(--color-ink)]">Hora</th>
              <th className="p-4 text-xs font-black tracking-widest uppercase border-b-2 border-[var(--color-ink)]">Tipo</th>
              <th className="p-4 text-xs font-black tracking-widest uppercase border-b-2 border-[var(--color-ink)]">Descripción</th>
              <th className="p-4 text-xs font-black tracking-widest uppercase border-b-2 border-[var(--color-ink)]">Método</th>
              <th className="p-4 text-xs font-black tracking-widest uppercase border-b-2 border-[var(--color-ink)] text-right">Monto</th>
              <th className="p-4 text-xs font-black tracking-widest uppercase border-b-2 border-[var(--color-ink)] text-center w-16">Acción</th>
            </tr>
          </thead>
          <tbody>
            {movimientos.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-3 lg:p-4 text-center text-[var(--color-muted)] font-bold text-xs uppercase">
                  No hay movimientos registrados en esta sesión.
                </td>
              </tr>
            ) : (
              movimientos.map((mov) => (
                <tr key={mov.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg)] transition-colors">
                  <td className="p-4 text-sm font-black text-[var(--color-muted)]">
                    {new Date(mov.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="p-4">
                    <span className={`flex items-center gap-2 text-xs font-black tracking-wider px-3 py-1.5 w-max border-2 rounded-none ${
                      mov.type === 'INGRESO' ? 'bg-[var(--color-accent-bg)] text-[var(--color-accent)] border-[var(--color-accent)]' : 'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border-[var(--color-danger)]'
                    }`}>
                      {mov.type === 'INGRESO' ? <ArrowUpFromLine size={14} /> : <ArrowDownToLine size={14} />}
                      {mov.type}
                    </span>
                  </td>
                  <td className="p-4 text-sm font-black text-[var(--color-ink)] uppercase">{mov.description}</td>
                  <td className="p-4 text-sm font-black text-[var(--color-muted)] uppercase">{mov.payment_type}</td>
                  <td className={`p-4 text-right text-base font-black tracking-tight ${mov.type === 'INGRESO' ? 'text-[var(--color-accent)]' : 'text-[var(--color-danger)]'}`}>
                    {mov.type === 'INGRESO' ? '+' : '-'} S/ {Number(mov.amount).toFixed(2)}
                  </td>
                  <td className="p-4 text-center">
                    {/* Los abonos de créditos no se borran aquí: se anulan desde Créditos */}
                    {String(mov.flujo) !== 'INGRESO_FIADO' && !mov.description.includes('Abono Deuda') && (
                      <button 
                        onClick={() => onDelete(mov.id)} 
                        className="p-2 text-[var(--color-subtle)] border-2 border-transparent hover:border-[var(--color-danger)] hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)] transition-colors cursor-pointer rounded-none"
                        title="Eliminar Movimiento Manual"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
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