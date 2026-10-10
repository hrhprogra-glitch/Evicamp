const fs = require('fs');
let content = fs.readFileSync('src/sections/Finanzas/components/ModalDetalleCaja.tsx', 'utf-8');

// 1. Add props
content = content.replace(
  `  caja: any;
}`,
  `  caja: any;
  onAnular?: (id: string, isTicket?: boolean) => Promise<void>;
  onDelete?: (id: string, isTicket?: boolean) => Promise<void>;
}`
);

// 2. Add imports
content = content.replace(
  `import { X, Printer, Receipt, Download, FileText, ChevronLeft } from 'lucide-react';`,
  `import { X, Printer, Receipt, Download, FileText, ChevronLeft, Eye, RotateCcw, Trash2 } from 'lucide-react';`
);

// 3. Add Component State and destructure props
content = content.replace(
  `export const ModalDetalleCaja: React.FC<Props> = ({ isOpen, onClose, caja }) => {`,
  `export const ModalDetalleCaja: React.FC<Props> = ({ isOpen, onClose, caja, onAnular, onDelete }) => {
  const [ticketSeleccionado, setTicketSeleccionado] = useState<string | null>(null);
  const [idsProcesando, setIdsProcesando] = useState<Set<string>>(new Set());`
);

// 4. Wrap handlers
content = content.replace(
  `  const handlePrint = useReactToPrint({`,
  `  const handleAnularInterno = async (id: string) => {
    if (!onAnular) return;
    if (!window.confirm('¿Estás seguro de anular/devolver este ticket?')) return;
    try {
      setIdsProcesando(prev => new Set(prev).add(id));
      await onAnular(id, true);
      await cargarResumenTicket();
    } finally {
      setIdsProcesando(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleDeleteInterno = async (id: string) => {
    if (!onDelete) return;
    if (!window.confirm('¿Eliminar este ticket permanentemente?')) return;
    try {
      setIdsProcesando(prev => new Set(prev).add(id));
      await onDelete(id, true);
      await cargarResumenTicket();
    } finally {
      setIdsProcesando(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handlePrint = useReactToPrint({`
);

// 5. Update Ventas list HTML
content = content.replace(
  `                    {ventasValidas.map(t => (
                      <div key={t.id} className="flex justify-between items-center p-2.5 border-b border-[var(--color-border)] last:border-b-0 text-sm">
                        <span className="font-bold text-[var(--color-muted)]">{new Date(t.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="font-black uppercase text-[var(--color-ink)]">{t.payment_type}</span>
                        <span className="font-black text-[var(--color-accent)]">S/ {Number(t.total).toFixed(2)}</span>
                      </div>
                    ))}`,
  `                    {ventasValidas.map(t => {
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
                    )})} `
);

// 6. Add ModalDetalleTicket
content = content.replace(
  `  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-2 sm:p-4 font-mono">`,
  `  return (
    <>
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-2 sm:p-4 font-mono">`
);

content = content.replace(
  `        ) : (
          <>
            {/* VISTA TICKET: formato angosto 80mm, vista previa antes de imprimir o descargar */}`,
  `        ) : (
          <div className="flex flex-col h-full overflow-hidden">
            {/* VISTA TICKET: formato angosto 80mm, vista previa antes de imprimir o descargar */}`
);

// Add closing tags and modal at the end
content = content.replace(
  `                  </table>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};`,
  `                  </table>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    {ticketSeleccionado && (
      <ModalDetalleTicket
        ticketId={ticketSeleccionado}
        onClose={() => setTicketSeleccionado(null)}
      />
    )}
    </>
  );
};`
);

fs.writeFileSync('src/sections/Finanzas/components/ModalDetalleCaja.tsx', content);
console.log('Done!');
