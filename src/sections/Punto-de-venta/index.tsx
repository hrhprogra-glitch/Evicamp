import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../db/supabase';
import type { CartItem, Cliente, HeldCart } from './types';
import type { Product } from '../Inventario/types';
import { useRef } from 'react';
import { Wallet, Printer, X, Users } from 'lucide-react';
import { useImprimir } from '../../utils/impresion';
import { useEmpleado, usePermiso } from '../../utils/permisos';
import { conAutorizacion } from '../../utils/autorizacion';
import { esDecimal, unidadDe } from '../../utils/unidades';
import { escalaPara, escalasValidas } from '../../utils/preciosCantidad';
import { conPresentaciones, presentacionesValidas } from '../../utils/presentaciones';
// Componentes modulares
import { TerminalBusqueda } from './components/TerminalBusqueda';
import { TicketVenta } from './components/TicketVenta';
import { ModalCobro } from './components/ModalCobro';
import { ModalBalanza } from './components/ModalBalanza';
import { ModalPrecioConsumo } from './components/ModalPrecioConsumo';
import { TicketImprimible } from './components/TicketImprimible';
import { ModalElegirClientePOS } from './components/ModalElegirClientePOS';
import { ModalNombreEspera } from './components/ModalNombreEspera';
import { ModalCotizacionPOS } from './components/ModalCotizacionPOS';
import { ModalPedidoPOS } from './components/ModalPedidoPOS';
import { traerTodo } from '../../utils/traerTodo';
import { MiniReporteDiario } from './components/MiniReporteDiario'; // 🛡️ EVICAMP: Mini Reporte en Tiempo Real

export const POS: React.FC<{ onNavigate?: (v: string) => void }> = ({ onNavigate }) => {
  const empleado = useEmpleado(); // quién vende: sale en el ticket ("Atendido por")
  const veTotalesCaja = usePermiso('reportes_ver_globales'); // cierre a ciegas: el cajero no ve los montos del día
  const puedeCambiarPrecio = usePermiso('caja_cambiar_precio'); // fase 1.4: sin él, la clave del administrador
  const [hasOpenSession, setHasOpenSession] = useState<boolean | null>(null);
  // En tablet/celular se muestra un panel a la vez: catálogo de productos o ticket de venta
  const [vistaMovil, setVistaMovil] = useState<'productos' | 'ticket'>('productos');
  const [searchQuery, setSearchQuery] = useState('');
  
  // 🚀 MEMORIA PERSISTENTE: Cargar carrito desde el navegador
  const [cart, setCart] = useState<CartItem[]>(() => {
    const guardado = localStorage.getItem('evicamp_cart');
    return guardado ? JSON.parse(guardado) : [];
  });
  
  // 🚀 MEMORIA PERSISTENTE: Cliente seleccionado (opcional, por defecto Cliente Varios)
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(() => {
    const guardado = localStorage.getItem('evicamp_cliente_pos');
    return guardado ? JSON.parse(guardado) : null;
  });
  const [isClienteModalOpen, setIsClienteModalOpen] = useState(false);
  const [isEsperaModalOpen, setIsEsperaModalOpen] = useState(false);
  const [isCotizacionModalOpen, setIsCotizacionModalOpen] = useState(false);
  const [isPedidoModalOpen, setIsPedidoModalOpen] = useState(false);

  useEffect(() => {
    if (clienteSeleccionado) {
      localStorage.setItem('evicamp_cliente_pos', JSON.stringify(clienteSeleccionado));
    } else {
      localStorage.removeItem('evicamp_cliente_pos');
    }
  }, [clienteSeleccionado]);

  // 🚀 MEMORIA PERSISTENTE: Cargar tickets en espera desde el navegador
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>(() => {
    const guardado = localStorage.getItem('evicamp_held_carts');
    if (!guardado) return [];
    try {
      const parsed = JSON.parse(guardado);
      return parsed.map((item: any, idx: number) => {
        if (Array.isArray(item)) {
          return { cart: item, nombre: `T-${idx + 1}`, timestamp: Date.now() };
        }
        return item;
      });
    } catch {
      return [];
    }
  });
  // --- INICIO EVICAMP: MOTOR DE NAVEGACIÓN PRO v4 (Salto de Panel) ---
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [colIndex, setColIndex] = useState<number>(0); 

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Botón de precio por cantidad de la línea (columna 3, entre el precio y borrar): solo si el producto tiene
      // escalas y su precio no se cambió a mano
      const tieneEscala = (i: number) => !!cart[i]?.preciosCantidad?.length && cart[i]?.precioLista === undefined;
      const irDespuesDelPrecio = () => {
        if (tieneEscala(selectedIndex)) { setColIndex(3); setTimeout(() => document.getElementById(`btn-escala-${selectedIndex}`)?.focus(), 10); }
        else setColIndex(2); // ir a borrar
      };
      const enColumnaEscala = (i: number) => {
        if (tieneEscala(i)) document.getElementById(`btn-escala-${i}`)?.focus();
        else { setColIndex(1); document.getElementById(`edit-price-${i}`)?.focus(); }
      };
      // 🛡️ EVICAMP: Ignorar todos los atajos globales si hay alguna ventana flotante (modal) abierta
      if (document.querySelector('[role="dialog"]')) return;

      const target = e.target as HTMLElement;
      const isInputActive = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      const isSearchFocused = target.id === 'buscador-global-pos';

      // 🛡️ ATAJO GLOBAL: Shift + A para rotar tickets en espera (funciona incluso desde el buscador)
      if (e.key.toLowerCase() === 'a' && e.shiftKey) {
        e.preventDefault();
        if (heldCarts.length > 0) {
          let nextIndex = activeTabIndex + 1;
          if (nextIndex >= heldCarts.length) nextIndex = 0; // Volver al inicio si llegamos al final
          
          restoreCart(nextIndex); // restoreCart ya se encarga del in-place swap y de setear activeTabIndex
          
          // 🛡️ Mantenemos el foco en el carrito (primer producto) para seguir rotando sin salir
          setSelectedIndex(0);
          setColIndex(0);
          setTimeout(() => document.getElementById('edit-input-0')?.focus(), 10);
        }
        return;
      }

      // 🛡️ ATAJOS GLOBALES RÁPIDOS (CON SHIFT/MAYÚS)
      if (e.key.toLowerCase() === 'q' && e.shiftKey) {
        e.preventDefault();
        if (cart.length > 0) {
          if (heldCarts.length >= 5) {
            alert("Límite máximo: Tienes 5 tickets en espera. Termina alguno antes de guardar otro.");
            return;
          }
          setIsEsperaModalOpen(true);
        }
        return;
      }
      if (e.key.toLowerCase() === 'w' && e.shiftKey) {
        e.preventDefault();
        if (cart.length > 0) {
          setCart([]);
          setClienteSeleccionado(null);
          setSelectedIndex(-1);
          document.getElementById('buscador-global-pos')?.focus();
        }
        return;
      }
      if (e.key.toLowerCase() === 'e' && e.shiftKey) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('toggle-pos-eye'));
        return;
      }

      // 1. Salto de Panel: De Buscador a Carrito (Derecha o Abajo)
      // 🛡️ PARCHE: Permitir saltar con la flecha derecha si el buscador perdió el foco o si estamos al final del texto buscado
      const isAtEnd = isSearchFocused && (target as HTMLInputElement).selectionStart === (target as HTMLInputElement).value.length;
      const canJumpRight = e.key === 'ArrowRight' && (isAtEnd || !isInputActive) && selectedIndex === -1;
      const canJumpDown = e.key === 'ArrowDown' && isSearchFocused;

      if (canJumpRight || canJumpDown) {
        if (cart.length > 0) {
          target.blur();
          setSelectedIndex(0);
          setColIndex(0);
          e.preventDefault();
          // 🛡️ PARCHE EVICAMP: Forzar foco directo en el input del producto (Cantidad o Precio)
          setTimeout(() => document.getElementById('edit-input-0')?.focus(), 10);
        }
        return;
      }

      // 2. Salto de Panel: De Carrito a Buscador (Izquierda cuando colIndex es 0)
      if (!isInputActive && selectedIndex >= 0 && e.key === 'ArrowLeft' && colIndex === 0) {
        setSelectedIndex(-1);
        const searchInput = document.getElementById('buscador-global-pos');
        searchInput?.focus();
        e.preventDefault();
        return;
      }

      if (selectedIndex >= 0) {
        const input = target as HTMLInputElement;

        // 🛡️ LÓGICA INTELIGENTE DE FLECHAS EN EDICIÓN
        if (isInputActive) {
          // Flechas verticales siempre saltan al siguiente producto
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            input.blur(); 
          } 
          // Lógica de SUPRIMIR (Delete)
          else if (e.key === 'Delete') {
            if (input.value === '' || input.value === '0' || input.value === '0.00') {
              // Si ya está vacío o es 0, eliminamos el producto por completo
              updateQuantity(cart[selectedIndex].id, 0);
              
              // 🛡️ LÓGICA DE FOCO: Pasar al siguiente producto (el que ocupará este índice) 
              // a menos que sea el último de la lista, en cuyo caso retrocedemos 1.
              setSelectedIndex((prev) => prev >= cart.length - 1 ? Math.max(-1, prev - 1) : prev);
              
              setColIndex(0);
              if (cart.length <= 1) document.getElementById('buscador-global-pos')?.focus();
            } else {
              // Si tiene texto, vaciamos el contenido
              input.value = '';
              input.dispatchEvent(new Event('input', { bubbles: true }));
            }
            e.preventDefault();
            return;
          }
          // Flecha derecha salta a la SIGUIENTE columna
          else if (e.key === 'ArrowRight' && input.selectionStart === input.value.length) {
            input.blur();
            if (colIndex === 0) {
              setColIndex(1);
              setTimeout(() => document.getElementById(`edit-price-${selectedIndex}`)?.focus(), 10);
            } else if (colIndex === 1) {
              irDespuesDelPrecio(); // al botón de precio por cantidad (si lo tiene) o a borrar
            }
            e.preventDefault();
            return;
          }
          // Flecha izquierda salta a la ANTERIOR columna
          else if (e.key === 'ArrowLeft' && input.selectionStart === 0) {
            input.blur();
            if (colIndex === 1) {
              setColIndex(0);
              setTimeout(() => document.getElementById(`edit-input-${selectedIndex}`)?.focus(), 10);
            } else if (colIndex === 0) {
              setSelectedIndex(-1);
              document.getElementById('buscador-global-pos')?.focus();
            }
            e.preventDefault();
            return;
          }
          // Si no es ninguna de esas, dejamos que la flecha mueva el cursor adentro del número
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            return; 
          }
        }

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex((prev) => {
            const next = Math.min(prev + 1, cart.length); // 🛡️ Permite bajar hasta el botón de Pagar (cart.length)
            setTimeout(() => {
              if (next === cart.length) {
                document.getElementById('btn-proceder-pago')?.focus();
              } else {
                if (colIndex === 0) document.getElementById(`edit-input-${next}`)?.focus();
                else if (colIndex === 1) document.getElementById(`edit-price-${next}`)?.focus();
                else if (colIndex === 3) enColumnaEscala(next);
              }
            }, 10);
            return next;
          });
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (selectedIndex === 0) {
            setSelectedIndex(-1);
            document.getElementById('buscador-global-pos')?.focus();
          } else {
            setSelectedIndex((prev) => {
              const next = prev - 1;
              setTimeout(() => {
                if (colIndex === 0) document.getElementById(`edit-input-${next}`)?.focus();
                else if (colIndex === 1) document.getElementById(`edit-price-${next}`)?.focus();
                else if (colIndex === 2) document.getElementById(`btn-del-${next}`)?.focus(); // (Opcional, en caso de estar en la columna 2)
                else if (colIndex === 3) enColumnaEscala(next);
              }, 10);
              return next;
            });
          }
          return;
        }
        
        // Navegación manual cuando no hay input activo (ej. colIndex = 2 Borrar, 3 = botón de precio por cantidad)
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          if (colIndex === 0) {
            setColIndex(1);
            setTimeout(() => document.getElementById(`edit-price-${selectedIndex}`)?.focus(), 10);
          } else if (colIndex === 1) {
            irDespuesDelPrecio();
          } else if (colIndex === 3) {
            (document.activeElement as HTMLElement | null)?.blur();
            setColIndex(2);
          }
          return;
        }
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          if (colIndex === 2 && tieneEscala(selectedIndex)) {
            setColIndex(3);
            setTimeout(() => document.getElementById(`btn-escala-${selectedIndex}`)?.focus(), 10);
          } else if (colIndex === 2 || colIndex === 3) {
            setColIndex(1);
            setTimeout(() => document.getElementById(`edit-price-${selectedIndex}`)?.focus(), 10);
          } else if (colIndex === 1) {
            setColIndex(0);
            setTimeout(() => document.getElementById(`edit-input-${selectedIndex}`)?.focus(), 10);
          }
          return;
        }
        
        // Enter en el botón de precio por cantidad: lo prende o lo apaga en esta línea
        if (e.key === 'Enter' && colIndex === 3) {
          e.preventDefault();
          if (cart[selectedIndex]) alternarEscala(cart[selectedIndex].id);
          return;
        }

        // Acción de Borrar (con Enter sobre el tacho, o con Suprimir en cualquier parte de la fila que no sea input)
        if ((e.key === 'Enter' && colIndex === 2) || (e.key === 'Delete' && !isInputActive)) {
          e.preventDefault();
          updateQuantity(cart[selectedIndex].id, 0);
          
          // 🛡️ LÓGICA DE FOCO: Pasar al siguiente producto, o al anterior si era el último
          setSelectedIndex((prev) => prev >= cart.length - 1 ? Math.max(-1, prev - 1) : prev);
          
          setColIndex(0); // Forzamos el regreso a la columna de Cantidad
          if (cart.length <= 1) document.getElementById('buscador-global-pos')?.focus();
          return;
        }

        // 🚀 ESCRITURA DIRECTA: Enfocar el input del producto seleccionado (selectedIndex)
        if (/^[0-9]$/.test(e.key) && !isInputActive && selectedIndex >= 0) {
          e.preventDefault(); // Evitamos que el primer número se pierda
          setTimeout(() => {
            const input = document.getElementById(`edit-input-${selectedIndex}`) as HTMLInputElement;
            if (input) {
              input.focus();
              // Asignación directa
              input.value = e.key; 
              // 🛡️ PARCHE EVICAMP: Forzar a React a leer el evento para liberar el cursor ("palito")
              input.dispatchEvent(new Event('input', { bubbles: true }));
            }
          }, 10);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, selectedIndex, colIndex, heldCarts]);

  // Modificamos el envío al TicketVenta para incluir el colIndex
  // --- FIN EVICAMP ---
  const [productos, setProductos] = useState<Product[]>([]);
  // Fase 1.2: para buscar y vender, cada presentación (CAJA x12…) es otro "producto" (src/utils/presentaciones.ts)
  const productosVenta = React.useMemo(() => conPresentaciones(productos), [productos]);
  const [isVistaPreviaOpen, setIsVistaPreviaOpen] = useState(false);
  // NUEVO: Estados para la impresión de la última boleta
  const [ultimaVenta, setUltimaVenta] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false); // 🛡️ CANDADO MAESTRO ANTI-DUPLICADOS
  const [refreshReport, setRefreshReport] = useState(0); // 🛡️ EVICAMP: Disparador del mini reporte
  

  
  const [activeTabIndex, setActiveTabIndex] = useState(-1); // 🛡️ EVICAMP: Índice del ticket en espera que está activo actualmente
  
  const [isCobroModalOpen, setIsCobroModalOpen] = useState(false);

  // 🔥 EFECTOS DE AUTOGUARDADO: Guardar automáticamente cada vez que cambien
  useEffect(() => {
    localStorage.setItem('evicamp_cart', JSON.stringify(cart));
  }, [cart]);

  // 🛡️ EVICAMP: Foco magnético global al hacer clic.
  // Si el usuario hace clic en el aire (no en un input o botón), el buscador recupera el foco automáticamente.
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      // Ignorar si hay una ventana modal abierta
      if (document.querySelector('[role="dialog"]')) return;
      
      const target = e.target as HTMLElement;
      // Verificamos si hizo clic en un elemento interactivo nativo
      const isInteractive = 
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.tagName === 'SELECT' || 
        target.tagName === 'BUTTON' || 
        target.closest('button');

      // Solo si hizo clic en el "aire" o en texto estático (como el título de la CAJA ACTUAL)
      if (!isInteractive) {
        // Evitamos robar el foco si el usuario está seleccionando texto para copiarlo
        if (window.getSelection()?.toString().length === 0) {
          const buscador = document.getElementById('buscador-global-pos');
          if (buscador) buscador.focus();
        }
      }
    };
    
    document.addEventListener('mouseup', handleGlobalClick);
    return () => document.removeEventListener('mouseup', handleGlobalClick);
  }, []);

  useEffect(() => {
    localStorage.setItem('evicamp_held_carts', JSON.stringify(heldCarts));
  }, [heldCarts]);
  const [isBalanzaModalOpen, setIsBalanzaModalOpen] = useState(false); // <-- NUEVO
  const [selectedWeightProduct, setSelectedWeightProduct] = useState<Product | null>(null);
  const [isPrecioModalOpen, setIsPrecioModalOpen] = useState(false); // <-- NUEVO
  const [selectedConsumoProduct, setSelectedConsumoProduct] = useState<Product | null>(null); // <-- NUEVO
  const componentRef = useRef<HTMLDivElement>(null);

  // En la app de escritorio imprime directo; en el navegador abre la ventana de impresión
  const handlePrint = useImprimir(componentRef, 'Boleta de Venta');

  // 🔥 NUEVO: ATAJOS DE TECLADO GLOBALES (F2, F3, F4, ESCAPE)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 1. ESCAPE: Cierra cualquier ventana modal abierta al instante
      if (e.key === 'Escape') {
        setIsCobroModalOpen(false);
        setIsBalanzaModalOpen(false);
        setIsPrecioModalOpen(false);
        setIsVistaPreviaOpen(false);
        setIsClienteModalOpen(false);
        setIsEsperaModalOpen(false);
        setIsCotizacionModalOpen(false);
        setIsPedidoModalOpen(false);
        setSelectedWeightProduct(null);
        setSelectedConsumoProduct(null);
      }

      // 2. ENTER con la vista previa del ticket abierta = "Nueva Venta": cierra y deja el buscador listo.
      // preventDefault evita que Enter también active el botón que tenga el foco (p. ej. Imprimir).
      // Si el selector está en "Imprimir", Enter imprime (lo hace el propio botón).
      if (e.key === 'Enter' && isVistaPreviaOpen && !e.repeat && document.activeElement?.id !== 'vista-btn-imprimir') {
        e.preventDefault();
        setIsVistaPreviaOpen(false);
        setTimeout(() => document.getElementById('buscador-global-pos')?.focus(), 50);
        return;
      }

      // 3. F3: Seleccionar cliente para la venta / Shift+F3: Quitar cliente
      if (e.key === 'F3') {
        e.preventDefault();
        if (e.shiftKey) {
          if (clienteSeleccionado) {
            setClienteSeleccionado(null);
          }
          return;
        }
        if (!isCobroModalOpen && !isBalanzaModalOpen && !isPrecioModalOpen && !isVistaPreviaOpen && !isEsperaModalOpen && !isClienteModalOpen && !isCotizacionModalOpen && !isPedidoModalOpen) {
          setIsClienteModalOpen(true);
        }
        return;
      }

      // 4. F2 o F4: Proceder al Pago Inmediato desde cualquier parte de la pantalla
      if (e.key === 'F2' || e.key === 'F4') {
        e.preventDefault(); // Evita el comportamiento por defecto del navegador web
        // Solo abrimos la ventana de pago si hay algo en el carrito y no hay otros modales encima
        if (cart.length > 0 && !isCobroModalOpen && !isBalanzaModalOpen && !isPrecioModalOpen && !isVistaPreviaOpen && !isClienteModalOpen && !isEsperaModalOpen && !isCotizacionModalOpen && !isPedidoModalOpen) {
          setIsCobroModalOpen(true);
        }
      }

      // 5. F7: Guardar como Cotización / Proforma
      if (e.key === 'F7') {
        e.preventDefault();
        if (cart.length > 0 && !isCobroModalOpen && !isBalanzaModalOpen && !isPrecioModalOpen && !isVistaPreviaOpen && !isClienteModalOpen && !isEsperaModalOpen && !isCotizacionModalOpen && !isPedidoModalOpen) {
          setIsCotizacionModalOpen(true);
        }
      }

      // 6. F8: Guardar como Pedido por Encargo
      if (e.key === 'F8') {
        e.preventDefault();
        if (cart.length > 0 && !isCobroModalOpen && !isBalanzaModalOpen && !isPrecioModalOpen && !isVistaPreviaOpen && !isClienteModalOpen && !isEsperaModalOpen && !isCotizacionModalOpen && !isPedidoModalOpen) {
          setIsPedidoModalOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [cart.length, isCobroModalOpen, isBalanzaModalOpen, isPrecioModalOpen, isVistaPreviaOpen, isClienteModalOpen, isEsperaModalOpen, isCotizacionModalOpen, isPedidoModalOpen]);

  // 1. CARGAR PRODUCTOS AL ABRIR LA VENTANA
  const fetchProducts = useCallback(async () => {
    // Bloqueo de Seguridad: Verificar Caja
    const { data: session } = await supabase.from('cash_sessions').select('id, opened_at').eq('status', 'OPEN').maybeSingle();
    // Una caja abierta sigue sirviendo aunque sea de otro día: se cierra cuando el negocio decide
    // (antes se bloqueaba la venta si la caja era del día anterior)
    setHasOpenSession(!!session);
    // Supabase devuelve máximo 1000 filas por consulta: traerTodo las pide por bloques
    const { data } = await traerTodo(() => supabase.from('products')
      .select('*')
      .eq('is_active', 1) // 🛡️ EVICAMP: Bloqueo de productos fantasma directo en el motor de BD
      .order('name', { ascending: true })
      .order('id'));
      
    if (data) {
      const mapeados: Product[] = data.map((p: any) => ({
        id: p.id,
        name: p.name || 'SIN NOMBRE',
        price: Number(p.price) || 0,
        precioMayorista: p.precio_mayorista != null && !isNaN(Number(p.precio_mayorista)) ? Number(p.precio_mayorista) : undefined,
        cost: Number(p.cost_price) || 0,
        quantity: Number(p.quantity) || 0,
        minStock: Number(p.min_stock) || 0,
        code: p.code || 'NO-SKU',
        barcode: p.barcode || '',
        category: p.category || 'GENERAL',
        // CORRECCIÓN ESTRATÉGICA: Interceptar 'CONSUMPTION' desde la BD
        unit: p.control_type === 'CONSUMPTION' ? 'CONSUMO' : (p.unit || p.weight_unit || (p.control_type === 'WEIGHT' ? 'KG' : 'UND')),
        control_type: p.control_type, // Añadimos esto para validaciones estrictas
        preciosCantidad: escalasValidas(p.precios_cantidad), // fase 1.3: precios por cantidad
        presentaciones: presentacionesValidas(p.presentaciones), // fase 1.2: caja, paquete…
        image_url: p.image_url || p.image_path || null // imagen para identificar el producto en las tarjetas
      } as Product));
      setProductos(mapeados);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Fase 1.3 y 4.4: la línea con su cantidad y el precio que le toca (mayorista o escala "desde N").
  // Si el precio se cambió a mano (fase 1.4) no se toca. precioBase = el precio normal.
  const conCantidad = (item: CartItem, qty: number, mayoristaOverride?: boolean): CartItem => {
    const base = item.precioBase ?? item.price;
    if (item.precioLista !== undefined) return { ...item, precioBase: base, cartQuantity: qty, subtotal: Math.round((qty * item.price) * 100) / 100 };
    
    const esMayorista = mayoristaOverride !== undefined ? mayoristaOverride : Boolean(clienteSeleccionado?.esMayorista);
    if (esMayorista && item.precioMayorista != null && item.precioMayorista > 0) {
      const precio = item.precioMayorista;
      return {
        ...item,
        precioBase: base,
        cartQuantity: qty,
        price: precio,
        escala: undefined,
        esMayoristaAplicado: true,
        subtotal: Math.round((qty * precio) * 100) / 100
      };
    }

    const escala = item.sinEscala ? null : escalaPara(item.preciosCantidad, qty); // apagado a mano: precio normal
    const precio = escala ? escala.precio : base;
    return { ...item, precioBase: base, cartQuantity: qty, price: precio, escala: escala?.desde, esMayoristaAplicado: false, subtotal: Math.round((qty * precio) * 100) / 100 };
  };

  // Fase 4.4: Si el cliente cambia o se le activa mayorista, recalcular precios del carrito automáticamente
  useEffect(() => {
    const esMayorista = Boolean(clienteSeleccionado?.esMayorista);
    setCart((prevCart) => {
      let cambio = false;
      const nuevo = prevCart.map((item) => {
        if (item.precioLista !== undefined) return item;
        const actualizado = conCantidad(item, item.cartQuantity, esMayorista);
        if (actualizado.price !== item.price || actualizado.esMayoristaAplicado !== item.esMayoristaAplicado) {
          cambio = true;
          return actualizado;
        }
        return item;
      });
      return cambio ? nuevo : prevCart;
    });
  }, [clienteSeleccionado?.id, clienteSeleccionado?.esMayorista]);

  // 2. FUNCIÓN PARA DISPARAR PRODUCTOS AL CARRITO (CON BALANZA Y CONSUMO)
  const handleAddToCart = (producto: Product) => {
    // BLOQUEO DE SEGURIDAD: Solo consultar, no vender si está cerrado
    if (hasOpenSession === false) {
      alert("🔒 CAJA CERRADA: Modo Consulta activado. Ve a la pestaña de Finanzas y apertura la caja para poder vender.");
      return;
    }

    // Si se vende con decimales (kilo, litro, metro…: fase 1.1), abrir la ventana de "¿cuánto?"
    if (esDecimal(producto)) {
      setSelectedWeightProduct(producto);
      setIsBalanzaModalOpen(true);
      setSearchQuery('');
      return;
    }

    // NUEVO: Si es consumo, pedir el precio
    if (producto.unit === 'CONSUMO') {
      setSelectedConsumoProduct(producto);
      setIsPrecioModalOpen(true);
      setSearchQuery('');
      return;
    }

    // 🛡️ Extraemos la verificación fuera del setCart
    const existe = cart.find(item => item.id === producto.id);
    const nuevaQty = existe ? existe.cartQuantity + 1 : 1;
    
    // Fase 1.2: el stock se revisa en UNIDADES del producto real, sumando sueltas y presentaciones (1 CAJA x12 = 12)
    const idReal = String(producto.productoId ?? producto.id);
    const stockReal = productos.find((p) => String(p.id) === idReal)?.quantity ?? producto.quantity;
    const unidadesEnCarrito = cart.filter((i) => String(i.productoId ?? i.id) === idReal).reduce((t, i) => t + i.cartQuantity * (i.presentacion?.factor ?? 1), 0);
    if (unidadesEnCarrito + (producto.presentacion?.factor ?? 1) > stockReal && producto.unit !== 'CONSUMO') {
      alert(`🚫 STOCK INSUFICIENTE: Solo tienes ${stockReal} en stock de ${producto.productoId ? producto.name.replace(/ \([^)]*\)$/, '') : producto.name}.`);
      return;
    }

    // Flujo normal para unidades
    setCart(prevCart => {
      const existePrev = prevCart.find(item => item.id === producto.id);
      if (existePrev) {
        return prevCart.map(item => 
          item.id === producto.id 
            ? conCantidad(item, nuevaQty)
            : item
        );
      } else {
        return [conCantidad({ ...producto, cartQuantity: 0, subtotal: 0 }, 1), ...prevCart];
      }
    });
    setSearchQuery(''); 
  };

  // 2.1 CONFIRMAR PESO DESDE LA BALANZA
  const handleConfirmWeight = (weight: number) => {
    if (!selectedWeightProduct) return;
    
    // 🛡️ Extraemos la verificación de la balanza fuera del setCart
    const existe = cart.find(item => item.id === selectedWeightProduct.id);
    const nuevaQty = existe ? existe.cartQuantity + weight : weight;
    
    // 🛡️ CANDADO 2: Bloquear si el peso que pidió supera los kilos en inventario
    if (nuevaQty > selectedWeightProduct.quantity && selectedWeightProduct.unit !== 'CONSUMO') {
      alert(`🚫 STOCK INSUFICIENTE: Solo tienes ${selectedWeightProduct.quantity} ${unidadDe(selectedWeightProduct).corto} de ${selectedWeightProduct.name}.`);
      return; // Cancela la acción por completo
    }

    setCart(prevCart => {
      const existePrev = prevCart.find(item => item.id === selectedWeightProduct.id);
      if (existePrev) {
        return prevCart.map(item => item.id === selectedWeightProduct.id ? conCantidad(item, nuevaQty) : item);
      } else {
        return [conCantidad({ ...selectedWeightProduct, cartQuantity: 0, subtotal: 0 }, weight), ...prevCart];
      }
    });
    setSelectedWeightProduct(null);
    setIsBalanzaModalOpen(false);
    setTimeout(() => document.getElementById('buscador-global-pos')?.focus(), 100);
  };

  // 2.2 CONFIRMAR PRECIO MANUAL (CONSUMO)
  const handleConfirmPrecio = (precio: number, cantidad: number) => {
    if (!selectedConsumoProduct) return;
    
    setCart(prevCart => {
      const existe = prevCart.find(item => item.id === selectedConsumoProduct.id);
      if (existe) {
        const nuevaQty = existe.cartQuantity + cantidad;
        return prevCart.map(item => 
          item.id === selectedConsumoProduct.id 
            ? { ...item, price: precio, cartQuantity: nuevaQty, subtotal: Math.round((precio * nuevaQty) * 100) / 100 } 
            : item
        );
      } else {
        return [{ ...selectedConsumoProduct, cartQuantity: cantidad, price: precio, subtotal: Math.round((precio * cantidad) * 100) / 100 }, ...prevCart];
      }
    });
    
    setSelectedConsumoProduct(null);
    setIsPrecioModalOpen(false); 
    setTimeout(() => document.getElementById('buscador-global-pos')?.focus(), 100);
  };

  // 2.3 EDITAR PRECIO MANUALMENTE DESDE EL TICKET (fase 1.4): con el permiso "Cambiar Precio al Cobrar" se cambia
  // directo; sin él, se pide la clave del administrador (como al anular). Queda el precio de lista y quién lo cambió,
  // y se guarda en el detalle de la venta (precio_lista / precio_cambiado_por). Devuelve false si no se cambió.
  const updatePrice = async (id: string, newPrice: number): Promise<boolean> => {
    const item = cart.find((i) => i.id === id);
    if (!item || newPrice === item.price) return true;
    const aplicar = (autorizo: string | null) => setCart((prevCart) => prevCart.map((i) => {
      if (i.id !== id) return i;
      const lista = i.precioLista ?? i.price;
      const vuelveALista = newPrice === lista;
      return { ...i, price: newPrice, subtotal: Math.round((newPrice * i.cartQuantity) * 100) / 100,
        precioLista: vuelveALista ? undefined : lista, precioCambiadoPor: vuelveALista ? null : (autorizo || empleado?.nombre || null) };
    }));
    let hecho = false;
    await conAutorizacion(`cambiar el precio de ${item.name}`, 'caja_cambiar_precio', puedeCambiarPrecio, async (autorizo) => { aplicar(autorizo); hecho = true; });
    return hecho;
  };

  // Prender o apagar el precio por cantidad de una línea (botón "x6+" de la línea; con teclado: → desde el precio y Enter)
  const alternarEscala = (id: string) => {
    setCart((prev) => prev.map((item) => (item.id === id ? conCantidad({ ...item, sinEscala: !item.sinEscala }, item.cartQuantity) : item)));
  };

  // 3. EDITAR CANTIDAD MANUALMENTE (+ / - o PESO)
  const updateQuantity = (id: string, newQty: number) => {
    // 🛡️ Extraemos la alerta fuera del setCart para evitar que React la dispare 2 veces en su ciclo de renderizado
    const itemInCart = cart.find(i => i.id === id);
    let finalQty = newQty;

    // Fase 1.2: el stock se revisa en UNIDADES del producto real, sumando las OTRAS líneas del mismo producto
    // (sueltas y presentaciones). Antes cada línea se miraba sola: 8 paquetes x25 + 200 sueltas pasaban con 200 en stock.
    if (itemInCart && itemInCart.unit !== 'CONSUMO') {
      const idReal = String(itemInCart.productoId ?? itemInCart.id);
      const factor = itemInCart.presentacion?.factor ?? 1;
      const stockReal = productos.find((p) => String(p.id) === idReal)?.quantity ?? itemInCart.quantity;
      const otras = cart.filter((i) => i.id !== id && String(i.productoId ?? i.id) === idReal)
        .reduce((t, i) => t + i.cartQuantity * (i.presentacion?.factor ?? 1), 0);
      if (otras + finalQty * factor > stockReal) {
        const disponible = Math.max(0, stockReal - otras);
        // Lo que todavía entra en esta línea (en paquetes enteros si es una presentación)
        const maximo = factor > 1 ? Math.floor(disponible / factor) : (esDecimal(itemInCart) ? Math.round(disponible * 1000) / 1000 : Math.floor(disponible));
        const nombre = itemInCart.productoId ? itemInCart.name.replace(/ \([^)]*\)$/, '') : itemInCart.name;
        alert(otras > 0
          ? `🚫 STOCK INSUFICIENTE: Solo tienes ${stockReal} de ${nombre} y ya hay ${otras} en otras líneas del ticket. En esta línea entran ${maximo}.`
          : `🚫 STOCK INSUFICIENTE: Solo tienes ${stockReal} de ${nombre}.${factor > 1 ? ` En esta línea entran ${maximo}.` : ''}`);
        finalQty = maximo;
      }
    }

    setCart(prevCart => {
      if (finalQty <= 0) {
        return prevCart.filter(item => item.id !== id);
      }
      return prevCart.map(item => {
        if (item.id === id) {
          return conCantidad(item, finalQty);
        }
        return item;
      });
    });
  };
  // 4. NUEVO: PONER TICKET EN ESPERA (Guardar Caja con Nombre)
  const holdCurrentCart = () => {
    if (cart.length > 0) {
      if (heldCarts.length >= 5) {
        alert("Límite máximo: Tienes 5 tickets en espera. Termina alguno antes de guardar otro.");
        return;
      }
      setIsEsperaModalOpen(true);
    }
  };

  const handleConfirmarEspera = (nombre: string) => {
    const nuevoHeld: HeldCart = {
      cart,
      cliente: clienteSeleccionado,
      nombre: nombre.trim() || clienteSeleccionado?.nombre || `T-${heldCarts.length + 1}`,
      timestamp: Date.now()
    };
    setHeldCarts(prev => [...prev, nuevoHeld]);
    setCart([]);
    setClienteSeleccionado(null);
    setActiveTabIndex(-1);
    setIsEsperaModalOpen(false);
    setTimeout(() => document.getElementById('buscador-global-pos')?.focus(), 50);
  };

  // 5. NUEVO: RECUPERAR TICKET EN ESPERA (Swap In-Place con Cliente)
  const restoreCart = (index: number) => {
    const restored = heldCarts[index];
    const restoredCart = Array.isArray(restored) ? restored : (restored.cart || []);
    const restoredCliente = Array.isArray(restored) ? null : (restored.cliente || null);
    const newHeld = [...heldCarts];
    
    // Intercambio en la misma posición (in-place) para que los botones no salten
    if (cart.length > 0) {
      newHeld[index] = {
        cart,
        cliente: clienteSeleccionado,
        nombre: clienteSeleccionado?.nombre || `T-${index + 1}`,
        timestamp: Date.now()
      };
    } else {
      newHeld.splice(index, 1);
    }
    
    setHeldCarts(newHeld);
    setCart(restoredCart);
    setClienteSeleccionado(restoredCliente);
    setActiveTabIndex(index); // Actualizar el índice para que brille permanente
  };
  // 6. PROCESAR PAGO (GUARDA VENTA, REDUCE STOCK Y REGISTRA FIADOS)
  const handleConfirmPayment = async (
    pagos: { efectivo: number, yape: number, tarjeta: number },
    imprimirBoleta: boolean,
    fiadoData?: any 
  ) => {
    if (isSubmitting) return; // 🛡️ BLOQUEO ANTI-DUPLICADOS
    
    setIsSubmitting(true);
    
    try {
      // 🛡️ MATEMÁTICA EXACTA CON CÉNTIMOS PARA LA BASE DE DATOS
      const totalVentaCents = Math.round(cart.reduce((a, b) => a + b.subtotal, 0) * 100);
      const totalIngresadoCents = Math.round((pagos.efectivo + pagos.yape + pagos.tarjeta) * 100);
      
      const totalVenta = totalVentaCents / 100;
      
      let vuelto = 0;
      if (totalIngresadoCents > totalVentaCents) {
        vuelto = (totalIngresadoCents - totalVentaCents) / 100;
      }

      // 🛡️ VUELTO: físicamente solo sale del cajón en efectivo. ModalCobro no deja que
      // Yape + tarjeta superen el total, así que esos montos se guardan tal cual se pagaron
      // y el vuelto se descuenta únicamente del efectivo (lo cobrado nunca supera el total).
      const cobradoEfectivo = Math.max(0, Math.round(pagos.efectivo * 100) - Math.round(vuelto * 100)) / 100;
      const cobradoYape = Math.round(pagos.yape * 100) / 100;
      const cobradoTarjeta = Math.round(pagos.tarjeta * 100) / 100;
      const montoCredito = fiadoData ? Number(fiadoData.montoDeuda) || 0 : 0;

      // 🛡️ DETECCIÓN DEL MÉTODO DE PAGO: un solo método usado => ese método;
      // 2 o más (contando la parte fiada) => MIXTO. 'FIADO' solo cuando no se cobró nada al
      // momento: Finanzas y el Mini Reporte ignoran los montos de ventas 'FIADO', así que una
      // venta con parte cobrada nunca debe llevar esa etiqueta.
      const metodosUsados = [
        cobradoEfectivo > 0 ? 'EFECTIVO' : null,
        cobradoYape > 0 ? 'YAPE' : null,
        cobradoTarjeta > 0 ? 'TARJETA' : null,
        montoCredito > 0 ? 'FIADO' : null,
      ].filter((m): m is string => m !== null);
      let tipoPago = 'EFECTIVO';
      if (metodosUsados.length === 1) tipoPago = metodosUsados[0];
      else if (metodosUsados.length > 1) tipoPago = 'MIXTO';

      // === REGISTRO DE VENTA (inserciones directas) ===
      const trueSaleId = Date.now();
      const finalCustomerId = fiadoData?.clienteId
        ? Number(fiadoData.clienteId)
        : clienteSeleccionado?.id
        ? Number(clienteSeleccionado.id)
        : null;
      const finalCustomerName = fiadoData?.clienteNombre || clienteSeleccionado?.nombre || null;

      const { error: saleError } = await supabase.from('sales').insert([{
        id: trueSaleId,
        total: totalVenta,
        payment_type: tipoPago,
        amount_cash: cobradoEfectivo,
        amount_yape: cobradoYape,
        amount_card: cobradoTarjeta,
        amount_credit: montoCredito,
        customer_id: finalCustomerId,
        customer_name: finalCustomerName,
        sunat_status: 'ACEPTADO',
        created_at: new Date().toISOString(),
        is_synced: 1
      }]);

      if (saleError) {
        alert('❌ No se pudo registrar la venta. No se guardó nada; el ticket sigue en caja para reintentar.\n\nDetalle: ' + saleError.message);
        return;
      }

      // Fase 4.5: Si la venta proviene de una cotización/proforma, marcarla como CONVERTIDA
      const cotiActiva = sessionStorage.getItem('evicamp_coti_activa');
      if (cotiActiva) {
        try {
          await supabase.from('cotizaciones').update({ estado: 'CONVERTIDA', sale_id: trueSaleId }).eq('id', Number(cotiActiva));
          sessionStorage.removeItem('evicamp_coti_activa');
        } catch (e) {
          console.error('Error actualizando cotización a CONVERTIDA:', e);
        }
      }

      // Fiado (solo si quedó parte o todo al crédito)
      if (fiadoData) {
        const { error: fiadoError } = await supabase.from('fiados').insert([{
          id: trueSaleId + 1,
          sale_id: trueSaleId,
          customer_id: fiadoData.clienteId ? Number(fiadoData.clienteId) : null,
          customer_name: fiadoData.clienteNombre,
          amount: montoCredito,
          paid_amount: 0,
          date_given: new Date().toISOString(),
          expected_pay_date: fiadoData.fechaVencimiento,
          status: 'PENDIENTE',
          is_synced: 1
        }]);
        if (fiadoError) {
          alert('⚠️ La venta se guardó, pero no se pudo registrar la deuda (fiado). Avisa a soporte técnico.\n\nDetalle: ' + fiadoError.message);
        }
      }

      // Fase 1.2: una presentación (CAJA x12) se guarda en UNIDADES del producto real (el stock baja 12 por caja),
      // con el precio por unidad; cuántas cajas y cuál queda en presentacion / presentacion_cantidad
      const saleDetails = cart.map(item => ({
        sale_id: trueSaleId,
        product_id: item.productoId ?? item.id,
        product_name: item.name,
        quantity: Number(item.cartQuantity) * (item.presentacion?.factor ?? 1),
        price_at_moment: item.presentacion ? Math.round((Number(item.price) / item.presentacion.factor) * 10000) / 10000 : Number(item.price),
        presentacion: item.presentacion?.nombre ?? null,
        presentacion_cantidad: item.presentacion ? Number(item.cartQuantity) : null,
        // fase 1.4: si se cambió el precio al cobrar, el de lista y quién lo cambió (si no, vacíos)
        precio_lista: item.precioLista ?? null,
        precio_cambiado_por: item.precioLista !== undefined ? (item.precioCambiadoPor ?? null) : null,
        subtotal: Number(item.subtotal),
        is_synced: 1
      }));

      const { error: detailError } = await supabase.from('sale_details').insert(saleDetails);
      if (detailError) {
        console.error('Fallo al guardar el detalle de productos:', detailError.message);
        alert('⚠️ La venta se guardó, pero no se pudo registrar el detalle de productos (el stock no se descontó). Avisa a soporte técnico.\n\nDetalle: ' + detailError.message);
      }

      // Solo descontamos el stock visual si no hubo error (si sale_details falló, el trigger
      // fn_reduce_stock_from_sales nunca corrió en la BD: mostrar el descuento igual aquí
      // dejaría la pantalla "sin stock" de un producto que en realidad no se movió).
      if (!detailError) {
        setProductos(prevProductos =>
          prevProductos.map(p => {
            // Unidades vendidas de este producto: sueltas y en presentaciones (1 CAJA x12 = 12)
            const lineas = cart.filter(i => String(i.productoId ?? i.id) === String(p.id) && i.unit !== 'CONSUMO');
            if (!lineas.length) return p;
            const unidades = lineas.reduce((t, i) => t + Number(i.cartQuantity) * (i.presentacion?.factor ?? 1), 0);
            return { ...p, quantity: p.quantity - unidades };
          })
        );
      }

      // === PASO 4: TICKET Y LIMPIEZA ===
      if (imprimirBoleta) {
        setUltimaVenta({
          cart: [...cart],
          total: totalVenta,
          pagos: { efectivo: pagos.efectivo, yape: pagos.yape, tarjeta: pagos.tarjeta },
          vuelto: vuelto,
          nroBoleta: `B001-${String(trueSaleId).substring(0,8).padStart(8, '0')}`,
          fiadoData: fiadoData,
          cliente: clienteSeleccionado ? {
            nombre: clienteSeleccionado.nombre,
            dni: clienteSeleccionado.dni,
            ruc: clienteSeleccionado.ruc,
            telefono: clienteSeleccionado.telefono,
            direccion: clienteSeleccionado.direccion
          } : null,
          vendedor: empleado?.nombre || null
        });
        setIsVistaPreviaOpen(true);
      } else {
        alert(`✅ Venta completada con éxito.\nVuelto: S/ ${vuelto.toFixed(2)}`);
        // El buscador queda listo para escanear el siguiente producto: ventas corridas sin pausas.
        setTimeout(() => document.getElementById('buscador-global-pos')?.focus(), 50);
      }

      // Limpiar Caja Rápido
      setIsCobroModalOpen(false);
      setCart([]);
      setClienteSeleccionado(null);
      setRefreshReport(prev => prev + 1); // 🛡️ EVICAMP: Actualizar números del reporte al terminar la venta
      
    } catch (err) {
      console.error("Fallo general:", err);
      alert("Se produjo un error procesando la transacción.");
    } finally {
      setIsSubmitting(false); // 🛡️ ABRIR CANDADO AL TERMINAR
    }
  };
  return (
    <div 
      onMouseDown={(e) => {
        // 🛡️ Si haces clic en cualquier zona vacía, limpiamos la selección del carrito
        if ((e.target as HTMLElement).tagName === 'DIV' && (e.target as HTMLElement).classList.contains('bg-transparent')) {
          setSelectedIndex(-1);
        }
      }}
      className={`flex flex-col lg:flex-row h-full w-full bg-transparent font-mono gap-2 lg:gap-0 lg:shadow-[6px_6px_0_0_var(--color-ink)] relative ${hasOpenSession === false ? 'pt-20 sm:pt-16' : ''}`}
    >
      
      {/* BARRA DE ADVERTENCIA - MODO CONSULTA */}
      {hasOpenSession === false && (
        <div className="absolute top-0 left-0 w-full bg-[var(--color-danger)] text-white p-3 flex justify-center items-center text-center gap-2 font-black text-[12px] sm:text-xs uppercase tracking-widest sm:tracking-[0.2em] z-10 shadow-[0_4px_0_0_var(--color-ink)] border-b-2 border-[var(--color-ink)]">
          <Wallet size={16} /> Caja Cerrada: Modo de solo consulta. Ve a Finanzas para aperturar la caja.
        </div>
      )}
      
      {/* SELECTOR DE PANEL (solo tablet/celular) */}
      <div className="lg:hidden grid grid-cols-2 border-2 border-[var(--color-ink)] bg-white shrink-0">
        <button
          onClick={() => setVistaMovil('productos')}
          className={`py-3 text-xs font-black uppercase tracking-widest cursor-pointer transition-colors ${vistaMovil === 'productos' ? 'bg-[var(--color-ink)] text-white' : 'text-[var(--color-muted)]'}`}
        >
          Productos
        </button>
        <button
          onClick={() => setVistaMovil('ticket')}
          className={`py-3 text-xs font-black uppercase tracking-widest cursor-pointer transition-colors flex items-center justify-center gap-2 ${vistaMovil === 'ticket' ? 'bg-[var(--color-ink)] text-white' : 'text-[var(--color-muted)]'}`}
        >
          Ticket
          <span className={`min-w-6 px-1.5 py-0.5 text-[12px] ${cart.length > 0 ? 'bg-[var(--color-accent)] text-[var(--color-ink)]' : 'bg-[var(--color-border)] text-[var(--color-muted)]'}`}>
            {cart.length}
          </span>
          <span className="text-[var(--color-accent)]">S/ {(Math.round(cart.reduce((acc, item) => acc + item.subtotal, 0) * 100) / 100).toFixed(2)}</span>
        </button>
      </div>

      <div className={`${vistaMovil === 'productos' ? 'flex' : 'hidden'} lg:flex flex-1 min-w-0 min-h-0`}>
        <TerminalBusqueda
          onNavigate={onNavigate}
          searchQuery={searchQuery} 
          setSearchQuery={setSearchQuery} 
          productos={productosVenta}
          onAddToCart={handleAddToCart}
          clienteSeleccionado={clienteSeleccionado}
          onAbrirElegirCliente={() => setIsClienteModalOpen(true)}
          onLimpiarCliente={() => setClienteSeleccionado(null)}
        />
      </div>
      
      {/* 🛡️ CONTENEDOR DERECHO EVICAMP: MINI REPORTE + CAJA ALINEADA */}
      <div className={`${vistaMovil === 'ticket' ? 'flex' : 'hidden'} lg:flex flex-col flex-1 lg:flex-none lg:h-full gap-2 lg:gap-0 shrink-0 z-10 relative w-full lg:w-[420px] xl:w-[480px] 2xl:w-[560px] min-h-0`}>
        {/* Cajero (sin 'Ver Totales de Caja'): no ve cuánto se vendió en el día ni el historial del día */}
        {veTotalesCaja && <MiniReporteDiario refreshTrigger={refreshReport} />}
        
        {/* 🛡️ GEOMETRÍA PERFECTA: Flex-1 y min-h-0 hacen que se estire exactamente al ras del panel izquierdo */}
        <div className="flex-1 min-h-0 flex flex-col">
          <TicketVenta
            selectedIndex={selectedIndex}
            colIndex={colIndex}
            setSelectedIndex={setSelectedIndex} // 🛡️ NUEVO
            setColIndex={setColIndex}           // 🛡️ NUEVO
            cart={cart} 
            setCart={setCart} 
            clienteSeleccionado={clienteSeleccionado}
            onAbrirElegirCliente={() => setIsClienteModalOpen(true)}
            onLimpiarCliente={() => setClienteSeleccionado(null)}
            updateQuantity={updateQuantity}
            updatePrice={updatePrice}
            alternarEscala={alternarEscala}
            activeTabIndex={activeTabIndex}
            heldCarts={heldCarts}
            holdCurrentCart={holdCurrentCart}
            restoreCart={restoreCart}
            onPagar={() => {
              (document.activeElement as HTMLElement)?.blur();
              setIsCobroModalOpen(true);
            }}
            onCotizar={() => setIsCotizacionModalOpen(true)}
            onPedido={() => setIsPedidoModalOpen(true)}
          />
        </div>
      </div>

      {/* MODAL BALANZA */}
      <ModalBalanza 
        isOpen={isBalanzaModalOpen}
        onClose={() => {
          setIsBalanzaModalOpen(false);
          setTimeout(() => document.getElementById('buscador-global-pos')?.focus(), 100);
        }}
        product={selectedWeightProduct}
        onConfirm={handleConfirmWeight}
      />
      {/* Reemplaza <ModalPrecioManual ... /> por este bloque: */}
      <ModalPrecioConsumo 
        isOpen={isPrecioModalOpen}
        onClose={() => {
          setIsPrecioModalOpen(false);
          setSelectedConsumoProduct(null);
          setTimeout(() => document.getElementById('buscador-global-pos')?.focus(), 100);
        }}
        producto={selectedConsumoProduct}
        onConfirm={handleConfirmPrecio}
      />
      {/* MODAL DE COBRO */}
      <ModalCobro 
        isOpen={isCobroModalOpen}
        onClose={() => {
          setIsCobroModalOpen(false);
          setSelectedIndex(-1); // 🛡️ AÑADIDO: Resetear estado del carrito para soltar el botón F4
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
          document.getElementById('buscador-global-pos')?.focus();
          // Si se abrió la vista previa del ticket, el foco se queda en sus botones
          setTimeout(() => {
            const nueva = document.getElementById('vista-btn-nueva');
            if (nueva) nueva.focus();
            else document.getElementById('buscador-global-pos')?.focus();
          }, 100);
        }}
        cart={cart}
        total={Math.round(cart.reduce((acc, item) => acc + item.subtotal, 0) * 100) / 100}
        clienteSeleccionado={clienteSeleccionado}
        onConfirm={handleConfirmPayment}
      />
      {/* VISTA PREVIA DEL TICKET (NUEVO MODAL) */}
      {isVistaPreviaOpen && ultimaVenta && (
        // role="dialog": los atajos de la caja (flechas del carrito, imán del buscador) se apagan mientras está abierta
        <div role="dialog" aria-modal="true" aria-label="Vista previa del ticket" className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] flex flex-col max-h-[calc(var(--alto-pantalla)*0.94)] sm:max-h-[calc(var(--alto-pantalla)*0.95)] w-full max-w-md animate-fade-in">
            
            {/* CABECERA */}
            <div className="bg-[var(--color-info)] text-white p-4 flex justify-between items-center border-b-2 border-[var(--color-ink)] shrink-0">
              <h2 className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
                <Printer size={18} /> Vista Previa del Ticket
              </h2>
              <button
                id="vista-btn-cerrar"
                aria-label="Cerrar"
                onClick={() => { setIsVistaPreviaOpen(false); setTimeout(() => document.getElementById('buscador-global-pos')?.focus(), 50); }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); document.getElementById('vista-btn-nueva')?.focus(); }
                }}
                className="p-1 hover:rotate-90 transition-transform cursor-pointer outline-none focus:ring-4 focus:ring-white"
              >
                <X size={20} strokeWidth={3} />
              </button>
            </div>
            
            {/* CONTENEDOR DEL TICKET (Fondo gris y zoom automático) */}
            <div className="flex-1 overflow-y-auto p-6 bg-[var(--color-bg)] flex justify-center custom-scrollbar">
              {/* Le aplicamos un scale-110 para que en la PC se vea un poco más grande y nítido */}
              <div className="transform sm:scale-110 origin-top pb-10">
                <TicketImprimible
                  ref={componentRef}
                  cart={ultimaVenta.cart}
                  total={ultimaVenta.total}
                  pagos={ultimaVenta.pagos}
                  vuelto={ultimaVenta.vuelto}
                  nroBoleta={ultimaVenta.nroBoleta}
                  fiadoData={ultimaVenta.fiadoData}
                  cliente={ultimaVenta.cliente}
                  vendedor={ultimaVenta.vendedor}
                />
              </div>
            </div>

            {/* BOTONES */}
            {/* Selector: ← → entre los dos botones, Enter activa el elegido */}
            <div
              className="p-4 bg-white border-t-2 border-[var(--color-ink)] flex gap-3 shrink-0"
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                  e.preventDefault();
                  document.getElementById(e.key === 'ArrowRight' ? 'vista-btn-imprimir' : 'vista-btn-nueva')?.focus();
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  document.getElementById('vista-btn-cerrar')?.focus();
                }
              }}
            >
              <button
                id="vista-btn-nueva"
                ref={(el) => { if (el && !el.dataset.enfocado) { el.dataset.enfocado = '1'; setTimeout(() => el.focus(), 30); } }}
                onClick={() => { setIsVistaPreviaOpen(false); setTimeout(() => document.getElementById('buscador-global-pos')?.focus(), 50); }}
                className="flex-1 border-2 border-[var(--color-ink)] bg-white text-[var(--color-ink)] py-3 font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-colors cursor-pointer shadow-[4px_4px_0_0_var(--color-ink)] active:translate-y-[4px] active:shadow-none outline-none focus:ring-4 focus:ring-[var(--color-info)] focus:ring-offset-2"
              >
                Nueva Venta <span className="opacity-60">(Enter)</span>
              </button>
              <button
                id="vista-btn-imprimir"
                onClick={() => handlePrint()}
                className="flex-1 border-2 border-[var(--color-ink)] bg-[var(--color-accent)] text-[var(--color-ink)] py-3 font-black text-xs uppercase tracking-widest hover:bg-[var(--color-accent-dark)] hover:text-white transition-colors flex items-center justify-center gap-2 shadow-[4px_4px_0_0_var(--color-ink)] active:translate-y-[4px] active:shadow-none cursor-pointer outline-none focus:ring-4 focus:ring-[var(--color-info)] focus:ring-offset-2"
              >
                <Printer size={18} /> Imprimir
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL ELEGIR CLIENTE POS (F3) */}
      <ModalElegirClientePOS
        isOpen={isClienteModalOpen}
        clienteActual={clienteSeleccionado}
        onSelectCliente={(c) => {
          setClienteSeleccionado(c);
          setIsClienteModalOpen(false);
          setTimeout(() => document.getElementById('buscador-global-pos')?.focus(), 50);
        }}
        onClose={() => {
          setIsClienteModalOpen(false);
          setTimeout(() => document.getElementById('buscador-global-pos')?.focus(), 50);
        }}
      />

      {/* MODAL PAUSAR TICKET CON NOMBRE (Shift+Q) */}
      <ModalNombreEspera
        isOpen={isEsperaModalOpen}
        defaultNombre={clienteSeleccionado ? clienteSeleccionado.nombre : `Ticket ${heldCarts.length + 1}`}
        total={Math.round(cart.reduce((acc, item) => acc + item.subtotal, 0) * 100) / 100}
        itemsCount={cart.length}
        onConfirm={handleConfirmarEspera}
        onClose={() => {
          setIsEsperaModalOpen(false);
          setTimeout(() => document.getElementById('buscador-global-pos')?.focus(), 50);
        }}
      />

      {/* MODAL COTIZACIÓN / PROFORMA (F7) */}
      <ModalCotizacionPOS
        isOpen={isCotizacionModalOpen}
        onClose={() => {
          setIsCotizacionModalOpen(false);
          setTimeout(() => document.getElementById('buscador-global-pos')?.focus(), 50);
        }}
        cart={cart}
        total={Math.round(cart.reduce((acc, item) => acc + item.subtotal, 0) * 100) / 100}
        clienteSeleccionado={clienteSeleccionado}
        onCotizacionGuardada={() => {
          setCart([]);
          setClienteSeleccionado(null);
        }}
      />

      {/* MODAL PEDIDO POR ENCARGO (F8) */}
      <ModalPedidoPOS
        isOpen={isPedidoModalOpen}
        onClose={() => {
          setIsPedidoModalOpen(false);
          setTimeout(() => document.getElementById('buscador-global-pos')?.focus(), 50);
        }}
        cart={cart}
        total={Math.round(cart.reduce((acc, item) => acc + item.subtotal, 0) * 100) / 100}
        clienteSeleccionado={clienteSeleccionado}
        onPedidoGuardado={() => {
          setCart([]);
          setClienteSeleccionado(null);
          fetchProducts();
        }}
      />
    </div>
  );
};
