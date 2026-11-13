import React, { useState, useEffect, useRef } from 'react';
import { Truck, X, Plus, Trash2, Search, Check, RotateCcw, Zap } from 'lucide-react';
import { supabase } from '../../../db/supabase';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { avisar } from '../../../utils/dialogos';
import type { TipoSalida, Salida } from '../types';

interface ModalNuevaSalidaProps {
  isOpen: boolean;
  salidaRaiz?: Salida | null;
  datosIniciales?: {
    tipo?: TipoSalida;
    customerId?: number | '';
    bienId?: number | '';
    direccion?: string;
    ubicacion?: string;
    trabajadoresIds?: number[];
    observaciones?: string;
  } | null;
  onClose: () => void;
  onSuccess: (salidaCreada: any) => void;
}

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
  salidaRaiz,
  datosIniciales,
  onClose,
  onSuccess,
}) => {
  useCerrarConEscape(isOpen, onClose);

  // Form State
  const [tipo, setTipo] = useState<TipoSalida>('SERVICIO');
  const [customerId, setCustomerId] = useState<number | ''>('');
  const [bienId, setBienId] = useState<number | ''>('');
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
        setBienId(salidaRaiz.bien_id || '');
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
        setBienId(datosIniciales.bienId || '');
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
              if (b.bienId) setBienId(b.bienId);
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
          setBienId('');
          setDireccion('');
          setUbicacion('');
          setObservaciones('');
          setTrabajadoresSeleccionados([]);
          setItems([]);
          setTieneBorrador(false);
        }
      }
      setTimeout(() => {
        document.getElementById('select-tipo-salida')?.focus();
      }, 50);
    }
  }, [isOpen, salidaRaiz, datosIniciales]);

  // Auto-guardado en tiempo real en localStorage (Regla: "Que se guarde todo")
  useEffect(() => {
    if (!isOpen || salidaRaiz || datosIniciales) return;
    if (customerId || items.length > 0 || direccion || observaciones || trabajadoresSeleccionados.length > 0) {
      const dataBorrador = {
        tipo,
        customerId,
        bienId,
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
    }
  }, [isOpen, tipo, customerId, bienId, direccion, ubicacion, fecha, observaciones, trabajadoresSeleccionados, items, salidaRaiz, datosIniciales]);

  const limpiarBorrador = () => {
    try {
      localStorage.removeItem(CLAVE_BORRADOR_SALIDA);
    } catch {}
    setTipo('SERVICIO');
    setCustomerId('');
    setBienId('');
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

  const cargarCatalogos = async () => {
    try {
      const [resCli, resTrab, resProd] = await Promise.all([
        supabase.from('customers').select('id, name, dni, ruc, direccion').eq('activo', true).order('name'),
        supabase.from('trabajadores').select('id, nombre, cargo').eq('estado', 'ACTIVO').order('nombre'),
        supabase.from('products').select('id, name, code, unit, quantity, cost_price').order('name'),
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
      }
      _cacheCatalogosServic.timestamp = Date.now();
    } catch (err) {
      console.error('Error cargando catálogos:', err);
    }
  };

  // Cargar bienes cuando cambia el cliente
  useEffect(() => {
    if (customerId) {
      supabase
        .from('bienes_cliente')
        .select('*')
        .eq('customer_id', customerId)
        .eq('estado', 'ACTIVO')
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
      setItems((prev) => [
        ...prev,
        {
          product_id: null,
          descripcion: descExterno.trim().toUpperCase(),
          unidad: unidadExterno.trim().toUpperCase() || 'UNID',
          cantidad: c,
          costo_unitario: parseFloat(costoExterno) || 0,
          es_externo: true,
        },
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
        // Si ya existe el producto en la lista, sumar cantidad (tipo POS / SUNAT)
        const idxExistente = prev.findIndex((it) => it.product_id === prodAAgregar.id);
        if (idxExistente !== -1) {
          const actualizados = [...prev];
          const actual = actualizados[idxExistente];
          actualizados[idxExistente] = {
            ...actual,
            cantidad: Number((actual.cantidad + c).toFixed(4)),
          };
          return actualizados;
        } else {
          return [
            ...prev,
            {
              product_id: prodAAgregar.id,
              descripcion: prodAAgregar.name,
              unidad: prodAAgregar.unit || 'UNID',
              cantidad: c,
              costo_unitario: Number(prodAAgregar.cost_price || 0),
              es_externo: false,
            },
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
      document.getElementById('select-cliente-salida')?.focus();
      return;
    }
    if (trabajadoresSeleccionados.length === 0) {
      avisar('Asigna al menos un trabajador a la salida');
      return;
    }
    if (items.length === 0) {
      avisar('Agrega al menos un material o repuesto a la salida');
      inputBuscarRef.current?.focus();
      return;
    }

    setGuardando(true);
    try {
      const payload = {
        tipo,
        customer_id: Number(customerId),
        bien_id: bienId ? Number(bienId) : null,
        direccion: direccion.trim(),
        ubicacion: ubicacion.trim(),
        fecha,
        observaciones: observaciones.trim(),
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
  }, [isOpen, customerId, trabajadoresSeleccionados, items, tipo, bienId, direccion, ubicacion, fecha, observaciones, salidaRaiz]);

  if (!isOpen) return null;

  const totalUnidades = items.reduce((acc, it) => acc + it.cantidad, 0);
  const totalCosto = items.reduce((acc, it) => acc + it.cantidad * it.costo_unitario, 0);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 font-mono">
      <div
        id="modal-nueva-salida-container"
        className="ventana-sobria bg-[var(--color-surface)] w-full max-w-5xl border-2 border-[var(--color-ink)] flex flex-col max-h-[calc(94dvh/var(--ui-zoom))] sm:max-h-[calc(90dvh/var(--ui-zoom))] overflow-hidden"
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
                Registro rápido de materiales y asignación técnica
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {tieneBorrador && !salidaRaiz && (
              <span className="hidden sm:inline-block text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 px-2 py-1 font-bold uppercase tracking-wider">
                ✓ Borrador auto-guardado
              </span>
            )}
            <button
              id="btn-cerrar-modal-nueva-salida"
              onClick={onClose}
              className="ventana-cerrar"
              title="Cerrar (Escape)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Contenido con Scroll */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 font-mono text-xs space-y-4">
          {/* Fila 1: Tipo y Cliente */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                className="w-full p-2 border-2 border-[var(--color-border)] focus:border-[var(--color-ink)] outline-none font-bold uppercase bg-[var(--color-surface)] rounded-none"
                required
              >
                <option value="">-- SELECCIONAR CLIENTE --</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.dni || c.ruc ? `(${c.dni || c.ruc})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-black uppercase text-[var(--color-ink)] mb-1">
                Lo que se atiende
              </label>
              <select
                id="select-bien-salida"
                value={bienId}
                onChange={(e) => setBienId(e.target.value ? Number(e.target.value) : '')}
                onKeyDown={(e) => handleKeyDownForm(e, 'select-bien-salida')}
                disabled={!customerId}
                className="w-full p-2 border-2 border-[var(--color-border)] focus:border-[var(--color-ink)] outline-none font-bold uppercase bg-[var(--color-surface)] disabled:opacity-50 rounded-none"
              >
                <option value="">-- GENERAL / NO ESPECÍFICO --</option>
                {bienes.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nombre} ({b.tipo})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fila 2: Dirección y Fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
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
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center">
                <div className="sm:col-span-2">
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
              /* Renglón Rápido tipo SUNAT / Pistola de Códigos */
              <div className="space-y-2">
                <div className="flex gap-2 items-center">
                  <div className="relative flex-1">
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
                      placeholder="Escribe nombre o escanea código de barras del producto..."
                      className="w-full p-2.5 border-2 border-[var(--color-border)] focus:border-[var(--color-ink)] uppercase font-bold pr-8 outline-none rounded-none bg-[var(--color-surface)]"
                      autoComplete="off"
                    />
                    <Search size={16} className="absolute right-2.5 top-3 text-[var(--color-muted)]" />
                  </div>

                  <div className="w-28">
                    <input
                      ref={inputCantRef}
                      id="input-cant-item-salida"
                      type="number"
                      step="any"
                      min="0.001"
                      value={cantItem}
                      onChange={(e) => setCantItem(e.target.value)}
                      onKeyDown={handleKeyDownCant}
                      className="w-full p-2.5 border-2 border-[var(--color-border)] focus:border-[var(--color-ink)] font-black text-center outline-none rounded-none bg-[var(--color-surface)]"
                      placeholder="Cant."
                    />
                  </div>

                  <button
                    id="btn-agregar-material-salida"
                    type="button"
                    onClick={handleAgregarItem}
                    className="px-4 py-2.5 bg-[var(--color-ink)] text-white font-black uppercase flex items-center gap-1.5 hover:bg-[var(--color-accent)] hover:text-[var(--color-ink)] cursor-pointer rounded-none shrink-0"
                  >
                    <Plus size={16} /> Agregar (Enter)
                  </button>
                </div>

                {/* Lista flotante de sugerencias con flechas teclado */}
                {prodsFiltrados.length > 0 && !prodSeleccionado && (
                  <div className="border-2 border-[var(--color-ink)] bg-[var(--color-surface)] shadow-[4px_4px_0_0_var(--color-ink)] divide-y divide-[var(--color-border)] max-h-48 overflow-y-auto">
                    {prodsFiltrados.map((p, idx) => {
                      const activo = idx === indiceSugerencia;
                      return (
                        <div
                          key={p.id}
                          onClick={() => seleccionarProducto(p)}
                          className={`p-2 cursor-pointer flex justify-between items-center transition-colors ${
                            activo
                              ? 'bg-[var(--color-accent)] text-[var(--color-ink)] font-black'
                              : 'hover:bg-[var(--color-bg)]'
                          }`}
                        >
                          <div>
                            <p className="font-bold uppercase flex items-center gap-2">
                              <span>{p.name}</span>
                              {p.code && (
                                <span className="text-[10px] px-1 py-0.5 bg-black/10 border border-black/20">
                                  {p.code}
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-[var(--color-muted)]">
                              Unidad: {p.unit || 'UNID'} · Costo: S/ {Number(p.cost_price || 0).toFixed(2)}
                            </p>
                          </div>
                          <div className="text-right">
                            <span
                              className={`font-black text-xs ${
                                p.quantity <= 0 ? 'text-[var(--color-error)]' : 'text-[var(--color-ink)]'
                              }`}
                            >
                              Stock: {p.quantity} {p.unit}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {prodSeleccionado && (
                  <div className="p-1.5 bg-[var(--color-accent-bg)] border border-[var(--color-accent)] flex justify-between items-center text-[11px] font-bold">
                    <span className="text-[var(--color-ink)]">
                      ✓ Seleccionado: <strong className="uppercase">{prodSeleccionado.name}</strong> (Stock: {prodSeleccionado.quantity} {prodSeleccionado.unit})
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
                <table data-tabla-campos className="w-full text-left text-[11px] font-mono">
                  <thead className="bg-[var(--color-ink)] text-white font-black uppercase">
                    <tr>
                      <th className="p-2 w-10 text-center">#</th>
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
                        <td className="p-2 font-bold uppercase">
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
                      <td colSpan={3} className="p-2 text-[var(--color-ink)] uppercase">
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

        {/* Footer */}
        <div className="bg-[var(--color-bg)] p-3 sm:p-4 border-t-2 border-[var(--color-ink)] flex flex-wrap justify-between items-center gap-2 shrink-0">
          <span className="text-[11px] font-bold text-[var(--color-muted)]">
            {items.length} material(es) listo(s) · {totalUnidades} unidad(es) en total
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border-2 border-[var(--color-border)] font-black uppercase hover:bg-black/5 cursor-pointer rounded-none"
            >
              Cancelar (Esc)
            </button>
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

