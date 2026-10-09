const fs = require('fs');

let indexCode = fs.readFileSync('src/sections/Fiados/index.tsx', 'utf-8');

// Añadir estado para forzar el historial
indexCode = indexCode.replace(
  "const [isModalClientesOpen, setIsModalClientesOpen] = useState(false);",
  "const [isModalClientesOpen, setIsModalClientesOpen] = useState(false);\n    const [forceHistorialCliente, setForceHistorialCliente] = useState<string | null>(null);"
);

const handleTransicionEleganteOld = `      const handleTransicionElegante = () => {
        setIsModalEstadoCuentaOpen(false);
        setIsModalClientesOpen(true);
      };
      window.addEventListener('abrirHistorialDirecto', handleTransicionElegante);`;

const handleTransicionEleganteNew = `      const handleTransicionElegante = (e: any) => {
        setIsModalEstadoCuentaOpen(false);
        setForceHistorialCliente(e.detail);
        setIsModalClientesOpen(true);
      };
      window.addEventListener('abrirHistorialDirecto', handleTransicionElegante);`;

indexCode = indexCode.replace(handleTransicionEleganteOld, handleTransicionEleganteNew);

// Pasar el prop a ModalClientes
indexCode = indexCode.replace(
  "<ModalClientes \n          isOpen={isModalClientesOpen}",
  "<ModalClientes \n          isOpen={isModalClientesOpen}\n          forceHistorialCliente={forceHistorialCliente}\n          onClearForce={() => setForceHistorialCliente(null)}"
);

fs.writeFileSync('src/sections/Fiados/index.tsx', indexCode);

let modalCode = fs.readFileSync('src/sections/Fiados/components/ModalClientes.tsx', 'utf-8');

// Añadir los props a ModalClientes
modalCode = modalCode.replace(
  "fiados: Fiado[];",
  "fiados: Fiado[];\n    forceHistorialCliente?: string | null;\n    onClearForce?: () => void;"
);

modalCode = modalCode.replace(
  "onDeleteCliente, fiados }) => {",
  "onDeleteCliente, fiados, forceHistorialCliente, onClearForce }) => {"
);

// Interceptar el prop forceHistorialCliente ANTES de renderizar
const forceLogic = `
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

modalCode = modalCode.replace(
  "useCerrarConEscape(isOpen, onClose);",
  "useCerrarConEscape(isOpen, onClose);\n" + forceLogic
);

fs.writeFileSync('src/sections/Fiados/components/ModalClientes.tsx', modalCode);

console.log("Forzado render síncrono!");
