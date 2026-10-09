const fs = require('fs');
let code = fs.readFileSync('src/sections/Fiados/index.tsx', 'utf-8');
const lines = code.split('\n');

const chunk1Target = lines.slice(47, 58).join('\n');
const chunk1Repl = `      const [
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

const chunk2Target = lines.slice(75, 107).join('\n');
const chunk2Repl = `  const fiadosMapeados: Fiado[] = fiaData
    .filter(f => f.status !== 'ANULADO') // 🔥 OCULTAR LOS ANULADOS AUTOMÁTICAMENTE
    .map((f, indexFiado) => {
    // <-- PROTECCIÓN EN LA COMPARACIÓN (f.id puede venir nulo)
    const susPagos = (pagosData || []).filter(p => p.fiado_id?.toString() === f.id?.toString());
    
    const historialPagos: PagoAbono[] = susPagos.map((p, indexPago) => ({
      id: p.id ? p.id.toString() : \`err-pago-\${indexPago}-\${Date.now()}\`,
      monto: Number(p.amount) || 0,
      metodo: p.payment_type || 'Mixto',
      fecha: p.created_at
    }));

    const susDetalles = (detailsData || []).filter(d => d.sale_id?.toString() === f.sale_id?.toString()).map(d => ({
      productoId: d.product_id,
      name: d.product_name,
      qty: Number(d.quantity),
      price: Number(d.price_at_moment),
      subtotal: Number(d.subtotal)
    }));

    // Calcular montos con precisión
    const montoOriginal = Number(f.total_amount) || 0;
    const pagadoTotal = historialPagos.reduce((sum, pago) => sum + pago.monto, 0);
    let saldoPendienteReal = Number((montoOriginal - pagadoTotal).toFixed(2));
    if (saldoPendienteReal < 0.01) saldoPendienteReal = 0;

    // Determinamos el estado basado en el cálculo real
    let estadoFinal = 'PENDIENTE';
    if (f.status === 'CANCELADO' || saldoPendienteReal === 0) {
      estadoFinal = 'PAGADO';
    } else if (f.expected_pay_date && new Date(f.expected_pay_date) < new Date()) {
      estadoFinal = 'VENCIDO';
    }

    return {
      id: f.id ? f.id.toString() : \`err-fiado-\${indexFiado}-\${Date.now()}\`,
      sale_id: f.sale_id?.toString(),
      clienteId: f.customer_id?.toString(),
      clienteNombre: f.customer_name || 'Desconocido',
      montoOriginal: montoOriginal,
      saldoPendiente: saldoPendienteReal,
      fechaEmision: f.date_given,
      fechaVencimiento: f.expected_pay_date || f.date_given,
      estado: estadoFinal,
      detalles: susDetalles, 
      pagos: historialPagos
    } as any;
  });`;

if (code.includes(chunk1Target)) {
  code = code.replace(chunk1Target, chunk1Repl);
  console.log('Chunk 1 replaced!');
} else {
  console.log('Chunk 1 failed!');
}

if (code.includes(chunk2Target)) {
  code = code.replace(chunk2Target, chunk2Repl);
  console.log('Chunk 2 replaced!');
} else {
  console.log('Chunk 2 failed!');
}

fs.writeFileSync('src/sections/Fiados/index.tsx', code);
