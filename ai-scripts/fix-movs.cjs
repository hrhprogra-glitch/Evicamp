const fs = require('fs');

// 1. Modificar src/sections/Finanzas/index.tsx para incluir monto_pagado y monto_deuda
let idx = fs.readFileSync('src/sections/Finanzas/index.tsx', 'utf-8');
idx = idx.replace(
  /flujo: 'INTERNO' \/\/ Ventas siempre son del negocio\s*\};/g,
  `flujo: 'INTERNO', // Ventas siempre son del negocio
            monto_pagado: Number(t.amount_cash || 0) + Number(t.amount_yape || 0) + Number(t.amount_card || 0) + Number(t.amount_transfer || 0),
            monto_deuda: esFiado && fiado ? Number(fiado.amount) - Number(fiado.paid_amount) : 0,
            total: Number(t.total) || 0
          };`
);
fs.writeFileSync('src/sections/Finanzas/index.tsx', idx);

// 2. Modificar src/sections/Finanzas/components/TablaMovimientos.tsx para tener el mismo layout que Reportes
let tm = fs.readFileSync('src/sections/Finanzas/components/TablaMovimientos.tsx', 'utf-8');

const tableHeader = `<thead className="bg-[var(--color-ink)] text-white sticky top-0 z-10">
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
          </thead>`;

tm = tm.replace(/<thead[\s\S]*?<\/thead>/, tableHeader);

const tbodyRegex = /<tbody>[\s\S]*?<\/tbody>/;
const newTbody = `<tbody>
            {movimientos.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-3 lg:p-4 text-center text-[var(--color-muted)] font-bold text-xs uppercase bg-[var(--color-surface)]">
                  No hay datos registrados.
                </td>
              </tr>
            ) : (
              movimientos.map((item) => (
                <tr key={item.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg)] transition-colors">
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
                      <span className={\`px-2 py-1 text-[12px] font-black tracking-wider border rounded-none \${
                        item.estado === 'ANULADO' ? 'bg-[var(--color-surface)] text-[var(--color-danger)] border-[var(--color-danger)]' : 'bg-[var(--color-surface)] text-[var(--color-ink)] border-[var(--color-ink)]'
                      }\`}>
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
                    {item.isTicket ? \`S/ \${Number(item.monto_pagado || 0).toFixed(2)}\` : '-'}
                  </td>

                  {/* DEUDA */}
                  <td className={\`p-4 text-right text-base font-black \${Number(item.monto_deuda) > 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-muted)]'}\`}>
                    {item.isTicket && Number(item.monto_deuda) > 0 ? \`S/ \${Number(item.monto_deuda).toFixed(2)}\` : '-'}
                  </td>

                  <td className={\`p-4 text-right text-base font-black tracking-tight \${item.tipo === 'INGRESO' ? 'text-[var(--color-accent)]' : item.tipo === 'EGRESO' ? 'text-[var(--color-danger)]' : 'text-[var(--color-ink)]'}\`}>
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
          </tbody>`;

tm = tm.replace(tbodyRegex, newTbody);
fs.writeFileSync('src/sections/Finanzas/components/TablaMovimientos.tsx', tm);
