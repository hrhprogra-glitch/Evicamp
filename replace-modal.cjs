const fs = require('fs');
let code = fs.readFileSync('src/sections/Fiados/components/ModalClientes.tsx', 'utf-8');

const target = '                    fiadosDelCliente.map(f => (\n' +
'                      <div key={f.id} role="button" tabIndex={0} className="bg-white border-2 border-[var(--color-ink)] p-4 flex focus:outline-none focus:ring-2 focus:ring-[var(--color-info)] justify-between items-center shadow-[4px_4px_0_0_var(--color-border)]">\n' +
'                        <div>\n' +
'                          <p className="text-sm font-black text-[var(--color-ink)] uppercase">Fecha: {new Date(f.fechaEmision).toLocaleDateString()}</p>\n' +
'                          <p className="text-xs font-bold mt-1">\n' +
'                            Estado: <span className={`px-2 py-1 ml-1 ${f.estado === \'PAGADO\' ? \'bg-[var(--color-accent-bg)] text-[var(--color-accent)] border border-[var(--color-accent)]\' : \'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border border-[var(--color-danger)]\'}`}>\n' +
'                              {f.estado}\n' +
'                            </span>\n' +
'                          </p>\n' +
'                        </div>\n' +
'                        <div className="text-right flex flex-col gap-1">\n' +
'                          <p className="text-sm font-black text-[var(--color-muted)]">Deuda Total: <span className="text-[var(--color-ink)]">S/ {f.montoOriginal.toFixed(2)}</span></p>\n' +
'                          <p className="text-lg font-black text-[var(--color-danger)]">Debe: S/ {f.saldoPendiente.toFixed(2)}</p>\n' +
'                        </div>\n' +
'                      </div>\n' +
'                    ))';

const replacement = '                    fiadosDelCliente.map(f => (\n' +
'                      <div key={f.id} role="button" tabIndex={0} className="bg-white border-2 border-[var(--color-ink)] p-4 flex flex-col focus:outline-none focus:ring-2 focus:ring-[var(--color-info)] shadow-[4px_4px_0_0_var(--color-border)] gap-3">\n' +
'                        <div className="flex justify-between items-center">\n' +
'                          <div>\n' +
'                            <p className="text-sm font-black text-[var(--color-ink)] uppercase">Fecha: {new Date(f.fechaEmision).toLocaleDateString()}</p>\n' +
'                            <p className="text-xs font-bold mt-1">\n' +
'                              Estado: <span className={`px-2 py-1 ml-1 ${f.estado === \'PAGADO\' ? \'bg-[var(--color-accent-bg)] text-[var(--color-accent)] border border-[var(--color-accent)]\' : \'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border border-[var(--color-danger)]\'}`}>\n' +
'                                {f.estado}\n' +
'                              </span>\n' +
'                            </p>\n' +
'                          </div>\n' +
'                          <div className="text-right flex flex-col gap-1">\n' +
'                            <p className="text-sm font-black text-[var(--color-muted)]">Deuda Total: <span className="text-[var(--color-ink)]">S/ {f.montoOriginal.toFixed(2)}</span></p>\n' +
'                            <p className="text-lg font-black text-[var(--color-danger)]">Debe: S/ {f.saldoPendiente.toFixed(2)}</p>\n' +
'                          </div>\n' +
'                        </div>\n' +
'                        {/* LISTA DE PRODUCTOS DEL FIADO */}\n' +
'                        <div className="flex flex-col gap-1 border-t-2 border-dashed border-[var(--color-border)] pt-3 mt-1">\n' +
'                          <p className="text-xs font-black uppercase text-[var(--color-muted)] mb-1">Productos Sacados:</p>\n' +
'                          {f.detalles && f.detalles.length > 0 ? f.detalles.map((det, idx) => (\n' +
'                            <div key={idx} className="flex justify-between text-xs font-bold text-[var(--color-subtle)]">\n' +
'                              <span>{det.qty} x {det.name}</span>\n' +
'                              <span>S/ {Number(det.subtotal).toFixed(2)}</span>\n' +
'                            </div>\n' +
'                          )) : (\n' +
'                            <p className="text-xs text-[var(--color-subtle)] italic">No hay productos registrados.</p>\n' +
'                          )}\n' +
'                        </div>\n' +
'                      </div>\n' +
'                    ))';

code = code.replace(target, replacement);
fs.writeFileSync('src/sections/Fiados/components/ModalClientes.tsx', code);
