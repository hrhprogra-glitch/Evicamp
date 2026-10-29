import { coincideBusqueda } from '../../../utils/busqueda';
import React, { useState, useEffect } from 'react';
import { Search, ScanLine, Package, Plus, AlertTriangle, CheckCircle2, Users, X } from 'lucide-react';
import { formatearCantidad } from '../../../utils/formato';
import { esDecimal, unidadDe } from '../../../utils/unidades';
import type { Product } from '../../Inventario/types';
import type { Cliente } from '../types';
import { supabase } from '../../../db/supabase';
import { useEmpleado, usePermiso } from '../../../utils/permisos';

interface Props {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  productos: Product[];
  onAddToCart: (producto: Product) => void;
  onNavigate?: (view: string) => void;
  clienteSeleccionado?: Cliente | null;
  onAbrirElegirCliente?: () => void;
  onLimpiarCliente?: () => void;
}

export const TerminalBusqueda: React.FC<Props> = ({
  searchQuery,
  setSearchQuery,
  productos,
  onAddToCart,
  onNavigate,
  clienteSeleccionado,
  onAbrirElegirCliente,
  onLimpiarCliente
}) => {
  const empleado = useEmpleado();
  const userEmail = empleado?.email || '';
  const puedeVerFiados = usePermiso('caja_ver_fiados');
  const [time, setTime] = useState<string>('');
  const [fiadosCount, setFiadosCount] = useState<number>(0);

  useEffect(() => {
    // 1. Reloj
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('es-PE', { hour12: false }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    
    // 2. Función SEGURA para contar fiados
    const fetchFiadosCount = async () => {
      const { count, error } = await supabase
        .from('fiados')
        .select('id', { count: 'exact', head: true })
        .neq('status', 'CANCELADO')
        .neq('status', 'ANULADO');
      
      if (!error) {
        setFiadosCount(count ?? 0);
      }
    };
    
    if (puedeVerFiados) fetchFiadosCount();

    return () => clearInterval(timer);
  }, [puedeVerFiados]);
  // 🔥 NUEVO: Estado para saber qué producto está seleccionado con las flechas
  const [selectedIndex, setSelectedIndex] = useState(0);

  // MOTOR DE BÚSQUEDA ULTRARRÁPIDO
  const filteredProducts = searchQuery.trim() === '' 
    ? [] 
    : productos.filter(p => {
        return coincideBusqueda([p.name, p.code, p.barcode], searchQuery);
      })
      // El código exacto primero (lector de barras / etiquetas de la fase 2.5): "SKU-12" no debe agregar "SKU-123"
      .sort((a, b) => {
        const q = searchQuery.trim().toUpperCase();
        const exacto = (p: typeof a) => [p.code, p.barcode].some((c) => c && String(c).trim().toUpperCase() === q);
        return Number(exacto(b)) - Number(exacto(a));
      })
      .slice(0, 48);

  // 🔥 NUEVO: Resetear el selector cuando se busca algo nuevo
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // 🔥 NUEVO: Auto-scroll para que el selector siempre esté a la vista y no perdamos foco visual
  useEffect(() => {
    const selectedBtn = document.getElementById(`producto-pos-${selectedIndex}`);
    if (selectedBtn) {
      selectedBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedIndex]);

  // 🛡️ ESCUDO DE ESCÁNER GLOBAL (Captura códigos de barras siempre)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      const isInput = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'BUTTON' || activeTag === 'A';
      const activeId = document.activeElement?.id || '';
      
      const isCartInput = activeId.startsWith('edit-input-') || activeId.startsWith('edit-price-');

      // 🛡️ Ignorar global listener si hay un modal (ventana flotante) abierto
      if (document.querySelector('[role="dialog"]')) {
        return;
      }

      // 1. Evitar robar el foco (para letras y números) si estás escribiendo en otros inputs/modales
      if (isInput) return; 

      // 2. Ignorar teclas de sistema (Shift, Ctrl, F5, etc.)
      if (e.key.length > 1 && e.key !== 'Enter' && e.key !== 'Backspace') return;

      // 🛡️ PARCHE EVICAMP: Si hay un producto seleccionado en la caja (fondo gris), NO robamos los números.
      // Esto permite que el componente TicketVenta capture el número para editar la cantidad o precio.
      // (antes el selector estaba mal escrito y daba error en cada tecla: el imán hacia el buscador nunca llegaba a actuar)
      const isCartSelected = document.querySelector(`.${CSS.escape('bg-[var(--color-muted)]')}`) !== null;
      if (isCartSelected && /^[0-9]$/.test(e.key)) return;

      // 3. Forzar el imán hacia el buscador
      const searchInput = document.getElementById('buscador-global-pos') as HTMLInputElement;
      if (searchInput) searchInput.focus();
    };

    const enforceFocus = () => {
      // Ignorar si hay modales abiertos
      if (document.querySelector('[role="dialog"]')) return;
      
      const activeTag = document.activeElement?.tagName;
      // Si estamos en otro input (ej. cantidad/precio), no robamos el foco
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'BUTTON' || activeTag === 'A') return;
      
      const searchInput = document.getElementById('buscador-global-pos') as HTMLInputElement;
      if (searchInput) searchInput.focus();
    };

    const handleGlobalClick = () => setTimeout(enforceFocus, 50);
    const handleWindowFocus = () => setTimeout(enforceFocus, 50);

    window.addEventListener('keydown', handleGlobalKeyDown);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('click', handleGlobalClick);

    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('click', handleGlobalClick);
    };
  }, []);

  // SOPORTE PARA FLECHAS, ESCÁNER Y ENTER
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {

    // Si no hay resultados, dejamos que index.tsx maneje otros atajos, pero 'Delete' igual debe limpiar
    if (e.key === 'Delete') {
      e.preventDefault();
      setSearchQuery('');
      return;
    }

    if (filteredProducts.length === 0) return;

    const getColumnsCount = () => {
      const grid = document.getElementById('productos-grid-pos');
      if (grid) {
        const columnsStr = window.getComputedStyle(grid).getPropertyValue('grid-template-columns');
        return columnsStr.split(' ').filter(c => c.trim() !== '').length || 1;
      }
      return 1;
    };

    const cols = getColumnsCount();
    const currentRow = Math.floor(selectedIndex / cols);
    const totalRows = Math.ceil(filteredProducts.length / cols);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.nativeEvent.stopImmediatePropagation();
      if (currentRow < totalRows - 1) {
        const nextIndex = selectedIndex + cols;
        setSelectedIndex(nextIndex < filteredProducts.length ? nextIndex : filteredProducts.length - 1);
      }
    } else if (e.key === 'ArrowRight') {
      // Si presiona derecha estando en el último producto, dejamos que salte al carrito
      if (selectedIndex === filteredProducts.length - 1) return; 
      
      e.preventDefault();
      e.stopPropagation(); 
      e.nativeEvent.stopImmediatePropagation(); // 🛡️ EVICAMP: Bloqueo absoluto al listener nativo de index.tsx
      if (selectedIndex < filteredProducts.length - 1) {
        setSelectedIndex(prev => prev + 1);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
      if (currentRow > 0) {
        setSelectedIndex(selectedIndex - cols);
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      e.stopPropagation(); 
      e.nativeEvent.stopImmediatePropagation();
      if (selectedIndex > 0) {
        setSelectedIndex(prev => prev - 1);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selectedProd = filteredProducts[selectedIndex];
      if (!selectedProd) return;

      const esConsumo = selectedProd.unit === 'CONSUMO' || (selectedProd as any).control_type === 'CONSUMPTION';
      const estaAgotado = !esConsumo && selectedProd.quantity <= 0;
      
      if (!estaAgotado) {
        onAddToCart({ ...selectedProd, unit: esConsumo ? 'CONSUMO' : selectedProd.unit });
        setSearchQuery(''); 
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[var(--color-surface)] border-2 border-[var(--color-ink)] relative rounded-none">
      {/* Barra superior de acento (Plano Técnico) */}
      <div className="h-2 w-full bg-[var(--color-accent)] shrink-0 rounded-none"></div>

      {/* HEADER DE BÚSQUEDA TIPO TERMINAL */}
      <div className="bg-[var(--color-surface)] px-3 py-2 sm:px-4 border-b border-[var(--color-border)] shrink-0 rounded-none">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-sm sm:text-base font-black text-[var(--color-ink)] uppercase tracking-widest flex items-center gap-2">
              <ScanLine className="text-[var(--color-ink)]" size={18} /> Punto de Venta
            </h1>
          </div>
          
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="hidden md:flex items-center min-w-0 border border-[var(--color-border)] pl-2 pr-3 py-1 bg-white">
              <div className="h-2 w-2 bg-[var(--color-accent)] animate-pulse mr-2"></div>
              <span className="text-xs font-black text-[var(--color-ink)] uppercase tracking-[0.1em] truncate">
                ID: <span className="text-[var(--color-muted)]">{userEmail.split('@')[0]}</span>
              </span>
            </div>

            <div className="hidden sm:flex items-center whitespace-nowrap border border-[var(--color-border)] px-3 py-1 bg-[var(--color-bg)] text-xs font-black uppercase tracking-widest text-[var(--color-ink)]">
              [ {time} ]
            </div>

            {onAbrirElegirCliente && (
              <div className="flex items-center shrink-0">
                <button
                  id="btn-pos-header-cliente"
                  type="button"
                  onClick={onAbrirElegirCliente}
                  title="Elegir o cambiar cliente para esta venta (F3 o clic)"
                  className={`flex items-center whitespace-nowrap border-2 border-[var(--color-ink)] px-2 sm:px-3 py-1 text-[12px] font-black uppercase tracking-widest bg-white text-[var(--color-ink)] hover:bg-[var(--color-accent)] transition-all cursor-pointer shadow-[2px_2px_0_0_var(--color-ink)] active:translate-x-[2px] active:translate-y-[2px] ${
                    clienteSeleccionado && onLimpiarCliente ? 'border-r-0' : ''
                  }`}
                >
                  <Users size={13} className="mr-1.5 text-[var(--color-ink)]" />
                  {clienteSeleccionado ? (
                    <span>
                      CLI: <span className="text-[var(--color-accent-dark)] font-black">{clienteSeleccionado.nombre}</span>{' '}
                      <span className="text-[10px] text-[var(--color-subtle)]">(F3)</span>
                    </span>
                  ) : (
                    <span>
                      CLIENTE <span className="text-[10px] text-[var(--color-subtle)]">(F3)</span>
                    </span>
                  )}
                </button>
                {clienteSeleccionado && onLimpiarCliente && (
                  <button
                    id="btn-limpiar-cliente-pos"
                    type="button"
                    onClick={onLimpiarCliente}
                    title="Quitar cliente (Shift+F3 o clic en ✕)"
                    className="border-2 border-[var(--color-ink)] bg-white hover:bg-[var(--color-danger)] hover:text-white px-2 py-1 text-[var(--color-muted)] transition-colors cursor-pointer shadow-[2px_2px_0_0_var(--color-ink)] flex items-center justify-center active:translate-x-[2px] active:translate-y-[2px]"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            )}

            {puedeVerFiados && (
              <button
                // "Por cobrar" abre la sección Clientes directo en la pestaña Créditos
                onClick={() => { try { sessionStorage.setItem('clientes_pestana', 'CREDITOS'); } catch { /* sin almacenamiento */ } onNavigate?.('clientes'); }}
                title={fiadosCount > 0 ? 'Hay deudas pendientes por cobrar' : 'Nadie tiene deudas pendientes'}
                className={`flex items-center shrink-0 whitespace-nowrap border-2 px-2 sm:px-3 py-1 text-[12px] font-black uppercase tracking-widest transition-all cursor-pointer hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] ${
                  fiadosCount > 0
                    ? 'border-[var(--color-warning)] bg-[var(--color-warning-bg)] text-[var(--color-warning-dark)] hover:bg-[var(--color-warning)] hover:text-white animate-pulse shadow-[2px_2px_0_0_var(--color-warning-dark)]'
                    : 'border-[var(--color-accent)] bg-[var(--color-accent-bg)] text-[var(--color-accent-dark)] hover:bg-[var(--color-accent)] hover:text-white shadow-[2px_2px_0_0_var(--color-accent-dark)]'
                }`}
              >
                {fiadosCount > 0 ? <AlertTriangle size={12} className="mr-2" /> : <CheckCircle2 size={12} className="mr-2" />}
                Por cobrar: {fiadosCount}
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          {/* Estricto diseño monocrático, sin sombras difuminadas ni redondeos */}
          <div className={`flex-1 relative flex items-center border-2 border-[var(--color-ink)] bg-white transition-all shadow-[4px_4px_0_0_var(--color-ink)] rounded-none z-10 ${searchQuery.length === 0 ? 'focus-within:border-[var(--color-ink)] focus-within:ring-4 focus-within:ring-[var(--color-accent)]' : 'focus-within:ring-2 focus-within:ring-[var(--color-muted)]'}`}>
            <div className="w-10 h-10 flex items-center justify-center bg-[var(--color-ink)] text-white shrink-0 rounded-none">
              <Search size={20} />
            </div>
            <div className="flex flex-col flex-1 px-4 relative">
              <input id="buscador-global-pos"
                type="text" 
                autoFocus
                placeholder="ESCANEAS AQUÍ, O ESCRIBES NOMBRE/CÓDIGO (Presiona Enter)" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="off"
                spellCheck={false}
                autoCorrect="off"
                className="w-full h-10 bg-transparent text-base font-black text-[var(--color-ink)] uppercase outline-none placeholder:text-[var(--color-muted)]/50 rounded-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ÁREA DE RESULTADOS */}
      <div className="flex-1 min-w-0 w-full p-2 sm:p-3 overflow-y-auto custom-scrollbar flex flex-col bg-[var(--color-bg)]">
        {searchQuery.trim() === '' ? (
          // ESTADO 1: ESPERANDO BÚSQUEDA
          <div className="border border-dashed border-[var(--color-muted)] flex-1 flex flex-col items-center justify-center text-center p-3 lg:p-4 bg-[var(--color-surface)] rounded-none">
            <Package size={48} className="text-[var(--color-muted)] mb-4" />
            <h2 className="text-sm font-black text-[var(--color-ink)] uppercase tracking-widest mb-2">Área de Trabajo</h2>
            <p className="text-[12px] font-bold text-[var(--color-muted)] uppercase tracking-widest max-w-sm">
              Sistema a la espera de identificador (SKU, EAN-13 o Texto).
            </p>
          </div>
        ) : filteredProducts.length === 0 ? (
          // ESTADO 2: SIN RESULTADOS
          <div className="border border-dashed border-[var(--color-ink)] flex-1 flex flex-col items-center justify-center text-center p-3 lg:p-4 bg-[var(--color-surface)] rounded-none">
            <Package size={48} className="text-[var(--color-ink)] opacity-50 mb-4" />
            <h2 className="text-sm font-black text-[var(--color-ink)] uppercase tracking-widest mb-2">Registro Inexistente</h2>
            <p className="text-[12px] font-bold text-[var(--color-muted)] uppercase tracking-widest max-w-sm">
              Verifique la integridad del código en la base de datos.
            </p>
          </div>
        ) : (
          // ESTADO 3: MOSTRAR RESULTADOS
          <div id="productos-grid-pos" className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-2 sm:gap-4">
            {filteredProducts.map((prod, index) => {
              // LÓGICA CORE: Interceptamos la BD para validar Consumo real
              const esConsumo = prod.unit === 'CONSUMO' || (prod as any).control_type === 'CONSUMPTION';
              const estaAgotado = !esConsumo && prod.quantity <= 0;
              const isSelected = index === selectedIndex; // 🔥 NUEVO: Detecta si está seleccionado

              return (
                <button
                  key={prod.id}
                  id={`producto-pos-${index}`}
                  tabIndex={-1} // Evita que reciba el foco nativo con el Tab
                  onClick={() => !estaAgotado && onAddToCart({ ...prod, unit: esConsumo ? 'CONSUMO' : prod.unit })}
                  disabled={estaAgotado} 
                  className={`p-2 sm:p-2.5 text-left flex flex-col min-w-0 transition-all rounded-none border-2 focus:outline-none focus:ring-0
                    ${isSelected ? 'ring-4 ring-[var(--color-accent)] border-[var(--color-accent)] scale-[1.02] shadow-xl z-10' : ''}
                    ${estaAgotado 
                      ? 'bg-[var(--color-surface)] border-[var(--color-border)] opacity-50 cursor-not-allowed' 
                      : esConsumo
                        ? 'bg-[var(--color-warning-bg)] border-[var(--color-warning-dark)] cursor-pointer hover:shadow-[4px_4px_0_0_var(--color-warning-dark)] hover:-translate-y-1'
                        : esDecimal(prod)
                          ? 'bg-[#F0F9FF] border-[var(--color-info-dark)] cursor-pointer hover:shadow-[4px_4px_0_0_var(--color-info-dark)] hover:-translate-y-1'
                          : 'bg-[var(--color-surface)] border-[var(--color-ink)] cursor-pointer hover:shadow-[4px_4px_0_0_var(--color-ink)] hover:-translate-y-1'
                    }
                  `}
                >
                  {/* Fila de arriba: solo el stock (el código/SKU no importa para vender).
                      Siempre de una sola línea, para que la imagen quede en la misma posición
                      en todas las tarjetas. */}
                  <div className="w-full mb-1">
                    {/* Estricto etiquetado de Alto Contraste por Color */}
                    {esConsumo ? (
                      <span className="block w-full text-center text-sm sm:text-base font-black text-[var(--color-surface)] bg-[var(--color-warning-dark)] px-2 py-1.5 uppercase tracking-widest whitespace-nowrap rounded-none">
                        CONSUMO
                      </span>
                    ) : (
                      <span className={`block w-full text-center text-sm sm:text-base font-black px-2 py-1.5 rounded-none uppercase tracking-wide whitespace-nowrap ${
                        estaAgotado
                          ? 'text-[var(--color-surface)] bg-[var(--color-ink)]'
                          : esDecimal(prod)
                            ? 'text-[var(--color-info-dark)] bg-[#F0F9FF] border border-[var(--color-info-dark)]'
                            : 'text-[var(--color-ink)] bg-[var(--color-bg)] border border-[var(--color-ink)]'
                      }`}>
                        {prod.quantity > 0
                          ? `STK: ${formatearCantidad(prod.quantity, prod.unit)} ${unidadDe(prod).corto === 'UND' ? 'UN' : unidadDe(prod).corto}`
                          : 'AGOTADO'
                        }
                      </span>
                    )}
                  </div>
                  
                  {/* BLOQUE IMAGEN + NOMBRE: alto total fijo (el mismo que antes con nombre de 2
                      líneas). El nombre solo ocupa lo que necesita (1 o 2 líneas) y la imagen
                      crece con flex-1 para aprovechar el espacio libre cuando el nombre es corto,
                      sin mover ni afectar el precio/botón de abajo. */}
                  <div className="w-full flex flex-col gap-1 sm:gap-1.5 h-[122px] sm:h-[146px] mb-1.5 sm:mb-2">
                    {(() => {
                      const img = (prod as any).image_url || (prod as any).image_path || '';
                      const valida = img.startsWith('http') || img.startsWith('data:');
                      return (
                        <div className={`flex-1 min-h-0 flex items-center justify-center border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden ${estaAgotado ? 'grayscale' : ''}`}>
                          {valida ? (
                            <img
                              src={img}
                              alt={prod.name}
                              loading="lazy"
                              className="max-w-full max-h-full object-contain"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : (
                            <Package size={32} className="text-[var(--color-line-light)]" aria-hidden="true" />
                          )}
                        </div>
                      );
                    })()}

                    <span className="text-sm sm:text-base font-black text-[var(--color-ink)] uppercase leading-tight line-clamp-2 break-words shrink-0">
                      {prod.name}
                    </span>
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-1.5 border-t border-dashed border-[var(--color-border)] w-full">
                    <span className="text-lg sm:text-xl font-black text-[var(--color-ink)] font-mono">
                      S/ {prod.price.toFixed(2)}
                    </span>
                    <div className={`w-7 h-7 flex items-center justify-center transition-colors rounded-none border text-[var(--color-surface)]
                      ${estaAgotado 
                        ? 'bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-line-light)]' 
                        : esConsumo
                          ? 'bg-[var(--color-warning-dark)] border-[var(--color-warning-dark)]'
                          : esDecimal(prod)
                            ? 'bg-[var(--color-info-dark)] border-[var(--color-info-dark)]'
                            : 'bg-[var(--color-ink)] border-[var(--color-ink)]'
                      }`}
                    >
                      <Plus size={16} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};






