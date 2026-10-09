const fs = require('fs');

let code = fs.readFileSync('src/sections/Fiados/components/ModalClientes.tsx', 'utf-8');

// 1. Add historialTab state
const stateRegex = /const \[historialSearchDate, setHistorialSearchDate\] = useState\(''\);\r?\n?\s*const \[expandedHistorialIds, setExpandedHistorialIds\] = useState<Set<string>>\(new Set\(\)\);/;
const stateReplace = `const [historialSearchDate, setHistorialSearchDate] = useState('');
  const [expandedHistorialIds, setExpandedHistorialIds] = useState<Set<string>>(new Set());
  const [historialTab, setHistorialTab] = useState<'PENDIENTES' | 'PAGADAS'>('PENDIENTES');`;

if (stateRegex.test(code)) code = code.replace(stateRegex, stateReplace);

// 2. Filter fiadosHistorial by tab
const filterRegex = /let fiadosHistorial = fiadosDelCliente;\r?\n?\s*if \(historialSearchDate\) \{/;
const filterReplace = `let fiadosHistorial = fiadosDelCliente.filter(f => historialTab === 'PENDIENTES' ? f.saldoPendiente > 0 : f.saldoPendiente <= 0);
  if (historialSearchDate) {`;

if (filterRegex.test(code)) code = code.replace(filterRegex, filterReplace);

// 3. Add Tab Toggle UI in HISTORIAL view
const tabUiRegex = /<div className="shrink-0 border-b-2 border-\[var\(--color-border\)\] pb-4">\r?\n?\s*<button onClick=\{\(\) => setView\('LISTA'\)\} className="flex items-center gap-2 text-xs font-black uppercase text-\[var\(--color-subtle\)\] hover:text-\[var\(--color-info\)\] transition-colors">\r?\n?\s*<ArrowLeft size=\{16\} \/>\r?\n?\s*Volver al Directorio\r?\n?\s*<\/button>\r?\n?\s*<\/div>/;
const tabUiReplace = `<div className="shrink-0 border-b-2 border-[var(--color-border)] pb-4 flex justify-between items-center">
                  <button onClick={() => setView('LISTA')} className="flex items-center gap-2 text-xs font-black uppercase text-[var(--color-subtle)] hover:text-[var(--color-info)] transition-colors">
                    <ArrowLeft size={16} /> Volver al Directorio
                  </button>
                  <div className="flex bg-[var(--color-surface)] border-2 border-[var(--color-ink)] p-1">
                    <button onClick={() => setHistorialTab('PENDIENTES')} className={\`px-4 py-1 text-xs font-black uppercase tracking-widest transition-colors \${historialTab === 'PENDIENTES' ? 'bg-[var(--color-ink)] text-white' : 'text-[var(--color-subtle)] hover:text-[var(--color-ink)]'}\`}>PENDIENTES</button>
                    <button onClick={() => setHistorialTab('PAGADAS')} className={\`px-4 py-1 text-xs font-black uppercase tracking-widest transition-colors \${historialTab === 'PAGADAS' ? 'bg-[var(--color-ink)] text-white' : 'text-[var(--color-subtle)] hover:text-[var(--color-ink)]'}\`}>PAGADAS</button>
                  </div>
                </div>`;

if (tabUiRegex.test(code)) code = code.replace(tabUiRegex, tabUiReplace);

// 4. Add "Historial de Pagos" inside the expanded view
const expandRegex = /\{\/\* PRODUCTOS \(COLAPSABLE\) \*\/\}\r?\n?\s*\{expandedHistorialIds\.has\(f\.id\.toString\(\)\) && f\.detalles && f\.detalles\.length > 0 && \([\s\S]*?<\/div>\r?\n?\s*\)\}/;
const expandReplace = `{/* PRODUCTOS Y PAGOS (COLAPSABLE) */}
                          {expandedHistorialIds.has(f.id.toString()) && (
                            <div className="flex flex-col gap-4 border-t-2 border-dashed border-[var(--color-border)] pt-4 mt-2 w-full">
                              {f.detalles && f.detalles.length > 0 && (
                                <div className="flex flex-col gap-1">
                                  <p className="text-[11px] font-black uppercase text-[var(--color-muted)] mb-1">Productos Sacados:</p>
                                  {f.detalles.map((det, i) => (
                                    <div key={i} className="flex justify-between text-xs font-bold text-[var(--color-subtle)]">
                                      <span>{det.qty} x {det.name}</span>
                                      <span>S/ {Number(det.subtotal).toFixed(2)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {f.pagos && f.pagos.length > 0 && (
                                <div className="flex flex-col gap-1 border-t border-[var(--color-line-light)] pt-2 mt-2">
                                  <p className="text-[11px] font-black uppercase text-[var(--color-success)] mb-1">Historial de Abonos a esta deuda:</p>
                                  {f.pagos.map((pago, i) => (
                                    <div key={i} className="flex justify-between items-center text-[10px] font-bold text-[var(--color-subtle)]">
                                      <div className="flex items-center gap-2">
                                        <span className="bg-[var(--color-surface)] px-2 py-0.5 border border-[var(--color-border)]">{new Date(pago.fecha).toLocaleString('es-PE')}</span>
                                        <span className="uppercase">{pago.metodo}</span>
                                      </div>
                                      <span className="text-[var(--color-success)] font-black">+ S/ {Number(pago.monto).toFixed(2)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {(!f.pagos || f.pagos.length === 0) && (
                                <div className="flex flex-col gap-1 border-t border-[var(--color-line-light)] pt-2 mt-2">
                                  <p className="text-[10px] font-bold uppercase text-[var(--color-muted)] italic">No se han registrado abonos para esta deuda.</p>
                                </div>
                              )}
                            </div>
                          )}`;

if (expandRegex.test(code)) code = code.replace(expandRegex, expandReplace);

// 5. Change "Click para ver productos" to "Click para ver detalles"
const clickRegex = /Click para ver productos/g;
code = code.replace(clickRegex, "Click para ver detalles y abonos");

fs.writeFileSync('src/sections/Fiados/components/ModalClientes.tsx', code);
console.log("Updated ModalClientes with Tabs and Payment History!");
