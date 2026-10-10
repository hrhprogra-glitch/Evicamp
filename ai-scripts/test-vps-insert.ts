import { supabase } from './src/db/supabase';

async function testInsert() {
  console.log('Intentando registrar al cliente JHOSELIN en la tabla customers (vía VPS Nginx Interceptor)...');
  
  const { data, error } = await supabase.from('customers').insert([{
    name: 'JHOSELIN_PRUEBA_SISTEMA',
    dni: '99999999',
    created_at: new Date().toISOString(),
    is_synced: '1'
  }]).select('id').single();

  if (error) {
    console.error('❌ ERROR FALLO SQL:', error.message);
  } else {
    console.log('✅ EXITO! Cliente insertado sin error SQL. Datos devueltos por la BD:', data);
    
    console.log('Eliminando cliente de prueba para limpiar...');
    const delRes = await supabase.from('customers').delete().eq('id', data.id);
    if (delRes.error) {
      console.error('No se pudo borrar el dato de prueba:', delRes.error.message);
    } else {
      console.log('✅ Dato de prueba borrado correctamente del VPS.');
    }
  }
}

testInsert();
