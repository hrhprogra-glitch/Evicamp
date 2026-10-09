const fs = require('fs');
let code = fs.readFileSync('src/sections/Fiados/components/ModalClientes.tsx', 'utf-8');

// 1. Add states
if (!code.includes('historialSearchProd')) {
  code = code.replace(
    /const \[currentPage, setCurrentPage\] = useState\(1\);/,
    `const [currentPage, setCurrentPage] = useState(1);
  const [historialSearchProd, setHistorialSearchProd] = useState('');
  const [historialSearchDate, setHistorialSearchDate] = useState('');
  const [expandedHistorialIds, setExpandedHistorialIds] = useState<Set<string>>(new Set());

  const toggleHistorial = (id: string) => {
    setExpandedHistorialIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };`
  );
}

// 2. Add enter key support
if (!code.includes('toggleHistorial(currentRow.dataset.id)')) {
  code = code.replace(
    /if \(e\.key === "ArrowRight" \|\| e\.key === "ArrowLeft"\) {/g,
    `if (e.key === "Enter" && view === 'HISTORIAL') {
              if (currentRow.dataset && currentRow.dataset.id) {
                toggleHistorial(currentRow.dataset.id);
                return;
              }
            } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {`
  );
}

// 3. Filter history
if (!code.includes('let fiadosHistorial = fiadosDelCliente;')) {
  code = code.replace(
    /const fiadosDelCliente = clienteActivo \? fiados\.filter\(f => f\.clienteNombre === clienteActivo\.nombre\) : \[\];/,
    `const fiadosDelCliente = clienteActivo ? fiados.filter(f => f.clienteNombre === clienteActivo.nombre) : [];

  let fiadosHistorial = fiadosDelCliente;
  if (historialSearchDate) {
    fiadosHistorial = fiadosHistorial.filter(f => f.fechaEmision.startsWith(historialSearchDate));
  }
  if (historialSearchProd) {
    const q = historialSearchProd.toLowerCase();
    fiadosHistorial = fiadosHistorial.filter(f => {
      if (f.montoOriginal.toString().includes(q) || f.saldoPendiente.toString().includes(q)) return true;
      if (f.estado.toLowerCase().includes(q)) return true;
      return f.detalles && f.detalles.some(d => d.name.toLowerCase().includes(q) || d.subtotal.toString().includes(q));
    });
  }`
  );
}

// 4. Update the View HISTORIAL JSX using regex!
const newJSX = `              {/* BUSCADOR DE HISTORIAL */}
              <div className="flex flex-wrap gap-4 bg-[var(--color-surface)] p-3 border-2 border-[var(--color-border)] shrink-0">
                <div className="relative flex-1 min-w-[200px]">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-subtle)]" />
                  <input autoComplete="off" id="buscador-historial-clientes" type="text" value={historialSearchProd}
                    onChange={(e) => setHistorialSearchProd(e.target.value)}
                    placeholder="Buscar producto o monto..." 
                    className="w-full bg-white border-2 border-[var(--color-border)] pl-9 pr-4 py-2 text-xs font-black uppercase outline-none focus:border-[var(--color-info)] transition-colors rounded-none" 
                  />
                </div>
                <input autoComplete="off" type="date" value={historialSearchDate}
                  onChange={(e) => setHistorialSearchDate(e.target.value)}
                  className="w-full sm:w-auto border-2 border-[var(--color-border)] px-4 py-2 text-xs font-black uppercase text-[var(--color-ink)] outline-none cursor-pointer bg-white rounded-none"
                />
              </div>

              <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div className="grid grid-cols-1 gap-3">
                  {fiadosHistorial.length === 0 ? (
                    <div className="bg-white border-2 border-[var(--color-border)] p-3 lg:p-4 text-center">
                      <p className="text-[var(--color-subtle)] font-black text-sm uppercase">No se encontraron registros.</p>
                    </div>
                  ) : (
                    fiadosHistorial.map(f => (
                      <div key={f.id} data-id={f.id} role="button" tabIndex={0} onClick={() => toggleHistorial(f.id.toString())} className="bg-white border-2 border-[var(--color-ink)] p-4 flex flex-col gap-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-info)] shadow-[4px_4px_0_0_var(--color-border)] cursor-pointer hover:bg-[var(--color-bg)] transition-colors">
                        <div className="flex justify-between items-center w-full">
                          <div>
                            <p className="text-sm font-black text-[var(--color-ink)] uppercase">Fecha: {new Date(f.fechaEmision).toLocaleDateString()}</p>
                            <p className="text-xs font-bold mt-1">
                              Estado: <span className={\`px-2 py-1 ml-1 \${f.estado === 'PAGADO' ? 'bg-[var(--color-accent-bg)] text-[var(--color-accent)] border border-[var(--color-accent)]' : 'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border border-[var(--color-danger)]'}\`}>
                                {f.estado}
                              </span>
                            </p>
                          </div>
                          <div className="text-right flex flex-col gap-1">
                            <p className="text-sm font-black text-[var(--color-muted)]">Deuda Total: <span className="text-[var(--color-ink)]">S/ {f.montoOriginal.toFixed(2)}</span></p>
                            <p className="text-lg font-black text-[var(--color-danger)]">Debe: S/ {f.saldoPendiente.toFixed(2)}</p>
                          </div>
                        </div>

                        {/* PRODUCTOS (COLAPSABLE) */}
                        {expandedHistorialIds.has(f.id.toString()) && f.detalles && f.detalles.length > 0 && (
                          <div className="flex flex-col gap-1 border-t-2 border-dashed border-[var(--color-border)] pt-2 mt-2 w-full">
                            <p className="text-[11px] font-black uppercase text-[var(--color-muted)] mb-1">Productos Sacados:</p>
                            {f.detalles.map((det, i) => (
                              <div key={i} className="flex justify-between text-xs font-bold text-[var(--color-subtle)]">
                                <span>{det.qty} x {det.name}</span>
                                <span>S/ {Number(det.subtotal).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {!expandedHistorialIds.has(f.id.toString()) && f.detalles && f.detalles.length > 0 && (
                          <div className="text-[10px] text-center text-[var(--color-muted)] font-bold mt-1 tracking-widest uppercase">Click para ver productos</div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};`;

code = code.replace(/<div className="flex-1 overflow-y-auto \[\&::-webkit-scrollbar\]:hidden \[-ms-overflow-style:none\] \[scrollbar-width:none\]">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*\);\s*};\s*$/m, newJSX);

fs.writeFileSync('src/sections/Fiados/components/ModalClientes.tsx', code);
console.log('Fixed ModalClientes features');
