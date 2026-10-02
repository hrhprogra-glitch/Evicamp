import React, { useState, useEffect } from 'react';
import { X, Banknote, Smartphone, CreditCard, CheckCircle2, Calculator, UserPlus, Calendar, ChevronDown, Plus } from 'lucide-react';
import { supabase } from '../../../db/supabase';
import type { CartItem } from '../types';
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
  // 🛡️ Actualizamos a Promesa para que el botón sepa cuándo terminó
      onConfirm: (pagos: { efectivo: number, yape: number, tarjeta: number }, imprimirBoleta: boolean, fiadoData?: FiadoData) => Promise<void> | void;
    }

    export const ModalCobro: React.FC<Props> = ({ isOpen, onClose, total, onConfirm }) => {
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

  useEffect(() => {
    if (isOpen) {
      setMontoEfectivo(total.toFixed(2));
      setMontoYape('');
      setMontoTarjeta('');
      setImprimirBoleta(true);
      setIsProcessing(false); // 🛡️ REINICIAR CARGA AL ABRIR
      // Limpiar datos de fiado
      setClienteId(''); // <-- AÑADIDO
      setClienteNombre('');
      setSearchCliente('');
      setClienteDni('');
      setClienteTelefono('');
      setFechaVencimiento('');
      setIsDropdownOpen(false);
      setIsCreatingNew(false);

      // Cargar directorio de clientes en segundo plano
      const fetchClientes = async () => {
        const { data } = await traerTodo(() => supabase.from('customers').select('*').order('id'));
        if (data) setClientesDb(data);
      };
      fetchClientes();
    }
  }, [isOpen, total]);

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
                onClick={() => {
                  setIsCreatingNew(true);
                  setClienteNombre('');
                  setClienteDni('');
                  setClienteTelefono('');
                  setSearchCliente('');
                }}
                className="flex items-center gap-1 bg-[var(--color-accent)] text-white px-3 py-1.5 text-[12px] font-black uppercase border-2 border-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] hover:border-[var(--color-accent-dark)] transition-colors rounded-none shadow-[2px_2px_0_0_var(--color-accent-shadow)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] cursor-pointer"
              >
                <Plus size={14}/> Nuevo Cliente
              </button>
            ) : (
              <button 
                onClick={() => {
                  setIsCreatingNew(false);
                  setClienteNombre('');
                  setClienteDni('');
                  setClienteTelefono('');
                }}
                className="flex items-center gap-1 bg-[var(--color-danger)] text-white px-3 py-1.5 text-[12px] font-black uppercase border-2 border-[var(--color-danger)] hover:bg-[var(--color-danger-dark)] hover:border-[var(--color-danger-dark)] transition-colors rounded-none shadow-[2px_2px_0_0_#991B1B] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] cursor-pointer"
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
                  type="text"
                  placeholder="BUSCAR CLIENTE EN EL DIRECTORIO..."
                  value={isDropdownOpen ? searchCliente : clienteNombre}
                  onChange={(e) => {
                    setSearchCliente(e.target.value.toUpperCase());
                    setIsDropdownOpen(true);
                  }}
                  className="w-full text-xs font-black uppercase outline-none bg-transparent text-[var(--color-ink)] placeholder-[var(--color-subtle)]"
                />
                <button type="button" onClick={(e) => { e.stopPropagation(); setIsDropdownOpen(!isDropdownOpen); }} className="text-[var(--color-warning-dark)] hover:text-[var(--color-warning-text)] px-1 cursor-pointer">
                  {isDropdownOpen ? <X size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>

              {/* LISTA DESPLEGABLE CONECTADA A LA BASE DE DATOS */}
              {isDropdownOpen && (
                <div className="absolute z-50 top-[100%] left-0 w-full mt-1 bg-white border-2 border-[var(--color-ink)] shadow-[4px_4px_0_0_var(--color-ink)] max-h-48 overflow-y-auto custom-scrollbar rounded-none">
                  {clientesDb.filter(c => (c.nombre || c.name || '').toUpperCase().includes(searchCliente)).length === 0 ? (
                    <div className="p-4 text-xs font-black uppercase text-[var(--color-muted)] text-center bg-[var(--color-bg)]">
                      NO SE ENCONTRARON CLIENTES
                    </div>
                  ) : (
                    clientesDb
                      .filter(c => (c.nombre || c.name || '').toUpperCase().includes(searchCliente))
                      .map(c => (
                        <div
                          key={c.id}
                          className="p-3 text-[13px] font-black uppercase text-[var(--color-ink)] hover:bg-[var(--color-warning)] hover:text-white cursor-pointer border-b border-[var(--color-border)] last:border-0 transition-colors flex justify-between items-center rounded-none"
                          {...clicConTeclado(() => {
                            setClienteId(c.id?.toString() || ''); // <-- GUARDAMOS EL ID AL SELECCIONAR
                            setClienteNombre(c.nombre || c.name || '');
                            setClienteDni(c.dni || '');
                            setClienteTelefono(c.telefono || '');
                            setSearchCliente('');
                            setIsDropdownOpen(false);
                          })}
                        >
                          <span>{c.nombre || c.name || 'SIN NOMBRE'}</span>
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
                  type="text" 
                  placeholder="EJ: JUAN PEREZ..."
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value.toUpperCase())}
                  className="w-full bg-white border-2 border-[var(--color-warning-border)] p-2 text-xs font-black text-[var(--color-ink)] uppercase outline-none focus:border-[var(--color-warning)] rounded-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[12px] font-bold text-[var(--color-warning-text)] uppercase">DNI (Opcional)</label>
                  <input 
                    type="text" 
                    placeholder="8 DÍGITOS"
                    maxLength={8}
                    value={clienteDni}
                    onChange={(e) => setClienteDni(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-white border-2 border-[var(--color-warning-border)] p-2 text-xs font-bold text-[var(--color-ink)] outline-none focus:border-[var(--color-warning)] rounded-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[12px] font-bold text-[var(--color-warning-text)] uppercase">Celular (Opcional)</label>
                  <input 
                    type="text" 
                    placeholder="NÚMERO"
                    maxLength={9}
                    value={clienteTelefono}
                    onChange={(e) => setClienteTelefono(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-white border-2 border-[var(--color-warning-border)] p-2 text-xs font-bold text-[var(--color-ink)] outline-none focus:border-[var(--color-warning)] rounded-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* FECHA VENCIMIENTO (APLICA PARA AMBOS MODOS) */}
          <div className="space-y-1 mt-1 pt-2 border-t-2 border-[var(--color-warning-border)]">
            <label className="text-[12px] font-black text-[var(--color-warning-text)] uppercase flex items-center gap-1">
              <Calendar size={14}/> Fecha Límite de Pago *
            </label>
            <input 
              type="date" 
              value={fechaVencimiento}
              onChange={(e) => setFechaVencimiento(e.target.value)}
              className="w-full bg-white border-2 border-[var(--color-warning-border)] p-2 text-xs font-black text-[var(--color-ink)] uppercase outline-none focus:border-[var(--color-warning)] rounded-none cursor-pointer"
            />
          </div>

        </div>
  );

  return (
    <div className="fixed inset-0 bg-[var(--color-ink)]/90 backdrop-blur-sm z-[99999] flex items-center justify-center p-2 sm:p-4 font-mono">
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
          <button onClick={onClose} className="hover:text-white transition-colors cursor-pointer">
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
            <button onClick={() => pagoExacto('EFECTIVO')} className="flex-1 bg-white border-2 border-[var(--color-accent)] text-[var(--color-accent)] font-black text-[12px] uppercase py-2 [@media(max-height:700px)]:py-1 hover:bg-[var(--color-accent)] hover:text-white transition-colors cursor-pointer">Exacto Efectivo</button>
            <button onClick={() => pagoExacto('YAPE')} className="flex-1 bg-white border-2 border-[var(--color-purple)] text-[var(--color-purple)] font-black text-[12px] uppercase py-2 [@media(max-height:700px)]:py-1 hover:bg-[var(--color-purple)] hover:text-white transition-colors cursor-pointer">Exacto Yape</button>
            <button onClick={() => pagoExacto('TARJETA')} className="flex-1 bg-white border-2 border-[var(--color-info)] text-[var(--color-info)] font-black text-[12px] uppercase py-2 [@media(max-height:700px)]:py-1 hover:bg-[var(--color-info)] hover:text-white transition-colors cursor-pointer">Exacto Tarjeta</button>
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
                  autoFocus 
                  type="text" 
                  inputMode="decimal"
                  value={montoEfectivo} 
                  onChange={(e) => setMontoEfectivo(e.target.value.replace(/[^0-9.]/g, ''))} 
                  onFocus={(e) => e.target.select()}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && puedeConfirmar) handleCobrar();
                    if (e.key === 'ArrowDown') { e.preventDefault(); document.getElementById('pago-yape')?.focus(); }
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
                  inputMode="decimal"
                  value={montoYape} 
                  onChange={(e) => setMontoYape(e.target.value.replace(/[^0-9.]/g, ''))} 
                  onFocus={(e) => e.target.select()}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && puedeConfirmar) handleCobrar();
                    if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById('pago-efectivo')?.focus(); }
                    if (e.key === 'ArrowDown') { e.preventDefault(); document.getElementById('pago-tarjeta')?.focus(); }
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
                  inputMode="decimal"
                  value={montoTarjeta} 
                  onChange={(e) => setMontoTarjeta(e.target.value.replace(/[^0-9.]/g, ''))} 
                  onFocus={(e) => e.target.select()}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && puedeConfirmar) handleCobrar();
                    if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById('pago-yape')?.focus(); }
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
            type="button"
            onClick={() => setImprimirBoleta(!imprimirBoleta)}
            className={`w-12 h-6 flex items-center border-2 border-[var(--color-ink)] rounded-none p-1 transition-colors cursor-pointer ${
              imprimirBoleta ? 'bg-[var(--color-ink)]' : 'bg-[var(--color-surface)]'
            }`}
          >
            <div className={`w-3 h-3 rounded-none transition-transform duration-200 ${imprimirBoleta ? 'bg-[var(--color-surface)] translate-x-6' : 'bg-[var(--color-ink)] translate-x-0'}`} />
          </button>
        </div>

        <div className="px-4 py-3 [@media(max-height:700px)]:py-2 bg-white border-t-2 border-[var(--color-ink)] shrink-0">
          <button 
            onClick={handleCobrar}
            disabled={!puedeConfirmar || isProcessing}
            className={`w-full py-3 [@media(max-height:700px)]:py-2 border-2 border-[var(--color-ink)] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all shadow-[4px_4px_0_0_var(--color-ink)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] ${
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