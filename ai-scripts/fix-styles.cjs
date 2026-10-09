const fs = require('fs');

// 1. Fix ModalEstadoCuenta.tsx styling for products
let modalEC = fs.readFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', 'utf-8');

const prodClassRegex = /className="flex justify-between text-xs font-bold text-\[var\(--color-subtle\)\]"/g;
if (prodClassRegex.test(modalEC)) {
  modalEC = modalEC.replace(prodClassRegex, 'className="flex justify-between text-sm font-black text-[var(--color-muted)]"');
  fs.writeFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', modalEC);
  console.log("Fixed product styling in ModalEstadoCuenta");
} else {
  console.log("prodClassRegex not found in ModalEstadoCuenta");
}

// 2. Fix ModalClientes.tsx "VER ESTADO DE CUENTA" button visibility
let modalCli = fs.readFileSync('src/sections/Fiados/components/ModalClientes.tsx', 'utf-8');

const btnEstadoRegex = /<button onClick=\{\(\) => \{\r?\n?\s*window\.dispatchEvent\(new CustomEvent\('abrirEstadoCuentaGlobal', \{ detail: clienteActivo\?\.nombre \}\)\);\r?\n?\s*\}\} className="flex items-center gap-2 text-xs font-black uppercase text-\[var\(--color-info\)\] hover:text-\[var\(--color-ink\)\] transition-colors ml-4 border-l-2 border-\[var\(--color-border\)\] pl-4">/m;

const btnEstadoReplace = `<button onClick={() => {
                  window.dispatchEvent(new CustomEvent('abrirEstadoCuentaGlobal', { detail: clienteActivo?.nombre }));
                }} className="flex items-center gap-2 text-xs font-black uppercase bg-[var(--color-info)] text-white px-4 py-1.5 hover:bg-[var(--color-ink)] hover:text-white transition-colors ml-4 border-2 border-[var(--color-ink)] shadow-[2px_2px_0_0_var(--color-ink)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5">`;

if (btnEstadoRegex.test(modalCli)) {
  modalCli = modalCli.replace(btnEstadoRegex, btnEstadoReplace);
  fs.writeFileSync('src/sections/Fiados/components/ModalClientes.tsx', modalCli);
  console.log("Enhanced VER ESTADO DE CUENTA button visibility");
} else {
  console.log("btnEstadoRegex not found in ModalClientes");
}
