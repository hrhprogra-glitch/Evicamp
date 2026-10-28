import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, UserPlus, Users, X, UserCheck } from 'lucide-react';
import type { Cliente } from '../types';
import { supabase } from '../../../db/supabase';
import { traerTodo } from '../../../utils/traerTodo';
import { coincideBusqueda } from '../../../utils/busqueda';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { ModalFichaCliente, type DatosCliente } from '../../Clientes/components/ModalFichaCliente';

interface Props {
  isOpen: boolean;
  clienteActual: Cliente | null;
  onSelectCliente: (cliente: Cliente | null) => void;
  onClose: () => void;
}

export const ModalElegirClientePOS: React.FC<Props> = ({
  isOpen,
  clienteActual,
  onSelectCliente,
  onClose
}) => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search, setSearch] = useState('');
  const [creandoCliente, setCreandoCliente] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const ultimoEnfoqueRef = useRef<HTMLElement | null>(null);

  useCerrarConEscape(isOpen && !creandoCliente, onClose);

  // Cargar clientes al abrir
  useEffect(() => {
    if (!isOpen) return;
    setSearch('');
    setSelectedIndex(-1);
    setCreandoCliente(false);

    const cargar = async () => {
      const { data } = await traerTodo(() => supabase.from('customers').select('*').order('name'));
      if (data) {
        setClientes(data.map((c: any) => ({
          id: String(c.id),
          nombre: c.name || c.nombre || '',
          dni: c.dni || '',
          ruc: c.ruc || '',
          telefono: c.telefono || '',
          direccion: c.direccion || '',
          ubicacion: c.ubicacion || '',
          referencia: c.referencia || '',
          grupoId: c.grupo_id ? String(c.grupo_id) : undefined
        })));
      }
    };
    cargar();

    const t = setTimeout(() => {
      document.getElementById('buscar-cliente-pos')?.focus();
    }, 40);
    return () => clearTimeout(t);
  }, [isOpen]);

  // Filtrado reactivo en memoria
  const filtrados = useMemo(() => {
    const q = search.trim();
    if (!q) return clientes.slice(0, 80);
    return clientes.filter(c => coincideBusqueda([c.nombre, c.dni, c.ruc, c.telefono, c.referencia], q)).slice(0, 80);
  }, [clientes, search]);

  // Focus trap y atajos de teclado globales del modal
  useEffect(() => {
    if (!isOpen || creandoCliente) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus Trap para Tab
      if (e.key === 'Tab') {
        e.stopPropagation();
        const allFocusables = Array.from(document.querySelectorAll('input:not([type="file"]), button:not([disabled]), [data-fila-cliente="true"]')) as HTMLElement[];
        const modalFocusables = allFocusables.filter(el =>
          el.closest('#modal-elegir-cliente-pos') &&
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
        return;
      }

      // F2: Crear cliente nuevo rápido
      if (e.key === 'F2') {
        e.preventDefault();
        ultimoEnfoqueRef.current = (document.activeElement as HTMLElement) || document.getElementById('btn-cliente-pos-nuevo');
        setCreandoCliente(true);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen, creandoCliente]);

  if (!isOpen) return null;

  const handleGuardarNuevo = async (d: DatosCliente): Promise<boolean> => {
    try {
      const fila = {
        name: d.nombre.toUpperCase(),
        dni: d.dni || null,
        ruc: d.ruc || null,
        tipo_doc: d.dni ? 'DNI' : null,
        telefono: d.telefono || null,
        direccion: d.direccion || null,
        ubicacion: d.ubicacion || null,
        referencia: d.referencia || null,
        created_at: new Date().toISOString(),
        is_synced: 1
      };

      const { data, error } = await supabase.from('customers').insert([fila]).select().single();
      if (error) {
        alert('Error al crear cliente: ' + error.message);
        return false;
      }

      const nuevo: Cliente = {
        id: String(data.id),
        nombre: d.nombre.toUpperCase(),
        dni: d.dni,
        ruc: d.ruc,
        telefono: d.telefono,
        direccion: d.direccion,
        ubicacion: d.ubicacion,
        referencia: d.referencia
      };

      setClientes(prev => [nuevo, ...prev]);
      onSelectCliente(nuevo);
      setCreandoCliente(false);
      onClose();
      return true;
    } catch (err: any) {
      alert('Fallo inesperado al guardar: ' + err.message);
      return false;
    }
  };

  const getFilasClientes = () =>
    Array.from(document.querySelectorAll<HTMLElement>('[data-fila-cliente="true"]'));

  return (
    <div
      id="modal-elegir-cliente-pos"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 font-mono"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Seleccionar cliente para la venta"
        className="w-full max-w-xl bg-[var(--color-surface,#fff)] border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] flex flex-col max-h-[85vh] overflow-hidden"
      >
        {/* Cabecera */}
        <div className="bg-[var(--color-ink)] text-white px-4 py-3 flex items-center justify-between shrink-0 border-b-2 border-[var(--color-ink)]">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-[var(--color-accent)]" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider">Cliente de la Venta</h2>
              <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                F2 nuevo · Enter elige · Esc salir
              </p>
            </div>
          </div>
          <button
            id="btn-cerrar-cliente-pos"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center hover:bg-[var(--color-danger)] text-white transition-colors cursor-pointer"
            title="Cerrar (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Buscador y Acciones Rápidas */}
        <div className="p-3 bg-[var(--color-bg)] border-b-2 border-[var(--color-border)] flex flex-col gap-2 shrink-0">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-subtle)]" />
            <input
              id="buscar-cliente-pos"
              type="text"
              autoComplete="off"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown' || e.key === 'Enter') {
                  e.preventDefault();
                  if (search.trim() !== '') {
                    const primerCliente = document.querySelector<HTMLElement>('[data-fila-cliente="true"]');
                    if (primerCliente) primerCliente.focus();
                    else document.getElementById('btn-cliente-pos-nuevo')?.focus();
                  } else {
                    document.getElementById('btn-cliente-pos-varios')?.focus();
                  }
                }
              }}
              placeholder="BUSCAR POR NOMBRE, DNI, RUC O TELÉFONO..."
              className="w-full bg-white border-2 border-[var(--color-border)] pl-9 pr-3 py-2 text-xs font-black uppercase outline-none focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)] transition-colors"
            />
          </div>

          <div className="flex gap-2">
            <button
              id="btn-cliente-pos-varios"
              type="button"
              onClick={() => {
                onSelectCliente(null);
                onClose();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onSelectCliente(null);
                  onClose();
                } else if (e.key === 'ArrowRight') {
                  e.preventDefault();
                  document.getElementById('btn-cliente-pos-nuevo')?.focus();
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  document.getElementById('buscar-cliente-pos')?.focus();
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  const filas = getFilasClientes();
                  if (filas[0]) filas[0].focus();
                }
              }}
              className={`flex-1 py-2 px-3 border-2 font-black text-xs uppercase flex items-center justify-center gap-2 transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-[var(--color-ink)] ${
                !clienteActual
                  ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]'
                  : 'bg-white border-[var(--color-border)] hover:border-[var(--color-ink)] text-[var(--color-ink)]'
              }`}
            >
              <Users size={14} /> Cliente Varios (Sin Cuenta)
            </button>

            <button
              id="btn-cliente-pos-nuevo"
              type="button"
              onClick={() => {
                ultimoEnfoqueRef.current = document.getElementById('btn-cliente-pos-nuevo');
                setCreandoCliente(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  ultimoEnfoqueRef.current = document.getElementById('btn-cliente-pos-nuevo');
                  setCreandoCliente(true);
                } else if (e.key === 'ArrowLeft') {
                  e.preventDefault();
                  document.getElementById('btn-cliente-pos-varios')?.focus();
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  document.getElementById('buscar-cliente-pos')?.focus();
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  const filas = getFilasClientes();
                  if (filas[0]) filas[0].focus();
                }
              }}
              className="py-2 px-4 border-2 border-[var(--color-ink)] bg-[var(--color-accent)] text-[var(--color-ink)] font-black text-xs uppercase flex items-center justify-center gap-1.5 hover:bg-[var(--color-ink)] hover:text-white transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-[var(--color-ink)] shrink-0 shadow-[2px_2px_0_0_var(--color-ink)]"
            >
              <UserPlus size={14} /> + Nuevo (F2)
            </button>
          </div>
        </div>

        {/* Lista de clientes */}
        <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-[var(--color-border)] bg-white p-1">
          {filtrados.length === 0 ? (
            <div className="p-8 text-center text-xs font-black text-[var(--color-subtle)] uppercase">
              No se encontraron clientes con "{search}"
              <div className="mt-3">
                <button
                  type="button"
                  id="btn-crear-busqueda-pos"
                  onClick={() => {
                    ultimoEnfoqueRef.current = (document.activeElement as HTMLElement) || document.getElementById('btn-cliente-pos-nuevo');
                    setCreandoCliente(true);
                  }}
                  className="px-4 py-2 border-2 border-[var(--color-ink)] bg-[var(--color-accent)] text-[var(--color-ink)] text-xs font-black uppercase cursor-pointer"
                >
                  + Crear a "{search.toUpperCase()}" ahora
                </button>
              </div>
            </div>
          ) : (
            filtrados.map((c, i) => {
              const seleccionado = clienteActual?.id === c.id;
              return (
                <div
                  key={c.id}
                  id={`item-cliente-${c.id}`}
                  data-fila-cliente="true"
                  tabIndex={0}
                  onClick={() => {
                    onSelectCliente(c);
                    onClose();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      onSelectCliente(c);
                      onClose();
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      const filas = getFilasClientes();
                      if (filas[i + 1]) filas[i + 1].focus();
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      const filas = getFilasClientes();
                      if (i > 0 && filas[i - 1]) {
                        filas[i - 1].focus();
                      } else {
                        if (search.trim() !== '') {
                          document.getElementById('buscar-cliente-pos')?.focus();
                        } else {
                          document.getElementById('btn-cliente-pos-varios')?.focus();
                        }
                      }
                    }
                  }}
                  className={`p-2.5 flex items-center justify-between gap-3 cursor-pointer outline-none transition-colors border-2 ${
                    seleccionado
                      ? 'bg-[var(--color-accent-bg,#fffde7)] border-[var(--color-accent)]'
                      : 'border-transparent hover:bg-[var(--color-bg)] focus:bg-[var(--color-bg)] focus:border-[var(--color-ink)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 flex items-center justify-center rounded-none font-black text-xs shrink-0 border-2 ${
                        seleccionado
                          ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]'
                          : 'bg-[var(--color-bg)] text-[var(--color-ink)] border-[var(--color-border)]'
                      }`}
                    >
                      {c.nombre.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs uppercase truncate text-[var(--color-ink)]">
                          {c.nombre}
                        </span>
                        {seleccionado && (
                          <span className="text-[10px] bg-[var(--color-ink)] text-white font-black px-1.5 py-0.5 uppercase tracking-widest shrink-0">
                            Actual
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-bold text-[var(--color-muted)]">
                        {c.dni && <span>DNI: {c.dni}</span>}
                        {c.ruc && <span>RUC: {c.ruc}</span>}
                        {c.telefono && <span>TEL: {c.telefono}</span>}
                        {c.referencia && <span className="truncate italic">({c.referencia})</span>}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <span className="text-[10px] font-black uppercase text-[var(--color-subtle)] border border-[var(--color-border)] px-2 py-1 bg-white">
                      Enter elige
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer informativo */}
        <div className="p-2.5 bg-[var(--color-bg)] border-t-2 border-[var(--color-border)] flex items-center justify-between text-[11px] font-black uppercase text-[var(--color-muted)] shrink-0">
          <span>{filtrados.length} clientes encontrados</span>
          <span>{clienteActual ? `Actual: ${clienteActual.nombre}` : 'Sin cliente (Cliente Varios)'}</span>
        </div>
      </div>

      {/* Modal para crear cliente si presionó F2 o "+ Nuevo" */}
      {creandoCliente && (
        <ModalFichaCliente
          abierta={creandoCliente}
          cliente={null}
          clientes={clientes}
          onGuardar={handleGuardarNuevo}
          onClose={() => {
            setCreandoCliente(false);
            setTimeout(() => {
              const btn = document.getElementById('btn-cliente-pos-nuevo') || document.getElementById('buscar-cliente-pos');
              btn?.focus();
            }, 50);
          }}
        />
      )}
    </div>
  );
};
