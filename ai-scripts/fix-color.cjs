const fs = require('fs');
let code = fs.readFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', 'utf-8');

code = code.replace(
  /<div className="p-6 bg-\[var\(--color-ink\)\] text-white border-b-4 border-\[var\(--color-ink\)\]">/g,
  '<div className="p-6 bg-[var(--color-danger-bg)] border-b-4 border-[var(--color-danger)]">'
);

code = code.replace(
  /<p className="text-\[var\(--color-subtle\)\] font-black uppercase text-xs mb-2">Deuda Total Pendiente<\/p>/g,
  '<p className="text-[var(--color-danger)] font-black uppercase tracking-widest text-xs mb-2">Deuda Total Pendiente</p>'
);

code = code.replace(
  /<h1 className="text-5xl font-black text-\[var\(--color-danger\)\] drop-shadow-md">S\/ \{cliente\.totalPendiente\.toFixed\(2\)\}<\/h1>/g,
  '<h1 className="text-5xl font-black text-[var(--color-danger)] drop-shadow-md">S/ {cliente.totalPendiente.toFixed(2)}</h1>'
);

fs.writeFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', code);
console.log('Fixed block color');
