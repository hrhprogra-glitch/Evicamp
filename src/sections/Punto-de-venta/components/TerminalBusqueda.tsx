import React, { useState, useEffect } from 'react';
import { Search, ScanLine, Package, Plus } from 'lucide-react';
import { formatearCantidad } from '../../../utils/formato';
import type { Product } from '../../Inventario/types';

interface Props {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  productos: Product[];
  onAddToCart: (producto: Product) => void;
}

export const TerminalBusqueda: React.FC<Props> = ({ searchQuery, setSearchQuery, productos, onAddToCart }) => {
  // 🔥 NUEVO: Estado para saber qué producto está seleccionado con las flechas
  const [selectedIndex, setSelectedIndex] = useState(0);

  // MOTOR DE BÚSQUEDA ULTRARRÁPIDO
  const filteredProducts = searchQuery.trim() === '' 
    ? [] 
    : productos.filter(p => {
        const q = searchQuery.toLowerCase();
        // 🛡️ CIBERSEGURIDAD: Evitar crasheos por datos nulos
        const nombreSeguro = (p.name || '').toLowerCase();
        const codigoSeguro = (p.code || '').toLowerCase();
        const barrasSeguro = p.barcode || '';
        
        return nombreSeguro.includes(q) || codigoSeguro.includes(q) || barrasSeguro.includes(q);
      }).slice(0, 48);

  // 🔥 NUEVO: Resetear el selector cuando se busca algo nuevo
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // 🛡️ ESCUDO DE ESCÁNER GLOBAL (Captura códigos de barras siempre)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 1. Evitar robar el foco si estás escribiendo en modales (Cobro, Balanza, Clientes)
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return; 
      
      // 2. Ignorar teclas de sistema (Shift, Ctrl, F5, etc.)
      if (e.key.length > 1 && e.key !== 'Enter' && e.key !== 'Backspace') return;

      // 🛡️ PARCHE EVICAMP: Si hay un producto seleccionado en la caja (fondo gris), NO robamos los números.
      // Esto permite que el componente TicketVenta capture el número para editar la cantidad o precio.
      const isCartSelected = document.querySelector('.bg-\\[\\var(--color-muted)\\]') !== null;
      if (isCartSelected && /^[0-9]$/.test(e.key)) return;

      // 3. Forzar el imán hacia el buscador
      const searchInput = document.getElementById('buscador-global-pos') as HTMLInputElement;
      if (searchInput) searchInput.focus();
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // SOPORTE PARA FLECHAS, ESCÁNER Y ENTER
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Si no hay resultados o presionamos Derecha/Abajo al final, dejamos que index.tsx haga el salto
    if (filteredProducts.length === 0) return;

    if (e.key === 'ArrowDown') {
      if (selectedIndex === filteredProducts.length - 1) return; // Permite que burbujee a index.tsx
      e.preventDefault();
      setSelectedIndex(prev => prev + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'ArrowRight') {
      return; // Deja que index.tsx capture el salto al carrito
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
        </div>

        <div className="flex gap-3">
          {/* Estricto diseño monocrático, sin sombras difuminadas ni redondeos */}
          <div className="flex-1 relative flex items-center border-2 border-[var(--color-ink)] bg-[var(--color-surface)] focus-within:ring-2 focus-within:ring-[var(--color-muted)] transition-all shadow-[4px_4px_0_0_var(--color-ink)] rounded-none">
            <div className="w-10 h-10 flex items-center justify-center bg-[var(--color-ink)] text-[var(--color-surface)] shrink-0 rounded-none">
              <Search size={20} />
            </div>
            <div className="flex flex-col flex-1 px-4 relative">
              <input 
                id="buscador-global-pos"
                type="text" 
                autoFocus
                placeholder="ESCANEAS AQUÍ, O ESCRIBES NOMBRE/CÓDIGO (Presiona Enter)" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full h-10 bg-transparent text-base font-black text-[var(--color-ink)] uppercase outline-none placeholder:text-[var(--color-muted)]/50 rounded-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ÁREA DE RESULTADOS */}
      <div className="flex-1 p-2 sm:p-3 overflow-y-auto custom-scrollbar flex flex-col bg-[var(--color-bg)]">
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
          <div className="grid grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-2 sm:gap-4">
            {filteredProducts.map((prod, index) => {
              // LÓGICA CORE: Interceptamos la BD para validar Consumo real
              const esConsumo = prod.unit === 'CONSUMO' || (prod as any).control_type === 'CONSUMPTION';
              const estaAgotado = !esConsumo && prod.quantity <= 0;
              const isSelected = index === selectedIndex; // 🔥 NUEVO: Detecta si está seleccionado

              return (
                <button
                  key={prod.id}
                  onClick={() => !estaAgotado && onAddToCart({ ...prod, unit: esConsumo ? 'CONSUMO' : prod.unit })}
                  disabled={estaAgotado} 
                  className={`p-2 sm:p-2.5 text-left flex flex-col min-w-0 transition-all rounded-none border-2
                    ${isSelected ? 'ring-4 ring-[var(--color-accent)] border-[var(--color-accent)] scale-[1.02] shadow-xl z-10' : ''}
                    ${estaAgotado 
                      ? 'bg-[var(--color-surface)] border-[var(--color-border)] opacity-50 cursor-not-allowed' 
                      : esConsumo
                        ? 'bg-[var(--color-warning-bg)] border-[var(--color-warning-dark)] cursor-pointer hover:shadow-[4px_4px_0_0_var(--color-warning-dark)] hover:-translate-y-1'
                        : prod.unit === 'KG'
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
                          : prod.unit === 'KG'
                            ? 'text-[var(--color-info-dark)] bg-[#F0F9FF] border border-[var(--color-info-dark)]'
                            : 'text-[var(--color-ink)] bg-[var(--color-bg)] border border-[var(--color-ink)]'
                      }`}>
                        {prod.quantity > 0
                          ? `STK: ${formatearCantidad(prod.quantity, prod.unit)} ${prod.unit === 'KG' ? 'KG' : 'UN'}`
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
                          : prod.unit === 'KG'
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