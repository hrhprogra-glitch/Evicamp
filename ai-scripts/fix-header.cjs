const fs = require('fs');

let codeClientes = fs.readFileSync('src/sections/Fiados/components/ModalClientes.tsx', 'utf-8');

const strRe = /<div className="flex flex-col flex-1 p-4 sm:p-6 overflow-hidden">\s*<div className="flex justify-between items-center mb-6 shrink-0 border-b-2 border-dashed border-\[var\(--color-border\)\] pb-4">\s*<button id="btn-volver-directorio"(.+?)<\/button>\s*<\/div>/s;

if (strRe.test(codeClientes)) {
  console.log("Matched the flex justify-between version!");
  codeClientes = codeClientes.replace(strRe, (match, btnContent) => {
    return `<div className="flex flex-col flex-1 p-4 sm:p-6 overflow-hidden">
                <div className="flex justify-between items-center mb-6 shrink-0 border-b-2 border-dashed border-[var(--color-border)] pb-4">
                  <button id="btn-volver-directorio"${btnContent}</button>
                  <div className="flex gap-6 items-center">
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-subtle)]">Deuda Original Histórica</p>
                      <p className="text-xl font-black text-[var(--color-ink)]">S/ {fiadosDelCliente.reduce((acc, f) => acc + (f.montoOriginal || 0), 0).toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-success)]">Total Abonado</p>
                      <p className="text-xl font-black text-[var(--color-success)]">S/ {fiadosDelCliente.reduce((acc, f) => acc + (f.montoPagado || 0), 0).toFixed(2)}</p>
                    </div>
                  </div>
                </div>`;
  });
} else {
  console.log("Did not match the flex justify-between version!");
}

fs.writeFileSync('src/sections/Fiados/components/ModalClientes.tsx', codeClientes);
