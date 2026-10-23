/**
 * src/utils/sinInternet.ts
 * MODO SIN INTERNET (programa de PC y app instalada). Todo pasa por customFetch (src/db/supabase.ts):
 *  1) Estado de la conexión: evento "siumax-conexion" cuando cambia.
 *  2) Copias de las consultas: sin internet, todas las secciones se ven con la última copia (fase 2).
 *  3) Cola de lo que se hace sin internet (ventas, fiados...): se guarda en el DISCO antes de responder
 *     "listo" a la pantalla (si salió el ticket, la venta está guardada) y se sube sola, en orden, al
 *     volver la conexión, con la sesión de quien la hizo (así queda su nombre). Nunca se duplica.
 */
import {
  guardarLocal, leerLocal, leerTodoLocal, borrarLocal, clavesLocal,
  ALMACEN_RESPUESTAS, ALMACEN_PENDIENTES,
} from './almacenLocal';

// ---------------------------------------------------------------- 1) conexión
let enLinea = true;
export const hayConexion = () => enLinea;
// Venía funcionando: se espera más (no cortar consultas lentas pero buenas). Ya sin conexión: 3 s.
export const esperaMaxima = () => (enLinea ? 10_000 : 3_000);

export const avisarConexion = (ahora: boolean) => {
  if (ahora === enLinea) return;
  enLinea = ahora;
  window.dispatchEvent(new CustomEvent('siumax-conexion', { detail: { enLinea: ahora } }));
  if (ahora) void subirPendientes();
};

export const pedirConLimite = (url: string, opciones: RequestInit, ms = esperaMaxima()) => {
  const control = new AbortController();
  const original = opciones.signal;
  if (original) {
    if (original.aborted) control.abort();
    else original.addEventListener('abort', () => control.abort(), { once: true });
  }
  const temporizador = setTimeout(() => control.abort(), ms);
  return fetch(url, { ...opciones, signal: control.signal }).finally(() => clearTimeout(temporizador));
};

// ---------------------------------------------------------------- 2) copias de las consultas
interface CopiaGuardada { cuerpo: string; estado: number; tipo: string | null; rango: string | null; guardado: number }

export const guardarCopia = (clave: string, respuesta: Response) => {
  respuesta.text()
    .then((cuerpo) => guardarLocal(ALMACEN_RESPUESTAS, {
      cuerpo, estado: respuesta.status, tipo: respuesta.headers.get('Content-Type'),
      rango: respuesta.headers.get('Content-Range'), guardado: Date.now(),
    } satisfies CopiaGuardada, clave))
    .catch(() => { /* sin espacio o sin almacenamiento: se sigue funcionando con internet */ });
};

// La misma consulta aunque esté ordenada distinto (por ejemplo, los productos que cargó la Caja
// sirven para Inventario): misma tabla, mismas columnas, mismos filtros y mismo bloque de filas
const sinOrden = (clave: string) => {
  const [url, rango = ''] = clave.split('|');
  const u = new URL(url, location.origin);
  u.searchParams.delete('order');
  u.searchParams.sort();
  return `${u.pathname}?${u.searchParams}|${rango}`;
};

const copiaParecida = async (clave: string) => {
  const buscada = sinOrden(clave);
  let mejor: CopiaGuardada | null = null;
  for (const otra of await clavesLocal(ALMACEN_RESPUESTAS)) {
    if (sinOrden(String(otra)) !== buscada) continue;
    const copia = await leerLocal<CopiaGuardada>(ALMACEN_RESPUESTAS, otra);
    if (copia && (!mejor || copia.guardado > mejor.guardado)) mejor = copia;
  }
  return mejor;
};

// Sin copia de ESTA consulta con filtros (por ejemplo, "los lotes del producto X" en la merma): se
// toma la copia de la tabla COMPLETA (sin filtros, la deja la precarga) y se filtra aquí en la PC.
// Solo filtros simples; si la consulta usa algo más complejo, no se inventa nada (devuelve null).
const PARAMS_SIN_FILTRO = new Set(['select', 'order', 'limit', 'offset', 'columns', 'on_conflict']);

// Compara números, fechas (las del servidor y las de la PC tienen formato distinto) o texto
const comparar = (a: unknown, b: string) => {
  const na = Number(a), nb = Number(b);
  if (a !== null && a !== '' && !Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  const fa = Date.parse(String(a)), fb = Date.parse(b);
  if (/^\d{4}-\d{2}-\d{2}/.test(b) && !Number.isNaN(fa) && !Number.isNaN(fb)) return fa - fb;
  return String(a ?? '') < b ? -1 : String(a ?? '') > b ? 1 : 0;
};
const listaDe = (dato: string) => dato.replace(/^\(|\)$/g, '').split(',').map((x) => x.replace(/^"|"$/g, ''));

const cumpleFiltro = (valor: unknown, filtro: string): boolean | null => {
  const [op, ...resto] = filtro.split('.');
  const dato = resto.join('.');
  const v = valor == null ? null : String(valor);
  switch (op) {
    case 'eq': return v === dato;
    case 'neq': return v !== dato;
    case 'gt': return valor != null && comparar(valor, dato) > 0;
    case 'gte': return valor != null && comparar(valor, dato) >= 0;
    case 'lt': return valor != null && comparar(valor, dato) < 0;
    case 'lte': return valor != null && comparar(valor, dato) <= 0;
    case 'in': return listaDe(dato).includes(v ?? '');
    case 'is': return dato === 'null' ? valor == null : String(valor) === dato;
    default: return null; // filtro que no se sabe evaluar
  }
};

// ¿La copia guardada (con su filtro) trae TODAS las filas que pide la consulta (con el suyo)?
// Ej.: guardado "detalles de las ventas 1,2,3" sirve para pedir "detalles de la venta 2".
// Los ids hechos sin internet no están en el servidor: no hace falta que estén en la copia.
const cubre = (guardado: string, pedido: string | undefined, locales: Set<string>) => {
  if (pedido === undefined) return false;
  if (guardado === pedido) return true;
  const [opG, ...rG] = guardado.split('.'); const datoG = rG.join('.');
  const [opP, ...rP] = pedido.split('.'); const datoP = rP.join('.');
  if (opG === 'in' && (opP === 'in' || opP === 'eq')) {
    const enCopia = new Set(listaDe(datoG));
    return (opP === 'in' ? listaDe(datoP) : [datoP]).every((x) => enCopia.has(x) || locales.has(x));
  }
  if ((opG === 'gte' || opG === 'gt') && opP === opG) return comparar(datoP, datoG) >= 0;
  return false;
};

const filtrosDe = (u: URL) => [...u.searchParams].filter(([k]) => !PARAMS_SIN_FILTRO.has(k));
const columnasDe = (u: URL) => (u.searchParams.get('select') || '*').split(',').map((c) => c.trim());

// Ordena, recorta columnas y arma la respuesta como la daría el servidor
const armarRespuesta = (pedida: URL, filas: Record<string, unknown>[]): CopiaGuardada => {
  let resultado = filas;
  const [colOrden, dir] = (pedida.searchParams.get('order') || '').split(',')[0].split('.');
  if (colOrden) {
    resultado = [...resultado].sort((a, b) => comparar(a[colOrden], String(b[colOrden] ?? '')));
    if (dir === 'desc') resultado.reverse();
  }
  const cols = columnasDe(pedida);
  if (!cols.includes('*')) resultado = resultado.map((f) => Object.fromEntries(cols.map((c) => [c, f[c]])));
  return {
    cuerpo: JSON.stringify(resultado), estado: 200, tipo: 'application/json; charset=utf-8',
    rango: `0-${Math.max(0, resultado.length - 1)}/${resultado.length}`, guardado: Date.now(),
  };
};

const cumpleTodos = (fila: Record<string, unknown>, filtros: [string, string][]) => {
  for (const [columna, filtro] of filtros) {
    const ok = cumpleFiltro(fila[columna], filtro);
    if (ok !== true) return ok; // false o null (filtro que no se sabe evaluar)
  }
  return true;
};

const copiaFiltrada = async (clave: string) => {
  const [url] = clave.split('|');
  const pedida = new URL(url, location.origin);
  const filtros = filtrosDe(pedida);
  if (!filtros.length) return null;
  const columnas = columnasDe(pedida);
  if (columnas.some((c) => /[()!:]/.test(c))) return null; // con relaciones o renombres: no se arma en la PC
  const pedidos = new Map(filtros);
  const locales = await idsLocales();

  // Copias de la misma tabla con TODAS las columnas pedidas Y las de los filtros (si no, al juntar filas una
  // copia con menos columnas pisaba a la completa y el filtro ya no se podía revisar: los lotes "activos"
  // de un producto salían vacíos) y con un filtro igual o más amplio: se juntan sus filas
  const necesarias = [...columnas, ...filtros.map(([k]) => k)];
  const filas = new Map<string, Record<string, unknown>>();
  for (const otra of await clavesLocal(ALMACEN_RESPUESTAS)) {
    const u = new URL(String(otra).split('|')[0], location.origin);
    if (u.pathname !== pedida.pathname) continue;
    const suyas = columnasDe(u);
    if (!suyas.includes('*') && !necesarias.every((c) => c !== '*' && suyas.includes(c))) continue;
    if (!filtrosDe(u).every(([k, f]) => cubre(f, pedidos.get(k), locales))) continue;
    const copia = await leerLocal<CopiaGuardada>(ALMACEN_RESPUESTAS, otra);
    try { for (const f of JSON.parse(copia?.cuerpo || '[]')) filas.set(String(f?.id ?? JSON.stringify(f)), f); } catch { /* no es lista */ }
  }
  if (!filas.size) return null;

  const resultado: Record<string, unknown>[] = [];
  for (const fila of filas.values()) {
    const ok = cumpleTodos(fila, filtros);
    if (ok === null) return null;
    if (ok) resultado.push(fila);
  }
  return armarRespuesta(pedida, resultado);
};

// ---------------------------------------------------------------- lo hecho sin internet, en pantalla
type Fila = Record<string, unknown>;
type Filtros = [string, string][];
// Lo que una acción hecha sin internet le hace a los datos, para verlo en pantalla antes de subirlo.
// Las acciones del servidor (recibir pedido, editar o retirar lote, borrar producto) se imitan así.
type Efecto =
  | { tipo: 'nueva'; tabla: string; fila: Fila }
  | { tipo: 'cambio'; tabla: string; filtros: Filtros; cambios: Fila }
  | { tipo: 'borrado'; tabla: string; filtros: Filtros }
  | { tipo: 'stock'; producto: string; delta: number };
const cumpleExacto = (fila: Fila, filtros: Filtros) => cumpleTodos(fila, filtros) === true;

const aplicarEnPendientes = (porTabla: Map<string, Fila[]>, e: Efecto) => {
  if (e.tipo === 'nueva') { porTabla.set(e.tabla, [...(porTabla.get(e.tabla) || []), { ...e.fila }]); return; }
  if (e.tipo === 'stock') {
    for (const p of porTabla.get('products') || []) if (String(p.id) === e.producto) p.quantity = Math.max(0, Number(p.quantity || 0) + e.delta);
    return;
  }
  const filas = porTabla.get(e.tabla) || [];
  if (e.tipo === 'borrado') porTabla.set(e.tabla, filas.filter((f) => !cumpleExacto(f, e.filtros)));
  else for (const f of filas) if (cumpleExacto(f, e.filtros)) Object.assign(f, e.cambios);
};

// Las filas guardadas en la cola (ventas, abonos, movimientos, mermas...) se suman a lo que se lee
// de las copias: así Finanzas muestra lo vendido y cobrado sin internet.
const filasPendientes = async () => {
  const porTabla = new Map<string, Fila[]>();
  const agregar = (tabla: string, fila: Fila) => porTabla.set(tabla, [...(porTabla.get(tabla) || []), fila]);
  for (const p of await leerPendientes()) {
    const tabla = p.accion.split('/')[1];
    // Acción del servidor hecha sin internet: sus efectos, en orden
    if (p.efectos) { for (const e of p.efectos) aplicarEnPendientes(porTabla, e); continue; }
    // Cambios y borrados de algo creado sin internet (ej. caja abierta y cerrada sin internet, cliente
    // creado y corregido, los productos de un pedido editado): se aplican a las filas que cumplen su
    // filtro (id u otro, ej. compra_id), en el orden en que se hicieron
    if (p.metodo === 'PATCH' || p.metodo === 'DELETE') {
      const filtros = filtrosDe(new URL(p.url, location.origin));
      if (!filtros.length) continue;
      const cambios = cambiosDe(p.cuerpo);
      if (p.metodo === 'DELETE') aplicarEnPendientes(porTabla, { tipo: 'borrado', tabla, filtros });
      else if (cambios) aplicarEnPendientes(porTabla, { tipo: 'cambio', tabla, filtros, cambios });
      continue;
    }
    if (p.metodo !== 'POST') continue;
    let datos: Record<string, unknown>[] = [];
    try { datos = [JSON.parse(p.cuerpo)].flat(); } catch { continue; }
    datos.forEach((f, i) => {
      agregar(tabla, { id: f.id ?? `local-${p.id}-${i}`, ...f });
      // En el servidor, cada abono crea su ingreso de caja (trigger fn_register_fiado_payment_in_cash)
      if (tabla === 'debt_payments') {
        agregar('cash_movements', {
          id: `local-abono-${p.id}-${i}`, session_id: f.session_id == null ? null : String(f.session_id),
          type: 'INGRESO', amount: f.amount, payment_type: f.payment_type, created_at: f.created_at,
          description: `ABONO DE FIADO / Cliente ID: ${f.customer_id ?? 'General'}`, flujo: 'INGRESO_FIADO', is_synced: 1,
        });
      }
      // Vender o mermar un producto CREADO sin internet: su stock también baja en pantalla (los que ya
      // existían bajan en las copias, ver descontarStockLocal y la merma en encolar)
      if (tabla === 'sale_details' || tabla === 'waste') {
        const cambio = tabla === 'sale_details' ? -Number(f.quantity || 0) : Number(f.quantity || 0);
        for (const prod of porTabla.get('products') || []) {
          if (String(prod.id) === String(f.product_id)) prod.quantity = Math.max(0, Number(prod.quantity || 0) + cambio);
        }
      }
    });
  }
  return porTabla;
};

// ids de lo hecho sin internet (ventas y sus detalles): no existen todavía en el servidor
const idsLocales = async () => {
  const ids = new Set<string>();
  for (const filas of (await filasPendientes()).values()) {
    for (const f of filas) { if (f.id != null) ids.add(String(f.id)); if (f.sale_id != null) ids.add(String(f.sale_id)); }
  }
  return ids;
};

const sumarPendientes = async (clave: string, copia: CopiaGuardada) => {
  const pedida = new URL(clave.split('|')[0], location.origin);
  const tabla = pedida.pathname.replace(/^\/rest\/v1\//, '');
  if (pedida.searchParams.has('offset') && pedida.searchParams.get('offset') !== '0') return copia;
  let filas: unknown;
  try { filas = JSON.parse(copia.cuerpo); } catch { return copia; }
  if (!Array.isArray(filas)) return copia;
  const filtros = filtrosDe(pedida);
  // Filas cambiadas sin internet que ya no cumplen lo que se pide (ej. la caja que se cerró ya no es
  // "la caja abierta"): se quitan. Solo se revisan los filtros cuya columna VIENE en la fila: si se
  // pidieron otras columnas (ej. solo "quantity" de los lotes de un producto), la fila ya no trae la del
  // filtro y NO se puede descartar por eso. Un filtro que no se sabe evaluar tampoco descarta.
  const yaNoCumple = (f: Record<string, unknown>) => filtros.some(([columna, filtro]) =>
    f && typeof f === 'object' && columna in f && cumpleFiltro(f[columna], filtro) === false);
  const vigentes = filtros.length ? filas.filter((f) => !yaNoCumple(f)) : filas;
  const pendientes = await filasPendientes();
  const nuevas = pendientes.get(tabla) || [];
  const yaEstan = new Set(vigentes.map((f) => String(f?.id)));
  const extra = nuevas.filter((f) => !yaEstan.has(String(f.id)) && cumpleTodos(f, filtros) === true);
  if (!extra.length && vigentes.length === filas.length) return copia;
  // Lo creado sin internet que la pantalla pide CON otra tabla adentro (el pedido con sus productos, el
  // lote con su producto): se arma aquí, como lo haría el servidor
  const select = pedida.searchParams.get('select') || '';
  for (const rel of RELACIONES[tabla] || []) {
    if (!new RegExp(`(^|,)\\s*${rel.tabla}\\s*[!(]`).test(select)) continue;
    for (const fila of extra) {
      if (rel.uno) fila[rel.tabla] = (await filaLocal(rel.tabla, String(fila[rel.local]))) || null;
      else fila[rel.tabla] = (pendientes.get(rel.tabla) || []).filter((h) => String(h[rel.remoto]) === String(fila[rel.local]));
    }
  }
  return armarRespuesta(pedida, [...vigentes, ...extra]);
};

// Tablas que las pantallas piden con otra adentro (ver PanelCompras: compras con compras_detalle;
// TablaLotes: lotes con su producto)
const RELACIONES: Record<string, { tabla: string; local: string; remoto: string; uno: boolean }[]> = {
  batches: [{ tabla: 'products', local: 'product_id', remoto: 'id', uno: true }],
  compras: [{ tabla: 'compras_detalle', local: 'id', remoto: 'compra_id', uno: false }],
};

export const leerCopia = async (clave: string) => {
  try {
    let copia = (await leerLocal<CopiaGuardada>(ALMACEN_RESPUESTAS, clave))
      || (await copiaParecida(clave)) || (await copiaFiltrada(clave));
    if (!copia) return null;
    copia = await sumarPendientes(clave, copia);
    const cabeceras = new Headers();
    if (copia.tipo) cabeceras.set('Content-Type', copia.tipo);
    if (copia.rango) cabeceras.set('Content-Range', copia.rango);
    cabeceras.set('X-Siumax-Copia-Local', String(copia.guardado)); // de cuándo es la copia
    return new Response(copia.cuerpo, { status: copia.estado, headers: cabeceras });
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------- 3) cola de lo hecho sin internet
// Qué se puede hacer sin internet (método + tabla). Lo demás avisa que necesita internet.
//  Caja: ventas y fiados · Créditos: abonos · Finanzas: ingresos/egresos · Mermas: registrar, corregir, borrar
const PERMITIDO_SIN_INTERNET = new Set([
  'POST /sales', 'POST /sale_details', 'POST /fiados',
  // Devoluciones (anular venta) y cambios del fiado: así la devolución se guarda COMPLETA, no a medias
  'PATCH /sales', 'PATCH /fiados',
  'POST /debt_payments', 'POST /cash_movements',
  'POST /waste', 'PATCH /waste', 'DELETE /waste', 'POST /inventory_movements',
  // Fase SI-1 (22/10/2026): que el cajero siga trabajando sin internet
  'POST /cash_sessions', 'PATCH /cash_sessions',                     // abrir y cerrar caja
  'POST /customers', 'PATCH /customers', 'DELETE /customers',        // clientes
  'POST /products', 'PATCH /products',                               // crear y editar productos
  'POST /categories', 'DELETE /categories',
  'POST /batches',                                                   // ingresar lotes
  'POST /providers', 'PATCH /providers', 'DELETE /providers',        // proveedores
  // Fase SI-2: lo que calcula el servidor (ver IMITAR_RPC más abajo)
  'PATCH /batches',                                                  // editar lote (sus datos)
  'POST /compras', 'PATCH /compras',                                 // pedidos: crear, editar, anular
  'POST /compras_detalle', 'DELETE /compras_detalle',
  'POST /empresa_config', 'PATCH /empresa_config',                   // Ajustes > Datos de la empresa
  'POST /rpc/fn_recibir_compra', 'POST /rpc/fn_devolver_compra',     // recibir y devolver pedidos
  'POST /rpc/fn_edit_batch', 'POST /rpc/fn_soft_delete_batch',       // editar y retirar lote
  'POST /rpc/fn_soft_delete_product',                                // borrar producto
]);
// (antes de la fase SI-2 los lotes solo podían cambiar su cantidad sin internet)
const SOLO_CANTIDAD = new Set<string>();
// El stock se guarda como DIFERENCIA (no como número fijo): así dos cajas sin internet no se pisan
const CON_STOCK = new Set(['PATCH /batches', 'PATCH /products']);
// Tablas cuyo número (id) lo pone el servidor: sin internet lo pone la PC (el servidor lo acepta,
// sus ids son "BY DEFAULT"). Basado en la hora: nunca choca con los del servidor (van por miles).
const ID_DESDE_LA_PC: Record<string, 'numero' | 'uuid'> = {
  products: 'numero', customers: 'numero', providers: 'uuid', compras_detalle: 'numero', empresa_config: 'numero',
};
let ultimoIdNumero = 0;
const nuevoId = (tipo: 'numero' | 'uuid') => {
  if (tipo === 'uuid') return crypto.randomUUID();
  ultimoIdNumero = Math.max(Date.now(), ultimoIdNumero + 1); // único aunque se creen varios en el mismo milisegundo
  return ultimoIdNumero;
};
// Llevan una referencia única de la PC (ref_local): al subirlos, si ya llegaron, no se repiten
const CON_REFERENCIA = new Set(['POST /debt_payments', 'POST /cash_movements', 'POST /waste', 'POST /inventory_movements']);

const accionDe = (url: string, metodo: string) => {
  const tabla = new URL(url, location.origin).pathname.replace(/^\/rest\/v1/, '');
  return `${metodo.toUpperCase()} ${tabla}`;
};
const esSoloCantidad = (cuerpo: unknown) => {
  try {
    const datos = JSON.parse(String(cuerpo || ''));
    return !Array.isArray(datos) && Object.keys(datos).length === 1 && typeof datos.quantity === 'number';
  } catch { return false; }
};
export const sePuedeSinInternet = (url: string, metodo: string, cuerpo?: unknown) => {
  const accion = accionDe(url, metodo);
  return PERMITIDO_SIN_INTERNET.has(accion) || (SOLO_CANTIDAD.has(accion) && esSoloCantidad(cuerpo));
};

// Cuerpo de un cambio (PATCH) como objeto; null si no es un objeto
const cambiosDe = (cuerpo: string): Record<string, unknown> | null => {
  try {
    const datos = JSON.parse(cuerpo || 'null');
    return datos && typeof datos === 'object' && !Array.isArray(datos) ? datos : null;
  } catch { return null; }
};

// id de la fila en un filtro "id=eq.X" de la URL
const idDelFiltro = (url: string) => new URL(url, location.origin).searchParams.get('id')?.replace(/^eq\./, '') ?? null;

// Una copia puede ser una lista o UN registro (consultas .single(), ej. los datos de la empresa)
const filasDeCopia = (cuerpo: string): { filas: Fila[]; uno: boolean } | null => {
  try {
    const datos = JSON.parse(cuerpo || 'null');
    if (Array.isArray(datos)) return { filas: datos, uno: false };
    return datos && typeof datos === 'object' ? { filas: [datos], uno: true } : null;
  } catch { return null; }
};
const cuerpoDeCopia = (filas: Fila[], uno: boolean) => JSON.stringify(uno ? (filas[0] ?? null) : filas);

// Busca en las copias guardadas la fila de una tabla (para saber su cantidad actual)
const filaEnCopias = async (tabla: string, id: string) => {
  for (const clave of await clavesLocal(ALMACEN_RESPUESTAS)) {
    if (!String(clave).includes(`/rest/v1/${tabla}?`)) continue;
    const copia = await leerLocal<CopiaGuardada>(ALMACEN_RESPUESTAS, clave);
    try {
      const fila = filasDeCopia(copia?.cuerpo || '')?.filas.find((f) => String(f?.id) === id);
      if (fila) return fila as Record<string, unknown>;
    } catch { /* copia no es una lista */ }
  }
  return null;
};

// Cambia filas en todas las copias de una tabla (lo que se ve en pantalla sin internet)
const cambiarEnCopias = async (tabla: string, id: string, cambiar: (fila: Record<string, unknown>) => void) => {
  for (const clave of await clavesLocal(ALMACEN_RESPUESTAS)) {
    if (!String(clave).includes(`/rest/v1/${tabla}?`)) continue;
    const copia = await leerLocal<CopiaGuardada>(ALMACEN_RESPUESTAS, clave);
    if (!copia) continue;
    try {
      const copiaLeida = filasDeCopia(copia.cuerpo);
      if (!copiaLeida) continue;
      let cambio = false;
      for (const f of copiaLeida.filas) if (String(f?.id) === id) { cambiar(f); cambio = true; }
      if (cambio) await guardarLocal(ALMACEN_RESPUESTAS, { ...copia, cuerpo: cuerpoDeCopia(copiaLeida.filas, copiaLeida.uno) }, clave);
    } catch { /* copia no es una lista */ }
  }
};

// La fila como se ve ahora en la PC: primero lo hecho sin internet (lo más nuevo), si no la copia
const filaLocal = async (tabla: string, id: string) =>
  (await filasPendientes()).get(tabla)?.find((f) => String(f.id) === id) || (await filaEnCopias(tabla, id));

// Cambia (o quita) en las copias las filas que cumplen un filtro. compras_detalle también vive DENTRO de
// las copias de compras (PanelCompras las pide juntas): ahí también se cambia.
const cambiarFilasEnCopias = async (tabla: string, cambiar: (filas: Fila[]) => Fila[] | null) => {
  for (const clave of await clavesLocal(ALMACEN_RESPUESTAS)) {
    if (!String(clave).includes(`/rest/v1/${tabla}?`)) continue;
    const copia = await leerLocal<CopiaGuardada>(ALMACEN_RESPUESTAS, clave);
    if (!copia) continue;
    try {
      const copiaLeida = filasDeCopia(copia.cuerpo);
      if (!copiaLeida) continue;
      const nuevas = cambiar(copiaLeida.filas);
      if (nuevas) await guardarLocal(ALMACEN_RESPUESTAS, { ...copia, cuerpo: cuerpoDeCopia(nuevas, copiaLeida.uno) }, clave);
    } catch { /* copia no es una lista */ }
  }
};
const conFiltro = (filas: Fila[], filtros: Filtros, accion: (f: Fila) => Fila | null) => {
  let cambio = false;
  const resultado: Fila[] = [];
  for (const f of filas) {
    if (!cumpleExacto(f, filtros)) { resultado.push(f); continue; }
    cambio = true;
    const nueva = accion(f);
    if (nueva) resultado.push(nueva);
  }
  return cambio ? resultado : null;
};
const aplicarEnCopias = async (e: Efecto) => {
  if (e.tipo === 'stock') {
    await cambiarEnCopias('products', e.producto, (f) => { f.quantity = Math.max(0, Number(f.quantity || 0) + e.delta); });
    return;
  }
  if (e.tipo === 'nueva') {
    // Lo nuevo se ve por filasPendientes; un producto nuevo de un pedido que ya estaba, dentro de su pedido
    if (e.tabla === 'compras_detalle') {
      await cambiarFilasEnCopias('compras', (filas) => {
        let cambio = false;
        for (const c of filas) {
          if (String(c.id) === String(e.fila.compra_id) && Array.isArray(c.compras_detalle)) { c.compras_detalle = [...c.compras_detalle, { ...e.fila }]; cambio = true; }
        }
        return cambio ? filas : null;
      });
    }
    return;
  }
  const accion = (f: Fila) => (e.tipo === 'borrado' ? null : { ...f, ...e.cambios });
  await cambiarFilasEnCopias(e.tabla, (filas) => conFiltro(filas, e.filtros, accion));
  if (e.tabla === 'compras_detalle') {
    await cambiarFilasEnCopias('compras', (filas) => {
      let cambio = false;
      for (const c of filas) {
        if (!Array.isArray(c.compras_detalle)) continue;
        const nuevas = conFiltro(c.compras_detalle as Fila[], e.filtros, accion);
        if (nuevas) { c.compras_detalle = nuevas; cambio = true; }
      }
      return cambio ? filas : null;
    });
  }
};

export interface Pendiente {
  id: string;              // orden de llegada (fecha + contador): se suben en este orden
  accion: string;          // "POST /sales"
  url: string;
  metodo: string;
  cuerpo: string;
  prefer: string | null;
  token: string | null;    // sesión de quien lo hizo: al subir queda su nombre (vendedor / autor)
  creado: number;
  ref?: string;            // referencia única (ref_local) de abonos, movimientos y mermas
  diferencia?: number;     // merma: cuánto cambia el stock (se aplica sobre el stock REAL al subir)
  efectos?: Efecto[];      // acción del servidor hecha sin internet: lo que se ve en pantalla hasta subirla
  error?: string;          // el servidor lo rechazó (no por falta de internet): queda para revisar
}

let contador = 0;

export const encolar = async (url: string, opciones: RequestInit, token: string | null) => {
  const metodo = (opciones.method || 'GET').toUpperCase();
  let cuerpo = typeof opciones.body === 'string' ? opciones.body : '';
  const prefer = new Headers(opciones.headers).get('Prefer');
  const id = `${Date.now().toString().padStart(15, '0')}-${String(contador++).padStart(5, '0')}`;
  const accion = accionDe(url, metodo);
  const pendiente: Pendiente = { id, accion, url, metodo, cuerpo, prefer, token, creado: Date.now() };

  // Abonos, movimientos y mermas: referencia única (si ya llegó al servidor, no se repite al subir)
  if (CON_REFERENCIA.has(accion)) {
    pendiente.ref = `${id}-${Math.random().toString(36).slice(2, 10)}`;
    const datos = JSON.parse(cuerpo || '[]');
    const filas = (Array.isArray(datos) ? datos : [datos]).map((f, i) => ({ ...f, ref_local: `${pendiente.ref}-${i}` }));
    pendiente.cuerpo = cuerpo = JSON.stringify(Array.isArray(datos) ? filas : filas[0]);
    // La librería manda en el link la lista de columnas a guardar (?columns=...): el servidor ignora las
    // que no están ahí, así que ref_local se agrega a la lista
    const u = new URL(url, location.origin);
    const columnas = u.searchParams.get('columns');
    if (columnas && !columnas.includes('"ref_local"')) {
      u.searchParams.set('columns', `${columnas},"ref_local"`);
      pendiente.url = u.toString();
    }
  }

  const tabla = accion.split('/')[1];
  const filaId = idDelFiltro(url);

  // Acción del SERVIDOR (recibir pedido, editar o retirar lote, borrar producto): la PC la imita para
  // que la pantalla quede igual que si hubiera internet; al subirla la hace el servidor de verdad
  if (tabla === 'rpc') {
    const imitar = IMITAR_RPC[accion.split('/')[2]];
    if (!imitar) return new Response(JSON.stringify({ message: 'Sin internet: esto necesita conexión.' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
    let resultado: Awaited<ReturnType<typeof imitar>>;
    try { resultado = await imitar(JSON.parse(cuerpo || '{}')); } catch (e) {
      // Lo mismo que respondería el servidor (ej. "ya se vendió, no se puede devolver")
      return new Response(JSON.stringify({ message: (e as Error).message }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (resultado.params) pendiente.cuerpo = cuerpo = JSON.stringify(resultado.params);
    if (resultado.diferencia !== undefined) pendiente.diferencia = resultado.diferencia;
    pendiente.efectos = resultado.efectos;
    await guardarLocal(ALMACEN_PENDIENTES, pendiente);          // en el disco ANTES de decir "listo"
    hayEnCola = true;
    for (const e of resultado.efectos) await aplicarEnCopias(e);
    void avisarPendientes();
    return new Response(JSON.stringify(resultado.respuesta ?? null), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // Producto, cliente o proveedor nuevo: su número lo pone la PC (el servidor lo acepta tal cual); así lo
  // que se haga después sin internet con él (vender ese producto, fiarle a ese cliente) ya apunta bien
  const tipoId = metodo === 'POST' ? ID_DESDE_LA_PC[tabla] : undefined;
  if (tipoId) {
    const datos = JSON.parse(pendiente.cuerpo || '[]');
    const filas = (Array.isArray(datos) ? datos : [datos]).map((f) => (f.id == null ? { ...f, id: nuevoId(tipoId) } : f));
    pendiente.cuerpo = cuerpo = JSON.stringify(Array.isArray(datos) ? filas : filas[0]);
    const u = new URL(pendiente.url, location.origin);
    const columnas = u.searchParams.get('columns');
    if (columnas && !columnas.includes('"id"')) {
      u.searchParams.set('columns', `${columnas},"id"`);
      pendiente.url = u.toString();
    }
  }

  // Stock (mermas, ingresar lote, editar producto): se guarda como DIFERENCIA, no como número fijo, para
  // no pisar las ventas hechas mientras tanto (ni las de otra caja)
  const cambios = metodo === 'PATCH' ? cambiosDe(cuerpo) : null;
  if (CON_STOCK.has(accion) && cambios && typeof cambios.quantity === 'number') {
    const actual = filaId ? await filaLocal(tabla, filaId) : null;
    if (!filaId || actual?.quantity == null || Number.isNaN(Number(actual.quantity))) {
      return new Response(JSON.stringify({ message: 'Sin internet: no se pudo leer el stock actual. Inténtalo cuando vuelva la conexión.' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } });
    }
    pendiente.diferencia = cambios.quantity - Number(actual.quantity);
  }

  await guardarLocal(ALMACEN_PENDIENTES, pendiente);          // en el disco ANTES de decir "listo"
  hayEnCola = true;

  // Lo que se ve en pantalla sin internet (imitando lo que hará el servidor al subirlo)
  if (accion === 'POST /sale_details') await descontarStockLocal(cuerpo);
  if (accion === 'POST /waste') {
    // En el servidor, registrar una merma ya descuenta el stock del producto (trigger tr_waste_reduce).
    // Se imita aquí para que el ajuste de stock que manda la pantalla después no reste dos veces.
    for (const m of [JSON.parse(cuerpo)].flat() as { product_id: string | number; quantity: number }[]) {
      await cambiarEnCopias('products', String(m.product_id), (f) => { f.quantity = Number(f.quantity || 0) + Number(m.quantity || 0); });
    }
  }
  if (accion === 'DELETE /waste') {
    // Borrar una merma devuelve el stock en el servidor (trigger trg_waste_delete)
    const mermaId = idDelFiltro(url);
    const merma = mermaId ? await filaEnCopias('waste', mermaId) : null;
    if (merma) await cambiarEnCopias('products', String(merma.product_id), (f) => { f.quantity = Number(f.quantity || 0) - Number(merma.quantity || 0); });
  }
  // Cualquier cambio o borrado se ve al instante en pantalla (en las copias, por su filtro: id u otro);
  // lo creado sin internet ya se suma a lo que se lee (filasPendientes)
  const filtrosUrl = filtrosDe(new URL(url, location.origin));
  if (metodo === 'PATCH' && cambios && filtrosUrl.length) await aplicarEnCopias({ tipo: 'cambio', tabla, filtros: filtrosUrl, cambios });
  if (metodo === 'DELETE' && filtrosUrl.length) await aplicarEnCopias({ tipo: 'borrado', tabla, filtros: filtrosUrl });
  if (accion === 'POST /compras_detalle') {
    for (const fila of [JSON.parse(cuerpo || '[]')].flat() as Fila[]) await aplicarEnCopias({ tipo: 'nueva', tabla, fila });
  }
  if (accion === 'POST /debt_payments') {
    // Varios abonos al mismo cliente sin internet: la deuda que se ve baja con cada uno
    for (const abono of JSON.parse(cuerpo) as { fiado_id: number; amount: number }[]) {
      await cambiarEnCopias('fiados', String(abono.fiado_id), (f) => {
        f.paid_amount = Number(f.paid_amount || 0) + Number(abono.amount || 0);
      });
    }
  }
  void avisarPendientes();
  // La pantalla recibe lo mismo que daría el servidor: las filas guardadas (la fila completa si fue un
  // cambio) y, si pidió UNA sola (.single()), un objeto en vez de una lista
  const devolverFilas = (prefer || '').includes('return=representation');
  if (!devolverFilas) return new Response(null, { status: 201 });
  let filas: unknown[] = [];
  if (metodo === 'POST') filas = [JSON.parse(cuerpo || '[]')].flat();
  else if (metodo === 'PATCH' && filaId) {
    const fila = await filaLocal(tabla, filaId);
    filas = fila ? [fila] : cambios ? [{ id: filaId, ...cambios }] : [];
  }
  const quiereUna = (new Headers(opciones.headers).get('Accept') || '').includes('vnd.pgrst.object');
  return new Response(JSON.stringify(quiereUna ? (filas[0] ?? null) : filas), {
    status: 201, headers: { 'Content-Type': 'application/json' },
  });
};

// ---------------------------------------------------------------- 4) acciones del servidor sin internet (fase SI-2)
// Cada una imita EXACTAMENTE lo que hace su función en el servidor (servidor/sql/seguridad-sesion.sql y
// fn_edit_batch / fn_soft_delete_batch / fn_soft_delete_product de la base) para que la pantalla quede
// igual. Al volver el internet, la cola llama a la función real (ver PREPARAR_RPC: no se repite lo ya hecho).
interface ResultadoImitado { efectos: Efecto[]; respuesta?: unknown; params?: Record<string, unknown>; diferencia?: number }

// Quién está usando la PC (lo guarda sesion.ts para trabajar sin internet)
const empleadoLocal = () => {
  try { return String(JSON.parse(localStorage.getItem('siumax_empleado_sin_internet') || '{}')?.empleado?.nombre || ''); } catch { return ''; }
};
let contadorMov = 0;
const movimiento = (fila: Fila): Efecto => ({
  tipo: 'nueva', tabla: 'inventory_movements',
  fila: { id: `local-mov-${Date.now()}-${contadorMov++}`, created_at: new Date().toISOString(), user: empleadoLocal() || 'Sistema', is_synced: 1, ...fila },
});

// Los productos de un pedido como se ven en la PC: los de su copia (vienen dentro del pedido) y los
// agregados sin internet
const detallesDeCompra = async (compraId: string) => {
  const enCopia = ((await filaEnCopias('compras', compraId))?.compras_detalle as Fila[] | undefined) || [];
  const nuevos = ((await filasPendientes()).get('compras_detalle') || []).filter((d) => String(d.compra_id) === compraId);
  const ids = new Set(enCopia.map((d) => String(d.id)));
  return [...enCopia, ...nuevos.filter((d) => !ids.has(String(d.id)))];
};

const IMITAR_RPC: Record<string, (p: Record<string, any>) => Promise<ResultadoImitado>> = {
  // Recibir pedido: un lote por producto que llegó, stock, detalle con su lote y la compra RECIBIDA.
  // Los números de los lotes los pone la PC y viajan al servidor (lote_id): así coinciden y no se repite
  fn_recibir_compra: async (p) => {
    const compraId = String(p.p_compra_id);
    const compra = await filaLocal('compras', compraId);
    if (!compra) throw new Error('Ese pedido no existe.');
    if (compra.estado !== 'PENDIENTE') throw new Error(`Este pedido ya no está pendiente (está ${compra.estado}).`);
    const doc = String(p.p_documento || '').trim() || `COMPRA #${compraId.slice(-6)}`;
    const ahora = new Date().toISOString();
    const items = ((p.p_items || []) as Fila[]).map((i) => ({ ...i }));
    const efectos: Efecto[] = [];
    const cambios: { id: string; quantity: number }[] = [];
    let lotes = 0;
    for (const det of (await detallesDeCompra(compraId)).filter((d) => d.batch_id == null)) {
      const item = items.find((i) => String(i.detalle_id) === String(det.id));
      const cant = Math.max(0, Number(item?.cantidad || 0));
      const costo = item && item.costo != null ? Math.max(0, Number(item.costo)) : Number(det.costo_unit || 0);
      if (!item || cant <= 0) {
        efectos.push({ tipo: 'cambio', tabla: 'compras_detalle', filtros: [['id', `eq.${det.id}`]], cambios: { cantidad_recibida: 0 } });
        continue;
      }
      const loteId = nuevoId('numero') as number;
      item.lote_id = loteId;
      const producto = String(det.product_id);
      efectos.push({ tipo: 'nueva', tabla: 'batches', fila: {
        id: loteId, product_id: det.product_id, quantity: cant, initial_quantity: cant, expiration_date: item.vence || null,
        cost_total: Math.round(cant * costo * 100) / 100, cost_unit: costo, document_ref: doc,
        supplier: compra.proveedor ?? null, provider_id: compra.provider_id ?? null, is_active: 1, is_synced: 1, created_at: ahora,
      } });
      efectos.push(movimiento({ batch_id: loteId, product_id: det.product_id, product_name: det.product_name, change_amount: cant,
        previous_quantity: 0, new_quantity: cant, operation_type: 'COMPRA', reason: 'Ingreso Lote', notes: `Doc: ${doc} · Pedido #${compraId.slice(-6)}` }));
      efectos.push({ tipo: 'stock', producto, delta: cant });
      efectos.push({ tipo: 'cambio', tabla: 'compras_detalle', filtros: [['id', `eq.${det.id}`]], cambios: { cantidad_recibida: cant, costo_unit: costo, batch_id: loteId } });
      const ya = cambios.find((c) => c.id === producto);
      if (ya) ya.quantity += cant;
      else cambios.push({ id: producto, quantity: Number((await filaLocal('products', producto))?.quantity || 0) + cant });
      lotes++;
    }
    efectos.push({ tipo: 'cambio', tabla: 'compras', filtros: [['id', `eq.${compraId}`]], cambios: { estado: 'RECIBIDO', documento: doc, recibido_por: empleadoLocal() || null, recibido_at: ahora } });
    return { efectos, respuesta: { lotes, cambios }, params: { ...p, p_items: items } };
  },

  // Devolver lo recibido: retira sus lotes (si no se vendieron ni mermaron) y la compra vuelve a PENDIENTE
  fn_devolver_compra: async (p) => {
    const compraId = String(p.p_compra_id);
    const compra = await filaLocal('compras', compraId);
    if (!compra) throw new Error('Ese pedido no existe.');
    if (compra.estado !== 'RECIBIDO') throw new Error('Solo se puede devolver un pedido RECIBIDO.');
    const efectos: Efecto[] = [];
    const cambios: { id: string; quantity: number }[] = [];
    const movidos: string[] = [];
    const conLote: { det: Fila; lote: Fila }[] = [];
    for (const det of (await detallesDeCompra(compraId)).filter((d) => d.batch_id != null)) {
      const lote = await filaLocal('batches', String(det.batch_id));
      if (!lote || Number(lote.is_active) !== 1 || Number(lote.quantity || 0) < Number(det.cantidad_recibida || 0)) movidos.push(`• ${det.product_name}`);
      else conLote.push({ det, lote });
    }
    if (movidos.length) throw new Error(`No se puede devolver: estos productos ya se vendieron, se mermaron o su lote se retiró:\n${movidos.join('\n')}`);
    for (const { det, lote } of conLote) {
      const cant = Number(lote.quantity || 0);
      const producto = String(det.product_id);
      efectos.push({ tipo: 'cambio', tabla: 'batches', filtros: [['id', `eq.${lote.id}`]], cambios: { is_active: 0, quantity: 0 } });
      efectos.push({ tipo: 'stock', producto, delta: -cant });
      efectos.push(movimiento({ batch_id: lote.id, product_id: det.product_id, product_name: det.product_name, change_amount: -cant,
        previous_quantity: cant, new_quantity: 0, operation_type: 'AJUSTE', reason: 'Retiro de Lote (Soft Delete)' }));
      const ya = cambios.find((c) => c.id === producto);
      if (ya) ya.quantity = Math.max(0, ya.quantity - cant);
      else cambios.push({ id: producto, quantity: Math.max(0, Number((await filaLocal('products', producto))?.quantity || 0) - cant) });
    }
    efectos.push({ tipo: 'cambio', tabla: 'compras_detalle', filtros: [['compra_id', `eq.${compraId}`]], cambios: { cantidad_recibida: null, batch_id: null } });
    efectos.push({ tipo: 'cambio', tabla: 'compras', filtros: [['id', `eq.${compraId}`]], cambios: { estado: 'PENDIENTE', documento: null, recibido_por: null, recibido_por_id: null, recibido_at: null } });
    return { efectos, respuesta: { lotes: conLote.length, cambios } };
  },

  // Editar lote: su cantidad queda en la nueva y el stock del producto cambia en la diferencia. Al subir
  // se manda esa DIFERENCIA sobre la cantidad real del servidor (no pisa lo vendido en otra caja)
  fn_edit_batch: async (p) => {
    const lote = await filaLocal('batches', String(p.p_batch_id));
    if (!lote || Number(lote.is_active) !== 1) return { efectos: [] }; // el servidor tampoco hace nada
    const viejo = Number(lote.quantity || 0);
    const nuevo = Number(p.p_new_qty || 0);
    const efectos: Efecto[] = [
      { tipo: 'cambio', tabla: 'batches', filtros: [['id', `eq.${lote.id}`]], cambios: { quantity: nuevo, cost_unit: Number(p.p_new_cost || 0) } },
      { tipo: 'stock', producto: String(lote.product_id), delta: nuevo - viejo },
    ];
    if (nuevo !== viejo) efectos.push(movimiento({ batch_id: lote.id, product_id: lote.product_id, change_amount: nuevo - viejo,
      previous_quantity: viejo, new_quantity: nuevo, operation_type: 'AJUSTE', reason: 'Edición manual de lote' }));
    return { efectos, diferencia: nuevo - viejo };
  },

  // Retirar lote: queda inactivo y en 0, y el stock del producto baja lo que tenía
  fn_soft_delete_batch: async (p) => {
    const lote = await filaLocal('batches', String(p.p_batch_id));
    if (!lote) return { efectos: [] };
    const cant = Number(lote.quantity || 0);
    const activo = Number(lote.is_active) === 1;
    return { efectos: [
      { tipo: 'cambio', tabla: 'batches', filtros: [['id', `eq.${lote.id}`]], cambios: { is_active: 0, quantity: 0 } },
      ...(activo ? [{ tipo: 'stock', producto: String(lote.product_id), delta: -cant } as Efecto] : []),
      movimiento({ batch_id: lote.id, product_id: lote.product_id, change_amount: -cant, previous_quantity: cant, new_quantity: 0,
        operation_type: 'AJUSTE', reason: 'Retiro de Lote (Soft Delete)' }),
    ] };
  },

  // Borrar producto: queda inactivo y en 0, con todos sus lotes
  fn_soft_delete_product: async (p) => {
    const id = String(p.p_product_id);
    const prod = await filaLocal('products', id);
    if (!prod) throw new Error(`Producto ID ${id} no encontrado.`);
    const cant = Number(prod.quantity || 0);
    return { efectos: [
      { tipo: 'cambio', tabla: 'products', filtros: [['id', `eq.${id}`]], cambios: { is_active: '0', quantity: 0 } },
      { tipo: 'cambio', tabla: 'batches', filtros: [['product_id', `eq.${id}`]], cambios: { is_active: 0, quantity: 0 } },
      movimiento({ product_id: prod.id, product_name: prod.name, change_amount: -cant, previous_quantity: cant, new_quantity: 0,
        operation_type: 'AJUSTE', reason: 'Eliminación del sistema (Soft Delete)' }),
    ] };
  },
};

// Antes de subir una acción del servidor hecha sin internet: ¿ya está hecha? (se cortó justo después de
// mandarla, u otra caja la hizo) → no se repite. Editar lote se manda como diferencia sobre lo real.
const leerServidor = async (p: Pendiente, consulta: string) => {
  const r = await pedirConLimite(`${location.origin}/rest/v1/${consulta}`, { headers: cabecerasDe(p) }, 15_000);
  if (!r.ok) throw new Error(`no se pudo revisar (${r.status})`);
  return ((await r.json()) as Fila[])[0] || null;
};
const PREPARAR_RPC: Record<string, (p: Pendiente, params: Record<string, any>) => Promise<{ saltar?: boolean; cuerpo?: string }>> = {
  fn_soft_delete_batch: async (p, params) => {
    const lote = await leerServidor(p, `batches?select=is_active&id=eq.${encodeURIComponent(params.p_batch_id)}`);
    return { saltar: !lote || Number(lote.is_active) === 0 };
  },
  fn_soft_delete_product: async (p, params) => {
    const prod = await leerServidor(p, `products?select=is_active&id=eq.${encodeURIComponent(params.p_product_id)}`);
    return { saltar: !prod || String(prod.is_active) === '0' };
  },
  fn_devolver_compra: async (p, params) => {
    const compra = await leerServidor(p, `compras?select=estado&id=eq.${encodeURIComponent(params.p_compra_id)}`);
    return { saltar: !compra || compra.estado !== 'RECIBIDO' };
  },
  fn_edit_batch: async (p, params) => {
    const lote = await leerServidor(p, `batches?select=quantity&id=eq.${encodeURIComponent(params.p_batch_id)}`);
    if (!lote) return { saltar: true };
    return { cuerpo: JSON.stringify({ ...params, p_new_qty: Math.max(0, Number(lote.quantity || 0) + Number(p.diferencia || 0)) }) };
  },
};

// El stock que se ve en pantalla baja también sin internet (en las copias de productos)
const descontarStockLocal = async (cuerpo: string) => {
  try {
    const vendido = new Map<string, number>();
    for (const d of JSON.parse(cuerpo) as { product_id: string | number; quantity: number }[]) {
      vendido.set(String(d.product_id), (vendido.get(String(d.product_id)) || 0) + Number(d.quantity || 0));
    }
    for (const clave of await clavesLocal(ALMACEN_RESPUESTAS)) {
      if (!String(clave).includes('/rest/v1/products?')) continue;
      const copia = await leerLocal<CopiaGuardada>(ALMACEN_RESPUESTAS, clave);
      if (!copia) continue;
      const filas = JSON.parse(copia.cuerpo);
      if (!Array.isArray(filas)) continue;
      let cambio = false;
      for (const f of filas) {
        const resta = vendido.get(String(f?.id));
        if (resta && typeof f.quantity === 'number') { f.quantity = Math.max(0, f.quantity - resta); cambio = true; }
      }
      if (cambio) await guardarLocal(ALMACEN_RESPUESTAS, { ...copia, cuerpo: JSON.stringify(filas) }, clave);
    }
  } catch { /* es solo lo que se ve en pantalla: el stock real lo descuenta el servidor al subir */ }
};

export const leerPendientes = async () =>
  (await leerTodoLocal<Pendiente>(ALMACEN_PENDIENTES)).sort((a, b) => a.id.localeCompare(b.id));

// Mientras haya algo esperando en la cola, lo nuevo también va a la cola (así todo sube en orden:
// el detalle de una venta nunca llega antes que la venta)
let hayEnCola = false;
export const hayPendientesEnCola = () => hayEnCola;

// Para la barra: qué hay guardado, como lo entiende el cajero ("1 venta, 2 abonos"). Una venta son
// varios pasos (venta + detalle), pero se cuenta como una.
const NOMBRES: Record<string, [string, string]> = {
  'POST /sales': ['venta', 'ventas'],
  'POST /debt_payments': ['abono', 'abonos'],
  'POST /cash_movements': ['movimiento de caja', 'movimientos de caja'],
  'POST /waste': ['merma', 'mermas'], 'PATCH /waste': ['merma corregida', 'mermas corregidas'], 'DELETE /waste': ['merma borrada', 'mermas borradas'],
  'PATCH /sales': ['devolución', 'devoluciones'],
  'POST /cash_sessions': ['apertura de caja', 'aperturas de caja'], 'PATCH /cash_sessions': ['cambio de caja', 'cambios de caja'],
  'POST /customers': ['cliente nuevo', 'clientes nuevos'], 'PATCH /customers': ['cliente editado', 'clientes editados'],
  'DELETE /customers': ['cliente borrado', 'clientes borrados'],
  'POST /products': ['producto nuevo', 'productos nuevos'], 'PATCH /products': ['cambio de producto', 'cambios de productos'],
  'POST /batches': ['lote', 'lotes'],
  'POST /providers': ['proveedor nuevo', 'proveedores nuevos'], 'PATCH /providers': ['proveedor editado', 'proveedores editados'],
  'DELETE /providers': ['proveedor borrado', 'proveedores borrados'],
  'POST /compras': ['pedido nuevo', 'pedidos nuevos'], 'PATCH /compras': ['pedido editado', 'pedidos editados'],
  'PATCH /batches': ['cambio de lote', 'cambios de lotes'],
  'POST /empresa_config': ['datos de la empresa', 'datos de la empresa'], 'PATCH /empresa_config': ['datos de la empresa', 'datos de la empresa'],
  'POST /rpc/fn_recibir_compra': ['pedido recibido', 'pedidos recibidos'], 'POST /rpc/fn_devolver_compra': ['pedido devuelto', 'pedidos devueltos'],
  'POST /rpc/fn_edit_batch': ['lote editado', 'lotes editados'], 'POST /rpc/fn_soft_delete_batch': ['lote retirado', 'lotes retirados'],
  'POST /rpc/fn_soft_delete_product': ['producto borrado', 'productos borrados'],
};
const resumir = (lista: Pendiente[]) => {
  const cuenta = new Map<string, number>();
  for (const p of lista) if (NOMBRES[p.accion]) cuenta.set(p.accion, (cuenta.get(p.accion) || 0) + 1);
  return [...cuenta].map(([a, n]) => `${n} ${NOMBRES[a][n === 1 ? 0 : 1]}`).join(', ');
};

const avisarPendientes = async () => {
  const todos = await leerPendientes().catch(() => [] as Pendiente[]);
  const enEspera = todos.filter((p) => !p.error);
  hayEnCola = enEspera.length > 0;
  window.dispatchEvent(new CustomEvent('siumax-pendientes', {
    detail: { cantidad: enEspera.length, resumen: resumir(enEspera) || 'cambios', errores: todos.filter((p) => p.error).length },
  }));
};

const cabecerasDe = (p: Pendiente) => ({ 'Content-Type': 'application/json', ...(p.token ? { 'x-sesion': p.token } : {}) });

// ¿Ya llegó al servidor? (se cortó justo después de enviarlo). Abonos/movimientos/mermas por su
// referencia; el detalle y el fiado de una venta, por sale_id.
const yaEstaEnServidor = async (p: Pendiente) => {
  if (p.ref) {
    const tabla = p.accion.split('/')[1];
    const r = await pedirConLimite(`${location.origin}/rest/v1/${tabla}?select=ref_local&ref_local=like.${encodeURIComponent(p.ref)}-*&limit=1`,
      { headers: cabecerasDe(p) }, 15_000);
    if (!r.ok) throw new Error(`no se pudo revisar (${r.status})`);
    return (await r.json()).length > 0;
  }
  if (p.accion !== 'POST /sale_details' && p.accion !== 'POST /fiados') return false;
  const filas = JSON.parse(p.cuerpo || '[]');
  const saleId = (Array.isArray(filas) ? filas[0] : filas)?.sale_id;
  if (saleId == null) return false;
  const tabla = p.accion.split('/')[1];
  const r = await pedirConLimite(`${location.origin}/rest/v1/${tabla}?select=sale_id&sale_id=eq.${encodeURIComponent(saleId)}&limit=1`,
    { headers: p.token ? { 'x-sesion': p.token } : {} }, 15_000);
  if (!r.ok) throw new Error(`no se pudo revisar (${r.status})`);
  return (await r.json()).length > 0;
};

// Tras un 409 al subir algo creado sin internet con su número: ¿esas filas ya están en el servidor?
// (sin número propio, como las ventas de antes, se mantiene lo de siempre: se da por subido)
const creadoYaEnServidor = async (p: Pendiente) => {
  if (p.metodo !== 'POST') return true;
  let ids: string[] = [];
  try { ids = [JSON.parse(p.cuerpo)].flat().map((f) => f?.id).filter((x) => x != null).map(String); } catch { return true; }
  if (!ids.length) return true;
  const tabla = p.accion.split('/')[1];
  try {
    const r = await pedirConLimite(`${location.origin}/rest/v1/${tabla}?select=id&id=in.(${ids.map(encodeURIComponent).join(',')})`, { headers: cabecerasDe(p) }, 15_000);
    if (!r.ok) return true;
    return (await r.json()).length >= ids.length;
  } catch { return true; }
};

let subiendo = false;
export const subirPendientes = async () => {
  if (subiendo) return;
  subiendo = true;
  try {
    for (const p of await leerPendientes()) {
      if (p.error) continue;
      let r: Response;
      try {
        if (await yaEstaEnServidor(p)) { await borrarLocal(ALMACEN_PENDIENTES, p.id); continue; }
        const cabeceras: Record<string, string> = cabecerasDe(p);
        if (p.prefer) cabeceras.Prefer = p.prefer;
        let cuerpo = p.cuerpo;
        const esRpc = p.accion.startsWith('POST /rpc/');
        if (esRpc) {
          // Acción del servidor hecha sin internet: si ya está hecha no se repite; editar lote, como diferencia
          const preparar = PREPARAR_RPC[p.accion.split('/')[2]];
          const listo = preparar ? await preparar(p, JSON.parse(p.cuerpo || '{}')) : {};
          if (listo.saltar) { await borrarLocal(ALMACEN_PENDIENTES, p.id); continue; }
          if (listo.cuerpo) cuerpo = listo.cuerpo;
        }
        if (p.diferencia !== undefined && !esRpc) {
          // Merma: se aplica la diferencia sobre el stock REAL de este momento (respeta las ventas)
          const filaId = idDelFiltro(p.url);
          const tabla = p.accion.split('/')[1];
          const actual = await pedirConLimite(`${location.origin}/rest/v1/${tabla}?select=quantity&id=eq.${filaId}`, { headers: cabecerasDe(p) }, 15_000);
          if (!actual.ok) throw new Error('sin respuesta');
          const filas = await actual.json();
          // Los demás datos del cambio (ej. nombre o precio al editar un producto) van tal cual
          cuerpo = JSON.stringify({ ...(cambiosDe(p.cuerpo) || {}), quantity: Math.max(0, Number(filas[0]?.quantity || 0) + p.diferencia) });
        }
        r = await pedirConLimite(p.url, { method: p.metodo, headers: cabeceras, body: cuerpo || undefined }, 15_000);
      } catch {
        avisarConexion(false);   // sigue sin internet: se reintenta luego, en el mismo orden
        return;
      }
      avisarConexion(true);
      // 409 = ya existía (la venta llegó antes de cortarse): no se duplica. Pero si lo creado tiene su
      // número y ese número NO está en el servidor, el choque fue con otra cosa (ej. un RUC repetido):
      // queda marcado con el error para revisarlo, no se da por subido
      if (r.status === 409 && !(await creadoYaEnServidor(p))) {
        const detalle = await r.text().catch(() => '');
        await guardarLocal(ALMACEN_PENDIENTES, { ...p, error: `409 ${detalle.slice(0, 300)}` });
        continue;
      }
      if (r.ok || r.status === 409) {
        await borrarLocal(ALMACEN_PENDIENTES, p.id);
      } else {
        const detalle = await r.text().catch(() => '');
        await guardarLocal(ALMACEN_PENDIENTES, { ...p, error: `${r.status} ${detalle.slice(0, 300)}` });
      }
    }
  } finally {
    subiendo = false;
    void avisarPendientes();
  }
};

// Para la barra de estado: vuelve a contar y avisar (al abrir la pantalla)
export const refrescarPendientes = () => avisarPendientes();

// Lo que el servidor rechazó queda marcado con error: reintentarlo (por ejemplo, tras corregir un permiso)
export const reintentarErrores = async () => {
  for (const p of await leerPendientes()) {
    if (p.error) await guardarLocal(ALMACEN_PENDIENTES, { ...p, error: undefined });
  }
  await subirPendientes();
};

// Revisa la conexión y sube lo pendiente: al abrir, al volver el internet y cada 20 s mientras haya algo
export const iniciarSubidaAutomatica = () => {
  void avisarPendientes();   // al abrir: ¿quedó algo de antes (por ejemplo, tras un corte de luz)?
  window.addEventListener('online', () => void subirPendientes());
  const revisar = async () => {
    const pendientes = (await leerPendientes().catch(() => [] as Pendiente[])).filter((p) => !p.error);
    if (pendientes.length) await subirPendientes();
  };
  void revisar();
  setInterval(revisar, 20_000);
};
