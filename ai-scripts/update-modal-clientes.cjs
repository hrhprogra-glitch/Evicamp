const fs = require('fs');
let code = fs.readFileSync('src/sections/Fiados/components/ModalClientes.tsx', 'utf-8');
const regex = /<div key=\{f\.id\} role=.button. tabIndex=\{0\} className=.bg-white border-2 border-\[var\(--color-ink\)\] p-4 flex focus:outline-none focus:ring-2 focus:ring-\[var\(--color-info\)\] justify-between items-center shadow-\[4px_4px_0_0_var\(--color-border\)\][^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;

const repl = \
<div key={f.id} role=\ + String.fromCharCode(34) + \utton\ + String.fromCharCode(34) + \ tabIndex={0} className=\ + String.fromCharCode(34) + \g-white border-2 border-[var(--color-ink)] p-4 flex flex-col focus:outline-none focus:ring-2 focus:ring-[var(--color-info)] shadow-[4px_4px_0_0_var(--color-border)] gap-3\ + String.fromCharCode(34) + \>
  <div className=\ + String.fromCharCode(34) + \lex justify-between items-center\ + String.fromCharCode(34) + \>
    <div>
      <p className=\ + String.fromCharCode(34) + \	ext-sm font-black text-[var(--color-ink)] uppercase\ + String.fromCharCode(34) + \>Fecha: {new Date(f.fechaEmision).toLocaleDateString()}</p>
      <p className=\ + String.fromCharCode(34) + \	ext-xs font-bold mt-1\ + String.fromCharCode(34) + \>
        Estado: <span className={\\\px-2 py-1 ml-1 \\\\\\}>
          {f.estado}
        </span>
      </p>
    </div>
    <div className=\ + String.fromCharCode(34) + \	ext-right flex flex-col gap-1\ + String.fromCharCode(34) + \>
      <p className=\ + String.fromCharCode(34) + \	ext-sm font-black text-[var(--color-muted)]\ + String.fromCharCode(34) + \>Deuda Total: <span className=\ + String.fromCharCode(34) + \	ext-[var(--color-ink)]\ + String.fromCharCode(34) + \>S/ {f.montoOriginal.toFixed(2)}</span></p>
      <p className=\ + String.fromCharCode(34) + \	ext-lg font-black text-[var(--color-danger)]\ + String.fromCharCode(34) + \>Debe: S/ {f.saldoPendiente.toFixed(2)}</p>
    </div>
  </div>
  {/* LISTA DE PRODUCTOS DEL FIADO */}
  <div className=\ + String.fromCharCode(34) + \lex flex-col gap-1 border-t-2 border-dashed border-[var(--color-border)] pt-3 mt-1\ + String.fromCharCode(34) + \>
    <p className=\ + String.fromCharCode(34) + \	ext-xs font-black uppercase text-[var(--color-muted)] mb-1\ + String.fromCharCode(34) + \>Productos Sacados:</p>
    {f.detalles && f.detalles.length > 0 ? f.detalles.map((det, idx) => (
      <div key={idx} className=\ + String.fromCharCode(34) + \lex justify-between text-xs font-bold text-[var(--color-subtle)]\ + String.fromCharCode(34) + \>
        <span>{det.qty} x {det.name}</span>
        <span>S/ {Number(det.subtotal).toFixed(2)}</span>
      </div>
    )) : (
      <p className=\ + String.fromCharCode(34) + \	ext-xs text-[var(--color-subtle)] italic\ + String.fromCharCode(34) + \>No hay productos registrados.</p>
    )}
  </div>
</div>
\;

code = code.replace(regex, repl);
fs.writeFileSync('src/sections/Fiados/components/ModalClientes.tsx', code);

