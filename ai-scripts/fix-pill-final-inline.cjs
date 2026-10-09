const fs = require('fs');

let code = fs.readFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', 'utf-8');

const regex = /<span className="ml-2 bg-\[var\(--color-success\)\] text-white border border-\[var\(--color-success\)\] px-2 py-0\.5 uppercase tracking-widest font-black text-\[10px\]">\r?\n?\s*ABONOS: S\/ \{fiado\.montoPagado\} \(\{\(fiado\.montoPagado \|\| 0\) > 0 \? 'YES' : 'NO'\}\)\r?\n?\s*<\/span>\r?\n?\s*<span style=\{\{ backgroundColor: 'red', color: 'white', padding: '2px', fontSize: '10px' \}\}>\r?\n?\s*ROJO \{fiado\.montoPagado\}\r?\n?\s*<\/span>/;

const replace = `{(fiado.montoPagado || 0) > 0 && (
  <span style={{ marginLeft: '8px', backgroundColor: '#22c55e', color: 'white', border: '1px solid #16a34a', padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '900', fontSize: '10px', borderRadius: '4px' }}>
    ABONOS: S/ {Number(fiado.montoPagado).toFixed(2)}
  </span>
)}`;

if (regex.test(code)) {
  code = code.replace(regex, replace);
  fs.writeFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', code);
  console.log("Replaced with inline-style green pill!");
} else {
  console.log("Regex not found.");
}
