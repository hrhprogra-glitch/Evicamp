const fs = require('fs');

let codeClientes = fs.readFileSync('src/sections/Fiados/components/ModalClientes.tsx', 'utf-8');

const targetStr = `<div className="shrink-0 border-b-2 border-[var(--color-border)] pb-4">
                  <button id="btn-volver-directorio" onClick={() => setView('LISTA')} 
                    className="px-5 py-3 bg-white text-[var(--color-ink)] border-2 border-[var(--color-ink)] text-xs font-black uppercase flex items-center gap-2 hover:bg-[var(--color-ink)] hover:text-white transition-colors cursor-pointer shadow-[4px_4px_0_0_var(--color-ink)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] w-fit"
                  >
                    <ArrowLeft size={18} /> Volver al Directorio
                  </button>
                </div>`;

const newStr = `<div className="flex justify-between items-center shrink-0 border-b-2 border-[var(--color-border)] pb-4">
                  <button id="btn-volver-directorio" onClick={() => setView('LISTA')} 
                    className="px-5 py-3 bg-white text-[var(--color-ink)] border-2 border-[var(--color-ink)] text-xs font-black uppercase flex items-center gap-2 hover:bg-[var(--color-ink)] hover:text-white transition-colors cursor-pointer shadow-[4px_4px_0_0_var(--color-ink)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] w-fit"
                  >
                    <ArrowLeft size={18} /> Volver al Directorio
                  </button>
                  <div className="flex gap-6 items-center flex-wrap">
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

codeClientes = codeClientes.replace(targetStr, newStr);

fs.writeFileSync('src/sections/Fiados/components/ModalClientes.tsx', codeClientes);
