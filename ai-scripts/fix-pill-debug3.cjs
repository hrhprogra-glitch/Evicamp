const fs = require('fs');

let code = fs.readFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', 'utf-8');

const regex = /<span className="ml-2 bg-\[var\(--color-success\)\] text-white border border-\[var\(--color-success\)\] px-2 py-0\.5 uppercase tracking-widest font-black text-\[10px\]">\r?\n?\s*ABONOS: S\/ \{fiado\.montoPagado\} \(\{\(fiado\.montoPagado \|\| 0\) > 0 \? 'YES' : 'NO'\}\)\r?\n?\s*<\/span>/;

const replace = `<span className="ml-2 bg-[var(--color-success)] text-white border border-[var(--color-success)] px-2 py-0.5 uppercase tracking-widest font-black text-[10px]">
  ABONOS: S/ {fiado.montoPagado} ({(fiado.montoPagado || 0) > 0 ? 'YES' : 'NO'})
</span>
<span style={{ backgroundColor: 'red', color: 'white', padding: '2px', fontSize: '10px' }}>
  ROJO {fiado.montoPagado}
</span>`;

if (regex.test(code)) {
  code = code.replace(regex, replace);
  fs.writeFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', code);
  console.log("Added red backup pill!");
} else {
  console.log("Regex not found.");
}
