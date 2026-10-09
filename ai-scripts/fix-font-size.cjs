const fs = require('fs');

// 1. ModalEstadoCuenta.tsx
let modalEC = fs.readFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', 'utf-8');

// Change products list styling in ModalEstadoCuenta
const ecProdRegex = /className="flex justify-between items-center text-\[10px\] font-bold text-\[var\(--color-subtle\)\] uppercase"/g;
modalEC = modalEC.replace(ecProdRegex, 'className="flex justify-between items-center text-xs font-black text-[var(--color-muted)] uppercase"');

const ecPriceRegex = /className="shrink-0 text-\[10px\]">S\//g;
modalEC = modalEC.replace(ecPriceRegex, 'className="shrink-0 text-xs">S/');

fs.writeFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', modalEC);


// 2. ModalClientes.tsx
let modalCli = fs.readFileSync('src/sections/Fiados/components/ModalClientes.tsx', 'utf-8');

// Change products list styling in ModalClientes
const cliProdRegex = /className="flex justify-between text-xs font-bold text-\[var\(--color-subtle\)\]"/g;
modalCli = modalCli.replace(cliProdRegex, 'className="flex justify-between text-sm font-black text-[var(--color-muted)]"');

const cliAbonosItemRegex = /className="flex justify-between items-center text-\[10px\] font-bold text-\[var\(--color-subtle\)\]"/g;
modalCli = modalCli.replace(cliAbonosItemRegex, 'className="flex justify-between items-center text-xs font-black text-[var(--color-muted)]"');

const cliHeaderRegex = /<p className="text-\[11px\] font-black uppercase/g;
modalCli = modalCli.replace(cliHeaderRegex, '<p className="text-xs font-black uppercase');

fs.writeFileSync('src/sections/Fiados/components/ModalClientes.tsx', modalCli);

console.log("Increased font size and contrast for products and abonos!");
