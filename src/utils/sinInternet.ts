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
// Las filas guardadas en la cola (ventas, abonos, movimientos, mermas...) se suman a lo que se lee
// de las copias: así Finanzas muestra lo vendido y cobrado sin internet.
const filasPendientes = async () => {
  const porTabla = new Map<string, Record<string, unknown>[]>();
  const agregar = (tabla: string, fila: Record<string, unknown>) => porTabla.set(tabla, [...(porTabla.get(tabla) || []), fila]);
  for (const p of await leerPendientes()) {
    const tabla = p.accion.split('/')[1];
    // Cambios y borrados de algo creado sin internet (ej. caja abierta y cerrada sin internet, cliente
    // creado y corregido): se aplican a esa fila, en el orden en que se hicieron
    if (p.metodo === 'PATCH' || p.metodo === 'DELETE') {
      const id = idDelFiltro(p.url);
      if (id == null) continue;
      const filas = porTabla.get(tabla) || [];
      if (p.metodo === 'DELETE') { porTabla.set(tabla, filas.filter((f) => String(f.id) !== id)); continue; }
      const cambios = cambiosDe(p.cuerpo);
      if (cambios) for (const f of filas) if (String(f.id) === id) Object.assign(f, cambios);
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
  const nuevas = (await filasPendientes()).get(tabla) || [];
  const yaEstan = new Set(vigentes.map((f) => String(f?.id)));
  const extra = nuevas.filter((f) => !yaEstan.has(String(f.id)) && cumpleTodos(f, filtros) === true);
  if (!extra.length && vigentes.length === filas.length) return copia;
  return armarRespuesta(pedida, [...vigentes, ...extra]);
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
]);
// Los lotes solo cambian su CANTIDAD sin internet (merma); editarlos del todo es fase SI-2
const SOLO_CANTIDAD = new Set(['PATCH /batches']);
// El stock se guarda como DIFERENCIA (no como número fijo): así dos cajas sin internet no se pisan
const CON_STOCK = new Set(['PATCH /batches', 'PATCH /products']);
// Tablas cuyo número (id) lo pone el servidor: sin internet lo pone la PC (el servidor lo acepta,
// sus ids son "BY DEFAULT"). Basado en la hora: nunca choca con los del servidor (van por miles).
const ID_DESDE_LA_PC: Record<string, 'numero' | 'uuid'> = { products: 'numero', customers: 'numero', providers: 'uuid' };
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

// Busca en las copias guardadas la fila de una tabla (para saber su cantidad actual)
const filaEnCopias = async (tabla: string, id: string) => {
  for (const clave of await clavesLocal(ALMACEN_RESPUESTAS)) {
    if (!String(clave).includes(`/rest/v1/${tabla}?`)) continue;
    const copia = await leerLocal<CopiaGuardada>(ALMACEN_RESPUESTAS, clave);
    try {
      const filas = JSON.parse(copia?.cuerpo || '[]');
      const fila = Array.isArray(filas) ? filas.find((f) => String(f?.id) === id) : null;
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
      const filas = JSON.parse(copia.cuerpo);
      if (!Array.isArray(filas)) continue;
      let cambio = false;
      for (const f of filas) if (String(f?.id) === id) { cambiar(f); cambio = true; }
      if (cambio) await guardarLocal(ALMACEN_RESPUESTAS, { ...copia, cuerpo: JSON.stringify(filas) }, clave);
    } catch { /* copia no es una lista */ }
  }
};

// Quita una fila de todas las copias de una tabla (algo borrado sin internet deja de verse)
const quitarDeCopias = async (tabla: string, id: string) => {
  for (const clave of await clavesLocal(ALMACEN_RESPUESTAS)) {
    if (!String(clave).includes(`/rest/v1/${tabla}?`)) continue;
    const copia = await leerLocal<CopiaGuardada>(ALMACEN_RESPUESTAS, clave);
    if (!copia) continue;
    try {
      const filas = JSON.parse(copia.cuerpo);
      if (!Array.isArray(filas)) continue;
      const quedan = filas.filter((f) => String(f?.id) !== id);
      if (quedan.length !== filas.length) await guardarLocal(ALMACEN_RESPUESTAS, { ...copia, cuerpo: JSON.stringify(quedan) }, clave);
    } catch { /* copia no es una lista */ }
  }
};

// La fila como se ve ahora en la PC: primero lo hecho sin internet (lo más nuevo), si no la copia
const filaLocal = async (tabla: string, id: string) =>
  (await filasPendientes()).get(tabla)?.find((f) => String(f.id) === id) || (await filaEnCopias(tabla, id));

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
  // Cualquier cambio o borrado se ve al instante en pantalla (en las copias); lo creado sin internet ya
  // se suma a lo que se lee (filasPendientes)
  if (metodo === 'PATCH' && filaId && cambios) await cambiarEnCopias(tabla, filaId, (f) => { Object.assign(f, cambios); });
  if (metodo === 'DELETE' && filaId) await quitarDeCopias(tabla, filaId);
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
        if (p.diferencia !== undefined) {
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
