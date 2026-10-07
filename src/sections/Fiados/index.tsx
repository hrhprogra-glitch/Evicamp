import React, { useState, useEffect } from 'react';
import {  Coins, Plus, BookOpen } from 'lucide-react';
import { supabase } from '../../db/supabase';
import { TablaFiadosAgrupados } from './components/TablaFiadosAgrupados';
import { ModalFiado } from './components/ModalFiado';
import { ModalAbono } from './components/ModalAbono';
import { ModalClientes } from './components/ModalClientes';
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

export const Fiados: React.FC = () => {
  // Crear deudas es como vender a crédito
  const [loading, setLoading] = useState(true);
  const [fiados, setFiados] = useState<Fiado[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productosInventario, setProductosInventario] = useState<Product[]>([]);
  
  const [isModalFiadoOpen, setIsModalFiadoOpen] = useState(false);
  const [fiadoAEditar, setFiadoAEditar] = useState<Fiado | null>(null);

  const [isModalAbonoOpen, setIsModalAbonoOpen] = useState(false);
  const [fiadoAAbonar, setFiadoAAbonar] = useState<Fiado | null>(null);

  const [isModalClientesOpen, setIsModalClientesOpen] = useState(false);
  const [isModalEstadoCuentaOpen, setIsModalEstadoCuentaOpen] = useState(false);
  const [clienteEstadoCuenta, setClienteEstadoCuenta] = useState<ClienteFiadoAgrupado | null>(null);

  // Estados para el Modal de Ver Detalles
  const [isModalDetalleOpen, setIsModalDetalleOpen] = useState(false);
  const [fiadoAVer, setFiadoAVer] = useState<Fiado | null>(null);

  // Estados para el Modal de Anular Pagos
  const [isModalAnularOpen, setIsModalAnularOpen] = useState(false);
  const [fiadoAAnular, setFiadoAAnular] = useState<Fiado | null>(null);

  // Cargar datos desde Supabase al iniciar
  const cargarDatos = async () => {
    setLoading(true);
      // 🔥 OPTIMIZACIÓN: Lanzamos todas las consultas al mismo tiempo (Paralelo)
      const [
        { data: prods },
        { data: clis },
        { data: fiaData },
        { data: pagosData },
        { data: detailsData }
      ] = await Promise.all([
        traerTodo(() => supabase.from('products').select('*').order('id')),
        traerTodo(() => supabase.from('customers').select('*').order('id')),
        // Filtro Ampliado: Descarga también los CANCELADOS para poder visualizarlos en la tabla como 'PAGADOS'
        traerTodo(() => supabase.from('fiados').select('*').in('status', ['PENDIENTE', 'VENCIDO', 'CANCELADO']).order('id')),
        traerTodo(() => supabase.from('debt_payments').select('*').order('id')),
        traerTodo(() => supabase.from('sale_details').select('sale_id, product_id, product_name, quantity, price_at_moment, subtotal').order('id'))
      ]);

      // 1. Asignar Inventario
      if (prods) setProductosInventario(prods as Product[]);

      // 2. Asignar Clientes
if (clis) {
  const clientesMapeados: Cliente[] = clis.map(c => ({
    id: c.id?.toString() ?? 'ID_NULO', // <-- PROTECCIÓN AQUÍ
    nombre: c.name ?? 'Sin Nombre',
    dni: c.dni ?? '',
    telefono: '' 
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
    const montoOriginal = Number(f.amount) || 0;
    const montoPagadoReal = historialPagos.reduce((sum, p) => sum + p.monto, 0);
    const saldoPendienteReal = Math.max(0, montoOriginal - montoPagadoReal);
    
    // 🛡️ ESTADO TÉCNICO: Solo existe PENDIENTE o PAGADO (Tolerancia estricta de 0.05)
    const estadoFinal = saldoPendienteReal <= 0.05 ? 'PAGADO' : 'PENDIENTE';

    return {
      id: f.id ? f.id.toString() : `err-fiado-${indexFiado}-${Date.now()}`,
      sale_id: f.sale_id?.toString(),
      clienteId: f.customer_id?.toString(),
      clienteNombre: f.customer_name || 'Desconocido',
      montoOriginal: montoOriginal,
      saldoPendiente: saldoPendienteReal,
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

  // 🔥 RESTAURAR FOCO AL CERRAR MODALES (Ej: con Escape)
  useEffect(() => {
    if (!isModalFiadoOpen && !isModalAbonoOpen && !isModalClientesOpen && !isModalDetalleOpen && !isModalAnularOpen) {
      setTimeout(() => {
        document.getElementById('buscador-global-fiados')?.focus();
      }, 100);
    }
  }, [isModalFiadoOpen, isModalAbonoOpen, isModalClientesOpen, isModalDetalleOpen, isModalAnularOpen]);

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
    
    if (window.confirm(`⚠️ ANULACIÓN TÉCNICA: ¿Seguro que deseas anular este pago de S/ ${montoRestaurar.toFixed(2)}?`)) {
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
  const handleSaveCliente = async (cli: Omit<Cliente, 'id'>) => {
    const nuevoId = Date.now().toString(); 
    
    // Guardar en Supabase
    const { error } = await supabase.from('customers').insert([{
      id: nuevoId,
      name: cli.nombre,
      dni: cli.dni,
      created_at: new Date().toISOString(),
      is_synced: '1'
    }]);

    if (error) return alert('Error al guardar cliente: ' + error.message);
    setClientes([...clientes, { ...cli, id: nuevoId }]);
  };

  const handleEditCliente = async (cliModificado: Cliente) => {
    // Actualizar en Supabase
    const { error } = await supabase.from('customers').update({
      name: cliModificado.nombre,
      dni: cliModificado.dni
    }).eq('id', cliModificado.id);

    if (error) return alert('Error al actualizar cliente: ' + error.message);
    setClientes(clientes.map(c => c.id === cliModificado.id ? cliModificado : c));
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

    if (window.confirm('⚠️ ¿Estás seguro de ELIMINAR a este cliente del directorio?')) {
      // Borrar en Supabase
      const { error } = await supabase.from('customers').delete().eq('id', id);

      if (error) return alert('No se pudo eliminar al cliente: ' + error.message);
      setClientes(clientes.filter(c => c.id !== id));
    }
  };
  // ------------------------------------

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

  return (
    <div className="h-full flex flex-col gap-4 sm:gap-6 p-0 w-full font-mono relative">
      {loading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-[var(--color-border)] border-t-[var(--color-ink)] animate-spin rounded-full"></div>
            <span className="text-[12px] font-black text-[var(--color-ink)] uppercase tracking-widest font-mono">Cargando...</span>
          </div>
        </div>
      )}
      
      {/* TARJETAS Y CONTROLES */}
      <div className="flex flex-col xl:flex-row justify-between items-stretch xl:items-end gap-4 shrink-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full xl:w-1/2">
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

        {/* BOTONES PRINCIPALES */}
        <div className="grid grid-cols-2 sm:flex gap-3">
          <button id="btn-directorio-clientes" onClick={() => setIsModalClientesOpen(true)}
            className="h-12 bg-white text-[var(--color-ink)] px-3 sm:px-6 justify-center border-2 border-[var(--color-ink)] font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-[var(--color-bg)] focus:outline-none focus:bg-[var(--color-ink)] focus:text-white transition-colors shadow-[4px_4px_0_0_var(--color-ink)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] cursor-pointer"
          >
            <BookOpen size={16} /> Directorio Clientes
          </button>
          
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <TablaFiadosAgrupados clientes={clientesAgrupados} onView={(cli) => { setClienteEstadoCuenta(cli); setIsModalEstadoCuentaOpen(true); }} />
      </div>

      {/* MODALES */}
      <ModalClientes 
        isOpen={isModalClientesOpen} 
        onClose={() => setIsModalClientesOpen(false)} 
        clientes={clientes} 
        onSaveCliente={handleSaveCliente} 
        onEditCliente={handleEditCliente} // <-- Nueva propiedad enviada
        onDeleteCliente={handleDeleteCliente} // <-- Nueva propiedad enviada
        fiados={fiados} 
      />
      
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
    </div>
  );
};




