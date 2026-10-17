import React, { useState, useEffect, useRef } from 'react';
import { Users, Plus, Edit2, ShieldAlert, Trash2, Search, Filter } from 'lucide-react';
import type { Empleado } from '../types';
import { ModalUsuario } from './ModalUsuario';
import { supabase } from '../../../db/supabase';
import { useEmpleado } from '../../../utils/permisos';
import { leerToken } from '../../../utils/sesion';
import { confirmar } from '../../../utils/dialogos';

export const TablaUsuarios: React.FC = () => {
  const [usuarios, setUsuarios] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<Empleado | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('TODOS');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const ultimoUsuarioIdRef = useRef<string | null>(null);
  const yo = useEmpleado(); // el empleado con la sesión abierta (no puede borrarse a sí mismo)

  // Función para traer los usuarios desde la base de datos
  const cargarUsuarios = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('empleados_publico')
        .select('id, nombre, email, rol, estado, permisos, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsuarios(data || []);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const usuariosFiltrados = usuarios.filter(u => {
    const q = busqueda.toLowerCase().trim();
    const matchBusqueda = !q || 
      (u.nombre || '').toLowerCase().includes(q) || 
      (u.email || '').toLowerCase().includes(q);
    const matchRol = filtroRol === 'TODOS' || u.rol === filtroRol;
    return matchBusqueda && matchRol;
  });

  const rolesUnicos = Array.from(new Set(usuarios.map(u => u.rol))).filter(Boolean);

  const focusPrimerRegistro = () => {
    const rows = Array.from(document.querySelectorAll('#tabla-usuarios-ajustes tr[data-row="true"]')) as HTMLElement[];
    if (rows[0]) {
      rows[0].focus();
      rows[0].scrollIntoView({ block: 'nearest' });
    }
  };

  const handleNuevoUsuario = () => {
    ultimoUsuarioIdRef.current = null;
    setUsuarioEditando(null);
    setModalAbierto(true);
  };

  const handleEditar = (usuario: Empleado) => {
    ultimoUsuarioIdRef.current = usuario.id;
    setUsuarioEditando(usuario);
    setModalAbierto(true);
  };

  const handleEliminar = async (usuario: Empleado) => {
    if (!await confirmar(`¿Eliminar la cuenta de ${usuario.nombre} (${usuario.email})?\n\nSe cerrarán sus sesiones abiertas y ya no podrá entrar. Esta acción no se puede deshacer.`)) return;
    const token = leerToken();
    if (!token) { alert('Tu sesión expiró. Vuelve a iniciar sesión.'); return; }
    const { error } = await supabase.rpc('fn_eliminar_empleado', { p_token: token, p_empleado_id: usuario.id });
    if (error) {
      alert('❌ No se pudo eliminar la cuenta: ' + error.message);
      return;
    }
    cargarUsuarios();
  };

  // Cuando el modal se cierra, verificamos si hay que recargar la tabla y restaurar foco
  const handleCerrarModal = (actualizarTabla: boolean = false) => {
    setModalAbierto(false);
    if (actualizarTabla) {
      cargarUsuarios();
    }
    setTimeout(() => {
      if (ultimoUsuarioIdRef.current) {
        const row = document.querySelector(`#tabla-usuarios-ajustes tr[data-user-id="${ultimoUsuarioIdRef.current}"]`) as HTMLElement;
        if (row) {
          row.focus();
          row.scrollIntoView({ block: 'nearest' });
          return;
        }
      }
      searchInputRef.current?.focus();
    }, 50);
  };

  // 🧲 Auto-Focus Magnet para TablaUsuarios
  useEffect(() => {
    const enforceFocus = () => {
      if (
        modalAbierto ||
        document.querySelector('[role="dialog"]') ||
        document.querySelector('.fixed.inset-0.z-50')
      ) return;

      const sidebar = document.getElementById('evicamp-sidebar');
      if (sidebar?.getAttribute('data-sidebar-open') === 'true') return;

      const active = document.activeElement as HTMLElement | null;
      if (active && active !== document.body && !active.closest('#evicamp-sidebar')) {
        const tag = active.tagName;
        if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(tag)) return;
        if (active.closest('tr[data-row="true"]')) return;
        if (active.getAttribute('role') === 'button') return;
      }

      searchInputRef.current?.focus();
    };

    const handleWindowFocus = () => setTimeout(enforceFocus, 50);
    const handleGlobalClick = () => setTimeout(enforceFocus, 50);

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('click', handleGlobalClick);

    const timer = setTimeout(enforceFocus, 100);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('click', handleGlobalClick);
    };
  }, [modalAbierto]);

  // ⌨️ Selector de Grilla con Teclado (Patrón Evicamp)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        modalAbierto ||
        document.querySelector('[role="dialog"]') ||
        document.querySelector('.fixed.inset-0.z-50')
      ) {
        return;
      }

      const sidebar = document.getElementById('evicamp-sidebar');
      if (sidebar?.getAttribute('data-sidebar-open') === 'true') return;

      const active = document.activeElement as HTMLElement | null;

      // Si el foco está en un input/select, no interferir
      if (active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)) return;
      if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;

      // Si el foco está en el botón "Nuevo Usuario"
      if (active?.id === 'btn-nuevo-usuario-ajustes') {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          e.stopPropagation();
          focusPrimerRegistro();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          e.stopPropagation();
          document.getElementById('filtro-rol-usuarios-ajustes')?.focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          e.stopPropagation();
          document.getElementById('btn-tab-usuarios')?.focus();
        }
        return;
      }

      const rowSelector = '#tabla-usuarios-ajustes tr[data-row="true"]';
      const currentRow = active?.closest(rowSelector) as HTMLElement | null;

      if (currentRow) {
        const rows = Array.from(document.querySelectorAll(rowSelector)) as HTMLElement[];
        const rowIndex = rows.indexOf(currentRow);

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          e.stopPropagation();
          if (rowIndex < rows.length - 1) {
            rows[rowIndex + 1].focus();
            rows[rowIndex + 1].scrollIntoView({ block: 'nearest' });
          } else {
            // Tope inferior en la última fila
            rows[rows.length - 1].focus();
          }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          e.stopPropagation();
          if (rowIndex > 0) {
            rows[rowIndex - 1].focus();
            rows[rowIndex - 1].scrollIntoView({ block: 'nearest' });
          } else {
            // Fila 0: Subir al buscador y seleccionar texto
            searchInputRef.current?.focus();
            searchInputRef.current?.select();
            searchInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        } else if (e.key === 'ArrowRight') {
          // Navegación horizontal hacia los botones de acción (Editar, Eliminar)
          const buttons = Array.from(currentRow.querySelectorAll('button:not([disabled])')) as HTMLElement[];
          if (buttons.length > 0) {
            const btnIndex = buttons.indexOf(active as HTMLElement);
            if (btnIndex === -1) {
              e.preventDefault();
              e.stopPropagation();
              buttons[0].focus();
            } else if (btnIndex < buttons.length - 1) {
              e.preventDefault();
              e.stopPropagation();
              buttons[btnIndex + 1].focus();
            }
          }
        } else if (e.key === 'ArrowLeft') {
          const buttons = Array.from(currentRow.querySelectorAll('button:not([disabled])')) as HTMLElement[];
          const btnIndex = buttons.indexOf(active as HTMLElement);
          if (btnIndex > 0) {
            e.preventDefault();
            e.stopPropagation();
            buttons[btnIndex - 1].focus();
          } else if (btnIndex === 0) {
            e.preventDefault();
            e.stopPropagation();
            currentRow.focus();
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }
      } else {
        // Rescate si el foco se perdió en un contenedor vacío
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          focusPrimerRegistro();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalAbierto, usuariosFiltrados]);

  return (
    <div className="bg-white border border-[var(--color-border)] shadow-sm flex flex-col font-mono">
      {/* CABECERA Y FILTROS */}
      <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-bg)] flex flex-wrap gap-4 justify-between items-center shrink-0">
        <div>
          <h2 className="text-[var(--color-ink)] font-bold uppercase text-sm flex items-center gap-2">
            <Users size={18} className="text-[var(--color-accent)]" />
            Cuentas de Empleados
          </h2>
          <p className="text-[var(--color-muted)] font-mono text-xs mt-1">
            Controla quién puede acceder al sistema y qué acciones pueden realizar.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 items-center w-full sm:w-auto">
          {/* Buscador de usuarios */}
          <div className="flex bg-white border border-[var(--color-border)] rounded-none focus-within:border-[var(--color-accent)] flex-1 sm:w-60 transition-all">
            <div className="p-2 flex items-center justify-center text-[var(--color-muted)] bg-[var(--color-bg-2)] border-r border-[var(--color-border)]">
              <Search size={15} />
            </div>
            <input
              id="buscador-usuarios-ajustes"
              ref={searchInputRef}
              type="text"
              placeholder="BUSCAR EMPLEADO..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  e.stopPropagation();
                  focusPrimerRegistro();
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  e.stopPropagation();
                  document.getElementById('btn-tab-usuarios')?.focus();
                } else if (e.key === 'ArrowRight') {
                  const input = e.currentTarget;
                  if (input.selectionStart === input.value.length) {
                    e.preventDefault();
                    e.stopPropagation();
                    document.getElementById('filtro-rol-usuarios-ajustes')?.focus();
                  }
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setBusqueda('');
                }
              }}
              className="w-full text-xs font-bold text-[var(--color-ink)] outline-none p-2 bg-transparent uppercase placeholder:text-[var(--color-subtle)] focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </div>

          {/* Filtro por Rol */}
          <select
            id="filtro-rol-usuarios-ajustes"
            value={filtroRol}
            onChange={(e) => setFiltroRol(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('btn-tab-usuarios')?.focus();
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                focusPrimerRegistro();
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                e.stopPropagation();
                searchInputRef.current?.focus();
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('btn-nuevo-usuario-ajustes')?.focus();
              }
            }}
            className="bg-white text-xs font-bold text-[var(--color-ink)] outline-none p-2 border border-[var(--color-border)] rounded-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)] cursor-pointer uppercase"
          >
            <option value="TODOS">ROL: TODOS</option>
            {rolesUnicos.map(rol => (
              <option key={rol} value={rol}>{rol}</option>
            ))}
          </select>

          {/* Botón Nuevo Usuario */}
          <button
            id="btn-nuevo-usuario-ajustes"
            onClick={handleNuevoUsuario}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                focusPrimerRegistro();
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('filtro-rol-usuarios-ajustes')?.focus();
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('btn-tab-usuarios')?.focus();
              }
            }}
            className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] text-white px-4 py-2 font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-2 cursor-pointer rounded-none"
          >
            <Plus size={16} />
            Nuevo Usuario
          </button>
        </div>
      </div>

      {/* TABLA */}
      <div className="overflow-x-auto min-h-[200px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 gap-4">
            <div className="w-8 h-8 border-4 border-[var(--color-border)] border-t-[var(--color-ink)] animate-spin rounded-full"></div>
            <span className="text-[12px] font-black text-[var(--color-ink)] uppercase tracking-widest font-mono">Cargando...</span>
          </div>
        ) : usuariosFiltrados.length === 0 ? (
          <div className="flex justify-center items-center h-full p-8 text-[var(--color-muted)] font-mono text-xs uppercase font-bold">
            {usuarios.length === 0 ? 'No hay empleados registrados todavía.' : 'No se encontraron empleados con los filtros aplicados.'}
          </div>
        ) : (
          <table id="tabla-usuarios-ajustes" className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--color-bg-2)] border-b border-[var(--color-border)] text-xs uppercase tracking-wider text-[var(--color-muted)] font-bold">
                <th className="p-4">Nombre / Email</th>
                <th className="p-4">Rol Asignado</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.map((usuario) => (
                <tr
                  key={usuario.id}
                  data-row="true"
                  data-user-id={usuario.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleEditar(usuario)}
                  onKeyDown={(e) => {
                    if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      handleEditar(usuario);
                    }
                  }}
                  className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg)] focus:bg-amber-50/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-ink)] transition-colors cursor-pointer group"
                  title="Enter o Clic para editar este usuario"
                >
                  <td className="p-4">
                    <div className="font-bold text-sm text-[var(--color-ink)]">{usuario.nombre}</div>
                    <div className="text-xs text-[var(--color-muted)] font-mono">{usuario.email}</div>
                  </td>
                  <td className="p-4">
                    <span className="bg-[var(--color-border)] text-[#475569] text-[12px] px-2 py-1 font-bold uppercase tracking-wider rounded-sm flex w-fit items-center gap-1">
                      {usuario.rol === 'Administrador' && <ShieldAlert size={12} className="text-red-500" />}
                      {usuario.rol}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`text-[12px] px-2 py-1 font-bold uppercase tracking-wider rounded-sm ${
                      usuario.estado === 'ACTIVO' ? 'bg-[var(--color-accent-bg-2)] text-[var(--color-accent-dark)]' : 'bg-[#FEE2E2] text-[var(--color-danger-dark)]'
                    }`}>
                      {usuario.estado}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        id={`btn-editar-usuario-${usuario.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditar(usuario);
                        }}
                        className="p-2 text-[var(--color-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-colors rounded cursor-pointer"
                        title="Editar Usuario"
                      >
                        <Edit2 size={16} />
                      </button>
                      {usuario.id !== yo?.id && (
                        <button
                          id={`btn-eliminar-usuario-${usuario.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEliminar(usuario);
                          }}
                          className="p-2 text-[var(--color-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 focus:outline-none focus:ring-2 focus:ring-[var(--color-danger)] transition-colors rounded cursor-pointer"
                          title="Eliminar Usuario"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL */}
      {modalAbierto && (
        <ModalUsuario 
          usuario={usuarioEditando} 
          onClose={handleCerrarModal} 
        />
      )}
    </div>
  );
};
