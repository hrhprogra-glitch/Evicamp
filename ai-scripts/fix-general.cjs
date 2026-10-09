const fs = require('fs');

let code = fs.readFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', 'utf-8');

const regex = /<p className="text-\[var\(--color-danger\)\] font-black uppercase tracking-widest text-\[10px\] opacity-70">Deuda Original Inicial<\/p>\r?\n?\s*<p className="text-lg font-black text-\[var\(--color-danger\)\] opacity-70">S\/ \{cliente\.fiados\.filter\(f => f\.saldoPendiente > 0\)\.reduce\(\(acc, f\) => acc \+ \(f\.montoOriginal \|\| 0\), 0\)\.toFixed\(2\)\}<\/p>\r?\n?\s*<\/div>\r?\n?\s*<div className="flex flex-col text-right">\r?\n?\s*<p className="text-\[var\(--color-success\)\] font-black uppercase tracking-widest text-\[10px\] opacity-70">Total Abonos<\/p>\r?\n?\s*<p className="text-lg font-black text-\[var\(--color-success\)\] opacity-70">- S\/ \{cliente\.fiados\.filter\(f => f\.saldoPendiente > 0\)\.reduce\(\(acc, f\) => acc \+ \(f\.montoPagado \|\| 0\), 0\)\.toFixed\(2\)\}<\/p>/;

if (regex.test(code)) {
  code = code.replace(regex, `<p className="text-[var(--color-danger)] font-black uppercase tracking-widest text-[10px] opacity-70">Total Histórico</p>
                    <p className="text-lg font-black text-[var(--color-danger)] opacity-70">S/ {cliente.totalOriginal.toFixed(2)}</p>
                  </div>
                  <div className="flex flex-col text-right">
                    <p className="text-[var(--color-success)] font-black uppercase tracking-widest text-[10px] opacity-70">Total Abonado</p>
                    <p className="text-lg font-black text-[var(--color-success)] opacity-70">- S/ {cliente.totalPagado.toFixed(2)}</p>`);
  fs.writeFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', code);
  console.log("Replaced to make it general!");
} else {
  console.log("Not found.");
}
