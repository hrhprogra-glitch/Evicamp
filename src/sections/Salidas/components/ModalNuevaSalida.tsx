import React, { useState, useEffect, useRef } from 'react';
import { Truck, X, Plus, Trash2, Search, Check, RotateCcw, Zap, Package } from 'lucide-react';
import { supabase } from '../../../db/supabase';
import { fotoDeCache, sincronizarFotosFaltantes } from '../../../utils/cacheFotos';
import { traerTodo } from '../../../utils/traerTodo';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { avisar } from '../../../utils/dialogos';
import { BotonEscanerCelular } from '../../../components/BotonEscanerCelular';
import { buscarProductoPorCodigo } from '../../../utils/decodificarBarras';
import type { TipoSalida, Salida } from '../types';

interface ModalNuevaSalidaProps {
  isOpen: boolean;
  // 18/11/2026 (178): el dueño pidió que "Nueva salida" deje de ser una ventana flotante y sea una sub sesión
  // grande dentro de Salidas. `modal` conserva el comportamiento de siempre; `sesion` dibuja el mismo formulario
  // a todo el ancho, sin alto máximo y con el scroll normal de la página.
  modo?: 'modal' | 'sesion';
  salidaRaiz?: Salida | null;
  datosIniciales?: {
    tipo?: TipoSalida;
    customerId?: number | '';
    bienId?: number | '' | 'otro';
    clienteLibre?: string;
    bienLibre?: string;
    direccion?: string;
    ubicacion?: string;
    trabajadoresIds?: number[];
    observaciones?: string;
  } | null;
  onClose: () => void;
  onSuccess: (salidaCreada: any) => void;
}

// Foto referencial del producto, como en la Caja (14/11/2026, dueño: "que se parezca al de la caja en ver una imagen
// referencial o ver bien las letras"). Las fotos vienen de la memoria de fotos (cacheFotos), nunca de la lista.
const fotoProducto = (id: number | null | undefined, imagePath?: string | null): string => {
  const img = (id != null ? fotoDeCache(id) : null) || imagePath || '';
  return img.startsWith('http') || img.startsWith('data:') ? img : '';
};

const FotoMiniatura: React.FC<{ src: string; tamano: string; nombre: string }> = ({ src, tamano, nombre }) => (
  <div className={`${tamano} shrink-0 flex items-center justify-center border border-[var(--color-border)] bg-[var(--color-bg)] overflow-hidden`}>
    {src ? (
      <img src={src} alt={nombre} loading="lazy" className="max-w-full max-h-full object-contain"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
    ) : (
      <Package size={18} className="text-[var(--color-muted)]" />
    )}
  </div>
);

// Caché en memoria para carga en 0 ms
let _cacheCatalogosServic: {
  clientes?: any[];
  trabajadores?: any[];
  productos?: any[];
  timestamp?: number;
} = {};

const CLAVE_BORRADOR_SALIDA = 'siumax_servic_borrador_salida';

export const ModalNuevaSalida: React.FC<ModalNuevaSalidaProps> = ({
  isOpen,
  modo = 'modal',
  salidaRaiz,
  datosIniciales,
  onClose,
  onSuccess,
}) => {
  const esSesion = modo === 'sesion';
  // Fase 179 (18/11/2026): en celular, dentro de la sub sesión, el formulario se parte en tres apartados grandes
  // (Buscar / Materiales / Datos) para que el buscador se vea completo y no quede apretado en una sola fila.
  // Tablet, laptop y PC siguen exactamente igual que en la fase 178.
  const [esMovil, setEsMovil] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  );
  const [apartadoActivo, setApartadoActivo] = useState<'buscar' | 'materiales' | 'datos'>('buscar');
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const cambiar = (e: MediaQueryListEvent) => setEsMovil(e.matches);
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', cambiar);
      return () => mq.removeEventListener('change', cambiar);
    }
    (mq as any).addListener(cambiar);
    return () => (mq as any).removeListener(cambiar);
  }, []);
  useCerrarConEscape(isOpen, onClose);

  // Form State
  const [tipo, setTipo] = useState<TipoSalida>('SERVICIO');
  const [customerId, setCustomerId] = useState<number | ''>('');
  // Nombres libres (pedido del dueño 18/11): si el cliente o lo que se atiende no está en la lista, se escribe aquí y
  // se guarda dentro de observaciones como nota (la salida necesita un cliente y un bien de la base por FK).
  const [clienteLibre, setClienteLibre] = useState('');
  const [bienId, setBienId] = useState<number | '' | 'otro'>('');
  const [bienLibre, setBienLibre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [observaciones, setObservaciones] = useState('');
  const [trabajadoresSeleccionados, setTrabajadoresSeleccionados] = useState<number[]>([]);

  // Listas de apoyo
  const [clientes, setClientes] = useState<any[]>(_cacheCatalogosServic.clientes || []);
  const [bienes, setBienes] = useState<any[]>([]);
  const [trabajadores, setTrabajadores] = useState<any[]>(_cacheCatalogosServic.trabajadores || []);
  const [productos, setProductos] = useState<any[]>(_cacheCatalogosServic.productos || []);

  // Items agregados
  const [items, setItems] = useState<{
    product_id: number | null;
    descripcion: string;
    unidad: string;
    cantidad: number;
    costo_unitario: number;
    es_externo: boolean;
  }[]>([]);

  // Inputs para agregar item (modo SUNAT)
  const [busquedaProd, setBusquedaProd] = useState('');
  const [prodSeleccionado, setProdSeleccionado] = useState<any | null>(null);
  const [indiceSugerencia, setIndiceSugerencia] = useState(0);
  // Cuando llegan fotos nuevas a la memoria, volver a dibujar las miniaturas
  const [, setFotosVersion] = useState(0);
  useEffect(() => {
    const alLlegar = () => setFotosVersion((v) => v + 1);
    window.addEventListener('siumax-fotos-actualizadas', alLlegar);
    return () => window.removeEventListener('siumax-fotos-actualizadas', alLlegar);
  }, []);
  // La sugerencia elegida con ↑ ↓ siempre a la vista (las filas con foto son más altas)
  useEffect(() => {
    document.getElementById(`sugerencia-salida-${indiceSugerencia}`)?.scrollIntoView({ block: 'nearest' });
  }, [indiceSugerencia]);
  const [cantItem, setCantItem] = useState('1');
  const [esExterno, setEsExterno] = useState(false);
  const [descExterno, setDescExterno] = useState('');
  const [unidadExterno, setUnidadExterno] = useState('UNID');
  const [costoExterno, setCostoExterno] = useState('0');

  const [guardando, setGuardando] = useState(false);
  const [tieneBorrador, setTieneBorrador] = useState(false);

  const inputBuscarRef = useRef<HTMLInputElement>(null);
  const inputCantRef = useRef<HTMLInputElement>(null);

  // Cargar datos al abrir
  useEffect(() => {
    if (isOpen) {
      cargarCatalogos();
      if (salidaRaiz) {
        setTipo(salidaRaiz.tipo);
        setCustomerId(salidaRaiz.customer_id);
        setClienteLibre('');
        setBienId(salidaRaiz.bien_id || '');
        setBienLibre('');
        setDireccion(salidaRaiz.direccion || '');
        setUbicacion(salidaRaiz.ubicacion || '');
        setObservaciones(`Continuación de ${salidaRaiz.codigo}`);
        if (salidaRaiz.trabajadores) {
          setTrabajadoresSeleccionados(salidaRaiz.trabajadores.map((t) => t.trabajador_id));
        }
        setItems([]);
        setTieneBorrador(false);
      } else if (datosIniciales) {
        setTipo(datosIniciales.tipo || 'SERVICIO');
        setCustomerId(datosIniciales.customerId || '');
        setClienteLibre(datosIniciales.clienteLibre || '');
        setBienId(datosIniciales.bienId || '');
        setBienLibre(datosIniciales.bienLibre || '');
        setDireccion(datosIniciales.direccion || '');
        setUbicacion(datosIniciales.ubicacion || '');
        setObservaciones(datosIniciales.observaciones || '');
        if (datosIniciales.trabajadoresIds) {
          setTrabajadoresSeleccionados(datosIniciales.trabajadoresIds);
        }
        setItems([]);
        setTieneBorrador(false);
      } else {
        // Intentar recuperar borrador guardado automáticamente
        const borradorGuardado = localStorage.getItem(CLAVE_BORRADOR_SALIDA);
        if (borradorGuardado) {
          try {
            const b = JSON.parse(borradorGuardado);
            if (b) {
              if (b.tipo) setTipo(b.tipo);
              if (b.customerId) setCustomerId(b.customerId);
              if (b.clienteLibre) setClienteLibre(b.clienteLibre);
              if (b.bienId) setBienId(b.bienId);
              if (b.bienLibre) setBienLibre(b.bienLibre);
              if (b.direccion) setDireccion(b.direccion);
              if (b.ubicacion) setUbicacion(b.ubicacion);
              if (b.fecha) setFecha(b.fecha);
              if (b.observaciones) setObservaciones(b.observaciones);
              if (Array.isArray(b.trabajadoresSeleccionados)) setTrabajadoresSeleccionados(b.trabajadoresSeleccionados);
              if (Array.isArray(b.items) && b.items.length > 0) {
                setItems(b.items);
                setTieneBorrador(true);
              }
            }
          } catch (e) {
            console.error('Error cargando borrador local:', e);
          }
        } else {
          // Reset limpio
          setTipo('SERVICIO');
          setCustomerId('');
          setClienteLibre('');
          setBienId('');
          setBienLibre('');
          setDireccion('');
          setUbicacion('');
          setObservaciones('');
          setTrabajadoresSeleccionados([]);
          setItems([]);
          setTieneBorrador(false);
        }
      }
      setTimeout(() => {
        // En celular el primer campo útil es el buscador (fase 179); si enfocáramos "Tipo de trabajo" abajo,
        // el teclado virtual empujaría la vista y el trabajador no vería lo que escribe.
        const id = esMovil && esSesion ? 'input-buscar-producto-salida' : 'select-tipo-salida';
        document.getElementById(id)?.focus();
      }, 50);
    }
  }, [isOpen, salidaRaiz, datosIniciales, esMovil, esSesion]);

  // Auto-guardado en tiempo real en localStorage (Regla: "Que se guarde todo")
  useEffect(() => {
    if (!isOpen || salidaRaiz || datosIniciales) return;
    if (customerId || items.length > 0 || direccion || observaciones || trabajadoresSeleccionados.length > 0) {
      const dataBorrador = {
        tipo,
        customerId,
        clienteLibre,
        bienId,
        bienLibre,
        direccion,
        ubicacion,
        fecha,
        observaciones,
        trabajadoresSeleccionados,
        items,
      };
      try {
        localStorage.setItem(CLAVE_BORRADOR_SALIDA, JSON.stringify(dataBorrador));
        setTieneBorrador(true);
      } catch (e) {
        console.error('Error guardando borrador:', e);
      }
    } else {
      // Si el dueño quita todos los materiales (u otros datos), el borrador viejo ya no sirve:
      // borrarlo también, o el material reaparece al volver a abrir (17/11/2026).
      try {
        if (localStorage.getItem(CLAVE_BORRADOR_SALIDA)) {
          localStorage.removeItem(CLAVE_BORRADOR_SALIDA);
          setTieneBorrador(false);
        }
      } catch (e) {
        console.error('Error limpiando borrador vacío:', e);
      }
    }
  }, [isOpen, tipo, customerId, clienteLibre, bienId, bienLibre, direccion, ubicacion, fecha, observaciones, trabajadoresSeleccionados, items, salidaRaiz, datosIniciales]);

  const limpiarBorrador = () => {
    try {
      localStorage.removeItem(CLAVE_BORRADOR_SALIDA);
    } catch {}
    setTipo('SERVICIO');
    setCustomerId('');
    setClienteLibre('');
    setBienId('');
    setBienLibre('');
    setDireccion('');
    setUbicacion('');
    setObservaciones('');
    setTrabajadoresSeleccionados([]);
    setItems([]);
    setBusquedaProd('');
    setProdSeleccionado(null);
    setTieneBorrador(false);
    avisar('Borrador limpiado. Formulario listo desde cero.');
    setTimeout(() => {
      document.getElementById('select-cliente-salida')?.focus();
    }, 50);
  };

  // Fase 179: en celular, llevar al trabajador al apartado donde está el campo que falta, sin perder lo ya escrito.
  const irAApartado = (apartado: 'buscar' | 'materiales' | 'datos', enfocar?: string) => {
    setApartadoActivo(apartado);
    if (enfocar) setTimeout(() => document.getElementById(enfocar)?.focus(), 60);
  };

  const cargarCatalogos = async () => {
    try {
      const [resCli, resTrab, resProd] = await Promise.all([
        supabase.from('customers').select('id, name, dni, ruc, direccion').eq('activo', true).order('name'),
        supabase.from('trabajadores').select('id, nombre, cargo').eq('estado', 'ACTIVO').order('nombre'),
        // Sin la foto (image_url pesa mucho: MEMORIA-IA 63) y en bloques, para no cortarse en 1.000 productos.
        // Solo activos: los borrados en Inventario quedan con is_active = 0 y no deben salir aquí (17/11/2026).
        traerTodo(() => supabase.from('products').select('id, name, code, unit, quantity, cost_price, image_path').eq('is_active', 1).order('name').order('id')),
      ]);

      if (resCli.data) {
        setClientes(resCli.data);
        _cacheCatalogosServic.clientes = resCli.data;
      }
      if (resTrab.data) {
        setTrabajadores(resTrab.data);
        _cacheCatalogosServic.trabajadores = resTrab.data;
      }
      if (resProd.data) {
        setProductos(resProd.data);
        _cacheCatalogosServic.productos = resProd.data;
        void sincronizarFotosFaltantes(resProd.data); // baja solo las fotos que aún no están en la PC
      }
      _cacheCatalogosServic.timestamp = Date.now();
    } catch (err) {
      console.error('Error cargando catálogos:', err);
    }
  };

  // Cargar bienes cuando cambia el cliente (18/11/2026: antes solo traía los ACTIVO y por eso salía una sola opción;
  // ahora salen TODOS los bienes del cliente, con su estado, para que el trabajador pueda elegir).
  useEffect(() => {
    if (customerId) {
      supabase
        .from('bienes_cliente')
        .select('*')
        .eq('customer_id', customerId)
        .then(({ data }: { data: any }) => {
          setBienes(data || []);
          if (data && data.length > 0 && !bienId) {
            setBienId(data[0].id);
            if (data[0].direccion) setDireccion(data[0].direccion);
            if (data[0].ubicacion) setUbicacion(data[0].ubicacion);
          }
        });

      const cli = clientes.find((c) => c.id === Number(customerId));
      if (cli && cli.direccion && !direccion) {
        setDireccion(cli.direccion);
      }
    } else {
      setBienes([]);
      setBienId('');
    }
  }, [customerId]);

  const toggleTrabajador = (id: number) => {
    setTrabajadoresSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  // Filtro de productos
  const termino = busquedaProd.trim().toLowerCase();
  const prodsFiltrados = termino
    ? productos
        .filter(
          (p) =>
            (p.name && p.name.toLowerCase().includes(termino)) ||
            (p.code && p.code.toLowerCase().includes(termino))
        )
        .slice(0, 8)
    : [];

  useEffect(() => {
    setIndiceSugerencia(0);
  }, [busquedaProd]);

  // Selección rápida de producto
  const seleccionarProducto = (p: any) => {
    setProdSeleccionado(p);
    setBusquedaProd(p.name);
    // Salto directo a cantidad con todo el texto seleccionado
    setTimeout(() => {
      if (inputCantRef.current) {
        inputCantRef.current.focus();
        inputCantRef.current.select();
      }
    }, 30);
  };

  // Agregar item a la tabla (con teclado o clic)
  const handleAgregarItem = () => {
    if (esExterno) {
      if (!descExterno.trim()) {
        avisar('Escribe la descripción del material externo');
        document.getElementById('input-desc-material-externo')?.focus();
        return;
      }
      const c = parseFloat(cantItem);
      if (isNaN(c) || c <= 0) {
        avisar('Cantidad inválida');
        document.getElementById('input-cant-item-externo')?.focus();
        return;
      }
      // El material nuevo entra ARRIBA (pedido del dueño 18/11/2026), no abajo de la lista.
      setItems((prev) => [
        {
          product_id: null,
          descripcion: descExterno.trim().toUpperCase(),
          unidad: unidadExterno.trim().toUpperCase() || 'UNID',
          cantidad: c,
          costo_unitario: parseFloat(costoExterno) || 0,
          es_externo: true,
        },
        ...prev,
      ]);
      setDescExterno('');
      setCantItem('1');
      setCostoExterno('0');
      setTimeout(() => {
        document.getElementById('input-desc-material-externo')?.focus();
      }, 50);
    } else {
      let prodAAgregar = prodSeleccionado;
      if (!prodAAgregar && prodsFiltrados.length > 0) {
        prodAAgregar = prodsFiltrados[indiceSugerencia] || prodsFiltrados[0];
      }
      if (!prodAAgregar) {
        avisar('Busca o selecciona un producto con código o nombre');
        inputBuscarRef.current?.focus();
        return;
      }
      const c = parseFloat(cantItem);
      if (isNaN(c) || c <= 0) {
        avisar('Cantidad inválida');
        inputCantRef.current?.focus();
        return;
      }

      setItems((prev) => {
        // Si ya existe el producto, sumar cantidad y SUBIRLO a la primera fila; si es nuevo, entra arriba.
        // (pedido del dueño 18/11/2026: "cuando agrego un producto se agrega desde abajo debe ingresarse desde arriba")
        const idxExistente = prev.findIndex((it) => it.product_id === prodAAgregar.id);
        if (idxExistente !== -1) {
          const actual = prev[idxExistente];
          const actualizado = {
            ...actual,
            cantidad: Number((actual.cantidad + c).toFixed(4)),
          };
          return [actualizado, ...prev.filter((_, i) => i !== idxExistente)];
        } else {
          return [
            {
              product_id: prodAAgregar.id,
              descripcion: prodAAgregar.name,
              unidad: prodAAgregar.unit || 'UNID',
              cantidad: c,
              costo_unitario: Number(prodAAgregar.cost_price || 0),
              es_externo: false,
            },
            ...prev,
          ];
        }
      });

      // Limpiar y devolver el foco inmediatamente al buscador para el siguiente producto
      setProdSeleccionado(null);
      setBusquedaProd('');
      setCantItem('1');
      setTimeout(() => {
        if (inputBuscarRef.current) {
          inputBuscarRef.current.focus();
        }
      }, 30);
    }
  };

  // Manejo de teclado en el buscador de productos (flechas, Enter, escáner)
  const handleKeyDownBuscador = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // ↑ ↓ eligen en la lista solo si está abierta; si no, mueven el selector a los campos de arriba / abajo
    // (antes se quedaban siempre en el buscador: dueño, 13/11/2026)
    const listaAbierta = prodsFiltrados.length > 0 && !prodSeleccionado;
    if (e.key === 'ArrowDown' && listaAbierta) {
      e.preventDefault();
      setIndiceSugerencia((prev) => (prev + 1) % prodsFiltrados.length);
    } else if (e.key === 'ArrowUp' && listaAbierta) {
      e.preventDefault();
      setIndiceSugerencia((prev) => (prev - 1 + prodsFiltrados.length) % prodsFiltrados.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (prodsFiltrados.length > 0) {
        const itemElegido = prodsFiltrados[indiceSugerencia] || prodsFiltrados[0];
        seleccionarProducto(itemElegido);
      } else if (prodSeleccionado) {
        if (inputCantRef.current) {
          inputCantRef.current.focus();
          inputCantRef.current.select();
        }
      }
    } else if (e.key === 'Escape') {
      setBusquedaProd('');
      setProdSeleccionado(null);
    }
  };

  // Cámara del celular: same código que la Caja, 100 % sin internet.
  const handleScanCamara = (codigo: string) => {
    const p = buscarProductoPorCodigo(productos as any[], codigo);
    if (p) {
      seleccionarProducto(p);
    } else {
      setBusquedaProd(codigo);
      setProdSeleccionado(null);
      setTimeout(() => inputBuscarRef.current?.focus(), 30);
    }
  };

  // Tecla Enter en el campo de cantidad
  const handleKeyDownCant = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAgregarItem();
    }
  };

  // Edición directa de cantidad en la tabla
  const handleModificarCantidad = (index: number, nuevaCantidad: number) => {
    if (isNaN(nuevaCantidad) || nuevaCantidad <= 0) return;
    setItems((prev) => {
      const copia = [...prev];
      copia[index] = { ...copia[index], cantidad: Number(nuevaCantidad.toFixed(4)) };
      return copia;
    });
  };

  const handlePasoCantidad = (index: number, delta: number) => {
    setItems((prev) => {
      const copia = [...prev];
      const nueva = Math.max(0.001, Number((copia[index].cantidad + delta).toFixed(4)));
      copia[index] = { ...copia[index], cantidad: nueva };
      return copia;
    });
  };

  const handleEliminarItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Regla 9 de SiuMax: Enter es como un clic, el selector se queda en el campo
  const handleKeyDownForm = (e: React.KeyboardEvent<HTMLElement>, _id?: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  // Guardar la salida (RPC en backend)
  const handleGuardarSalida = async () => {
    if (!customerId) {
      avisar('Selecciona el cliente');
      if (esMovil && esSesion) irAApartado('datos', 'select-cliente-salida');
      else document.getElementById('select-cliente-salida')?.focus();
      return;
    }
    if (trabajadoresSeleccionados.length === 0) {
      avisar('Asigna al menos un trabajador a la salida');
      if (esMovil && esSesion) irAApartado('datos');
      return;
    }
    if (items.length === 0) {
      avisar('Agrega al menos un material o repuesto a la salida');
      if (esMovil && esSesion) irAApartado('buscar', 'input-buscar-producto-salida');
      else inputBuscarRef.current?.focus();
      return;
    }

    // Los nombres que no están en la lista se guardan como nota (el dueño pidió "al menos como nota"): la base
    // exige un cliente y un bien registrados por ser llaves foráneas, pero el nombre real queda en observaciones.
    const notasLibres: string[] = [];
    if (clienteLibre.trim()) notasLibres.push(`CLIENTE: ${clienteLibre.trim().toUpperCase()}`);
    if (bienLibre.trim()) notasLibres.push(`ATIENDE: ${bienLibre.trim().toUpperCase()}`);
    const obsFinal = [observaciones.trim(), ...notasLibres].filter(Boolean).join(' | ');

    setGuardando(true);
    try {
      const payload = {
        tipo,
        customer_id: Number(customerId),
        bien_id: bienId && bienId !== 'otro' ? Number(bienId) : null,
        direccion: direccion.trim(),
        ubicacion: ubicacion.trim(),
        fecha,
        observaciones: obsFinal,
        salida_raiz_id: salidaRaiz ? salidaRaiz.id : null,
        usuario: 'Usuario',
        trabajadores: trabajadoresSeleccionados.map((tid, idx) => ({
          trabajador_id: tid,
          rol: idx === 0 ? 'RESPONSABLE' : 'AYUDANTE',
        })),
        items: items.map((it) => ({
          product_id: it.product_id,
          descripcion: it.descripcion,
          unidad: it.unidad,
          cantidad: it.cantidad,
          costo_unitario: it.costo_unitario,
          es_externo: it.es_externo,
        })),
      };

      const { data, error } = await supabase.rpc('fn_registrar_salida', {
        p_datos: payload,
      });

      if (error) throw error;

      // Limpiar borrador al guardar con éxito
      try {
        localStorage.removeItem(CLAVE_BORRADOR_SALIDA);
      } catch {}
      setTieneBorrador(false);

      avisar(`Salida ${data?.codigo || ''} registrada con éxito. Materiales descontados del almacén.`);
      onSuccess(data);
      onClose();
    } catch (err: any) {
      console.error('Error registrando salida:', err);
      avisar(err.message || 'Error al guardar la salida');
    } finally {
      setGuardando(false);
    }
  };

  // Atajo global de teclado en el modal: F10 o Ctrl+Enter para Guardar de inmediato
  useEffect(() => {
    if (!isOpen) return;
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.key === 'F10' || (e.ctrlKey && e.key === 'Enter')) {
        e.preventDefault();
        handleGuardarSalida();
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [isOpen, customerId, clienteLibre, bienId, bienLibre, trabajadoresSeleccionados, items, tipo, direccion, ubicacion, fecha, observaciones, salidaRaiz]);

  if (!isOpen) return null;

  const totalUnidades = items.reduce((acc, it) => acc + it.cantidad, 0);
  const totalCosto = items.reduce((acc, it) => acc + it.cantidad * it.costo_unitario, 0);

  /* ==========================================================================================
     FASE 179 — DISEÑO EXCLUSIVO DE CELULAR DENTRO DE LA SUB SESIÓN
     Tres apartados grandes (Buscar / Materiales / Datos) como en Caja:
       1) Buscar: buscador a TODO el ancho y con letra grande; cámara, cantidad y Agregar en otro renglón.
       2) Materiales: tarjetas grandes en vez de la tabla comprimida; cantidad con botones -/+.
       3) Datos: cliente, bien, dirección, fecha, personal y observaciones, uno debajo del otro.
     El stepper de arriba permite saltar de uno a otro sin bajar por toda la página.
     Tablet, laptop y PC siguen con el layout de la fase 178 (más abajo, sin tocar).
     ========================================================================================== */
  if (esSesion && esMovil) {
    const clsBotonApartado =
      'min-h-[52px] px-1 py-2 border-2 border-[var(--color-ink)] font-black uppercase tracking-wide text-[11px] sm:text-xs cursor-pointer rounded-none flex flex-col items-center justify-center gap-0.5 transition-colors';
    const clsCampo =
      'w-full p-3 sm:p-4 min-h-[52px] text-base sm:text-lg border-2 border-[var(--color-border)] focus:border-[var(--color-ink)] outline-none font-bold uppercase bg-[var(--color-surface)] rounded-none';

    return (
      <div
        id="sub-sesion-nueva-salida"
        data-dialogo-sistema="sub-sesion-salidas"
        data-evitar-iman-teclado="true"
        className="w-full font-mono"
      >
        <div
          id="modal-nueva-salida-container"
          data-evitar-foco-auto="true"
          className="ventana-sobria bg-[var(--color-surface)] w-full border-2 border-[var(--color-ink)] flex flex-col"
        >
          {/* Cabecera compacta para celular */}
          <div style={{ '--icono': 'var(--color-accent-shadow)' } as React.CSSProperties} className="ventana-cabecera px-3 py-3 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="ventana-cabecera__icono"><Truck size={20} /></div>
              <div className="min-w-0">
                <h2 className="ventana-cabecera__titulo truncate">
                  {salidaRaiz ? `Continuar ${salidaRaiz.codigo}` : 'Punto de Salida'}
                </h2>
                <p className="ventana-cabecera__subtitulo truncate">
                  {tieneBorrador && !salidaRaiz ? '✓ Borrador guardado · ' : ''}F10 o Ctrl+Enter para Guardar
                </p>
              </div>
            </div>
            <button
              id="btn-volver-lista-salida"
              type="button"
              onClick={onClose}
              title="Volver a la lista de salidas (Escape)"
              className="shrink-0 px-3 py-2 border-2 border-[var(--color-border)] bg-[var(--color-surface)] font-black uppercase hover:border-[var(--color-ink)] cursor-pointer rounded-none text-[11px]"
            >
              ← Lista
            </button>
          </div>

          {/* Stepper: se queda arriba para cambiar de apartado con un toque */}
          <div className="sticky top-0 z-20 grid grid-cols-3 gap-1.5 bg-[var(--color-bg)] p-2 border-b-2 border-[var(--color-ink)]">
            <button
              id="btn-apartado-buscar-salida"
              type="button"
              data-apartado-activo={apartadoActivo === 'buscar' ? 'true' : undefined}
              aria-pressed={apartadoActivo === 'buscar'}
              onClick={() => irAApartado('buscar', 'input-buscar-producto-salida')}
              className={`${clsBotonApartado} ${apartadoActivo === 'buscar' ? 'bg-[var(--color-ink)] text-white' : 'bg-[var(--color-surface)] text-[var(--color-ink)]'}`}
            >
              <span className="text-sm">⌕</span><span>1 · Buscar</span>
            </button>
            <button
              id="btn-apartado-materiales-salida"
              type="button"
              data-apartado-activo={apartadoActivo === 'materiales' ? 'true' : undefined}
              aria-pressed={apartadoActivo === 'materiales'}
              onClick={() => setApartadoActivo('materiales')}
              className={`${clsBotonApartado} ${apartadoActivo === 'materiales' ? 'bg-[var(--color-ink)] text-white' : 'bg-[var(--color-surface)] text-[var(--color-ink)]'}`}
            >
              <span className="text-sm">▤</span><span>2 · Materiales ({items.length})</span>
            </button>
            <button
              id="btn-apartado-datos-salida"
              type="button"
              data-apartado-activo={apartadoActivo === 'datos' ? 'true' : undefined}
              aria-pressed={apartadoActivo === 'datos'}
              onClick={() => setApartadoActivo('datos')}
              className={`${clsBotonApartado} ${apartadoActivo === 'datos' ? 'bg-[var(--color-ink)] text-white' : 'bg-[var(--color-surface)] text-[var(--color-ink)]'}`}
            >
              <span className="text-sm">✎</span><span>3 · Datos</span>
            </button>
          </div>

          <div className="p-3 space-y-3">
            {/* ---------------- 1) APARTADO BUSCAR ---------------- */}
            {apartadoActivo === 'buscar' && (
              <section id="apartado-buscar-salida" data-permitir-salto-enter="true" className="border-2 border-[var(--color-ink)] bg-[var(--color-bg)] p-3 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2">
                  <div className="flex items-center gap-2">
                    <Zap size={18} className="text-[var(--color-accent)]" />
                    <h3 className="font-black uppercase tracking-wider text-sm text-[var(--color-ink)]">
                      Buscar material o repuesto
                    </h3>
                  </div>
                  {tieneBorrador && !salidaRaiz && (
                    <button
                      type="button"
                      onClick={limpiarBorrador}
                      title="Borrar borrador guardado y empezar en blanco"
                      className="flex items-center gap-1 text-[11px] text-[var(--color-muted)] hover:text-red-600 font-bold uppercase cursor-pointer"
                    >
                      <RotateCcw size={12} /> Limpiar borrador
                    </button>
                  )}
                </div>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-xs sm:text-sm min-h-[36px]">
                  <input
                    id="check-material-externo-salida"
                    type="checkbox"
                    checked={esExterno}
                    onChange={(e) => setEsExterno(e.target.checked)}
                    className="w-5 h-5 rounded-none accent-[var(--color-ink)] focus:outline-none focus:ring-4 focus:ring-[var(--color-accent)]"
                  />
                  <span>Material fuera de almacén</span>
                </label>

                {esExterno ? (
                  <div className="space-y-2">
                    <input
                      ref={inputBuscarRef}
                      id="input-desc-material-externo"
                      type="text"
                      value={descExterno}
                      onChange={(e) => setDescExterno(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                      placeholder="Descripción del material..."
                      className={clsCampo}
                      autoComplete="off"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={unidadExterno}
                        onChange={(e) => setUnidadExterno(e.target.value)}
                        placeholder="Unidad (UNID, M, KG)"
                        className={clsCampo}
                      />
                      <input
                        id="input-cant-item-externo"
                        type="number"
                        step="any"
                        value={cantItem}
                        onChange={(e) => setCantItem(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); handleAgregarItem(); }
                        }}
                        placeholder="Cantidad"
                        className={`${clsCampo} text-center`}
                      />
                    </div>
                    <button
                      id="btn-agregar-item-externo"
                      type="button"
                      onClick={handleAgregarItem}
                      className="w-full min-h-[54px] bg-[var(--color-ink)] text-white font-black uppercase text-base flex items-center justify-center gap-2 hover:bg-[var(--color-accent)] hover:text-[var(--color-ink)] cursor-pointer rounded-none"
                    >
                      <Plus size={18} /> Agregar material
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Renglón 1: el buscador SOLO, a todo el ancho y con letra grande. */}
                    <div className="relative">
                      <input
                        ref={inputBuscarRef}
                        id="input-buscar-producto-salida"
                        type="text"
                        value={busquedaProd}
                        onChange={(e) => {
                          setBusquedaProd(e.target.value);
                          setProdSeleccionado(null);
                        }}
                        onKeyDown={handleKeyDownBuscador}
                        placeholder="Escribe el nombre o escanea el código..."
                        className={`${clsCampo} pr-12`}
                        autoComplete="off"
                      />
                      <Search size={22} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
                    </div>

                    {/* Renglón 2: cámara, cantidad y Agregar, cada uno con su espacio. */}
                    <div className="grid grid-cols-[auto_1fr_auto] gap-2 items-center">
                      <BotonEscanerCelular
                        id="btn-escaner-salida"
                        variante="compacto"
                        titulo="Escanear código del producto con la cámara"
                        onScan={handleScanCamara}
                      />
                      <input
                        ref={inputCantRef}
                        id="input-cant-item-salida"
                        type="number"
                        step="any"
                        min="0.001"
                        value={cantItem}
                        onChange={(e) => setCantItem(e.target.value)}
                        onKeyDown={handleKeyDownCant}
                        placeholder="Cant."
                        className={`${clsCampo} text-center px-1`}
                      />
                      <button
                        id="btn-agregar-material-salida"
                        type="button"
                        onClick={handleAgregarItem}
                        className="min-h-[52px] px-3 bg-[var(--color-ink)] text-white font-black uppercase text-xs flex items-center justify-center gap-1.5 hover:bg-[var(--color-accent)] hover:text-[var(--color-ink)] cursor-pointer rounded-none"
                      >
                        <Plus size={18} /> Agregar
                      </button>
                    </div>

                    {/* Sugerencias (mismo teclado de siempre: ↑ ↓ eligen, Enter pasa a cantidad) */}
                    {prodsFiltrados.length > 0 && !prodSeleccionado && (
                      <div className="border-2 border-[var(--color-ink)] bg-[var(--color-surface)] divide-y divide-[var(--color-border)] max-h-[45dvh] overflow-y-auto">
                        {prodsFiltrados.map((p, idx) => {
                          const activo = idx === indiceSugerencia;
                          return (
                            <div
                              key={p.id}
                              id={`sugerencia-salida-${idx}`}
                              onClick={() => seleccionarProducto(p)}
                              className={`p-3 cursor-pointer flex items-center gap-3 transition-colors ${activo ? 'bg-[var(--color-accent)] text-[var(--color-ink)]' : 'hover:bg-[var(--color-bg)]'}`}
                            >
                              <FotoMiniatura src={fotoProducto(p.id, p.image_path)} tamano="w-16 h-16" nombre={p.name} />
                              <div className="flex-1 min-w-0">
                                <p className="text-base font-black uppercase leading-tight text-[var(--color-ink)] break-words">{p.name}</p>
                                <p className="mt-1 text-[11px] font-bold flex flex-wrap items-center gap-2 text-[var(--color-muted)]">
                                  {p.code && <span className="px-1 py-0.5 bg-black/10 border border-black/20 text-[var(--color-ink)]">{p.code}</span>}
                                  <span>{p.unit || 'UNID'} · S/ {Number(p.cost_price || 0).toFixed(2)}</span>
                                  <span className={p.quantity <= 0 ? 'text-[var(--color-error)] font-black' : ''}>
                                    {p.quantity <= 0 ? 'AGOTADO' : `Stock: ${p.quantity}`}
                                  </span>
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {prodSeleccionado && (
                      <div className="p-2 bg-[var(--color-accent-bg)] border-2 border-[var(--color-accent)] flex items-center justify-between gap-2">
                        <span className="text-[var(--color-ink)] flex items-center gap-2 min-w-0 text-xs font-bold">
                          <FotoMiniatura src={fotoProducto(prodSeleccionado.id, prodSeleccionado.image_path)} tamano="w-10 h-10" nombre={prodSeleccionado.name} />
                          <span className="truncate">✓ <strong className="uppercase">{prodSeleccionado.name}</strong></span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setProdSeleccionado(null);
                            setBusquedaProd('');
                            inputBuscarRef.current?.focus();
                          }}
                          className="shrink-0 text-[11px] text-red-600 underline font-bold cursor-pointer"
                        >
                          Cambiar
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {items.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setApartadoActivo('materiales')}
                    className="w-full min-h-[48px] border-2 border-[var(--color-ink)] bg-[var(--color-surface)] font-black uppercase text-xs hover:bg-[var(--color-ink)] hover:text-white cursor-pointer rounded-none"
                  >
                    Ver {items.length} material(es) agregado(s) →
                  </button>
                )}
              </section>
            )}

            {/* ---------------- 2) APARTADO MATERIALES ---------------- */}
            {apartadoActivo === 'materiales' && (
              <section id="apartado-materiales-salida" className="space-y-3">
                <div className="flex items-center justify-between gap-2 border-2 border-[var(--color-ink)] bg-[var(--color-ink)] text-white p-3">
                  <h3 className="font-black uppercase tracking-wider text-sm">
                    Materiales agregados ({items.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => irAApartado('buscar', 'input-buscar-producto-salida')}
                    className="px-3 py-2 min-h-[40px] bg-[var(--color-surface)] text-[var(--color-ink)] font-black uppercase text-[11px] cursor-pointer rounded-none"
                  >
                    + Agregar más
                  </button>
                </div>

                {items.length > 0 ? (
                  <div className="space-y-2" data-tabla-campos>
                    {items.map((it, idx) => (
                      <div
                        key={idx}
                        data-material-card
                        data-material-nombre={it.descripcion}
                        className="border-2 border-[var(--color-ink)] bg-[var(--color-surface)] p-3 space-y-3"
                      >
                        <div className="flex items-start gap-3">
                          <FotoMiniatura
                            src={it.es_externo ? '' : fotoProducto(it.product_id, productos.find((p) => p.id === it.product_id)?.image_path)}
                            tamano="w-16 h-16"
                            nombre={it.descripcion}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-base font-black uppercase leading-tight break-words">{it.descripcion}</p>
                            {it.es_externo && (
                              <span className="inline-block mt-1 text-[9px] bg-amber-100 text-amber-800 px-1 py-0.5 border border-amber-300 font-black">EXTERNO</span>
                            )}
                            <p className="mt-1 text-[11px] font-bold text-[var(--color-muted)]">
                              {it.unidad} · S/ {it.costo_unitario.toFixed(2)} c/u
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleEliminarItem(idx)}
                            title="Quitar material"
                            className="shrink-0 w-11 h-11 flex items-center justify-center text-red-600 border-2 border-[var(--color-border)] hover:border-red-600 cursor-pointer rounded-none"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 border-t border-[var(--color-border)] pt-2">
                          <button
                            type="button"
                            onClick={() => handlePasoCantidad(idx, -1)}
                            title="Restar 1"
                            className="w-12 h-12 shrink-0 flex items-center justify-center border-2 border-[var(--color-border)] hover:bg-[var(--color-ink)] hover:text-white font-mono font-black text-xl cursor-pointer rounded-none"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            step="any"
                            min="0.001"
                            value={it.cantidad}
                            onChange={(e) => handleModificarCantidad(idx, parseFloat(e.target.value))}
                            className="flex-1 min-w-0 p-2 min-h-[48px] text-lg text-center font-black border-2 border-[var(--color-border)] focus:border-[var(--color-ink)] outline-none rounded-none bg-[var(--color-surface)]"
                          />
                          <button
                            type="button"
                            onClick={() => handlePasoCantidad(idx, 1)}
                            title="Sumar 1"
                            className="w-12 h-12 shrink-0 flex items-center justify-center border-2 border-[var(--color-border)] hover:bg-[var(--color-ink)] hover:text-white font-mono font-black text-xl cursor-pointer rounded-none"
                          >
                            +
                          </button>
                          <span className="shrink-0 text-right font-black text-sm w-24">
                            S/ {(it.cantidad * it.costo_unitario).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                    <div className="bg-[var(--color-ink)] text-white p-3 flex flex-wrap items-center justify-between gap-1 font-black text-xs">
                      <span>TOTAL: {items.length} material(es)</span>
                      <span>{totalUnidades} unid. · S/ {totalCosto.toFixed(2)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] space-y-3">
                    <p className="font-bold uppercase text-xs">Aún no hay materiales agregados</p>
                    <button
                      type="button"
                      onClick={() => irAApartado('buscar', 'input-buscar-producto-salida')}
                      className="px-4 py-3 min-h-[48px] bg-[var(--color-ink)] text-white font-black uppercase text-xs cursor-pointer rounded-none"
                    >
                      Ir a buscar materiales →
                    </button>
                  </div>
                )}
              </section>
            )}

            {/* ---------------- 3) APARTADO DATOS ---------------- */}
            {apartadoActivo === 'datos' && (
              <section id="apartado-datos-salida" className="space-y-3" data-grilla-salida="true">
                <div className="border-2 border-[var(--color-ink)] bg-[var(--color-ink)] text-white p-3">
                  <h3 className="font-black uppercase tracking-wider text-sm">Datos de la salida</h3>
                </div>

                <div className="space-y-3 border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                  <div>
                    <label className="block font-black uppercase text-[var(--color-ink)] mb-1 text-xs">Tipo de Trabajo *</label>
                    <select
                      id="select-tipo-salida"
                      value={tipo}
                      onChange={(e) => setTipo(e.target.value as TipoSalida)}
                      onKeyDown={(e) => handleKeyDownForm(e, 'select-tipo-salida')}
                      className={`${clsCampo} min-h-[54px]`}
                    >
                      <option value="SERVICIO">SERVICIO (MANTENIMIENTO / PUNTUAL)</option>
                      <option value="OBRA">OBRA (INSTALACIÓN / PROYECTO)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-black uppercase text-[var(--color-ink)] mb-1 text-xs">Cliente *</label>
                    <select
                      id="select-cliente-salida"
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : '')}
                      onKeyDown={(e) => handleKeyDownForm(e, 'select-cliente-salida')}
                      className={`${clsCampo} min-h-[54px]`}
                      required
                    >
                      <option value="">-- SELECCIONAR CLIENTE --</option>
                      {clientes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.dni || c.ruc ? `(${c.dni || c.ruc})` : ''}
                        </option>
                      ))}
                    </select>
                    <input
                      id="input-cliente-libre-salida"
                      type="text"
                      value={clienteLibre}
                      onChange={(e) => setClienteLibre(e.target.value)}
                      onKeyDown={(e) => handleKeyDownForm(e, 'input-cliente-libre-salida')}
                      placeholder="Si no está en la lista, escribe aquí el nombre"
                      title="El nombre se guarda como nota; elige un cliente registrado como referencia"
                      className={`${clsCampo} mt-2`}
                    />
                  </div>

                  <div>
                    <label className="block font-black uppercase text-[var(--color-ink)] mb-1 text-xs">Lo que se atiende</label>
                    <select
                      id="select-bien-salida"
                      value={bienId}
                      onChange={(e) => {
                        const v = e.target.value;
                        setBienId(v === 'otro' ? 'otro' : v ? Number(v) : '');
                      }}
                      onKeyDown={(e) => handleKeyDownForm(e, 'select-bien-salida')}
                      disabled={!customerId}
                      className={`${clsCampo} min-h-[54px] disabled:opacity-50`}
                    >
                      <option value="">-- GENERAL / NO ESPECÍFICO --</option>
                      {bienes.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.nombre} ({b.tipo}){b.estado && b.estado !== 'ACTIVO' ? ` [${b.estado}]` : ''}
                        </option>
                      ))}
                      <option value="otro">OTRO: escribir el nombre</option>
                    </select>
                    {bienId === 'otro' && (
                      <input
                        id="input-bien-libre-salida"
                        type="text"
                        value={bienLibre}
                        onChange={(e) => setBienLibre(e.target.value)}
                        onKeyDown={(e) => handleKeyDownForm(e, 'input-bien-libre-salida')}
                        placeholder="Nombre de lo que se atiende"
                        title="El nombre se guarda como nota"
                        className={`${clsCampo} mt-2`}
                      />
                    )}
                  </div>

                  <div>
                    <label className="block font-black uppercase text-[var(--color-muted)] mb-1 text-xs">Dirección / Lugar de la obra</label>
                    <input
                      id="input-direccion-salida"
                      type="text"
                      value={direccion}
                      onChange={(e) => setDireccion(e.target.value)}
                      onKeyDown={(e) => handleKeyDownForm(e, 'input-direccion-salida')}
                      placeholder="Ej. Urb. Las Flores Mz. B Lt. 4"
                      className={clsCampo}
                    />
                  </div>

                  <div>
                    <label className="block font-black uppercase text-[var(--color-ink)] mb-1 text-xs">Fecha de Salida *</label>
                    <input
                      id="input-fecha-salida"
                      type="date"
                      value={fecha}
                      onChange={(e) => setFecha(e.target.value)}
                      onKeyDown={(e) => handleKeyDownForm(e, 'input-fecha-salida')}
                      className={`${clsCampo} min-h-[54px]`}
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-black uppercase text-[var(--color-ink)] mb-1 text-xs">Personal Técnico Asignado *</label>
                    <div className="flex flex-wrap gap-2 p-2 border-2 border-[var(--color-border)] bg-[var(--color-bg)]">
                      {trabajadores.length === 0 ? (
                        <span className="text-[var(--color-muted)] text-xs">No hay trabajadores activos registrados</span>
                      ) : (
                        trabajadores.map((t) => {
                          const sel = trabajadoresSeleccionados.includes(t.id);
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => toggleTrabajador(t.id)}
                              className={`min-h-[44px] px-3 py-2 text-[11px] font-bold uppercase cursor-pointer border flex items-center gap-1.5 transition-colors rounded-none ${
                                sel
                                  ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]'
                                  : 'bg-[var(--color-surface)] text-[var(--color-ink)] border-[var(--color-border)] hover:border-[var(--color-ink)]'
                              }`}
                            >
                              {sel && <Check size={14} className="text-[var(--color-accent)]" />}
                              <span>{t.nombre}</span>
                              {t.cargo && <span className="text-[9px] opacity-75">({t.cargo})</span>}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block font-black uppercase text-[var(--color-muted)] mb-1 text-xs">Observaciones / Instrucciones</label>
                    <input
                      id="input-observaciones-salida"
                      type="text"
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      placeholder="Ej. Llevar escalera de 4 metros..."
                      className={clsCampo}
                    />
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Footer fijo abajo con el resumen y Guardar siempre a la vista */}
          <div className="bg-[var(--color-bg)] p-3 border-t-2 border-[var(--color-ink)] space-y-2 shrink-0">
            <p className="text-[11px] font-bold text-[var(--color-muted)] text-center">
              {items.length} material(es) listo(s) · {totalUnidades} unidad(es) · S/ {totalCosto.toFixed(2)}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                id="btn-volver-lista-footer-salida"
                type="button"
                onClick={onClose}
                title="Volver a la lista de salidas (Escape)"
                className="min-h-[52px] px-2 border-2 border-[var(--color-border)] bg-[var(--color-surface)] font-black uppercase text-[11px] hover:bg-black/5 cursor-pointer rounded-none"
              >
                ← Volver
              </button>
              <button
                id="btn-guardar-salida"
                type="button"
                disabled={guardando}
                onClick={handleGuardarSalida}
                title="Guardar salida de inmediato (F10 o Ctrl+Enter)"
                className="min-h-[52px] px-2 bg-[var(--color-ink)] text-white font-black uppercase text-[11px] tracking-wide hover:bg-[var(--color-accent)] hover:text-[var(--color-ink)] cursor-pointer shadow-[3px_3px_0_0_var(--color-ink)] active:translate-x-0.5 active:translate-y-0.5 rounded-none disabled:opacity-60"
              >
                {guardando ? 'Guardando...' : 'Confirmar (F10)'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      id={esSesion ? 'sub-sesion-nueva-salida' : undefined}
      // Se marca como "ventana del sistema" para que Tab no abra el sidebar y las flechas no se salgan de la
      // sub sesión, pero sin capa flotante: es contenido de la sección Salidas (178).
      data-dialogo-sistema={esSesion ? 'sub-sesion-salidas' : undefined}
      data-evitar-iman-teclado={esSesion ? 'true' : undefined}
      className={esSesion ? 'w-full font-mono' : 'fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 font-mono'}
    >
      <div
        id="modal-nueva-salida-container"
        data-evitar-foco-auto={esSesion ? 'true' : undefined}
        className={`ventana-sobria bg-[var(--color-surface)] w-full border-2 border-[var(--color-ink)] flex flex-col ${
          esSesion
            ? ''
            : 'max-w-5xl max-h-[calc(94dvh/var(--ui-zoom))] sm:max-h-[calc(90dvh/var(--ui-zoom))] overflow-hidden'
        }`}
      >
        {/* Cabecera SiuMax Sobrio */}
        <div style={{ '--icono': 'var(--color-accent-shadow)' } as React.CSSProperties} className="ventana-cabecera px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="ventana-cabecera__icono">
              <Truck size={20} />
            </div>
            <div>
              <h2 className="ventana-cabecera__titulo">
                {salidaRaiz ? `Continuar Salida (${salidaRaiz.codigo})` : 'Punto de Salida a Obra / Servicio'}
              </h2>
              <p className="ventana-cabecera__subtitulo">
                Registro rápido de materiales y asignación técnica{esSesion ? ' · F10 o Ctrl+Enter para Guardar' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {tieneBorrador && !salidaRaiz && (
              <span className="hidden sm:inline-block text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 px-2 py-1 font-bold uppercase tracking-wider">
                ✓ Borrador auto-guardado
              </span>
            )}
            {esSesion ? (
              <button
                id="btn-volver-lista-salida"
                type="button"
                onClick={onClose}
                title="Volver a la lista de salidas (Escape)"
                className="px-3 sm:px-4 py-2 border-2 border-[var(--color-border)] bg-[var(--color-surface)] font-black uppercase hover:border-[var(--color-ink)] cursor-pointer rounded-none text-xs sm:text-sm"
              >
                ← Volver a la lista
              </button>
            ) : (
              <button
                id="btn-cerrar-modal-nueva-salida"
                onClick={onClose}
                className="ventana-cerrar"
                title="Cerrar (Escape)"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Contenido: en sub sesión no hay scroll propio; baja la página completa y hay más espacio y letra. */}
        <div className={esSesion
          ? 'p-4 sm:p-6 lg:p-8 text-sm sm:text-base space-y-5'
          : 'p-4 sm:p-6 overflow-y-auto flex-1 font-mono text-xs space-y-4'
        }>
          {/* Fila 1: Tipo y Cliente */}
          <div
            data-grilla-salida={esSesion ? 'true' : undefined}
            className={`grid grid-cols-1 ${esSesion ? 'md:grid-cols-2 xl:grid-cols-3' : 'sm:grid-cols-3'} gap-3`}
          >
            <div>
              <label className="block font-black uppercase text-[var(--color-ink)] mb-1">
                Tipo de Trabajo *
              </label>
              <select
                id="select-tipo-salida"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoSalida)}
                onKeyDown={(e) => handleKeyDownForm(e, 'select-tipo-salida')}
                className="w-full p-2 border-2 border-[var(--color-border)] focus:border-[var(--color-ink)] outline-none font-bold uppercase bg-[var(--color-surface)] rounded-none"
              >
                <option value="SERVICIO">SERVICIO (MANTENIMIENTO / PUNTUAL)</option>
                <option value="OBRA">OBRA (INSTALACIÓN / PROYECTO)</option>
              </select>
            </div>

            <div>
              <label className="block font-black uppercase text-[var(--color-ink)] mb-1">
                Cliente *
              </label>
              <select
                id="select-cliente-salida"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : '')}
                onKeyDown={(e) => handleKeyDownForm(e, 'select-cliente-salida')}
                className="w-full p-2 min-h-[44px] sm:min-h-0 border-2 border-[var(--color-border)] focus:border-[var(--color-ink)] outline-none font-bold uppercase bg-[var(--color-surface)] rounded-none"
                required
              >
                <option value="">-- SELECCIONAR CLIENTE --</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.dni || c.ruc ? `(${c.dni || c.ruc})` : ''}
                  </option>
                ))}
              </select>
              <input
                id="input-cliente-libre-salida"
                type="text"
                value={clienteLibre}
                onChange={(e) => setClienteLibre(e.target.value)}
                onKeyDown={(e) => handleKeyDownForm(e, 'input-cliente-libre-salida')}
                placeholder="Si no está en la lista, escribe aquí el nombre"
                title="El nombre se guarda como nota; elige un cliente registrado como referencia"
                className="w-full p-2 min-h-[44px] sm:min-h-0 mt-1 border-2 border-[var(--color-border)] focus:border-[var(--color-ink)] outline-none font-bold uppercase bg-[var(--color-surface)] rounded-none"
              />
            </div>

            <div>
              <label className="block font-black uppercase text-[var(--color-ink)] mb-1">
                Lo que se atiende
              </label>
              <select
                id="select-bien-salida"
                value={bienId}
                onChange={(e) => {
                  const v = e.target.value;
                  setBienId(v === 'otro' ? 'otro' : v ? Number(v) : '');
                }}
                onKeyDown={(e) => handleKeyDownForm(e, 'select-bien-salida')}
                disabled={!customerId}
                className="w-full p-2 min-h-[44px] sm:min-h-0 border-2 border-[var(--color-border)] focus:border-[var(--color-ink)] outline-none font-bold uppercase bg-[var(--color-surface)] disabled:opacity-50 rounded-none"
              >
                <option value="">-- GENERAL / NO ESPECÍFICO --</option>
                {bienes.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nombre} ({b.tipo}){b.estado && b.estado !== 'ACTIVO' ? ` [${b.estado}]` : ''}
                  </option>
                ))}
                <option value="otro">OTRO: escribir el nombre</option>
              </select>
              {bienId === 'otro' && (
                <input
                  id="input-bien-libre-salida"
                  type="text"
                  value={bienLibre}
                  onChange={(e) => setBienLibre(e.target.value)}
                  onKeyDown={(e) => handleKeyDownForm(e, 'input-bien-libre-salida')}
                  placeholder="Nombre de lo que se atiende"
                  title="El nombre se guarda como nota"
                  className="w-full p-2 min-h-[44px] sm:min-h-0 mt-1 border-2 border-[var(--color-border)] focus:border-[var(--color-ink)] outline-none font-bold uppercase bg-[var(--color-surface)] rounded-none"
                />
              )}
            </div>
          </div>

          {/* Fila 2: Dirección y Fecha */}
          <div className={`grid grid-cols-1 ${esSesion ? 'md:grid-cols-2 xl:grid-cols-3' : 'sm:grid-cols-3'} gap-3`}>
            <div className={esSesion ? 'md:col-span-2' : 'sm:col-span-2'}>
              <label className="block font-black uppercase text-[var(--color-muted)] mb-1">
                Dirección / Lugar de la obra
              </label>
              <input
                id="input-direccion-salida"
                type="text"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                onKeyDown={(e) => handleKeyDownForm(e, 'input-direccion-salida')}
                placeholder="Ej. Urb. Las Flores Mz. B Lt. 4"
                className="w-full p-2 border-2 border-[var(--color-border)] focus:border-[var(--color-ink)] outline-none font-bold uppercase rounded-none"
              />
            </div>
            <div>
              <label className="block font-black uppercase text-[var(--color-ink)] mb-1">
                Fecha de Salida *
              </label>
              <input
                id="input-fecha-salida"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                onKeyDown={(e) => handleKeyDownForm(e, 'input-fecha-salida')}
                className="w-full p-2 border-2 border-[var(--color-border)] focus:border-[var(--color-ink)] outline-none font-bold rounded-none"
                required
              >
              </input>
            </div>
          </div>

          {/* Fila 3: Trabajadores Asignados */}
          <div>
            <label className="block font-black uppercase text-[var(--color-ink)] mb-1">
              Personal Técnico Asignado *
            </label>
            <div className="flex flex-wrap gap-2 p-2 border-2 border-[var(--color-border)] bg-[var(--color-bg)]">
              {trabajadores.length === 0 ? (
                <span className="text-[var(--color-muted)]">No hay trabajadores activos registrados</span>
              ) : (
                trabajadores.map((t) => {
                  const sel = trabajadoresSeleccionados.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleTrabajador(t.id)}
                      className={`px-2.5 py-1 text-[11px] font-bold uppercase cursor-pointer border flex items-center gap-1.5 transition-colors rounded-none ${
                        sel
                          ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]'
                          : 'bg-[var(--color-surface)] text-[var(--color-ink)] border-[var(--color-border)] hover:border-[var(--color-ink)]'
                      }`}
                    >
                      {sel && <Check size={12} className="text-[var(--color-accent)]" />}
                      <span>{t.nombre}</span>
                      {t.cargo && <span className="text-[9px] opacity-75">({t.cargo})</span>}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Fila 4: REGISTRO RÁPIDO DE MATERIALES (TIPO SUNAT) */}
          <div className="border-2 border-[var(--color-ink)] p-3 bg-[var(--color-bg)] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-[var(--color-accent)]" />
                <span className="font-black uppercase tracking-wider text-[var(--color-ink)] text-xs">
                  Registro Rápido de Materiales (Tipo SUNAT)
                </span>
                <span className="text-[10px] text-[var(--color-muted)] hidden sm:inline">
                  [Escribe/Escanea › Enter › Cantidad › Enter]
                </span>
              </div>
              <div className="flex items-center gap-3">
                {tieneBorrador && !salidaRaiz && (
                  <button
                    type="button"
                    onClick={limpiarBorrador}
                    title="Borrar borrador guardado y empezar en blanco"
                    className="flex items-center gap-1 text-[10px] text-[var(--color-muted)] hover:text-red-600 font-bold uppercase cursor-pointer"
                  >
                    <RotateCcw size={12} /> Limpiar borrador
                  </button>
                )}
                <label className="flex items-center gap-1.5 cursor-pointer font-bold text-[11px]">
                  <input
                    id="check-material-externo-salida"
                    type="checkbox"
                    checked={esExterno}
                    onChange={(e) => setEsExterno(e.target.checked)}
                    className="w-4 h-4 rounded-none accent-[var(--color-ink)] focus:outline-none focus:ring-4 focus:ring-[var(--color-accent)] focus:ring-offset-1"
                  />
                  <span>Material fuera de almacén</span>
                </label>
              </div>
            </div>

            {esExterno ? (
              /* Entrada de Material Externo */
              <div className={`grid grid-cols-1 ${esSesion ? 'md:grid-cols-5' : 'sm:grid-cols-5'} gap-2 items-center`}>
                <div className={esSesion ? 'md:col-span-2' : 'sm:col-span-2'}>
                  <input
                    id="input-desc-material-externo"
                    type="text"
                    value={descExterno}
                    onChange={(e) => setDescExterno(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} // Enter: el selector se queda
                    placeholder="Descripción del material o compra directa..."
                    className="w-full p-2 border-2 border-[var(--color-border)] focus:border-[var(--color-ink)] uppercase font-bold outline-none rounded-none bg-[var(--color-surface)]"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={unidadExterno}
                    onChange={(e) => setUnidadExterno(e.target.value)}
                    placeholder="Unidad (UNID, M, KG)"
                    className="w-full p-2 border-2 border-[var(--color-border)] focus:border-[var(--color-ink)] uppercase font-bold outline-none rounded-none bg-[var(--color-surface)]"
                  />
                </div>
                <div>
                  <input
                    id="input-cant-item-externo"
                    type="number"
                    step="any"
                    value={cantItem}
                    onChange={(e) => setCantItem(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAgregarItem();
                      }
                    }}
                    placeholder="Cantidad"
                    className="w-full p-2 border-2 border-[var(--color-border)] focus:border-[var(--color-ink)] font-bold text-center outline-none rounded-none bg-[var(--color-surface)]"
                  />
                </div>
                <div>
                  <button
                    id="btn-agregar-item-externo"
                    type="button"
                    onClick={handleAgregarItem}
                    className="w-full p-2 bg-[var(--color-ink)] text-white font-black uppercase flex items-center justify-center gap-1 hover:bg-[var(--color-accent)] hover:text-[var(--color-ink)] cursor-pointer rounded-none"
                  >
                    <Plus size={16} /> Agregar
                  </button>
                </div>
              </div>
            ) : (
              /* Renglón Rápido tipo SUNAT / Pistola de Códigos. En celular el buscador se queda fijo arriba
                  mientras se baja por las sugerencias y los materiales (pedido del dueño 18/11/2026). */
              <div className="space-y-2">
                <div
                  data-permitir-salto-enter={esSesion ? 'true' : undefined}
                  className={`sticky ${esSesion ? 'top-2' : 'top-0'} z-10 bg-[var(--color-bg)] py-1 -mx-1 px-1 flex gap-2 items-center`}
                >
                  <div className="relative flex-1 min-w-0">
                    <input
                      ref={inputBuscarRef}
                      id="input-buscar-producto-salida"
                      type="text"
                      value={busquedaProd}
                      onChange={(e) => {
                        setBusquedaProd(e.target.value);
                        setProdSeleccionado(null);
                      }}
                      onKeyDown={handleKeyDownBuscador}
                      placeholder="Escribe nombre o escanea código del producto..."
                      className="w-full p-3 sm:p-2.5 min-h-[48px] sm:min-h-0 border-2 border-[var(--color-border)] focus:border-[var(--color-ink)] uppercase font-bold pr-8 outline-none rounded-none bg-[var(--color-surface)]"
                      autoComplete="off"
                    />
                    <Search size={16} className="absolute right-2.5 top-3 text-[var(--color-muted)]" />
                  </div>

                  <BotonEscanerCelular
                    id="btn-escaner-salida"
                    variante="compacto"
                    titulo="Escanear código del producto con la cámara"
                    onScan={handleScanCamara}
                  />

                  <div className="w-20 sm:w-28 shrink-0">
                    <input
                      ref={inputCantRef}
                      id="input-cant-item-salida"
                      type="number"
                      step="any"
                      min="0.001"
                      value={cantItem}
                      onChange={(e) => setCantItem(e.target.value)}
                      onKeyDown={handleKeyDownCant}
                      className="w-full p-3 sm:p-2.5 min-h-[48px] sm:min-h-0 border-2 border-[var(--color-border)] focus:border-[var(--color-ink)] font-black text-center outline-none rounded-none bg-[var(--color-surface)]"
                      placeholder="Cant."
                    />
                  </div>

                  <button
                    id="btn-agregar-material-salida"
                    type="button"
                    onClick={handleAgregarItem}
                    className="px-3 sm:px-4 py-3 sm:py-2.5 min-h-[48px] sm:min-h-0 bg-[var(--color-ink)] text-white font-black uppercase flex items-center gap-1.5 hover:bg-[var(--color-accent)] hover:text-[var(--color-ink)] cursor-pointer rounded-none shrink-0"
                  >
                    <Plus size={16} /> <span className="hidden sm:inline">Agregar (Enter)</span><span className="sm:hidden">+</span>
                  </button>
                </div>

                {/* Lista flotante de sugerencias con flechas teclado */}
                {prodsFiltrados.length > 0 && !prodSeleccionado && (
                  <div className={`border-2 border-[var(--color-ink)] bg-[var(--color-surface)] divide-y divide-[var(--color-border)] ${esSesion ? 'max-h-96' : 'max-h-72'} overflow-y-auto`}>
                    {prodsFiltrados.map((p, idx) => {
                      const activo = idx === indiceSugerencia;
                      return (
                        <div
                          key={p.id}
                          id={`sugerencia-salida-${idx}`}
                          onClick={() => seleccionarProducto(p)}
                          className={`p-2 cursor-pointer flex items-center gap-3 transition-colors ${
                            activo
                              ? 'bg-[var(--color-accent)] text-[var(--color-ink)]'
                              : 'hover:bg-[var(--color-bg)]'
                          }`}
                        >
                          {/* Foto referencial como en la Caja */}
                          <FotoMiniatura src={fotoProducto(p.id, p.image_path)} tamano="w-14 h-14" nombre={p.name} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black uppercase leading-tight text-[var(--color-ink)] break-words">
                              {p.name}
                            </p>
                            <p className={`mt-1 text-[11px] font-bold flex flex-wrap items-center gap-2 ${activo ? 'text-[var(--color-ink)]' : 'text-[var(--color-muted)]'}`}>
                              {p.code && (
                                <span className="px-1 py-0.5 bg-black/10 border border-black/20 text-[var(--color-ink)]">{p.code}</span>
                              )}
                              <span>Unidad: {p.unit || 'UNID'} · Costo: S/ {Number(p.cost_price || 0).toFixed(2)}</span>
                            </p>
                          </div>
                          <span
                            className={`shrink-0 px-2 py-1 text-xs font-black uppercase tracking-wide whitespace-nowrap border ${
                              p.quantity <= 0
                                ? 'text-[var(--color-error)] border-[var(--color-error)] bg-[var(--color-surface)]'
                                : 'text-[var(--color-ink)] border-[var(--color-border)] bg-[var(--color-surface)]'
                            }`}
                          >
                            {p.quantity <= 0 ? 'Agotado' : `Stock: ${p.quantity} ${p.unit || ''}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {prodSeleccionado && (
                  <div className="p-1.5 bg-[var(--color-accent-bg)] border border-[var(--color-accent)] flex justify-between items-center gap-2 text-xs font-bold">
                    <span className="text-[var(--color-ink)] flex items-center gap-2 min-w-0">
                      <FotoMiniatura src={fotoProducto(prodSeleccionado.id, prodSeleccionado.image_path)} tamano="w-10 h-10" nombre={prodSeleccionado.name} />
                      <span>✓ Seleccionado: <strong className="uppercase">{prodSeleccionado.name}</strong> (Stock: {prodSeleccionado.quantity} {prodSeleccionado.unit})</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setProdSeleccionado(null);
                        setBusquedaProd('');
                        inputBuscarRef.current?.focus();
                      }}
                      className="text-[10px] text-red-600 underline cursor-pointer"
                    >
                      Cambiar
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TABLA DE MATERIALES AGREGADOS CON EDICIÓN DIRECTA */}
            {items.length > 0 ? (
              <div className="border-2 border-[var(--color-ink)] bg-[var(--color-surface)] overflow-x-auto">
                {/* data-tabla-campos: cantidades que se escriben; las flechas se mueven entre ellas (flechasEspaciales) */}
                <table data-tabla-campos className="w-full text-left text-xs font-mono">
                  <thead className="bg-[var(--color-ink)] text-white text-[10px] font-black uppercase tracking-widest">
                    <tr>
                      <th className="p-2 w-10 text-center">#</th>
                      <th className="p-2 w-14 text-center">Foto</th>
                      <th className="p-2">Material / Repuesto</th>
                      <th className="p-2 w-20 text-center">Unidad</th>
                      <th className="p-2 w-36 text-center">Cantidad</th>
                      <th className="p-2 w-24 text-right">Costo Unit.</th>
                      <th className="p-2 w-28 text-right">Subtotal</th>
                      <th className="p-2 w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-black/5">
                        <td className="p-2 text-center font-bold text-[var(--color-muted)]">
                          {idx + 1}
                        </td>
                        <td className="p-1.5">
                          <div className="flex justify-center">
                            <FotoMiniatura
                              src={it.es_externo ? '' : fotoProducto(it.product_id, productos.find((p) => p.id === it.product_id)?.image_path)}
                              tamano="w-10 h-10"
                              nombre={it.descripcion}
                            />
                          </div>
                        </td>
                        <td className="p-2 text-sm font-black uppercase leading-tight">
                          {it.descripcion}
                          {it.es_externo && (
                            <span className="ml-2 text-[9px] bg-amber-100 text-amber-800 px-1 py-0.5 border border-amber-300">
                              EXTERNO
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-center font-bold">{it.unidad}</td>
                        <td className="p-2">
                          {/* Edición directa en la fila (teclado + botones -/+) */}
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handlePasoCantidad(idx, -1)}
                              title="Restar 1"
                              className="w-6 h-6 flex items-center justify-center border border-[var(--color-border)] hover:bg-[var(--color-ink)] hover:text-white font-mono font-bold cursor-pointer rounded-none"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              step="any"
                              min="0.001"
                              value={it.cantidad}
                              onChange={(e) => handleModificarCantidad(idx, parseFloat(e.target.value))}
                              className="w-16 p-1 text-center font-black border border-[var(--color-border)] focus:border-[var(--color-ink)] outline-none rounded-none bg-[var(--color-surface)]"
                            />
                            <button
                              type="button"
                              onClick={() => handlePasoCantidad(idx, 1)}
                              title="Sumar 1"
                              className="w-6 h-6 flex items-center justify-center border border-[var(--color-border)] hover:bg-[var(--color-ink)] hover:text-white font-mono font-bold cursor-pointer rounded-none"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="p-2 text-right">S/ {it.costo_unitario.toFixed(2)}</td>
                        <td className="p-2 text-right font-black">
                          S/ {(it.cantidad * it.costo_unitario).toFixed(2)}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleEliminarItem(idx)}
                            title="Quitar material"
                            className="text-red-600 hover:text-red-800 cursor-pointer p-1"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Fila de Totales */}
                  <tfoot className="bg-[var(--color-bg)] border-t-2 border-[var(--color-ink)] font-black">
                    <tr>
                      <td colSpan={4} className="p-2 text-[var(--color-ink)] uppercase">
                        TOTAL: {items.length} tipo(s) de material
                      </td>
                      <td className="p-2 text-center font-black">
                        {totalUnidades} unid.
                      </td>
                      <td className="p-2 text-right text-[var(--color-muted)]">Valorizado:</td>
                      <td className="p-2 text-right font-black text-sm">
                        S/ {totalCosto.toFixed(2)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)]">
                <p className="font-bold uppercase text-xs">Aún no hay materiales agregados en esta salida</p>
                <p className="text-[10px] mt-1">Escribe arriba el nombre o pasa la lectora de código de barras y presiona Enter.</p>
              </div>
            )}
          </div>

          {/* Fila 5: Observaciones */}
          <div>
            <label className="block font-black uppercase text-[var(--color-muted)] mb-1">
              Observaciones / Instrucciones de trabajo
            </label>
            <input
              id="input-observaciones-salida"
              type="text"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Ej. Llevar escalera de 4 metros, coordinar con conserje..."
              className="w-full p-2 border-2 border-[var(--color-border)] focus:border-[var(--color-ink)] outline-none font-bold uppercase rounded-none"
            />
          </div>
        </div>

        {/* Footer: en sub sesión queda al final de la página, con el mismo botón de volver que arriba. */}
        <div className={`bg-[var(--color-bg)] p-3 sm:p-4 border-t-2 border-[var(--color-ink)] flex flex-wrap justify-between items-center gap-2 ${esSesion ? '' : 'shrink-0'}`}>
          <span className="text-[11px] font-bold text-[var(--color-muted)]">
            {items.length} material(es) listo(s) · {totalUnidades} unidad(es) en total
          </span>
          <div className="flex gap-2">
            {esSesion ? (
              <button
                id="btn-volver-lista-footer-salida"
                type="button"
                onClick={onClose}
                title="Volver a la lista de salidas (Escape)"
                className="px-4 py-2 border-2 border-[var(--color-border)] bg-[var(--color-surface)] font-black uppercase hover:bg-black/5 cursor-pointer rounded-none"
              >
                ← Volver a la lista
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border-2 border-[var(--color-border)] font-black uppercase hover:bg-black/5 cursor-pointer rounded-none"
              >
                Cancelar (Esc)
              </button>
            )}
            <button
              id="btn-guardar-salida"
              type="button"
              disabled={guardando}
              onClick={handleGuardarSalida}
              title="Guardar salida de inmediato (F10 o Ctrl+Enter)"
              className="px-6 py-2 bg-[var(--color-ink)] text-white font-black uppercase tracking-wider hover:bg-[var(--color-accent)] hover:text-[var(--color-ink)] cursor-pointer shadow-[3px_3px_0_0_var(--color-ink)] active:translate-x-0.5 active:translate-y-0.5 rounded-none"
            >
              {guardando ? 'Guardando...' : 'Confirmar Salida (F10)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

