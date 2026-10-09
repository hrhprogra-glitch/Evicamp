const fs = require('fs');
let code = fs.readFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', 'utf-8');

// Main container border and shadow
code = code.replace(
  /<div className="bg-white border-4 border-\[var\(--color-ink\)\] shadow-\[8px_8px_0_0_var\(--color-ink\)\] w-full max-w-6xl h-\[90vh\] flex flex-col rounded-none relative">/,
  '<div className="bg-white border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] w-full max-w-6xl h-[90vh] flex flex-col rounded-none relative">'
);

// Card unselected style
code = code.replace(
  /: 'border-\[var\(--color-ink\)\] shadow-\[4px_4px_0_0_var\(--color-ink\)\] opacity-70'}/g,
  ": 'border-[var(--color-border)] hover:border-[var(--color-ink)]'}"
);

// "Deuda Total Pendiente" header text size
code = code.replace(
  /<h1 className="text-6xl font-black text-\[var\(--color-danger\)\] drop-shadow-md">S\/ \{cliente\.totalPendiente\.toFixed\(2\)\}<\/h1>/,
  '<h1 className="text-5xl font-black text-[var(--color-danger)] drop-shadow-md">S/ {cliente.totalPendiente.toFixed(2)}</h1>'
);

// Registrar Abono container
code = code.replace(
  /<div className="bg-white border-4 border-\[var\(--color-ink\)\] p-5 shadow-\[8px_8px_0_0_var\(--color-ink\)\] flex flex-col gap-4">/,
  '<div className="bg-white border-2 border-[var(--color-ink)] p-5 shadow-[4px_4px_0_0_var(--color-ink)] flex flex-col gap-4">'
);

// CONFIRMAR PAGO button
code = code.replace(
  /className="w-full bg-\[var\(--color-accent\)\] text-\[var\(--color-ink\)\] border-4 border-\[var\(--color-ink\)\] py-4 text-lg font-black uppercase tracking-widest hover:bg-\[var\(--color-success\)\] hover:text-white transition-colors cursor-pointer shadow-\[6px_6px_0_0_var\(--color-ink\)\] active:translate-y-\[6px\] active:translate-x-\[6px\] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed mt-2"/,
  'className="w-full bg-[var(--color-accent)] text-[var(--color-ink)] border-2 border-[var(--color-ink)] py-3 text-lg font-black uppercase tracking-widest hover:bg-[var(--color-success)] hover:text-white transition-colors cursor-pointer shadow-[4px_4px_0_0_var(--color-ink)] active:translate-y-[4px] active:translate-x-[4px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed mt-2"'
);

// PENDIENTE label size
code = code.replace(
  /<span className="bg-\[var\(--color-danger\)\] text-white text-\[10px\] font-black uppercase px-2 py-1">PENDIENTE<\/span>/g,
  '<span className="bg-[var(--color-danger-bg)] text-[var(--color-danger)] border border-[var(--color-danger)] text-[10px] font-black uppercase px-2 py-1">PENDIENTE</span>'
);

fs.writeFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', code);
console.log('Fixed aesthetics');
