const fs = require('fs');

let code = fs.readFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', 'utf-8');

const regex = /<button \r?\n?\s*onClick=\{\(\) => \{\r?\n?\s*onClose\(\);\r?\n?\s*setTimeout\(\(\) => \{\r?\n?\s*document\.getElementById\('btn-directorio-clientes'\)\?\.click\(\);\r?\n?\s*\}, 100\);\r?\n?\s*\}\}\r?\n?\s*className="mt-4 w-full bg-white border-2 border-\[var\(--color-ink\)\] text-\[var\(--color-ink\)\] px-4 py-2 font-black uppercase tracking-widest text-xs hover:bg-\[var\(--color-ink\)\] hover:text-white transition-colors cursor-pointer shadow-\[4px_4px_0_0_var\(--color-ink\)\]"\r?\n?\s*>\r?\n?\s*Ver Directorio del Cliente\r?\n?\s*<\/button>/;

const replace = `<button 
  onClick={() => {
    onClose();
    setTimeout(() => {
      document.getElementById('btn-directorio-clientes')?.click();
      setTimeout(() => {
        const searchInput = document.getElementById('buscador-modal-clientes') as HTMLInputElement;
        if (searchInput) {
          searchInput.value = cliente.clienteNombre;
          // Trigger React's onChange
          const tracker = (searchInput as any)._valueTracker;
          if (tracker) tracker.setValue('');
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, 100);
    }, 100);
  }}
  className="mt-4 w-full bg-white border-2 border-[var(--color-ink)] text-[var(--color-ink)] px-4 py-2 font-black uppercase tracking-widest text-xs hover:bg-[var(--color-ink)] hover:text-white transition-colors cursor-pointer shadow-[4px_4px_0_0_var(--color-ink)]"
>
  Ver Historial del Cliente
</button>`;

if (regex.test(code)) {
  code = code.replace(regex, replace);
  fs.writeFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', code);
  console.log("Updated button to auto-search client in Directorio!");
} else {
  console.log("Regex not found.");
}
