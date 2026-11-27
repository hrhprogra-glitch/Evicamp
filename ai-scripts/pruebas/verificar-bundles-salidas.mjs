// Comprueba por HTTP que el bundle servido contiene el arreglo de Salidas para PC pequeña.
// No necesita login, SSH ni puppeteer (solo fetch). Uso: node ai-scripts/pruebas/verificar-bundles-salidas.mjs [sitio...]
const URLS = {
  nego: 'https://nego.siumax.duckdns.org',
  ecosistema: 'https://ecosistema123.duckdns.org',
  evicamp: 'https://evicamp.duckdns.org',
};
const sitios = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(URLS);
let ok = 0, fallos = 0;
const comprobar = (nombre, condicion, detalle = '') => {
  if (condicion) { ok++; console.log(`  OK  ${nombre}`); }
  else { fallos++; console.log(`  FALLO ${nombre}${detalle ? ` · ${detalle}` : ''}`); }
};

for (const sitio of sitios) {
  if (!URLS[sitio]) { console.log(`  FALLO ${sitio}: sitio desconocido`); fallos++; continue; }
  console.log(`\n=== ${sitio} ===`);
  const html = await (await fetch(URLS[sitio], { cache: 'no-store' })).text();
  const bundles = [...html.matchAll(/(?:src|href)="(\/assets\/[^" ]+\.(?:js|css))"/g)].map((m) => m[1]);
  const js = bundles.find((b) => /index-.*\.js$/.test(b));
  const css = bundles.find((b) => /index-.*\.css$/.test(b));
  console.log(`  bundles: ${js || '?'} / ${css || '?'}`);
  comprobar(`${sitio}: index.html trae JS y CSS`, !!js && !!css);
  if (!js || !css) continue;
  const jsTxt = await (await fetch(URLS[sitio] + js, { cache: 'no-store' })).text();
  const cssTxt = await (await fetch(URLS[sitio] + css, { cache: 'no-store' })).text();
  comprobar(`${sitio}: el JS trae la lista adaptable`, jsTxt.includes('tabla-salidas-scroll') && jsTxt.includes('data-etiqueta'));
  comprobar(`${sitio}: el CSS trae la tabla compacta y las tarjetas`, cssTxt.includes('tabla-salidas-scroll') && cssTxt.includes('1101px'));
  comprobar(`${sitio}: ya no está el ancho fijo de 1080 px`, !jsTxt.includes('min-w-\\[1080px\\]'));
  comprobar(`${sitio}: el JS trae el botón TUBO/M del buscador`, jsTxt.includes('btn-unidad-busqueda-salida'));
  comprobar(`${sitio}: el JS trae Descargar y el visor de Compras`, jsTxt.includes('btn-detalle-descargar-') && jsTxt.includes('btn-visor-cerrar'));
  comprobar(`${sitio}: el JS trae Importar en Nueva lista y el cartel de adjuntado`,
    jsTxt.includes('btn-importar-compra') && jsTxt.includes('estado-adjuntos') && jsTxt.includes('Importar de nuevo'));
  comprobar(`${sitio}: el JS trae Dirección/Ubicación en una línea`, jsTxt.includes('min-w-0 flex-1 truncate'));
  // «Cancelar (Esc)» sigue existiendo en OTROS modales del bundle; solo miramos el trozo del botón nuevo.
  const iEspera = jsTxt.indexOf('btn-guardar-y-otra-salida');
  comprobar(`${sitio}: el JS trae el botón «Espera» al lado de la X`,
    iEspera >= 0 && /espera/i.test(jsTxt.slice(iEspera, iEspera + 900))
      && jsTxt.slice(iEspera, iEspera + 900).includes('btn-cerrar-modal-nueva-salida'));
}

console.log(`\nRESULTADO: ${ok} OK, ${fallos} fallos`);
process.exitCode = fallos ? 1 : 0;
