const fs = require('fs');

let code = fs.readFileSync('src/sections/Fiados/index.tsx', 'utf-8');

const regex = /const montoOriginal = Number\(f\.amount\) \|\| 0;\r?\n?\s*const montoPagadoReal = historialPagos\.reduce\(\(sum, p\) => sum \+ p\.monto, 0\);/;

const replace = `const sumaDetalles = susDetalles.reduce((acc, det) => acc + (Number(det.subtotal) || 0), 0);
      const montoOriginal = sumaDetalles > 0 ? sumaDetalles : (Number(f.amount) || 0);

      let montoPagadoReal = historialPagos.reduce((sum, p) => sum + p.monto, 0);

      const abonoAntiguoNoRegistrado = Math.max(0, montoOriginal - Number(f.amount));
      
      if (abonoAntiguoNoRegistrado > 0 && historialPagos.length === 0) {
        historialPagos.push({
          id: \`antiguo-\${f.id}\`,
          monto: abonoAntiguoNoRegistrado,
          metodo: 'SISTEMA ANTIGUO',
          fecha: f.date_given
        });
        montoPagadoReal += abonoAntiguoNoRegistrado;
      }`;

if (regex.test(code)) {
  code = code.replace(regex, replace);
  fs.writeFileSync('src/sections/Fiados/index.tsx', code);
  console.log("Phantom payment logic added to index.tsx!");
} else {
  console.log("Not found. Check index.tsx");
}
