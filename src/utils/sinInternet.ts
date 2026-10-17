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

export const leerCopia = async (clave: string) => {
  try {
    const copia = await leerLocal<CopiaGuardada>(ALMACEN_RESPUESTAS, clave);
    if (!copia) return null;
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
]);
// La merma ajusta el stock del lote y del producto: SOLO la cantidad (editar productos sigue bloqueado)
const SOLO_CANTIDAD = new Set(['PATCH /batches', 'PATCH /products']);
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

  // Merma: el stock se guarda como DIFERENCIA (no como número fijo) para no pisar ventas hechas mientras tanto
  if (SOLO_CANTIDAD.has(accion)) {
    const tabla = accion.split('/')[1];
    const filaId = idDelFiltro(url);
    const actual = filaId ? await filaEnCopias(tabla, filaId) : null;
    if (!filaId || typeof actual?.quantity !== 'number') {
      return new Response(JSON.stringify({ message: 'Sin internet: no se pudo leer el stock actual. Inténtalo cuando vuelva la conexión.' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } });
    }
    pendiente.diferencia = JSON.parse(cuerpo).quantity - actual.quantity;
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
  if (SOLO_CANTIDAD.has(accion)) {
    const nueva = JSON.parse(cuerpo).quantity;
    await cambiarEnCopias(accion.split('/')[1], idDelFiltro(url)!, (f) => { f.quantity = nueva; });
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
  // La pantalla recibe lo mismo que daría el servidor
  const devolverFilas = (prefer || '').includes('return=representation');
  return new Response(devolverFilas ? cuerpo : null, {
    status: 201, headers: devolverFilas ? { 'Content-Type': 'application/json' } : undefined,
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

const avisarPendientes = async () => {
  const todos = await leerPendientes().catch(() => [] as Pendiente[]);
  hayEnCola = todos.some((p) => !p.error);
  window.dispatchEvent(new CustomEvent('siumax-pendientes', {
    detail: { cantidad: todos.filter((p) => !p.error).length, errores: todos.filter((p) => p.error).length },
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
          cuerpo = JSON.stringify({ quantity: Math.max(0, Number(filas[0]?.quantity || 0) + p.diferencia) });
        }
        r = await pedirConLimite(p.url, { method: p.metodo, headers: cabeceras, body: cuerpo || undefined }, 15_000);
      } catch {
        avisarConexion(false);   // sigue sin internet: se reintenta luego, en el mismo orden
        return;
      }
      avisarConexion(true);
      // 409 = ya existía (la venta llegó antes de cortarse): no se duplica
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
