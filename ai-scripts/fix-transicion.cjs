const fs = require('fs');

// --- Modificar ModalEstadoCuenta.tsx ---
let modalCode = fs.readFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', 'utf-8');

// Replace the old button onClick
const oldOnClick = `onClick={() => {
        onClose();
        setTimeout(() => {
          document.getElementById('btn-directorio-clientes')?.click();
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('abrirHistorialDirecto', { detail: cliente.clienteNombre }));
          }, 100);
        }, 100);
      }}`;

const newOnClick = `onClick={() => {
        // Disparar evento instantáneo
        window.dispatchEvent(new CustomEvent('abrirHistorialDirecto', { detail: cliente.clienteNombre }));
      }}`;

modalCode = modalCode.replace(oldOnClick, newOnClick);
fs.writeFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', modalCode);

// --- Modificar Fiados/index.tsx ---
let indexCode = fs.readFileSync('src/sections/Fiados/index.tsx', 'utf-8');

// Añadir el listener para abrirHistorialDirecto en Fiados/index.tsx
const handleAbrirCode = `      const handleAbrir = (e: any) => {
        const nombre = e.detail;
        const cliAgrupado = clientesAgrupados.find(c => c.clienteNombre === nombre);
        if (cliAgrupado) {
          setClienteEstadoCuenta(cliAgrupado);
          setIsModalEstadoCuentaOpen(true);
          setIsModalClientesOpen(false);
        }
      };
      window.addEventListener('abrirEstadoCuentaGlobal', handleAbrir);

      // NUEVO: Transición elegante
      const handleTransicionElegante = () => {
        setIsModalEstadoCuentaOpen(false);
        setIsModalClientesOpen(true);
      };
      window.addEventListener('abrirHistorialDirecto', handleTransicionElegante);

      return () => {
        window.removeEventListener('abrirEstadoCuentaGlobal', handleAbrir);
        window.removeEventListener('abrirHistorialDirecto', handleTransicionElegante);
      };`;

// Find where `handleAbrir` is currently
const oldHandleAbrir = `      const handleAbrir = (e: any) => {
        const nombre = e.detail;
        const cliAgrupado = clientesAgrupados.find(c => c.clienteNombre === nombre);
        if (cliAgrupado) {
          setClienteEstadoCuenta(cliAgrupado);
          setIsModalEstadoCuentaOpen(true);
          setIsModalClientesOpen(false);
        }
      };
      window.addEventListener('abrirEstadoCuentaGlobal', handleAbrir);
      return () => window.removeEventListener('abrirEstadoCuentaGlobal', handleAbrir);`;

indexCode = indexCode.replace(oldHandleAbrir, handleAbrirCode);
fs.writeFileSync('src/sections/Fiados/index.tsx', indexCode);

console.log("¡Transición elegante aplicada!");
