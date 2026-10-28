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
import type { Fiado, Cliente, PagoAbono, GrupoClientes } from './types'; // <-- Importamos PagoAbono
import type { Product } from '../Inventario/types';
import { usePermiso } from '../../utils/permisos';
import { traerTodo } from '../../utils/traerTodo';
import { eliminarAbonoYRevertirCaja } from '../../utils/revertirAbono';
import { TarjetaMetrica } from '../Inventario/components/TarjetaMetrica';
import { confirmar, avisar } from '../../utils/dialogos';
import { PestanaClientes } from './components/PestanaClientes';
import { ModalFichaCliente, type DatosCliente } from './components/ModalFichaCliente';
import { ModalDetalleCliente } from './components/ModalDetalleCliente';
import { ModalGrupo } from './components/ModalGrupo';
import { ModalElegir } from './components/ModalElegir';
import { ModalFormGrupo, type DatosGrupo } from './components/ModalFormGrupo';
import { resumenDeCliente } from './components/PestanaClientes';
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
  // Detalle del cliente (4.1b): por id, así muestra siempre los datos al día
  const [detalleId, setDetalleId] = useState<string | null>(null);
  // Grupos de clientes (fase 4.1): familia o empresa
  const [grupos, setGrupos] = useState<GrupoClientes[]>([]);
  const [grupoVerId, setGrupoVerId] = useState<string | null>(null);            // ventana del grupo
  const [elegirGrupoPara, setElegirGrupoPara] = useState<string | null>(null);  // cliente al que se le elige grupo
  const [agregarAGrupo, setAgregarAGrupo] = useState<string | null>(null);      // grupo al que se agregan clientes
  const [formGrupo, setFormGrupo] = useState<{ grupo: GrupoClientes | null; paraCliente?: string } | null>(null);
  const [cuentaGrupoId, setCuentaGrupoId] = useState<string | null>(null);      // "Cobrar al grupo"
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

  // Filas de la pestaña abierta (Clientes o Créditos): para no perder el selector cuando la lista cambia
  const filasDeLaPestana = () => Array.from(document.querySelectorAll('[data-fila-cliente="true"], tr[role="button"]')) as HTMLElement[];

  // Cargar datos desde Supabase al iniciar
  const cargarDatos = async (silencioso = false) => {
    if (!silencioso) setLoading(true);
    // En qué fila estaba el selector (ej. el cliente al que se le cobró, que al quedar sin deuda sale de Créditos)
    const filaAntes = filasDeLaPestana().indexOf(document.activeElement as HTMLElement);
      // 🔥 OPTIMIZACIÓN: Lanzamos todas las consultas al mismo tiempo (Paralelo)
      const [
        { data: prods },
        { data: clis },
        { data: fiaData },
        { data: pagosData },
        { data: grupData }
      ] = await Promise.all([
        traerTodo(() => supabase.from('products').select('*').order('id')),
        traerTodo(() => supabase.from('customers').select('*').order('id')),
        // Filtro Ampliado: Descarga también los CANCELADOS para poder visualizarlos en la tabla como 'PAGADOS'
        traerTodo(() => supabase.from('fiados').select('*').in('status', ['PENDIENTE', 'VENCIDO', 'CANCELADO']).order('id')),
        traerTodo(() => supabase.from('debt_payments').select('*').order('id')),
        traerTodo(() => supabase.from('grupos_clientes').select('*').order('id'))
      ]);
      if (grupData) setGrupos(grupData.map((g: any) => ({ id: String(g.id), nombre: g.nombre || 'SIN NOMBRE', tipo: g.tipo === 'EMPRESA' ? 'EMPRESA' : 'FAMILIA', ruc: g.ruc || '' })));

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
    // Los antiguos con el RUC guardado como "documento" (tipo_doc RUC) ya se pasaron a la columna ruc (seguridad-sesion.sql)
    ruc: c.ruc ?? '',
    direccion: c.direccion ?? '',
    ubicacion: c.ubicacion ?? '',
    referencia: c.referencia ?? '',
    grupoId: c.grupo_id != null ? String(c.grupo_id) : '',
  }));

  // 🛡️ PROTECCIÓN: Si hay fiados de clientes que no están en customers (antiguos o borrados con saldo)
  if (fiaData && fiaData.length > 0) {
    const idsExistentes = new Set(clientesMapeados.map(c => String(c.id)));
    const nombresExistentes = new Set(clientesMapeados.map(c => c.nombre.trim().toUpperCase()));

    for (const f of fiaData) {
      if (f.status === 'ANULADO') continue;
      const fId = f.customer_id != null ? String(f.customer_id) : '';
      const fNombre = (f.customer_name || '').trim();
      if (!fNombre) continue;

      const existePorId = fId && idsExistentes.has(fId);
      const existePorNombre = nombresExistentes.has(fNombre.toUpperCase());

      if (!existePorId && !existePorNombre) {
        const nuevoId = fId || `fiado-cli-${fNombre}`;
        clientesMapeados.push({
          id: nuevoId,
          nombre: fNombre,
          dni: f.customer_dni || '',
          telefono: f.customer_phone || '',
          ruc: '',
          direccion: '',
          ubicacion: '',
          referencia: '',
          grupoId: '',
        });
        idsExistentes.add(nuevoId);
        nombresExistentes.add(fNombre.toUpperCase());
      }
    }
  }

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
  // Si la fila donde estaba el selector desapareció (o el selector se perdió), va a la fila que quedó en su lugar
  // o, si no hay filas, al buscador de la pestaña. Nunca se queda sin selector.
  setTimeout(() => {
    const a = document.activeElement;
    if (document.querySelector('[role="dialog"]') || (a && a !== document.body && a.isConnected)) return;
    const filas = filasDeLaPestana();
    const destino = filas.length ? filas[Math.min(Math.max(filaAntes, 0), filas.length - 1)] : null;
    (destino || document.getElementById('buscador-clientes') || document.getElementById('buscador-global-fiados'))?.focus();
  }, 150);
    };

  useEffect(() => {
    cargarDatos();
  }, []);

  // 🔥 RESTAURAR FOCO AL CERRAR MODALES O TERMINAR DE CARGAR
  useEffect(() => {
    if (!loading && !isModalFiadoOpen && !isModalAbonoOpen && !isModalDetalleOpen && !isModalAnularOpen && !isModalEstadoCuentaOpen && !fichaAbierta && !detalleId) {
      setTimeout(() => {
        // Solo si el selector no está ya en algo de la pantalla (al cerrar una ventana vuelve a su fila: ventanas.ts)
        const a = document.activeElement;
        if (!document.querySelector('[role="dialog"]') && (!a || a === document.body)) {
          document.getElementById(buscadorDe(pestana))?.focus();
        }
      }, 100);
    }
  }, [loading, isModalFiadoOpen, isModalAbonoOpen, isModalDetalleOpen, isModalAnularOpen, isModalEstadoCuentaOpen, fichaAbierta, detalleId, pestana]);

  const clientesAgrupados = React.useMemo(() => {
    const mapa = new Map<string, ClienteFiadoAgrupado>();
    fiados.forEach(f => {
      const nombre = f.clienteNombre || 'CLIENTE DESCONOCIDO';
      if (!mapa.has(nombre)) {
        // DNI/RUC y teléfono salen de la ficha del cliente (el crédito casi nunca los trae)
        const ficha = clientes.find((c) => (f.clienteId && String(c.id) === String(f.clienteId)) || c.nombre.trim().toUpperCase() === nombre.trim().toUpperCase());
        mapa.set(nombre, {
          clienteNombre: nombre,
          clienteId: f.clienteId,
          clienteDni: ficha?.dni || ficha?.ruc || f.clienteDni,
          clienteTelefono: ficha?.telefono || f.clienteTelefono,
          grupoNombre: ficha?.grupoId ? grupos.find((g) => g.id === ficha.grupoId)?.nombre : undefined,
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
  }, [fiados, clientes, grupos]);

  // "Cobrar al grupo": un estado de cuenta con los créditos de TODOS los miembros del grupo
  const cuentaDeGrupo = (gid: string): ClienteFiadoAgrupado | null => {
    const g = grupos.find((x) => x.id === gid);
    if (!g) return null;
    const miembros = clientes.filter((c) => c.grupoId === gid);
    const ids = new Set(miembros.map((c) => c.id)); const nombres = new Set(miembros.map((c) => c.nombre));
    const suyos = fiados.filter((f) => (f.clienteId ? ids.has(f.clienteId) : nombres.has(f.clienteNombre)));
    return {
      clienteNombre: `GRUPO ${g.nombre}`, clienteId: undefined, clienteDni: g.ruc, fiados: suyos,
      totalOriginal: suyos.reduce((t, x) => t + (Number(x.montoOriginal) || 0), 0),
      totalPendiente: suyos.reduce((t, x) => t + (Number(x.saldoPendiente) || 0), 0),
      totalPagado: suyos.reduce((t, x) => t + (Number(x.montoPagado) || 0), 0),
    };
  };

  const clienteActualEstadoCuenta = React.useMemo(() => {
    if (cuentaGrupoId) return cuentaDeGrupo(cuentaGrupoId);
    if (!clienteEstadoCuenta) return null;
    return clientesAgrupados.find(c => c.clienteNombre === clienteEstadoCuenta.clienteNombre) || clienteEstadoCuenta;
  }, [clienteEstadoCuenta, clientesAgrupados, cuentaGrupoId, grupos, clientes, fiados]); // eslint-disable-line react-hooks/exhaustive-deps

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
    // tipo_doc se sigue llenando (DNI si tiene DNI) para lo que aún lo lee
    const fila = { name: d.nombre, dni: d.dni || null, ruc: d.ruc || null, tipo_doc: d.dni ? 'DNI' : null, telefono: d.telefono || null, direccion: d.direccion || null, ubicacion: d.ubicacion || null, referencia: d.referencia || null };
    const nuevo: Omit<Cliente, 'id'> = { nombre: d.nombre, dni: d.dni, ruc: d.ruc, telefono: d.telefono, direccion: d.direccion, ubicacion: d.ubicacion, referencia: d.referencia };
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
      const rowsAntes = Array.from(document.querySelectorAll<HTMLElement>('[data-fila-cliente="true"]'));
      const idxAntes = rowsAntes.findIndex(el => el.getAttribute('data-cliente-id') === String(id));
      // Borrar en Supabase
      const { error } = await supabase.from('customers').delete().eq('id', id);

      if (error) return alert('No se pudo eliminar al cliente: ' + error.message);
      setClientes(clientes.filter(c => c.id !== id));
      setTimeout(() => {
        const rows = Array.from(document.querySelectorAll<HTMLElement>('[data-fila-cliente="true"]'));
        const destino = rows.length ? rows[Math.min(Math.max(idxAntes, 0), rows.length - 1)] : null;
        const el = destino || document.getElementById('buscador-clientes');
        el?.focus();
        el?.scrollIntoView({ block: 'nearest' });
      }, 120);
    }
  };
  // ------------------------------------

  // ---------- GRUPOS DE CLIENTES (fase 4.1) ----------
  const idNum = (id: string) => (/^\d+$/.test(id) ? Number(id) : id);
  const miembrosDe = (gid: string) => clientes.filter((c) => c.grupoId === gid);
  // Crear o editar un grupo. Devuelve su id (o null si falló)
  const guardarGrupo = async (d: DatosGrupo, id?: string): Promise<string | null> => {
    const fila = { nombre: d.nombre, tipo: d.tipo, ruc: d.ruc || null };
    if (id) {
      const { error } = await supabase.from('grupos_clientes').update(fila).eq('id', id);
      if (error) { await avisar(`No se pudo guardar el grupo: ${error.message}`); return null; }
      setGrupos((l) => l.map((g) => (g.id === id ? { ...g, ...d } : g)));
      return id;
    }
    const { data, error } = await supabase.from('grupos_clientes').insert([{ ...fila, created_at: new Date().toISOString(), is_synced: 1 }]).select().single();
    if (error) { await avisar(`No se pudo crear el grupo: ${error.message}`); return null; }
    const nuevo: GrupoClientes = { id: String(data.id), ...d };
    setGrupos((l) => [...l, nuevo]);
    return nuevo.id;
  };
  // Poner a un cliente en un grupo (uno solo) o sacarlo (null). Su cuenta y sus créditos no cambian
  const ponerEnGrupo = async (clienteId: string, grupoId: string | null): Promise<boolean> => {
    const { error } = await supabase.from('customers').update({ grupo_id: grupoId ? idNum(grupoId) : null }).eq('id', clienteId);
    if (error) { await avisar(`No se pudo cambiar el grupo: ${error.message}`); return false; }
    setClientes((l) => l.map((c) => (c.id === clienteId ? { ...c, grupoId: grupoId || '' } : c)));
    return true;
  };
  const sacarDeGrupo = async (c: Cliente) => {
    const g = grupos.find((x) => x.id === c.grupoId);
    if (!(await confirmar(`¿Sacar a "${c.nombre}" del grupo "${g?.nombre || ''}"?\n\nSu cuenta y sus créditos siguen igual; solo deja de estar en el grupo.`))) return;
    const rowsAntes = Array.from(document.querySelectorAll<HTMLElement>('[data-miembro-grupo="true"]'));
    const idxAntes = rowsAntes.findIndex(el => el.innerText.includes(c.nombre));
    await ponerEnGrupo(c.id, null);
    setTimeout(() => {
      const rows = Array.from(document.querySelectorAll<HTMLElement>('[data-miembro-grupo="true"]'));
      const destino = rows.length ? rows[Math.min(Math.max(idxAntes, 0), rows.length - 1)] : null;
      const el = destino || document.getElementById('btn-grupo-cobrar') || document.getElementById('btn-cerrar-grupo');
      el?.focus();
      el?.scrollIntoView({ block: 'nearest' });
    }, 120);
  };
  const eliminarGrupo = async (g: GrupoClientes) => {
    const miembros = miembrosDe(g.id);
    if (!(await confirmar(`¿Eliminar el grupo "${g.nombre}"?\n\nSus ${miembros.length} cliente(s) quedan sin grupo; sus cuentas y créditos NO se tocan.`))) return;
    for (const c of miembros) if (!(await ponerEnGrupo(c.id, null))) return;
    const { error } = await supabase.from('grupos_clientes').delete().eq('id', g.id);
    if (error) { await avisar(`No se pudo eliminar el grupo: ${error.message}`); return; }
    setGrupos((l) => l.filter((x) => x.id !== g.id));
    setGrupoVerId(null);
    setTimeout(() => {
      document.getElementById('buscador-clientes')?.focus();
    }, 120);
  };
  const cobrarAlGrupo = (g: GrupoClientes) => {
    const cuenta = cuentaDeGrupo(g.id);
    if (!cuenta || !cuenta.fiados.some((x) => x.saldoPendiente > 0.05)) { void avisar('Nadie de este grupo tiene deudas pendientes.'); return; }
    setCuentaGrupoId(g.id);
    setClienteEstadoCuenta(cuenta);
    setIsModalEstadoCuentaOpen(true);
  };

  // Estado de cuenta de un cliente (desde su detalle): sus créditos agrupados
  const verEstadoCuenta = (c: Cliente) => {
    const cId = String(c.id || '').trim();
    const cNombre = (c.nombre || '').trim().toUpperCase();
    const grupo = clientesAgrupados.find((g) => (g.clienteId && cId && String(g.clienteId) === cId) || (g.clienteNombre && g.clienteNombre.trim().toUpperCase() === cNombre));
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
            grupos={grupos}
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
        grupo={(() => { const c = clientes.find((x) => x.id === detalleId); return c?.grupoId ? grupos.find((g) => g.id === c.grupoId) || null : null; })()}
        miembrosGrupo={(() => { const c = clientes.find((x) => x.id === detalleId); return c?.grupoId ? miembrosDe(c.grupoId).length : 0; })()}
        deudaGrupo={(() => { const c = clientes.find((x) => x.id === detalleId); return c?.grupoId ? miembrosDe(c.grupoId).reduce((t, m) => t + resumenDeCliente(m, fiados).deuda, 0) : 0; })()}
        onGrupo={(c) => (c.grupoId && grupos.some((g) => g.id === c.grupoId) ? setGrupoVerId(c.grupoId) : setElegirGrupoPara(c.id))}
        onSacarDeGrupo={(c) => void sacarDeGrupo(c)}
      />

      <ModalFichaCliente
        abierta={fichaAbierta}
        cliente={clienteEnFicha}
        clientes={clientes}
        onGuardar={(d) => guardarCliente(d, clienteEnFicha?.id)}
        onClose={() => setFichaAbierta(false)}
      />

      {/* GRUPOS DE CLIENTES (fase 4.1) */}
      <ModalGrupo
        grupo={grupoVerId ? grupos.find((g) => g.id === grupoVerId) || null : null}
        miembros={grupoVerId ? miembrosDe(grupoVerId) : []}
        fiados={fiados}
        onClose={() => setGrupoVerId(null)}
        onCobrar={cobrarAlGrupo}
        onAgregar={(g) => setAgregarAGrupo(g.id)}
        onEditar={(g) => setFormGrupo({ grupo: g })}
        onEliminar={(g) => void eliminarGrupo(g)}
        onSacar={(c) => void sacarDeGrupo(c)}
        onVerCliente={(c) => { setGrupoVerId(null); setDetalleId(c.id); }}
      />
      <ModalElegir
        abierta={!!elegirGrupoPara}
        titulo={`Agregar a un grupo: ${clientes.find((c) => c.id === elegirGrupoPara)?.nombre || ''}`}
        ayuda="Elige su familia o empresa (un cliente está en un solo grupo)"
        opciones={grupos.map((g) => ({ id: g.id, titulo: g.nombre, subtitulo: `${g.tipo === 'EMPRESA' ? 'Empresa' : 'Familia'}${g.ruc ? ` · RUC ${g.ruc}` : ''} · ${miembrosDe(g.id).length} persona(s)`, buscar: [g.ruc] }))}
        vacia="Todavía no hay grupos: crea uno."
        extra={{ titulo: '+ Crear grupo nuevo', alElegir: () => setFormGrupo({ grupo: null, paraCliente: elegirGrupoPara || undefined }) }}
        onElegir={async (gid) => { if (elegirGrupoPara && (await ponerEnGrupo(elegirGrupoPara, gid))) setElegirGrupoPara(null); }}
        onClose={() => setElegirGrupoPara(null)}
      />
      <ModalElegir
        abierta={!!agregarAGrupo}
        titulo={`Agregar cliente al grupo: ${grupos.find((g) => g.id === agregarAGrupo)?.nombre || ''}`}
        ayuda="Solo aparecen los clientes que todavía no tienen grupo"
        opciones={clientes.filter((c) => !c.grupoId).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')).map((c) => ({ id: c.id, titulo: c.nombre, subtitulo: [c.referencia, c.dni && `DNI ${c.dni}`, c.ruc && `RUC ${c.ruc}`, c.telefono].filter(Boolean).join(' · '), buscar: [c.dni, c.ruc, c.telefono] }))}
        vacia="No hay clientes sin grupo con ese nombre."
        onElegir={async (cid) => { if (agregarAGrupo) await ponerEnGrupo(cid, agregarAGrupo); }}
        onClose={() => setAgregarAGrupo(null)}
      />
      <ModalFormGrupo
        abierta={!!formGrupo}
        grupo={formGrupo?.grupo || null}
        grupos={grupos}
        onGuardar={async (d) => {
          const id = await guardarGrupo(d, formGrupo?.grupo?.id);
          if (!id) return false;
          // Creado desde "Agregar a un grupo": el cliente entra al grupo nuevo y se cierra la lista
          if (formGrupo?.paraCliente && (await ponerEnGrupo(formGrupo.paraCliente, id))) setElegirGrupoPara(null);
          return true;
        }}
        onClose={() => setFormGrupo(null)}
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
        onClose={() => { setIsModalEstadoCuentaOpen(false); setCuentaGrupoId(null); }}
        cliente={clienteActualEstadoCuenta}
        mostrarNombre={!!cuentaGrupoId}
        onRefetch={async () => {
          await cargarDatos(true);
        }}
        onVerHistorial={cuentaGrupoId ? undefined : (nombre) => {
          // Fase 4.1b: abre el detalle del cliente (antes, la ventana vieja del directorio)
          const c = clientes.find((x) => x.nombre === nombre);
          setIsModalEstadoCuentaOpen(false);
          if (c) setDetalleId(c.id);
        }}
      />
    </div>
  );
};




