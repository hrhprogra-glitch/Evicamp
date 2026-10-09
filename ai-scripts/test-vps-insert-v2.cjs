const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://evicamp.duckdns.org';
const SUPABASE_KEY = 'public-anon-key';

// ----------------------------------------------------------------------
// EL INTERCEPTOR MAESTRO (Optimizado para Nginx)
// ----------------------------------------------------------------------
const customFetch = (url, options) => {
  const urlString = url.toString();
  const fetchOptions = { ...options };
  const headers = new Headers(fetchOptions.headers);
  headers.delete('Authorization');
  fetchOptions.headers = headers;
  return fetch(urlString, fetchOptions);
};

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
  global: {
    headers: { 'Accept-Profile': 'public' },
    fetch: customFetch 
  }
});

async function testInsert() {
  console.log('Intentando registrar al cliente JHOSELIN en la tabla customers...');
  
  const { data, error } = await supabase.from('customers').insert([{
    name: 'JHOSELIN_PRUEBA_SISTEMA',
    dni: '99999999',
    created_at: new Date().toISOString(),
    is_synced: '1'
  }]).select('id').single();

  if (error) {
    console.error('❌ ERROR FALLO SQL:', error.message);
  } else {
    console.log('✅ EXITO! Cliente insertado. Datos devueltos por la BD:', data);
    
    console.log('Eliminando cliente de prueba para limpiar...');
    const delRes = await supabase.from('customers').delete().eq('id', data.id);
    if (delRes.error) {
      console.error('No se pudo borrar el dato de prueba:', delRes.error.message);
    } else {
      console.log('✅ Dato de prueba borrado correctamente.');
    }
  }
}

testInsert();
