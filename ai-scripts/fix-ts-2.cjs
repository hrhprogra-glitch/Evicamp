const fs = require('fs');

let file = 'src/sections/Inventario/components/ModalGestionProveedores.tsx';
let code = fs.readFileSync(file, 'utf-8');

code = code.replace(/p\.name/g, 'p.razon_social');
code = code.replace(/\.order\('name'\)/, ".order('razon_social')");
code = code.replace(/¿Seguro que deseas eliminar al proveedor \$\{p\.razon_social\}\?/, "¿Seguro que deseas eliminar al proveedor ${p.razon_social}?");

fs.writeFileSync(file, code);
console.log("Fixed p.name and .order('name')!");
