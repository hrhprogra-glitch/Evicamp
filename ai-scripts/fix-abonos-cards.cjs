const fs = require('fs');

let code = fs.readFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', 'utf-8');

const regex = /<div className="flex flex-col gap-1 pl-9">\s*\{fiado\.detalles\.map\(\(det, i\) => \(/;

if (regex.test(code)) {
  code = code.replace(regex, `{(fiado.montoPagado || 0) > 0 && fiado.pagos && fiado.pagos.length > 0 && (
                      <div className="flex flex-col mb-4 ml-9 border-2 border-dashed border-[var(--color-success)] bg-[var(--color-success)]/10 p-3">
                        <div className="flex justify-between text-xs font-black uppercase tracking-widest text-[var(--color-success)] mb-2">
                          <span>Historial de Abonos:</span>
                          <span>Total Abonado: S/ {(fiado.montoPagado || 0).toFixed(2)}</span>
                        </div>
                        {fiado.pagos.map((p, pIdx) => (
                          <div key={pIdx} className="flex justify-between text-[11px] font-bold text-[var(--color-ink)] opacity-90 pl-2 py-1 border-b border-[var(--color-success)]/20 last:border-0">
                            <span>- {new Date(p.fecha).toLocaleString()} ({p.metodo})</span>
                            <span className="text-[var(--color-success)]">+ S/ {p.monto.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-col gap-1 pl-9">
                      {fiado.detalles.map((det, i) => (`);
  fs.writeFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', code);
  console.log("Replaced using regex!");
} else {
  console.log("Regex not found!");
}
