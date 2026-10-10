const fs = require('fs');

let c = fs.readFileSync('src/sections/Finanzas/components/ModalDetalleCaja.tsx', 'utf-8');

c = c.replace(
`import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';

interface Props {`,
`import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { TablaMovimientos } from './TablaMovimientos';
import type { UnifiedItem } from '../types';
import { ModalDetalleTicket } from '../../../components/ModalDetalleTicket';

interface Props {`
);

c = c.replace(
`  const [descargando, setDescargando] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint`,
`  const [descargando, setDescargando] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const idsAnulandoRef = useRef<Set<string>>(new Set());
  const [idsAnulando, setIdsAnulando] = useState<Set<string>>(new Set());
  const [ticketSeleccionadoParaVer, setTicketSeleccionadoParaVer] = useState<string | null>(null);

  const handlePrint`
);

c = c.replace(
`    setLoading(false);
  };

  if (!isOpen || !caja) return null;`,
`    setLoading(false);
  };

  const handleDeleteMovimiento = async (idMov: string, isTicket: boolean) => {
    if (isTicket) {
      if (!window.confirm('⚠️ ¿Seguro que deseas ELIMINAR permanentemente esta venta de la base de datos?\\n(ESTO NO DEVUELVE EL STOCK. SI QUIERES DEVOLVER STOCK, USA "ANULAR/DEVOLVER" EN VEZ DE ESTE BOTÓN).')) return;
      const { error } = await supabase.from('sales').delete().eq('id', idMov);
      if (error) alert('No se pudo eliminar la venta: ' + error.message);
      else cargarResumenTicket();
      return;
    }

    const mov = movimientos.find(m => String(m.id) === String(idMov));
    if (mov && String(mov.flujo) === 'INGRESO_FIADO') {
      alert('Este ingreso es un abono de crédito. Anúlalo desde Créditos.');
      return;
    }

    if (window.confirm('⚠️ ¿Seguro que deseas ELIMINAR este movimiento? Esta acción recalculará la caja.')) {
      const { error } = await supabase.from('cash_movements').delete().eq('id', idMov);
      if (error) alert('Error al eliminar: ' + error.message);
      else cargarResumenTicket();
    }
  };

  const handleAnularTicket = async (id: string) => {
    if (idsAnulandoRef.current.has(id)) return;
    if (id.startsWith('ERR-')) return;
    if (!window.confirm('⚠️ ¿Seguro que deseas ANULAR este ticket? El stock regresará y el dinero se descontará de la caja.')) return;

    idsAnulandoRef.current.add(id);
    setIdsAnulando(new Set(idsAnulandoRef.current));

    try {
      const { data: venta, error: errVenta } = await supabase.from('sales').select('*').eq('id', id).single();
      if (errVenta || !venta) throw errVenta || new Error('No se encontró la venta.');
      if (venta.sunat_status === 'ANULADO') {
        alert('Este ticket ya estaba anulado.');
        return;
      }

      const ticketTag = \`Ticket #\${id}\`;
      const { data: movsInv } = await supabase.from('inventory_movements').select('*').eq('operation_type', 'VENTA').eq('notes', ticketTag);

      for (const mov of movsInv || []) {
        const cantidad = Math.abs(Number(mov.change_amount) || 0);
        if (cantidad <= 0) continue;
        if (mov.batch_id) {
          const { data: lote } = await supabase.from('batches').select('quantity').eq('id', mov.batch_id).single();
          await supabase.from('batches').update({ quantity: Number(lote?.quantity || 0) + cantidad }).eq('id', mov.batch_id);
        }
        const { data: producto } = await supabase.from('products').select('quantity').eq('id', mov.product_id).single();
        const prevProducto = Number(producto?.quantity || 0);
        const nuevoProducto = prevProducto + cantidad;
        await supabase.from('products').update({ quantity: nuevoProducto }).eq('id', mov.product_id);

        await supabase.from('inventory_movements').insert([{
          batch_id: mov.batch_id, product_id: mov.product_id, product_name: mov.product_name,
          change_amount: cantidad, previous_quantity: prevProducto, new_quantity: nuevoProducto,
          operation_type: 'ANULACION', reason: 'Anulación de venta', notes: \`Anulación \${ticketTag}\`,
          created_at: new Date().toISOString(), user: 'Sistema', is_synced: 1
        }]);
      }

      await supabase.from('sales').update({ sunat_status: 'ANULADO' }).eq('id', id);

      const { data: fiado } = await supabase.from('fiados').select('*').eq('sale_id', id).maybeSingle();
      if (fiado) {
        await supabase.from('fiados').update({ status: 'ANULADO' }).eq('id', fiado.id);
      }

      if (!fiado) {
        await supabase.from('cash_movements').insert([{
          session_id: caja.id,
          type: 'EGRESO',
          amount: Number(venta.amount_cash || 0) + Number(venta.amount_yape || 0) + Number(venta.amount_card || 0),
          description: \`Devolución (Anulación Ticket #\${String(id).slice(-6)})\`,
          payment_type: 'EFECTIVO',
          flujo: 'DEVOLUCION',
          created_at: new Date().toISOString(),
          is_synced: 1
        }]);
      }

      alert('✅ Ticket anulado. Stock devuelto y caja actualizada.');
      cargarResumenTicket();
    } catch (err: any) {
      alert('❌ Error al anular: ' + err.message);
    } finally {
      idsAnulandoRef.current.delete(id);
      setIdsAnulando(new Set(idsAnulandoRef.current));
    }
  };

  if (!isOpen || !caja) return null;`
);

c = c.replace(
`  const ventasValidas = tickets.filter(t => t.sunat_status !== 'ANULADO');
  const totalMovimientos = movimientos.reduce((a, m) => a + (m.type === 'INGRESO' ? Number(m.amount) : -Number(m.amount)), 0);`,
`  const ventasValidas = tickets.filter(t => t.sunat_status !== 'ANULADO');
  const totalMovimientos = movimientos.reduce((a, m) => a + (m.type === 'INGRESO' ? Number(m.amount) : -Number(m.amount)), 0);
  
  const esAnulada = (s: any) => s.status === 'ANULADO' || s.sunat_status === 'ANULADO';

  const unificados: UnifiedItem[] = [
    ...tickets.map(t => {
      const creditoOriginal = Number(t.amount_credit || 0);
      const esFiado = creditoOriginal > 0;
      return {
        id: String(t.id),
        created_at: t.created_at,
        isTicket: true,
        tipo: 'VENTA',
        descripcion: \`Ticket #\${String(t.id).slice(-6)}\`,
        metodo_pago: esFiado ? 'FIADO' : (t.payment_type || 'MIXTO'),
        monto: Number(t.total) || 0,
        estado: esAnulada(t) ? 'ANULADO' : 'COMPLETADO',
        es_fiado: esFiado,
        cliente_nombre: null,
        flujo: 'INTERNO'
      };
    }),
    ...movimientos.map(m => ({
      id: String(m.id),
      created_at: m.created_at,
      isTicket: false,
      tipo: m.type,
      descripcion: m.description,
      metodo_pago: m.payment_type,
      monto: Number(m.amount) || 0,
      flujo: m.flujo
    }))
  ];
  unificados.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());`
);

c = c.replace(
  /              <div>\s*<h3 className=\"text-sm font-black text-\[var\(--color-ink\)\] uppercase tracking-widest mb-2 border-b-2 border-\[var\(--color-ink\)\] pb-1\">\s*Ventas \(\{ventasValidas\.length\}\)\s*<\/h3>[\s\S]*?Total Movimientos.*?<\/span>\s*<\/div>\s*<\/>\s*\)}\s*<\/div>/g,
`              <div className="flex-1 min-h-[400px] border-2 border-[var(--color-border)]">
                <TablaMovimientos 
                  movimientos={unificados} 
                  onDelete={handleDeleteMovimiento}
                  onVerTicket={(id) => setTicketSeleccionadoParaVer(id)}
                  onAnularTicket={handleAnularTicket}
                  idsAnulando={idsAnulando}
                />
              </div>`
);


c = c.replace(
`      </div>
    </div>
  );
};`,
`      </div>

      <ModalDetalleTicket 
        ticketId={ticketSeleccionadoParaVer} 
        onClose={() => setTicketSeleccionadoParaVer(null)} 
      />
    </div>
  );
};`
);

fs.writeFileSync('src/sections/Finanzas/components/ModalDetalleCaja.tsx', c);
