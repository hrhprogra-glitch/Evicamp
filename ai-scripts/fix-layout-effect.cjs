const fs = require('fs');

let file = 'src/sections/Fiados/components/ModalClientes.tsx';
let code = fs.readFileSync(file, 'utf-8');

// Agregar useLayoutEffect a los imports si no está
if (!code.includes('useLayoutEffect')) {
  code = code.replace("import React, { useState, useEffect }", "import React, { useState, useEffect, useLayoutEffect }");
}

// Remover el bloque if (forceHistorialCliente) problemático
const block = `    // Si viene forzado desde el Estado de Cuenta, seteamos la vista de inmediato (sin useEffect)
    if (forceHistorialCliente && clientes.length > 0) {
      const cli = clientes.find(c => c.nombre === forceHistorialCliente);
      if (cli && clienteActivo?.id !== cli.id) {
        setClienteActivo(cli);
        setView('HISTORIAL');
        if (onClearForce) onClearForce();
      }
    }`;
code = code.replace(block, "");

// Agregar el useLayoutEffect correcto
const effect = `
  useLayoutEffect(() => {
    if (isOpen && forceHistorialCliente && clientes.length > 0) {
      const cli = clientes.find(c => c.nombre === forceHistorialCliente);
      if (cli) {
        setClienteActivo(cli);
        setView('HISTORIAL');
        if (onClearForce) onClearForce();
      }
    }
  }, [isOpen, forceHistorialCliente, clientes]);
`;

const target = "const [telefono, setTelefono] = useState('');";
code = code.replace(target, target + effect);

fs.writeFileSync(file, code);
console.log("Applied useLayoutEffect fix");
