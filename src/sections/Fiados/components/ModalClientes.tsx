import React, { useState, useEffect } from 'react';
import { X, Users, Search, Plus, UserCircle, Save, Edit, Trash2, ArrowLeft, ChevronLeft, ChevronRight, Filter, FilterX } from 'lucide-react';
import type { Cliente, Fiado } from '../types';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  clientes: Cliente[];
  onSaveCliente: (cliente: Omit<Cliente, 'id'>) => void;
  onEditCliente: (cliente: Cliente) => void;
  onDeleteCliente: (id: string) => void;
  fiados: Fiado[];
}

export const ModalClientes: React.FC<Props> = ({ isOpen, onClose, clientes, onSaveCliente, onEditCliente, onDeleteCliente, fiados }) => {
  useCerrarConEscape(isOpen, onClose); // Escape (o "Atrás" del control de TV) cierra la ventana
  const [view, setView] = useState<'LISTA' | 'NUEVO' | 'HISTORIAL'>('LISTA');
  const [clienteActivo, setClienteActivo] = useState<Cliente | null>(null);
  const [clienteAEditar, setClienteAEditar] = useState<Cliente | null>(null);
  
  // Estados Formulario
  const [nombre, setNombre] = useState('');
  const [dni, setDni] = useState('');
  const [telefono, setTelefono] = useState('');

  // Estados Filtros y Búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroDeuda, setFiltroDeuda] = useState<'TODOS' | 'CON_DEUDA' | 'SIN_DEUDA'>('TODOS');
  const [ordenAlfabetico, setOrdenAlfabetico] = useState<'A-Z' | 'Z-A'>('A-Z');
  
  // Estados Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const limpiarFiltros = () => {
    setSearchTerm('');
    setFiltroDeuda('TODOS');
    setOrdenAlfabetico('A-Z');
    setCurrentPage(1);
  };

  // Resetear la página si cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filtroDeuda, ordenAlfabetico, clientes.length]);

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

  const fiadosDelCliente = clienteActivo ? fiados.filter(f => f.clienteNombre === clienteActivo.nombre) : [];

  return (
    <div className="fixed inset-0 bg-[var(--color-ink)]/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 font-mono">
      <div className="bg-white w-full max-w-4xl border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] flex flex-col h-[calc(var(--alto-pantalla)*0.94)] sm:h-[calc(var(--alto-pantalla)*0.85)]">
        
        {/* HEADER */}
        <div className="bg-[var(--color-ink)] text-white px-4 sm:px-6 py-4 flex justify-between items-center gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <Users className="text-[var(--color-info)]" size={20} />
            <h2 className="text-sm font-black uppercase tracking-widest">
              {view === 'LISTA' ? 'Directorio de Clientes' : view === 'NUEVO' ? (clienteAEditar ? 'Editar Cliente' : 'Registrar Nuevo Cliente') : `Historial: ${clienteActivo?.nombre}`}
            </h2>
          </div>
          <button onClick={onClose} className="hover:text-[var(--color-danger)] transition-colors cursor-pointer"><X size={20} /></button>
        </div>

        {/* CONTENIDO DINÁMICO */}
        <div className="flex-1 bg-[var(--color-bg)] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] p-3 sm:p-6 flex flex-col">
          
          {view === 'LISTA' && (
            <div className="flex flex-col gap-4 h-full">
              
              {/* BARRA DE HERRAMIENTAS: BÚSQUEDA Y FILTROS */}
              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-[var(--color-surface)] p-3 sm:p-4 border-2 border-[var(--color-border)] shrink-0 rounded-none">
                <div className="flex flex-wrap gap-2 sm:gap-4 flex-1 w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {/* Buscador */}
                  <div className="relative w-full sm:w-72">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-subtle)]" />
                    <input 
                      type="text" 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar por nombre o DNI..." 
                      className="w-full bg-white border-2 border-[var(--color-border)] px-3 py-2 pl-9 text-xs font-black uppercase outline-none focus:border-[var(--color-info)] transition-colors" 
                    />
                  </div>
                  {/* Filtro de Deudas */}
                  <div className="flex items-center gap-2 border-2 border-[var(--color-border)] px-3 py-2 bg-white">
                    <Filter size={14} className="text-[var(--color-muted)]" />
                    <select 
                      value={filtroDeuda} 
                      onChange={(e) => setFiltroDeuda(e.target.value as any)}
                      className="text-xs font-black uppercase text-[var(--color-ink)] outline-none cursor-pointer bg-transparent"
                    >
                      <option value="TODOS">Todos los clientes</option>
                      <option value="CON_DEUDA">Con Deuda Activa</option>
                      <option value="SIN_DEUDA">Sin Deudas</option>
                    </select>
                  </div>
                  
                  {/* Filtro Orden Alfabético */}
                  <div className="flex items-center gap-2 border-2 border-[var(--color-border)] px-3 py-2 bg-white">
                    <select 
                      value={ordenAlfabetico} 
                      onChange={(e) => setOrdenAlfabetico(e.target.value as any)}
                      className="text-xs font-black uppercase text-[var(--color-ink)] outline-none cursor-pointer bg-transparent"
                    >
                      <option value="A-Z">Orden A - Z</option>
                      <option value="Z-A">Orden Z - A</option>
                    </select>
                  </div>

                  {/* Botón de Limpiar Filtros (Solo aparece si hay filtros activos) */}
                  {(searchTerm !== '' || filtroDeuda !== 'TODOS' || ordenAlfabetico !== 'A-Z') && (
                    <button 
                      onClick={limpiarFiltros} 
                      className="p-2 border-2 border-[var(--color-border)] bg-[var(--color-danger-bg)] text-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-white transition-colors cursor-pointer" 
                      title="Limpiar Filtros"
                    >
                      <FilterX size={16} />
                    </button>
                  )}
                </div>

                <div className="flex-shrink-0 w-full xl:w-auto">
                  <button onClick={openNuevo} className="w-full xl:w-auto px-6 py-2 bg-[var(--color-ink)] text-[var(--color-surface)] border-2 border-[var(--color-ink)] text-[12px] font-black uppercase flex items-center justify-center gap-2 hover:bg-[var(--color-muted)] hover:border-[var(--color-muted)] transition-colors shadow-[4px_4px_0_0_var(--color-ink)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] cursor-pointer rounded-none">
                    <Plus size={16}/> Nuevo Cliente
                  </button>
                </div>
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
                      const deudaActiva = fiados.filter(f => f.clienteNombre === cli.nombre && f.saldoPendiente > 0).reduce((acc, f) => acc + f.saldoPendiente, 0);

                      return (
                        <div key={cli.id} className="p-3 sm:p-4 flex flex-wrap sm:flex-nowrap justify-between items-center gap-2 sm:gap-0 hover:bg-[var(--color-bg)] transition-colors group">
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
                            <button onClick={() => openEditar(cli)} className="p-2 bg-white text-[var(--color-subtle)] border-2 border-[var(--color-border)] hover:border-[var(--color-warning)] hover:text-[var(--color-warning)] transition-colors cursor-pointer" title="Editar Cliente">
                              <Edit size={16} />
                            </button>
                            <button onClick={() => onDeleteCliente(cli.id)} className="p-2 bg-white text-[var(--color-subtle)] border-2 border-[var(--color-border)] hover:border-[var(--color-danger)] hover:text-[var(--color-danger)] transition-colors cursor-pointer" title="Eliminar Cliente">
                              <Trash2 size={16} />
                            </button>
                            <button onClick={() => { setClienteActivo(cli); setView('HISTORIAL'); }} className="px-4 py-2 bg-[var(--color-bg)] text-[var(--color-info)] border-2 border-[var(--color-info)] text-[12px] font-black uppercase hover:bg-[var(--color-info)] hover:text-white transition-colors cursor-pointer ml-2">
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
              {totalPages > 1 && (
                <div className="flex justify-between items-center pt-2 shrink-0">
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
              )}
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
                  <input type="text" value={nombre} onChange={e=>setNombre(e.target.value)} className="w-full border-2 border-[var(--color-border)] p-3 text-xs font-black uppercase focus:border-[var(--color-info)] outline-none transition-colors" />
                </div>
                <div className="space-y-2">
                  <label className="text-[12px] font-black uppercase text-[var(--color-muted)]">DNI (Opcional)</label>
                  <input type="text" value={dni} onChange={e=>setDni(e.target.value.replace(/\D/g, ''))} maxLength={8} className="w-full border-2 border-[var(--color-border)] p-3 text-xs font-black focus:border-[var(--color-info)] outline-none transition-colors" />
                </div>
                <div className="space-y-2">
                  <label className="text-[12px] font-black uppercase text-[var(--color-muted)]">Celular (Opcional)</label>
                  <input type="text" value={telefono} onChange={e=>setTelefono(e.target.value.replace(/\D/g, ''))} maxLength={9} className="w-full border-2 border-[var(--color-border)] p-3 text-xs font-black focus:border-[var(--color-info)] outline-none transition-colors" />
                </div>
                <div className="flex justify-end gap-3 mt-4">
                  <button onClick={() => setView('LISTA')} className="px-6 py-3 border-2 border-[var(--color-border)] text-[var(--color-muted)] text-[12px] font-black uppercase hover:border-[var(--color-ink)] hover:text-[var(--color-ink)] transition-colors cursor-pointer rounded-none">Cancelar</button>
                  <button onClick={handleSave} className="flex-1 py-3 bg-[var(--color-info)] text-white border-2 border-[var(--color-ink)] text-[12px] font-black uppercase flex items-center justify-center gap-2 hover:bg-[var(--color-ink)] hover:text-[var(--color-info)] transition-colors cursor-pointer shadow-[4px_4px_0_0_var(--color-ink)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] rounded-none"><Save size={16}/> {clienteAEditar ? 'Actualizar Datos' : 'Guardar Cliente'}</button>
                </div>
              </div>
            </div>
          )}

          {/* VISTA HISTORIAL */}
          {view === 'HISTORIAL' && (
            <div className="flex flex-col gap-6 h-full">
              {/* BOTÓN VOLVER PROMINENTE */}
              <div className="shrink-0 border-b-2 border-[var(--color-border)] pb-4">
                <button 
                  onClick={() => setView('LISTA')} 
                  className="px-5 py-3 bg-white text-[var(--color-ink)] border-2 border-[var(--color-ink)] text-xs font-black uppercase flex items-center gap-2 hover:bg-[var(--color-ink)] hover:text-white transition-colors cursor-pointer shadow-[4px_4px_0_0_var(--color-ink)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] w-fit"
                >
                  <ArrowLeft size={18} /> Volver al Directorio
                </button>
              </div>

              <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div className="grid grid-cols-1 gap-3">
                  {fiadosDelCliente.length === 0 ? (
                    <div className="bg-white border-2 border-[var(--color-border)] p-3 lg:p-4 text-center">
                      <p className="text-[var(--color-subtle)] font-black text-sm uppercase">No tiene deudas ni historial registrado.</p>
                    </div>
                  ) : (
                    fiadosDelCliente.map(f => (
                      <div key={f.id} className="bg-white border-2 border-[var(--color-ink)] p-4 flex justify-between items-center shadow-[4px_4px_0_0_var(--color-border)]">
                        <div>
                          <p className="text-sm font-black text-[var(--color-ink)] uppercase">Fecha: {new Date(f.fechaEmision).toLocaleDateString()}</p>
                          <p className="text-xs font-bold mt-1">
                            Estado: <span className={`px-2 py-1 ml-1 ${f.estado === 'PAGADO' ? 'bg-[var(--color-accent-bg)] text-[var(--color-accent)] border border-[var(--color-accent)]' : 'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border border-[var(--color-danger)]'}`}>
                              {f.estado}
                            </span>
                          </p>
                        </div>
                        <div className="text-right flex flex-col gap-1">
                          <p className="text-sm font-black text-[var(--color-muted)]">Deuda Total: <span className="text-[var(--color-ink)]">S/ {f.montoOriginal.toFixed(2)}</span></p>
                          <p className="text-lg font-black text-[var(--color-danger)]">Debe: S/ {f.saldoPendiente.toFixed(2)}</p>
                        </div>
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