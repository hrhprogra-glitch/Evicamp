const fs = require('fs');
let code = fs.readFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', 'utf-8');

// Restore Header
code = code.replace(
  /<div className="bg-white border-b-2 border-\[var\(--color-border\)\] text-\[var\(--color-ink\)\] p-4 sm:p-6 flex justify-between items-center shrink-0">/,
  '<div className="bg-[var(--color-ink)] text-white p-4 sm:p-6 flex justify-between items-center shrink-0">'
);
code = code.replace(
  /<button onClick=\{onClose\} className="p-2 border-2 border-transparent hover:border-\[var\(--color-ink\)\] hover:bg-\[var\(--color-bg\)\] transition-colors cursor-pointer text-\[var\(--color-ink\)\]">/,
  '<button onClick={onClose} className="p-2 bg-white/10 hover:bg-[var(--color-danger)] transition-colors cursor-pointer">'
);

// Restore Left panel wrapper
code = code.replace(
  /<div className="flex-1 flex flex-col border-r-2 border-\[var\(--color-border\)\] overflow-hidden">/,
  '<div className="flex-1 flex flex-col border-r-4 border-[var(--color-ink)] overflow-hidden">'
);
// Restore Left panel top bar
code = code.replace(
  /<div className="p-4 border-b-2 border-\[var\(--color-border\)\] bg-white flex justify-between items-center shrink-0">/,
  '<div className="p-4 border-b-4 border-[var(--color-ink)] bg-white flex justify-between items-center shrink-0">'
);

// Restore Deuda Total Pendiente panel
code = code.replace(
  /<div className="p-6 bg-\[var\(--color-bg\)\] border-b-2 border-\[var\(--color-border\)\]">/,
  '<div className="p-6 bg-[var(--color-ink)] text-white border-b-4 border-[var(--color-ink)]">'
);

fs.writeFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', code);
console.log('Restored dark aesthetics');
