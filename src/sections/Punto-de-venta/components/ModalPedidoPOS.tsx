import React, { useState, useEffect } from 'react';
import { X, Package, Calendar, Clock, User, Phone, CheckCircle2, Printer, MessageCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../../db/supabase';
import type { CartItem, Cliente } from '../types';
import { useEmpleado } from '../../../utils/permisos';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  total: number;
  clienteSeleccionado?: Cliente | null;
  onPedidoGuardado?: () => void;
}

export const ModalPedidoPOS: React.FC<Props> = ({
  isOpen,
  onClose,
  cart,
  total,
  clienteSeleccionado,
  onPedidoGuardado
}) => {
  const empleado = useEmpleado();
  const [numero, setNumero] = useState('PED-....');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteDoc, setClienteDoc] = useState('');
  const [clienteTel, setClienteTel] = useState('');
  const [fechaEntrega, setFechaEntrega] = useState('');
  const [horaEntrega, setHoraEntrega] = useState('18:00');
  const [adelantoEf, setAdelantoEf] = useState('0');
  const [adelantoYap, setAdelantoYap] = useState('0');
  const [adelantoTar, setAdelantoTar] = useState('0');
  const [observaciones, setObservaciones] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [guardadoExitoso, setGuardadoExitoso] = useState<any | null>(null);

  // Fecha por defecto: mañana
  const defaultFechaEntrega = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  useEffect(() => {
    if (!isOpen) {
      setGuardadoExitoso(null);
      setGuardando(false);
      return;
    }

    setFechaEntrega(defaultFechaEntrega());
    setHoraEntrega('18:00');
    setAdelantoEf('0');
    setAdelantoYap('0');
    setAdelantoTar('0');
    setObservaciones('');

    if (clienteSeleccionado) {
      setClienteNombre(clienteSeleccionado.nombre || '');
      setClienteDoc(clienteSeleccionado.ruc || clienteSeleccionado.dni || '');
      setClienteTel(clienteSeleccionado.telefono || '');
    } else {
      setClienteNombre('');
      setClienteDoc('');
      setClienteTel('');
    }

    const obtenerCorrelativo = async () => {
      try {
        const { data, error } = await supabase
          .from('pedidos_clientes')
          .select('id, numero')
          .order('id', { ascending: false })
          .limit(1);

        if (!error && data && data.length > 0) {
          const ultimoNum = data[0].numero;
          const match = ultimoNum?.match(/PED-(\d+)/);
          const next = match ? parseInt(match[1], 10) + 1 : data[0].id + 1;
          setNumero(`PED-${String(next).padStart(4, '0')}`);
        } else {
          setNumero('PED-0001');
        }
      } catch {
        setNumero('PED-0001');
      }
    };
    obtenerCorrelativo();
  }, [isOpen, clienteSeleccionado]);

  // Auto-Focus inmediato en el primer campo al abrir el modal (o botón imprimir al guardar)
  useEffect(() => {
    if (!isOpen) return;
    const enfocar = () => {
      if (guardadoExitoso) {
        document.getElementById('btn-ped-imprimir')?.focus();
      } else {
        document.getElementById('input-pedido-cliente')?.focus();
      }
    };
    enfocar();
    const t1 = setTimeout(enfocar, 50);
    const t2 = setTimeout(enfocar, 150);
    const t3 = setTimeout(enfocar, 300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isOpen, guardadoExitoso]);

  // Manejo de teclado, Focus Trap y navegación por teclado (Patrón Evicamp)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. ESCAPE: Cerrar modal
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      // 2. FOCUS TRAP PARA TAB
      if (e.key === 'Tab') {
        e.stopPropagation();
        const modalEl = document.getElementById('modal-pedido-container');
        if (!modalEl) return;
        const focusables = Array.from(
          modalEl.querySelectorAll<HTMLElement>(
            'input:not([type="file"]):not([disabled]), button:not([disabled])'
          )
        ).filter(el => el.tabIndex !== -1 && !el.classList.contains('hidden') && el.offsetParent !== null);

        if (focusables.length > 0) {
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          const active = document.activeElement;

          if (e.shiftKey && active === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && active === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen, onClose, guardadoExitoso]);

  if (!isOpen) return null;

  const montoEf = parseFloat(adelantoEf) || 0;
  const montoYap = parseFloat(adelantoYap) || 0;
  const montoTar = parseFloat(adelantoTar) || 0;
  const adelantoTotal = Math.round((montoEf + montoYap + montoTar) * 100) / 100;
  const saldoPendiente = Math.max(0, Math.round((total - adelantoTotal) * 100) / 100);

  const handleGuardar = async () => {
    const nombre = clienteNombre.trim();
    if (!nombre) {
      alert('Por favor ingrese el nombre del cliente para el pedido.');
      document.getElementById('input-pedido-cliente')?.focus();
      return;
    }

    if (!fechaEntrega) {
      alert('Por favor indique la fecha prometida de entrega.');
      return;
    }

    if (adelantoTotal > total) {
      alert(`El adelanto total (S/ ${adelantoTotal.toFixed(2)}) no puede ser mayor al total del pedido (S/ ${total.toFixed(2)}).`);
      return;
    }

    if (cart.length === 0) {
      alert('El carrito está vacío.');
      return;
    }

    // Determinar descripción del método de pago del adelanto
    let metodoFinal: string | null = null;
    const partes: string[] = [];
    if (montoEf > 0) partes.push(`Efectivo: S/ ${montoEf.toFixed(2)}`);
    if (montoYap > 0) partes.push(`Yape: S/ ${montoYap.toFixed(2)}`);
    if (montoTar > 0) partes.push(`Tarjeta: S/ ${montoTar.toFixed(2)}`);

    if (partes.length === 1) {
      if (montoEf > 0) metodoFinal = 'EFECTIVO';
      else if (montoYap > 0) metodoFinal = 'YAPE';
      else if (montoTar > 0) metodoFinal = 'TARJETA';
    } else if (partes.length > 1) {
      metodoFinal = `MIXTO (${partes.join(', ')})`;
    }

    setGuardando(true);
    try {
      const fechaHoraIso = new Date(`${fechaEntrega}T${horaEntrega || '18:00'}:00`).toISOString();

      // 1. Insertar pedido
      const payloadPedido = {
        numero,
        cliente_id: clienteSeleccionado?.id ? String(clienteSeleccionado.id) : null,
        cliente_nombre: nombre,
        cliente_documento: clienteDoc.trim() || null,
        cliente_telefono: clienteTel.trim() || null,
        fecha_entrega: fechaHoraIso,
        estado: 'PENDIENTE',
        total: Math.round(total * 100) / 100,
        adelanto: adelantoTotal,
        saldo_pendiente: saldoPendiente,
        metodo_adelanto: metodoFinal,
        observaciones: observaciones.trim() || null,
        vendedor: empleado?.nombre || null
      };

      const { data: pedData, error: pedErr } = await supabase
        .from('pedidos_clientes')
        .insert(payloadPedido)
        .select()
        .single();

      if (pedErr) throw pedErr;

      // 2. Insertar detalles
      const detalles = cart.map(item => ({
        pedido_id: pedData.id,
        product_id: item.productoId ? Number(item.productoId) : Number(item.id),
        product_name: item.name,
        quantity: item.cartQuantity,
        price: item.price,
        subtotal: item.subtotal,
        es_mayorista: Boolean(item.esMayoristaAplicado)
      }));

      const { error: detErr } = await supabase
        .from('pedido_detalles')
        .insert(detalles);

      if (detErr) throw detErr;

      // 3. Descontar stock del inventario como reserva
      for (const item of cart) {
        const prodId = item.productoId ? Number(item.productoId) : Number(item.id);
        const cant = Number(item.cartQuantity);

        try {
          const { data: prodActual } = await supabase
            .from('products')
            .select('quantity, name')
            .eq('id', prodId)
            .single();

          if (prodActual) {
            const nuevaCantidad = Math.max(0, (prodActual.quantity || 0) - cant);
            await supabase
              .from('products')
              .update({ quantity: nuevaCantidad })
              .eq('id', prodId);

            await supabase
              .from('inventory_movements')
              .insert({
                product_id: prodId,
                type: 'RESERVA_PEDIDO',
                quantity: -cant,
                notes: `Reserva por Pedido ${numero} - Cliente: ${nombre}`
              });
          }
        } catch (stockErr) {
          console.warn('No se pudo descontar stock de reserva para producto', prodId, stockErr);
        }
      }

      setGuardadoExitoso({
        pedido: pedData,
        detalles,
        cart: [...cart],
        total,
        adelanto: adelantoTotal,
        saldoPendiente,
        metodoFinal
      });

      if (onPedidoGuardado) {
        onPedidoGuardado();
      }
    } catch (err: any) {
      console.error('Error guardando pedido:', err);
      alert(`No se pudo guardar el pedido: ${err.message || 'Error desconocido'}`);
    } finally {
      setGuardando(false);
    }
  };

  const handleWhatsApp = () => {
    if (!guardadoExitoso) return;
    const tel = (clienteTel || '').replace(/[^0-9]/g, '');
    const telefonoDestino = tel.length === 9 ? `51${tel}` : tel;

    const lineas = guardadoExitoso.detalles
      .map((d: any) => `• ${d.quantity}x ${d.product_name} - S/ ${d.subtotal.toFixed(2)}`)
      .join('\n');

    const mensaje = encodeURIComponent(
      `*COMPROBANTE DE RESERVA / PEDIDO ${numero}*\n` +
      `Estimado(a) ${clienteNombre}:\n` +
      `Se ha registrado y separado la mercadería de su pedido:\n\n` +
      `${lineas}\n\n` +
      `*TOTAL:* S/ ${guardadoExitoso.total.toFixed(2)}\n` +
      `*ADELANTO:* S/ ${guardadoExitoso.adelanto.toFixed(2)}${guardadoExitoso.metodoFinal ? ` (${guardadoExitoso.metodoFinal})` : ''}\n` +
      `*SALDO PENDIENTE:* S/ ${guardadoExitoso.saldoPendiente.toFixed(2)}\n` +
      `📅 *Fecha de Entrega:* ${fechaEntrega} a las ${horaEntrega}\n\n` +
      `¡Su mercadería ya está separada y guardada para usted!`
    );

    const url = telefonoDestino
      ? `https://wa.me/${telefonoDestino}?text=${mensaje}`
      : `https://wa.me/?text=${mensaje}`;

    window.open(url, '_blank');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Modal Pedido por Encargo"
      id="modal-pedido-container"
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-2 sm:p-4 font-mono"
    >
      <div className="bg-white border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] flex flex-col max-h-[95vh] w-full max-w-xl animate-fade-in">
        
        {/* CABECERA */}
        <div className="bg-[var(--color-ink)] text-white p-3 sm:p-4 flex justify-between items-center border-b-2 border-[var(--color-ink)] shrink-0">
          <div className="flex items-center gap-2">
            <Package size={20} className="text-amber-400" />
            <div>
              <h2 className="font-black uppercase tracking-widest text-sm sm:text-base leading-tight">
                Nuevo Pedido por Encargo
              </h2>
              <span className="text-[11px] font-bold text-amber-300">
                {numero} · Separa mercadería de inmediato
              </span>
            </div>
          </div>
          <button
            id="ped-btn-cerrar"
            type="button"
            onClick={onClose}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                document.getElementById('input-pedido-cliente')?.focus();
              }
            }}
            className="p-1 hover:rotate-90 transition-transform cursor-pointer outline-none focus:ring-4 focus:ring-white text-white"
            title="Cerrar (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* CONTENIDO */}
        {guardadoExitoso ? (
          <div className="p-6 flex flex-col items-center text-center gap-4 overflow-y-auto">
            <div className="w-16 h-16 bg-amber-100 border-2 border-amber-600 rounded-full flex items-center justify-center text-amber-600 shadow-[3px_3px_0_0_black]">
              <CheckCircle2 size={36} />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase text-[var(--color-ink)]">
                ¡Pedido y Reserva Registrados!
              </h3>
              <p className="text-xs text-[var(--color-muted)] font-bold mt-1">
                Registrado como <strong className="text-[var(--color-ink)]">{numero}</strong> para <strong className="text-[var(--color-ink)]">{clienteNombre}</strong>.
              </p>
              <div className="bg-amber-50 border-2 border-amber-300 p-3 mt-3 flex flex-col gap-1 text-xs font-bold text-[var(--color-ink)]">
                <div>Total Pedido: <strong>S/ {guardadoExitoso.total.toFixed(2)}</strong></div>
                <div>Adelanto Dejado: <strong>S/ {guardadoExitoso.adelanto.toFixed(2)}</strong> {guardadoExitoso.metodoFinal && `(${guardadoExitoso.metodoFinal})`}</div>
                <div className="text-base font-black text-amber-700">
                  Saldo a Pagar al Recoger: S/ {guardadoExitoso.saldoPendiente.toFixed(2)}
                </div>
                <div className="text-[11px] text-[var(--color-muted)] mt-1">
                  📅 Entrega: {fechaEntrega} - {horaEntrega}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
              <button
                id="btn-ped-wsp"
                type="button"
                onClick={handleWhatsApp}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    document.getElementById('btn-ped-imprimir')?.focus();
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    document.getElementById('btn-ped-listo')?.focus();
                  }
                }}
                className="flex-1 py-3 px-4 border-2 border-[var(--color-ink)] bg-emerald-600 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[3px_3px_0_0_black] hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-black cursor-pointer"
              >
                <MessageCircle size={18} /> Enviar Comprobante WhatsApp
              </button>
              <button
                id="btn-ped-imprimir"
                type="button"
                onClick={() => window.print()}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    document.getElementById('btn-ped-wsp')?.focus();
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    document.getElementById('btn-ped-listo')?.focus();
                  }
                }}
                className="flex-1 py-3 px-4 border-2 border-[var(--color-ink)] bg-[var(--color-accent)] text-[var(--color-ink)] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[3px_3px_0_0_black] hover:bg-white focus:outline-none focus:ring-4 focus:ring-black cursor-pointer"
              >
                <Printer size={18} /> Imprimir Ticket
              </button>
            </div>

            <button
              id="btn-ped-listo"
              type="button"
              onClick={onClose}
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  document.getElementById('btn-ped-imprimir')?.focus();
                }
              }}
              className="w-full mt-2 py-2.5 border-2 border-[var(--color-ink)] bg-gray-100 hover:bg-gray-200 focus:bg-gray-300 focus:outline-none focus:ring-4 focus:ring-black text-[var(--color-ink)] font-black text-xs uppercase tracking-wider cursor-pointer"
            >
              Listo / Continuar en Caja (Esc)
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4 custom-scrollbar">
            
            {/* DATOS DEL CLIENTE */}
            <div className="bg-[var(--color-bg)] p-3 border-2 border-[var(--color-border)] flex flex-col gap-3">
              <span className="text-[11px] font-black uppercase tracking-widest text-[var(--color-muted)] flex items-center gap-1.5">
                <User size={13} /> Cliente que realiza el encargo
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-black uppercase text-[var(--color-muted)] mb-1">
                    Cliente / Razón Social <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="input-pedido-cliente"
                    type="text"
                    value={clienteNombre}
                    onChange={(e) => setClienteNombre(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        document.getElementById('ped-btn-cerrar')?.focus();
                      } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('input-pedido-doc')?.focus();
                      }
                    }}
                    placeholder="NOMBRE O EMPRESA"
                    className="w-full border-2 border-[var(--color-ink)] p-2 text-xs font-black uppercase outline-none focus:ring-4 focus:ring-[var(--color-ink)] focus:bg-amber-50 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-[var(--color-muted)] mb-1">
                    DNI / RUC (Opcional)
                  </label>
                  <input
                    id="input-pedido-doc"
                    type="text"
                    value={clienteDoc}
                    onChange={(e) => setClienteDoc(e.target.value.replace(/[^0-9]/g, ''))}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        document.getElementById('input-pedido-cliente')?.focus();
                      } else if (e.key === 'ArrowRight') {
                        e.preventDefault();
                        document.getElementById('input-pedido-tel')?.focus();
                      } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('input-pedido-fecha')?.focus();
                      }
                    }}
                    placeholder="NRO. DOCUMENTO"
                    className="w-full border-2 border-[var(--color-ink)] p-2 text-xs font-bold outline-none focus:ring-4 focus:ring-[var(--color-ink)] focus:bg-amber-50 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-[var(--color-muted)] mb-1">
                    Teléfono / WhatsApp <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="input-pedido-tel"
                    type="text"
                    value={clienteTel}
                    onChange={(e) => setClienteTel(e.target.value.replace(/[^0-9]/g, ''))}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        document.getElementById('input-pedido-cliente')?.focus();
                      } else if (e.key === 'ArrowLeft') {
                        e.preventDefault();
                        document.getElementById('input-pedido-doc')?.focus();
                      } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('input-pedido-hora')?.focus();
                      }
                    }}
                    placeholder="Para avisarle cuando llegue"
                    className="w-full border-2 border-[var(--color-ink)] p-2 text-xs font-bold outline-none focus:ring-4 focus:ring-[var(--color-ink)] focus:bg-amber-50 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* FECHA Y HORA DE ENTREGA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-[var(--color-muted)] mb-1 flex items-center gap-1">
                  <Calendar size={12} /> Fecha Prometida de Entrega <span className="text-red-500">*</span>
                </label>
                <input
                  id="input-pedido-fecha"
                  type="date"
                  value={fechaEntrega}
                  onChange={(e) => setFechaEntrega(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      document.getElementById('input-pedido-doc')?.focus();
                    } else if (e.key === 'ArrowRight') {
                      e.preventDefault();
                      document.getElementById('input-pedido-hora')?.focus();
                    } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
                      e.preventDefault();
                      document.getElementById('input-pedido-adelanto-ef')?.focus();
                    }
                  }}
                  className="w-full border-2 border-[var(--color-ink)] p-2 text-xs font-bold outline-none focus:ring-4 focus:ring-[var(--color-ink)] focus:bg-amber-50 bg-white cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-[var(--color-muted)] mb-1 flex items-center gap-1">
                  <Clock size={12} /> Hora Aproximada
                </label>
                <input
                  id="input-pedido-hora"
                  type="time"
                  value={horaEntrega}
                  onChange={(e) => setHoraEntrega(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      document.getElementById('input-pedido-tel')?.focus();
                    } else if (e.key === 'ArrowLeft') {
                      e.preventDefault();
                      document.getElementById('input-pedido-fecha')?.focus();
                    } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
                      e.preventDefault();
                      document.getElementById('input-pedido-adelanto-yap')?.focus();
                    }
                  }}
                  className="w-full border-2 border-[var(--color-ink)] p-2 text-xs font-bold outline-none focus:ring-4 focus:ring-[var(--color-ink)] focus:bg-amber-50 bg-white cursor-pointer"
                />
              </div>
            </div>

            {/* ADELANTO Y PAGO MIXTO (EFECTIVO, YAPE, TARJETA) */}
            <div className="bg-amber-50 p-3 border-2 border-amber-300 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-black uppercase tracking-widest text-amber-800 flex items-center gap-1.5">
                  <AlertCircle size={14} /> Adelanto / Pago Inicial (Permite Pago Mixto)
                </span>
                <span className="text-xs font-black text-amber-900">
                  Total Adelanto: S/ {adelantoTotal.toFixed(2)}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10px] font-black uppercase text-amber-900 mb-1">
                    💵 Efectivo (S/)
                  </label>
                  <input
                    id="input-pedido-adelanto-ef"
                    type="text"
                    inputMode="decimal"
                    value={adelantoEf}
                    onChange={(e) => setAdelantoEf(e.target.value.replace(/[^0-9.]/g, ''))}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        document.getElementById('input-pedido-fecha')?.focus();
                      } else if (e.key === 'ArrowRight') {
                        e.preventDefault();
                        document.getElementById('input-pedido-adelanto-yap')?.focus();
                      } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('input-pedido-obs')?.focus();
                      }
                    }}
                    placeholder="0.00"
                    className="w-full border-2 border-[var(--color-ink)] p-2 text-sm font-black text-amber-900 outline-none focus:ring-4 focus:ring-[var(--color-ink)] focus:bg-white bg-amber-50/50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-amber-900 mb-1">
                    📱 Yape / Plin (S/)
                  </label>
                  <input
                    id="input-pedido-adelanto-yap"
                    type="text"
                    inputMode="decimal"
                    value={adelantoYap}
                    onChange={(e) => setAdelantoYap(e.target.value.replace(/[^0-9.]/g, ''))}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        document.getElementById('input-pedido-fecha')?.focus();
                      } else if (e.key === 'ArrowLeft') {
                        e.preventDefault();
                        document.getElementById('input-pedido-adelanto-ef')?.focus();
                      } else if (e.key === 'ArrowRight') {
                        e.preventDefault();
                        document.getElementById('input-pedido-adelanto-tar')?.focus();
                      } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('input-pedido-obs')?.focus();
                      }
                    }}
                    placeholder="0.00"
                    className="w-full border-2 border-[var(--color-ink)] p-2 text-sm font-black text-purple-900 outline-none focus:ring-4 focus:ring-[var(--color-ink)] focus:bg-white bg-purple-50/30"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-amber-900 mb-1">
                    💳 Tarjeta (S/)
                  </label>
                  <input
                    id="input-pedido-adelanto-tar"
                    type="text"
                    inputMode="decimal"
                    value={adelantoTar}
                    onChange={(e) => setAdelantoTar(e.target.value.replace(/[^0-9.]/g, ''))}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        document.getElementById('input-pedido-hora')?.focus();
                      } else if (e.key === 'ArrowLeft') {
                        e.preventDefault();
                        document.getElementById('input-pedido-adelanto-yap')?.focus();
                      } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('input-pedido-obs')?.focus();
                      }
                    }}
                    placeholder="0.00"
                    className="w-full border-2 border-[var(--color-ink)] p-2 text-sm font-black text-blue-900 outline-none focus:ring-4 focus:ring-[var(--color-ink)] focus:bg-white bg-blue-50/30"
                  />
                </div>
              </div>

              {/* SALDO PENDIENTE */}
              <div className="flex justify-between items-center pt-2 border-t border-amber-200">
                <span className="text-xs font-bold text-amber-900 uppercase">
                  Saldo pendiente al momento de la entrega:
                </span>
                <span className="text-base font-black text-amber-900">
                  S/ {saldoPendiente.toFixed(2)}
                </span>
              </div>
            </div>

            {/* OBSERVACIONES */}
            <div>
              <label className="block text-[10px] font-black uppercase text-[var(--color-muted)] mb-1">
                Observaciones / Detalles del Encargo
              </label>
              <input
                id="input-pedido-obs"
                type="text"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    document.getElementById('input-pedido-adelanto-ef')?.focus();
                  } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
                    e.preventDefault();
                    document.getElementById('btn-confirmar-pedido')?.focus();
                  }
                }}
                placeholder="Ej: Avisar por WhatsApp antes de venir, empaque especial..."
                className="w-full border-2 border-[var(--color-ink)] p-2 text-xs font-bold outline-none focus:ring-4 focus:ring-[var(--color-ink)] focus:bg-amber-50 bg-white"
              />
            </div>

            {/* RESUMEN DE PRODUCTOS A RESERVAR */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-black uppercase tracking-widest text-[var(--color-muted)]">
                  Mercadería a Reservar ({cart.length})
                </span>
                <span className="text-xs font-black text-[var(--color-ink)]">
                  TOTAL: S/ {total.toFixed(2)}
                </span>
              </div>
              <div className="border-2 border-[var(--color-ink)] max-h-36 overflow-y-auto bg-white custom-scrollbar divide-y divide-[var(--color-border)]">
                {cart.map((item, idx) => (
                  <div key={idx} className="p-2 flex justify-between items-center text-xs">
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="font-black text-[var(--color-ink)] uppercase truncate">
                        {item.name}
                      </span>
                      <span className="text-[10px] text-[var(--color-muted)] font-bold">
                        {item.cartQuantity} {item.unit || 'UND'} x S/ {item.price.toFixed(2)}
                        {item.esMayoristaAplicado && <span className="ml-1 text-amber-600 font-black">⭐ MAYORISTA</span>}
                      </span>
                    </div>
                    <span className="font-black text-[var(--color-ink)] shrink-0">
                      S/ {item.subtotal.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* BOTÓN CONFIRMAR */}
            <div className="pt-2">
              <button
                id="btn-confirmar-pedido"
                type="button"
                onClick={handleGuardar}
                disabled={guardando}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    document.getElementById('input-pedido-obs')?.focus();
                  }
                }}
                className="w-full py-3 border-2 border-[var(--color-ink)] bg-amber-500 hover:bg-amber-600 text-black font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-[3px_3px_0_0_var(--color-ink)] active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-60 flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-black"
              >
                {guardando ? (
                  <span>Reservando Stock y Guardando...</span>
                ) : (
                  <>
                    <Package size={16} />
                    <span>Reservar y Guardar Pedido ({numero}) [ENTER]</span>
                  </>
                )}
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
