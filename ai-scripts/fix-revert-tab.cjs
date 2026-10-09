const fs = require('fs');

let code = fs.readFileSync('src/sections/Fiados/components/ModalClientes.tsx', 'utf-8');

// 1. Revert historialTab
const stateRegex = /const \[historialTab, setHistorialTab\] = useState<'PENDIENTES' \| 'PAGADAS' \| 'PAGOS'>\('PENDIENTES'\);/;
if (stateRegex.test(code)) code = code.replace(stateRegex, "const [historialTab, setHistorialTab] = useState<'PENDIENTES' | 'PAGADAS'>('PENDIENTES');");

// 2. Fix filter logic
const filterRegex = /\.filter\(f => historialTab === 'PENDIENTES' \? f\.saldoPendiente > 0 : f\.saldoPendiente <= 0\)/;
if (filterRegex.test(code)) code = code.replace(filterRegex, ".filter(f => historialTab === 'PENDIENTES' ? f.estado !== 'PAGADO' : f.estado === 'PAGADO')");

// 3. Revert the VISTA HISTORIAL block
const blockRegex = /\{\/\* VISTA HISTORIAL \*\/\}\r?\n?\s*\{view === 'HISTORIAL' && \([\s\S]*?\}\r?\n?\s*<\/div>\r?\n?\s*<\/div>\r?\n?\s*<\/div>\r?\n?\s*\);\r?\n?\s*\};/m;

const replaceBlock = `{/* VISTA HISTORIAL */}
          {view === 'HISTORIAL' && (
            <div className="flex flex-col gap-6 h-full">
              {/* BOTÓN VOLVER PROMINENTE */}
              <div className="shrink-0 border-b-2 border-[var(--color-border)] pb-4 flex justify-between items-center">
                <button onClick={() => setView('LISTA')} className="flex items-center gap-2 text-xs font-black uppercase text-[var(--color-subtle)] hover:text-[var(--color-info)] transition-colors">
                  <ArrowLeft size={16} /> Volver al Directorio
                </button>
                <div className="flex bg-[var(--color-surface)] border-2 border-[var(--color-ink)] p-1">
                  <button onClick={() => setHistorialTab('PENDIENTES')} className={\`px-4 py-1 text-xs font-black uppercase tracking-widest transition-colors \${historialTab === 'PENDIENTES' ? 'bg-[var(--color-ink)] text-white' : 'text-[var(--color-subtle)] hover:text-[var(--color-ink)]'}\`}>PENDIENTES</button>
                  <button onClick={() => setHistorialTab('PAGADAS')} className={\`px-4 py-1 text-xs font-black uppercase tracking-widest transition-colors \${historialTab === 'PAGADAS' ? 'bg-[var(--color-ink)] text-white' : 'text-[var(--color-subtle)] hover:text-[var(--color-ink)]'}\`}>PAGADAS</button>
                </div>
              </div>

              {/* BUSCADOR DE HISTORIAL */}
              <div className="flex flex-wrap gap-4 bg-[var(--color-surface)] p-3 border-2 border-[var(--color-border)] shrink-0">
                <div className="relative flex-1 min-w-[200px]">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-subtle)]" />
                  <input autoComplete="off" id="buscador-historial-clientes" type="text" value={historialSearchProd}
                    onChange={(e) => setHistorialSearchProd(e.target.value)}
                    placeholder="Buscar producto o monto..." 
                    className="w-full bg-white border-2 border-[var(--color-border)] pl-9 pr-4 py-2 text-xs font-black uppercase outline-none focus:border-[var(--color-info)] transition-colors rounded-none" 
                  />
                </div>
                <input autoComplete="off" type="date" value={historialSearchDate}
                  onChange={(e) => setHistorialSearchDate(e.target.value)}
                  className="w-full sm:w-auto border-2 border-[var(--color-border)] px-4 py-2 text-xs font-black uppercase text-[var(--color-ink)] outline-none cursor-pointer bg-white rounded-none"
                />
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
`;

if (blockRegex.test(code)) code = code.replace(blockRegex, replaceBlock);

fs.writeFileSync('src/sections/Fiados/components/ModalClientes.tsx', code);
console.log("Reverted tab 3 and fixed PENDIENTES filter logic!");
