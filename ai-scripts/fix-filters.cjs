const fs = require('fs');

function processFinanzas() {
  let content = fs.readFileSync('src/sections/Finanzas/index.tsx', 'utf-8');
  
  // Replace the Category options
  const oldCategoriaSelect = `<select
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                  className="px-3 py-2.5 text-xs font-black uppercase tracking-widest border-2 border-[var(--color-ink)] focus:outline-none cursor-pointer bg-white min-w-[140px]"
                >
                  <option value="TODOS">Tipo: TODOS</option>
                  <option value="VENTA">Solo Ventas</option>
                  <option value="INGRESO">Solo Ingresos</option>
                  <option value="EGRESO">Solo Egresos</option>
                </select>`;
                
  const newTipoSelect = `<select
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                  className="px-3 py-2.5 text-xs font-black uppercase tracking-widest border-2 border-[var(--color-ink)] focus:outline-none cursor-pointer bg-white min-w-[140px]"
                >
                  <option value="TODOS">Categoría: TODAS</option>
                  <option value="VENTAS">Solo Ventas</option>
                  <option value="PAGOS_DEUDAS">Pagos de Deudas</option>
                  <option value="MOV_INTERNOS">Mov. Internos</option>
                  <option value="MOV_EXTERNOS">Mov. Externos</option>
                </select>`;
                
  content = content.replace(oldCategoriaSelect, newTipoSelect);
  
  // Update the filter logic
  const oldFilterLogic = `// CATEGORIA
                 if (filtroCategoria !== 'TODOS' && m.tipo !== filtroCategoria) return false;`;
                 
  const newFilterLogic = `// CATEGORIA
                 if (filtroCategoria !== 'TODOS') {
                   const isAbono = m.descripcion?.includes('ABONO DE FIADO');
                   if (filtroCategoria === 'VENTAS' && !m.isTicket) return false;
                   if (filtroCategoria === 'PAGOS_DEUDAS' && !isAbono) return false;
                   if (filtroCategoria === 'MOV_INTERNOS' && (m.isTicket || isAbono || m.flujo === 'EXTERNO')) return false;
                   if (filtroCategoria === 'MOV_EXTERNOS' && m.flujo !== 'EXTERNO') return false;
                 }`;
                 
  content = content.replace(oldFilterLogic, newFilterLogic);
  
  fs.writeFileSync('src/sections/Finanzas/index.tsx', content);
  console.log('Finanzas/index.tsx processed.');
}

function processModalDetalleCaja() {
  let content = fs.readFileSync('src/sections/Finanzas/components/ModalDetalleCaja.tsx', 'utf-8');
  
  // Import Search
  if (!content.includes('Search,')) {
    content = content.replace('X, Printer, Receipt, Download, FileText, ChevronLeft, Eye, RotateCcw, Trash2', 'X, Printer, Receipt, Download, FileText, ChevronLeft, Eye, RotateCcw, Trash2, Search');
  }
  
  // Add state
  const stateInjectionPoint = 'const [tickets, setTickets] = useState<any[]>([]);';
  const newStates = `const [searchTerm, setSearchTerm] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('TODOS');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [filtroDeuda, setFiltroDeuda] = useState('TODOS');
  `;
  if (!content.includes('const [searchTerm')) {
    content = content.replace(stateInjectionPoint, stateInjectionPoint + '\n  ' + newStates);
  }
  
  // Add JSX before TablaMovimientos
  const searchUI = `<div className="p-3 sm:p-4 bg-[var(--color-bg)] border-b-2 border-[var(--color-ink)] flex flex-col sm:flex-row gap-3 shrink-0">
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
                 <option value="VENTAS">Solo Ventas</option>
                 <option value="PAGOS_DEUDAS">Pagos de Deudas</option>
                 <option value="MOV_INTERNOS">Mov. Internos</option>
                 <option value="MOV_EXTERNOS">Mov. Externos</option>
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
             </div>`;
             
  const tablaInjectionRegex = /<div className="flex-1 overflow-auto bg-white min-h-0 custom-scrollbar">/;
  if (tablaInjectionRegex.test(content) && !content.includes('placeholder="BUSCAR POR CLIENTE')) {
    content = content.replace(tablaInjectionRegex, searchUI + '\n              <div className="flex-1 overflow-auto bg-[var(--color-bg-2)] min-h-0 custom-scrollbar">');
  }
  
  // Add the filter logic in unificados mapping
  // Actually, we can just map and then filter it where we pass it to the component!
  const filterLogic = `unificados.filter(m => {
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
                  if (filtroCategoria !== 'TODOS') {
                    const isAbono = m.descripcion?.includes('ABONO DE FIADO');
                    if (filtroCategoria === 'VENTAS' && !m.isTicket) return false;
                    if (filtroCategoria === 'PAGOS_DEUDAS' && !isAbono) return false;
                    if (filtroCategoria === 'MOV_INTERNOS' && (m.isTicket || isAbono || m.flujo === 'EXTERNO')) return false;
                    if (filtroCategoria === 'MOV_EXTERNOS' && m.flujo !== 'EXTERNO') return false;
                  }
                  return true;
                })`;
                
  if (content.includes('movimientos={unificados}')) {
    content = content.replace('movimientos={unificados}', 'movimientos={' + filterLogic + '}');
  }

  fs.writeFileSync('src/sections/Finanzas/components/ModalDetalleCaja.tsx', content);
  console.log('ModalDetalleCaja.tsx processed.');
}

processFinanzas();
processModalDetalleCaja();
