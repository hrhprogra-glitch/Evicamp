const fs = require('fs');

let code = fs.readFileSync('src/sections/Fiados/index.tsx', 'utf-8');

const regex = /let montoPagadoReal = historialPagos\.reduce\(\(sum, p\) => sum \+ p\.monto, 0\);\r?\n?\s*const abonoAntiguoNoRegistrado = Math\.max\(0, montoOriginal - Number\(f\.amount\)\);\r?\n?\s*if \(abonoAntiguoNoRegistrado > 0 && historialPagos\.length === 0\) \{\r?\n?\s*historialPagos\.push\(\{\r?\n?\s*id: `antiguo-\$\{f\.id\}`,\r?\n?\s*monto: abonoAntiguoNoRegistrado,\r?\n?\s*metodo: 'SISTEMA ANTIGUO',\r?\n?\s*fecha: f\.date_given\r?\n?\s*\}\);\r?\n?\s*montoPagadoReal \+= abonoAntiguoNoRegistrado;\r?\n?\s*\}/;

const replace = `let montoPagadoReal = historialPagos.reduce((sum, p) => sum + p.monto, 0);

      // Si la base de datos dice que se pagó más de lo que tenemos registrado en debt_payments:
      const totalPagadoEnBD = Math.max(0, montoOriginal - (Number(f.amount) || 0));
      const abonoAntiguoFaltante = Math.max(0, totalPagadoEnBD - montoPagadoReal);
      
      if (abonoAntiguoFaltante > 0.05) {
        historialPagos.push({
          id: \`antiguo-\${f.id}\`,
          monto: abonoAntiguoFaltante,
          metodo: 'PAGO ANTIGUO O DESCUENTO',
          fecha: f.date_given
        });
        montoPagadoReal += abonoAntiguoFaltante;
      }`;

if (regex.test(code)) {
  code = code.replace(regex, replace);
  fs.writeFileSync('src/sections/Fiados/index.tsx', code);
  console.log("Fixed old payments bug in index.tsx!");
} else {
  console.log("Regex not found in index.tsx.");
}
