import { supabase } from './src/db/supabase.js';

async function run() {
  const { data } = await supabase.from('debt_payments').select('*').limit(1);
  console.log(data);
}
run();
