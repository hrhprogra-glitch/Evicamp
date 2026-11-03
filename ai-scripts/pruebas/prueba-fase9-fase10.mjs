// Prueba automatizada para Fase 9 (Múltiples Tiendas) y Fase 10 (Catálogo Web)
const BASE_URL = 'https://siumax.duckdns.org';

async function test() {
  console.log('--- Iniciando prueba de API para Fase 9 y 10 en siumax ---');

  try {
    // 1. Probar fn_catalogo_publico sin sesión (debe responder 200 OK)
    const respCatalogo = await fetch(`${BASE_URL}/rest/v1/rpc/fn_catalogo_publico`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    console.log('Status fn_catalogo_publico:', respCatalogo.status);
    if (!respCatalogo.ok) {
      const err = await respCatalogo.text();
      console.error('Error en catálogo público:', err);
    } else {
      const data = await respCatalogo.json();
      console.log('Catálogo recibido con éxito:');
      console.log('- Empresa:', data.empresa?.nombre_comercial);
      console.log('- Tiendas encontradas:', data.tiendas?.length);
      console.log('- Categorías:', data.categorias?.length);
      console.log('- Productos para catálogo:', data.productos?.length);
    }

    // 2. Probar que stores esté disponible
    const respStores = await fetch(`${BASE_URL}/rest/v1/stores?select=*`);
    console.log('Status GET /stores:', respStores.status);
    if (respStores.ok) {
      const stores = await respStores.json();
      console.log('Lista de tiendas en DB:', stores);
    }

    console.log('--- Fin de prueba ---');
  } catch (err) {
    console.error('Error durante la prueba:', err);
  }
}

test();
