const fs = require('fs');
let content = fs.readFileSync('src/sections/Finanzas/components/ModalDetalleCaja.tsx', 'utf-8');

const regex = /const \{\s*data:\s*sales\s*\} = await supabase\s*\.from\('sales'\)\s*\.select\('\*'\)\s*\.gte\('created_at', caja\.opened_at\)\s*\.lte\('created_at', caja\.closed_at \|\| new Date\(\)\.toISOString\(\)\);\s*setTickets\(sales \|\| \[\]\);/g;

const newCode = `    const { data: sales } = await supabase
      .from('sales')
      .select('*')
      .gte('created_at', caja.opened_at)
      .lte('created_at', caja.closed_at || new Date().toISOString())
      .order('id', { ascending: false });

    if (sales) {
      const fiadosMap = {};
      const idsConCredito = sales.filter(t => Number(t.amount_credit || 0) > 0).map(t => t.id);

      if (idsConCredito.length > 0) {
        const { data: fiadosData } = await supabase
          .from('fiados')
          .select('sale_id, customer_name, amount, paid_amount')
          .in('sale_id', idsConCredito);
        if (fiadosData) {
          fiadosData.forEach(f => {
            fiadosMap[f.sale_id] = f;
          });
        }
      }

      const ticketsFormateados = sales.map(t => {
        const fiado = t.id ? fiadosMap[String(t.id)] : null;
        const creditoOriginal = Number(t.amount_credit || 0);
        const esFiado = creditoOriginal > 0;
        const montoPagado = Number(t.amount_cash || 0) + Number(t.amount_yape || 0) + Number(t.amount_card || 0) + Number(t.amount_transfer || 0);
        const deudaActual = esFiado ? (fiado ? Math.max(0, Number(fiado.amount || 0) - Number(fiado.paid_amount || 0)) : creditoOriginal) : 0;

        return {
          ...t,
          payment_type: esFiado ? 'FIADO' : (t.payment_type || 'MIXTO'),
          es_fiado: esFiado,
          cliente_nombre: fiado ? fiado.customer_name : null,
          monto_pagado: montoPagado,
          monto_deuda: deudaActual
        };
      });
      setTickets(ticketsFormateados);
    } else {
      setTickets([]);
    }`;

content = content.replace(regex, newCode);
fs.writeFileSync('src/sections/Finanzas/components/ModalDetalleCaja.tsx', content);
console.log('Fixed ModalDetalleCaja mapping via script.');
