import React, { useState, useEffect, useRef } from 'react';
import { Users, Plus, Edit2, ShieldAlert, Trash2, Search, X } from 'lucide-react';
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
    <div className="flex flex-col gap-4 sm:gap-6 font-mono">
      {/* BUSCADOR Y FILTROS FUERA DEL MARCO DE LA TABLA (COMO INVENTARIO, CLIENTES Y UTILIDADES) */}
      <div className="flex flex-col xl:flex-row gap-3 sm:gap-4 shrink-0 items-stretch xl:items-center justify-between">
        <div className="buscador-sobrio w-full xl:flex-1 shrink-0">
          <div className="buscador-sobrio__icono"><Search size={18} /></div>
          <input
            id="buscador-usuarios-ajustes"
            ref={searchInputRef}
            type="text"
            placeholder="BUSCAR EMPLEADO POR NOMBRE O EMAIL..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                setBusqueda('');
                return;
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('btn-tab-usuarios')?.focus();
                return;
              }
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                focusPrimerRegistro();
                return;
              }
              if (e.key === 'ArrowRight' && e.currentTarget.selectionStart === e.currentTarget.value.length) {
                e.preventDefault();
                e.stopPropagation();
                if (busqueda) {
                  document.getElementById('btn-borrar-buscador-usuarios-ajustes')?.focus();
                } else {
                  document.getElementById('filtro-rol-usuarios-ajustes')?.focus();
                }
              }
            }}
            style={{ paddingRight: busqueda ? '8rem' : undefined }}
          />
          {busqueda && (
            <div className="buscador-sobrio__match">
              <span className="buscador-sobrio__conteo">{usuariosFiltrados.length} MATCH</span>
              <button
                id="btn-borrar-buscador-usuarios-ajustes"
                type="button"
                title="Borrar búsqueda"
                className="buscador-sobrio__borrar"
                onClick={() => { setBusqueda(''); searchInputRef.current?.focus(); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    setBusqueda('');
                    searchInputRef.current?.focus();
                  } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    e.stopPropagation();
                    const inp = searchInputRef.current;
                    if (inp) {
                      inp.focus();
                      inp.setSelectionRange(inp.value.length, inp.value.length);
                    }
                  } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    e.stopPropagation();
                    document.getElementById('filtro-rol-usuarios-ajustes')?.focus();
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    e.stopPropagation();
                    focusPrimerRegistro();
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    e.stopPropagation();
                    document.getElementById('btn-tab-usuarios')?.focus();
                  }
                }}
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full xl:w-auto">
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
                if (busqueda) {
                  document.getElementById('btn-borrar-buscador-usuarios-ajustes')?.focus();
                } else {
                  searchInputRef.current?.focus();
                }
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('btn-nuevo-usuario-ajustes')?.focus();
              }
            }}
            className="filtro-sobrio w-full sm:w-auto"
          >
            <option value="TODOS">ROL: TODOS</option>
            {rolesUnicos.map(rol => (
              <option key={rol} value={rol}>{rol}</option>
            ))}
          </select>

          {/* Botón Nuevo Usuario */}
          <button
            id="btn-nuevo-usuario-ajustes"
            type="button"
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
            style={{ '--icono': 'var(--color-accent-shadow)' } as React.CSSProperties}
            className="boton-cabecera flex-1 sm:flex-none justify-center bg-[var(--color-surface)] text-[var(--color-ink)] px-4 sm:px-6 py-3 border border-[var(--color-border)] font-black text-xs uppercase tracking-widest sm:tracking-[0.2em] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] transition-all cursor-pointer flex items-center gap-2"
          >
            <Plus size={16} />
            Nuevo Usuario
          </button>
        </div>
      </div>

      {/* MARCO DE LA TABLA */}
      <div className="tabla-marco overflow-x-auto min-h-[200px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 gap-4">
            <div className="w-8 h-8 border-4 border-[var(--color-border)] border-t-[var(--color-ink)] animate-spin rounded-full"></div>
            <span className="text-[12px] font-black text-[var(--color-ink)] uppercase tracking-widest font-mono">Cargando...</span>
          </div>
        ) : usuariosFiltrados.length === 0 ? (
          <div className="vacio-sobrio">
            <Search size={32} />
            {usuarios.length === 0 ? 'No hay empleados registrados todavía.' : 'No se encontraron empleados con los filtros aplicados.'}
          </div>
        ) : (
          <table id="tabla-usuarios-ajustes" className="w-full text-left border-collapse">
            <thead className="tabla-cabecera sticky top-0 z-10">
              <tr>
                <th className="p-4">Nombre / Email</th>
                <th className="p-4">Rol Asignado</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-[var(--color-surface)]">
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
                  className="tabla-fila cursor-pointer group"
                  title="Enter o Clic para editar este usuario"
                >
                  <td className="p-4">
                    <div className="font-bold text-sm text-[var(--color-ink)]">{usuario.nombre}</div>
                    <div className="text-xs text-[var(--color-muted)] font-mono">{usuario.email}</div>
                  </td>
                  <td className="p-4">
                    <span className="bg-[var(--color-bg-2)] border border-[var(--color-border)] text-[var(--color-ink)] text-[12px] px-2.5 py-1 font-black uppercase tracking-wider rounded-none flex w-fit items-center gap-1.5">
                      {usuario.rol === 'Administrador' && <ShieldAlert size={14} className="text-red-500 shrink-0" />}
                      {usuario.rol}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`text-[12px] px-2.5 py-1 font-black uppercase tracking-wider rounded-none border ${
                      usuario.estado === 'ACTIVO' 
                        ? 'bg-[var(--color-accent-bg)] border-[var(--color-accent)] text-[var(--color-accent)]' 
                        : 'bg-[var(--color-danger-bg)] border-[var(--color-danger)] text-[var(--color-danger)]'
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
