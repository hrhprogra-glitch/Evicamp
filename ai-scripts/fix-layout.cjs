const fs = require('fs');

let indexCode = fs.readFileSync('src/sections/Inventario/index.tsx', 'utf-8');

// We need to replace the HeaderInventario import and the two divs with a single unified header
indexCode = indexCode.replace(/import \{ HeaderInventario \} from '\.\/components\/HeaderInventario';\r?\n?/, '');

// Add missing lucide icons
if (!indexCode.includes('Plus,')) {
  indexCode = indexCode.replace(/import \{ Box, AlertTriangle, LayoutGrid, Package, Layers \} from 'lucide-react';/, "import { Box, AlertTriangle, LayoutGrid, Package, Layers, Plus, Database, Activity } from 'lucide-react';");
}
if (!indexCode.includes('Database,')) {
  indexCode = indexCode.replace(/import \{ Box, AlertTriangle, LayoutGrid, Package, Layers, Plus, Activity \} from 'lucide-react';/, "import { Box, AlertTriangle, LayoutGrid, Package, Layers, Plus, Database, Activity } from 'lucide-react';");
}
if (!indexCode.includes('Plus,')) {
  indexCode = indexCode.replace(/import { Package, Layers, Box, AlertTriangle, LayoutGrid } from 'lucide-react';/, "import { Package, Layers, Box, AlertTriangle, LayoutGrid, Plus, Database, Activity } from 'lucide-react';");
}

const renderRegex = /<HeaderInventario[\s\S]*?isGreen \/>\r?\n?\s*<\/div>\r?\n?\s*<\/div>/;

const unifiedHeader = `
        {/* ENCABEZADO UNIFICADO NEOBRUTALISTA */}
        <div className="bg-white border-b-2 border-[var(--color-ink)] p-4 sm:p-6 lg:p-8 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 shrink-0">
          
          {/* LADO IZQUIERDO: TITULO Y SWITCH */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 lg:gap-8 w-full xl:w-auto">
            {/* Título */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--color-accent-bg)] border-2 border-[var(--color-accent)] flex items-center justify-center shadow-[4px_4px_0_0_var(--color-accent)] rounded-none shrink-0">
                <Package size={20} className="text-[var(--color-accent)]" />
              </div>
              <div>
                <h1 className="text-xl lg:text-2xl font-black text-[var(--color-ink)] uppercase tracking-widest whitespace-nowrap">
                  Catálogo
                </h1>
              </div>
            </div>

            {/* Switch de Vista */}
            <div className="flex border-2 border-[var(--color-ink)] bg-white shadow-[4px_4px_0_0_var(--color-ink)] shrink-0 w-full md:w-auto">
              <button 
                onClick={() => setVistaActiva('PRODUCTOS')} 
                className={\`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 lg:px-6 py-2.5 lg:py-3 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all rounded-none cursor-pointer \${vistaActiva === 'PRODUCTOS' ? 'bg-[var(--color-ink)] text-[var(--color-accent)]' : 'text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-bg)]'}\`}
              >
                <Package size={14} /> Productos
              </button>
              <button 
                onClick={() => setVistaActiva('LOTES')} 
                className={\`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 lg:px-6 py-2.5 lg:py-3 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all rounded-none cursor-pointer border-l-2 border-[var(--color-ink)] \${vistaActiva === 'LOTES' ? 'bg-[var(--color-ink)] text-[var(--color-accent)]' : 'text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-bg)]'}\`}
              >
                <Layers size={14} /> Lotes
              </button>
            </div>
          </div>

          {/* LADO DERECHO: METRICAS Y BOTONES DE ACCIÓN */}
          <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-4 lg:gap-6 w-full xl:w-auto overflow-x-auto custom-scrollbar pb-2 xl:pb-0">
            {/* Métricas (Sin Valor Total) */}
            <div className="flex gap-3 lg:gap-4 shrink-0">
              <TarjetaMetrica label="Total SKUs" value={products.length} icon={<Box size={14}/>} />
              <TarjetaMetrica label="Crítico" value={lowStockCount} icon={<AlertTriangle size={14}/>} isAlert={lowStockCount > 0} />
            </div>

            {/* Botones de Acción */}
            <div className="flex gap-3 shrink-0">
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-[var(--color-accent)] text-[var(--color-ink)] px-4 lg:px-6 py-3 lg:py-4 border-2 border-[var(--color-ink)] font-black text-[10px] lg:text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[var(--color-ink)] hover:text-[var(--color-accent)] transition-all cursor-pointer rounded-none shadow-[4px_4px_0_0_var(--color-ink)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]"
              >
                <Plus size={16} /> <span className="hidden sm:inline">Nuevo</span> Producto
              </button>
              <button
                onClick={() => setIsModalLoteOpen(true)}
                className="bg-[var(--color-ink)] text-[var(--color-accent)] px-4 lg:px-6 py-3 lg:py-4 border-2 border-[var(--color-ink)] font-black text-[10px] lg:text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white hover:text-[var(--color-ink)] transition-all cursor-pointer rounded-none shadow-[4px_4px_0_0_var(--color-accent)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]"
              >
                <Database size={16} /> <span className="hidden sm:inline">Ingresar</span> Lote
              </button>
              <button
                onClick={() => setIsModalMermaOpen(true)}
                className="bg-white text-[var(--color-danger)] px-4 lg:px-6 py-3 lg:py-4 border-2 border-[var(--color-danger)] font-black text-[10px] lg:text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[var(--color-danger)] hover:text-white transition-all cursor-pointer rounded-none shadow-[4px_4px_0_0_var(--color-danger)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]"
              >
                <Activity size={16} /> <span className="hidden sm:inline">Registrar</span> Merma
              </button>
            </div>
          </div>
        </div>`;

indexCode = indexCode.replace(renderRegex, unifiedHeader);

fs.writeFileSync('src/sections/Inventario/index.tsx', indexCode);
console.log("Unified layout written!");
