const fs = require('fs');
let code = fs.readFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', 'utf-8');

const targetStr = `                    {fiado.montoPagado > 0 && (
                      <div className="flex justify-end gap-3 text-[10px] font-black uppercase tracking-widest text-[var(--color-subtle)] mb-1">
                        <span>Original: S/ {fiado.montoOriginal.toFixed(2)}</span>
                        <span className="text-[var(--color-success)]">Abonado: S/ {fiado.montoPagado.toFixed(2)}</span>
                      </div>
                    )}`;

const newStr = `                    {fiado.montoPagado > 0 && fiado.pagos && fiado.pagos.length > 0 && (
                      <div className="flex flex-col mb-2 border border-dashed border-[var(--color-success)] bg-[var(--color-bg)] p-2">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-[var(--color-success)] mb-1">
                          <span>Historial de Abonos:</span>
                          <span>Total: S/ {fiado.montoPagado.toFixed(2)}</span>
                        </div>
                        {fiado.pagos.map((p, pIdx) => (
                          <div key={pIdx} className="flex justify-between text-[10px] font-bold text-[var(--color-ink)] opacity-80 pl-2">
                            <span>- {new Date(p.fecha).toLocaleString()} ({p.metodo})</span>
                            <span>S/ {p.monto.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}`;

code = code.replace(targetStr, newStr);

fs.writeFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', code);
console.log('Added detailed partial payment history');
