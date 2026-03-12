import React, { useState, useEffect } from 'react';
import { AlertTriangle, Coins, Plus, BookOpen } from 'lucide-react';
import { supabase } from '../../db/supabase';
import { TablaFiados } from './components/TablaFiados';
import { ModalFiado } from './components/ModalFiado';
import { ModalAbono } from './components/ModalAbono';
import { ModalClientes } from './components/ModalClientes';
import { ModalDetalleFiado } from './components/ModalDetalleFiado';
import { ModalAnularPago } from './components/ModalAnularPago'; // <-- Nuevo modal
import type { Fiado, Cliente, PagoAbono } from './types'; // <-- Importamos PagoAbono
import type { Product } from '../Inventario/types';

export const Fiados: React.FC = () => {
  const [fiados, setFiados] = useState<Fiado[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productosInventario, setProductosInventario] = useState<Product[]>([]);
  
  const [isModalFiadoOpen, setIsModalFiadoOpen] = useState(false);
  const [fiadoAEditar, setFiadoAEditar] = useState<Fiado | null>(null);

  const [isModalAbonoOpen, setIsModalAbonoOpen] = useState(false);
  const [fiadoAAbonar, setFiadoAAbonar] = useState<Fiado | null>(null);

  const [isModalClientesOpen, setIsModalClientesOpen] = useState(false);

  // Estados para el Modal de Ver Detalles
  const [isModalDetalleOpen, setIsModalDetalleOpen] = useState(false);
  const [fiadoAVer, setFiadoAVer] = useState<Fiado | null>(null);

  // Estados para el Modal de Anular Pagos
  const [isModalAnularOpen, setIsModalAnularOpen] = useState(false);
  const [fiadoAAnular, setFiadoAAnular] = useState<Fiado | null>(null);

  // Cargar datos desde Supabase al iniciar
  const cargarDatos = async () => {
      // 🔥 OPTIMIZACIÓN: Lanzamos todas las consultas al mismo tiempo (Paralelo)
      const [
        { data: prods },
        { data: clis },
        { data: fiaData },
        { data: pagosData }
      ] = await Promise.all([
        supabase.from('products').select('*'),
        supabase.from('customers').select('*'),
        supabase.from('fiados').select('*'),
        supabase.from('debt_payments').select('*')
      ]);

      // 1. Asignar Inventario
      if (prods) setProductosInventario(prods as Product[]);

      // 2. Asignar Clientes
      if (clis) {
        const clientesMapeados: Cliente[] = clis.map(c => ({
          id: c.id.toString(),
          nombre: c.name,
          dni: c.dni || '',
          telefono: '' 
        }));
        setClientes(clientesMapeados);
      }

      // 3. Procesar Fiados y Pagos
      if (fiaData) {
        const fiadosMapeados: Fiado[] = fiaData.map(f => {
          // Filtrar los pagos que le pertenecen a esta deuda
          const susPagos = (pagosData || []).filter(p => p.fiado_id?.toString() === f.id.toString());
          
          const historialPagos: PagoAbono[] = susPagos.map(p => ({
            id: p.id.toString(),
            monto: Number(p.amount),
            metodo: p.payment_type || 'Mixto',
            fecha: p.created_at
          }));

          return {
            id: f.id.toString(),
            sale_id: f.sale_id?.toString(), // 🛡️ ENLACE NUEVO: Traemos el ID de la boleta de venta
            clienteId: f.customer_id?.toString(),
            clienteNombre: f.customer_name,
            montoOriginal: Number(f.amount),
            saldoPendiente: Number(f.amount) - Number(f.paid_amount || 0),
            fechaEmision: f.date_given,
            fechaVencimiento: f.expected_pay_date || f.date_given,
            estado: f.status === 'CANCELADO' ? 'PAGADO' : f.status,
            detalles: [], // Nace vacío, pero se llenará al hacer clic
            pagos: historialPagos
          } as any;
        });
        
        // Ordenar del más reciente al más antiguo
        setFiados(fiadosMapeados.sort((a, b) => new Date(b.fechaEmision).getTime() - new Date(a.fechaEmision).getTime()));
      }
    };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleSaveFiado = async () => {
    setIsModalFiadoOpen(false);
    // Como el Modal ya hizo todos los cálculos y grabó en la Base de Datos,
    // solo recargamos la tabla limpiamente para mostrar los cambios reales.
    await cargarDatos(); 
  };

  const handleConfirmAbono = async (pagos: { efectivo: number; yape: number; tarjeta: number }) => {
    if (!fiadoAAbonar) return;
    const montoTotal = pagos.efectivo + pagos.yape + pagos.tarjeta;
    const timestamp = new Date().toISOString();
    
    const nuevosPagos: PagoAbono[] = [];
    const promesasBD = [];

    const crearPagoBD = (monto: number, metodoBD: string, metodoUI: string) => {
      const id = Date.now().toString() + Math.floor(Math.random() * 100);
      nuevosPagos.push({ id, monto, metodo: metodoUI, fecha: timestamp });
      return supabase.from('debt_payments').insert([{
        id,
        fiado_id: fiadoAAbonar.id,
        customer_id: fiadoAAbonar.clienteId || null,
        amount: monto,
        payment_type: metodoBD,
        amount_cash: metodoBD === 'efectivo' ? monto : 0,
        amount_yape: metodoBD === 'yape' ? monto : 0,
        amount_card: metodoBD === 'tarjeta' ? monto : 0,
        created_at: timestamp,
        is_synced: '1'
      }]);
    };

    if (pagos.efectivo > 0) promesasBD.push(crearPagoBD(pagos.efectivo, 'efectivo', 'Efectivo'));
    if (pagos.yape > 0) promesasBD.push(crearPagoBD(pagos.yape, 'yape', 'Yape'));
    if (pagos.tarjeta > 0) promesasBD.push(crearPagoBD(pagos.tarjeta, 'tarjeta', 'Tarjeta'));

    await Promise.all(promesasBD); // Guardar todos los pagos paralelos

    const nuevoSaldo = fiadoAAbonar.saldoPendiente - montoTotal;

    if (nuevoSaldo <= 0) {
      // PRÁCTICA DE LIMPIEZA: El pago se completó. 
      // Eliminamos el historial de pagos de esta deuda y el registro principal para no llenar Supabase.
      await supabase.from('debt_payments').delete().eq('fiado_id', fiadoAAbonar.id);
      await supabase.from('fiados').delete().eq('id', fiadoAAbonar.id);

      // Eliminamos el registro local para actualizar la UI
      setFiados(fiados.filter(f => f.id !== fiadoAAbonar.id));
      
    } else {
      // PAGO PARCIAL: Actualizamos el registro de Supabase
      const montoPagadoActualizado = fiadoAAbonar.montoOriginal - nuevoSaldo;
      
      await supabase.from('fiados').update({
        paid_amount: montoPagadoActualizado,
        status: fiadoAAbonar.estado, // Mantiene su estado actual PENDIENTE o VENCIDO
        date_paid: null
      }).eq('id', fiadoAAbonar.id);

      // Actualizamos la UI local
      setFiados(fiados.map(f => {
        if (f.id === fiadoAAbonar.id) {
          return { ...f, saldoPendiente: nuevoSaldo, pagos: [...(f.pagos || []), ...nuevosPagos] };
        }
        return f;
      }));
    }
    
    setIsModalAbonoOpen(false);
  };

  const handleAnularPagoEspecifico = async (pagoId: string, montoRestaurar: number) => {
    if (!fiadoAAnular) return;
    
    if (window.confirm(`⚠️ ¿Seguro que deseas anular este pago de S/ ${montoRestaurar.toFixed(2)}? El saldo se devolverá a la deuda.`)) {
      
      // 1. Borrar pago de BD
      await supabase.from('debt_payments').delete().eq('id', pagoId);

      // 2. Calcular nuevo saldo y estado
      const nuevoSaldo = fiadoAAnular.saldoPendiente + montoRestaurar;
      const hoy = new Date().toISOString().split('T')[0];
      const estaVencido = fiadoAAnular.fechaVencimiento < hoy;
      const nuevoEstadoBD = estaVencido && nuevoSaldo > 0 ? 'VENCIDO' : nuevoSaldo > 0 ? 'PENDIENTE' : 'CANCELADO';
      const montoPagadoBD = fiadoAAnular.montoOriginal - nuevoSaldo;

      // 3. Actualizar Fiado en BD
      await supabase.from('fiados').update({
        paid_amount: montoPagadoBD,
        status: nuevoEstadoBD,
        date_paid: null
      }).eq('id', fiadoAAnular.id);

      // 4. Actualizar Estado en React
      setFiados(fiados.map(f => {
        if (f.id === fiadoAAnular.id) {
          return { 
            ...f, 
            saldoPendiente: nuevoSaldo, 
            estado: nuevoEstadoBD === 'CANCELADO' ? 'PAGADO' : nuevoEstadoBD as any, 
            pagos: f.pagos ? f.pagos.filter(p => p.id !== pagoId) : [] 
          };
        }
        return f;
      }));
      
      if (fiadoAAnular.pagos && fiadoAAnular.pagos.length <= 1) {
        setIsModalAnularOpen(false);
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
    if (window.confirm('⚠️ ¿Estás seguro de ELIMINAR a este cliente del directorio?')) {
      // Borrar en Supabase
      const { error } = await supabase.from('customers').delete().eq('id', id);
      
      if (error) return alert('No se puede eliminar porque tiene deudas activas registradas.');
      setClientes(clientes.filter(c => c.id !== id));
    }
  };
  // ------------------------------------

  const totalPorCobrar = fiados.reduce((acc, f) => acc + f.saldoPendiente, 0);
  const totalVencido = fiados.filter(f => f.estado === 'VENCIDO').reduce((acc, f) => acc + f.saldoPendiente, 0);

  return (
    <div className="h-full flex flex-col gap-6 p-6 max-w-7xl mx-auto font-mono">
      
      {/* TARJETAS Y CONTROLES */}
      <div className="flex justify-between items-end shrink-0">
        <div className="flex gap-4 w-1/2">
          <div className="flex-1 bg-white border-2 border-[#E2E8F0] shadow-[4px_4px_0_0_#E2E8F0] p-4 flex gap-4 items-center">
            <div className="w-12 h-12 bg-[#F8FAFC] rounded-full border-2 border-[#E2E8F0] flex items-center justify-center"><Coins className="text-[#10B981]" /></div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#64748B]">Por Cobrar</p>
              <p className="text-2xl font-black text-[#1E293B]">S/ {totalPorCobrar.toFixed(2)}</p>
            </div>
          </div>
          <div className="flex-1 bg-white border-2 border-[#E2E8F0] shadow-[4px_4px_0_0_#E2E8F0] p-4 flex gap-4 items-center">
            <div className="w-12 h-12 bg-[#FEF2F2] rounded-full border-2 border-[#EF4444] flex items-center justify-center"><AlertTriangle className="text-[#EF4444]" /></div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#64748B]">Vencido</p>
              <p className="text-2xl font-black text-[#EF4444]">S/ {totalVencido.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* BOTONES PRINCIPALES */}
        <div className="flex gap-3">
          <button 
            onClick={() => setIsModalClientesOpen(true)}
            className="h-12 bg-white text-[#1E293B] px-6 border-2 border-[#1E293B] font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-[#F8FAFC] transition-colors shadow-[4px_4px_0_0_#1E293B] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] cursor-pointer"
          >
            <BookOpen size={16} /> Directorio Clientes
          </button>
          <button 
            onClick={() => { setFiadoAEditar(null); setIsModalFiadoOpen(true); }}
            className="h-12 bg-[#1E293B] text-white px-6 border-2 border-[#1E293B] font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-[#F59E0B] hover:text-[#1E293B] transition-colors shadow-[4px_4px_0_0_#1E293B] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] cursor-pointer"
          >
            <Plus size={16} /> Nueva Deuda
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <TablaFiados 
          fiados={fiados} 
          onView={handleView}
          onEdit={handleEditFiado}
          onPay={(f) => { setFiadoAAbonar(f); setIsModalAbonoOpen(true); }}
          onRevertir={(f) => { setFiadoAAnular(f); setIsModalAnularOpen(true); }} // Ahora abre el modal
        />
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