const fs = require('fs');

// 1. Fix ModalEstadoCuenta.tsx
let modalEC = fs.readFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', 'utf-8');

// The line: const pendingIds = cliente.fiados.filter(f => f.saldoPendiente > 0).map(f => f.id);
modalEC = modalEC.replace(/f\.saldoPendiente > 0/g, "f.estado !== 'PAGADO'");

// The rendering line: {fiado.saldoPendiente === 0 ? (
modalEC = modalEC.replace(/fiado\.saldoPendiente === 0 \? \(/g, "fiado.estado === 'PAGADO' ? (");

// Remove the inline script injected earlier that clicks #buscador-modal-clientes
// The earlier fix: document.getElementById('btn-directorio-clientes')?.click();
// We'll leave it as is, but we'll add the event listener in index.tsx
fs.writeFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', modalEC);


// 2. Add button in ModalClientes.tsx
let modalCli = fs.readFileSync('src/sections/Fiados/components/ModalClientes.tsx', 'utf-8');

// find: <ArrowLeft size={16} /> Volver al Directorio
// </button>
const btnRegex = /<button onClick=\{\(\) => setView\('LISTA'\)\}[\s\S]*?<ArrowLeft size=\{16\} \/> Volver al Directorio\r?\n?\s*<\/button>/;
const btnReplace = `<button onClick={() => setView('LISTA')} className="flex items-center gap-2 text-xs font-black uppercase text-[var(--color-subtle)] hover:text-[var(--color-info)] transition-colors">
                  <ArrowLeft size={16} /> Volver al Directorio
                </button>
                <button onClick={() => {
                  window.dispatchEvent(new CustomEvent('abrirEstadoCuentaGlobal', { detail: clienteActivo?.nombre }));
                }} className="flex items-center gap-2 text-xs font-black uppercase text-[var(--color-info)] hover:text-[var(--color-ink)] transition-colors ml-4 border-l-2 border-[var(--color-border)] pl-4">
                  Ver Estado de Cuenta
                </button>`;

if (btnRegex.test(modalCli)) {
  modalCli = modalCli.replace(btnRegex, btnReplace);
  fs.writeFileSync('src/sections/Fiados/components/ModalClientes.tsx', modalCli);
}


// 3. Add Event Listener in index.tsx
let indexCode = fs.readFileSync('src/sections/Fiados/index.tsx', 'utf-8');

const effectRegex = /useEffect\(\(\) => \{\r?\n?\s*cargarDatos\(\);\r?\n?\s*\}, \[\]\);/;
const effectReplace = `useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    const handleAbrir = (e: any) => {
      const nombre = e.detail;
      const cliAgrupado = clientesAgrupados.find(c => c.clienteNombre === nombre);
      if (cliAgrupado) {
        setClienteEstadoCuenta(cliAgrupado);
        setIsModalEstadoCuentaOpen(true);
        setIsModalClientesOpen(false);
      }
    };
    window.addEventListener('abrirEstadoCuentaGlobal', handleAbrir);
    return () => window.removeEventListener('abrirEstadoCuentaGlobal', handleAbrir);
  }, [clientesAgrupados]);`;

if (effectRegex.test(indexCode)) {
  indexCode = indexCode.replace(effectRegex, effectReplace);
  fs.writeFileSync('src/sections/Fiados/index.tsx', indexCode);
}

console.log("Fixed state bugs and added back button to Estado de Cuenta!");
