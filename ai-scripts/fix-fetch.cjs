const fs = require('fs');
let code = fs.readFileSync('src/sections/Fiados/index.tsx', 'utf-8');

const target1 = `      const [
        { data: prods },
        { data: clis },
        { data: fiaData },
        { data: pagosData },
        { data: detailsData }
      ] = await Promise.all([
        traerTodo(() => supabase.from('products').select('*').order('id')),
        traerTodo(() => supabase.from('customers').select('*').order('id')),
        // Filtro Ampliado: Descarga también los CANCELADOS para poder visualizarlos en la tabla como 'PAGADOS'
        traerTodo(() => supabase.from('fiados').select('*').in('status', ['PENDIENTE', 'VENCIDO', 'CANCELADO']).order('id')),
        traerTodo(() => supabase.from('debt_payments').select('*').order('id')),
        traerTodo(() => supabase.from('sale_details').select('sale_id, product_id, product_name, quantity, price_at_moment, subtotal').order('id'))
      ]);`;

const repl1 = `      const [
        { data: prods },
        { data: clis },
        { data: fiaData },
        { data: pagosData }
      ] = await Promise.all([
        traerTodo(() => supabase.from('products').select('*').order('id')),
        traerTodo(() => supabase.from('customers').select('*').order('id')),
        traerTodo(() => supabase.from('fiados').select('*').in('status', ['PENDIENTE', 'VENCIDO', 'CANCELADO']).order('id')),
        traerTodo(() => supabase.from('debt_payments').select('*').order('id'))
      ]);

      // OPTIMIZACIÓN: Solo descargar detalles de las ventas que corresponden a fiados (evita descargar 24,000 items)
      let detailsData = [];
      if (fiaData && fiaData.length > 0) {
        const saleIds = Array.from(new Set(fiaData.map(f => f.sale_id).filter(id => id != null)));
        
        if (saleIds.length > 0) {
          // Dividir en lotes de 200 para no exceder los límites de URL/Supabase 'in'
          const CHUNK_SIZE = 200;
          for (let i = 0; i < saleIds.length; i += CHUNK_SIZE) {
            const chunk = saleIds.slice(i, i + CHUNK_SIZE);
            const { data } = await supabase.from('sale_details')
              .select('sale_id, product_id, product_name, quantity, price_at_moment, subtotal')
              .in('sale_id', chunk);
            if (data) detailsData.push(...data);
          }
        }
      }`;

code = code.replace(target1, repl1);
fs.writeFileSync('src/sections/Fiados/index.tsx', code);
