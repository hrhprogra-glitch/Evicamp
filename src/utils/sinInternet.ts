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
const PERMITIDO_SIN_INTERNET = new Set(['POST /sales', 'POST /sale_details', 'POST /fiados']);

const accionDe = (url: string, metodo: string) => {
  const tabla = new URL(url, location.origin).pathname.replace(/^\/rest\/v1/, '');
  return `${metodo.toUpperCase()} ${tabla}`;
};
export const sePuedeSinInternet = (url: string, metodo: string) => PERMITIDO_SIN_INTERNET.has(accionDe(url, metodo));

export interface Pendiente {
  id: string;              // orden de llegada (fecha + contador): se suben en este orden
  accion: string;          // "POST /sales"
  url: string;
  metodo: string;
  cuerpo: string;
  prefer: string | null;
  token: string | null;    // sesión de quien lo hizo: al subir queda su nombre (vendedor / autor)
  creado: number;
  error?: string;          // el servidor lo rechazó (no por falta de internet): queda para revisar
}

let contador = 0;

export const encolar = async (url: string, opciones: RequestInit, token: string | null) => {
  const metodo = (opciones.method || 'GET').toUpperCase();
  const cuerpo = typeof opciones.body === 'string' ? opciones.body : '';
  const prefer = new Headers(opciones.headers).get('Prefer');
  const pendiente: Pendiente = {
    id: `${Date.now().toString().padStart(15, '0')}-${String(contador++).padStart(5, '0')}`,
    accion: accionDe(url, metodo), url, metodo, cuerpo, prefer, token, creado: Date.now(),
  };
  await guardarLocal(ALMACEN_PENDIENTES, pendiente);          // en el disco ANTES de decir "listo"
  hayEnCola = true;
  if (pendiente.accion === 'POST /sale_details') await descontarStockLocal(cuerpo);
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

// ¿Ya llegó al servidor? (se cortó justo después de enviarlo). El detalle y el fiado van por sale_id.
const yaEstaEnServidor = async (p: Pendiente) => {
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
        const cabeceras: Record<string, string> = { 'Content-Type': 'application/json' };
        if (p.prefer) cabeceras.Prefer = p.prefer;
        if (p.token) cabeceras['x-sesion'] = p.token;
        r = await pedirConLimite(p.url, { method: p.metodo, headers: cabeceras, body: p.cuerpo || undefined }, 15_000);
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
