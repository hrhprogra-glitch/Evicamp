const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const envFile = fs.readFileSync('.env', 'utf-8');
const env = {};
envFile.split('\n').forEach(l => {
  const [k, v] = l.split('=');
  if (k && v) env[k.trim()] = v.trim();
});
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
(async () => {
  const { data, error } = await supabase.from('fiados').select('*').limit(1);
  if (error) {
    console.error(error);
  } else {
    console.log('Columns in fiados:', Object.keys(data[0] || {}));
  }
})();
