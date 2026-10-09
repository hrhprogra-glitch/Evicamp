const fs = require('fs');

// 1. Add event listener in ModalClientes.tsx
let modalCli = fs.readFileSync('src/sections/Fiados/components/ModalClientes.tsx', 'utf-8');

const effectRegex = /useEffect\(\(\) => \{\r?\n?\s*setCurrentPage\(1\);\r?\n?\s*\}, \[searchTerm, filtroDeuda, ordenAlfabetico, clientes\.length\]\);/;
const effectReplace = `useEffect(() => {
      setCurrentPage(1);
    }, [searchTerm, filtroDeuda, ordenAlfabetico, clientes.length]);

    useEffect(() => {
      const handleAbrirHistorial = (e: any) => {
        const nombreCli = e.detail;
        const cli = clientes.find(c => c.nombre === nombreCli);
        if (cli) {
          setClienteActivo(cli);
          setView('HISTORIAL');
        }
      };
      window.addEventListener('abrirHistorialDirecto', handleAbrirHistorial);
      return () => window.removeEventListener('abrirHistorialDirecto', handleAbrirHistorial);
    }, [clientes]);`;

if (effectRegex.test(modalCli)) {
  modalCli = modalCli.replace(effectRegex, effectReplace);
  fs.writeFileSync('src/sections/Fiados/components/ModalClientes.tsx', modalCli);
}

// 2. Change click logic in ModalEstadoCuenta.tsx
let modalEC = fs.readFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', 'utf-8');

const btnClickRegex = /onClick=\{\(\) => \{\r?\n?\s*onClose\(\);\r?\n?\s*setTimeout\(\(\) => \{\r?\n?\s*document\.getElementById\('btn-directorio-clientes'\)\?\.click\(\);\r?\n?\s*setTimeout\(\(\) => \{\r?\n?\s*const searchInput = document\.getElementById\('buscador-modal-clientes'\) as HTMLInputElement;\r?\n?\s*if \(searchInput\) \{\r?\n?\s*searchInput\.value = cliente\.clienteNombre;\r?\n?\s*\/\/ Trigger React's onChange\r?\n?\s*const tracker = \(searchInput as any\)\._valueTracker;\r?\n?\s*if \(tracker\) tracker\.setValue\(''\);\r?\n?\s*searchInput\.dispatchEvent\(new Event\('input', \{ bubbles: true \}\)\);\r?\n?\s*\}\r?\n?\s*\}, 100\);\r?\n?\s*\}, 100\);\r?\n?\s*\}\}/;

const btnClickReplace = `onClick={() => {
      onClose();
      setTimeout(() => {
        document.getElementById('btn-directorio-clientes')?.click();
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('abrirHistorialDirecto', { detail: cliente.clienteNombre }));
        }, 100);
      }, 100);
    }}`;

if (btnClickRegex.test(modalEC)) {
  modalEC = modalEC.replace(btnClickRegex, btnClickReplace);
  fs.writeFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', modalEC);
}

console.log("Automated jump directly to HISTORIAL view!");
