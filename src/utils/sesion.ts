import { supabase } from '../db/supabase';
import type { PermisosUsuario } from '../sections/Configuraciones/types';

// El navegador guarda SOLO el token de la sesión. Los permisos y el estado del
// empleado se leen siempre desde la base (tabla sesiones → empleados), así que
// desactivar a un empleado lo saca del sistema y editar el navegador no da permisos.
const CLAVE_TOKEN = 'gestorpro_sesion';

export interface EmpleadoSesion {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  permisos: Partial<PermisosUsuario>;
}

// Los correos se guardan y comparan en minúsculas; escribir solo "admin" completa @gestorpro.com
export const normalizarEmail = (texto: string) => {
  const limpio = texto.trim().toLowerCase();
  return limpio.includes('@') ? limpio : `${limpio}@gestorpro.com`;
};

// Exportado: ModalUsuario.tsx lo necesita para mandar el token a las funciones
// seguras de creación/edición/borrado de empleados (fn_crear_empleado, etc).
export const leerToken = () => {
  try { return localStorage.getItem(CLAVE_TOKEN); } catch { return null; }
};

const guardarToken = (token: string | null) => {
  try {
    if (token) localStorage.setItem(CLAVE_TOKEN, token);
    else { localStorage.removeItem(CLAVE_TOKEN); localStorage.removeItem(CLAVE_EMPLEADO_SIN_INTERNET); }
    localStorage.removeItem('empleado_session'); // formato anterior (guardaba los permisos en el navegador)
  } catch { /* sin acceso a localStorage */ }
};

// MODO SIN INTERNET: el último empleado validado por el servidor, para seguir trabajando si se corta
// la conexión. Solo se usa sin internet; con internet manda siempre el servidor. Aunque alguien lo
// edite en la PC, lo que haga sin internet se sube con su sesión y el servidor revisa sus permisos.
const CLAVE_EMPLEADO_SIN_INTERNET = 'siumax_empleado_sin_internet';
const recordarEmpleado = (token: string, empleado: EmpleadoSesion) => {
  try { localStorage.setItem(CLAVE_EMPLEADO_SIN_INTERNET, JSON.stringify({ token, empleado })); } catch { /* sin almacenamiento */ }
};
const empleadoSinInternet = (token: string): EmpleadoSesion | null => {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_EMPLEADO_SIN_INTERNET) || 'null');
    return guardado && guardado.token === token ? guardado.empleado : null;
  } catch { return null; }
};

// 🔐 Login, validación y cierre de sesión pasan por funciones seguras del servidor
// (fn_login/fn_validar_sesion/fn_cerrar_sesion) en vez de leer/escribir las tablas
// empleados/sesiones directamente. La contraseña se compara con hash (bcrypt) adentro
// de la base de datos: el navegador nunca ve el hash ni la contraseña de nadie más.
interface RespuestaLogin { token: string; id: string; nombre: string; email: string; rol: string; permisos: Partial<PermisosUsuario> }
interface RespuestaSesion { id: string; nombre: string; email: string; rol: string; permisos: Partial<PermisosUsuario> }

export const iniciarSesion = async (usuario: string, password: string): Promise<EmpleadoSesion | null> => {
  const { data, error } = await supabase
    .rpc('fn_login', { p_email: normalizarEmail(usuario), p_password: password })
    .maybeSingle<RespuestaLogin>();

  if (error) throw new Error('No se pudo iniciar la sesión. Intenta de nuevo.');
  if (!data || !data.token) return null;

  guardarToken(data.token);
  const empleado = { id: data.id, nombre: data.nombre, email: data.email, rol: data.rol, permisos: data.permisos || {} };
  recordarEmpleado(data.token, empleado);
  return empleado;
};

// Devuelve el empleado de la sesión guardada, o null si la sesión no existe,
// fue cerrada, o el empleado está inactivo/borrado. Si hay un error de red
// devuelve 'sin-conexion' para no sacar al usuario por un corte momentáneo.
export const validarSesion = async (): Promise<EmpleadoSesion | null | 'sin-conexion'> => {
  const token = leerToken();
  if (!token) {
    guardarToken(null);
    return null;
  }

  const { data, error } = await supabase.rpc('fn_validar_sesion', { p_token: token }).maybeSingle<RespuestaSesion>();

  // Sin internet: se sigue con el empleado que el servidor validó la última vez en esta PC
  if (error) return error.code ? null : (empleadoSinInternet(token) || 'sin-conexion');

  if (!data || !data.id) {
    guardarToken(null);
    return null;
  }

  const empleado = { id: data.id, nombre: data.nombre, email: data.email, rol: data.rol, permisos: data.permisos || {} };
  recordarEmpleado(token, empleado);
  return empleado;
};

export const cerrarSesion = async () => {
  const token = leerToken();
  guardarToken(null);
  if (token) await supabase.rpc('fn_cerrar_sesion', { p_token: token });
};
