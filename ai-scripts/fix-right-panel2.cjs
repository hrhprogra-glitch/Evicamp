const fs = require('fs');

let code = fs.readFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', 'utf-8');

const regex = /<p className="text-\[var\(--color-danger\)\] font-black uppercase tracking-widest text-xs mb-2">Deuda \r?\n?Total Pendiente<\/p>\r?\n?\s*<h1 className="text-5xl font-black text-\[var\(--color-danger\)\] drop-shadow-md">S\/ \r?\n?\{cliente\.totalPendiente\.toFixed\(2\)\}<\/h1>\r?\n?\s*<div className="flex justify-between text-\[var\(--color-danger\)\] opacity-80 border-t \r?\n?border-\[var\(--color-danger\)\]\/20 pt-2 mt-2 text-xs font-black uppercase tracking-widest">\r?\n?\s*<span>Abonos en estas deudas<\/span>\r?\n?\s*<span>S\/ \{cliente\.fiados\.filter\(f => f\.saldoPendiente > 0\)\.reduce\(\(acc, f\) => acc \+ \r?\n?\(f\.montoPagado \|\| 0\), 0\)\.toFixed\(2\)\}<\/span>\r?\n?\s*<\/div>/s;


const newStr = `<div className="flex justify-between items-end mb-2">
                  <div className="flex flex-col">
                    <p className="text-[var(--color-danger)] font-black uppercase tracking-widest text-[10px] opacity-70">Deuda Original Inicial</p>
                    <p className="text-lg font-black text-[var(--color-danger)] opacity-70">S/ {cliente.fiados.filter(f => f.saldoPendiente > 0).reduce((acc, f) => acc + (f.montoOriginal || 0), 0).toFixed(2)}</p>
                  </div>
                  <div className="flex flex-col text-right">
                    <p className="text-[var(--color-success)] font-black uppercase tracking-widest text-[10px] opacity-70">Total Abonos</p>
                    <p className="text-lg font-black text-[var(--color-success)] opacity-70">- S/ {cliente.fiados.filter(f => f.saldoPendiente > 0).reduce((acc, f) => acc + (f.montoPagado || 0), 0).toFixed(2)}</p>
                  </div>
                </div>
                <div className="border-t-2 border-dashed border-[var(--color-danger)]/20 my-2"></div>
                <p className="text-[var(--color-danger)] font-black uppercase tracking-widest text-xs mb-1">Deuda Total Pendiente</p>
                <h1 className="text-5xl font-black text-[var(--color-danger)] drop-shadow-md">S/ {cliente.totalPendiente.toFixed(2)}</h1>`;


code = code.replace(
  /<div className="p-6 bg-\[var\(--color-danger-bg\)\] border-b-4 border-\[var\(--color-danger\)\]">.*?<\/div>/s,
  `<div className="p-6 bg-[var(--color-danger-bg)] border-b-4 border-[var(--color-danger)]">
                ${newStr}
              </div>`
);


fs.writeFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', code);
console.log('Fixed Right Panel layout!');
