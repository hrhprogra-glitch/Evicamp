import React, { useState, useEffect } from 'react';
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
  almacen_ver_stock: false, almacen_ingresar_lotes: false, almacen_crear_editar_productos: false, almacen_eliminar_productos: false, almacen_modificar_precios: false, almacen_gestionar_proveedores: false, almacen_registrar_mermas: false,
  reportes_ver_historial_ventas: false, reportes_anular_ventas: false, reportes_ver_globales: false,
  gerencia_ver_utilidades: false, gerencia_gestionar_usuarios: false, gerencia_configuracion_sistema: false,
  sistema_acceso_total: false,
};

export const ModalUsuario: React.FC<ModalUsuarioProps> = ({ usuario, onClose }) => {
  useCerrarConEscape(true, () => onClose()); // Escape (o "Atrás" del control de TV) cierra la ventana
  const isEditing = !!usuario;
  const yo = useEmpleado();
  const [guardando, setGuardando] = useState(false);

  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '', 
    rol: 'Cajero',
    estado: 'ACTIVO',
  });

  const [permisos, setPermisos] = useState<PermisosUsuario>(PERMISOS_DEFAULT);

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

  const CheckboxItem = ({ label, labelKey }: { label: string, labelKey: keyof PermisosUsuario }) => {
    const isChecked = permisos[labelKey];
    return (
      <label className="flex items-center gap-2 cursor-pointer group mb-2">
        <div className={`flex items-center justify-center w-4 h-4 shrink-0 rounded-sm border ${isChecked ? 'bg-[var(--color-accent)] border-[var(--color-accent)]' : 'border-[var(--color-line-light)] group-hover:border-[var(--color-accent)]'} transition-colors`}>
          {isChecked && <CheckSquare size={14} className="text-white absolute" />}
        </div>
        <span className={`text-xs font-mono break-words min-w-0 ${isChecked ? 'text-[var(--color-ink)] font-bold' : 'text-[var(--color-muted)]'}`}>
          {label}
        </span>
      </label>
    );
  };

  return (
    <div className="fixed inset-0 bg-[var(--color-ink)]/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white border-2 border-[var(--color-ink)] w-full max-w-5xl max-h-[calc(var(--alto-pantalla)*0.94)] sm:max-h-[calc(var(--alto-pantalla)*0.9)] flex flex-col shadow-[8px_8px_0_0_var(--color-ink)]">
        
        {/* HEADER */}
        <div className="bg-[var(--color-ink)] p-4 flex justify-between items-center shrink-0">
          <h2 className="text-white font-black tracking-widest uppercase text-sm flex items-center gap-2">
            <Shield size={18} className="text-[var(--color-accent)]" />
            {isEditing ? `Editando Usuario: ${formData.nombre}` : 'Nueva Cuenta de Empleado'}
          </h2>
          <button onClick={() => onClose(false)} disabled={guardando} className="text-[var(--color-subtle)] hover:text-white transition-colors">
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
                <input type="text" name="nombre" value={formData.nombre} onChange={handleTextChange} placeholder="Ej. Juan Pérez" className="w-full border border-[var(--color-border)] p-2 text-sm focus:border-[var(--color-accent)] outline-none" />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-[var(--color-muted)] uppercase tracking-wider mb-1">Correo Electrónico</label>
                <input type="email" name="email" value={formData.email} onChange={handleTextChange} placeholder="usuario@evicamp.com" className="w-full border border-[var(--color-border)] p-2 text-sm focus:border-[var(--color-accent)] outline-none font-mono" />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-[var(--color-muted)] uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Lock size={10} /> {isEditing ? 'Nueva Contraseña (Opcional)' : 'Contraseña Temporal'}
                </label>
                <input type="password" name="password" value={formData.password} onChange={handleTextChange} placeholder="******" className="w-full border border-[var(--color-border)] p-2 text-sm focus:border-[var(--color-accent)] outline-none font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-bold text-[var(--color-muted)] uppercase tracking-wider mb-1">Rol</label>
                  <select name="rol" value={formData.rol} onChange={handleTextChange} className="w-full border border-[var(--color-border)] p-2 text-sm focus:border-[var(--color-accent)] outline-none bg-white font-bold">
                    <option value="Administrador">Administrador</option>
                    <option value="Cajero">Cajero</option>
                    <option value="Almacenero">Almacenero</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-[var(--color-muted)] uppercase tracking-wider mb-1">Estado</label>
                  <select name="estado" value={formData.estado} onChange={handleTextChange} className={`w-full border border-[var(--color-border)] p-2 text-sm outline-none font-bold ${formData.estado === 'ACTIVO' ? 'text-[var(--color-accent-dark)]' : 'text-red-500'}`}>
                    <option value="ACTIVO">ACTIVO</option>
                    <option value="INACTIVO">INACTIVO</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* DERECHA: PERMISOS */}
          <div className="w-full md:w-2/3 p-4 sm:p-6 md:overflow-y-auto bg-white">
            <div className="flex justify-between items-center mb-4 border-b border-[var(--color-border)] pb-2">
              <h3 className="text-[var(--color-ink)] font-bold uppercase text-xs">Asignación de Permisos</h3>
              <button onClick={() => togglePermiso('sistema_acceso_total')} className={`text-[12px] font-bold uppercase tracking-wider px-3 py-1 border transition-colors ${permisos.sistema_acceso_total ? 'bg-[var(--color-ink)] text-[var(--color-accent)] border-[var(--color-ink)]' : 'bg-white text-[var(--color-muted)] border-[var(--color-line-light)] hover:border-[var(--color-accent)]'}`}>
                {permisos.sistema_acceso_total ? 'DESMARCAR TODO' : 'OTORGAR ACCESO TOTAL'}
              </button>
            </div>
            
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 transition-opacity ${permisos.sistema_acceso_total ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
              <div className="bg-[var(--color-bg)] p-3 border border-[var(--color-border)]">
                <h4 className="text-[12px] font-black text-[var(--color-accent)] uppercase tracking-widest mb-3">Caja / POS</h4>
                <div className="space-y-1" {...clicConTeclado(() => togglePermiso('caja_realizar_ventas'))}><CheckboxItem label="Realizar Ventas (POS)" labelKey="caja_realizar_ventas" /></div>
                <div className="space-y-1" {...clicConTeclado(() => togglePermiso('caja_abrir_cerrar_turno'))}><CheckboxItem label="Abrir/Cerrar Turno" labelKey="caja_abrir_cerrar_turno" /></div>
                <div className="space-y-1" {...clicConTeclado(() => togglePermiso('caja_ingresos_egresos'))}><CheckboxItem label="Ingresos/Egresos Manuales" labelKey="caja_ingresos_egresos" /></div>
                <div className="space-y-1" {...clicConTeclado(() => togglePermiso('caja_ver_fiados'))}><CheckboxItem label="Ver Fiados" labelKey="caja_ver_fiados" /></div>
                <div className="space-y-1" {...clicConTeclado(() => togglePermiso('caja_cobrar_deudas'))}><CheckboxItem label="Cobrar/Amortizar Deudas" labelKey="caja_cobrar_deudas" /></div>
              </div>
              <div className="bg-[var(--color-bg)] p-3 border border-[var(--color-border)]">
                <h4 className="text-[12px] font-black text-[var(--color-accent)] uppercase tracking-widest mb-3">Almacén</h4>
                <div className="space-y-1" {...clicConTeclado(() => togglePermiso('almacen_ver_stock'))}><CheckboxItem label="Ver Stock Productos" labelKey="almacen_ver_stock" /></div>
                <div className="space-y-1" {...clicConTeclado(() => togglePermiso('almacen_ingresar_lotes'))}><CheckboxItem label="Ingresar Lotes (Compras)" labelKey="almacen_ingresar_lotes" /></div>
                <div className="space-y-1" {...clicConTeclado(() => togglePermiso('almacen_crear_editar_productos'))}><CheckboxItem label="Crear/Editar Productos" labelKey="almacen_crear_editar_productos" /></div>
                <div className="space-y-1" {...clicConTeclado(() => togglePermiso('almacen_eliminar_productos'))}><CheckboxItem label="Eliminar Productos" labelKey="almacen_eliminar_productos" /></div>
                <div className="space-y-1" {...clicConTeclado(() => togglePermiso('almacen_modificar_precios'))}><CheckboxItem label="Modificar Precios" labelKey="almacen_modificar_precios" /></div>
                <div className="space-y-1" {...clicConTeclado(() => togglePermiso('almacen_gestionar_proveedores'))}><CheckboxItem label="Gestionar Proveedores" labelKey="almacen_gestionar_proveedores" /></div>
                <div className="space-y-1" {...clicConTeclado(() => togglePermiso('almacen_registrar_mermas'))}><CheckboxItem label="Registrar Mermas" labelKey="almacen_registrar_mermas" /></div>
              </div>
              <div className="bg-[var(--color-bg)] p-3 border border-[var(--color-border)]">
                <h4 className="text-[12px] font-black text-[var(--color-accent)] uppercase tracking-widest mb-3">Reportes</h4>
                <div className="space-y-1" {...clicConTeclado(() => togglePermiso('reportes_ver_historial_ventas'))}><CheckboxItem label="Ver Historial de Ventas" labelKey="reportes_ver_historial_ventas" /></div>
                <div className="space-y-1" {...clicConTeclado(() => togglePermiso('reportes_anular_ventas'))}><CheckboxItem label="Anular Ventas (Extornos)" labelKey="reportes_anular_ventas" /></div>
                <div className="space-y-1" {...clicConTeclado(() => togglePermiso('reportes_ver_globales'))}><CheckboxItem label="Ver Reportes Globales" labelKey="reportes_ver_globales" /></div>
              </div>
              <div className="bg-[var(--color-bg)] p-3 border border-[var(--color-border)]">
                <h4 className="text-[12px] font-black text-[var(--color-accent)] uppercase tracking-widest mb-3">Gerencia</h4>
                <div className="space-y-1" {...clicConTeclado(() => togglePermiso('gerencia_ver_utilidades'))}><CheckboxItem label="Ver Utilidades" labelKey="gerencia_ver_utilidades" /></div>
                <div className="space-y-1" {...clicConTeclado(() => togglePermiso('gerencia_gestionar_usuarios'))}><CheckboxItem label="Gestionar Usuarios" labelKey="gerencia_gestionar_usuarios" /></div>
                <div className="space-y-1" {...clicConTeclado(() => togglePermiso('gerencia_configuracion_sistema'))}><CheckboxItem label="Configuración Sistema" labelKey="gerencia_configuracion_sistema" /></div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="bg-[var(--color-bg)] p-4 border-t border-[var(--color-border)] flex justify-end gap-3 shrink-0">
          <button onClick={() => onClose(false)} disabled={guardando} className="px-6 py-2 border border-[var(--color-border)] text-[var(--color-muted)] font-bold text-xs uppercase tracking-wider hover:bg-white transition-colors">
            Cancelar
          </button>
          <button onClick={handleGuardar} disabled={guardando} className={`${guardando ? 'bg-[var(--color-subtle)]' : 'bg-[var(--color-ink)] hover:bg-[var(--color-accent)] shadow-[3px_3px_0_0_var(--color-accent)] hover:shadow-[3px_3px_0_0_var(--color-ink)] hover:-translate-y-0.5'} text-white px-6 py-2 font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-2`}>
            {guardando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {guardando ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Crear Usuario')}
          </button>
        </div>
      </div>
    </div>
  );
};