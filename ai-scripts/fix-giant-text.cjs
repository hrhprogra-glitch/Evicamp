const fs = require('fs');

let code = fs.readFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', 'utf-8');

const regex = /<span className="ml-2 bg-\[var\(--color-success\)\] text-white border border-\[var\(--color-success\)\] px-2 py-0\.5 uppercase tracking-widest font-black text-\[10px\]" title="Tiene un historial de abonos en esta deuda">\r?\n?\s*ABONOS: S\/ \{fiado\.montoPagado !== undefined \? fiado\.montoPagado\.toFixed\(2\) : 'ERR'\}\r?\n?\s*<\/span>/;

const replace = `<span style={{ backgroundColor: 'red', color: 'white', padding: '5px', fontSize: '20px', fontWeight: 'bold' }}>
  PRUEBA GIGANTE ROJA {fiado.montoPagado}
</span>`;

if (regex.test(code)) {
  code = code.replace(regex, replace);
  fs.writeFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', code);
  console.log("Injected giant red text!");
} else {
  console.log("Regex not found. The file doesn't have the span I thought it did!");
}
