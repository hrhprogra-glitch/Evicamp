import { coincideBusqueda } from '../../../utils/busqueda';
import { BotonEscanerCelular } from '../../../components/BotonEscanerCelular';
import { buscarProductoPorCodigo } from '../../../utils/decodificarBarras';
import { flechasCaja, irA } from '../tecladoCaja';
import React, { useState, useEffect } from 'react';
import { Search, ScanLine, Package, Plus, AlertTriangle, CheckCircle2, Users, X, Scale, Tag, Boxes } from 'lucide-react';
import {formatearCantidad, formatearMonto } from '../../../utils/formato';
import { esDecimal, unidadDe } from '../../../utils/unidades';
import type { Product } from '../../Inventario/types';
import type { Cliente } from '../types';
import { supabase } from '../../../db/supabase';
import { useEmpleado, usePermiso, puedeVerSeccion } from '../../../utils/permisos';
import { useTiposNegocio } from '../../../utils/tiposNegocio';
import { AvisosEncargos } from './AvisosEncargos';
import { fotoDeCache } from '../../../utils/cacheFotos';

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
  const tiposNegocio = useTiposNegocio();
  const puedeVerEncargos = puedeVerSeccion(useEmpleado()?.permisos, 'encargos');

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
  // Celular (18/11/2026): cuando el trabajador toca o desliza los resultados, el teclado debe guardarse y el
  // "imán" del buscador no debe volver a abrirlo. En PC no cambia nada (no hay teclado virtual).
  const resultadosTocados = React.useRef(false);

  const ocultarTeclado = () => {
    resultadosTocados.current = true;
    (document.activeElement as HTMLElement | null)?.blur?.();
  };

  // MOTOR DE BÚSQUEDA ULTRARRÁPIDO
  const filteredProducts = searchQuery.trim() === '' 
    ? [] 
    : productos.filter(p => {
        return coincideBusqueda([p.name, p.code, p.barcode, p.marca, p.modelo, p.medida, p.laboratorio, p.ubicacion], searchQuery);
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
      // El trabajador tocó/deslizó los resultados en el celular: no devolver el foco al buscador
      // (eso reabría el teclado y le tapaba la vista). Se rearma al volver a tocar el buscador.
      if (resultadosTocados.current) return;

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

    if (e.key === 'ArrowUp') {
      const grilla = document.getElementById('productos-grid-pos');
      const columnas = grilla ? (getComputedStyle(grilla).getPropertyValue('grid-template-columns').split(' ').filter((c) => c.trim() !== '').length || 1) : 1;
      if (filteredProducts.length === 0 || selectedIndex < columnas) {
        e.preventDefault();
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
        irA('btn-pos-header-cliente', 'btn-por-cobrar-pos', 'btn-caja-actual-pos');
        return;
      }
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

  // Escáner con cámara del celular: si encuentra el producto con stock, lo agrega directo al ticket
  const handleScanCamara = (codigo: string) => {
    const prod = buscarProductoPorCodigo(productos, codigo);
    if (prod) {
      const esConsumo = prod.unit === 'CONSUMO' || (prod as any).control_type === 'CONSUMPTION';
      const estaAgotado = !esConsumo && prod.quantity <= 0;
      if (!estaAgotado) {
        onAddToCart({ ...prod, unit: esConsumo ? 'CONSUMO' : prod.unit });
        setSearchQuery('');
        return;
      }
    }
    setSearchQuery(codigo);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 tabla-marco relative rounded-none">
      {/* HEADER DE BÚSQUEDA: mismo molde sobrio que Inventario > Productos */}
      <div className="bg-[var(--color-bg)] border-b-2 border-[var(--color-ink)] px-3 sm:px-4 lg:px-6 py-4 sm:py-6 shrink-0 rounded-none">
        {/* Fila 1: título, usuario, hora y Cliente. Fila 2: avisos (Por cobrar, Cotizaciones, Pedidos): en el celular
            tres botones iguales; desde tablet en línea a la derecha; en PC grande (2xl) todo en UNA fila. */}
        <div className="flex flex-col 2xl:flex-row 2xl:items-center 2xl:justify-between gap-2 mb-2">
        <div className="flex flex-wrap items-center justify-between gap-2 min-w-0 2xl:flex-1">
          <div className="shrink-0 flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--color-accent-bg)] border-2 border-[var(--color-accent)] flex items-center justify-center rounded-none shrink-0">
              <ScanLine size={20} className="text-[var(--color-accent)]" />
            </div>
            <h1 className="text-xl lg:text-2xl font-black text-[var(--color-ink)] uppercase tracking-widest whitespace-nowrap">Punto de Venta</h1>
          </div>
          
          <div className="flex flex-wrap items-center justify-end gap-2 lg:gap-3 min-w-0">
            <div className="hidden md:flex items-center min-w-0 border border-[var(--color-border)] pl-2 pr-3 py-1 bg-[var(--color-surface)]">
              <div className="h-2 w-2 bg-[var(--color-accent)] mr-2"></div>
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
                  onKeyDown={flechasCaja('btn-pos-header-cliente')}
                  title="Elegir o cambiar cliente para esta venta (F3 o clic)"
                  className={`boton-cabecera flex items-center whitespace-nowrap border-2 border-[var(--color-ink)] px-1 sm:px-3 2xl:px-4 py-3 text-[10px] lg:text-xs font-black uppercase tracking-normal sm:tracking-wider transition-colors cursor-pointer ${
                    clienteSeleccionado && onLimpiarCliente ? 'border-r-0' : ''
                  }`}
                >
                  <Users size={16} className="mr-1.5" />
                  {clienteSeleccionado ? (
                    <span className="flex items-center gap-1.5">
                      {clienteSeleccionado.esMayorista && (
                        <span className="bg-[var(--color-warning)] text-[var(--color-ink)] px-1 text-[9px] font-black rounded-none">MAY</span>
                      )}
                      {clienteSeleccionado.descuentoPorcentaje != null && clienteSeleccionado.descuentoPorcentaje > 0 && (
                        <span className="bg-[var(--color-success)] text-[var(--color-surface)] px-1 text-[9px] font-black rounded-none">-{clienteSeleccionado.descuentoPorcentaje}%</span>
                      )}
                      <span>
                        CLI: <span className="text-[var(--color-accent-dark)] font-black">{clienteSeleccionado.nombre}</span>{' '}
                        <span className="text-[10px] text-[var(--color-subtle)]">(F3)</span>
                      </span>
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
                    onKeyDown={flechasCaja('btn-limpiar-cliente-pos')}
                    title="Quitar cliente (Shift+F3 o clic en ✕)"
                    className="boton-cabecera border-2 border-[var(--color-ink)] px-1 sm:px-3 py-3 text-[var(--color-muted)] transition-colors cursor-pointer flex items-center justify-center"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

          {(puedeVerFiados || puedeVerEncargos) && (
          <div id="avisos-caja" className="grid grid-flow-col auto-cols-fr gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end 2xl:shrink-0">
            {puedeVerFiados && (
              <button
                // "Por cobrar" abre la sección Clientes directo en la pestaña Créditos
                id="btn-por-cobrar-pos"
                type="button"
                onKeyDown={flechasCaja('btn-por-cobrar-pos')}
                onClick={() => { try { sessionStorage.setItem('clientes_pestana', 'CREDITOS'); } catch { /* sin almacenamiento */ } onNavigate?.('clientes'); }}
                title={fiadosCount > 0 ? 'Hay deudas pendientes por cobrar' : 'Nadie tiene deudas pendientes'}
                className={`boton-cabecera flex items-center justify-center shrink-0 whitespace-nowrap border-2 border-[var(--color-ink)] px-1 sm:px-3 2xl:px-4 py-3 text-[10px] lg:text-xs font-black uppercase tracking-normal sm:tracking-wider transition-colors cursor-pointer ${
                  fiadosCount > 0
                    ? 'text-[var(--color-warning-dark)]'
                    : 'text-[var(--color-accent-dark)]'
                }`}
              >
                {fiadosCount > 0 ? <AlertTriangle size={14} className="mr-1.5 sm:mr-2" /> : <CheckCircle2 size={14} className="mr-1.5 sm:mr-2" />}
                <span className="sm:hidden">Cobrar:&nbsp;</span><span className="hidden sm:inline">Por cobrar:&nbsp;</span>{fiadosCount}
              </button>
            )}

            {/* Encargos (12/11/2026): avisos de cotizaciones y pedidos; abren su pestaña */}
            {puedeVerEncargos && (
              <AvisosEncargos
                conPedidos={tiposNegocio.includes('comercio')}
                onAbrir={(p) => { try { sessionStorage.setItem('encargos_pestana', p); } catch { /* sin almacenamiento */ } onNavigate?.('encargos'); }}
              />
            )}
          </div>
          )}
        </div>

        <div className="flex gap-3">
          <div className="buscador-sobrio w-full shrink-0">
            <div className="buscador-sobrio__icono"><Search size={18} /></div>
            <input id="buscador-global-pos"
              type="text" 
              autoFocus
              placeholder="ESCANEAS AQUÍ, O ESCRIBES NOMBRE/CÓDIGO (Presiona Enter)" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => { resultadosTocados.current = false; }}
              autoComplete="off"
              spellCheck={false}
              autoCorrect="off"
            />
            {searchQuery.trim() !== '' && (
              <div className="buscador-sobrio__match">
                <span className="buscador-sobrio__conteo">{filteredProducts.length} MATCH</span>
                <button type="button" tabIndex={-1} className="buscador-sobrio__borrar" title="Borrar búsqueda" onClick={() => setSearchQuery('')}><X size={14} /></button>
              </div>
            )}
            <BotonEscanerCelular
              id="btn-escaner-pos"
              onScan={handleScanCamara}
              titulo="Escanear producto con la cámara del celular"
              className="w-10 h-full !px-0 !border-0 !border-l !border-[var(--color-border)]"
            />
            {/* Botón de respaldo para esconder el teclado del celular si vuelve a aparecer. Solo en celular. */}
            <button
              id="btn-listo-teclado-pos"
              type="button"
              onClick={ocultarTeclado}
              title="Guardar el teclado del celular"
              data-evitar-iman-teclado
              className="solo-celular-escaner shrink-0 w-10 h-full flex items-center justify-center bg-[var(--color-ink)] text-[var(--color-success)] font-black text-xs border-l border-[var(--color-border)] cursor-pointer rounded-none"
            >
              ✓
            </button>
          </div>
        </div>
      </div>

      {/* ÁREA DE RESULTADOS: al tocar o deslizar se guarda el teclado del celular; el imán del buscador
          ya no lo reabre (18/11/2026). Con mouse/teclado en PC no cambia nada. */}
      <div
        id="resultados-caja"
        data-evitar-iman-teclado
        onTouchStart={ocultarTeclado}
        onScroll={() => { if (window.matchMedia('(pointer: coarse)').matches) ocultarTeclado(); }}
        className="flex-1 min-w-0 w-full p-2 sm:p-3 overflow-y-auto custom-scrollbar flex flex-col bg-[var(--color-bg)]"
      >
        {searchQuery.trim() === '' ? (
          // ESTADO 1: ESPERANDO BÚSQUEDA
          <div className="vacio-sobrio flex-1">
            <Search size={32} />
            <span>Área de Trabajo · sistema a la espera de identificador (SKU, EAN-13 o texto).</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          // ESTADO 2: SIN RESULTADOS
          <div className="vacio-sobrio flex-1">
            <Search size={32} />
            <span>No se registran productos con esos parámetros. Verifique el código.</span>
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
                  className={`tarjeta-sobria p-2 sm:p-2.5 text-left flex flex-col min-w-0 rounded-none focus:outline-none transition-colors
                    ${isSelected ? 'bg-[var(--color-bg-2)] shadow-[inset_0_0_0_2px_var(--color-ink)] z-10' : ''}
                    ${estaAgotado 
                      ? 'opacity-40 cursor-not-allowed' 
                      : 'cursor-pointer hover:bg-[var(--color-bg)]'
                    }
                  `}
                >
                  {/* Fila de arriba: solo el stock (el código/SKU no importa para vender).
                      Siempre de una sola línea, para que la imagen quede en la misma posición
                      en todas las tarjetas. */}
                  <div className="w-full mb-1">
                    {/* Estricto etiquetado de Alto Contraste por Color */}
                    {esConsumo ? (
                      <span className="block w-full text-center text-sm sm:text-base font-black text-[var(--color-ink)] bg-[var(--color-warning)] px-2 py-1.5 uppercase tracking-widest whitespace-nowrap rounded-none">
                        CONSUMO
                      </span>
                    ) : prod.tipoCompuesto === 'COMBO' ? (
                      <span className={`block w-full text-center text-sm sm:text-base font-black px-2 py-1.5 rounded-none uppercase tracking-wide whitespace-nowrap ${
                        estaAgotado
                          ? 'text-[var(--color-muted)] bg-[var(--color-bg)] border border-[var(--color-border)]'
                          : 'text-[var(--color-warning-dark)] bg-[var(--color-warning-bg)] border border-[var(--color-warning)]'
                      }`}>
                        {prod.quantity > 0 ? `COMBO: ${prod.quantity}` : 'COMBO AGOTADO'}
                      </span>
                    ) : (
                      <span className={`block w-full text-center text-sm sm:text-base font-black px-2 py-1.5 rounded-none uppercase tracking-wide whitespace-nowrap ${
                        estaAgotado
                          ? 'text-[var(--color-muted)] bg-[var(--color-bg)] border border-[var(--color-border)]'
                          : esDecimal(prod)
                            ? 'text-[var(--color-info-dark)] bg-[var(--color-info-bg)] border border-[var(--color-border)]'
                            : 'text-[var(--color-ink)] bg-[var(--color-bg)] border border-[var(--color-border)]'
                      }`}>
                        {prod.quantity > 0
                          ? `STK: ${formatearCantidad(prod.quantity, prod.unit)} ${unidadDe(prod).corto === 'UND' ? 'UN' : unidadDe(prod).corto}`
                          : 'AGOTADO'
                        }
                      </span>
                    )}
                  </div>
                  
                  {/* BLOQUE IMAGEN + NOMBRE: contenedor de foto con color distintivo según Kilo / Consumo / Unidad */}
                  <div className="w-full flex flex-col gap-1 sm:gap-1.5 h-[122px] sm:h-[146px] mb-1.5 sm:mb-2">
                    {(() => {
                      const img = (prod as any).image_url || fotoDeCache(prod.id) || (prod as any).image_path || '';
                      const valida = img.startsWith('http') || img.startsWith('data:');
                      const marcoColor = 'border-[var(--color-border)] bg-[var(--color-bg)]';

                      return (
                        <div className={`flex-1 min-h-0 flex items-center justify-center border ${marcoColor} overflow-hidden ${estaAgotado ? 'grayscale' : ''}`}>
                          {valida ? (
                            <img
                              src={img}
                              alt={prod.name}
                              loading="lazy"
                              className="max-w-full max-h-full object-contain"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : esConsumo ? (
                            <div className="flex flex-col items-center justify-center gap-1 text-[var(--color-warning)]">
                              <Tag size={26} />
                              <span className="text-[9px] font-black uppercase tracking-widest">Consumo</span>
                            </div>
                          ) : esDecimal(prod) ? (
                            <div className="flex flex-col items-center justify-center gap-1 text-[var(--color-info)]">
                              <Scale size={26} />
                              <span className="text-[9px] font-black uppercase tracking-widest">Balanza/Kg</span>
                            </div>
                          ) : prod.tipoCompuesto === 'COMBO' ? (
                            <div className="flex flex-col items-center justify-center gap-1 text-[var(--color-warning-dark)]">
                              <Boxes size={26} />
                              <span className="text-[9px] font-black uppercase tracking-widest">Combo / Kit</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-1 text-[var(--color-muted)]">
                              <Package size={26} />
                              <span className="text-[9px] font-black uppercase tracking-widest">Unidad</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    <span className="text-sm sm:text-base font-black text-[var(--color-ink)] uppercase leading-tight line-clamp-2 break-words shrink-0">
                      {prod.name}
                    </span>
                    {Boolean(prod.marca || prod.medida || prod.ubicacion) && (
                      <div className="flex flex-wrap items-center gap-1 text-[10px] font-bold text-[var(--color-muted)] uppercase truncate shrink-0">
                        {prod.marca && <span className="text-[var(--color-ink)]">{prod.marca}</span>}
                        {prod.medida && <span>· {prod.medida}</span>}
                        {prod.ubicacion && <span>· {prod.ubicacion}</span>}
                      </div>
                    )}
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-1.5 border-t border-[var(--color-border)] w-full">
                    {(() => {
                      const descPct = clienteSeleccionado?.descuentoPorcentaje || 0;
                      const esMayorista = Boolean(clienteSeleccionado?.esMayorista);
                      let precioEfectivo = prod.price;
                      if (descPct > 0) {
                        precioEfectivo = Math.round(prod.price * (1 - descPct / 100) * 100) / 100;
                        if (esMayorista && prod.precioMayorista && prod.precioMayorista < precioEfectivo) {
                          precioEfectivo = prod.precioMayorista;
                        }
                      } else if (esMayorista && prod.precioMayorista) {
                        precioEfectivo = prod.precioMayorista;
                      }

                      if (precioEfectivo < prod.price) {
                        return (
                          <div className="flex items-baseline gap-1.5 flex-wrap">
                            <span className="text-base sm:text-lg font-black text-[var(--color-success)] font-mono">
                              S/ {formatearMonto(precioEfectivo)}
                            </span>
                            <span className="text-[11px] line-through text-[var(--color-muted)] font-mono">
                              S/ {formatearMonto(prod.price)}
                            </span>
                          </div>
                        );
                      }
                      return (
                        <span className="text-lg sm:text-xl font-black text-[var(--color-ink)] font-mono">
                          S/ {formatearMonto(prod.price)}
                        </span>
                      );
                    })()}
                    <div className={`w-7 h-7 flex items-center justify-center transition-colors rounded-none border text-xs font-black
                      ${estaAgotado 
                        ? 'bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-subtle)]' 
                        : esConsumo
                          ? 'bg-[var(--color-warning)] text-black border-[var(--color-warning)]'
                          : esDecimal(prod)
                            ? 'bg-[var(--color-info)] text-black border-[var(--color-info)]'
                            : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-ink)]'
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






