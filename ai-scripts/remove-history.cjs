const fs = require('fs');
let code = fs.readFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', 'utf-8');

const targetStr = `<h1 className="text-5xl font-black text-[var(--color-danger)] drop-shadow-md mb-4">S/ {cliente.totalPendiente.toFixed(2)}</h1>
                <div className="flex flex-col gap-2 text-xs font-black uppercase tracking-widest">
                  <div className="flex justify-between text-[var(--color-ink)] opacity-70 border-b border-[var(--color-ink)]/20 pb-1">
                    <span>Deuda Original Histórica</span>
                    <span>S/ {cliente.totalOriginal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[var(--color-success)] border-b border-[var(--color-success)]/20 pb-1">
                    <span>Total Abonado (Global)</span>
                    <span>S/ {cliente.totalPagado.toFixed(2)}</span>
                  </div>
                </div>`;

const newStr = `<h1 className="text-5xl font-black text-[var(--color-danger)] drop-shadow-md">S/ {cliente.totalPendiente.toFixed(2)}</h1>`;

code = code.replace(targetStr, newStr);

fs.writeFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', code);
console.log('Removed global historical details');
