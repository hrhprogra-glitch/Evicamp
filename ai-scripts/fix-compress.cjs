const fs = require('fs');

let code = fs.readFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', 'utf-8');

const regex1 = /<button onClick=\{\(e\) => \{ e\.stopPropagation\(\); setFechaEditId\(fiado\.id\); setNuevaFecha\(fiado\.fechaEmision\.slice\(0, 16\)\); \}\} className="ml-2 bg-\[var\(--color-surface\)\] px-2 py-0\.5 border border-\[var\(--color-border\)\] hover:bg-\[var\(--color-accent\)\] hover:text-white transition-colors flex items-center gap-1 cursor-pointer">\r?\n?\s*<Edit size=\{10\} \/> EDITAR\r?\n?\s*<\/button>/;

if (regex1.test(code)) {
  code = code.replace(regex1, `<button onClick={(e) => { e.stopPropagation(); setFechaEditId(fiado.id); setNuevaFecha(fiado.fechaEmision.slice(0, 16)); }} className="ml-2 bg-[var(--color-surface)] px-2 py-0.5 border border-[var(--color-border)] hover:bg-[var(--color-accent)] hover:text-white transition-colors flex items-center gap-1 cursor-pointer">
                                  <Edit size={10} /> EDITAR
                                </button>
                                {(fiado.montoPagado || 0) > 0 && (
                                  <span className="ml-2 bg-[var(--color-success)] text-white border border-[var(--color-success)] px-2 py-0.5 uppercase tracking-widest font-black text-[10px]" title="Tiene un historial de abonos en esta deuda">
                                    Abonos: S/ {(fiado.montoPagado || 0).toFixed(2)}
                                  </span>
                                )}`);
  console.log('Replaced header!');
}

const regex2 = /\{\(fiado\.montoPagado \|\| 0\) > 0 && fiado\.pagos && fiado\.pagos\.length > 0 && \(\r?\n?\s*<div className="flex flex-col mb-4 ml-9 border-2 border-dashed border-\[var\(--color-success\)\] bg-\[var\(--color-success\)\]\/10 p-3">[\s\S]*?<\/div>\r?\n?\s*\)\}/;

if (regex2.test(code)) {
  code = code.replace(regex2, '');
  console.log('Removed big box!');
}

fs.writeFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', code);
