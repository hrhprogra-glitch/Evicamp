const fs = require('fs');

// 1. Modificar ModalClientes.tsx
let codeClientes = fs.readFileSync('src/sections/Fiados/components/ModalClientes.tsx', 'utf-8');

const targetStrClientes = `<button id="btn-volver-directorio" onClick={() => setView('LISTA')} 
                    className="px-5 py-3 bg-white text-[var(--color-ink)] border-2 border-[var(--color-ink)] text-xs font-black uppercase flex items-center gap-2 hover:bg-[var(--color-ink)] hover:text-white transition-colors cursor-pointer shadow-[4px_4px_0_0_var(--color-ink)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] w-fit"
                  >
                    <ArrowLeft size={18} /> Volver al Directorio
                  </button>
                </div>`;

const newStrClientes = `<button id="btn-volver-directorio" onClick={() => setView('LISTA')} 
                    className="px-5 py-3 bg-white text-[var(--color-ink)] border-2 border-[var(--color-ink)] text-xs font-black uppercase flex items-center gap-2 hover:bg-[var(--color-ink)] hover:text-white transition-colors cursor-pointer shadow-[4px_4px_0_0_var(--color-ink)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] w-fit"
                  >
                    <ArrowLeft size={18} /> Volver al Directorio
                  </button>
                  <div className="flex gap-6 items-center">
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-subtle)]">Deuda Original Histórica</p>
                      <p className="text-xl font-black text-[var(--color-ink)]">S/ {fiadosDelCliente.reduce((acc, f) => acc + (f.montoOriginal || 0), 0).toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-success)]">Total Abonado (Global)</p>
                      <p className="text-xl font-black text-[var(--color-success)]">S/ {fiadosDelCliente.reduce((acc, f) => acc + (f.montoPagado || 0), 0).toFixed(2)}</p>
                    </div>
                  </div>
                </div>`;

codeClientes = codeClientes.replace(targetStrClientes, newStrClientes);
// Add flex justify-between to the wrapper div
codeClientes = codeClientes.replace(
  /<div className="flex flex-col flex-1 p-4 sm:p-6 overflow-hidden">\s*<div className="mb-6 shrink-0 border-b-2 border-dashed border-\[var\(--color-border\)\] pb-4">/,
  `<div className="flex flex-col flex-1 p-4 sm:p-6 overflow-hidden">
                <div className="flex justify-between items-center mb-6 shrink-0 border-b-2 border-dashed border-[var(--color-border)] pb-4">`
);
// Make sure it works even if it didn't have exactly those classes
codeClientes = codeClientes.replace(
  /<div className="mb-4 shrink-0 border-b-2 border-dashed border-\[var\(--color-border\)\] pb-4">/,
  `<div className="flex justify-between items-center mb-4 shrink-0 border-b-2 border-dashed border-[var(--color-border)] pb-4">`
);

fs.writeFileSync('src/sections/Fiados/components/ModalClientes.tsx', codeClientes);


// 2. Modificar ModalEstadoCuenta.tsx
let codeEstado = fs.readFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', 'utf-8');

const targetStrEstado = `<h1 className="text-5xl font-black text-[var(--color-danger)] drop-shadow-md">S/ {cliente.totalPendiente.toFixed(2)}</h1>`;
const newStrEstado = `<h1 className="text-5xl font-black text-[var(--color-danger)] drop-shadow-md">S/ {cliente.totalPendiente.toFixed(2)}</h1>
                <div className="flex justify-between text-[var(--color-danger)] opacity-80 border-t border-[var(--color-danger)]/20 pt-2 mt-2 text-xs font-black uppercase tracking-widest">
                  <span>Total Abonado (Global)</span>
                  <span>S/ {cliente.totalPagado.toFixed(2)}</span>
                </div>`;
codeEstado = codeEstado.replace(targetStrEstado, newStrEstado);

fs.writeFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', codeEstado);

console.log('Fixed both modals');
