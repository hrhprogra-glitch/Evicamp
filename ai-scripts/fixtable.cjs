const fs = require('fs');
let c = fs.readFileSync('src/sections/Finanzas/components/ModalDetalleCaja.tsx', 'utf-8');

const regexVentas = /<div className="border-2 border-\[var\(--color-border\)\]">\s*\{ventasValidas\.map\(t => \{[\s\S]*?\)\}\)}\s*<\/div>/;

const tablaVentas = `<div className="overflow-x-auto w-full custom-scrollbar">
                      <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead className="bg-[var(--color-ink)] text-white sticky top-0 z-10">
                          <tr>
                            <th className="p-3 sm:p-4 text-xs font-black tracking-widest uppercase border-b-2 border-[var(--color-ink)]">Fecha y Hora</th>
                            <th className="p-3 sm:p-4 text-xs font-black tracking-widest uppercase border-b-2 border-[var(--color-ink)]">Nro. Ticket</th>
                            <th className="p-3 sm:p-4 text-xs font-black tracking-widest uppercase border-b-2 border-[var(--color-ink)]">Pago</th>
                            <th className="p-3 sm:p-4 text-xs font-black tracking-widest uppercase border-b-2 border-[var(--color-ink)]">Estado</th>
                            <th className="p-3 sm:p-4 text-xs font-black tracking-widest uppercase border-b-2 border-[var(--color-ink)] text-right">Pagado</th>
                            <th className="p-3 sm:p-4 text-xs font-black tracking-widest uppercase border-b-2 border-[var(--color-ink)] text-right">Deuda</th>
                            <th className="p-3 sm:p-4 text-xs font-black tracking-widest uppercase border-b-2 border-[var(--color-ink)] text-right">Total</th>
                            <th className="p-3 sm:p-4 text-xs font-black tracking-widest uppercase border-b-2 border-[var(--color-ink)] text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ventasValidas.map((t) => {
                            const procesando = idsProcesando.has(t.id);
                            return (
                              <tr
                                key={t.id}
                                className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg)] transition-colors"
                              >
                                <td className="p-3 sm:p-4 text-xs font-bold text-[var(--color-muted)]">
                                  {new Date(t.created_at).toLocaleString('es-PE')}
                                </td>
                                <td className="p-3 sm:p-4 text-sm font-black text-[var(--color-ink)] uppercase">
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                      <Receipt size={14} className="text-[var(--color-muted)]" />
                                      #{String(t.id).slice(-6)}
                                    </div>
                                    {t.es_fiado && t.cliente_nombre && (
                                      <span className="text-[12px] text-[var(--color-muted)] font-bold tracking-widest">[{t.cliente_nombre}]</span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3 sm:p-4 text-xs font-bold text-[var(--color-muted)] uppercase">{t.payment_type}</td>
                                <td className="p-3 sm:p-4">
                                  <span className={\`px-2 py-1 text-[12px] font-black tracking-wider border rounded-none \${
                                    t.sunat_status === 'ANULADO' ? 'bg-[var(--color-surface)] text-[var(--color-danger)] border-[var(--color-danger)]' : 'bg-[var(--color-surface)] text-[var(--color-ink)] border-[var(--color-ink)]'
                                  }\`}>
                                    {t.sunat_status || 'COMPLETADO'}
                                  </span>
                                </td>
                                <td className="p-3 sm:p-4 text-right text-base font-bold text-[var(--color-muted)]">
                                  S/ {Number(t.monto_pagado || 0).toFixed(2)}
                                </td>
                                <td className={\`p-3 sm:p-4 text-right text-base font-black \${Number(t.monto_deuda) > 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-muted)]'}\`}>
                                  {Number(t.monto_deuda) > 0 ? \`S/ \${Number(t.monto_deuda).toFixed(2)}\` : '-'}
                                </td>
                                <td className="p-3 sm:p-4 text-right text-base font-black text-[var(--color-ink)]">
                                  S/ {Number(t.total).toFixed(2)}
                                </td>
                                <td className="p-3 sm:p-4">
                                  <div className="flex items-center justify-center gap-1">
                                    <button onClick={() => setTicketSeleccionado(t.id)} className="p-1.5 bg-[var(--color-surface)] text-[var(--color-ink)] border border-[var(--color-border)] hover:border-[var(--color-ink)] transition-colors cursor-pointer rounded-none" title="Ver Detalles">
                                      <Eye size={14} />
                                    </button>
                                    {t.sunat_status !== 'ANULADO' && onAnular && (
                                      <button
                                        onClick={() => handleAnularInterno(t.id)}
                                        disabled={procesando}
                                        className="p-1.5 bg-[var(--color-surface)] text-[var(--color-muted)] border border-[var(--color-border)] hover:border-[var(--color-warning)] hover:text-[var(--color-warning)] transition-colors cursor-pointer rounded-none disabled:opacity-40"
                                        title="Anular"
                                      >
                                        <RotateCcw size={14} />
                                      </button>
                                    )}
                                    {onDelete && (
                                      <button
                                        onClick={() => handleDeleteInterno(t.id)}
                                        disabled={procesando}
                                        className="p-1.5 bg-[var(--color-surface)] text-[var(--color-muted)] border border-[var(--color-border)] hover:border-[var(--color-danger)] hover:text-[var(--color-danger)] transition-colors cursor-pointer rounded-none disabled:opacity-40"
                                        title="Eliminar"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>`;

c = c.replace(regexVentas, tablaVentas);
fs.writeFileSync('src/sections/Finanzas/components/ModalDetalleCaja.tsx', c);
