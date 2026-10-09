const fs = require('fs');

let file = 'src/sections/Fiados/components/ModalClientes.tsx';
let code = fs.readFileSync(file, 'utf-8');

// The block to move
const block = `
    // Si viene forzado desde el Estado de Cuenta, seteamos la vista de inmediato (sin useEffect)
    if (forceHistorialCliente && clientes.length > 0) {
      const cli = clientes.find(c => c.nombre === forceHistorialCliente);
      if (cli && clienteActivo?.id !== cli.id) {
        setClienteActivo(cli);
        setView('HISTORIAL');
        if (onClearForce) onClearForce();
      }
    }
`;

// Remove the block from where it is now (right after useCerrarConEscape)
code = code.replace(block, "");

// Put it AFTER the useState declarations
const target = "const [telefono, setTelefono] = useState('');";
code = code.replace(target, target + block);

fs.writeFileSync(file, code);
console.log("Moved block!");
