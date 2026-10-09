const fs = require('fs');
let code = fs.readFileSync('src/sections/Fiados/components/ModalClientes.tsx', 'utf-8');

const regex = /<p className="text-sm font-black text-\[var\(--color-muted\)\]">Deuda Total: <span className="text-\[var\(--color-ink\)\]">S\/ \{f\.montoOriginal\.toFixed\(2\)\}<\/span><\/p>\r?\n?\s*<p className="text-lg font-black text-\[var\(--color-danger\)\]">Debe: S\/ \{f\.saldoPendiente\.toFixed\(2\)\}<\/p>/;

if (regex.test(code)) {
  code = code.replace(regex, `<p className="text-[11px] font-black uppercase text-[var(--color-muted)] tracking-widest">Monto Original: <span className="text-[var(--color-ink)] ml-1">S/ {f.montoOriginal.toFixed(2)}</span></p>
                            <p className="text-[11px] font-black uppercase text-[var(--color-success)] tracking-widest mt-1">Total Abonado: <span className="ml-1">S/ {(f.montoPagado || 0).toFixed(2)}</span></p>
                            <p className="text-sm font-black uppercase text-[var(--color-danger)] tracking-widest mt-1 border-t border-[var(--color-border)] pt-1">Debe: <span className="ml-1">S/ {f.saldoPendiente.toFixed(2)}</span></p>`);
  fs.writeFileSync('src/sections/Fiados/components/ModalClientes.tsx', code);
  console.log("Replaced Historial card details!");
} else {
  console.log("Regex not found in ModalClientes.");
}
