import { supabase } from './src/db/supabase.js';

async function checkToday() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { data: sales, error: errSales } = await supabase
    .from('sales')
    .select('*')
    .gte('created_at', startOfDay.toISOString());

  console.log("Sales today:", sales ? sales.length : 0);
  console.log("Sales details:");
  if (sales) {
    sales.forEach(s => console.log(`ID: ${s.id}, Total: ${s.total}, Time: ${s.created_at}, Status: ${s.sunat_status}`));
  }
}

checkToday().catch(console.error);
