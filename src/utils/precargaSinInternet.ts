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
        // Créditos (src/sections/Fiados/index.tsx)
        traerTodo(() => supabase.from('products').select('*').order('id')),
        traerTodo(() => supabase.from('customers').select('*').order('id')),
        traerTodo(() => supabase.from('fiados').select('*').in('status', ['PENDIENTE', 'VENCIDO', 'CANCELADO']).order('id')),
        traerTodo(() => supabase.from('debt_payments').select('*').order('id')),
      ]);
    } catch { hecha = false; /* se reintenta la próxima vez que abra */ }
  }, 8_000);
};
