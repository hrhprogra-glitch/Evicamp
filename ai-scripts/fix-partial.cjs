const fs = require('fs');
let code = fs.readFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', 'utf-8');

const targetStr = `                    <div className="flex flex-col gap-1 pl-9">
                      {fiado.detalles.map((det, i) => (`;

const newStr = `                    {fiado.montoPagado > 0 && (
                      <div className="flex justify-end gap-3 text-[10px] font-black uppercase tracking-widest text-[var(--color-subtle)] mb-1">
                        <span>Original: S/ {fiado.montoOriginal.toFixed(2)}</span>
                        <span className="text-[var(--color-success)]">Abonado: S/ {fiado.montoPagado.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex flex-col gap-1 pl-9">
                      {fiado.detalles.map((det, i) => (`;

code = code.replace(targetStr, newStr);

fs.writeFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', code);
console.log('Added summary of partial payments');
