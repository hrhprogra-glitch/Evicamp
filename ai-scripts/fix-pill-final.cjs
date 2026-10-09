const fs = require('fs');

let code = fs.readFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', 'utf-8');

const regex = /<span style=\{\{ backgroundColor: 'red', color: 'white', padding: '5px', fontSize: '20px', fontWeight: 'bold' \}\}>\r?\n?\s*PRUEBA GIGANTE ROJA \{fiado\.montoPagado\}\r?\n?\s*<\/span>/;

const replace = `{(fiado.montoPagado || 0) > 0 && (
  <span className="ml-auto bg-[var(--color-success)] text-white border border-[var(--color-success)] px-2 py-0.5 uppercase tracking-widest font-black text-[10px]" title="Tiene un historial de abonos en esta deuda">
    ABONOS: S/ {(fiado.montoPagado || 0).toFixed(2)}
  </span>
)}`;

if (regex.test(code)) {
  code = code.replace(regex, replace);
  fs.writeFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', code);
  console.log("Restored small green pill aligned to the right!");
} else {
  console.log("Regex not found.");
}
