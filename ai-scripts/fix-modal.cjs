const fs = require('fs');
let content = fs.readFileSync('src/sections/Finanzas/components/ModalDetalleCaja.tsx', 'utf-8');

// Import UnifiedItem and TablaMovimientos
if (!content.includes('import { TablaMovimientos }')) {
  content = content.replace("import { useReactToPrint }", "import { TablaMovimientos } from './TablaMovimientos';\nimport type { UnifiedItem } from '../types';\nimport { useReactToPrint }");
}

// In the component, remove tabSeleccionado
content = content.replace(/const \[tabSeleccionado, setTabSeleccionado\] = useState.*?;\n?/, '');

// Helper to check if a ticket is cancelled
if (!content.includes('const esAnulada = (t: any) =>')) {
  content = content.replace('const handleAnularInterno = async (id: string) => {', "const esAnulada = (t: any) => t.status === 'ANULADO' || t.sunat_status === 'ANULADO';\n\n  const handleAnularInterno = async (id: string) => {");
}

// Map the items dynamically
const dynamicMapping = `
  const unificados: UnifiedItem[] = [];

  tickets.forEach((t: any) => {
    unificados.push({
      id: String(t.id),
      created_at: t.created_at,
      isTicket: true,
      tipo: 'VENTA',
      descripcion: \`Ticket #\${String(t.id).slice(-6)}\`,
      metodo_pago: t.payment_type,
      monto: Number(t.total) || 0,
      estado: esAnulada(t) ? 'ANULADO' : 'COMPLETADO',
      es_fiado: t.es_fiado,
      cliente_nombre: t.cliente_nombre,
      flujo: 'INTERNO',
      monto_pagado: t.monto_pagado,
      monto_deuda: t.monto_deuda,
      total: t.total
    });
  });

  movimientos.forEach((m: any) => {
    unificados.push({
      id: String(m.id),
      created_at: m.created_at,
      isTicket: false,
      tipo: m.type,
      descripcion: m.description,
      metodo_pago: m.payment_type,
      monto: Number(m.amount) || 0,
      flujo: m.flujo
    });
  });

  unificados.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
`;

// Replace the DETALLE view logic (the tabs and 3 tables) with the unified table
const viewRegex = /<div className="flex bg-\[var\(--color-bg\)\] p-1 sticky top-0 z-20 shadow-sm border-b-2 border-\[var\(--color-ink\)\]">[\s\S]*?\{tabSeleccionado === 'MOV_EXTERNO' && \([\s\S]*?<\/div>\s*\)\}\s*<\/div>/;

if (viewRegex.test(content)) {
  content = content.replace(viewRegex, `
            <div className="flex-1 overflow-auto bg-white min-h-0">
              <TablaMovimientos 
                movimientos={unificados} 
                onDelete={onDelete ? handleDeleteInterno : undefined as any}
                onAnularTicket={onAnular ? handleAnularInterno : undefined as any}
                onVerTicket={() => {}}
                idsAnulando={idsProcesando}
              />
            </div>
`);
}

// Insert dynamic mapping before return (
const returnRegex = /return \(\s*<div className="fixed inset-0/;
if (returnRegex.test(content) && !content.includes('const unificados: UnifiedItem[] = [];')) {
  content = content.replace(returnRegex, dynamicMapping + '\n  return (\n    <div className="fixed inset-0');
}

fs.writeFileSync('src/sections/Finanzas/components/ModalDetalleCaja.tsx', content);
console.log('Unified table implemented.');
