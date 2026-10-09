const fs = require('fs');

let code = fs.readFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', 'utf-8');

const regex = /<div className="flex justify-between items-end mb-2">[\s\S]*?<div className="border-t-2 border-dashed border-\[var\(--color-danger\)\]\/20 my-2"><\/div>/;

const replace = ``;

if (regex.test(code)) {
  code = code.replace(regex, replace);
  
  // Now add the button below Deuda Total Pendiente
  const regex2 = /<h1 className="text-5xl font-black text-\[var\(--color-danger\)\] drop-shadow-md">S\/ \{cliente\.totalPendiente\.toFixed\(2\)\}<\/h1>/;
  const replace2 = `<h1 className="text-5xl font-black text-[var(--color-danger)] drop-shadow-md">S/ {cliente.totalPendiente.toFixed(2)}</h1>
  <button 
    onClick={() => {
      onClose();
      setTimeout(() => {
        document.getElementById('btn-directorio-clientes')?.click();
      }, 100);
    }}
    className="mt-4 w-full bg-white border-2 border-[var(--color-ink)] text-[var(--color-ink)] px-4 py-2 font-black uppercase tracking-widest text-xs hover:bg-[var(--color-ink)] hover:text-white transition-colors cursor-pointer shadow-[4px_4px_0_0_var(--color-ink)]"
  >
    Ver Directorio del Cliente
  </button>`;
  
  code = code.replace(regex2, replace2);
  
  fs.writeFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', code);
  console.log("Updated ModalEstadoCuenta UI!");
} else {
  console.log("Regex not found.");
}
