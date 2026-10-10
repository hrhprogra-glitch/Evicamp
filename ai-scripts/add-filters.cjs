const fs = require('fs');

let content = fs.readFileSync('src/sections/Finanzas/index.tsx', 'utf-8');

// 1. Add Search to imports
content = content.replace(
  /import { (.*?) } from 'lucide-react';/,
  `import { $1, Search } from 'lucide-react';`
);

// 2. Add state variables
content = content.replace(
  /const \[pestañaFlujo, setPestañaFlujo\] = useState<'INTERNO' \| 'EXTERNO'>\('INTERNO'\); \/\/ <-- Control de Pestañas/,
  `const [pestañaFlujo, setPestañaFlujo] = useState<'INTERNO' | 'EXTERNO'>('INTERNO'); // <-- Control de Pestañas
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [filtroDeuda, setFiltroDeuda] = useState('TODOS');
  const [filtroCategoria, setFiltroCategoria] = useState('TODOS');`
);

// 3. Add Filter UI and Filtering logic
const uiAndLogic = `             <div className="p-3 sm:p-4 bg-[var(--color-bg)] border-b border-[var(--color-border)] flex flex-col sm:flex-row gap-3">
               <div className="relative flex-1">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none bg-[var(--color-ink)] text-white w-10 justify-center">
                   <Search size={16} />
                 </div>
                 <input
                   type="text"
                   placeholder="BUSCAR POR CLIENTE, N° TICKET O DETALLE"
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="w-full pl-12 pr-3 py-2.5 text-xs font-bold uppercase tracking-widest border-2 border-[var(--color-ink)] focus:outline-none"
                 />
               </div>
               <select
                 value={filtroCategoria}
                 onChange={(e) => setFiltroCategoria(e.target.value)}
                 className="px-3 py-2.5 text-xs font-black uppercase tracking-widest border-2 border-[var(--color-ink)] focus:outline-none cursor-pointer bg-white min-w-[140px]"
               >
                 <option value="TODOS">Categoría: TODAS</option>
                 <option value="VENTA">Solo Ventas</option>
                 <option value="INGRESO">Solo Ingresos</option>
                 <option value="EGRESO">Solo Egresos</option>
               </select>
               <select
                 value={filtroEstado}
                 onChange={(e) => setFiltroEstado(e.target.value)}
                 className="px-3 py-2.5 text-xs font-black uppercase tracking-widest border-2 border-[var(--color-ink)] focus:outline-none cursor-pointer bg-white min-w-[140px]"
               >
                 <option value="TODOS">Estado: TODOS</option>
                 <option value="COMPLETADO">COMPLETADOS</option>
                 <option value="ANULADO">ANULADOS</option>
               </select>
               <select
                 value={filtroDeuda}
                 onChange={(e) => setFiltroDeuda(e.target.value)}
                 className="px-3 py-2.5 text-xs font-black uppercase tracking-widest border-2 border-[var(--color-ink)] focus:outline-none cursor-pointer bg-white min-w-[140px]"
               >
                 <option value="TODOS">Deuda: TODAS</option>
                 <option value="CON_DEUDA">CON DEUDA</option>
                 <option value="SIN_DEUDA">SIN DEUDA</option>
               </select>
             </div>
             
             {/* TABLA FILTRADA CON FUNCIÓN ONDELTE */}
             <TablaMovimientos 
               movimientos={movimientos.filter(m => {
                 if (pestañaFlujo === 'INTERNO') {
                   return m.flujo === 'INTERNO' || !m.flujo || String(m.flujo) === 'INGRESO_FIADO';
                 }
                 return m.flujo === 'EXTERNO';
               }).filter(m => {
                 // SEARCH
                 if (searchTerm) {
                    const st = searchTerm.toLowerCase();
                    const matchDesc = m.descripcion?.toLowerCase().includes(st);
                    const matchCli = m.cliente_nombre?.toLowerCase().includes(st);
                    const matchTicket = m.isTicket && ('#' + String(m.id).slice(-6)).includes(st);
                    const matchMonto = String(m.monto).includes(st);
                    if (!matchDesc && !matchCli && !matchTicket && !matchMonto) return false;
                 }
                 // ESTADO (Por defecto completado si no tiene estado)
                 const st = m.estado || 'COMPLETADO';
                 if (filtroEstado !== 'TODOS' && st !== filtroEstado) return false;
                 // DEUDA
                 if (filtroDeuda === 'CON_DEUDA' && !(Number(m.monto_deuda) > 0)) return false;
                 if (filtroDeuda === 'SIN_DEUDA' && Number(m.monto_deuda) > 0) return false;
                 // CATEGORIA
                 if (filtroCategoria !== 'TODOS' && m.tipo !== filtroCategoria) return false;
                 return true;
               })} `;

content = content.replace(
  /\{\/\* TABLA FILTRADA CON FUNCIÓN ONDELTE \*\/\}[\s\S]*?\}\) \} /, // Actually let's use a robust replace
  ''
);

// We replace from `{/* TABLA FILTRADA CON FUNCIÓN ONDELTE */}` to `/>` of `TablaMovimientos`.
const tableRegex = /\{\/\* TABLA FILTRADA CON FUNCIÓN ONDELTE \*\/\}[\s\S]*?idsAnulando=\{idsAnulando\}\s*\/>/;
content = content.replace(tableRegex, uiAndLogic + `\n               onDelete={handleDeleteMovimiento}\n               onVerTicket={(id) => setTicketSeleccionadoParaVer(id)}\n               onAnularTicket={handleAnularTicket}\n               idsAnulando={idsAnulando}\n             />`);

fs.writeFileSync('src/sections/Finanzas/index.tsx', content);
