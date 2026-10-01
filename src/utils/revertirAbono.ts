// src/utils/revertirAbono.ts
import { supabase } from '../db/supabase';

/**
 * Revierte un abono de fiado: borra su fila en debt_payments y el movimiento de caja
 * (INGRESO_FIADO) que el trigger fn_register_fiado_payment_in_cash generó automáticamente
 * al pagarlo. En la BD no existe ningún trigger que limpie cash_movements al borrar un
 * debt_payment, así que sin este segundo borrado el dinero del abono queda contado para
 * siempre en Finanzas/Reportes aunque el pago ya no exista.
 */
export async function eliminarAbonoYRevertirCaja(pago: {
  id: string | number;
  session_id?: string | number | null;
  amount: number;
  created_at: string;
}): Promise<void> {
  if (pago.session_id) {
    await supabase
      .from('cash_movements')
      .delete()
      .eq('session_id', String(pago.session_id))
      .eq('flujo', 'INGRESO_FIADO')
      .eq('amount', pago.amount)
      .eq('created_at', pago.created_at);
  }

  const { error } = await supabase.from('debt_payments').delete().eq('id', pago.id);
  if (error) throw error;
}
