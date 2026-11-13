import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Shield, User, Lock, CheckSquare, Loader2 } from 'lucide-react';
import type { Empleado, PermisosUsuario } from '../types';
import { supabase } from '../../../db/supabase';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { clicConTeclado } from '../../../utils/clicConTeclado';
import { useEmpleado } from '../../../utils/permisos';
import { normalizarEmail, leerToken } from '../../../utils/sesion';
import { useTiposNegocio } from '../../../utils/tiposNegocio';

interface ModalUsuarioProps {
  usuario: Empleado | null;
  onClose: (actualizado?: boolean) => void;
}

const PERMISOS_DEFAULT: PermisosUsuario = {
  caja_realizar_ventas: false, caja_abrir_cerrar_turno: false, caja_ingresos_egresos: false, caja_ver_fiados: false, caja_cobrar_deudas: false, caja_cambiar_precio: false,
  almacen_ver_stock: false, almacen_ingresar_lotes: false, almacen_crear_editar_productos: false, almacen_eliminar_productos: false, almacen_modificar_precios: false, almacen_gestionar_proveedores: false, almacen_registrar_mermas: false, compras_recibir: false, compras_enviar: false, inventario_contar: false,
  reportes_ver_historial_ventas: false, reportes_anular_ventas: false, reportes_ver_globales: false,
  gerencia_ver_utilidades: false, gerencia_gestionar_usuarios: false, gerencia_configuracion_sistema: false,
  sistema_acceso_total: false,
  // Talleres y servicios (SiuMax Nego, paso 3b)
  clientes_ver: false, clientes_editar: false, trabajadores_ver: false, trabajadores_editar: false,
  salidas_ver: false, salidas_crear: false, salidas_editar: false,
  herramientas_ver: false, herramientas_crear: false, herramientas_editar: false,
  agenda_ver: false, agenda_crear: false, agenda_editar: false,
  contratos_ver: false, contratos_crear: false, contratos_editar: false,
  cobros_ver: false, cobros_crear: false, cobros_editar: false,
  taller_ver: false, taller_crear: false, taller_editar: false,
};

// Al elegir el rol se marcan solos sus permisos (después se pueden ajustar a mano)
const ROLES: { nombre: string; descripcion: string; permisos: (keyof PermisosUsuario)[] }[] = [
  {
    nombre: 'Administrador',
    descripcion: 'Acceso total: todo el sistema, usuarios y configuración.',
    permisos: ['sistema_acceso_total'],
  },
  {
    nombre: 'Encargado',
    descripcion: 'Maneja la tienda: caja, almacén, reportes y anular ventas. No ve utilidades ni maneja usuarios.',
    permisos: [
      'caja_realizar_ventas', 'caja_abrir_cerrar_turno', 'caja_ingresos_egresos', 'caja_ver_fiados', 'caja_cobrar_deudas',
      'almacen_ver_stock', 'almacen_ingresar_lotes', 'almacen_crear_editar_productos', 'almacen_eliminar_productos',
      'almacen_modificar_precios', 'almacen_gestionar_proveedores', 'almacen_registrar_mermas',
      'reportes_ver_historial_ventas', 'reportes_anular_ventas', 'reportes_ver_globales',
    ],
  },
  {
    nombre: 'Cajero',
    descripcion: 'Vende, abre y cierra su turno, fía y cobra deudas. Cierra a ciegas (no ve cuánto debería haber en caja). Para devolver o anular, el administrador pone su clave en esa pantalla. No entra a Inventario (no ve costos) ni cambia productos o precios.',
    permisos: ['caja_realizar_ventas', 'caja_abrir_cerrar_turno', 'caja_ver_fiados', 'caja_cobrar_deudas', 'reportes_ver_historial_ventas'],
  },
  {
    nombre: 'Almacenero',
    descripcion: 'Maneja el almacén: productos, lotes, proveedores y conteos. No vende, no elimina productos ni cambia precios.',
    permisos: ['almacen_ver_stock', 'almacen_ingresar_lotes', 'almacen_crear_editar_productos', 'almacen_gestionar_proveedores', 'almacen_registrar_mermas'],
  },
];

// Roles de "Talleres y servicios" (los de SiuMax Servic). Sin Caja ni Finanzas: un negocio solo de servicios no las ve.
const ROLES_SERVICIOS: typeof ROLES = [
  {
    nombre: 'Encargado de servicios',
    descripcion: 'Maneja el día a día de los servicios: agenda, salidas, contratos, taller, cotizaciones, clientes, trabajadores, almacén, herramientas y vehículos. No maneja usuarios ni la configuración.',
    permisos: [
      'agenda_ver', 'agenda_crear', 'agenda_editar',
      'contratos_ver', 'contratos_crear', 'contratos_editar',
      'cobros_ver', 'cobros_crear', 'cobros_editar',
      'clientes_ver', 'clientes_editar', 'trabajadores_ver', 'trabajadores_editar',
      'almacen_ver_stock', 'almacen_crear_editar_productos', 'almacen_ingresar_lotes',
      'almacen_gestionar_proveedores', 'compras_recibir', 'compras_enviar', 'inventario_contar',
      'salidas_ver', 'salidas_crear', 'salidas_editar',
      'herramientas_ver', 'herramientas_crear', 'herramientas_editar',
      'taller_ver', 'taller_crear', 'taller_editar',
    ],
  },
  {
    nombre: 'Técnico',
    descripcion: 'Trabajador de campo o del taller: ve su agenda, contratos, cotizaciones, clientes y stock; registra salidas, consulta herramientas y atiende reparaciones en el taller.',
    permisos: ['agenda_ver', 'contratos_ver', 'cobros_ver', 'clientes_ver', 'almacen_ver_stock', 'salidas_ver', 'salidas_crear', 'herramientas_ver', 'taller_ver', 'taller_editar'],
  },
];

const permisosDeRol = (nombre: string): PermisosUsuario => {
  const rol = [...ROLES, ...ROLES_SERVICIOS].find((r) => r.nombre === nombre);
  if (!rol) return { ...PERMISOS_DEFAULT };
  if (rol.permisos.includes('sistema_acceso_total')) {
    return Object.fromEntries(Object.keys(PERMISOS_DEFAULT).map((k) => [k, true])) as unknown as PermisosUsuario;
  }
  return { ...PERMISOS_DEFAULT, ...Object.fromEntries(rol.permisos.map((k) => [k, true])) };
};

const COLUMNAS_PERMISOS: {
  titulo: string;
  items: { key: keyof PermisosUsuario; label: string }[];
}[] = [
  {
    titulo: 'Caja / POS',
    items: [
      { key: 'caja_realizar_ventas', label: 'Realizar Ventas (POS)' },
      { key: 'caja_cambiar_precio', label: 'Cambiar Precio al Cobrar (sin clave del admin)' },
      { key: 'caja_abrir_cerrar_turno', label: 'Abrir/Cerrar Turno' },
      { key: 'caja_ingresos_egresos', label: 'Ingresos/Egresos Manuales' },
      { key: 'caja_ver_fiados', label: 'Ver Fiados' },
      { key: 'caja_cobrar_deudas', label: 'Cobrar/Amortizar Deudas' },
    ],
  },
  {
    titulo: 'Almacén',
    items: [
      { key: 'almacen_ver_stock', label: 'Ver Stock Productos' },
      { key: 'almacen_ingresar_lotes', label: 'Ingresar Lotes (Compras)' },
      { key: 'compras_recibir', label: 'Recibir Pedidos (solo Compras)' },
      { key: 'compras_enviar', label: 'Enviar / Imprimir Pedidos (solo Compras)' },
      { key: 'almacen_crear_editar_productos', label: 'Crear/Editar Productos' },
      { key: 'almacen_eliminar_productos', label: 'Eliminar Productos' },
      { key: 'almacen_modificar_precios', label: 'Modificar Precios' },
      { key: 'almacen_gestionar_proveedores', label: 'Gestionar Proveedores' },
      { key: 'almacen_registrar_mermas', label: 'Conteos: registrar salidas y ver todo' },
      { key: 'inventario_contar', label: 'Conteos: solo contar (a ciegas)' },
    ],
  },
  {
    titulo: 'Reportes',
    items: [
      { key: 'reportes_ver_historial_ventas', label: 'Ver Ventas de su Turno' },
      { key: 'reportes_anular_ventas', label: 'Anular Ventas sin Clave del Admin' },
      { key: 'reportes_ver_globales', label: 'Ver Totales de Caja y Turnos Anteriores' },
    ],
  },
  {
    titulo: 'Gerencia',
    items: [
      { key: 'gerencia_ver_utilidades', label: 'Ver Utilidades' },
      { key: 'gerencia_gestionar_usuarios', label: 'Gestionar Usuarios' },
      { key: 'gerencia_configuracion_sistema', label: 'Configuración Sistema' },
    ],
  },
];

// Columnas de "Talleres y servicios" (las de SiuMax Servic): solo si el negocio eligió ese tipo
const COLUMNAS_SERVICIOS: typeof COLUMNAS_PERMISOS = [
  {
    titulo: 'Agenda',
    items: [
      { key: 'agenda_ver', label: 'Ver Trabajos y Calendario' },
      { key: 'agenda_crear', label: 'Crear / Programar Trabajos' },
      { key: 'agenda_editar', label: 'Editar, Cambiar Estado y Reasignar' },
    ],
  },
  {
    titulo: 'Salidas',
    items: [
      { key: 'salidas_ver', label: 'Ver Salidas y Comprobantes' },
      { key: 'salidas_crear', label: 'Crear Salidas a Obras/Servicios' },
      { key: 'salidas_editar', label: 'Devolver Materiales y Finalizar/Reactivar' },
    ],
  },
  {
    titulo: 'Contratos y Períodos',
    items: [
      { key: 'contratos_ver', label: 'Ver Contratos, Visitas y Cobros' },
      { key: 'contratos_crear', label: 'Crear Contratos y Generar Visitas' },
      { key: 'contratos_editar', label: 'Editar Contratos, Registrar Consumos y Pagos' },
    ],
  },
  {
    titulo: 'Taller',
    items: [
      { key: 'taller_ver', label: 'Ver Órdenes de Taller y Reparaciones' },
      { key: 'taller_crear', label: 'Crear Órdenes de Reparación y Tickets' },
      { key: 'taller_editar', label: 'Diagnosticar, Cambiar Estados y Registrar Pagos' },
    ],
  },
  {
    titulo: 'Cotizaciones',
    items: [
      { key: 'cobros_ver', label: 'Ver Cotizaciones' },
      { key: 'cobros_crear', label: 'Crear Cotizaciones y Convertir a Trabajo' },
      { key: 'cobros_editar', label: 'Editar Cotizaciones y Registrar Pagos/Adelantos' },
    ],
  },
  {
    titulo: 'Clientes y Trabajadores',
    items: [
      { key: 'clientes_ver', label: 'Ver Clientes y lo que se atiende' },
      { key: 'clientes_editar', label: 'Crear/Editar Clientes y lo que se atiende' },
      { key: 'trabajadores_ver', label: 'Ver Trabajadores' },
      { key: 'trabajadores_editar', label: 'Crear/Editar/Desactivar Trabajadores' },
    ],
  },
  {
    titulo: 'Herramientas y Vehículos',
    items: [
      { key: 'herramientas_ver', label: 'Ver Herramientas, Préstamos y Vehículos' },
      { key: 'herramientas_crear', label: 'Crear Activos, Prestar y Mantenimientos' },
      { key: 'herramientas_editar', label: 'Editar/Eliminar Activos y Registrar Devoluciones' },
    ],
  },
];

export const ModalUsuario: React.FC<ModalUsuarioProps> = ({ usuario, onClose }) => {
  useCerrarConEscape(true, () => onClose()); // Escape (o "Atrás" del control de TV) cierra la ventana
  const isEditing = !!usuario;
  const yo = useEmpleado();
  // Con "Talleres y servicios" (Ajustes → Tipo de negocio) salen también sus roles y permisos
  const conServicios = useTiposNegocio().includes('servicios');
  const roles = conServicios ? [...ROLES, ...ROLES_SERVICIOS] : ROLES;
  const columnas = conServicios ? [...COLUMNAS_PERMISOS, ...COLUMNAS_SERVICIOS] : COLUMNAS_PERMISOS;
  const [guardando, setGuardando] = useState(false);
  const nombreInputRef = useRef<HTMLInputElement>(null);

  const focusAndSelect = (id: string) => {
    const el = document.getElementById(id) as HTMLElement | null;
    if (el) {
      el.focus();
      (el as HTMLInputElement)?.select?.();
    }
  };

  const canExitRight = (input: HTMLInputElement) => {
    const isAllSelected = input.selectionStart === 0 && input.selectionEnd === input.value.length;
    const isAtEnd = input.selectionStart === input.value.length;
    return isAllSelected || isAtEnd;
  };

  const canExitLeft = (input: HTMLInputElement) => {
    const isAllSelected = input.selectionStart === 0 && input.selectionEnd === input.value.length;
    const isAtStart = input.selectionStart === 0;
    return isAllSelected || isAtStart;
  };

  // 🔒 Focus Trap (modal-focus-trap skill) con prioridad absoluta en fase de captura
  useEffect(() => {
    const handleFormKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.stopPropagation();

        const allFocusables = Array.from(document.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]):not([type="file"]), select:not([disabled]), [tabindex="0"]'
        ));
        const modalFocusables = allFocusables.filter(el =>
          el.closest('#modal-usuario-container') &&
          el.tabIndex !== -1 &&
          !el.classList.contains('hidden') &&
          el.offsetParent !== null
        );

        if (modalFocusables.length > 0) {
          const first = modalFocusables[0];
          const last = modalFocusables[modalFocusables.length - 1];

          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleFormKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleFormKeyDown, { capture: true });
  }, []);

  // Autofoco inicial en el primer campo
  useEffect(() => {
    const t = setTimeout(() => {
      nombreInputRef.current?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, []);

  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '', 
    rol: 'Cajero',
    estado: 'ACTIVO',
  });

  // Usuario nuevo: empieza como Cajero con sus permisos ya marcados
  const [permisos, setPermisos] = useState<PermisosUsuario>(() => permisosDeRol('Cajero'));

  useEffect(() => {
    if (usuario) {
      setFormData({
        nombre: usuario.nombre,
        email: usuario.email,
        password: '', // Lo dejamos vacío por seguridad, solo lo enviamos si escribe algo nuevo
        rol: usuario.rol,
        estado: usuario.estado,
      });
      // Asegurarnos de que los permisos existan, sino usamos por defecto
      setPermisos(usuario.permisos || PERMISOS_DEFAULT);
    }
  }, [usuario]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Cambiar el rol marca solos los permisos de ese rol
    if (e.target.name === 'rol') setPermisos(permisosDeRol(e.target.value));
  };

  const togglePermiso = (key: keyof PermisosUsuario) => {
    if (key === 'sistema_acceso_total') {
      const nuevoEstado = !permisos.sistema_acceso_total;
      const todosPermisos = Object.keys(permisos).reduce((acc, currKey) => {
        acc[currKey as keyof PermisosUsuario] = nuevoEstado;
        return acc;
      }, {} as PermisosUsuario);
      setPermisos(todosPermisos);
      return;
    }
    setPermisos({ ...permisos, [key]: !permisos[key] });
  };

  // FUNCION PARA GUARDAR EN BASE DE DATOS
  const handleGuardar = async () => {
    if (!formData.nombre || !formData.email || (!isEditing && !formData.password)) {
      alert('⚠️ Por favor completa Nombre, Email y Contraseña.');
      return;
    }

    if (isEditing && usuario?.id === yo?.id && formData.estado !== 'ACTIVO') {
      alert('⚠️ No puedes desactivar tu propia cuenta: te quedarías sin acceso.');
      return;
    }
    setGuardando(true);
    try {
      // 🔐 Crear/editar un empleado pasa por funciones seguras del servidor
      // (fn_crear_empleado/fn_editar_empleado): la contraseña se cifra (bcrypt)
      // adentro de la base de datos, nunca se guarda en texto plano.
      const token = leerToken();
      if (!token) throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.');
      const emailNormalizado = normalizarEmail(formData.email);

      if (isEditing && usuario?.id) {
        const { error } = await supabase.rpc('fn_editar_empleado', {
          p_token: token,
          p_empleado_id: usuario.id,
          p_nombre: formData.nombre,
          p_email: emailNormalizado,
          p_rol: formData.rol,
          p_estado: formData.estado,
          p_permisos: permisos,
          p_nuevo_password: formData.password || null,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.rpc('fn_crear_empleado', {
          p_token: token,
          p_nombre: formData.nombre,
          p_email: emailNormalizado,
          p_password: formData.password,
          p_rol: formData.rol,
          p_permisos: permisos,
        });
        if (error) throw error;
      }

      onClose(true); // Cerrar modal y avisar que SÍ hubo cambios
    } catch (error: any) {
      console.error('Error al guardar:', error);
      // 23505 = correo repetido (la columna email es única)
      alert(error?.code === '23505'
        ? '⚠️ Ya existe un usuario con ese correo. Usa otro correo.'
        : '❌ Error al guardar usuario: ' + error.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div 
      id="modal-usuario-container"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-usuario-title"
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4"
    >
      <div className="ventana-sobria bg-white border-2 border-[var(--color-ink)] w-full max-w-7xl max-h-[calc(var(--alto-pantalla)*0.94)] sm:max-h-[calc(var(--alto-pantalla)*0.9)] flex flex-col">
        
        {/* HEADER */}
        <div style={{ '--icono': 'var(--color-accent-shadow)' } as React.CSSProperties} className="ventana-cabecera bg-[var(--color-ink)] p-4 flex justify-between items-center shrink-0">
          <h2 id="modal-usuario-title" className="ventana-cabecera__titulo text-white font-black tracking-widest uppercase text-sm flex items-center gap-2">
            <Shield size={18} className="text-[var(--color-accent)]" />
            {isEditing ? `Editando Usuario: ${formData.nombre}` : 'Nueva Cuenta de Empleado'}
          </h2>
          <button 
            id="btn-cerrar-modal-usuario"
            onClick={() => onClose(false)} 
            disabled={guardando} 
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
                e.preventDefault();
                e.stopPropagation();
                focusAndSelect('input-nombre-usuario-modal');
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('btn-toggle-todos-permisos')?.focus();
              }
            }}
            className="ventana-cerrar text-[var(--color-subtle)] hover:text-white transition-colors p-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white rounded-none"
            title="Cerrar modal (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* BODY */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-y-auto md:overflow-hidden custom-scrollbar">
          {/* IZQUIERDA: DATOS */}
          <div className="w-full md:w-72 lg:w-80 border-b md:border-b-0 md:border-r border-[var(--color-border)] p-4 sm:p-6 bg-[var(--color-bg)] md:overflow-y-auto custom-scrollbar shrink-0">
            <h3 className="text-[var(--color-ink)] font-bold uppercase text-xs mb-4 border-b border-[var(--color-border)] pb-2 flex items-center gap-2">
              <User size={14} /> Datos de Acceso
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-bold text-[var(--color-muted)] uppercase tracking-wider mb-1">Nombre Completo</label>
                <input 
                  id="input-nombre-usuario-modal"
                  ref={nombreInputRef}
                  autoComplete="off" 
                  type="text" 
                  name="nombre" 
                  value={formData.nombre} 
                  onChange={handleTextChange} 
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'ArrowDown') {
                      e.preventDefault();
                      focusAndSelect('input-email-usuario-modal');
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      document.getElementById('btn-cerrar-modal-usuario')?.focus();
                    } else if (e.key === 'ArrowRight' && canExitRight(e.currentTarget)) {
                      e.preventDefault();
                      document.getElementById('btn-toggle-todos-permisos')?.focus();
                    }
                  }}
                  placeholder="Ej. Juan Pérez" 
                  className="w-full border border-[var(--color-border)] p-2 text-sm focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)] focus:bg-amber-50/40 outline-none" 
                />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-[var(--color-muted)] uppercase tracking-wider mb-1">Correo Electrónico</label>
                <input 
                  id="input-email-usuario-modal"
                  autoComplete="off" 
                  type="email" 
                  name="email" 
                  value={formData.email} 
                  onChange={handleTextChange} 
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'ArrowDown') {
                      e.preventDefault();
                      focusAndSelect('input-password-usuario-modal');
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      focusAndSelect('input-nombre-usuario-modal');
                    } else if (e.key === 'ArrowRight' && canExitRight(e.currentTarget)) {
                      e.preventDefault();
                      document.getElementById('permiso-caja_realizar_ventas')?.focus();
                    } else if (e.key === 'ArrowLeft' && canExitLeft(e.currentTarget)) {
                      e.preventDefault();
                      focusAndSelect('input-nombre-usuario-modal');
                    }
                  }}
                  placeholder="usuario@tunegocio.com" 
                  className="w-full border border-[var(--color-border)] p-2 text-sm focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)] focus:bg-amber-50/40 outline-none font-mono" 
                />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-[var(--color-muted)] uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Lock size={10} /> {isEditing ? 'Nueva Contraseña (Opcional)' : 'Contraseña Temporal'}
                </label>
                <input 
                  id="input-password-usuario-modal"
                  autoComplete="off" 
                  type="password" 
                  name="password" 
                  value={formData.password} 
                  onChange={handleTextChange} 
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'ArrowDown') {
                      e.preventDefault();
                      document.getElementById('select-rol-usuario-modal')?.focus();
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      focusAndSelect('input-email-usuario-modal');
                    } else if (e.key === 'ArrowRight' && canExitRight(e.currentTarget)) {
                      e.preventDefault();
                      document.getElementById('permiso-caja_ingresos_egresos')?.focus();
                    } else if (e.key === 'ArrowLeft' && canExitLeft(e.currentTarget)) {
                      e.preventDefault();
                      focusAndSelect('input-email-usuario-modal');
                    }
                  }}
                  placeholder="******" 
                  className="w-full border border-[var(--color-border)] p-2 text-sm focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)] focus:bg-amber-50/40 outline-none font-mono" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-bold text-[var(--color-muted)] uppercase tracking-wider mb-1">Rol</label>
                  <select 
                    id="select-rol-usuario-modal"
                    name="rol" 
                    value={formData.rol} 
                    onChange={handleTextChange} 
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowRight') {
                        e.preventDefault();
                        e.stopPropagation();
                        document.getElementById('select-estado-usuario-modal')?.focus();
                      } else if (e.key === 'ArrowLeft') {
                        e.preventDefault();
                        e.stopPropagation();
                        focusAndSelect('input-password-usuario-modal');
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        e.stopPropagation();
                        focusAndSelect('input-password-usuario-modal');
                      } else if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        e.stopPropagation();
                        document.getElementById('btn-cancelar-modal-usuario')?.focus();
                      }
                    }}
                    className="w-full border border-[var(--color-border)] p-2 text-sm focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)] focus:bg-amber-50/40 outline-none bg-white font-bold cursor-pointer"
                  >
                    {roles.map((r) => <option key={r.nombre} value={r.nombre}>{r.nombre}</option>)}
                    {/* Un rol antiguo que no está en la lista se conserva tal cual */}
                    {!roles.some((r) => r.nombre === formData.rol) && <option value={formData.rol}>{formData.rol}</option>}
                  </select>
                  <p className="text-[11px] text-[var(--color-muted)] mt-1 leading-snug">
                    {roles.find((r) => r.nombre === formData.rol)?.descripcion || 'Rol personalizado.'} Sus permisos se marcan solos; puedes ajustarlos abajo.
                  </p>
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-[var(--color-muted)] uppercase tracking-wider mb-1">Estado</label>
                  <select 
                    id="select-estado-usuario-modal"
                    name="estado" 
                    value={formData.estado} 
                    onChange={handleTextChange} 
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowLeft') {
                        e.preventDefault();
                        e.stopPropagation();
                        document.getElementById('select-rol-usuario-modal')?.focus();
                      } else if (e.key === 'ArrowRight') {
                        e.preventDefault();
                        e.stopPropagation();
                        document.getElementById('permiso-caja_cobrar_deudas')?.focus();
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        e.stopPropagation();
                        focusAndSelect('input-password-usuario-modal');
                      } else if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        e.stopPropagation();
                        document.getElementById('btn-guardar-modal-usuario')?.focus();
                      }
                    }}
                    className={`w-full border border-[var(--color-border)] p-2 text-sm focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)] focus:bg-amber-50/40 outline-none font-bold cursor-pointer ${formData.estado === 'ACTIVO' ? 'text-[var(--color-accent-dark)]' : 'text-red-500'}`}
                  >
                    <option value="ACTIVO">ACTIVO</option>
                    <option value="INACTIVO">INACTIVO</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* DERECHA: PERMISOS */}
          <div className="w-full md:flex-1 min-w-0 p-4 sm:p-6 md:overflow-y-auto custom-scrollbar bg-white flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b border-[var(--color-border)] pb-2 shrink-0">
              <h3 className="text-[var(--color-ink)] font-bold uppercase text-xs">Asignación de Permisos</h3>
              <button 
                id="btn-toggle-todos-permisos"
                onClick={() => togglePermiso('sistema_acceso_total')} 
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    e.stopPropagation();
                    document.getElementById('permiso-caja_realizar_ventas')?.focus();
                  } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    e.stopPropagation();
                    focusAndSelect('input-nombre-usuario-modal');
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    e.stopPropagation();
                    document.getElementById('btn-cerrar-modal-usuario')?.focus();
                  }
                }}
                className={`text-[12px] font-bold uppercase tracking-wider px-3 py-1 border transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] ${permisos.sistema_acceso_total ? 'bg-[var(--color-ink)] text-[var(--color-accent)] border-[var(--color-ink)]' : 'bg-white text-[var(--color-muted)] border-[var(--color-line-light)] hover:border-[var(--color-accent)]'}`}
              >
                {permisos.sistema_acceso_total ? 'DESMARCAR TODO' : 'OTORGAR ACCESO TOTAL'}
              </button>
            </div>
            
            <div className={`columns-[12.5rem] gap-3 xl:columns-auto xl:grid xl:grid-cols-4 xl:items-start transition-opacity ${permisos.sistema_acceso_total ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
              {columnas.map((col, colIdx) => (
                <div key={col.titulo} className="bg-[var(--color-bg)] p-3 border border-[var(--color-border)] flex flex-col break-inside-avoid mb-3">
                  <h4 className="text-[12px] font-black text-[var(--color-accent)] uppercase tracking-widest mb-3 shrink-0">
                    {col.titulo}
                  </h4>
                  <div className="space-y-1.5 flex-1">
                    {col.items.map((item, itemIdx) => {
                      const isChecked = !!permisos[item.key];
                      return (
                        <div
                          key={item.key}
                          id={`permiso-${item.key}`}
                          role="checkbox"
                          aria-checked={isChecked}
                          tabIndex={permisos.sistema_acceso_total ? -1 : 0}
                          onClick={() => {
                            if (!permisos.sistema_acceso_total) togglePermiso(item.key);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === ' ' || e.key === 'Enter') {
                              e.preventDefault();
                              e.stopPropagation();
                              if (!permisos.sistema_acceso_total) togglePermiso(item.key);
                            } else if (e.key === 'ArrowDown') {
                              e.preventDefault();
                              e.stopPropagation();
                              if (itemIdx < col.items.length - 1) {
                                document.getElementById(`permiso-${col.items[itemIdx + 1].key}`)?.focus();
                              } else {
                                document.getElementById('btn-guardar-modal-usuario')?.focus();
                              }
                            } else if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              e.stopPropagation();
                              if (itemIdx > 0) {
                                document.getElementById(`permiso-${col.items[itemIdx - 1].key}`)?.focus();
                              } else {
                                document.getElementById('btn-toggle-todos-permisos')?.focus();
                              }
                            } else if (e.key === 'ArrowRight') {
                              e.preventDefault();
                              e.stopPropagation();
                              if (colIdx < columnas.length - 1) {
                                const nextCol = columnas[colIdx + 1];
                                const nextIdx = Math.min(itemIdx, nextCol.items.length - 1);
                                document.getElementById(`permiso-${nextCol.items[nextIdx].key}`)?.focus();
                              } else {
                                document.getElementById('btn-guardar-modal-usuario')?.focus();
                              }
                            } else if (e.key === 'ArrowLeft') {
                              e.preventDefault();
                              e.stopPropagation();
                              if (colIdx > 0) {
                                const prevCol = columnas[colIdx - 1];
                                const prevIdx = Math.min(itemIdx, prevCol.items.length - 1);
                                document.getElementById(`permiso-${prevCol.items[prevIdx].key}`)?.focus();
                              } else {
                                if (itemIdx === 0) focusAndSelect('input-nombre-usuario-modal');
                                else if (itemIdx === 1) focusAndSelect('input-email-usuario-modal');
                                else if (itemIdx === 2) focusAndSelect('input-password-usuario-modal');
                                else document.getElementById('select-estado-usuario-modal')?.focus(); // Estado está al lado; Rol queda a su izquierda
                              }
                            }
                          }}
                          className={`flex items-center gap-2 p-1.5 rounded-none transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] focus:bg-amber-100/70 hover:bg-slate-100 select-none ${
                            isChecked ? 'bg-amber-50/50' : ''
                          }`}
                        >
                          <div className={`flex items-center justify-center w-4 h-4 shrink-0 rounded-none border ${
                            isChecked ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white' : 'border-[var(--color-line-light)] bg-white'
                          }`}>
                            {isChecked && <CheckSquare size={14} className="text-white" />}
                          </div>
                          <span className={`text-xs font-mono min-w-0 leading-snug ${
                            isChecked ? 'text-[var(--color-ink)] font-black' : 'text-[var(--color-muted)] font-semibold'
                          }`}>
                            {item.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="bg-[var(--color-bg)] p-4 border-t border-[var(--color-border)] flex justify-end gap-3 shrink-0">
          <button 
            id="btn-cancelar-modal-usuario"
            onClick={() => onClose(false)} 
            disabled={guardando} 
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('btn-guardar-modal-usuario')?.focus();
              } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('select-rol-usuario-modal')?.focus();
              }
            }}
            className="px-6 py-2 border border-[var(--color-border)] text-[var(--color-muted)] font-bold text-xs uppercase tracking-wider hover:bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] cursor-pointer"
          >
            Cancelar
          </button>
          <button 
            id="btn-guardar-modal-usuario"
            onClick={handleGuardar} 
            disabled={guardando} 
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('btn-cancelar-modal-usuario')?.focus();
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('select-estado-usuario-modal')?.focus();
              }
            }}
            className={`${guardando ? 'bg-[var(--color-subtle)]' : 'bg-[var(--color-ink)] hover:bg-[var(--color-accent)] shadow-[3px_3px_0_0_var(--color-accent)] hover:shadow-[3px_3px_0_0_var(--color-ink)] hover:-translate-y-0.5'} text-white px-6 py-2 font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] cursor-pointer`}
          >
            {guardando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {guardando ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Crear Usuario')}
          </button>
        </div>
      </div>
    </div>
  );
};