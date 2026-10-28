import React, { useState, useEffect } from 'react';
import { Coins, Users, BookOpen } from 'lucide-react';
import { supabase } from '../../db/supabase';
import { TablaFiadosAgrupados } from './components/TablaFiadosAgrupados';
import { ModalFiado } from './components/ModalFiado';
import { ModalAbono } from './components/ModalAbono';
import { ModalDetalleFiado } from './components/ModalDetalleFiado';
import { ModalAnularPago } from './components/ModalAnularPago';
import { ModalEstadoCuenta } from './components/ModalEstadoCuenta';
import type { ClienteFiadoAgrupado } from './types'; // <-- Nuevo modal
import type { Fiado, Cliente, PagoAbono } from './types'; // <-- Importamos PagoAbono
import type { Product } from '../Inventario/types';
import { usePermiso } from '../../utils/permisos';
import { traerTodo } from '../../utils/traerTodo';
import { eliminarAbonoYRevertirCaja } from '../../utils/revertirAbono';
import { TarjetaMetrica } from '../Inventario/components/TarjetaMetrica';
import { confirmar, avisar } from '../../utils/dialogos';
import { tipoDeNumero } from '../../utils/documento';
import { PestanaClientes } from './components/PestanaClientes';
import { ModalFichaCliente, type DatosCliente } from './components/ModalFichaCliente';
import { ModalDetalleCliente } from './components/ModalDetalleCliente';
import { ModalUnirClientes } from './components/ModalUnirClientes';
import { claseBotonBarra } from '../../components/ListaVentana';

// Sección CLIENTES (fase 4.1, antes "Créditos"): pestañas Clientes (el directorio, nuevo) y Créditos (la de siempre:
// deudas por cliente, abonos, estado de cuenta). La pestaña se recuerda; "Por cobrar" de la Caja abre Créditos.
type Pestana = 'CLIENTES' | 'CREDITOS';
const PESTANAS: { id: Pestana; nombre: string; boton: string }[] = [
  { id: 'CLIENTES', nombre: 'Clientes', boton: 'tab-clientes-clientes' },
  { id: 'CREDITOS', nombre: 'Créditos', boton: 'tab-clientes-creditos' },
];
const pestanaGuardada = (): Pestana => { try { return sessionStorage.getItem('clientes_pestana') === 'CREDITOS' ? 'CREDITOS' : 'CLIENTES'; } catch { return 'CLIENTES'; } };

export const Clientes: React.FC = () => {
  const [pestana, setPestanaEstado] = useState<Pestana>(pestanaGuardada);
  const setPestana = (p: Pestana) => { setPestanaEstado(p); try { sessionStorage.setItem('clientes_pestana', p); } catch { /* sin almacenamiento */ } };
  const buscadorDe = (p: Pestana) => (p === 'CLIENTES' ? 'buscador-clientes' : 'buscador-global-fiados');
  // Ficha del cliente (nuevo o editar)
  const [fichaAbierta, setFichaAbierta] = useState(false);
  const [clienteEnFicha, setClienteEnFicha] = useState<Cliente | null>(null);
  const abrirFicha = (c: Cliente | null) => { setClienteEnFicha(c); setFichaAbierta(true); };
  // Detalle del cliente (4.1b) y unir repetidos: por id, así muestran siempre los datos al día
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [unirId, setUnirId] = useState<string | null>(null);
  // Crear deudas es como vender a crédito
  const [loading, setLoading] = useState(true);
  const [fiados, setFiados] = useState<Fiado[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productosInventario, setProductosInventario] = useState<Product[]>([]);
  
  const [isModalFiadoOpen, setIsModalFiadoOpen] = useState(false);
  const [fiadoAEditar, setFiadoAEditar] = useState<Fiado | null>(null);

  const [isModalAbonoOpen, setIsModalAbonoOpen] = useState(false);
  const [fiadoAAbonar, setFiadoAAbonar] = useState<Fiado | null>(null);

  const [isModalEstadoCuentaOpen, setIsModalEstadoCuentaOpen] = useState(false);
  const [clienteEstadoCuenta, setClienteEstadoCuenta] = useState<ClienteFiadoAgrupado | null>(null);

  // Estados para el Modal de Ver Detalles
  const [isModalDetalleOpen, setIsModalDetalleOpen] = useState(false);
  const [fiadoAVer, setFiadoAVer] = useState<Fiado | null>(null);

  // Estados para el Modal de Anular Pagos
  const [isModalAnularOpen, setIsModalAnularOpen] = useState(false);
  const [fiadoAAnular, setFiadoAAnular] = useState<Fiado | null>(null);

  // Cargar datos desde Supabase al iniciar
  const cargarDatos = async (silencioso = false) => {
    if (!silencioso) setLoading(true);
      // 🔥 OPTIMIZACIÓN: Lanzamos todas las consultas al mismo tiempo (Paralelo)
      const [
        { data: prods },
        { data: clis },
        { data: fiaData },
        { data: pagosData }
      ] = await Promise.all([
        traerTodo(() => supabase.from('products').select('*').order('id')),
        traerTodo(() => supabase.from('customers').select('*').order('id')),
        // Filtro Ampliado: Descarga también los CANCELADOS para poder visualizarlos en la tabla como 'PAGADOS'
        traerTodo(() => supabase.from('fiados').select('*').in('status', ['PENDIENTE', 'VENCIDO', 'CANCELADO']).order('id')),
        traerTodo(() => supabase.from('debt_payments').select('*').order('id'))
      ]);

      // OPTIMIZACIÓN: Solo descargar detalles de las ventas que corresponden a fiados
      let detailsData: any[] = [];
      if (fiaData && fiaData.length > 0) {
        const saleIds = Array.from(new Set(fiaData.map(f => f.sale_id).filter(id => id != null)));
        
        if (saleIds.length > 0) {
          // Dividir en lotes de 200 para no exceder los límites
          const CHUNK_SIZE = 200;
          for (let i = 0; i < saleIds.length; i += CHUNK_SIZE) {
            const chunk = saleIds.slice(i, i + CHUNK_SIZE);
            const { data } = await supabase.from('sale_details')
              .select('sale_id, product_id, product_name, quantity, price_at_moment, subtotal')
              .in('sale_id', chunk);
            if (data) detailsData.push(...data);
          }
        }
      }

      // 1. Asignar Inventario
      if (prods) setProductosInventario(prods as Product[]);

      // 2. Asignar Clientes
if (clis) {
  const clientesMapeados: Cliente[] = clis.map(c => ({
    id: c.id?.toString() ?? 'ID_NULO', // <-- PROTECCIÓN AQUÍ
    nombre: c.name ?? 'Sin Nombre',
    dni: c.dni ?? '',
    // Fase 4.1: antes el teléfono no se guardaba (siempre vacío)
    telefono: c.telefono ?? '',
    tipoDoc: tipoDeNumero(c.dni, c.tipo_doc),
    direccion: c.direccion ?? '',
    referencia: c.referencia ?? '',
  }));
  setClientes(clientesMapeados);
}

// 3. Procesar Fiados y Pagos
if (fiaData) {
  const fiadosMapeados: Fiado[] = fiaData
    .filter(f => f.status !== 'ANULADO') // 🔥 OCULTAR LOS ANULADOS AUTOMÁTICAMENTE
    .map((f, indexFiado) => {
    // <-- PROTECCIÓN EN LA COMPARACIÓN (f.id puede venir nulo)
    const susPagos = (pagosData || []).filter(p => p.fiado_id?.toString() === f.id?.toString());
    
    const historialPagos: PagoAbono[] = susPagos.map((p, indexPago) => ({
      id: p.id ? p.id.toString() : `err-pago-${indexPago}-${Date.now()}`,
      monto: Number(p.amount) || 0,
      metodo: p.payment_type || 'Mixto',
      fecha: p.created_at
    }));

    const susDetalles = (detailsData || []).filter(d => d.sale_id?.toString() === f.sale_id?.toString()).map(d => ({
      productoId: d.product_id,
      name: d.product_name,
      qty: Number(d.quantity),
      price: Number(d.price_at_moment),
      subtotal: Number(d.subtotal)
    }));

    // 🛡️ CÁLCULO MATEMÁTICO BLINDADO (Ignora errores o retrasos de Base de Datos)
    const sumaDetalles = susDetalles.reduce((acc, det) => acc + (Number(det.subtotal) || 0), 0);
      const montoOriginal = Number(f.amount) || 0;

      let montoPagadoReal = historialPagos.reduce((sum, p) => sum + p.monto, 0);

      // Si la base de datos dice que se pagó más de lo que tenemos registrado en debt_payments:
      const totalPagadoEnBD = Number(f.paid_amount) || 0;
      const abonoAntiguoFaltante = Math.max(0, totalPagadoEnBD - montoPagadoReal);
      
      if (abonoAntiguoFaltante > 0.05) {
        historialPagos.push({
          id: `antiguo-${f.id}`,
          monto: abonoAntiguoFaltante,
          metodo: 'PAGO ANTIGUO O DESCUENTO',
          fecha: f.date_given
        });
        montoPagadoReal += abonoAntiguoFaltante;
      }
    const saldoPendienteReal = Math.max(0, montoOriginal - montoPagadoReal);
    
    // 🛡️ ESTADO TÉCNICO: Solo existe PENDIENTE o PAGADO (Tolerancia estricta de 0.05)
    const estadoFinal = saldoPendienteReal <= 0.05 ? 'PAGADO' : 'PENDIENTE';

    return {
      id: f.id ? f.id.toString() : `err-fiado-${indexFiado}-${Date.now()}`,
      sale_id: f.sale_id?.toString(),
      clienteId: f.customer_id?.toString(),
      clienteNombre: f.customer_name || 'Desconocido',
      montoOriginal: montoOriginal,
        montoPagado: montoPagadoReal,
        saldoPendiente: estadoFinal === 'PAGADO' ? 0 : saldoPendienteReal,
      fechaEmision: f.date_given,
      fechaVencimiento: f.expected_pay_date || f.date_given,
      estado: estadoFinal,
      detalles: susDetalles, 
      pagos: historialPagos
    } as any;
  });
  
  // <-- PROTECCIÓN EN EL SORT (Asegura que fechaEmision exista)
  setFiados(fiadosMapeados.sort((a, b) => {
      const timeA = a.fechaEmision ? new Date(a.fechaEmision).getTime() : 0;
      const timeB = b.fechaEmision ? new Date(b.fechaEmision).getTime() : 0;
      return timeB - timeA;
    }));
  }
  setLoading(false);
    };

  useEffect(() => {
    cargarDatos();
  }, []);

  // 🔥 RESTAURAR FOCO AL CERRAR MODALES O TERMINAR DE CARGAR
  useEffect(() => {
    if (!loading && !isModalFiadoOpen && !isModalAbonoOpen && !isModalDetalleOpen && !isModalAnularOpen && !isModalEstadoCuentaOpen && !fichaAbierta && !detalleId && !unirId) {
      setTimeout(() => {
        // Solo si el selector no está ya en algo de la pantalla (al cerrar una ventana vuelve a su fila: ventanas.ts)
        const a = document.activeElement;
        if (!document.querySelector('[role="dialog"]') && (!a || a === document.body)) {
          document.getElementById(buscadorDe(pestana))?.focus();
        }
      }, 100);
    }
  }, [loading, isModalFiadoOpen, isModalAbonoOpen, isModalDetalleOpen, isModalAnularOpen, isModalEstadoCuentaOpen, fichaAbierta, detalleId, unirId, pestana]);

  const clientesAgrupados = React.useMemo(() => {
    const mapa = new Map<string, ClienteFiadoAgrupado>();
    fiados.forEach(f => {
      const nombre = f.clienteNombre || 'CLIENTE DESCONOCIDO';
      if (!mapa.has(nombre)) {
        mapa.set(nombre, {
          clienteNombre: nombre,
          clienteId: f.clienteId,
          clienteDni: f.clienteDni,
          clienteTelefono: f.clienteTelefono,
          totalOriginal: 0,
          totalPendiente: 0,
          totalPagado: 0,
          fiados: []
        });
      }
      const agrupado = mapa.get(nombre)!;
      agrupado.fiados.push(f);
      agrupado.totalOriginal += Number(f.montoOriginal) || 0;
      agrupado.totalPendiente += Number(f.saldoPendiente) || 0;
      agrupado.totalPagado += Number(f.montoPagado) || 0;
    });
    return Array.from(mapa.values()).sort((a, b) => b.totalPendiente - a.totalPendiente);
  }, [fiados]);

  const clienteActualEstadoCuenta = React.useMemo(() => {
    if (!clienteEstadoCuenta) return null;
    return clientesAgrupados.find(c => c.clienteNombre === clienteEstadoCuenta.clienteNombre) || clienteEstadoCuenta;
  }, [clienteEstadoCuenta, clientesAgrupados]);

  const handleSaveFiado = async () => {
    setIsModalFiadoOpen(false);
    // Como el Modal ya hizo todos los cálculos y grabó en la Base de Datos,
    // solo recargamos la tabla limpiamente para mostrar los cambios reales.
    await cargarDatos(); 
  };

  const handleConfirmAbono = async () => {
    // 🚀 CORRECCIÓN: ModalAbono ya guardó todo en la Base de Datos correctamente.
    // Ya no duplicamos el guardado ni borramos el fiado, así aparecerá en tus REPORTES.
    setIsModalAbonoOpen(false);
    await cargarDatos(); // Refresca la tabla con los datos nuevos
  };

  const handleAnularPagoEspecifico = async (pagoId: string, montoRestaurar: number) => {
    if (!fiadoAAnular) return;
    
    if (await confirmar(`⚠️ ANULACIÓN TÉCNICA: ¿Seguro que deseas anular este pago de S/ ${montoRestaurar.toFixed(2)}?`)) {
      try {
        // 1. Releemos el pago completo: necesitamos session_id/amount/created_at exactos
        // para poder encontrar y borrar su movimiento de caja gemelo (ver revertirAbono.ts).
        const { data: pago, error: errFetch } = await supabase
          .from('debt_payments')
          .select('id, session_id, amount, created_at')
          .eq('id', pagoId)
          .single();
        if (errFetch || !pago) {
          throw errFetch || new Error('El pago no existe o ya fue anulado.');
        }

        // 2. ELIMINACIÓN MAESTRA: borra el pago Y su movimiento INGRESO_FIADO en caja.
        // El trigger update_fiado_status (AFTER DELETE en debt_payments) recalcula solo
        // fiados.paid_amount = SUMA de los abonos que quedan, y el estado PENDIENTE/CANCELADO.
        // Por eso aquí NO se toca la tabla fiados: antes también se restaba desde la app
        // y el monto anulado quedaba descontado dos veces.
        await eliminarAbonoYRevertirCaja(pago);

        // 3. RECARGAR DATOS
        alert("✅ Anulación completada: La deuda se restauró y el ingreso desapareció de Finanzas, Caja y Reportes automáticamente.");
        setIsModalAnularOpen(false);
        await cargarDatos(); 
      } catch (error) {
        console.error("Error al anular pago:", error);
        const detalle = error instanceof Error ? error.message : (error as any)?.message;
        alert("Fallo de integridad: No se pudo anular el pago." + (detalle ? `\n${detalle}` : ''));
      }
    }
  };

  const handleView = async (fiado: any) => {
    setFiadoAVer({ ...fiado, detalles: [] });
    setIsModalDetalleOpen(true);

    if (fiado.sale_id) {
      const { data, error } = await supabase
        .from('sale_details')
        .select('product_id, product_name, quantity, price_at_moment, subtotal')
        .eq('sale_id', fiado.sale_id);

      if (!error && data && data.length > 0) {
        const detallesCompletos = data.map((d: any) => ({
          productoId: d.product_id,
          name: d.product_name,
          qty: Number(d.quantity),
          price: Number(d.price_at_moment),
          subtotal: Number(d.subtotal)
        }));
        setFiadoAVer({ ...fiado, detalles: detallesCompletos });
      }
    }
  };

  // NUEVA FUNCIÓN: Descarga los productos de la BD antes de abrir el modal de Edición
  const handleEditFiado = async (fiado: any) => {
    // 1. Abrimos el modal con la información base de la deuda
    setFiadoAEditar({ ...fiado, detalles: [] });
    setIsModalFiadoOpen(true);

    // 2. Si existe un registro de venta (sale_id), descargamos sus productos
    if (fiado.sale_id) {
      const { data, error } = await supabase
        .from('sale_details')
        .select('product_id, product_name, quantity, price_at_moment, subtotal')
        .eq('sale_id', fiado.sale_id);

      if (!error && data && data.length > 0) {
        const detallesCompletos = data.map((d: any) => ({
          productoId: d.product_id,
          name: d.product_name,
          qty: Number(d.quantity),
          price: Number(d.price_at_moment),
          subtotal: Number(d.subtotal)
        }));
        
        // 3. Inyectamos los productos en el estado de edición
        setFiadoAEditar({ ...fiado, detalles: detallesCompletos });
      }
    }
  };

  // --- FUNCIONES DE CLIENTES CON SUPABASE ---
  // Fase 4.1: crea o edita con la ficha completa (documento, teléfono, dirección, referencia). Devuelve si se guardó.
  const guardarCliente = async (d: DatosCliente, id?: string): Promise<boolean> => {
    const fila = { name: d.nombre, dni: d.dni || null, tipo_doc: d.tipoDoc || null, telefono: d.telefono || null, direccion: d.direccion || null, referencia: d.referencia || null };
    const nuevo: Omit<Cliente, 'id'> = { nombre: d.nombre, dni: d.dni, tipoDoc: d.tipoDoc, telefono: d.telefono, direccion: d.direccion, referencia: d.referencia };
    if (id) {
      const { error } = await supabase.from('customers').update(fila).eq('id', id);
      if (error) { alert('Error al actualizar cliente: ' + error.message); return false; }
      setClientes((lista) => lista.map((c) => (c.id === id ? { ...c, ...nuevo } : c)));
      // Sus créditos muestran el nombre nuevo
      if (clientes.find((c) => c.id === id)?.nombre !== d.nombre) await cargarDatos(true);
      return true;
    }
    const { data, error } = await supabase.from('customers').insert([{ ...fila, created_at: new Date().toISOString(), is_synced: '1' }]).select().single();
    if (error) { alert('Error al guardar cliente: ' + error.message); return false; }
    setClientes((lista) => [...lista, { ...nuevo, id: String(data.id) }]);
    return true;
  };

  const handleDeleteCliente = async (id: string) => {
    // 🛡️ Blindaje en el propio app: no confiamos solo en que la base de datos rechace el
    // borrado (puede no tener la restricción de integridad activa). Si el cliente tiene
    // saldo pendiente en cualquier fiado, bloqueamos antes de siquiera pedir confirmación.
    const cliente = clientes.find(c => c.id === id);
    const deudaActiva = fiados
      .filter(f => (f.clienteId ? f.clienteId === id : f.clienteNombre === cliente?.nombre) && f.saldoPendiente > 0)
      .reduce((acc, f) => acc + f.saldoPendiente, 0);

    if (deudaActiva > 0) {
      return alert(`⚠️ No se puede eliminar: este cliente tiene una deuda activa de S/ ${deudaActiva.toFixed(2)}. Primero debe saldarla o anular el fiado correspondiente.`);
    }

    if (await confirmar('⚠️ ¿Estás seguro de ELIMINAR a este cliente del directorio?')) {
      // Borrar en Supabase
      const { error } = await supabase.from('customers').delete().eq('id', id);

      if (error) return alert('No se pudo eliminar al cliente: ' + error.message);
      setClientes(clientes.filter(c => c.id !== id));
    }
  };
  // ------------------------------------

  // Fase 4.1b: unir un cliente repetido (seVa) con el que queda. Sus créditos pasan al que queda (uno por uno, por id:
  // así funciona igual sin internet), se completan los datos que le falten y el repetido se borra.
  const unirClientes = async (queda: Cliente, seVa: Cliente): Promise<boolean> => {
    const idQueda = /^\d+$/.test(queda.id) ? Number(queda.id) : queda.id;
    const suyos = fiados.filter((f) => (f.clienteId ? f.clienteId === seVa.id : f.clienteNombre === seVa.nombre));
    for (const f of suyos) {
      const { error } = await supabase.from('fiados').update({ customer_id: idQueda, customer_name: queda.nombre }).eq('id', f.id);
      if (error) { await avisar(`No se pudo pasar un crédito de "${seVa.nombre}": ${error.message}`); await cargarDatos(true); return false; }
    }
    const completar: Record<string, string> = {};
    if (!queda.dni && seVa.dni) { completar.dni = seVa.dni; if (seVa.tipoDoc) completar.tipo_doc = seVa.tipoDoc; }
    if (!queda.telefono && seVa.telefono) completar.telefono = seVa.telefono;
    if (!queda.direccion && seVa.direccion) completar.direccion = seVa.direccion;
    if (!queda.referencia && seVa.referencia) completar.referencia = seVa.referencia;
    if (Object.keys(completar).length) {
      const { error } = await supabase.from('customers').update(completar).eq('id', queda.id);
      if (error) { await avisar(`No se pudieron completar los datos: ${error.message}`); }
    }
    const { error } = await supabase.from('customers').delete().eq('id', seVa.id);
    if (error) { await avisar(`Los créditos ya pasaron, pero no se pudo borrar "${seVa.nombre}": ${error.message}`); }
    await cargarDatos(true);
    await avisar(`Listo: ${suyos.length} crédito(s) de "${seVa.nombre}" pasaron a "${queda.nombre}".`);
    return true;
  };

  // Estado de cuenta de un cliente (desde su detalle): sus créditos agrupados
  const verEstadoCuenta = (c: Cliente) => {
    const grupo = clientesAgrupados.find((g) => (g.clienteId ? g.clienteId === c.id : g.clienteNombre === c.nombre)) || clientesAgrupados.find((g) => g.clienteNombre === c.nombre);
    if (!grupo) { void avisar('Este cliente todavía no tiene créditos.'); return; }
    setClienteEstadoCuenta(grupo);
    setIsModalEstadoCuentaOpen(true);
  };

  const totalPorCobrar = fiados.reduce((acc, f) => acc + f.saldoPendiente, 0);
  
  // 🔥 NUEVO: Filtrar los pagos para sumar solo lo recuperado en el día de HOY (Con protección TypeScript)
  const fechaHoyStr = new Date().toLocaleDateString('es-PE');
  const totalRecuperadoHoy = fiados.reduce((totalGlobal, fiado) => {
    // Agregamos (fiado.pagos || []) para evitar el error de 'undefined'
    const pagadoHoy = (fiado.pagos || []).reduce((totalFiado, pago) => {
      const fechaPagoStr = new Date(pago.fecha).toLocaleDateString('es-PE');
      return fechaPagoStr === fechaHoyStr ? totalFiado + pago.monto : totalFiado;
    }, 0);
    return totalGlobal + pagadoHoy;
  }, 0);

  useEffect(() => {
    const handleAbrir = (e: any) => {
      const nombre = e.detail;
      const cliAgrupado = clientesAgrupados.find(c => c.clienteNombre === nombre);
      if (cliAgrupado) {
        setClienteEstadoCuenta(cliAgrupado);
        setIsModalEstadoCuentaOpen(true);
      }
    };
    window.addEventListener('abrirEstadoCuentaGlobal', handleAbrir);
    return () => window.removeEventListener('abrirEstadoCuentaGlobal', handleAbrir);
  }, [clientesAgrupados]);

  return (
      <div className="lg:h-full flex flex-col gap-4 sm:gap-6 p-0 w-full font-mono relative">
      {loading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-[var(--color-border)] border-t-[var(--color-ink)] animate-spin rounded-full"></div>
            <span className="text-[12px] font-black text-[var(--color-ink)] uppercase tracking-widest font-mono">Cargando...</span>
          </div>
        </div>
      )}
      
      {/* PESTAÑAS: ← → mueven el selector, Enter (o clic) cambia de pestaña, ↓ baja a su buscador */}
      <div role="tablist" aria-label="Clientes" className="flex gap-2 shrink-0">
        {PESTANAS.map((p, i) => (
          <button key={p.id} id={p.boton} role="tab" aria-selected={pestana === p.id} type="button"
            onClick={() => setPestana(p.id)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault(); e.stopPropagation();
                document.getElementById(PESTANAS[(i + (e.key === 'ArrowRight' ? 1 : -1) + PESTANAS.length) % PESTANAS.length].boton)?.focus();
              } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault(); e.stopPropagation();
                setPestana(p.id);
                setTimeout(() => document.getElementById(buscadorDe(p.id))?.focus(), 50);
              } else if (e.key === 'ArrowDown') {
                e.preventDefault(); e.stopPropagation();
                document.getElementById(buscadorDe(pestana))?.focus();
              }
            }}
            className={claseBotonBarra(pestana === p.id)}>
            {p.id === 'CLIENTES' ? <Users size={14} /> : <BookOpen size={14} />} {p.nombre}
          </button>
        ))}
      </div>

      {pestana === 'CLIENTES' ? (
        <div className="lg:flex-1 lg:min-h-0">
          <PestanaClientes
            clientes={clientes}
            fiados={fiados}
            idPestana="tab-clientes-clientes"
            onNuevo={() => abrirFicha(null)}
            onAbrir={(c) => setDetalleId(c.id)}
            onEditar={(c) => abrirFicha(c)}
            onEliminar={(c) => void handleDeleteCliente(c.id)}
          />
        </div>
      ) : (
        <>
          {/* TARJETAS */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full xl:w-1/2 shrink-0">
            <TarjetaMetrica
              label="Por Cobrar"
              value={`S/ ${totalPorCobrar.toFixed(2)}`}
              icon={<Coins size={16} />}
            />
            <TarjetaMetrica
              label="Recuperado Hoy"
              value={`S/ ${totalRecuperadoHoy.toFixed(2)}`}
              icon={<Coins size={16} />}
              isGreen={true}
            />
          </div>

          <div className="lg:flex-1 lg:min-h-0">
            <TablaFiadosAgrupados clientes={clientesAgrupados} onView={(cli) => { setClienteEstadoCuenta(cli); setIsModalEstadoCuentaOpen(true); }} />
          </div>
        </>
      )}

      <ModalDetalleCliente
        cliente={detalleId ? clientes.find((c) => c.id === detalleId) || null : null}
        fiados={fiados}
        onClose={() => setDetalleId(null)}
        onEditar={(c) => abrirFicha(c)}
        onEstadoCuenta={verEstadoCuenta}
        onUnir={(c) => setUnirId(c.id)}
        onVerCredito={(f) => { setFiadoAVer(f); setIsModalDetalleOpen(true); }}
      />

      <ModalFichaCliente
        abierta={fichaAbierta}
        cliente={clienteEnFicha}
        clientes={clientes}
        onGuardar={(d) => guardarCliente(d, clienteEnFicha?.id)}
        onClose={() => setFichaAbierta(false)}
      />

      <ModalUnirClientes
        queda={unirId ? clientes.find((c) => c.id === unirId) || null : null}
        clientes={clientes}
        onUnir={unirClientes}
        onClose={() => setUnirId(null)}
      />

      {/* MODALES */}
      <ModalFiado isOpen={isModalFiadoOpen} onClose={() => setIsModalFiadoOpen(false)} onSave={handleSaveFiado} fiadoAEditar={fiadoAEditar} clientes={clientes} productos={productosInventario} />
      <ModalAbono isOpen={isModalAbonoOpen} onClose={() => setIsModalAbonoOpen(false)} onConfirm={handleConfirmAbono} fiado={fiadoAAbonar} />
      
      {/* Nuevo modal flotante de detalles */}
      <ModalDetalleFiado 
        isOpen={isModalDetalleOpen} 
        onClose={() => setIsModalDetalleOpen(false)} 
        fiado={fiadoAVer} 
      />
      
      {/* Nuevo modal para anular pagos específicos */}
      <ModalAnularPago 
        isOpen={isModalAnularOpen}
        onClose={() => setIsModalAnularOpen(false)}
        fiado={fiadoAAnular ? (fiados.find(f => f.id === fiadoAAnular.id) || fiadoAAnular) : null}
        onAnularPago={handleAnularPagoEspecifico}
      />

      {/* Modal Unificado de Estado de Cuenta */}
      <ModalEstadoCuenta 
        isOpen={isModalEstadoCuentaOpen}
        onClose={() => setIsModalEstadoCuentaOpen(false)}
        cliente={clienteActualEstadoCuenta}
        onRefetch={async () => {
          await cargarDatos(true);
        }}
        onVerHistorial={(nombre) => {
          // Fase 4.1b: abre el detalle del cliente (antes, la ventana vieja del directorio)
          const c = clientes.find((x) => x.nombre === nombre);
          setIsModalEstadoCuentaOpen(false);
          if (c) setDetalleId(c.id);
        }}
      />
    </div>
  );
};




