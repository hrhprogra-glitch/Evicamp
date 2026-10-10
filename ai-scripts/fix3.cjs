const fs = require('fs');
let c = fs.readFileSync('src/sections/Finanzas/components/ModalDetalleCaja.tsx', 'utf-8');

// Cambiar el tipo de tabSeleccionado
c = c.replace(
  /useState<'VENTAS' \| 'MOVIMIENTOS'>\('VENTAS'\);/,
  `useState<'VENTAS' | 'MOV_INTERNO' | 'MOV_EXTERNO'>('VENTAS');`
);

// Quitar el filtro .eq('flujo', 'INTERNO') en la consulta
c = c.replace(
  /\.eq\('session_id', String\(caja\.id\)\)\s*\.eq\('flujo', 'INTERNO'\)\s*\.order\('created_at'\);/,
  `.eq('session_id', String(caja.id))\n      .order('created_at');`
);

// Identificar los movimientos
c = c.replace(
  /const totalMovimientos = movimientos\.reduce\(\(a, m\) => a \+ \(m\.type === 'INGRESO' \? Number\(m\.amount\) : -Number\(m\.amount\)\), 0\);/,
  `const movsInternos = movimientos.filter(m => m.flujo === 'INTERNO');
  const movsExternos = movimientos.filter(m => m.flujo === 'EXTERNO');
  const totalInternos = movsInternos.reduce((a, m) => a + (m.type === 'INGRESO' ? Number(m.amount) : -Number(m.amount)), 0);
  const totalExternos = movsExternos.reduce((a, m) => a + (m.type === 'INGRESO' ? Number(m.amount) : -Number(m.amount)), 0);`
);

// Reemplazar la sección de TABS
const tabsRegex = /<div className="flex gap-2 border-b-2 border-\[var\(--color-ink\)\] mb-4 shrink-0">[\s\S]*?<\/button>\s*<\/div>/;
c = c.replace(tabsRegex, `<div className="flex gap-2 border-b-2 border-[var(--color-ink)] mb-4 shrink-0">
                <button
                  onClick={() => setTabSeleccionado('VENTAS')}
                  className={\`flex-1 py-2 font-black text-xs uppercase tracking-widest transition-colors border-b-4 \${tabSeleccionado === 'VENTAS' ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]' : 'bg-transparent text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)] border-transparent'}\`}
                >
                  Ventas ({ventasValidas.length})
                </button>
                <button
                  onClick={() => setTabSeleccionado('MOV_INTERNO')}
                  className={\`flex-1 py-2 font-black text-xs uppercase tracking-widest transition-colors border-b-4 \${tabSeleccionado === 'MOV_INTERNO' ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]' : 'bg-transparent text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)] border-transparent'}\`}
                >
                  Mov. Internos ({movsInternos.length})
                </button>
                <button
                  onClick={() => setTabSeleccionado('MOV_EXTERNO')}
                  className={\`flex-1 py-2 font-black text-xs uppercase tracking-widest transition-colors border-b-4 \${tabSeleccionado === 'MOV_EXTERNO' ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]' : 'bg-transparent text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)] border-transparent'}\`}
                >
                  Mov. Externos ({movsExternos.length})
                </button>
              </div>`);

// Reemplazar el tab de MOVIMIENTOS por MOV_INTERNO y MOV_EXTERNO
const movsSectionRegex = /\{tabSeleccionado === 'MOVIMIENTOS' && \([\s\S]*?<\/div>\n\s*\)\}/;
c = c.replace(movsSectionRegex, `{tabSeleccionado === 'MOV_INTERNO' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {movsInternos.length === 0 ? (
                    <p className="text-sm font-bold text-[var(--color-muted)] uppercase text-center py-8">No hubo movimientos internos en esta caja.</p>
                  ) : (
                    <>
                      <div className="border-2 border-[var(--color-border)]">
                        {movsInternos.map(m => (
                          <div key={m.id} className="flex justify-between items-center gap-2 p-2.5 border-b border-[var(--color-border)] last:border-b-0 text-sm">
                            <span className="font-bold text-[var(--color-muted)] shrink-0">{new Date(m.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span>
                            <span className="font-black uppercase text-[var(--color-ink)] flex-1">{m.description}</span>
                            <span className={\`font-black shrink-0 \${m.type === 'INGRESO' ? 'text-[var(--color-accent)]' : 'text-[var(--color-danger)]'}\`}>
                              {m.type === 'INGRESO' ? '+' : '-'} S/ {Number(m.amount).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between p-2.5 bg-[var(--color-bg)] border-2 border-t-0 border-[var(--color-border)] text-sm font-black uppercase mt-4">
                        <span>Total Internos</span>
                        <span className={totalInternos >= 0 ? 'text-[var(--color-accent)]' : 'text-[var(--color-danger)]'}>S/ {totalInternos.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {tabSeleccionado === 'MOV_EXTERNO' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {movsExternos.length === 0 ? (
                    <p className="text-sm font-bold text-[var(--color-muted)] uppercase text-center py-8">No hubo movimientos externos en esta caja.</p>
                  ) : (
                    <>
                      <div className="border-2 border-[var(--color-border)]">
                        {movsExternos.map(m => (
                          <div key={m.id} className="flex justify-between items-center gap-2 p-2.5 border-b border-[var(--color-border)] last:border-b-0 text-sm">
                            <span className="font-bold text-[var(--color-muted)] shrink-0">{new Date(m.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span>
                            <span className="font-black uppercase text-[var(--color-ink)] flex-1">{m.description}</span>
                            <span className={\`font-black shrink-0 \${m.type === 'INGRESO' ? 'text-[var(--color-accent)]' : 'text-[var(--color-danger)]'}\`}>
                              {m.type === 'INGRESO' ? '+' : '-'} S/ {Number(m.amount).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between p-2.5 bg-[var(--color-bg)] border-2 border-t-0 border-[var(--color-border)] text-sm font-black uppercase mt-4">
                        <span>Total Externos</span>
                        <span className={totalExternos >= 0 ? 'text-[var(--color-accent)]' : 'text-[var(--color-danger)]'}>S/ {totalExternos.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </div>
              )}`);

fs.writeFileSync('src/sections/Finanzas/components/ModalDetalleCaja.tsx', c);
