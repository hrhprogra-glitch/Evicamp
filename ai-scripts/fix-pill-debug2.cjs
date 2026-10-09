const fs = require('fs');

let code = fs.readFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', 'utf-8');

const regex = /\{\(fiado\.montoPagado \|\| 0\) > 0 && \(\r?\n?\s*<span className="ml-2 bg-\[var\(--color-success\)\] text-white border border-\[var\(--color-success\)\] px-2 py-0\.5 uppercase tracking-widest font-black text-\[10px\]" title="Tiene un historial de abonos en esta deuda">\r?\n?\s*ABONOS: S\/ \{fiado\.montoPagado\}\r?\n?\s*<\/span>\r?\n?\s*\)\}/;

const replace = `<span className="ml-2 bg-[var(--color-success)] text-white border border-[var(--color-success)] px-2 py-0.5 uppercase tracking-widest font-black text-[10px]">
  ABONOS: S/ {fiado.montoPagado} ({(fiado.montoPagado || 0) > 0 ? 'YES' : 'NO'})
</span>`;

if (regex.test(code)) {
  code = code.replace(regex, replace);
  fs.writeFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', code);
  console.log("Replaced with unconditional debug pill!");
} else {
  console.log("Regex not found.");
}
