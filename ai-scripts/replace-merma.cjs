const fs = require('fs');

let indexCode = fs.readFileSync('src/sections/Inventario/index.tsx', 'utf-8');

// 1. Reemplazar imports
indexCode = indexCode.replace(/import \{ ModalMerma \} from '\.\/components\/ModalMerma';\r?\n?/, "import { ModalGestionProveedores } from './components/ModalGestionProveedores';\n");

// 2. Añadir icono de Users si falta
if (!indexCode.includes('Users,')) {
    indexCode = indexCode.replace(/import \{ Package, Layers, Box, AlertTriangle, LayoutGrid, Plus, Database, Activity \} from 'lucide-react';/, "import { Package, Layers, Box, AlertTriangle, LayoutGrid, Plus, Database, Activity, Users } from 'lucide-react';");
}

// 3. Cambiar estado isModalMermaOpen a isModalProveedoresOpen
indexCode = indexCode.replace(/const \[isModalMermaOpen, setIsModalMermaOpen\] = useState\(false\);/, "const [isModalProveedoresOpen, setIsModalProveedoresOpen] = useState(false);");

// 4. Cambiar botón "Registrar Merma" por "Proveedores"
const btnMermaRegex = /<button\s*onClick=\{\(\) => setIsModalMermaOpen\(true\)\}[\s\S]*?<Activity size=\{16\} \/> <span className="hidden sm:inline">Registrar<\/span> Merma\s*<\/button>/;

const btnProveedores = `<button
                onClick={() => setIsModalProveedoresOpen(true)}
                className="bg-white text-[var(--color-info)] px-4 lg:px-6 py-3 lg:py-4 border-2 border-[var(--color-info)] font-black text-[10px] lg:text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[var(--color-info)] hover:text-white transition-all cursor-pointer rounded-none shadow-[4px_4px_0_0_var(--color-info)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]"
              >
                <Users size={16} /> Proveedores
              </button>`;

indexCode = indexCode.replace(btnMermaRegex, btnProveedores);

// 5. Cambiar <ModalMerma /> por <ModalGestionProveedores />
// We know ModalMerma was rendered somewhere at the bottom:
// <ModalMerma isOpen={isModalMermaOpen} onClose={() => setIsModalMermaOpen(false)} ... />
const modalMermaRegex = /<ModalMerma[\s\S]*?onClose=\{\(\) => \{\s*setIsModalMermaOpen\(false\);[\s\S]*?\}\s*\/>/m;

const modalProveedores = `<ModalGestionProveedores isOpen={isModalProveedoresOpen} onClose={() => setIsModalProveedoresOpen(false)} />`;

if (modalMermaRegex.test(indexCode)) {
    indexCode = indexCode.replace(modalMermaRegex, modalProveedores);
} else {
    // maybe it's just <ModalMerma isOpen={isModalMermaOpen} ... />
    const simpleRegex = /<ModalMerma[\s\S]*?\/>/;
    indexCode = indexCode.replace(simpleRegex, modalProveedores);
}

fs.writeFileSync('src/sections/Inventario/index.tsx', indexCode);
console.log("Inventario index.tsx updated with Proveedores!");
