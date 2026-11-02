import { createContext, useContext } from 'react';
import type { PermisosUsuario } from '../sections/Configuraciones/types';
import type { EmpleadoSesion } from './sesion';

export type ClavePermiso = keyof PermisosUsuario;

export const tienePermiso = (permisos: Partial<PermisosUsuario> | null | undefined, clave: ClavePermiso) =>
  !!permisos && (permisos.sistema_acceso_total === true || permisos[clave] === true);

// Qué permiso abre cada módulo del menú (uno basta)
const PERMISOS_POR_MODULO: Record<string, ClavePermiso[]> = {
  pos: ['caja_realizar_ventas'],
  clientes: ['caja_ver_fiados'], // sección Clientes (antes Créditos)
  // 'compras_recibir': entra a Inventario pero solo ve la pestaña Compras (recibir / devolver)
  // 'compras_enviar': igual, solo Compras, para enviar por WhatsApp / descargar / imprimir los pedidos
  inventario: ['almacen_ver_stock', 'compras_recibir', 'compras_enviar'],
  proveedores: ['almacen_gestionar_proveedores'],
  // 'inventario_contar': entra a Conteos solo para contar (toma de inventario a ciegas, sin ver la lista)
  conteos: ['almacen_registrar_mermas', 'inventario_contar'],
  finanzas: ['caja_abrir_cerrar_turno', 'caja_ingresos_egresos'],
  utilidades: ['gerencia_ver_utilidades'],
  configuracion: ['gerencia_configuracion_sistema', 'gerencia_gestionar_usuarios'],
};

export const puedeVerModulo = (permisos: Partial<PermisosUsuario> | null | undefined, modulo: string) => {
  const requeridos = PERMISOS_POR_MODULO[modulo];
  if (!requeridos) return false;
  if (requeridos.length === 0) return !!permisos;
  return requeridos.some((clave) => tienePermiso(permisos, clave));
};

// El empleado de la sesión actual, disponible en toda la app sin pasar props (lo llena SesionProvider)
export const SesionContext = createContext<EmpleadoSesion | null>(null);

export const useEmpleado = () => useContext(SesionContext);

// Uso: const puedeEliminar = usePermiso('almacen_eliminar_productos');
export const usePermiso = (clave: ClavePermiso) => tienePermiso(useContext(SesionContext)?.permisos, clave);

// Los botones siguen visibles (para no romper la navegación con flechas), pero sin el permiso avisan
// en vez de intentar la acción. El servidor también la rechaza (servidor/sql/seguridad-sesion.sql).
// El aviso es un mensaje en pantalla (no una ventana del navegador): no interrumpe ni le quita el
// selector al elemento donde estaba el usuario, y se va solo.
let ocultarAviso: ReturnType<typeof setTimeout> | undefined;
export const avisarSinPermiso = (accion: string) =>
  avisar(`🔒 No tienes permiso para ${accion}. Pide al administrador que te lo dé en Ajustes > Gestión de usuarios.`);

export const avisar = (texto: string) => {
  let aviso = document.getElementById('aviso-sin-permiso');
  if (!aviso) {
    aviso = document.createElement('div');
    aviso.id = 'aviso-sin-permiso';
    aviso.setAttribute('role', 'status');
    aviso.setAttribute('aria-live', 'polite');
    aviso.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:100000;max-width:calc(100% - 32px);'
      + 'background:var(--color-ink,#1E293B);color:#fff;border:2px solid var(--color-warning,#F59E0B);box-shadow:4px 4px 0 0 var(--color-warning,#F59E0B);'
      + 'padding:12px 16px;font:700 13px/1.5 ui-monospace,Menlo,Consolas,monospace;pointer-events:none;';
    document.body.appendChild(aviso);
  }
  aviso.textContent = texto;
  aviso.style.display = 'block';
  clearTimeout(ocultarAviso);
  ocultarAviso = setTimeout(() => { if (aviso) aviso.style.display = 'none'; }, 4500);
};
