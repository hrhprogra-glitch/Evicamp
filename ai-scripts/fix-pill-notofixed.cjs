const fs = require('fs');

let code = fs.readFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', 'utf-8');

const regex = /<span className="ml-2 bg-\[var\(--color-success\)\] text-white border border-\[var\(--color-success\)\] px-2 py-0\.5 uppercase tracking-widest font-black text-\[10px\]" title="Tiene un historial de abonos en esta deuda">\r?\n?\s*ABONOS: S\/ \{fiado\.montoPagado !== undefined \? Number\(fiado\.montoPagado\)\.toFixed\(2\) : 'ERR'\}\r?\n?\s*<\/span>/;

const replace = `{(fiado.montoPagado || 0) > 0 && (
  <span className="ml-2 bg-[var(--color-success)] text-white border border-[var(--color-success)] px-2 py-0.5 uppercase tracking-widest font-black text-[10px]" title="Tiene un historial de abonos en esta deuda">
    ABONOS: S/ {fiado.montoPagado}
  </span>
)}`;

if (regex.test(code)) {
  code = code.replace(regex, replace);
  fs.writeFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', code);
  console.log("Removed toFixed(2) which might be crashing React!");
} else {
  console.log("Regex not found.");
}
