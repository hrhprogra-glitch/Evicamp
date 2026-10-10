const fs = require('fs');

function fixFinanzas() {
  let content = fs.readFileSync('src/sections/Finanzas/index.tsx', 'utf-8');
  
  const injectionPoint = "const { data: salesData } = await traerTodo<any>(() => supabase.from('sales').select('*').gte('created_at', sessionData.opened_at).order('id'));";
  
  const injectionCode = `const salesIds = (salesData || []).map((s: any) => s.id);
        let saleDetailsData: any[] = [];
        if (salesIds.length > 0) {
          const { data: details } = await supabase.from('sale_details').select('sale_id, product_name').in('sale_id', salesIds);
          saleDetailsData = details || [];
        }
        const detailsBySale: Record<string, string[]> = {};
        saleDetailsData.forEach((d: any) => {
          if (!detailsBySale[d.sale_id]) detailsBySale[d.sale_id] = [];
          detailsBySale[d.sale_id].push(d.product_name);
        });
        salesData?.forEach((s: any) => {
          s.productosStr = detailsBySale[s.id]?.join(' ') || '';
        });`;
        
  if (content.includes(injectionPoint) && !content.includes('let saleDetailsData: any[] = [];')) {
    content = content.replace(injectionPoint, injectionPoint + '\n        ' + injectionCode);
  }
  
  // Modificar el mapeo de unificados
  content = content.replace(
    'productosStr: t.sale_details?.map((d: any) => d.product_name).join(" "),',
    'productosStr: t.productosStr,'
  );
  
  fs.writeFileSync('src/sections/Finanzas/index.tsx', content);
}

function fixModal() {
  let content = fs.readFileSync('src/sections/Finanzas/components/ModalDetalleCaja.tsx', 'utf-8');
  
  const injectionPoint = "const { data: sales } = await supabase\n      .from('sales')\n      .select('*')\n      .gte('created_at', caja.opened_at)\n      .order('id');";
  
  const injectionCode = `
    let finalSales = sales || [];
    if (finalSales.length > 0) {
      const salesIds = finalSales.map((s: any) => s.id);
      const { data: details } = await supabase.from('sale_details').select('sale_id, product_name').in('sale_id', salesIds);
      const detailsBySale: Record<string, string[]> = {};
      (details || []).forEach((d: any) => {
        if (!detailsBySale[d.sale_id]) detailsBySale[d.sale_id] = [];
        detailsBySale[d.sale_id].push(d.product_name);
      });
      finalSales.forEach((s: any) => {
        s.productosStr = detailsBySale[s.id]?.join(' ') || '';
      });
    }`;
    
  if (content.includes(".order('id');") && !content.includes('let finalSales = sales || [];')) {
    content = content.replace(injectionPoint, injectionPoint + injectionCode);
  }
  
  // Modificar el mapeo de unificados
  content = content.replace(
    'productosStr: t.sale_details?.map((d: any) => d.product_name).join(" "),',
    'productosStr: t.productosStr,'
  );
  
  fs.writeFileSync('src/sections/Finanzas/components/ModalDetalleCaja.tsx', content);
}

fixFinanzas();
fixModal();
console.log('Fixed queries');
