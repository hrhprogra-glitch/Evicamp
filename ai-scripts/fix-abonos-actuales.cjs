const fs = require('fs');

let code = fs.readFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', 'utf-8');

const targetStr = `                  <div className="flex justify-between text-[var(--color-danger)] opacity-80 border-t border-[var(--color-danger)]/20 pt-2 mt-2 text-xs font-black uppercase tracking-widest">
                    <span>Total Abonado (Global)</span>
                    <span>S/ {cliente.totalPagado.toFixed(2)}</span>
                  </div>`;

const newStr = `                  <div className="flex justify-between text-[var(--color-danger)] opacity-80 border-t border-[var(--color-danger)]/20 pt-2 mt-2 text-xs font-black uppercase tracking-widest">
                    <span>Abonos en estas deudas</span>
                    <span>S/ {cliente.fiados.filter(f => f.saldoPendiente > 0).reduce((acc, f) => acc + (f.montoPagado || 0), 0).toFixed(2)}</span>
                  </div>`;

code = code.replace(targetStr, newStr);

fs.writeFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', code);
console.log('Fixed abonos calculados');
