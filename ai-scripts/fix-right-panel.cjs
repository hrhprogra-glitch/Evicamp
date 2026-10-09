const fs = require('fs');
let code = fs.readFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', 'utf-8');

const regex = /<span>Total Abonado \(Global\)<\/span>\s*<span>S\/ \{cliente\.totalPagado\.toFixed\(2\)\}<\/span>/;

if (regex.test(code)) {
  code = code.replace(regex, `<span>Abonos en estas deudas</span>
                    <span>S/ {cliente.fiados.filter(f => f.saldoPendiente > 0).reduce((acc, f) => acc + (f.montoPagado || 0), 0).toFixed(2)}</span>`);
  fs.writeFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', code);
  console.log("Replaced text on the right side!");
} else {
  console.log("Not found.");
}
