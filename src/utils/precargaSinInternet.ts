/**
 * src/utils/precargaSinInternet.ts
 * Modo sin internet: al abrir el sistema CON internet, descarga en segundo plano lo que necesitan
 * las secciones que el cajero quizá no abrió (Inventario, Créditos). Así, si luego se corta el internet,
 * también se ven. Son EXACTAMENTE las mismas consultas que hacen esas pantallas (mismas copias).
 * Si se cambia una consulta en Inventario/index.tsx o Fiados/index.tsx, actualizarla aquí también.
 */
import { supabase } from '../db/supabase';
import { traerTodo } from './traerTodo';
import { hayConexion } from './sinInternet';

let hecha = false;

export const precargarParaSinInternet = () => {
  if (hecha || !import.meta.env.PROD) return;
  hecha = true;
  // Unos segundos después de abrir, para no competir con la pantalla que el cajero está usando
  setTimeout(async () => {
    if (!hayConexion()) { hecha = false; return; }
    try {
      await Promise.all([
        // Inventario (src/sections/Inventario/index.tsx)
        traerTodo(() => supabase.from('products').select('*').eq('is_active', 1).order('id')),
        traerTodo(() => supabase.from('batches').select('id, product_id, quantity, cost_unit').order('id')),
        supabase.from('categories').select('name'),
        // Mermas (src/sections/Mermas/index.tsx) y los lotes COMPLETOS: la ventana de merma pide los lotes
        // de un producto; sin internet se filtran en la PC desde esta copia (sinInternet.ts → copiaFiltrada)
        traerTodo(() => supabase.from('waste').select('*').order('created_at', { ascending: false }).order('id')),
        traerTodo(() => supabase.from('batches').select('*').order('id')),
        // Créditos (src/sections/Fiados/index.tsx)
        traerTodo(() => supabase.from('products').select('*').order('id')),
        traerTodo(() => supabase.from('customers').select('*').order('id')),
        traerTodo(() => supabase.from('fiados').select('*').in('status', ['PENDIENTE', 'VENCIDO', 'CANCELADO']).order('id')),
        traerTodo(() => supabase.from('debt_payments').select('*').order('id')),
        // Proveedores (Inventario > Proveedores e Ingresar lote, src/sections/Inventario/components/ModalGestionProveedores.tsx)
        traerTodo(() => supabase.from('providers').select('*').neq('estado', 'ELIMINADO').order('created_at', { ascending: false })),
        // Pestaña Lotes: lotes con su producto (src/sections/Inventario/components/TablaLotes.tsx → fetchLotes)
        supabase.from('batches').select('*, products!batches_product_id_fkey (*)').neq('is_active', 0).order('created_at', { ascending: false }),
        // Pedidos de Compras con sus productos (src/sections/Inventario/components/PanelCompras.tsx → cargar)
        supabase.from('compras').select('*, compras_detalle(*)').order('created_at', { ascending: false }).limit(200),
        // Ajustes > Datos de la empresa (src/sections/Configuraciones/components/FormularioEmpresa.tsx)
        supabase.from('empresa_config').select('*').limit(1).single(),
      ]);
    } catch { hecha = false; /* se reintenta la próxima vez que abra */ }
    void precargarFinanzas();
    setInterval(() => { if (hayConexion()) void precargarFinanzas(); }, 2 * 60_000);
  }, 8_000);
};

// Finanzas (src/sections/Finanzas/index.tsx → cargarDatosCaja): la caja abierta con sus movimientos,
// ventas, detalles y fiados. Se repite cada 2 minutos: si se corta el internet a media tarde, se ve
// todo lo vendido hasta ese momento (y lo hecho sin internet se suma encima, ver sinInternet.ts).
const precargarFinanzas = async () => {
  try {
    const { data: caja } = await supabase.from('cash_sessions').select('*').eq('status', 'OPEN')
      .order('opened_at', { ascending: false }).limit(1).maybeSingle();
    if (!caja) return;
    const [, { data: ventas }] = await Promise.all([
      traerTodo<any>(() => supabase.from('cash_movements').select('*').eq('session_id', caja.id).order('id')),
      traerTodo<any>(() => supabase.from('sales').select('*').gte('created_at', caja.opened_at).order('id')),
    ]);
    const ids = (ventas || []).map((v: any) => v.id);
    const conCredito = (ventas || []).filter((v: any) => Number(v.amount_credit || 0) > 0).map((v: any) => v.id);
    // Por bloques de 200 (como Finanzas): un link con miles de ids sería demasiado largo
    for (let i = 0; i < ids.length; i += 200) {
      await supabase.from('sale_details').select('*').in('sale_id', ids.slice(i, i + 200));
    }
    // De qué lote salió cada venta: así anular sin internet devuelve el stock al lote correcto
    // (sinInternet.ts → IMITAR_RPC.fn_anular_venta). Bloques de 100: cada nota es más larga que un id.
    for (let i = 0; i < ids.length; i += 100) {
      await supabase.from('inventory_movements').select('id, batch_id, product_id, product_name, change_amount, operation_type, notes')
        .eq('operation_type', 'VENTA').in('notes', ids.slice(i, i + 100).map((id: any) => `Ticket #${id}`));
    }
    if (conCredito.length) await supabase.from('fiados').select('sale_id, customer_name, amount, paid_amount').in('sale_id', conCredito);
  } catch { /* se intenta de nuevo en 2 minutos */ }
};
