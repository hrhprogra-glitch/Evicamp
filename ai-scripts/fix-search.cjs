const fs = require('fs');

function processFinanzas() {
  let content = fs.readFileSync('src/sections/Finanzas/index.tsx', 'utf-8');
  
  // Modificar la query
  content = content.replace(
    /supabase\.from\('sales'\)\.select\('\*'\)/g,
    "supabase.from('sales').select('*, sale_details(product_name)')"
  );
  
  // Agregar al unificados
  content = content.replace(
    'es_fiado: t.es_fiado,',
    'es_fiado: t.es_fiado,\n            productosStr: t.sale_details?.map((d: any) => d.product_name).join(" "),'
  );
  
  // Modificar el buscador
  const searchOld = 'const matchMonto = String(m.monto).includes(st);';
  const searchNew = 'const matchMonto = String(m.monto).includes(st);\n                    const matchProd = m.productosStr?.toLowerCase().includes(st);';
  content = content.replace(searchOld, searchNew);
  
  const returnOld = 'if (!matchDesc && !matchCli && !matchTicket && !matchMonto) return false;';
  const returnNew = 'if (!matchDesc && !matchCli && !matchTicket && !matchMonto && !matchProd) return false;';
  content = content.replace(returnOld, returnNew);
  
  // Types
  if (!content.includes('productosStr?: string;')) {
    content = content.replace('flujo?: string;', 'flujo?: string;\n  productosStr?: string;');
  }
  
  fs.writeFileSync('src/sections/Finanzas/index.tsx', content);
  console.log('Finanzas/index.tsx procesado');
}

function processModalDetalleCaja() {
  let content = fs.readFileSync('src/sections/Finanzas/components/ModalDetalleCaja.tsx', 'utf-8');
  
  // Modificar la query
  content = content.replace(
    /supabase\s*\n\s*\.from\('sales'\)\s*\n\s*\.select\('\*'\)/g,
    "supabase\n      .from('sales')\n      .select('*, sale_details(product_name)')"
  );
  content = content.replace(
    /supabase\.from\('sales'\)\.select\('\*'\)/g,
    "supabase.from('sales').select('*, sale_details(product_name)')"
  );
  
  // Agregar al unificados
  content = content.replace(
    'es_fiado: t.es_fiado,',
    'es_fiado: t.es_fiado,\n      productosStr: t.sale_details?.map((d: any) => d.product_name).join(" "),'
  );
  
  // Modificar el buscador
  const searchOld = 'const matchMonto = String(m.monto).includes(st);';
  const searchNew = 'const matchMonto = String(m.monto).includes(st);\n                     const matchProd = m.productosStr?.toLowerCase().includes(st);';
  content = content.replace(searchOld, searchNew);
  
  const returnOld = 'if (!matchDesc && !matchCli && !matchTicket && !matchMonto) return false;';
  const returnNew = 'if (!matchDesc && !matchCli && !matchTicket && !matchMonto && !matchProd) return false;';
  content = content.replace(returnOld, returnNew);
  
  fs.writeFileSync('src/sections/Finanzas/components/ModalDetalleCaja.tsx', content);
  console.log('ModalDetalleCaja.tsx procesado');
}

function processTypes() {
  let content = fs.readFileSync('src/sections/Finanzas/types.ts', 'utf-8');
  if (!content.includes('productosStr?: string;')) {
    content = content.replace('flujo?: string;', 'flujo?: string;\n  productosStr?: string;');
    fs.writeFileSync('src/sections/Finanzas/types.ts', content);
  }
}

processTypes();
processFinanzas();
processModalDetalleCaja();
