const fs = require('fs');

let file = 'src/sections/Inventario/components/ModalGestionProveedores.tsx';
let code = fs.readFileSync(file, 'utf-8');

// Fix 1: p.name -> p.razon_social
code = code.replace(/p\.name\?/g, "p.razon_social?");

// Fix 2: initialData={proveedorAEditar} -> proveedorAEditar={proveedorAEditar}
code = code.replace(/initialData=\{proveedorAEditar\}/, "proveedorAEditar={proveedorAEditar}\n          proveedoresExistentes={proveedores}");

// Fix 3: onSave={fetchProveedores} -> onSave={() => fetchProveedores()}
code = code.replace(/onSave=\{fetchProveedores\}/, "onSave={() => fetchProveedores()}");

fs.writeFileSync(file, code);
console.log("Fixed TS errors in ModalGestionProveedores!");
