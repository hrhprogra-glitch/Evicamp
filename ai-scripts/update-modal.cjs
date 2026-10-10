const fs = require('fs');
let c = fs.readFileSync('src/sections/Finanzas/components/ModalDetalleCaja.tsx', 'utf-8');

c = c.replace(
  `import { ModalDetalleTicket } from '../../../components/ModalDetalleTicket';`,
  `import { ModalDetalleTicket } from '../../../components/ModalDetalleTicket';\nimport { traerTodo } from '../../../utils/traerTodo';`
);

c = c.replace(
`    // Buscamos ventas en el rango de la caja
    const { data: sales } = await supabase
      .from('sales')
      .select('*')
      .gte('created_at', caja.opened_at)
      .lte('created_at', caja.closed_at || new Date().toISOString());
    setTickets(sales || []);

    // Movimientos manuales de Caja Interna de ESTA sesión (Ingreso Extra / Gasto-Retiro).
    // Los de Caja Externa (personal) no entran: no son plata del negocio, no van en su reporte.
    // Los abonos de fiados (INGRESO_FIADO) tampoco: ya se cuentan en "Final" vía closing_balance.
    const { data: movs } = await supabase
      .from('cash_movements')
      .select('*')
      .eq('session_id', String(caja.id))
      .eq('flujo', 'INTERNO')
      .order('created_at');
    setMovimientos(movs || []);`,
`    // Buscamos ventas en el rango de la caja
    const { data: sales } = await traerTodo(() => supabase
      .from('sales')
      .select('*')
      .gte('created_at', caja.opened_at)
      .lte('created_at', caja.closed_at || new Date().toISOString())
      .order('id')
    );
    setTickets(sales || []);

    // Movimientos manuales de Caja Interna de ESTA sesión (Ingreso Extra / Gasto-Retiro) 
    // Y los pagos de fiados (INGRESO_FIADO).
    const { data: movs } = await traerTodo(() => supabase
      .from('cash_movements')
      .select('*')
      .eq('session_id', String(caja.id))
      .in('flujo', ['INTERNO', 'INGRESO_FIADO', 'DEVOLUCION'])
      .order('id')
    );
    setMovimientos(movs || []);`
);

fs.writeFileSync('src/sections/Finanzas/components/ModalDetalleCaja.tsx', c);
