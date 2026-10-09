const fs = require('fs');
let code = fs.readFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', 'utf-8');

code = code.replace(
  /\{cliente\.fiados\.sort\(\(a,b\) => new Date\(b\.fechaEmision\)\.getTime\(\) - new Date\(a\.fechaEmision\)\.getTime\(\)\)\.map\(\(fiado\) => \(/g,
  `{cliente.fiados.filter(f => f.saldoPendiente > 0).sort((a,b) => new Date(b.fechaEmision).getTime() - new Date(a.fechaEmision).getTime()).map((fiado) => (`
);

fs.writeFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', code);
console.log('Fixed filter in ModalEstadoCuenta.tsx');
