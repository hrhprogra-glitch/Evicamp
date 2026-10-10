const fs = require('fs');
const c = fs.readFileSync('src/sections/Finanzas/components/ModalDetalleCaja.tsx', 'utf-8');
const lines = c.split(/\r?\n/);

const newLines = `                    {ventasValidas.map(t => {
                      const procesando = idsProcesando.has(t.id);
                      return (
                      <div key={t.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-2.5 border-b border-[var(--color-border)] last:border-b-0 text-sm gap-2">
                        <div className="flex justify-between sm:justify-start items-center gap-4 flex-1">
                          <span className="font-bold text-[var(--color-muted)] w-16">{new Date(t.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="font-black uppercase text-[var(--color-ink)] flex-1">{t.payment_type}</span>
                          <span className="font-black text-[var(--color-accent)]">S/ {Number(t.total).toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-end gap-2 shrink-0">
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
                      </div>
                    )})} `;

lines.splice(197, 8, newLines);

fs.writeFileSync('src/sections/Finanzas/components/ModalDetalleCaja.tsx', lines.join('\\n'));
console.log('Fixed');
