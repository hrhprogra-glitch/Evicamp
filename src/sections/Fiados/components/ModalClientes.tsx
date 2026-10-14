import React, { useState, useEffect, useLayoutEffect } from 'react';
import { X, Users, Search, Plus, UserCircle, Save, Edit, Trash2, ArrowLeft, ChevronLeft, ChevronRight, Filter, FilterX } from 'lucide-react';
import type { Cliente, Fiado } from '../types';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { clicConTeclado } from '../../../utils/clicConTeclado';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  clientes: Cliente[];
  onSaveCliente: (cliente: Omit<Cliente, 'id'>) => void;
  onEditCliente: (cliente: Cliente) => void;
  onDeleteCliente: (id: string) => void;
  fiados: Fiado[];
    forceHistorialCliente?: string | null;
    onClearForce?: () => void;
}

export const ModalClientes: React.FC<Props> = ({ isOpen, onClose, clientes, onSaveCliente, onEditCliente, onDeleteCliente, fiados, forceHistorialCliente, onClearForce }) => {
  useCerrarConEscape(isOpen, onClose);
 // Escape (o "Atrás" del control de TV) cierra la ventana
  const [view, setView] = useState<'LISTA' | 'NUEVO' | 'HISTORIAL'>('LISTA');
  const [clienteActivo, setClienteActivo] = useState<Cliente | null>(null);
  const [clienteAEditar, setClienteAEditar] = useState<Cliente | null>(null);
  
  // Estados Formulario
  const [nombre, setNombre] = useState('');
  const [dni, setDni] = useState('');
  const [telefono, setTelefono] = useState('');
  useLayoutEffect(() => {
    if (isOpen) {
      if (forceHistorialCliente && clientes.length > 0) {
        const cli = clientes.find(c => c.nombre === forceHistorialCliente);
        if (cli) {
          setClienteActivo(cli);
          setView('HISTORIAL');
          setHistorialTab('PENDIENTES');
          if (onClearForce) onClearForce();
        }
      }
    } else {
      setView('LISTA');
      setClienteActivo(null);
      setClienteAEditar(null);
    }
  }, [isOpen, forceHistorialCliente, clientes]);




  // Estados Filtros y Búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroDeuda, setFiltroDeuda] = useState<'TODOS' | 'CON_DEUDA' | 'SIN_DEUDA'>('TODOS');
  const [ordenAlfabetico, setOrdenAlfabetico] = useState<'A-Z' | 'Z-A'>('A-Z');
  
  // Estados Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [historialSearchProd, setHistorialSearchProd] = useState('');
  const [historialSearchDate, setHistorialSearchDate] = useState('');
  const [expandedHistorialIds, setExpandedHistorialIds] = useState<Set<string>>(new Set());
  const [historialTab, setHistorialTab] = useState<'PENDIENTES' | 'PAGADAS'>('PENDIENTES');

  const toggleHistorial = (id: string) => {
    setExpandedHistorialIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const ITEMS_PER_PAGE = 50;

  const limpiarFiltros = () => {
    setSearchTerm('');
    setFiltroDeuda('TODOS');
    setOrdenAlfabetico('A-Z');
    setCurrentPage(1);
  };

  const limpiarFiltrosHistorial = () => {
    setHistorialSearchProd('');
    setHistorialSearchDate('');
    // El botón desaparece al limpiar: devolver el foco al selector de fecha
    setTimeout(() => document.getElementById('fecha-historial-clientes')?.focus(), 50);
  };

  // Resetear la página si cambian los filtros
  useEffect(() => {
      setCurrentPage(1);
    }, [searchTerm, filtroDeuda, ordenAlfabetico, clientes.length]);

    useEffect(() => {
      const handleAbrirHistorial = (e: any) => {
        const nombreCli = e.detail;
        const cli = clientes.find(c => c.nombre === nombreCli);
        if (cli) {
          setClienteActivo(cli);
          setView('HISTORIAL');
        }
      };
      window.addEventListener('abrirHistorialDirecto', handleAbrirHistorial);
      return () => window.removeEventListener('abrirHistorialDirecto', handleAbrirHistorial);
    }, [clientes]);

  // 🔥 AUTO-FOCUS MAGNET PARA EL MODAL DE CLIENTES
  useEffect(() => {
    if (!isOpen) return;

    const enforceFocus = () => {
      const active = document.activeElement;
      const activeTag = active?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'BUTTON' || activeTag === 'SELECT' || activeTag === 'A' || active?.closest('div[role="button"]')) return;

      if (view === 'LISTA') {
        const searchInput = document.getElementById('buscador-modal-clientes') as HTMLInputElement;
        if (searchInput) searchInput.focus();
      } else if (view === 'NUEVO') {
        const nameInput = document.getElementById('input-nombre-cliente');
        if (nameInput) nameInput.focus();
      } else if (view === 'HISTORIAL') {
        const btnVolver = document.getElementById('btn-volver-directorio');
        if (btnVolver) btnVolver.focus();
      }
    };

    const handleGlobalClick = () => setTimeout(enforceFocus, 50);
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement;
      const activeTag = active?.tagName;
      const searchInput = document.getElementById("buscador-modal-clientes") as HTMLInputElement;

      // ================= FOCUS TRAP PARA TAB =================
      if (e.key === 'Tab') {
        e.stopPropagation(); 
        const allFocusables = Array.from(document.querySelectorAll('input:not([type="file"]), select, button:not([disabled])')) as HTMLElement[];
        const modalFocusables = allFocusables.filter(el => 
          el.closest('.fixed.inset-0.z-50') && 
          el.tabIndex !== -1 && 
          !el.classList.contains('hidden') &&
          el.offsetParent !== null
        );
        if (modalFocusables.length > 0) {
          const first = modalFocusables[0];
          const last = modalFocusables[modalFocusables.length - 1];
          if (e.shiftKey && active === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && active === last) {
            e.preventDefault();
            first.focus();
          }
        }
        return;
      }
      // =======================================================

      // Escape para volver de HISTORIAL o NUEVO hacia LISTA
      if (e.key === 'Escape') {
        if (view === 'HISTORIAL' || view === 'NUEVO') {
          e.preventDefault();
          e.stopPropagation();
          setView('LISTA');
          setTimeout(() => {
            document.getElementById('buscador-modal-clientes')?.focus();
          }, 50);
          return;
        }
      }

      // NAVEGACIÓN CON FLECHAS, ENTER Y ESPACIO
      if (["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft", "Enter", " "].includes(e.key)) {
        
        // Flecha Arriba en controles superiores va a la "X" (Cerrar)
        if (e.key === "ArrowUp" && (
          active === searchInput || 
          active?.id === "btn-limpiar-filtros-clientes" || 
          active?.id === "btn-nuevo-cliente" || 
          active?.id === "btn-volver-directorio" || 
          active?.id === "btn-ver-estado-cuenta-historial" || 
          active?.id === "tab-historial-pendientes" || 
          active?.id === "tab-historial-pagadas" || 
          active?.id === "input-nombre-cliente"
        )) {
          e.preventDefault();
          document.getElementById("btn-cerrar-modal-clientes")?.focus();
          return;
        }

        // Flecha Abajo desde "X" regresa a los controles
        if (active?.id === "btn-cerrar-modal-clientes" && e.key === "ArrowDown") {
          e.preventDefault();
          if (view === "HISTORIAL") {
            document.getElementById("btn-volver-directorio")?.focus();
          } else if (document.getElementById("buscador-modal-clientes")) {
            document.getElementById("buscador-modal-clientes")?.focus();
          } else if (document.getElementById("input-nombre-cliente")) {
            document.getElementById("input-nombre-cliente")?.focus();
          }
          return;
        }
        
        if (active === searchInput) {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            const firstRow = document.querySelector('div[role="button"]') as HTMLElement;
            if (firstRow) firstRow.focus();
            return;
          }
          if (e.key === "ArrowRight") {
            const cursorStart = (searchInput as HTMLInputElement).selectionStart;
            const valLen = (searchInput as HTMLInputElement).value.length;
            if (cursorStart === valLen) {
              e.preventDefault();
              document.getElementById("filtro-deuda-clientes")?.focus();
              return;
            }
          }
        } else if (active?.id === "filtro-deuda-clientes") {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            document.getElementById("orden-alfabetico-clientes")?.focus();
            return;
          }
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            searchInput?.focus();
            return;
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            document.getElementById("btn-cerrar-modal-clientes")?.focus();
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            const firstRow = document.querySelector('div[role="button"]') as HTMLElement;
            if (firstRow) firstRow.focus();
            return;
          }
        } else if (active?.id === "orden-alfabetico-clientes") {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            const btnLimpiar = document.getElementById("btn-limpiar-filtros-clientes");
            if (btnLimpiar) {
              btnLimpiar.focus();
            } else {
              document.getElementById("btn-nuevo-cliente")?.focus();
            }
            return;
          }
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            document.getElementById("filtro-deuda-clientes")?.focus();
            return;
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            document.getElementById("btn-cerrar-modal-clientes")?.focus();
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            const firstRow = document.querySelector('div[role="button"]') as HTMLElement;
            if (firstRow) firstRow.focus();
            return;
          }
        } else if (active?.id === "btn-limpiar-filtros-clientes") {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            document.getElementById("btn-nuevo-cliente")?.focus();
            return;
          }
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            document.getElementById("orden-alfabetico-clientes")?.focus();
            return;
          }
        } else if (active?.id === "btn-nuevo-cliente") {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            const btnLimpiar = document.getElementById("btn-limpiar-filtros-clientes");
            if (btnLimpiar) {
              btnLimpiar.focus();
            } else {
              document.getElementById("orden-alfabetico-clientes")?.focus();
            }
            return;
          }
        } else if (active?.id === "input-nombre-cliente") {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            document.getElementById("input-dni-cliente")?.focus();
            return;
          }
        } else if (active?.id === "input-dni-cliente") {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            document.getElementById("input-telefono-cliente")?.focus();
            return;
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            document.getElementById("input-nombre-cliente")?.focus();
            return;
          }
        } else if (active?.id === "input-telefono-cliente") {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            document.getElementById("btn-guardar-cliente")?.focus();
            return;
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            document.getElementById("input-dni-cliente")?.focus();
            return;
          }
        } else if (active?.id === "btn-guardar-cliente") {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            document.getElementById("btn-cancelar-cliente")?.focus();
            return;
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            document.getElementById("input-telefono-cliente")?.focus();
            return;
          }
        } else if (active?.id === "btn-cancelar-cliente") {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            document.getElementById("btn-guardar-cliente")?.focus();
            return;
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            document.getElementById("input-telefono-cliente")?.focus();
            return;
          }
        } else if (active?.id === "btn-volver-directorio") {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            (document.getElementById("btn-ver-estado-cuenta-historial") || document.getElementById("tab-historial-pendientes"))?.focus();
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            document.getElementById("buscador-historial-clientes")?.focus();
            return;
          }
        } else if (active?.id === "btn-ver-estado-cuenta-historial") {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            document.getElementById("btn-volver-directorio")?.focus();
            return;
          }
          if (e.key === "ArrowRight") {
            e.preventDefault();
            document.getElementById("tab-historial-pendientes")?.focus();
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            document.getElementById("buscador-historial-clientes")?.focus();
            return;
          }
        } else if (active?.id === "tab-historial-pendientes") {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setHistorialTab('PENDIENTES');
            return;
          }
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            (document.getElementById("btn-ver-estado-cuenta-historial") || document.getElementById("btn-volver-directorio"))?.focus();
            return;
          }
          if (e.key === "ArrowRight") {
            e.preventDefault();
            document.getElementById("tab-historial-pagadas")?.focus();
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            document.getElementById("buscador-historial-clientes")?.focus();
            return;
          }
        } else if (active?.id === "tab-historial-pagadas") {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setHistorialTab('PAGADAS');
            return;
          }
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            document.getElementById("tab-historial-pendientes")?.focus();
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            document.getElementById("fecha-historial-clientes")?.focus();
            return;
          }
        } else if (active?.id === "buscador-historial-clientes") {
          if (e.key === "ArrowUp") {
            e.preventDefault();
            document.getElementById("tab-historial-pendientes")?.focus();
            return;
          }
          if (e.key === "ArrowRight") {
            const cursorStart = (active as HTMLInputElement).selectionStart;
            const valLen = (active as HTMLInputElement).value.length;
            if (cursorStart === valLen) {
              e.preventDefault();
              document.getElementById("fecha-historial-clientes")?.focus();
              return;
            }
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            const firstCard = document.querySelector('div[role="button"][data-id]') as HTMLElement;
            if (firstCard) firstCard.focus();
            return;
          }
        } else if (active?.id === "fecha-historial-clientes") {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            try {
              (active as HTMLInputElement).showPicker();
            } catch (err) {}
            return;
          }
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            document.getElementById("buscador-historial-clientes")?.focus();
            return;
          }
          if (e.key === "ArrowRight") {
            const btnLimpiar = document.getElementById("btn-limpiar-filtros-historial");
            if (btnLimpiar) {
              e.preventDefault();
              btnLimpiar.focus();
              return;
            }
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            document.getElementById("tab-historial-pagadas")?.focus();
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            const firstCard = document.querySelector('div[role="button"][data-id]') as HTMLElement;
            if (firstCard) firstCard.focus();
            return;
          }
        } else if (active?.id === "btn-limpiar-filtros-historial") {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            limpiarFiltrosHistorial();
            return;
          }
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            document.getElementById("fecha-historial-clientes")?.focus();
            return;
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            document.getElementById("tab-historial-pagadas")?.focus();
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            const firstCard = document.querySelector('div[role="button"][data-id]') as HTMLElement;
            if (firstCard) firstCard.focus();
            return;
          }
        }

        if (active?.closest('div[role="button"]')) {
          const currentRow = active.closest('div[role="button"]') as HTMLElement;
          const rows = Array.from(document.querySelectorAll('div[role="button"]')) as HTMLElement[];
          const rowIndex = rows.indexOf(currentRow);
          
          if (e.key === "Enter" || e.key === " ") {
            if (view === 'HISTORIAL') {
              if (currentRow.dataset && currentRow.dataset.id) {
                e.preventDefault();
                e.stopPropagation();
                toggleHistorial(currentRow.dataset.id);
                return;
              }
            } else if (view === 'LISTA') {
              e.preventDefault();
              currentRow.click();
              return;
            }
          }

          if (e.key === "ArrowDown") {
            e.preventDefault();
            const nextRow = rows[rowIndex + 1];
            if (nextRow) nextRow.focus();
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            const prevRow = rows[rowIndex - 1];
            if (prevRow) {
              prevRow.focus();
            } else {
              if (view === 'HISTORIAL') {
                const bSearch = document.getElementById("buscador-historial-clientes");
                if (bSearch) bSearch.focus();
                else document.getElementById("btn-volver-directorio")?.focus();
              } else {
                const bSearch = document.getElementById("buscador-modal-clientes");
                if (bSearch) bSearch.focus();
              }
            }
          } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            const focusables = [currentRow, ...Array.from(currentRow.querySelectorAll("button:not([disabled])"))] as HTMLElement[];
            if (focusables.length > 1) {
              const focusIndex = focusables.indexOf(active);
              if (e.key === "ArrowRight") {
                const next = focusables[focusIndex + 1];
                if (next) next.focus();
              } else if (e.key === "ArrowLeft") {
                const prev = focusables[focusIndex - 1];
                if (prev) prev.focus();
              }
            }
          }
          return;
        }
      }

      const isInput = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'BUTTON' || activeTag === 'SELECT' || activeTag === 'A' || active?.closest('div[role="button"]');
      if (isInput) return;
      if (e.key.length > 1 && e.key !== 'Enter' && e.key !== 'Backspace') return;
      
      if (view === "LISTA" && searchInput) searchInput.focus(); else if (view === "HISTORIAL") document.getElementById("btn-volver-directorio")?.focus(); else if (view === "NUEVO") document.getElementById("input-nombre-cliente")?.focus();
    };
    
    setTimeout(() => { const searchInput = document.getElementById("buscador-modal-clientes"); if (view === "LISTA" && searchInput) searchInput.focus(); else if (view === "HISTORIAL") document.getElementById("btn-volver-directorio")?.focus(); else if (view === "NUEVO") document.getElementById("input-nombre-cliente")?.focus(); }, 100);

    document.addEventListener('click', handleGlobalClick);
    window.addEventListener('keydown', handleGlobalKeyDown, { capture: true });

    return () => {
      document.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('keydown', handleGlobalKeyDown, { capture: true });
    };
  }, [isOpen, view]);

  if (!isOpen) return null;

  // --- LÓGICA DE FILTRADO Y PAGINACIÓN ---
  let clientesFiltrados = clientes.filter(c => 
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.dni && c.dni.includes(searchTerm))
  );

  if (filtroDeuda !== 'TODOS') {
    clientesFiltrados = clientesFiltrados.filter(c => {
      const tieneDeuda = fiados.some(f => f.clienteNombre === c.nombre && f.saldoPendiente > 0);
      return filtroDeuda === 'CON_DEUDA' ? tieneDeuda : !tieneDeuda;
    });
  }

  // Orden Alfabetico
  clientesFiltrados.sort((a, b) => {
    if (ordenAlfabetico === 'A-Z') return a.nombre.localeCompare(b.nombre);
    return b.nombre.localeCompare(a.nombre);
  });

  const totalPages = Math.max(1, Math.ceil(clientesFiltrados.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentClientes = clientesFiltrados.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const PaginacionControles = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="flex justify-between items-center py-2 shrink-0 border-y border-[var(--color-border)] my-2">
        <p className="text-[12px] font-black text-[var(--color-muted)] uppercase">
          Mostrando {startIndex + 1} - {Math.min(startIndex + ITEMS_PER_PAGE, clientesFiltrados.length)} de {clientesFiltrados.length}
        </p>
        <div className="flex gap-2">
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 border-2 border-[var(--color-border)] bg-white text-[var(--color-ink)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--color-bg)] cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="flex items-center justify-center px-4 border-2 border-[var(--color-border)] bg-white text-xs font-black">
            Pág {currentPage} / {totalPages}
          </span>
          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 border-2 border-[var(--color-border)] bg-white text-[var(--color-ink)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--color-bg)] cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  };

// --- FUNCIONES DE NAVEGACIÓN ---
  const openNuevo = () => {
    setClienteAEditar(null);
    setNombre(''); setDni(''); setTelefono('');
    setView('NUEVO');
  };

  const openEditar = (cli: Cliente) => {
    setClienteAEditar(cli);
    setNombre(cli.nombre); setDni(cli.dni || ''); setTelefono(cli.telefono || '');
    setView('NUEVO');
  };

  const handleSave = () => {
    const nombreLimpio = nombre.trim().toUpperCase();
    if (nombreLimpio === '') return alert('El nombre es obligatorio');

    // VALIDACIÓN DE DUPLICADOS: Evitar que el nombre o DNI ya existan en la base de datos local
    const isDuplicate = clientes.some(c => {
      // Si estamos editando, ignoramos el cliente actual para que pueda guardar sus propios cambios
      if (clienteAEditar && c.id === clienteAEditar.id) return false;
      
      const mismoNombre = c.nombre.toUpperCase() === nombreLimpio;
      const mismoDni = dni.trim() !== '' && c.dni === dni.trim();
      
      return mismoNombre || mismoDni;
    });

    if (isDuplicate) {
      return alert('⚠️ Error de integridad: Ya existe un cliente registrado con este mismo Nombre o DNI. Por favor, verifica el directorio.');
    }

    if (clienteAEditar) {
      onEditCliente({ ...clienteAEditar, nombre: nombreLimpio, dni, telefono });
    } else {
      onSaveCliente({ nombre: nombreLimpio, dni, telefono });
    }
    
    setNombre(''); setDni(''); setTelefono('');
    setClienteAEditar(null);
    setView('LISTA');
  };

  const fiadosDelCliente = clienteActivo ? fiados.filter(f => f.clienteNombre.trim().toLowerCase() === clienteActivo.nombre.trim().toLowerCase()) : [];
  const clienteTieneDeuda = fiadosDelCliente.some(f => f.estado !== 'PAGADO');

  let fiadosHistorial = fiadosDelCliente
    .filter(f => historialTab === 'PENDIENTES' ? f.estado !== 'PAGADO' : f.estado === 'PAGADO')
    .sort((a, b) => new Date(b.fechaEmision).getTime() - new Date(a.fechaEmision).getTime());
  if (historialSearchDate) {
    fiadosHistorial = fiadosHistorial.filter(f => f.fechaEmision.startsWith(historialSearchDate));
  }
  if (historialSearchProd) {
    const q = historialSearchProd.toLowerCase();
    fiadosHistorial = fiadosHistorial.filter(f => {
      if (f.montoOriginal.toString().includes(q) || f.saldoPendiente.toString().includes(q)) return true;
      if (f.estado.toLowerCase().includes(q)) return true;
      return f.detalles && f.detalles.some(d => d.name.toLowerCase().includes(q) || d.subtotal.toString().includes(q));
    });
  }

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fade-in flex items-center justify-center p-2 sm:p-4 font-mono">
      <div className="bg-[var(--color-surface)] animate-slide-up w-full max-w-6xl border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] flex flex-col h-[calc(var(--alto-pantalla)*0.94)] sm:h-[calc(var(--alto-pantalla)*0.85)]">
        
        {/* HEADER */}
        <div className="bg-[var(--color-ink)] text-white px-4 sm:px-6 py-4 flex justify-between items-center gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <Users className="text-[var(--color-info)]" size={20} />
            <h2 className="text-sm font-black uppercase tracking-widest">
              {view === 'LISTA' ? 'Directorio de Clientes' : view === 'NUEVO' ? (clienteAEditar ? 'Editar Cliente' : 'Registrar Nuevo Cliente') : `Historial: ${clienteActivo?.nombre}`}
            </h2>
          </div>
          <button id="btn-cerrar-modal-clientes" onClick={onClose} className="hover:text-[var(--color-danger)] transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-info)]"><X size={20} /></button>
        </div>

        {/* CONTENIDO DINÁMICO */}
        <div className="flex-1 min-h-0 bg-[var(--color-bg)] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] p-3 sm:p-6 flex flex-col">
          
          {view === 'LISTA' && (
            <div className="flex flex-col gap-4 h-full">
              
              {/* BARRA DE HERRAMIENTAS: BÚSQUEDA Y FILTROS */}
                <div className="p-3 sm:p-4 border-b-2 sm:border-2 border-[var(--color-border)] flex flex-wrap xl:flex-nowrap gap-4 shrink-0 bg-[var(--color-surface)]">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-subtle)]" />
                    <input autoComplete="off" id="buscador-modal-clientes" type="text" value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar por nombre o DNI..." 
                      className="w-full bg-white border-2 border-[var(--color-border)] pl-9 pr-4 py-3 text-xs font-black uppercase outline-none focus:border-[var(--color-info)] transition-colors rounded-none" 
                    />
                  </div>

                  <select 
                    id="filtro-deuda-clientes"
                    value={filtroDeuda} 
                    onChange={(e) => setFiltroDeuda(e.target.value as any)}
                    className="w-full sm:w-auto border-2 border-[var(--color-border)] px-4 py-3 text-xs font-black uppercase text-[var(--color-ink)] outline-none cursor-pointer bg-white rounded-none"
                  >
                    <option value="TODOS">Todos los clientes</option>
                    <option value="CON_DEUDA">Con Deuda Activa</option>
                    <option value="SIN_DEUDA">Sin Deudas</option>
                  </select>
                  
                  <select 
                    id="orden-alfabetico-clientes"
                    value={ordenAlfabetico} 
                    onChange={(e) => setOrdenAlfabetico(e.target.value as any)}
                    className="w-full sm:w-auto border-2 border-[var(--color-border)] px-4 py-3 text-xs font-black uppercase text-[var(--color-ink)] outline-none cursor-pointer bg-white rounded-none"
                  >
                    <option value="A-Z">Orden A - Z</option>
                    <option value="Z-A">Orden Z - A</option>
                  </select>

                  {/* Botón de Limpiar Filtros */}
                  {(searchTerm !== "" || filtroDeuda !== "TODOS" || ordenAlfabetico !== "A-Z") && (
                    <button 
                      id="btn-limpiar-filtros-clientes"
                      onClick={limpiarFiltros} 
                      className="p-3 border-2 border-[var(--color-border)] bg-[var(--color-danger-bg)] text-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-white transition-colors cursor-pointer rounded-none shrink-0" 
                      title="Limpiar Filtros"
                    >
                      <FilterX size={16} />
                    </button>
                  )}

                  <button id="btn-nuevo-cliente" onClick={openNuevo} className="w-full sm:w-auto h-[44px] bg-[var(--color-ink)] text-white px-3 sm:px-6 justify-center border-2 border-[var(--color-ink)] font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-[var(--color-warning)] hover:text-[var(--color-ink)] transition-colors shadow-[4px_4px_0_0_var(--color-ink)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] cursor-pointer rounded-none shrink-0">
                    <Plus size={16}/> Nuevo Cliente
                  </button>
                </div>

              {/* LISTA DE CLIENTES */}
              <div className="flex-1 overflow-y-auto min-h-0 border-2 border-[var(--color-border)] bg-white [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {currentClientes.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-[var(--color-subtle)] font-bold text-sm uppercase">
                    No se encontraron clientes
                  </div>
                ) : (
                  <div className="grid grid-cols-1 divide-y-2 divide-[var(--color-border)]">
                    {currentClientes.map(cli => {
                      const deudaActiva = fiados.filter(f => f.clienteNombre.trim().toLowerCase() === cli.nombre.trim().toLowerCase() && f.saldoPendiente > 0).reduce((acc, f) => acc + f.saldoPendiente, 0);

                      return (
                        <div key={cli.id} {...clicConTeclado(() => { setClienteActivo(cli); setView('HISTORIAL'); setHistorialTab(deudaActiva > 0 ? 'PENDIENTES' : 'PAGADAS'); })} className="p-3 sm:p-4 flex flex-wrap sm:flex-nowrap justify-between items-center gap-2 sm:gap-0 hover:bg-[var(--color-bg)] focus:bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] transition-colors group">
                          <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-1/3 min-w-0">
                            <UserCircle size={32} className="text-[var(--color-subtle)] shrink-0" />
                            <div className="min-w-0">
                              <p className="font-black text-[var(--color-ink)] uppercase truncate" title={cli.nombre}>{cli.nombre}</p>
                              <p className="text-[12px] font-bold text-[var(--color-muted)]">DNI: {cli.dni || '---'} | Cel: {cli.telefono || '---'}</p>
                            </div>
                          </div>
                          
                          <div className="sm:w-1/3 text-left sm:text-center">
                            {deudaActiva > 0 ? (
                              <span className="inline-block px-3 py-1 bg-[var(--color-danger-bg)] text-[var(--color-danger)] text-[12px] font-black uppercase border border-[var(--color-danger)]">
                                Debe: S/ {deudaActiva.toFixed(2)}
                              </span>
                            ) : (
                              <span className="inline-block px-3 py-1 bg-[var(--color-accent-bg)] text-[var(--color-accent)] text-[12px] font-black uppercase border border-[var(--color-accent)]">
                                Al Día
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-end gap-2 sm:w-1/3 ml-auto">
                            <button onClick={(e) => { e.stopPropagation(); openEditar(cli); }} className="p-2 bg-white text-[var(--color-subtle)] border-2 border-[var(--color-border)] hover:border-[var(--color-warning)] hover:text-[var(--color-warning)] transition-colors cursor-pointer" title="Editar Cliente">
                              <Edit size={16} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); onDeleteCliente(cli.id); }} className="p-2 bg-white text-[var(--color-subtle)] border-2 border-[var(--color-border)] hover:border-[var(--color-danger)] hover:text-[var(--color-danger)] transition-colors cursor-pointer" title="Eliminar Cliente">
                              <Trash2 size={16} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setClienteActivo(cli); setView('HISTORIAL'); setHistorialTab(deudaActiva > 0 ? 'PENDIENTES' : 'PAGADAS'); }} className="px-4 py-2 bg-[var(--color-bg)] text-[var(--color-info)] border-2 border-[var(--color-info)] text-[12px] font-black uppercase hover:bg-[var(--color-info)] hover:text-white transition-colors cursor-pointer ml-2">
                              Ver Historial
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* PAGINACIÓN */}
              <PaginacionControles />
            </div>
          )}

          {/* VISTA NUEVO / EDITAR */}
          {view === 'NUEVO' && (
            <div className="w-full h-full flex flex-col items-center justify-center">
              <div className="w-full max-w-md bg-white border-2 border-[var(--color-border)] shadow-[8px_8px_0_0_var(--color-border)] p-3 lg:p-4 flex flex-col gap-5">
                <h3 className="text-center font-black text-lg text-[var(--color-ink)] uppercase tracking-widest border-b-2 border-[var(--color-border)] pb-2 mb-2">
                  {clienteAEditar ? 'Editar Cliente' : 'Nuevo Cliente'}
                </h3>
                <div className="space-y-2">
                  <label className="text-[12px] font-black uppercase text-[var(--color-muted)]">Nombre Completo *</label>
                  <input autoComplete="off" id="input-nombre-cliente" type="text" value={nombre} onChange={e=>setNombre(e.target.value)} className="w-full border-2 border-[var(--color-border)] p-3 text-xs font-black uppercase focus:border-[var(--color-info)] outline-none transition-colors" />
                </div>
                <div className="space-y-2">
                  <label className="text-[12px] font-black uppercase text-[var(--color-muted)]">DNI (Opcional)</label>
                  <input autoComplete="off" id="input-dni-cliente" type="text" value={dni} onChange={e=>setDni(e.target.value.replace(/\D/g, ''))} maxLength={8} className="w-full border-2 border-[var(--color-border)] p-3 text-xs font-black focus:border-[var(--color-info)] outline-none transition-colors" />
                </div>
                <div className="space-y-2">
                  <label className="text-[12px] font-black uppercase text-[var(--color-muted)]">Celular (Opcional)</label>
                  <input autoComplete="off" id="input-telefono-cliente" type="text" value={telefono} onChange={e=>setTelefono(e.target.value.replace(/\D/g, ''))} maxLength={9} className="w-full border-2 border-[var(--color-border)] p-3 text-xs font-black focus:border-[var(--color-info)] outline-none transition-colors" />
                </div>
                <div className="flex justify-end gap-3 mt-4">
                  <button id="btn-cancelar-cliente" onClick={() => setView('LISTA')} className="px-6 py-3 border-2 border-[var(--color-border)] text-[var(--color-muted)] text-[12px] font-black uppercase hover:border-[var(--color-ink)] hover:text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-info)] transition-colors cursor-pointer rounded-none">Cancelar</button>
                  <button id="btn-guardar-cliente" onClick={handleSave} className="flex-1 py-3 bg-[var(--color-info)] text-white border-2 border-[var(--color-ink)] text-[12px] font-black uppercase flex items-center justify-center gap-2 hover:bg-[var(--color-ink)] hover:text-[var(--color-info)] focus:outline-none focus:ring-2 focus:ring-[var(--color-info)] transition-colors cursor-pointer shadow-[4px_4px_0_0_var(--color-ink)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] rounded-none"><Save size={16}/> {clienteAEditar ? 'Actualizar Datos' : 'Guardar Cliente'}</button>
                </div>
              </div>
            </div>
          )}

          {/* VISTA HISTORIAL */}
          {view === 'HISTORIAL' && (
            <div className="flex flex-col gap-6 h-full">
              {/* BOTÓN VOLVER PROMINENTE */}
              <div className="shrink-0 border-b-2 border-[var(--color-border)] pb-4 flex justify-between items-center">
                <button 
                  id="btn-volver-directorio"
                  onClick={() => setView('LISTA')} 
                  className="flex items-center gap-2 text-xs font-black uppercase text-[var(--color-subtle)] hover:text-[var(--color-info)] focus:outline-none focus:ring-2 focus:ring-[var(--color-info)] px-2 py-1 transition-colors cursor-pointer"
                >
                  <ArrowLeft size={16} /> Volver al Directorio
                </button>
                {/* Solo se muestra si el cliente tiene alguna deuda pendiente */}
                {clienteTieneDeuda && (
                  <button
                    id="btn-ver-estado-cuenta-historial"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('abrirEstadoCuentaGlobal', { detail: clienteActivo?.nombre }));
                    }}
                    className="flex items-center gap-2 text-xs font-black uppercase bg-[var(--color-info)] text-white px-4 py-1.5 hover:bg-[var(--color-ink)] hover:text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] transition-colors ml-4 border-2 border-[var(--color-ink)] shadow-[2px_2px_0_0_var(--color-ink)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
                  >
                    Ver Estado de Cuenta
                  </button>
                )}
                <div className="flex bg-[var(--color-surface)] border-2 border-[var(--color-ink)] p-1">
                  <button 
                    id="tab-historial-pendientes"
                    onClick={() => setHistorialTab('PENDIENTES')} 
                    className={`px-4 py-1 text-xs font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] transition-colors cursor-pointer ${historialTab === 'PENDIENTES' ? 'bg-[var(--color-ink)] text-white' : 'text-[var(--color-subtle)] hover:text-[var(--color-ink)]'}`}
                  >
                    PENDIENTES
                  </button>
                  <button 
                    id="tab-historial-pagadas"
                    onClick={() => setHistorialTab('PAGADAS')} 
                    className={`px-4 py-1 text-xs font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] transition-colors cursor-pointer ${historialTab === 'PAGADAS' ? 'bg-[var(--color-ink)] text-white' : 'text-[var(--color-subtle)] hover:text-[var(--color-ink)]'}`}
                  >
                    PAGADAS
                  </button>
                </div>
              </div>

              {/* BUSCADOR DE HISTORIAL */}
              <div className="flex flex-wrap gap-4 bg-[var(--color-surface)] p-3 border-2 border-[var(--color-border)] shrink-0">
                <div className="relative flex-1 min-w-[200px]">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-subtle)]" />
                  <input autoComplete="off" id="buscador-historial-clientes" type="text" value={historialSearchProd}
                    onChange={(e) => setHistorialSearchProd(e.target.value)}
                    placeholder="Buscar producto o monto..." 
                    className="w-full bg-white border-2 border-[var(--color-border)] pl-9 pr-4 py-2 text-xs font-black uppercase outline-none focus:border-[var(--color-info)] transition-colors rounded-none" 
                  />
                </div>
                <input autoComplete="off" id="fecha-historial-clientes" type="date" value={historialSearchDate}
                  onChange={(e) => setHistorialSearchDate(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      try {
                        (e.currentTarget as HTMLInputElement).showPicker();
                      } catch (err) {}
                    }
                  }}
                  className="w-full sm:w-auto border-2 border-[var(--color-border)] px-4 py-2 text-xs font-black uppercase text-[var(--color-ink)] outline-none focus:border-[var(--color-info)] cursor-pointer bg-white rounded-none"
                />

                {/* Botón de Limpiar Filtros del Historial */}
                {(historialSearchProd !== "" || historialSearchDate !== "") && (
                  <button
                    id="btn-limpiar-filtros-historial"
                    onClick={limpiarFiltrosHistorial}
                    className="p-2.5 border-2 border-[var(--color-border)] bg-[var(--color-danger-bg)] text-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] transition-colors cursor-pointer rounded-none shrink-0"
                    title="Limpiar Filtros"
                  >
                    <FilterX size={16} />
                  </button>
                )}
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div className="grid grid-cols-1 gap-3">
                  {fiadosHistorial.length === 0 ? (
                    <div className="bg-white border-2 border-[var(--color-border)] p-3 lg:p-4 text-center">
                      <p className="text-[var(--color-subtle)] font-black text-sm uppercase">No se encontraron registros.</p>
                    </div>
                  ) : (
                    fiadosHistorial.map(f => (
                      <div key={f.id} data-id={f.id} role="button" tabIndex={0} 
                        onClick={() => toggleHistorial(f.id.toString())} 
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleHistorial(f.id.toString());
                          }
                        }}
                        className="bg-white border-2 border-[var(--color-ink)] p-4 flex flex-col gap-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-info)] shadow-[4px_4px_0_0_var(--color-border)] cursor-pointer hover:bg-[var(--color-bg)] transition-colors"
                      >
                        <div className="flex justify-between items-center w-full">
                          <div>
                            <p className="text-sm font-black text-[var(--color-ink)] uppercase">Fecha: {new Date(f.fechaEmision).toLocaleDateString()}</p>
                            <p className="text-xs font-bold mt-1">
                              Estado: <span className={`px-2 py-1 ml-1 ${f.estado === 'PAGADO' ? 'bg-[var(--color-accent-bg)] text-[var(--color-accent)] border border-[var(--color-accent)]' : 'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border border-[var(--color-danger)]'}`}>
                                {f.estado}
                              </span>
                            </p>
                          </div>
                          <div className="text-right flex flex-col gap-1">
                            <p className="text-xs font-black uppercase text-[var(--color-muted)] tracking-widest">Monto Original: <span className="text-[var(--color-ink)] ml-1">S/ {f.montoOriginal.toFixed(2)}</span></p>
                            <p className="text-xs font-black uppercase text-[var(--color-success)] tracking-widest mt-1">Total Abonado: <span className="ml-1">S/ {(f.montoPagado || 0).toFixed(2)}</span></p>
                            <p className="text-sm font-black uppercase text-[var(--color-danger)] tracking-widest mt-1 border-t border-[var(--color-border)] pt-1">Debe: <span className="ml-1">S/ {f.saldoPendiente.toFixed(2)}</span></p>
                          </div>
                        </div>

                        {/* PRODUCTOS Y PAGOS (COLAPSABLE) */}
                        {expandedHistorialIds.has(f.id.toString()) && (
                          <div className="flex flex-col gap-4 border-t-2 border-dashed border-[var(--color-border)] pt-4 mt-2 w-full">
                            {f.detalles && f.detalles.length > 0 && (
                              <div className="flex flex-col gap-1">
                                <p className="text-xs font-black uppercase text-[var(--color-muted)] mb-1">Productos Sacados:</p>
                                {f.detalles.map((det, i) => (
                                  <div key={i} className="flex justify-between text-sm font-black text-[var(--color-muted)]">
                                    <span>{det.qty} x {det.name}</span>
                                    <span>S/ {Number(det.subtotal).toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {f.pagos && f.pagos.length > 0 && (
                              <div className="flex flex-col gap-1 border-t border-[var(--color-line-light)] pt-2 mt-2">
                                <p className="text-xs font-black uppercase text-[var(--color-success)] mb-1">Historial de Abonos a esta deuda:</p>
                                {f.pagos.map((pago, i) => (
                                  <div key={i} className="flex justify-between items-center text-xs font-black text-[var(--color-muted)]">
                                    <div className="flex items-center gap-2">
                                      <span className="bg-[var(--color-surface)] px-2 py-0.5 border border-[var(--color-border)]">{new Date(pago.fecha).toLocaleString('es-PE')}</span>
                                      <span className="uppercase">{pago.metodo}</span>
                                    </div>
                                    <span className="text-[var(--color-success)] font-black">+ S/ {Number(pago.monto).toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {(!f.pagos || f.pagos.length === 0) && (
                              <div className="flex flex-col gap-1 border-t border-[var(--color-line-light)] pt-2 mt-2">
                                <p className="text-[10px] font-bold uppercase text-[var(--color-muted)] italic">No se han registrado abonos para esta deuda.</p>
                              </div>
                            )}
                          </div>
                        )}
                        {!expandedHistorialIds.has(f.id.toString()) && ((f.detalles && f.detalles.length > 0) || (f.pagos && f.pagos.length > 0)) && (
                          <div className="text-[10px] text-center text-[var(--color-muted)] font-bold mt-1 tracking-widest uppercase">Click o Enter para ver detalles y abonos</div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

