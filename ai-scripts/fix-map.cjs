const fs = require('fs');
let code = fs.readFileSync('src/sections/Fiados/index.tsx', 'utf-8');

code = code.replace(
  /montoOriginal: montoOriginal,\s*saldoPendiente: saldoPendienteReal,/,
  `montoOriginal: montoOriginal,
        montoPagado: montoPagadoReal,
        saldoPendiente: saldoPendienteReal,`
);

fs.writeFileSync('src/sections/Fiados/index.tsx', code);
console.log('Fixed montoPagado map');
