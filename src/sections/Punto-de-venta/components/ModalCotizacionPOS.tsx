import React, { useState, useEffect, useRef } from 'react';
import { X, FileText, Calendar, User, Phone, CheckCircle2, Printer, MessageCircle, ArrowRight } from 'lucide-react';
import { supabase } from '../../../db/supabase';
import type { CartItem, Cliente } from '../types';
import { useEmpleado } from '../../../utils/permisos';
import { TicketImprimible } from './TicketImprimible';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  total: number;
  clienteSeleccionado?: Cliente | null;
  onCotizacionGuardada?: () => void;
}

export const ModalCotizacionPOS: React.FC<Props> = ({
  isOpen,
  onClose,
  cart,
  total,
  clienteSeleccionado,
  onCotizacionGuardada
}) => {
  const empleado = useEmpleado();
  const [numero, setNumero] = useState('COT-....');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteDoc, setClienteDoc] = useState('');
  const [clienteTel, setClienteTel] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [guardadoExitoso, setGuardadoExitoso] = useState<any | null>(null);

  // Calcular fecha de vencimiento por defecto (7 días)
  const defaultFechaVencimiento = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  };

  useEffect(() => {
    if (!isOpen) {
      setGuardadoExitoso(null);
      setGuardando(false);
      return;
    }

    // Inicializar datos
    setFechaVencimiento(defaultFechaVencimiento());
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

    // Obtener siguiente número correlativo
    const obtenerCorrelativo = async () => {
      try {
        const { data, error } = await supabase
          .from('cotizaciones')
          .select('id, numero')
          .order('id', { ascending: false })
          .limit(1);

        if (!error && data && data.length > 0) {
          const ultimoNum = data[0].numero;
          const match = ultimoNum?.match(/COT-(\d+)/);
          const next = match ? parseInt(match[1], 10) + 1 : data[0].id + 1;
          setNumero(`COT-${String(next).padStart(4, '0')}`);
        } else {
          setNumero('COT-0001');
        }
      } catch {
        setNumero('COT-0001');
      }
    };
    obtenerCorrelativo();
  }, [isOpen, clienteSeleccionado]);

  // Auto-Focus inmediato en el primer campo al abrir el modal (o botón imprimir al guardar)
  useEffect(() => {
    if (!isOpen) return;
    const enfocar = () => {
      if (guardadoExitoso) {
        document.getElementById('btn-coti-imprimir')?.focus();
      } else {
        document.getElementById('input-coti-cliente')?.focus();
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
        const modalEl = document.getElementById('modal-cotizacion-container');
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

  const handleGuardar = async () => {
    const nombre = clienteNombre.trim();
    if (!nombre) {
      alert('Por favor ingrese el nombre del cliente para la cotización.');
      document.getElementById('input-coti-cliente')?.focus();
      return;
    }

    if (cart.length === 0) {
      alert('El carrito está vacío.');
      return;
    }

    setGuardando(true);
    try {
      // 1. Insertar cabecera de cotización
      const payloadCotizacion = {
        numero,
        cliente_id: clienteSeleccionado?.id ? String(clienteSeleccionado.id) : null,
        cliente_nombre: nombre,
        cliente_documento: clienteDoc.trim() || null,
        cliente_telefono: clienteTel.trim() || null,
        fecha_emision: new Date().toISOString(),
        fecha_vencimiento: fechaVencimiento ? new Date(`${fechaVencimiento}T23:59:59`).toISOString() : null,
        estado: 'VIGENTE',
        total: Math.round(total * 100) / 100,
        observaciones: observaciones.trim() || null,
        vendedor: empleado?.nombre || null
      };

      const { data: cotiData, error: cotiErr } = await supabase
        .from('cotizaciones')
        .insert(payloadCotizacion)
        .select()
        .single();

      if (cotiErr) throw cotiErr;

      // 2. Insertar detalles
      const detalles = cart.map(item => ({
        cotizacion_id: cotiData.id,
        product_id: item.productoId ? Number(item.productoId) : Number(item.id),
        product_name: item.name,
        quantity: item.cartQuantity,
        price: item.price,
        subtotal: item.subtotal,
        es_mayorista: Boolean(item.esMayoristaAplicado)
      }));

      const { error: detErr } = await supabase
        .from('cotizacion_detalles')
        .insert(detalles);

      if (detErr) throw detErr;

      // Éxito: Guardar estado para permitir imprimir o WhatsApp
      setGuardadoExitoso({
        coti: cotiData,
        detalles,
        cart: [...cart],
        total
      });

      if (onCotizacionGuardada) {
        onCotizacionGuardada();
      }
    } catch (err: any) {
      console.error('Error guardando cotización:', err);
      alert(`No se pudo guardar la cotización: ${err.message || 'Error desconocido'}`);
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
      `*COTIZACIÓN ${numero}*\n` +
      `Estimado(a) ${clienteNombre}:\n` +
      `Adjuntamos el detalle de su cotización formal:\n\n` +
      `${lineas}\n\n` +
      `*TOTAL: S/ ${guardadoExitoso.total.toFixed(2)}*\n` +
      `Validez hasta: ${fechaVencimiento || '7 días'}\n\n` +
      `¡Muchas gracias por su preferencia!`
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
      aria-label="Modal Cotización"
      id="modal-cotizacion-container"
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-2 sm:p-4"
    >
      <div className="bg-white border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] flex flex-col max-h-[95vh] w-full max-w-xl animate-fade-in font-mono">
        
        {/* CABECERA */}
        <div className="bg-[var(--color-ink)] text-white p-3 sm:p-4 flex justify-between items-center border-b-2 border-[var(--color-ink)] shrink-0">
          <div className="flex items-center gap-2">
            <FileText size={20} className="text-[var(--color-accent)]" />
            <div>
              <h2 className="font-black uppercase tracking-widest text-sm sm:text-base leading-tight">
                Nueva Cotización / Proforma
              </h2>
              <span className="text-[11px] font-bold text-amber-400">
                {numero} · No descuenta stock del inventario
              </span>
            </div>
          </div>
          <button
            id="coti-btn-cerrar"
            type="button"
            onClick={onClose}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                document.getElementById('input-coti-cliente')?.focus();
              }
            }}
            className="p-1 hover:rotate-90 transition-transform cursor-pointer outline-none focus:ring-4 focus:ring-white text-white"
            title="Cerrar (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        {guardadoExitoso ? (
          /* PANTALLA DE ÉXITO */
          <div className="p-6 flex flex-col items-center text-center gap-4 overflow-y-auto">
            <div className="w-16 h-16 bg-emerald-100 border-2 border-emerald-600 rounded-full flex items-center justify-center text-emerald-600 shadow-[3px_3px_0_0_black]">
              <CheckCircle2 size={36} />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase text-[var(--color-ink)]">
                ¡Cotización Registrada con Éxito!
              </h3>
              <p className="text-xs text-[var(--color-muted)] font-bold mt-1">
                Registrada como <strong className="text-[var(--color-ink)]">{numero}</strong> para <strong className="text-[var(--color-ink)]">{clienteNombre}</strong>.
              </p>
              <p className="text-2xl font-black text-[var(--color-accent-dark)] mt-2">
                Total: S/ {guardadoExitoso.total.toFixed(2)}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full mt-4">
              <button
                id="btn-coti-wsp"
                type="button"
                onClick={handleWhatsApp}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    document.getElementById('btn-coti-imprimir')?.focus();
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    document.getElementById('btn-coti-listo')?.focus();
                  }
                }}
                className="flex-1 py-3 px-4 border-2 border-[var(--color-ink)] bg-emerald-600 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[3px_3px_0_0_black] hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-black cursor-pointer"
              >
                <MessageCircle size={18} /> Enviar WhatsApp
              </button>
              <button
                id="btn-coti-imprimir"
                type="button"
                onClick={() => {
                  window.print();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    document.getElementById('btn-coti-wsp')?.focus();
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    document.getElementById('btn-coti-listo')?.focus();
                  }
                }}
                className="flex-1 py-3 px-4 border-2 border-[var(--color-ink)] bg-[var(--color-accent)] text-[var(--color-ink)] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[3px_3px_0_0_black] hover:bg-white focus:outline-none focus:ring-4 focus:ring-black cursor-pointer"
              >
                <Printer size={18} /> Imprimir Ticket
              </button>
            </div>

            <button
              id="btn-coti-listo"
              type="button"
              onClick={onClose}
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  document.getElementById('btn-coti-imprimir')?.focus();
                }
              }}
              className="w-full mt-2 py-2.5 border-2 border-[var(--color-ink)] bg-gray-100 hover:bg-gray-200 focus:bg-gray-300 focus:outline-none focus:ring-4 focus:ring-black text-[var(--color-ink)] font-black text-xs uppercase tracking-wider cursor-pointer"
            >
              Listo / Continuar en Caja (Esc)
            </button>
          </div>
        ) : (
          /* FORMULARIO DE EMISIÓN CON SELECTOR TECLADO TOTAL */
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4 custom-scrollbar">
            
            {/* DATOS DEL CLIENTE */}
            <div className="bg-[var(--color-bg)] p-3 border-2 border-[var(--color-border)] flex flex-col gap-3">
              <span className="text-[11px] font-black uppercase tracking-widest text-[var(--color-muted)] flex items-center gap-1.5">
                <User size={13} /> Destinatario de la Proforma
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-black uppercase text-[var(--color-muted)] mb-1">
                    Cliente / Razón Social <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="input-coti-cliente"
                    type="text"
                    value={clienteNombre}
                    onChange={(e) => setClienteNombre(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        document.getElementById('coti-btn-cerrar')?.focus();
                      } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('input-coti-doc')?.focus();
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
                    id="input-coti-doc"
                    type="text"
                    value={clienteDoc}
                    onChange={(e) => setClienteDoc(e.target.value.replace(/[^0-9]/g, ''))}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        document.getElementById('input-coti-cliente')?.focus();
                      } else if (e.key === 'ArrowRight') {
                        e.preventDefault();
                        document.getElementById('input-coti-tel')?.focus();
                      } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('input-coti-fecha')?.focus();
                      }
                    }}
                    placeholder="NRO. DOCUMENTO"
                    className="w-full border-2 border-[var(--color-ink)] p-2 text-xs font-bold outline-none focus:ring-4 focus:ring-[var(--color-ink)] focus:bg-amber-50 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-[var(--color-muted)] mb-1">
                    Teléfono / WhatsApp (Opcional)
                  </label>
                  <input
                    id="input-coti-tel"
                    type="text"
                    value={clienteTel}
                    onChange={(e) => setClienteTel(e.target.value.replace(/[^0-9]/g, ''))}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        document.getElementById('input-coti-cliente')?.focus();
                      } else if (e.key === 'ArrowLeft') {
                        e.preventDefault();
                        document.getElementById('input-coti-doc')?.focus();
                      } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
                        e.preventDefault();
                        document.getElementById('input-coti-obs')?.focus();
                      }
                    }}
                    placeholder="999 888 777"
                    className="w-full border-2 border-[var(--color-ink)] p-2 text-xs font-bold outline-none focus:ring-4 focus:ring-[var(--color-ink)] focus:bg-amber-50 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* FECHA VENCIMIENTO Y NOTAS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-[var(--color-muted)] mb-1 flex items-center gap-1">
                  <Calendar size={12} /> Validez hasta (Vencimiento)
                </label>
                <input
                  id="input-coti-fecha"
                  type="date"
                  value={fechaVencimiento}
                  onChange={(e) => setFechaVencimiento(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      document.getElementById('input-coti-doc')?.focus();
                    } else if (e.key === 'ArrowRight') {
                      e.preventDefault();
                      document.getElementById('input-coti-obs')?.focus();
                    } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
                      e.preventDefault();
                      document.getElementById('btn-confirmar-cotizacion')?.focus();
                    }
                  }}
                  className="w-full border-2 border-[var(--color-ink)] p-2 text-xs font-bold outline-none focus:ring-4 focus:ring-[var(--color-ink)] focus:bg-amber-50 bg-white cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-[var(--color-muted)] mb-1">
                  Observaciones / Términos
                </label>
                <input
                  id="input-coti-obs"
                  type="text"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      document.getElementById('input-coti-tel')?.focus();
                    } else if (e.key === 'ArrowLeft') {
                      e.preventDefault();
                      document.getElementById('input-coti-fecha')?.focus();
                    } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
                      e.preventDefault();
                      document.getElementById('btn-confirmar-cotizacion')?.focus();
                    }
                  }}
                  placeholder="Ej: Precios válidos por 7 días"
                  className="w-full border-2 border-[var(--color-ink)] p-2 text-xs font-bold outline-none focus:ring-4 focus:ring-[var(--color-ink)] focus:bg-amber-50 bg-white"
                />
              </div>
            </div>

            {/* RESUMEN DE PRODUCTOS COTIZADOS */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-black uppercase tracking-widest text-[var(--color-muted)]">
                  Productos a Cotizar ({cart.length})
                </span>
                <span className="text-xs font-black text-[var(--color-ink)]">
                  TOTAL: S/ {total.toFixed(2)}
                </span>
              </div>
              <div className="border-2 border-[var(--color-ink)] max-h-40 overflow-y-auto bg-white custom-scrollbar divide-y divide-[var(--color-border)]">
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
                id="btn-confirmar-cotizacion"
                type="button"
                onClick={handleGuardar}
                disabled={guardando}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    document.getElementById('input-coti-fecha')?.focus();
                  }
                }}
                className="w-full py-3 border-2 border-[var(--color-ink)] bg-[var(--color-ink)] text-white hover:bg-[var(--color-accent)] hover:text-[var(--color-ink)] focus:bg-[var(--color-accent)] focus:text-[var(--color-ink)] focus:outline-none focus:ring-4 focus:ring-[var(--color-ink)] font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-[3px_3px_0_0_var(--color-ink)] active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {guardando ? (
                  <span>Guardando Cotización...</span>
                ) : (
                  <>
                    <FileText size={16} />
                    <span>Guardar Cotización ({numero}) [ENTER]</span>
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
