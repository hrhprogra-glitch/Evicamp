const fs = require('fs');
let content = fs.readFileSync('src/sections/Fiados/index.tsx', 'utf-8');

const replacement = `        onRefetch={async () => {
          setIsModalEstadoCuentaOpen(false);
          await cargarDatos();
        }}
        onVerHistorial={(nombre) => {
          setForceHistorialCliente(nombre);
          setIsModalClientesOpen(true);
          setIsModalEstadoCuentaOpen(false);
        }}
      />`;

content = content.replace(/onRefetch=\{async \(\) => \{\r?\n\s*setIsModalEstadoCuentaOpen\(false\);\r?\n\s*await cargarDatos\(\);\r?\n\s*\}\}\r?\n\s*\/>/, replacement);

fs.writeFileSync('src/sections/Fiados/index.tsx', content);
