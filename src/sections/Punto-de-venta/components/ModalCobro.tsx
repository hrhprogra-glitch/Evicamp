import { coincideBusqueda } from '../../../utils/busqueda';
import React, { useState, useEffect } from 'react';
import { X, Banknote, Smartphone, CreditCard, CheckCircle2, Calculator, UserPlus, Calendar, ChevronDown, Plus } from 'lucide-react';
import { supabase } from '../../../db/supabase';
import type { CartItem, Cliente } from '../types';
import { clicConTeclado } from '../../../utils/clicConTeclado';
import { traerTodo } from '../../../utils/traerTodo';

// NUEVA INTERFAZ PARA LOS DATOS DEL FIADO
export interface FiadoData {
  montoDeuda: number;
  fechaVencimiento: string;
  clienteId?: string; // <-- AÑADIDO: Necesario para enlazar en BD
  clienteNombre: string;
  clienteDni?: string;
  clienteTelefono?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  total: number;
  clienteSeleccionado?: Cliente | null;
  // 🛡️ Actualizamos a Promesa para que el botón sepa cuándo terminó
  onConfirm: (pagos: { efectivo: number, yape: number, tarjeta: number }, imprimirBoleta: boolean, fiadoData?: FiadoData) => Promise<void> | void;
}

export const ModalCobro: React.FC<Props> = ({ isOpen, onClose, total, clienteSeleccionado, onConfirm }) => {
      const [montoEfectivo, setMontoEfectivo] = useState<string>('');
      const [montoYape, setMontoYape] = useState<string>('');
      const [montoTarjeta, setMontoTarjeta] = useState<string>('');
      const [imprimirBoleta, setImprimirBoleta] = useState<boolean>(true);
      const [isProcessing, setIsProcessing] = useState<boolean>(false); // 🛡️ ESTADO DE CARGA

      // === NUEVOS ESTADOS PARA EL FIADO Y BUSCADOR ===
  const [clientesDb, setClientesDb] = useState<any[]>([]);
  const [searchCliente, setSearchCliente] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  const [clienteId, setClienteId] = useState(''); // <-- AÑADIDO
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteDni, setClienteDni] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');

  const [deudaPendiente, setDeudaPendiente] = useState<number>(0);
  const [tieneDeudaVencida, setTieneDeudaVencida] = useState<boolean>(false);

  const [lastOpen, setLastOpen] = useState(false);

  const calcularFechaVencimiento = (dias?: number | null) => {
    const d = new Date();
    const plazo = dias && dias > 0 ? dias : 1;
    d.setDate(d.getDate() + plazo);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const clienteActual = React.useMemo(() => {
    if (clienteId) return clientesDb.find((c) => String(c.id) === String(clienteId)) || null;
    if (clienteNombre) return clientesDb.find((c) => (c.nombre || c.name || '').toUpperCase() === clienteNombre.toUpperCase()) || null;
    return null;
  }, [clientesDb, clienteId, clienteNombre]);

  useEffect(() => {
    if (!clienteId && !clienteNombre) {
      setDeudaPendiente(0);
      setTieneDeudaVencida(false);
      return;
    }
    let cancelado = false;
    const revisarDeudas = async () => {
      try {
        let q = supabase.from('fiados').select('amount, paid_amount, expected_pay_date, status').in('status', ['PENDIENTE', 'VENCIDO']);
        if (clienteId) {
          q = q.eq('customer_id', clienteId);
        } else {
          q = q.eq('customer_name', clienteNombre);
        }
        const { data } = await q;
        if (cancelado || !data) return;
        const hoy = new Date().toLocaleDateString('en-CA');
        let totalDeuda = 0;
        let vencida = false;
        for (const f of data) {
          const saldo = Math.max(0, (Number(f.amount) || 0) - (Number(f.paid_amount) || 0));
          if (saldo > 0.05) {
            totalDeuda += saldo;
            if (f.expected_pay_date && f.expected_pay_date.slice(0, 10) < hoy) {
              vencida = true;
            }
          }
        }
        setDeudaPendiente(totalDeuda);
        setTieneDeudaVencida(vencida);
      } catch {
        // Silencioso
      }
    };
    revisarDeudas();
    return () => { cancelado = true; };
  }, [clienteId, clienteNombre]);

  const seleccionarCliente = (c: any) => {
    setClienteId(c.id?.toString() || '');
    setClienteNombre(c.nombre || c.name || '');
    setClienteDni(c.dni || c.ruc || '');
    setClienteTelefono(c.telefono || '');
    setSearchCliente('');
    setIsDropdownOpen(false);
    const dias = c.dias_plazo != null && !Number.isNaN(Number(c.dias_plazo)) ? Number(c.dias_plazo) : 1;
    setFechaVencimiento(calcularFechaVencimiento(dias));
    setTimeout(() => document.getElementById('fiado-fecha')?.focus(), 50);
  };

  // 🛡️ RESETEO SÍNCRONO: Evita que el panel de fiado parpadee al abrir la ventana
  if (isOpen !== lastOpen) {
    setLastOpen(isOpen);
    if (isOpen) {
      setMontoEfectivo(total.toFixed(2));
      setMontoYape('');
      setMontoTarjeta('');
      setImprimirBoleta(true);
      setIsProcessing(false);
      if (clienteSeleccionado) {
        setClienteId(clienteSeleccionado.id);
        setClienteNombre(clienteSeleccionado.nombre);
        setSearchCliente(clienteSeleccionado.nombre);
        setClienteDni(clienteSeleccionado.dni || clienteSeleccionado.ruc || '');
        setClienteTelefono(clienteSeleccionado.telefono || '');
        setFechaVencimiento(calcularFechaVencimiento(clienteSeleccionado.diasPlazo));
      } else {
        setClienteId('');
        setClienteNombre('');
        setSearchCliente('');
        setClienteDni('');
        setClienteTelefono('');
        setFechaVencimiento(calcularFechaVencimiento(1));
      }
      setIsDropdownOpen(false);
      setIsCreatingNew(false);
    }
  }

  useEffect(() => {
    if (isOpen) {
      // 🛡️ AUTO-FOCO AGRESIVO: Evita que el navegador o eventos nativos de teclado roben el foco
      let intentos = 0;
      const intervaloFoco = setInterval(() => {
        const input = document.getElementById('pago-efectivo') as HTMLInputElement;
        if (input && document.activeElement !== input) {
          input.focus();
          input.select();
        }
        intentos++;
        if (intentos >= 15) { // Medio segundo completo forzando el foco sin importar nada
          clearInterval(intervaloFoco);
        }
      }, 30);

      // Cargar directorio de clientes en segundo plano
      const fetchClientes = async () => {
        const { data } = await traerTodo(() => supabase.from('customers').select('*').order('id'));
        if (data) setClientesDb(data);
      };
      fetchClientes();

      return () => clearInterval(intervaloFoco);
    }
  }, [isOpen]);

  // Desde 900px (tablet horizontal/PC) hay ancho para poner el fiado en su propia ventana a la izquierda
  const [esPantallaMedia, setEsPantallaMedia] = useState(() => window.matchMedia('(min-width: 900px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)');
    const cambiar = () => setEsPantallaMedia(mq.matches);
    mq.addEventListener('change', cambiar);
    return () => mq.removeEventListener('change', cambiar);
  }, []);

  // La ventana de fiado recorta su contenido solo mientras se anima; ya abierta, la lista de clientes
  // puede sobresalir. Se marca abierta al terminar la animación del ancho.
  const [fiadoAbierto, setFiadoAbierto] = useState(false);

  if (!isOpen) return null;

  const numEfectivo = Number(montoEfectivo) || 0;
  const numYape = Number(montoYape) || 0;
  const numTarjeta = Number(montoTarjeta) || 0;

  // 🛡️ MATEMÁTICA CON CÉNTIMOS: Convertimos todo a NÚMEROS ENTEROS.
  // Esto destruye absolutamente cualquier error de punto flotante de Javascript.
  const totalLimpioCents = Math.round(total * 100);
  const totalIngresadoCents = Math.round((numEfectivo + numYape + numTarjeta) * 100);

  // 👇 LA LÍNEA QUE FALTABA PARA LA INTERFAZ VISUAL 👇
  const totalIngresado = totalIngresadoCents / 100;

  const vuelto = totalIngresadoCents > totalLimpioCents ? (totalIngresadoCents - totalLimpioCents) / 100 : 0;
  const faltante = totalIngresadoCents < totalLimpioCents ? (totalLimpioCents - totalIngresadoCents) / 100 : 0;

  // LÓGICA DE VALIDACIÓN HÍBRIDA (Basada 100% en números enteros)
  // 🛡️ El vuelto solo puede salir del cajón en efectivo: Yape + tarjeta nunca pueden superar el total.
  const digitalExcedeTotal = Math.round((numYape + numTarjeta) * 100) > totalLimpioCents;

  const esPagoCompleto = totalIngresadoCents >= totalLimpioCents;
  const esFiadoValido = faltante > 0 && clienteNombre.trim() !== '' && fechaVencimiento !== '';
  const puedeConfirmar = !digitalExcedeTotal && (esPagoCompleto || esFiadoValido);

  const handleCobrar = async () => {
    // 🛡️ BLOQUEO: Ignorar múltiples clics
    if (!puedeConfirmar || isProcessing) return;
    setIsProcessing(true);

    try {
      let finalClienteId = clienteId;

      // AUTOGUARDADO DE NUEVO CLIENTE (Blindado)
      if (faltante > 0 && isCreatingNew && clienteNombre.trim() !== '') {
        const exists = clientesDb.some(c => (c.nombre || c.name || '').toUpperCase() === clienteNombre.toUpperCase() || (clienteDni && c.dni === clienteDni));
        if (exists) {
            alert("⚠️ Error: Ya existe un cliente en el directorio con este Nombre o DNI.");
            return;
        }
        
        const { data, error } = await supabase.from('customers').insert([{
          name: clienteNombre.toUpperCase(),
          dni: clienteDni || null,
          created_at: new Date().toISOString(),
          is_synced: 1 // 🛡️ Corregido a número matemático puro
        }]).select('id').single();

        if (error) throw new Error(`Fallo SQL al crear cliente: ${error.message}`);
        
        // 🛡️ CIBERSEGURIDAD: Verificamos que la BD realmente nos dio un ID válido antes de continuar
        if (!data || data.id === null || data.id === undefined) {
           throw new Error("Violación estructural: La BD guardó al cliente pero no generó un ID. Avisar a soporte técnico.");
        }
        
        finalClienteId = data.id.toString();

        // 🛡️ Si la venta falla y el cajero reintenta, reutilizamos este cliente recién creado
        // en lugar de volver a insertarlo (evita clientes duplicados en el directorio).
        setClienteId(finalClienteId);
        setIsCreatingNew(false);
        setClientesDb(prev => [...prev, { id: data.id, name: clienteNombre.toUpperCase(), dni: clienteDni || null }]);
      }

      const fiadoData: FiadoData | undefined = faltante > 0 ? {
        montoDeuda: faltante,
        fechaVencimiento,
        clienteId: finalClienteId,
        clienteNombre: clienteNombre.toUpperCase(),
        clienteDni: clienteDni || undefined,
        clienteTelefono: clienteTelefono || undefined
      } : undefined;

      // 🛡️ Disparo de la transacción (AWAIT obliga a esperar)
      await onConfirm({ efectivo: numEfectivo, yape: numYape, tarjeta: numTarjeta }, imprimirBoleta, fiadoData);
      
    } catch (error: any) {
      console.error("DEBUG TÉCNICO - FALLO EN COBRO:", error);
      alert(`❌ ERROR DEL SISTEMA: ${error.message}`);
    } finally {
      setIsProcessing(false); // 🛡️ ABRIR CANDADO AL TERMINAR
    }
  };

  const pagoExacto = (metodo: 'EFECTIVO' | 'YAPE' | 'TARJETA') => {
    setMontoEfectivo(metodo === 'EFECTIVO' ? total.toFixed(2) : '');
    setMontoYape(metodo === 'YAPE' ? total.toFixed(2) : '');
    setMontoTarjeta(metodo === 'TARJETA' ? total.toFixed(2) : '');
  };

  // Panel de crédito/fiado: en celular va dentro de la ventana de pago, debajo;
  // desde tablet es una ventana aparte que sale al lado izquierdo de la de pago.
  const panelFiado = (
        <div className="border-2 border-[var(--color-warning)] bg-[var(--color-warning-bg)] p-3 flex flex-col gap-3 shrink-0 min-w-0 rounded-none">
          
          {/* CABECERA DE FIADOS CON BOTÓN DE SWITCH TÉCNICO */}
          <div className="flex items-center justify-between border-b-2 border-[var(--color-warning-border)] pb-2">
            <div className="flex items-center gap-2">
              <UserPlus size={18} className="text-[var(--color-warning)]" />
              <span className="text-xs font-black text-[var(--color-warning-dark)] uppercase tracking-widest">Crédito / Fiado</span>
            </div>

            {!isCreatingNew ? (
              <button 
                id="fiado-btn-toggle"
                onClick={() => {
                  setIsCreatingNew(true);
                  setClienteNombre('');
                  setClienteDni('');
                  setClienteTelefono('');
                  setSearchCliente('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') { e.preventDefault(); document.getElementById('fiado-search')?.focus(); }
                  if (e.key === 'ArrowLeft') { e.preventDefault(); document.getElementById('cobro-btn-close')?.focus(); }
                  if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById('cobro-btn-close')?.focus(); }
                }}
                className="flex items-center gap-1 bg-[var(--color-accent)] text-white px-3 py-1.5 text-[12px] font-black uppercase border-2 border-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] hover:border-[var(--color-accent-dark)] transition-colors rounded-none shadow-[2px_2px_0_0_var(--color-accent-shadow)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] cursor-pointer focus:ring-2 focus:ring-black focus:outline-none"
              >
                <Plus size={14}/> Nuevo Cliente
              </button>
            ) : (
              <button 
                id="fiado-btn-toggle"
                onClick={() => {
                  setIsCreatingNew(false);
                  setClienteNombre('');
                  setClienteDni('');
                  setClienteTelefono('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') { e.preventDefault(); document.getElementById('fiado-nombre')?.focus(); }
                  if (e.key === 'ArrowLeft') { e.preventDefault(); document.getElementById('cobro-btn-close')?.focus(); }
                  if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById('cobro-btn-close')?.focus(); }
                }}
                className="flex items-center gap-1 bg-[var(--color-danger)] text-white px-3 py-1.5 text-[12px] font-black uppercase border-2 border-[var(--color-danger)] hover:bg-[var(--color-danger-dark)] hover:border-[var(--color-danger-dark)] transition-colors rounded-none shadow-[2px_2px_0_0_#991B1B] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] cursor-pointer focus:ring-2 focus:ring-black focus:outline-none"
              >
                <X size={14}/> Cancelar Nuevo
              </button>
            )}
          </div>
          
          {/* CONDICIONAL DE INTERFAZ: BUSCAR O CREAR */}
          {!isCreatingNew ? (
            // MODO 1: BUSCADOR DESPLEGABLE DE CLIENTES EXISTENTES
            <div className="space-y-1 relative">
              <label className="text-[12px] font-black text-[var(--color-warning-text)] uppercase">Buscar Cliente Existente *</label>
              <div 
                className="flex items-center justify-between border-2 border-[var(--color-warning-border)] bg-white p-2 cursor-text transition-colors rounded-none focus-within:border-[var(--color-warning)]"
                {...clicConTeclado(() => setIsDropdownOpen(true))}
              >
                <input
                  id="fiado-search"
                  type="text"
                  autoComplete="off"
                  placeholder="BUSCAR CLIENTE EN EL DIRECTORIO..."
                  value={isDropdownOpen ? searchCliente : clienteNombre}
                  onChange={(e) => {
                    setSearchCliente(e.target.value.toUpperCase());
                    setIsDropdownOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById('fiado-btn-toggle')?.focus(); }
                    if (e.key === 'ArrowLeft') { e.preventDefault(); document.getElementById('pago-efectivo')?.focus(); }
                    if (e.key === 'ArrowDown') { 
                       e.preventDefault(); 
                       const firstItem = document.getElementById('fiado-list-item-0');
                       if (isDropdownOpen && firstItem) {
                         firstItem.focus();
                       } else {
                         document.getElementById('fiado-fecha')?.focus(); 
                       }
                    }
                    if (e.key === 'Delete') { e.preventDefault(); if ((e.target as HTMLInputElement).value === '') onClose(); else { setSearchCliente(''); setClienteNombre(''); setClienteId(''); } }
                  }}
                  className="w-full text-xs font-black uppercase outline-none bg-transparent text-[var(--color-ink)] placeholder-[var(--color-subtle)]"
                />
                <button type="button" onClick={(e) => { e.stopPropagation(); setIsDropdownOpen(!isDropdownOpen); }} className="text-[var(--color-warning-dark)] hover:text-[var(--color-warning-text)] px-1 cursor-pointer">
                  {isDropdownOpen ? <X size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>

              {clienteNombre && (
                <div className="text-[11px] font-bold text-[var(--color-ink)] flex flex-wrap gap-2 items-center pt-1">
                  {clienteActual?.dias_plazo != null && (
                    <span className="bg-white/80 px-1.5 py-0.5 border border-[var(--color-warning-border)]">
                      Plazo: <strong>{clienteActual.dias_plazo} días</strong>
                    </span>
                  )}
                  {deudaPendiente > 0.05 && (
                    <span className="bg-white/80 px-1.5 py-0.5 border border-[var(--color-warning-border)]">
                      Deuda actual: <strong className="text-[var(--color-danger)]">S/ {deudaPendiente.toFixed(2)}</strong>
                    </span>
                  )}
                  {tieneDeudaVencida && (
                    <span className="bg-[var(--color-danger)] text-white px-1.5 py-0.5 font-black uppercase tracking-wider text-[10px]">
                      ⚠ Tiene deudas vencidas
                    </span>
                  )}
                </div>
              )}

              {/* LISTA DESPLEGABLE CONECTADA A LA BASE DE DATOS */}
              {isDropdownOpen && searchCliente.trim() !== '' && (
                <div className="absolute z-50 top-[100%] left-0 w-full mt-1 bg-[var(--color-surface)] border-2 border-[var(--color-border)] shadow-[4px_4px_0_0_var(--color-ink)] max-h-48 overflow-y-auto custom-scrollbar rounded-none">
                  {clientesDb.filter(c => coincideBusqueda([c.nombre, c.name, c.dni, c.telefono], searchCliente)).length === 0 ? (
                    <div className="p-4 text-xs font-black uppercase text-[var(--color-muted)] text-center bg-[var(--color-bg)]">
                      NO SE ENCONTRARON CLIENTES
                    </div>
                  ) : (
                    clientesDb
                      .filter(c => coincideBusqueda([c.nombre, c.name, c.dni, c.telefono], searchCliente))
                      .map((c, index, arr) => (
                        <div
                          key={c.id}
                          id={`fiado-list-item-${index}`}
                          tabIndex={0}
                          className="p-3 text-[13px] font-black uppercase text-[var(--color-ink)] hover:bg-[var(--color-warning)] hover:text-[#030712] focus:bg-[var(--color-warning)] focus:text-[#030712] focus:outline-none cursor-pointer border-b border-[var(--color-border)] last:border-0 transition-colors flex justify-between items-center rounded-none"
                          onKeyDown={(e) => {
                             if (e.key === 'ArrowDown') {
                               e.preventDefault();
                               if (index < arr.length - 1) {
                                 document.getElementById(`fiado-list-item-${index + 1}`)?.focus();
                               } else {
                                 document.getElementById('fiado-fecha')?.focus();
                               }
                             }
                             if (e.key === 'ArrowUp') {
                               e.preventDefault();
                               if (index > 0) {
                                 document.getElementById(`fiado-list-item-${index - 1}`)?.focus();
                               } else {
                                 document.getElementById('fiado-search')?.focus();
                               }
                             }
                             if (e.key === 'Enter' || e.key === ' ') {
                               e.preventDefault();
                               seleccionarCliente(c);
                             }
                          }}
                          onClick={() => {
                            seleccionarCliente(c);
                          }}
                        >
                          <div>
                            <span>{c.nombre || c.name || 'SIN NOMBRE'}</span>
                            {c.dias_plazo != null && (
                              <span className="block text-[10px] font-bold opacity-75">Plazo: {c.dias_plazo} días</span>
                            )}
                          </div>
                          {c.dni && <span className="text-[12px] opacity-70">DNI:{c.dni}</span>}
                        </div>
                      ))
                  )}
                </div>
              )}
            </div>
          ) : (
            // MODO 2: CREACIÓN MANUAL DE CLIENTE (CUADROS PUROS)
            <div className="space-y-3 bg-[#FEF3C7] p-3 border-2 border-[var(--color-warning-border)] rounded-none">
              <div className="space-y-1">
                <label className="text-[12px] font-black text-[var(--color-warning-text)] uppercase">Nombre del Nuevo Cliente *</label>
                <input 
                  id="fiado-nombre"
                  type="text" 
                  autoComplete="off"
                  placeholder="EJ: JUAN PEREZ..."
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById('fiado-btn-toggle')?.focus(); }
                    if (e.key === 'ArrowLeft') { e.preventDefault(); document.getElementById('cobro-btn-close')?.focus(); }
                    if (e.key === 'ArrowDown') { e.preventDefault(); document.getElementById('fiado-dni')?.focus(); }
                    if (e.key === 'Delete') { e.preventDefault(); if ((e.target as HTMLInputElement).value === '') onClose(); else setClienteNombre(''); }
                  }}
                  className="w-full bg-white border-2 border-[var(--color-warning-border)] p-2 text-xs font-black text-[var(--color-ink)] uppercase outline-none focus:border-[var(--color-warning)] rounded-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[12px] font-bold text-[var(--color-warning-text)] uppercase">DNI (Opcional)</label>
                  <input 
                    id="fiado-dni"
                    type="text" 
                    autoComplete="off"
                    placeholder="8 DÍGITOS"
                    maxLength={8}
                    value={clienteDni}
                    onChange={(e) => setClienteDni(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById('fiado-nombre')?.focus(); }
                      if (e.key === 'ArrowDown') { e.preventDefault(); document.getElementById('fiado-celular')?.focus(); }
                      if (e.key === 'ArrowRight') { e.preventDefault(); document.getElementById('fiado-celular')?.focus(); }
                      if (e.key === 'Delete') { e.preventDefault(); if ((e.target as HTMLInputElement).value === '') onClose(); else setClienteDni(''); }
                    }}
                    className="w-full bg-white border-2 border-[var(--color-warning-border)] p-2 text-xs font-bold text-[var(--color-ink)] outline-none focus:border-[var(--color-warning)] rounded-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[12px] font-bold text-[var(--color-warning-text)] uppercase">Celular (Opcional)</label>
                  <input 
                    id="fiado-celular"
                    type="text" 
                    autoComplete="off"
                    placeholder="NÚMERO"
                    maxLength={9}
                    value={clienteTelefono}
                    onChange={(e) => setClienteTelefono(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById('fiado-nombre')?.focus(); }
                      if (e.key === 'ArrowDown') { e.preventDefault(); document.getElementById('fiado-fecha')?.focus(); }
                      if (e.key === 'ArrowLeft') { e.preventDefault(); document.getElementById('fiado-dni')?.focus(); }
                      if (e.key === 'Delete') { e.preventDefault(); if ((e.target as HTMLInputElement).value === '') onClose(); else setClienteTelefono(''); }
                    }}
                    className="w-full bg-white border-2 border-[var(--color-warning-border)] p-2 text-xs font-bold text-[var(--color-ink)] outline-none focus:border-[var(--color-warning)] rounded-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* FECHA VENCIMIENTO (APLICA PARA AMBOS MODOS) */}
          <div className="space-y-1.5 mt-1 pt-2 border-t-2 border-[var(--color-warning-border)]">
            <div className="flex items-center justify-between gap-1 flex-wrap">
              <label 
                htmlFor="fiado-fecha" 
                className="text-[12px] font-black text-[var(--color-warning-text)] uppercase flex items-center gap-1 cursor-pointer"
                onClick={(e) => {
                   e.preventDefault();
                   document.getElementById('fiado-fecha')?.focus();
                   if ('showPicker' in HTMLInputElement.prototype) {
                     try { (document.getElementById('fiado-fecha') as HTMLInputElement).showPicker(); } catch (err) {}
                   }
                }}
              >
                <Calendar size={14}/> Fecha Límite de Pago *
              </label>
              <div className="flex gap-1">
                {[7, 15, 30].map((d) => (
                  <button
                    key={d}
                    type="button"
                    tabIndex={-1}
                    onClick={() => setFechaVencimiento(calcularFechaVencimiento(d))}
                    title={`Poner fecha a ${d} días`}
                    className="px-1.5 py-0.5 text-[10px] font-black uppercase border border-[var(--color-warning-border)] bg-white hover:bg-[var(--color-warning)] text-[var(--color-ink)] cursor-pointer"
                  >
                    +{d}d
                  </button>
                ))}
              </div>
            </div>
            <input autoComplete="off" id="fiado-fecha"
              type="date" 
              value={fechaVencimiento}
              onChange={(e) => setFechaVencimiento(e.target.value)}
              onKeyDown={(e) => {
                 // Enter abre el calendario; al elegir el día con Enter se cierra y el foco vuelve
                 // aquí con la fecha puesta. Para seguir al botón de cobrar: flecha abajo.
                 if (e.key === 'Enter') {
                   e.preventDefault();
                   try { (e.target as HTMLInputElement).showPicker(); }
                   catch { document.getElementById('cobro-btn-confirm')?.focus(); }
                 }
                 if (e.key === 'ArrowUp') { e.preventDefault(); const target = document.getElementById('fiado-celular') || document.getElementById('fiado-search'); target?.focus(); }
                 if (e.key === 'ArrowLeft') { e.preventDefault(); document.getElementById('cobro-btn-confirm')?.focus(); }
                 if (e.key === 'ArrowDown') { e.preventDefault(); document.getElementById('cobro-btn-confirm')?.focus(); }
                 if (e.key === 'Delete') { e.preventDefault(); if ((e.target as HTMLInputElement).value === '') onClose(); else setFechaVencimiento(''); }
              }}
              className="w-full bg-white border-2 border-[var(--color-warning-border)] p-2 text-xs font-black text-[var(--color-ink)] uppercase outline-none focus:border-[var(--color-warning)] rounded-none cursor-pointer"
            />
          </div>

        </div>
  );

  return (
    <div role="dialog" className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-2 sm:p-4 font-mono">
      <div className="relative bg-white w-full max-w-md border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] flex flex-col max-h-[calc(var(--alto-pantalla)*0.94)] sm:max-h-[calc(var(--alto-pantalla)*0.9)]">
        {/* Ventana de fiado (tablet/PC): pegada al lado derecho de la ventana de pago, en
            posición absoluta (relativa a esta misma ventana) para que NUNCA la mueva ni la
            recentre al aparecer/desaparecer — antes las dos se centraban juntas como grupo,
            así que la de pago se corría cada vez que esta se abría. Sale deslizándose desde
            detrás. El +8px deja lugar a la sombra; inert evita llegar con Tab a los campos
            cuando está oculta. */}
        {esPantallaMedia && (
          <div
            inert={faltante <= 0}
            aria-hidden={faltante <= 0}
            onTransitionEnd={(e) => { if (e.target === e.currentTarget && e.propertyName === 'width') setFiadoAbierto(faltante > 0); }}
            className={`absolute top-0 left-full ml-2 pb-2 transition-[width,opacity] duration-300 ease-out motion-reduce:transition-none ${faltante > 0 && (fiadoAbierto || window.matchMedia('(prefers-reduced-motion: reduce)').matches) ? 'overflow-visible' : 'overflow-hidden'} ${faltante > 0 ? 'w-[calc(23rem+8px)] opacity-100' : 'w-0 opacity-0'}`}
          >
            <div className={`bg-white w-[23rem] border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] p-3 transition-transform duration-300 ease-out motion-reduce:transition-none ${faltante > 0 ? 'translate-x-0' : '-translate-x-16'}`}>
              {panelFiado}
            </div>
          </div>
        )}

        <div className="bg-[var(--color-accent)] text-[var(--color-ink)] px-4 py-2 flex items-center justify-between border-b-2 border-[var(--color-ink)] shrink-0">
          <h2 className="text-lg font-black uppercase tracking-widest flex items-center gap-2">
            <Calculator size={20} /> Pago Mixto
          </h2>
          <button 
            id="cobro-btn-close"
            onClick={onClose} 
            onKeyDown={(e) => {
              if (e.key === 'Tab') {
                e.preventDefault();
                if (e.shiftKey) document.getElementById('cobro-btn-confirm')?.focus();
                else document.getElementById('btn-exacto-efectivo')?.focus();
              }
              if (e.key === 'ArrowDown') { e.preventDefault(); document.getElementById('btn-exacto-efectivo')?.focus(); }
              if (e.key === 'ArrowRight') { e.preventDefault(); if (faltante > 0) document.getElementById('fiado-btn-toggle')?.focus(); }
              if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById('cobro-btn-confirm')?.focus(); }
              if (e.key === 'Delete') { e.preventDefault(); onClose(); }
            }}
            className="hover:text-white focus:text-white focus:bg-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] transition-all cursor-pointer p-1"
          >
            <X size={20} strokeWidth={3} />
          </button>
        </div>

        <div className="p-3 bg-[var(--color-bg)] flex flex-col gap-2 overflow-y-auto custom-scrollbar">
          {/* COLUMNA DE PAGO */}
          <div className="flex flex-col gap-2 w-full">
          <div className="bg-[var(--color-ink)] text-white p-3 [@media(max-height:700px)]:py-1.5 text-center border-2 border-[var(--color-ink)] shadow-inner relative shrink-0">
            <p className="text-[12px] font-bold text-[var(--color-subtle)] uppercase tracking-[0.2em] mb-1">Total a Pagar</p>
            <p className="text-2xl sm:text-4xl [@media(max-height:700px)]:text-2xl font-black text-[var(--color-accent)]">S/ {total.toFixed(2)}</p>
          </div>

          <div className="flex gap-2 shrink-0">
            <button id="btn-exacto-efectivo" onClick={() => pagoExacto('EFECTIVO')} onKeyDown={(e) => {
              if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById('cobro-btn-close')?.focus(); }
              if (e.key === 'ArrowRight') { e.preventDefault(); document.getElementById('btn-exacto-yape')?.focus(); }
              if (e.key === 'ArrowDown') { e.preventDefault(); document.getElementById('pago-efectivo')?.focus(); }
            }} className="flex-1 bg-white border-2 border-[var(--color-accent)] text-[var(--color-accent)] font-black text-[12px] uppercase py-2 [@media(max-height:700px)]:py-1 hover:bg-[var(--color-accent)] hover:text-white transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]">Exacto Efectivo</button>
            <button id="btn-exacto-yape" onClick={() => pagoExacto('YAPE')} onKeyDown={(e) => {
              if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById('cobro-btn-close')?.focus(); }
              if (e.key === 'ArrowLeft') { e.preventDefault(); document.getElementById('btn-exacto-efectivo')?.focus(); }
              if (e.key === 'ArrowRight') { e.preventDefault(); document.getElementById('btn-exacto-tarjeta')?.focus(); }
              if (e.key === 'ArrowDown') { e.preventDefault(); document.getElementById('pago-yape')?.focus(); }
            }} className="flex-1 bg-white border-2 border-[var(--color-purple)] text-[var(--color-purple)] font-black text-[12px] uppercase py-2 [@media(max-height:700px)]:py-1 hover:bg-[var(--color-purple)] hover:text-white transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]">Exacto Yape</button>
            <button id="btn-exacto-tarjeta" onClick={() => pagoExacto('TARJETA')} onKeyDown={(e) => {
              if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById('cobro-btn-close')?.focus(); }
              if (e.key === 'ArrowLeft') { e.preventDefault(); document.getElementById('btn-exacto-yape')?.focus(); }
              if (e.key === 'ArrowDown') { e.preventDefault(); document.getElementById('pago-tarjeta')?.focus(); }
            }} className="flex-1 bg-white border-2 border-[var(--color-info)] text-[var(--color-info)] font-black text-[12px] uppercase py-2 [@media(max-height:700px)]:py-1 hover:bg-[var(--color-info)] hover:text-white transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]">Exacto Tarjeta</button>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            <div className="flex items-center justify-between bg-white border-2 border-[var(--color-border)] p-2 [@media(max-height:700px)]:py-0.5 focus-within:border-[var(--color-accent)] transition-colors">
              <div className="flex items-center gap-2 font-black text-[var(--color-ink)] uppercase text-[12px]">
                <Banknote size={16} className="text-[var(--color-accent)]"/> Efectivo
              </div>
              <div className="relative w-28">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 font-black text-[var(--color-muted)] text-sm">S/</span>
                <input 
                  id="pago-efectivo"
                  type="text" 
                  autoComplete="off"
                  inputMode="decimal"
                  value={montoEfectivo} 
                  onChange={(e) => setMontoEfectivo(e.target.value.replace(/[^0-9.]/g, ''))} 
                  onFocus={(e) => e.target.select()}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && puedeConfirmar) handleCobrar();
                    if (e.key === 'ArrowDown') { e.preventDefault(); document.getElementById('pago-yape')?.focus(); }
                    if (e.key === 'ArrowRight') { e.preventDefault(); if (faltante > 0) { (document.getElementById('fiado-nombre') || document.getElementById('fiado-search'))?.focus(); } }
                    if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById('btn-exacto-efectivo')?.focus(); }
                    if (e.key === 'Tab') {
                       e.preventDefault();
                       if (e.shiftKey) document.getElementById('cobro-btn-close')?.focus();
                       else document.getElementById('pago-yape')?.focus();
                    }
                    if (e.key === 'Delete') {
                       e.preventDefault();
                       if (montoEfectivo === '') onClose();
                       else setMontoEfectivo('');
                    }
                  }} 
                  className="w-full bg-transparent p-1 pl-6 text-base font-black text-right outline-none text-[var(--color-ink)] focus:bg-[var(--color-accent-bg)]" 
                  placeholder="0.00" 
                />
              </div>
            </div>
            <div className="flex items-center justify-between bg-white border-2 border-[var(--color-border)] p-2 [@media(max-height:700px)]:py-0.5 focus-within:border-[var(--color-purple)] transition-colors">
              <div className="flex items-center gap-2 font-black text-[var(--color-ink)] uppercase text-[12px]">
                <Smartphone size={16} className="text-[var(--color-purple)]"/> Yape
              </div>
              <div className="relative w-28">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 font-black text-[var(--color-muted)] text-sm">S/</span>
                <input 
                  id="pago-yape"
                  type="text" 
                  autoComplete="off"
                  inputMode="decimal"
                  value={montoYape} 
                  onChange={(e) => setMontoYape(e.target.value.replace(/[^0-9.]/g, ''))} 
                  onFocus={(e) => e.target.select()}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && puedeConfirmar) handleCobrar();
                    if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById('pago-efectivo')?.focus(); }
                    if (e.key === 'ArrowRight') { e.preventDefault(); if (faltante > 0) { (document.getElementById('fiado-nombre') || document.getElementById('fiado-search'))?.focus(); } }
                    if (e.key === 'ArrowDown') { e.preventDefault(); document.getElementById('pago-tarjeta')?.focus(); }
                    if (e.key === 'Tab') {
                       e.preventDefault();
                       if (e.shiftKey) document.getElementById('pago-efectivo')?.focus();
                       else document.getElementById('pago-tarjeta')?.focus();
                    }
                    if (e.key === 'Delete') {
                       e.preventDefault();
                       if (montoYape === '') onClose();
                       else setMontoYape('');
                    }
                  }} 
                  className="w-full bg-transparent p-1 pl-6 text-base font-black text-right outline-none text-[var(--color-ink)] focus:bg-[#F3E8FF]" 
                  placeholder="0.00" 
                />
              </div>
            </div>
            <div className="flex items-center justify-between bg-white border-2 border-[var(--color-border)] p-2 [@media(max-height:700px)]:py-0.5 focus-within:border-[var(--color-info)] transition-colors">
              <div className="flex items-center gap-2 font-black text-[var(--color-ink)] uppercase text-[12px]">
                <CreditCard size={16} className="text-[var(--color-info)]"/> Tarjeta
              </div>
              <div className="relative w-28">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 font-black text-[var(--color-muted)] text-sm">S/</span>
                <input 
                  id="pago-tarjeta"
                  type="text" 
                  autoComplete="off"
                  inputMode="decimal"
                  value={montoTarjeta} 
                  onChange={(e) => setMontoTarjeta(e.target.value.replace(/[^0-9.]/g, ''))} 
                  onFocus={(e) => e.target.select()}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && puedeConfirmar) handleCobrar();
                    if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById('pago-yape')?.focus(); }
                    if (e.key === 'ArrowRight') { e.preventDefault(); if (faltante > 0) { (document.getElementById('fiado-nombre') || document.getElementById('fiado-search'))?.focus(); } }
                    if (e.key === 'ArrowDown') { e.preventDefault(); document.getElementById('cobro-btn-imprimir')?.focus(); }
                    if (e.key === 'Tab') {
                       e.preventDefault();
                       if (e.shiftKey) document.getElementById('pago-yape')?.focus();
                       else document.getElementById('cobro-btn-confirm')?.focus();
                    }
                    if (e.key === 'Delete') {
                       e.preventDefault();
                       if (montoTarjeta === '') onClose();
                       else setMontoTarjeta('');
                    }
                  }} 
                  className="w-full bg-transparent p-1 pl-6 text-base font-black text-right outline-none text-[var(--color-ink)] focus:bg-[var(--color-info-bg-2)]" 
                  placeholder="0.00" 
                />
              </div>
            </div>
          </div>
          </div>

          {/* En celular va dentro de la ventana de pago y aparece bajando suave */}
          {!esPantallaMedia && faltante > 0 && <div className="aparecer-fiado">{panelFiado}</div>}

        </div>

        {/* RESUMEN FIJO: siempre visible (en la TV la zona de arriba se desplaza) */}
        <div className="px-3 py-2 bg-[var(--color-bg)] border-t-2 border-[var(--color-border)] flex flex-col gap-2 shrink-0">
        <div className="bg-white border-2 border-[var(--color-border)] px-3 py-2 flex flex-col gap-1 [@media(max-height:700px)]:flex-row [@media(max-height:700px)]:items-center [@media(max-height:700px)]:justify-between [@media(max-height:700px)]:gap-4 shrink-0">
          <div className="flex justify-between items-center gap-2 text-[12px] font-black uppercase text-[var(--color-muted)]">
            <span>Ingresado:</span>
            <span>S/ {totalIngresado.toFixed(2)}</span>
          </div>
          {faltante > 0 ? (
            <div className="flex justify-between items-center border-t-2 border-dashed border-[var(--color-border)] pt-1 [@media(max-height:700px)]:border-t-0 [@media(max-height:700px)]:pt-0 [@media(max-height:700px)]:gap-3">
              <span className="text-[12px] font-black uppercase text-[var(--color-warning)]">Falta cobrar:</span>
              <span className="text-lg font-black text-[var(--color-warning)]">S/ {faltante.toFixed(2)}</span>
            </div>
          ) : (
            <div className="flex justify-between items-center border-t-2 border-dashed border-[var(--color-border)] pt-1 [@media(max-height:700px)]:border-t-0 [@media(max-height:700px)]:pt-0 [@media(max-height:700px)]:gap-3">
              <span className="text-[12px] font-black uppercase text-[var(--color-info)]">Vuelto:</span>
              <span className="text-xl font-black text-[var(--color-info)]">S/ {vuelto.toFixed(2)}</span>
            </div>
          )}
        </div>

        {digitalExcedeTotal && (
          <div role="alert" className="border-2 border-[var(--color-danger)] bg-[var(--color-danger-bg)] text-[#B91C1C] p-2 text-[12px] font-black uppercase shrink-0">
            Yape y tarjeta no pueden superar el total; el vuelto solo sale del efectivo.
          </div>
        )}
        </div>

        <div className="flex items-center justify-between px-4 py-2 [@media(max-height:700px)]:py-1 bg-[var(--color-surface)] border-t-2 border-[var(--color-border)] shrink-0">
          <span className="text-[var(--color-ink)] font-black text-[12px] uppercase tracking-widest">
            Imprimir Boleta Física
          </span>
          <button
            id="cobro-btn-imprimir"
            type="button"
            onClick={() => setImprimirBoleta(!imprimirBoleta)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById('pago-tarjeta')?.focus(); }
              if (e.key === 'ArrowDown') { e.preventDefault(); document.getElementById('cobro-btn-confirm')?.focus(); }
              if (e.key === 'Enter') { e.preventDefault(); setImprimirBoleta(!imprimirBoleta); }
            }}
            className={`w-12 h-6 flex items-center border-2 border-[var(--color-ink)] rounded-none p-1 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] focus:ring-offset-1 ${
              imprimirBoleta ? 'bg-[var(--color-ink)]' : 'bg-[var(--color-surface)]'
            }`}
          >
            <div className={`w-3 h-3 rounded-none transition-transform duration-200 ${imprimirBoleta ? 'bg-[var(--color-surface)] translate-x-6' : 'bg-[var(--color-ink)] translate-x-0'}`} />
          </button>
        </div>

        <div className="px-4 py-3 [@media(max-height:700px)]:py-2 bg-white border-t-2 border-[var(--color-ink)] shrink-0">
          <button 
            id="cobro-btn-confirm"
            onClick={handleCobrar}
            onKeyDown={(e) => {
              if (e.key === 'Tab') {
                 e.preventDefault();
                 if (e.shiftKey) document.getElementById('pago-tarjeta')?.focus();
                 else document.getElementById('cobro-btn-close')?.focus();
              }
              if (e.key === 'ArrowDown') { e.preventDefault(); document.getElementById('cobro-btn-close')?.focus(); }
              if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById('cobro-btn-imprimir')?.focus(); }
              if (e.key === 'ArrowRight') { e.preventDefault(); if (faltante > 0) document.getElementById('fiado-fecha')?.focus(); }
              if (e.key === 'Delete') { e.preventDefault(); onClose(); }
            }}
            disabled={!puedeConfirmar || isProcessing}
            className={`w-full py-3 [@media(max-height:700px)]:py-2 border-2 border-[var(--color-ink)] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all shadow-[4px_4px_0_0_var(--color-ink)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] focus:outline-none focus:ring-4 focus:ring-[var(--color-ink)] ${
              (!puedeConfirmar || isProcessing) ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-70' :
              faltante > 0 ? 'bg-[var(--color-warning)] text-[var(--color-ink)] cursor-pointer' : 'bg-[var(--color-ink)] text-white hover:bg-[var(--color-accent)] hover:text-[var(--color-ink)] cursor-pointer'
            }`}
          >
            {/* ⚡ Respuesta inmediata: Solo cambia el ícono mientras procesa */}
            {isProcessing ? <CheckCircle2 size={20} className="animate-ping" /> : <CheckCircle2 size={20} />}
            <span>{isProcessing ? 'GUARDANDO...' : (faltante > 0 ? `FIAR S/ ${faltante.toFixed(2)}` : 'CONFIRMAR PAGO')}</span>
          </button>
        </div>

      </div>
      </div>
  );
};