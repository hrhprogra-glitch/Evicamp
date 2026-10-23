import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Shield, User, Lock, CheckSquare, Loader2 } from 'lucide-react';
import type { Empleado, PermisosUsuario } from '../types';
import { supabase } from '../../../db/supabase';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { clicConTeclado } from '../../../utils/clicConTeclado';
import { useEmpleado } from '../../../utils/permisos';
import { normalizarEmail, leerToken } from '../../../utils/sesion';

interface ModalUsuarioProps {
  usuario: Empleado | null;
  onClose: (actualizado?: boolean) => void;
}

const PERMISOS_DEFAULT: PermisosUsuario = {
  caja_realizar_ventas: false, caja_abrir_cerrar_turno: false, caja_ingresos_egresos: false, caja_ver_fiados: false, caja_cobrar_deudas: false,
  almacen_ver_stock: false, almacen_ingresar_lotes: false, almacen_crear_editar_productos: false, almacen_eliminar_productos: false, almacen_modificar_precios: false, almacen_gestionar_proveedores: false, almacen_registrar_mermas: false, compras_recibir: false, compras_enviar: false, inventario_contar: false,
  reportes_ver_historial_ventas: false, reportes_anular_ventas: false, reportes_ver_globales: false,
  gerencia_ver_utilidades: false, gerencia_gestionar_usuarios: false, gerencia_configuracion_sistema: false,
  sistema_acceso_total: false,
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
    descripcion: 'Maneja el almacén: productos, lotes, proveedores y mermas. No vende, no elimina productos ni cambia precios.',
    permisos: ['almacen_ver_stock', 'almacen_ingresar_lotes', 'almacen_crear_editar_productos', 'almacen_gestionar_proveedores', 'almacen_registrar_mermas'],
  },
];

const permisosDeRol = (nombre: string): PermisosUsuario => {
  const rol = ROLES.find((r) => r.nombre === nombre);
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
      { key: 'almacen_registrar_mermas', label: 'Registrar Mermas' },
      { key: 'inventario_contar', label: 'Contar Inventario (a ciegas)' },
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

export const ModalUsuario: React.FC<ModalUsuarioProps> = ({ usuario, onClose }) => {
  useCerrarConEscape(true, () => onClose()); // Escape (o "Atrás" del control de TV) cierra la ventana
  const isEditing = !!usuario;
  const yo = useEmpleado();
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
      <div className="bg-white border-2 border-[var(--color-ink)] w-full max-w-5xl max-h-[calc(var(--alto-pantalla)*0.94)] sm:max-h-[calc(var(--alto-pantalla)*0.9)] flex flex-col shadow-[8px_8px_0_0_var(--color-ink)]">
        
        {/* HEADER */}
        <div className="bg-[var(--color-ink)] p-4 flex justify-between items-center shrink-0">
          <h2 id="modal-usuario-title" className="text-white font-black tracking-widest uppercase text-sm flex items-center gap-2">
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
            className="text-[var(--color-subtle)] hover:text-white transition-colors p-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white rounded-none"
            title="Cerrar modal (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* BODY */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-y-auto md:overflow-hidden">
          {/* IZQUIERDA: DATOS */}
          <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-[var(--color-border)] p-4 sm:p-6 bg-[var(--color-bg)] md:overflow-y-auto shrink-0">
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
                    {ROLES.map((r) => <option key={r.nombre} value={r.nombre}>{r.nombre}</option>)}
                    {/* Un rol antiguo que no está en la lista se conserva tal cual */}
                    {!ROLES.some((r) => r.nombre === formData.rol) && <option value={formData.rol}>{formData.rol}</option>}
                  </select>
                  <p className="text-[11px] text-[var(--color-muted)] mt-1 leading-snug">
                    {ROLES.find((r) => r.nombre === formData.rol)?.descripcion || 'Rol personalizado.'} Sus permisos se marcan solos; puedes ajustarlos abajo.
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
          <div className="w-full md:w-2/3 p-4 sm:p-6 md:overflow-y-auto bg-white flex flex-col">
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
            
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 transition-opacity flex-1 ${permisos.sistema_acceso_total ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
              {COLUMNAS_PERMISOS.map((col, colIdx) => (
                <div key={col.titulo} className="bg-[var(--color-bg)] p-3 border border-[var(--color-border)] flex flex-col">
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
                              if (colIdx < COLUMNAS_PERMISOS.length - 1) {
                                const nextCol = COLUMNAS_PERMISOS[colIdx + 1];
                                const nextIdx = Math.min(itemIdx, nextCol.items.length - 1);
                                document.getElementById(`permiso-${nextCol.items[nextIdx].key}`)?.focus();
                              } else {
                                document.getElementById('btn-guardar-modal-usuario')?.focus();
                              }
                            } else if (e.key === 'ArrowLeft') {
                              e.preventDefault();
                              e.stopPropagation();
                              if (colIdx > 0) {
                                const prevCol = COLUMNAS_PERMISOS[colIdx - 1];
                                const prevIdx = Math.min(itemIdx, prevCol.items.length - 1);
                                document.getElementById(`permiso-${prevCol.items[prevIdx].key}`)?.focus();
                              } else {
                                if (itemIdx === 0) focusAndSelect('input-nombre-usuario-modal');
                                else if (itemIdx === 1) focusAndSelect('input-email-usuario-modal');
                                else if (itemIdx === 2) focusAndSelect('input-password-usuario-modal');
                                else if (itemIdx === 3) document.getElementById('select-rol-usuario-modal')?.focus();
                                else document.getElementById('select-estado-usuario-modal')?.focus();
                              }
                            }
                          }}
                          className={`flex items-center gap-2 p-1.5 rounded transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] focus:bg-amber-100/70 hover:bg-slate-100 select-none ${
                            isChecked ? 'bg-amber-50/50' : ''
                          }`}
                        >
                          <div className={`flex items-center justify-center w-4 h-4 shrink-0 rounded-sm border ${
                            isChecked ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white' : 'border-[var(--color-line-light)] bg-white'
                          }`}>
                            {isChecked && <CheckSquare size={14} className="text-white" />}
                          </div>
                          <span className={`text-xs font-mono break-words min-w-0 ${
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