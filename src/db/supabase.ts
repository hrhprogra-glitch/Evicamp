import { createClient } from '@supabase/supabase-js';
import {
  pedirConLimite, avisarConexion, hayConexion, guardarCopia, leerCopia,
  sePuedeSinInternet, encolar, hayPendientesEnCola, subirPendientes,
} from '../utils/sinInternet';

// En producción la API de cada cliente vive en su mismo link (/rest/v1/ detrás de Nginx),
// así UNA sola compilación sirve para todos: evicamp.duckdns.org, bodega.siumax.duckdns.org...
// En desarrollo (npm run dev) se usa VITE_SUPABASE_URL del .env.
const supabaseUrl = import.meta.env.PROD ? window.location.origin : import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'public-anon-key';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('ALERTA DE SISTEMA: Credenciales de Supabase no detectadas.');
}

// ----------------------------------------------------------------------
// EL INTERCEPTOR MAESTRO (Optimizado para Nginx)
// ----------------------------------------------------------------------
const customFetch = (url: string | URL | Request, options?: RequestInit) => {
  const urlString = url.toString();
  
  // NOTA DE INGENIERÍA: 
  // Ya NO borramos el '/rest/v1/'. Ahora Nginx necesita ver esa ruta 
  // para saber que debe redirigir el tráfico a PostgREST (puerto 3000).

  // 1. Clonamos la petición
  const fetchOptions = { ...options };
  const headers = new Headers(fetchOptions.headers);
  
  // 2. ¡TU MAGIA INTACTA!: Borramos el token de autorización.
  // Así PostgREST usa automáticamente el rol 'anon' de PostgreSQL.
  headers.delete('Authorization');

  // 3. La API exige la sesión en cada pedido (servidor/sql/seguridad-sesion.sql): va el token de la sesión
  let token: string | null = null;
  try { token = localStorage.getItem(CLAVE_TOKEN_SESION); } catch { /* sin almacenamiento */ }
  if (token) headers.set('x-sesion', token);
  fetchOptions.headers = headers;

  // 4. MODO SIN INTERNET: cada consulta (GET) que responde bien deja una copia en el disco de la PC;
  //    si no hay internet o el servidor no responde, se usa esa copia (así todas las secciones se ven).
  //    Ventas y fiados se pueden hacer sin internet: van a una cola en el disco y se suben solos después.
  const metodo = (fetchOptions.method || 'GET').toUpperCase();
  const esLectura = metodo === 'GET';
  const claveCopia = `${urlString}|${headers.get('Range') || ''}`;
  const vaALaCola = !esLectura && sePuedeSinInternet(urlString, metodo, fetchOptions.body);

  // Sin conexión, o con cosas esperando en la cola (para que todo suba en orden): directo a la cola
  if (vaALaCola && (!hayConexion() || hayPendientesEnCola())) {
    return encolar(urlString, fetchOptions, token).then((r) => { void subirPendientes(); return r; });
  }

  return pedirConLimite(urlString, fetchOptions).then((r) => {
    avisarConexion(true);
    if (r.status === 503) mostrarSuspendido();
    // Sesión cerrada o empleado desactivado: volver al login (no aplica al propio inicio de sesión)
    if (r.status === 401 && token && !urlString.includes('/rpc/fn_login')) sesionVencida();
    if (esLectura && r.ok) guardarCopia(claveCopia, r.clone());
    return r;
  }).catch(async (error) => {
    if (options?.signal?.aborted) throw error; // lo canceló el propio sistema, no es falta de internet
    avisarConexion(false);
    if (esLectura) {
      const copia = await leerCopia(claveCopia);
      if (copia) return copia;
    }
    // Se cortó al enviar una venta o un fiado: queda en la cola (si alcanzó a llegar, no se duplica)
    if (vaALaCola) return encolar(urlString, fetchOptions, token);
    throw error;
  });
};

// Misma clave que usa src/utils/sesion.ts (aquí se lee directo para no crear una importación circular)
const CLAVE_TOKEN_SESION = 'gestorpro_sesion';
let saliendo = false;
const sesionVencida = () => {
  if (saliendo) return;
  saliendo = true;
  try { localStorage.removeItem(CLAVE_TOKEN_SESION); } catch { /* sin almacenamiento */ }
  window.location.replace('/');
};

// ----------------------------------------------------------------------
// SERVICIO SUSPENDIDO (Panel de Control): Nginx responde 503 en la API y la página
// "Servicio suspendido" en todo el link. Recargando, el sistema abierto la muestra al instante.
// ----------------------------------------------------------------------
let recargando = false;
const mostrarSuspendido = () => {
  if (!import.meta.env.PROD || recargando) return;
  recargando = true;
  window.location.replace('/');
};

// La sesión vence tras 30 días SIN USO (servidor/sql/seguridad-sesion.sql). Cada hora se avisa que
// sigue en uso, así una caja abierta todos los días nunca vence. Si ya no es válida, vuelve al login.
const renovarSesion = () => {
  let token: string | null = null;
  try { token = localStorage.getItem(CLAVE_TOKEN_SESION); } catch { /* sin almacenamiento */ }
  if (!token || document.visibilityState !== 'visible') return;
  fetch('/rest/v1/rpc/fn_validar_sesion', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p_token: token }),
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((filas) => { if (Array.isArray(filas) && filas.length === 0) sesionVencida(); })
    .catch(() => {}); // sin internet: no hacer nada
};

// Revisa cada 30 s aunque nadie esté usando el sistema (pantalla quieta en la caja)
export const vigilarSuspension = () => {
  if (!import.meta.env.PROD) return;
  setInterval(renovarSesion, 60 * 60 * 1000);
  setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    fetch('/rest/v1/empresa_config?select=id&limit=1', { cache: 'no-store' })
      .then((r) => { if (r.status === 503) mostrarSuspendido(); })
      .catch(() => {}); // sin internet: no hacer nada
  }, 30_000);
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  },
  global: {
    headers: { 
      'Accept-Profile': 'public'
    },
    fetch: customFetch 
  }
});
// Pruebas automáticas del modo sin internet: SOLO si en esta PC se activó a mano
// (localStorage "siumax_pruebas" = "1"). No da ningún permiso extra: es el mismo cliente que usa
// la pantalla, con la misma sesión y las mismas reglas del servidor.
try {
  if (localStorage.getItem('siumax_pruebas') === '1') (window as Window & { __siumaxPruebas?: unknown }).__siumaxPruebas = supabase;
} catch { /* sin almacenamiento */ }
