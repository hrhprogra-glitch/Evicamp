const fs = require('fs');

let code = fs.readFileSync('src/sections/Fiados/components/ModalClientes.tsx', 'utf-8');

const regex = /let fiadosHistorial = fiadosDelCliente\.filter\(f => historialTab === 'PENDIENTES' \? f\.saldoPendiente > 0 : f\.saldoPendiente <= 0\);/;
const replace = `let fiadosHistorial = fiadosDelCliente
    .filter(f => historialTab === 'PENDIENTES' ? f.saldoPendiente > 0 : f.saldoPendiente <= 0)
    .sort((a, b) => new Date(b.fechaEmision).getTime() - new Date(a.fechaEmision).getTime());`;

if (regex.test(code)) {
  code = code.replace(regex, replace);
  fs.writeFileSync('src/sections/Fiados/components/ModalClientes.tsx', code);
  console.log("Added date sorting to fiadosHistorial!");
} else {
  console.log("Regex not found.");
}
