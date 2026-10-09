const fs = require('fs');

let code = fs.readFileSync('src/sections/Fiados/components/ModalClientes.tsx', 'utf-8');

// 1. Update historialTab type
const stateRegex = /const \[historialTab, setHistorialTab\] = useState<'PENDIENTES' \| 'PAGADAS'>\('PENDIENTES'\);/;
const stateReplace = `const [historialTab, setHistorialTab] = useState<'PENDIENTES' | 'PAGADAS' | 'PAGOS'>('PENDIENTES');`;
if (stateRegex.test(code)) code = code.replace(stateRegex, stateReplace);

// 2. Add the TAB button for PAGOS
const tabRegex = /<button onClick=\{\(\) => setHistorialTab\('PAGADAS'\)\}[\s\S]*?<\/button>/;
const tabReplace = `<button onClick={() => setHistorialTab('PAGADAS')} className={\`px-4 py-1 text-xs font-black uppercase tracking-widest transition-colors \${historialTab === 'PAGADAS' ? 'bg-[var(--color-ink)] text-white' : 'text-[var(--color-subtle)] hover:text-[var(--color-ink)]'}\`}>PAGADAS</button>
                    <button onClick={() => setHistorialTab('PAGOS')} className={\`px-4 py-1 text-xs font-black uppercase tracking-widest transition-colors \${historialTab === 'PAGOS' ? 'bg-[var(--color-ink)] text-white' : 'text-[var(--color-subtle)] hover:text-[var(--color-ink)]'}\`}>HISTORIAL ABONOS</button>`;
if (tabRegex.test(code)) code = code.replace(tabRegex, tabReplace);

// 3. Inject logic to render PAGOS when tab is PAGOS
// Let's find the div that renders fiadosHistorial.length === 0
const renderRegex = /<div className="grid grid-cols-1 gap-3">\r?\n?\s*\{fiadosHistorial\.length === 0 \? \([\s\S]*?<\/div>\r?\n?\s*\)\}/;

const renderReplace = `{historialTab === 'PAGOS' ? (() => {
                    const todos = fiadosDelCliente.flatMap(f => (f.pagos || []).map(p => ({ ...p, fiado: f })));
                    const groupsMap = todos.reduce((acc, p) => {
                      const k = p.metodo.includes('ANTIGUO') ? 'ANTIGUO' : (p.fecha ? p.fecha.slice(0, 16) : 'INVALID');
                      if (!acc[k]) acc[k] = [];
                      acc[k].push(p);
                      return acc;
                    }, {} as Record<string, typeof todos>);
                    
                    const groups = Object.entries(groupsMap)
                      .map(([k, arr]) => ({ key: k, items: arr }))
                      .sort((a,b) => {
                        if (a.key === 'ANTIGUO') return 1;
                        if (b.key === 'ANTIGUO') return -1;
                        return b.key.localeCompare(a.key);
                      });

                    return (
                      <div className="grid grid-cols-1 gap-3">
                        {groups.length === 0 ? (
                           <div className="bg-white border-2 border-[var(--color-border)] p-4 text-center">
                             <p className="text-[var(--color-subtle)] font-black text-sm uppercase">No se han registrado abonos.</p>
                           </div>
                        ) : groups.map(g => {
                          const total = g.items.reduce((sum, i) => sum + i.monto, 0);
                          const metodos = Array.from(new Set(g.items.map(i => i.metodo))).join(' / ');
                          const isGeneral = g.items.length > 1;
                          
                          return (
                            <div key={g.key} className="bg-white border-2 border-[var(--color-ink)] p-4 flex flex-col gap-2 shadow-[4px_4px_0_0_var(--color-border)] hover:bg-[var(--color-surface)] transition-colors">
                              <div className="flex justify-between items-start">
                                <div className="flex flex-col gap-1">
                                  <p className="text-sm font-black text-[var(--color-ink)] uppercase">
                                    {g.key === 'ANTIGUO' ? 'ABONOS DE SISTEMA ANTIGUO' : new Date(g.items[0].fecha).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <span className={\`px-2 py-0.5 text-[10px] font-black uppercase \${isGeneral ? 'bg-[var(--color-purple)] text-white' : 'bg-[var(--color-bg)] text-[var(--color-subtle)] border border-[var(--color-border)]'}\`}>
                                      {isGeneral ? 'PAGO GENERAL A MÚLTIPLES DEUDAS' : 'PAGO A DEUDA ESPECÍFICA'}
                                    </span>
                                    <span className="text-[10px] font-bold uppercase text-[var(--color-muted)]">{metodos}</span>
                                  </div>
                                </div>
                                <h3 className="text-xl font-black text-[var(--color-success)]">+ S/ {total.toFixed(2)}</h3>
                              </div>
                              
                              <div className="mt-2 pt-2 border-t border-[var(--color-line-light)] flex flex-col gap-1">
                                {g.items.map((item, idx) => (
                                  <div key={idx} className="flex justify-between items-center text-[10px] font-bold text-[var(--color-subtle)] uppercase">
                                    <span className="truncate flex-1">- Cubrió deuda del {new Date(item.fiado.fechaEmision).toLocaleDateString()}</span>
                                    <span className="text-[var(--color-success)] font-black shrink-0">S/ {item.monto.toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })() : (
                    <div className="grid grid-cols-1 gap-3">
                      {fiadosHistorial.length === 0 ? (
                        <div className="bg-white border-2 border-[var(--color-border)] p-3 lg:p-4 text-center">
                          <p className="text-[var(--color-subtle)] font-black text-sm uppercase">No se encontraron registros.</p>
                        </div>
                      ) : (
                        fiadosHistorial.map(f => (
                          <div key={f.id} data-id={f.id} role="button" tabIndex={0} onClick={() => toggleHistorial(f.id.toString())} className="bg-white border-2 border-[var(--color-ink)] p-4 flex flex-col gap-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-info)] shadow-[4px_4px_0_0_var(--color-border)] cursor-pointer hover:bg-[var(--color-bg)] transition-colors">
                            <div className="flex justify-between items-center w-full">
                              <div>
                                <p className="text-sm font-black text-[var(--color-ink)] uppercase">Fecha: {new Date(f.fechaEmision).toLocaleDateString()}</p>
                                <p className="text-xs font-bold mt-1">
                                  Estado: <span className={\`px-2 py-1 ml-1 \${f.estado === 'PAGADO' ? 'bg-[var(--color-accent-bg)] text-[var(--color-accent)] border border-[var(--color-accent)]' : 'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border border-[var(--color-danger)]'}\`}>
                                    {f.estado}
                                  </span>
                                </p>
                              </div>
                              <div className="text-right flex flex-col gap-1">
                                <p className="text-[11px] font-black uppercase text-[var(--color-muted)] tracking-widest">Monto Original: <span className="text-[var(--color-ink)] ml-1">S/ {f.montoOriginal.toFixed(2)}</span></p>
                                <p className="text-[11px] font-black uppercase text-[var(--color-success)] tracking-widest mt-1">Total Abonado: <span className="ml-1">S/ {(f.montoPagado || 0).toFixed(2)}</span></p>
                                <p className="text-sm font-black uppercase text-[var(--color-danger)] tracking-widest mt-1 border-t border-[var(--color-border)] pt-1">Debe: <span className="ml-1">S/ {f.saldoPendiente.toFixed(2)}</span></p>
                              </div>
                            </div>
    
                            {/* PRODUCTOS Y PAGOS (COLAPSABLE) */}
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
                            )}
                            {!expandedHistorialIds.has(f.id.toString()) && f.detalles && f.detalles.length > 0 && (
                              <div className="text-[10px] text-center text-[var(--color-muted)] font-bold mt-1 tracking-widest uppercase">Click para ver detalles y abonos</div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}`;

if (renderRegex.test(code)) code = code.replace(renderRegex, renderReplace);

fs.writeFileSync('src/sections/Fiados/components/ModalClientes.tsx', code);
console.log("Added HISTORIAL ABONOS tab!");
