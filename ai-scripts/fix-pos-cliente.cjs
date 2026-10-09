const fs = require('fs');

let code = fs.readFileSync('src/sections/Punto-de-venta/components/ModalCobro.tsx', 'utf-8');

const regex = /telefono: clienteTelefono \|\| null,\r?\n?\s*/;

if (regex.test(code)) {
  code = code.replace(regex, '');
  fs.writeFileSync('src/sections/Punto-de-venta/components/ModalCobro.tsx', code);
  console.log("Removed telefono from ModalCobro.tsx insert");
} else {
  console.log("Regex not found.");
}
