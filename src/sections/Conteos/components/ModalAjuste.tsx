// src/sections/Conteos/components/ModalAjuste.tsx
// NUEVO AJUSTE (sección Conteos): una sola ventana para todo lo que cambia el stock fuera de una venta o compra.
// Se elige el producto y luego "¿Qué pasó?":
//  - MERMA (antes "Salió del stock": se dañó, venció, se perdió o se usó): cuántos salieron y de qué lote. Se guarda
//    igual que la antigua "Registrar merma" (waste + lote + kardex), así funciona igual sin internet.
//    Los productos de consumo (bolsas, servicios) no tienen stock: se anota lo gastado en soles.
//  - CONTEO (antes "Conté lo que hay"): el cajero cuenta A CIEGAS (nunca ve cuánto dice el sistema ni los lotes).
//    Al escribir lo que hay, el sistema muestra si falta o sobra y lo aplica con fn_registrar_conteo
//    (servidor/sql/seguridad-sesion.sql). Quien tiene Conteos completo ve el desplegable de lotes y puede elegir a
//    cuál va la diferencia (p_batch_id); "Automático" = como siempre (falta → lote más antiguo, sobra → el último).
// En los dos casos el motivo y la justificación son obligatorios; quién, cuándo y el turno quedan anotados.
// Quien solo tiene "Conteos: solo contar" ve únicamente CONTEO. Sin internet se imita y se sube después
// (src/utils/sinInternet.ts).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ClipboardCheck, Search, X } from 'lucide-react';
import { supabase } from '../../../db/supabase';
import type { Product } from '../../Inventario/types';
import { coincideBusqueda } from '../../../utils/busqueda';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { avisar } from '../../../utils/dialogos';
import { formatearCantidad } from '../../../utils/formato';
import { esDecimal } from '../../../utils/unidades';
import { MOTIVOS_FALTA, MOTIVOS_SALIDA, MOTIVOS_SOBRA } from '../motivos';
import { CuerpoVentana, CajaLista, FilaLista, LineaDato, Etiqueta, DatoFila, claseBotonBarra, claseBotonPrincipal } from '../../../components/ListaVentana';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  puedeSalida: boolean;  // "Conteos: registrar salidas y ver todo" (almacen_registrar_mermas)
  puedeContar: boolean;  // "Conteos: solo contar" (inventario_contar)
  onGuardado?: () => void; // para refrescar la lista y el stock de la pantalla
}

type Modo = 'SALIDA' | 'CONTEO';
const MODOS: { modo: Modo; titulo: string; ayuda: string }[] = [
  // Nombres claros para el cajero (pedido del dueño 28/10/2026): antes "Salió del stock" y "Conté lo que hay"
  { modo: 'SALIDA', titulo: 'Merma', ayuda: 'Se dañó, venció, se perdió o se usó' },
  { modo: 'CONTEO', titulo: 'Conteo', ayuda: 'Cuento lo que hay y el sistema ve si falta o sobra' },
];

interface Lote { id: number | string; quantity: number; cost_unit: number; created_at: string; expiration_date?: string | null }
interface Hecho { producto: string; unidad: string; modo: Modo; cantidad: number; diferencia: number; motivo: string; hora: string; consumo: boolean }

const redondear = (n: number) => Math.round(n * 1000) / 1000;
const enfocar = (id: string) => setTimeout(() => document.getElementById(id)?.focus(), 30);
const fechaCorta = (f?: string | null) => (f ? new Date(f.length === 10 ? `${f}T12:00:00` : f).toLocaleDateString('es-PE') : '');
const horaCorta = (f?: string | null) => (f ? new Date(f).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '');

// En CONTEO, la opción "Automático": la diferencia va como siempre (falta → lote más antiguo, sobra → el último)
const LoteAutomatico: React.FC<{ marca?: string }> = ({ marca = '' }) => (
  <span className="flex flex-1 flex-wrap items-center justify-between gap-x-4 gap-y-1 min-w-0">
    <span className="text-xs font-black uppercase">{marca}Automático</span>
    <span className="text-[11px] font-black">Falta → lote más antiguo · sobra → el último</span>
  </span>
);

// Un lote en el desplegable: cuándo entró (día y hora), cuándo vence, cuánto queda y su costo
const DatosLote: React.FC<{ l: Lote; unidad: string; marca?: string }> = ({ l, unidad, marca = '' }) => (
  <span className="flex flex-1 flex-wrap items-center justify-between gap-x-4 gap-y-1 min-w-0">
    <span className="text-xs font-black uppercase">{marca}Lote del {fechaCorta(l.created_at)} {horaCorta(l.created_at)}{l.expiration_date ? ` · vence ${fechaCorta(l.expiration_date)}` : ''}</span>
    <span className="text-[11px] font-black">Quedan {formatearCantidad(l.quantity, unidad)} {unidad} · S/ {Number(l.cost_unit || 0).toFixed(2)} c/u</span>
  </span>
);
const esConsumo = (p: Product | null) => String(p?.unit || '').toUpperCase() === 'CONSUMO';

export const ModalAjuste: React.FC<Props> = ({ isOpen, onClose, products, puedeSalida, puedeContar, onGuardado }) => {
  const [busqueda, setBusqueda] = useState('');
  // La lista aparece desde la 1ra letra (o con ↓ en vacío): al abrir no tapa el resto de la ventana
  const [abierta, setAbierta] = useState(false);
  const [producto, setProducto] = useState<Product | null>(null);
  const [modo, setModo] = useState<Modo>('SALIDA');
  // Salió del stock
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [cargandoLotes, setCargandoLotes] = useState(false);
  const [lote, setLote] = useState<Lote | null>(null);
  const [lotesAbierto, setLotesAbierto] = useState(false);
  const [cantidad, setCantidad] = useState('');
  // Conté lo que hay
  const [contado, setContado] = useState('');
  const [diferencia, setDiferencia] = useState<number | null>(null); // null = todavía no se calculó
  // Los dos
  const [motivo, setMotivo] = useState('');
  const [justificacion, setJustificacion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [hechos, setHechos] = useState<Hecho[]>([]);
  const [ultimo, setUltimo] = useState('');
  const [calculandoEstado, setCalculandoEstado] = useState(false);
  const calculando = useRef(false);

  useCerrarConEscape(isOpen, onClose);

  // Lo que puede hacer con cada producto: los de consumo no tienen stock, no se cuentan
  const modosDe = (p: Product | null): Modo[] => {
    const lista: Modo[] = [];
    if (puedeSalida) lista.push('SALIDA');
    if (puedeContar && !esConsumo(p)) lista.push('CONTEO');
    return lista;
  };
  const elegibles = useMemo(() => products.filter((p) => modosDe(p).length > 0), [products, puedeSalida, puedeContar]); // eslint-disable-line react-hooks/exhaustive-deps
  const filtrados = useMemo(() => {
    const texto = busqueda.trim();
    if (!texto) return elegibles;
    // El lector de código de barras: el código exacto va primero
    const exacto = elegibles.filter((p) => [p.code, p.barcode].some((c) => c && String(c).toUpperCase() === texto.toUpperCase()));
    const resto = elegibles.filter((p) => !exacto.includes(p) && coincideBusqueda([p.name, p.code, p.barcode, p.marca, p.modelo, p.medida, p.laboratorio, p.ubicacion], texto));
    return [...exacto, ...resto];
  }, [elegibles, busqueda]);

  // Lotes con stock del producto. MERMA: de dónde sale (se propone el más antiguo). CONTEO: solo para quien tiene
  // Conteos completo, a qué lote va la diferencia (empieza en "Automático" = null). El cajero cuenta a ciegas.
  useEffect(() => {
    setLotesAbierto(false);
    const usaLotes = modo === 'SALIDA' || puedeSalida;
    if (!producto || !usaLotes || esConsumo(producto)) { setLotes([]); setLote(null); return; }
    let vigente = true;
    setCargandoLotes(true);
    (async () => {
      const { data } = await supabase.from('batches').select('*').eq('product_id', producto.id).order('created_at', { ascending: true });
      if (!vigente) return;
      const conStock = ((data || []) as Lote[]).filter((l) => Number(l.quantity) > 0);
      setLotes(conStock);
      setLote(modo === 'SALIDA' ? conStock[0] || null : null);
      setCargandoLotes(false);
    })();
    return () => { vigente = false; };
  }, [producto, modo, puedeSalida]);

  // Al terminar de cargar los lotes (salida recién elegida sin pregunta), el foco pasa al lote
  useEffectFocoLote(producto, modo, cargandoLotes, modosDe(producto).length);

  if (!isOpen) return null;

  const modos = modosDe(producto);
  const unidad = producto?.unit || 'UND';
  const consumo = esConsumo(producto);
  const motivos = modo === 'SALIDA' ? MOTIVOS_SALIDA : diferencia !== null && diferencia < 0 ? MOTIVOS_FALTA : MOTIVOS_SOBRA;
  // Hay que pedir motivo y justificación: en la salida siempre; en el conteo, solo si falta o sobra
  const pideMotivo = producto && (modo === 'SALIDA' || (diferencia !== null && diferencia !== 0));
  // ¿Se muestra el desplegable de lotes? MERMA siempre (salvo consumo); CONTEO solo con Conteos completo
  const veLotes = !!producto && !consumo && lotes.length > 0 && (modo === 'SALIDA' || puedeSalida);
  const conAutomatico = modo === 'CONTEO';
  const opcionesLote: (Lote | null)[] = conAutomatico ? [null, ...lotes] : lotes;
  const campoDespuesDelLote = modo === 'SALIDA' ? 'input-cantidad-ajuste' : 'input-contado';

  const limpiarCampos = () => {
    setCantidad(''); setContado(''); setDiferencia(null); setMotivo(''); setJustificacion('');
  };

  const reiniciar = () => {
    setProducto(null); setBusqueda(''); setAbierta(false); limpiarCampos();
    enfocar('input-buscar-ajuste');
  };

  // Primer campo de cada opción
  const primerCampo = (m: Modo) => (m === 'CONTEO'
    ? (puedeSalida && !consumo && lotes.length ? 'lote-ajuste-elegido' : 'input-contado')
    : consumo || !lotes.length ? 'input-cantidad-ajuste' : 'lote-ajuste-elegido');
  const irAlPrimerCampo = (m: Modo) => setTimeout(() => (document.getElementById(primerCampo(m)) || document.getElementById('input-cantidad-ajuste'))?.focus(), 30);

  const elegir = (p: Product) => {
    const posibles = modosDe(p);
    setProducto(p); setBusqueda(''); setAbierta(false); limpiarCampos();
    setModo(posibles.includes(modo) ? modo : posibles[0]);
    // Con dos opciones se pregunta "¿Qué pasó?"; con una sola se va directo a su primer campo
    if (posibles.length > 1) enfocar(`modo-ajuste-${posibles.includes(modo) ? modo : posibles[0]}`);
    else enfocar(posibles[0] === 'CONTEO' ? 'input-contado' : esConsumo(p) ? 'input-cantidad-ajuste' : 'btn-cambiar-producto-ajuste');
  };

  // Desplegable de lotes: al abrir, el selector va al lote elegido; al elegir, se cierra y pasa a la cantidad
  const abrirLotes = () => {
    setLotesAbierto(true);
    const i = Math.max(0, opcionesLote.findIndex((l) => (l?.id ?? null) === (lote?.id ?? null)));
    enfocar(`lote-ajuste-op-${i}`);
  };
  const elegirLote = (l: Lote | null) => {
    setLote(l); setLotesAbierto(false);
    enfocar(campoDespuesDelLote);
  };

  const cambiarModo = (m: Modo) => {
    if (m === modo) return;
    setModo(m); limpiarCampos();
  };

  const anotar = (h: Omit<Hecho, 'hora'>) => {
    setHechos((lista) => [{ ...h, hora: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) }, ...lista]);
  };

  const validarMotivo = async () => {
    if (!motivo) { await avisar(modo === 'SALIDA' ? 'Elige el motivo de la salida.' : 'Elige el motivo de la diferencia.'); enfocar('motivo-ajuste-0'); return false; }
    if (justificacion.trim().length < 3) { await avisar(modo === 'SALIDA' ? 'Escribe la justificación: qué pasó con lo que salió.' : 'Escribe la justificación: qué pasó con la diferencia.'); enfocar('input-justificacion-ajuste'); return false; }
    return true;
  };

  // ---------- SALIÓ DEL STOCK ----------
  const revisarCantidad = async () => {
    const cant = Number(cantidad);
    if (cantidad.trim() === '' || Number.isNaN(cant) || cant <= 0) {
      await avisar(consumo ? 'Escribe cuánto se gastó en soles (más de 0).' : 'Escribe cuántos salieron (más de 0).');
      enfocar('input-cantidad-ajuste'); return false;
    }
    if (consumo) return true;
    if (!lote) { await avisar('Este producto no tiene lotes con stock: no hay de dónde sacar. Si en el estante hay, usa "Conteo".'); enfocar('input-cantidad-ajuste'); return false; }
    if (!esDecimal(producto) && !Number.isInteger(cant)) { await avisar(`Este producto va por ${unidad}: escribe un número entero.`); enfocar('input-cantidad-ajuste'); return false; }
    if (cant > Number(lote.quantity)) { await avisar(`Ese lote solo tiene ${formatearCantidad(lote.quantity, unidad)} ${unidad}.`); enfocar('input-cantidad-ajuste'); return false; }
    return true;
  };

  const guardarSalida = async () => {
    if (!producto || guardando) return;
    if (!(await revisarCantidad()) || !(await validarMotivo())) return;
    setGuardando(true);
    const cant = Number(cantidad);
    try {
      const costo = consumo ? 0 : Number(lote?.cost_unit) || 0;
      const total = consumo ? cant : redondear(costo * cant);
      const stock = Number(producto.quantity ?? 0); // solo informativo (previous/new_quantity)
      // El stock del producto lo baja el servidor al guardar la salida (trigger tr_waste_reduce; sin internet lo
      // imita sinInternet.ts): no se manda "stock = X", que pisaría una venta hecha al mismo tiempo
      const { error } = await supabase.from('waste').insert([{
        batch_id: lote?.id || null,
        product_id: producto.id,
        product_name: producto.name,
        quantity: consumo ? 0 : -cant, // consumo: solo es gasto, no baja stock
        cost_unit: costo,
        total_loss: total,
        reason: motivo,
        notes: justificacion.trim(),
        user: 'Sistema', // el servidor pone el nombre de quien lo hizo (trg_autor_merma)
        previous_quantity: stock,
        new_quantity: stock - (consumo ? 0 : cant),
        is_synced: '1',
      }]);
      if (error) throw error;
      if (!consumo && lote) {
        const { error: e1 } = await supabase.from('batches').update({ quantity: Number(lote.quantity) - cant }).eq('id', lote.id);
        if (e1) throw e1;
        const { error: e3 } = await supabase.from('inventory_movements').insert([{
          batch_id: lote.id,
          product_id: producto.id,
          product_name: producto.name,
          change_amount: -cant,
          previous_quantity: Number(lote.quantity),
          new_quantity: Number(lote.quantity) - cant,
          operation_type: 'MERMA',
          reason: motivo,
          notes: justificacion.trim(),
          user: 'Sistema',
          is_synced: 0,
        }]);
        if (e3) throw e3;
      }
      anotar({ producto: producto.name, unidad, modo: 'SALIDA', cantidad: cant, diferencia: consumo ? 0 : -cant, motivo, consumo });
      setUltimo(consumo ? `✔ ${producto.name}: gasto de S/ ${cant.toFixed(2)} guardado (${motivo}).` : `✔ ${producto.name}: merma guardada (${motivo}).`);
      onGuardado?.();
      reiniciar();
    } catch (e) {
      await avisar(`No se pudo guardar la salida: ${(e as Error).message}`);
      enfocar('btn-guardar-ajuste');
    } finally {
      setGuardando(false);
    }
  };

  // ---------- CONTÉ LO QUE HAY ----------
  const guardarConteo = async (dif: number) => {
    if (!producto || guardando) return;
    if (dif !== 0 && !(await validarMotivo())) return;
    setGuardando(true);
    try {
      const { data, error } = await supabase.rpc('fn_registrar_conteo', {
        p_product_id: Number(producto.id),
        p_contado: Number(contado),
        p_motivo: dif !== 0 ? motivo : null,
        p_justificacion: dif !== 0 ? justificacion.trim() : null,
        // Se aplica la diferencia que el empleado VIO y justificó (no se recalcula con otro stock)
        p_diferencia: dif,
        p_cuando: new Date().toISOString(),
        // Lote elegido por quien tiene Conteos completo (sin lote: automático, como siempre)
        ...(puedeSalida && lote ? { p_batch_id: Number(lote.id) } : {}),
      });
      if (error) throw error;
      const real = Number((data as { diferencia?: number } | null)?.diferencia ?? dif);
      anotar({ producto: producto.name, unidad, modo: 'CONTEO', cantidad: Number(contado), diferencia: real, motivo: real !== 0 ? motivo : '', consumo: false });
      setUltimo(real === 0 ? `✔ ${producto.name}: cuadra.` : `✔ ${producto.name}: ${real < 0 ? 'faltante guardado como merma' : 'sobrante guardado'} (${motivo}).`);
      onGuardado?.();
      reiniciar();
    } catch (e) {
      await avisar(`No se pudo guardar el conteo: ${(e as Error).message}`);
      enfocar(dif !== 0 ? 'btn-guardar-ajuste' : 'input-contado');
    } finally {
      setGuardando(false);
    }
  };

  // Enter en "¿Cuántos hay?": recién ahí se mira el stock (el más reciente) y se calcula la diferencia
  const calcular = async () => {
    if (!producto || calculando.current) return;
    if (contado.trim() === '' || Number.isNaN(Number(contado)) || Number(contado) < 0) { await avisar('Escribe cuánto contaste (0 o más).'); enfocar('input-contado'); return; }
    calculando.current = true;
    setCalculandoEstado(true);
    try {
      // Con el id: sin internet esa copia se actualiza con cada conteo (sinInternet.ts → cambiarEnCopias busca por id)
      const { data } = await supabase.from('products').select('id, quantity').eq('id', producto.id);
      const sistema = Number(data?.[0]?.quantity ?? producto.quantity ?? 0);
      const dif = redondear(Number(contado) - sistema);
      if (dif === 0) { await guardarConteo(0); return; }
      setDiferencia(dif);
      setMotivo('');
      enfocar('motivo-ajuste-0');
    } finally {
      calculando.current = false;
      setCalculandoEstado(false);
    }
  };

  const recontar = () => {
    setDiferencia(null); setMotivo(''); setJustificacion('');
    setTimeout(() => { const i = document.getElementById('input-contado') as HTMLInputElement | null; i?.focus(); i?.select(); }, 30);
  };

  const guardar = () => (modo === 'SALIDA' ? guardarSalida() : guardarConteo(diferencia ?? 0));

  // Campo de arriba del motivo (↑ desde los motivos)
  const campoAntesDelMotivo = modo === 'SALIDA' ? 'input-cantidad-ajuste' : 'input-contado';
  // Campo de arriba de la cantidad (↑ desde la cantidad o el conteo)
  const campoAntesDeCantidad = () => {
    if (veLotes) return 'lote-ajuste-elegido';
    if (modos.length > 1) return `modo-ajuste-${modo}`;
    return 'btn-cambiar-producto-ajuste';
  };

  const items = () => Array.from(document.querySelectorAll('[data-ajuste-prod-item="true"]')) as HTMLElement[];

  // Desplegable de lotes (MERMA: de qué lote sale; CONTEO con Conteos completo: a qué lote va, con "Automático").
  // Cerrado muestra el elegido; Enter lo abre, ↑ ↓ recorre, Enter elige (se cierra y pasa al campo siguiente), Esc lo cierra.
  const selectorLote = (titulo: string) => (
    <div>
      <p className="text-[10px] font-black text-[var(--color-ink)] uppercase tracking-widest mb-2">{titulo}</p>
      {cargandoLotes ? (
        <p className="text-[11px] font-bold text-[var(--color-muted)]">Cargando lotes...</p>
      ) : !lotes.length ? (
        modo === 'SALIDA' ? <p id="ajuste-sin-lotes" className="text-[11px] font-black text-[var(--color-danger)] uppercase">Este producto no tiene lotes con stock.</p> : null
      ) : (
        <div className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setLotesAbierto(false); }}>
          <button
            id="lote-ajuste-elegido"
            type="button"
            aria-haspopup="listbox"
            aria-expanded={lotesAbierto}
            onClick={() => (lotesAbierto ? setLotesAbierto(false) : abrirLotes())}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirLotes(); }
              else if (e.key === 'ArrowDown') { e.preventDefault(); document.getElementById(campoDespuesDelLote)?.focus(); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById(modos.length > 1 ? `modo-ajuste-${modo}` : 'btn-cambiar-producto-ajuste')?.focus(); }
            }}
            className="w-full flex items-center justify-between gap-3 p-3 border-2 border-[var(--color-ink)] bg-white text-[var(--color-ink)] text-left cursor-pointer outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[var(--color-ink)]"
          >
            {lote ? <DatosLote l={lote} unidad={unidad} /> : <LoteAutomatico />}
            <ChevronDown size={16} className={`shrink-0 transition-transform ${lotesAbierto ? 'rotate-180' : ''}`} />
          </button>
          {lotesAbierto && (
            <div role="listbox" aria-label="Lotes" className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-[var(--color-ink)] shadow-[4px_4px_0_0_var(--color-ink)] z-50 max-h-56 overflow-y-auto">
              {opcionesLote.map((l, i) => {
                const elegido = (lote?.id ?? null) === (l?.id ?? null);
                return (
                  <button
                    key={l?.id ?? 'auto'}
                    id={`lote-ajuste-op-${i}`}
                    type="button"
                    role="option"
                    aria-selected={elegido}
                    data-lote-ajuste="true"
                    onClick={() => elegirLote(l)}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowDown') { e.preventDefault(); document.getElementById(`lote-ajuste-op-${Math.min(i + 1, opcionesLote.length - 1)}`)?.focus(); }
                      else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        if (i > 0) document.getElementById(`lote-ajuste-op-${i - 1}`)?.focus();
                        else { setLotesAbierto(false); document.getElementById('lote-ajuste-elegido')?.focus(); }
                      } else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); elegirLote(l); }
                      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setLotesAbierto(false); document.getElementById('lote-ajuste-elegido')?.focus(); }
                    }}
                    className={`w-full flex items-center justify-between gap-3 p-3 border-b border-[var(--color-border)] text-left cursor-pointer outline-none hover:bg-[var(--color-ink)] hover:text-white focus:bg-[var(--color-ink)] focus:text-white group ${elegido ? 'bg-[var(--color-bg)]' : ''}`}
                  >
                    {l ? <DatosLote l={l} unidad={unidad} marca={elegido ? '● ' : '○ '} /> : <LoteAutomatico marca={elegido ? '● ' : '○ '} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
  const n = modos.length > 1 ? 3 : 2; // numeración de los pasos: con "¿Qué pasó?" hay un paso más

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 font-mono">
      <div role="dialog" aria-label="Nuevo ajuste" className="bg-[var(--color-surface)] w-full max-w-3xl border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] flex flex-col h-[calc(90dvh/var(--ui-zoom))]">
        {/* CABECERA */}
        <div className="bg-[var(--color-ink)] text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <ClipboardCheck size={24} className="text-[var(--color-warning)]" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-[var(--color-warning)]">Nuevo ajuste</h2>
              <p className="text-[9px] font-bold opacity-80 uppercase tracking-widest">
                {puedeSalida ? 'Lo que salió del stock o lo que contaste en el estante' : 'Conteo a ciegas: escribe lo que hay en el estante'}
              </p>
            </div>
          </div>
          <button
            id="btn-cerrar-ajuste"
            onClick={onClose}
            onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); document.getElementById(producto ? 'btn-cambiar-producto-ajuste' : 'input-buscar-ajuste')?.focus(); } }}
            className="hover:text-[var(--color-danger)] focus:text-[var(--color-danger)] focus:outline-none focus:ring-2 focus:ring-red-400 focus:bg-white/20 p-1.5 transition-colors cursor-pointer rounded-none"
            title="Cerrar ventana (Escape)"
          >
            <X size={20} />
          </button>
        </div>

        <CuerpoVentana>
          <div className="border-2 border-[var(--color-border)] bg-white p-3 sm:p-4 flex flex-col gap-4 shrink-0">
            {/* 1. PRODUCTO — si el selector sale del buscador y de su lista (ej. ↑ a la X), la lista se cierra */}
            <div className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setAbierta(false); }}>
              <label className="text-[10px] font-black text-[var(--color-ink)] uppercase tracking-widest flex items-center gap-2 mb-2">
                <Search size={14} /> 1. Producto
              </label>
              {producto ? (
                <div className="flex items-center justify-between border-2 border-[var(--color-ink)] p-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-[var(--color-muted)] uppercase">{producto.code} · {producto.category}</p>
                    <p id="ajuste-producto-elegido" className="font-black text-[var(--color-ink)] uppercase truncate">{producto.name}</p>
                  </div>
                  <button
                    id="btn-cambiar-producto-ajuste"
                    type="button"
                    onClick={reiniciar}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById('btn-cerrar-ajuste')?.focus(); }
                      else if (e.key === 'ArrowDown') { e.preventDefault(); if (modos.length > 1) document.getElementById(`modo-ajuste-${modo}`)?.focus(); else irAlPrimerCampo(modo); }
                    }}
                    className="p-2 border-2 border-transparent text-[var(--color-danger)] hover:border-[var(--color-danger)] focus:bg-[var(--color-danger)] focus:text-white focus:outline-none cursor-pointer"
                    title="Cambiar producto (Enter)"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <input
                    id="input-buscar-ajuste"
                    type="text"
                    autoFocus
                    autoComplete="off"
                    spellCheck={false}
                    data-lpignore="true"
                    data-form-type="other"
                    placeholder="ESCANEA O ESCRIBE CÓDIGO / NOMBRE..."
                    value={busqueda}
                    onChange={(e) => { setBusqueda(e.target.value); setAbierta(e.target.value.trim() !== ''); }}
                    onFocus={() => setAbierta(busqueda.trim() !== '')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); if (filtrados.length) elegir(filtrados[0]); }
                      else if (e.key === 'ArrowDown') { e.preventDefault(); setAbierta(true); setTimeout(() => items()[0]?.focus(), 30); }
                      else if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById('btn-cerrar-ajuste')?.focus(); }
                    }}
                    className="w-full bg-white border-2 border-[var(--color-border)] p-3 text-xs font-black text-[var(--color-ink)] uppercase outline-none focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)]"
                  />
                  {abierta && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-[var(--color-ink)] shadow-[4px_4px_0_0_var(--color-ink)] z-50 max-h-56 overflow-y-auto">
                      {filtrados.length ? filtrados.slice(0, 50).map((p) => (
                        <div
                          key={p.id}
                          role="option"
                          tabIndex={0}
                          data-ajuste-prod-item="true"
                          onClick={() => elegir(p)}
                          onKeyDown={(e) => {
                            const lista = items(); const i = lista.indexOf(e.currentTarget);
                            if (e.key === 'ArrowDown') { e.preventDefault(); lista[i + 1]?.focus(); }
                            else if (e.key === 'ArrowUp') { e.preventDefault(); (i > 0 ? lista[i - 1] : document.getElementById('input-buscar-ajuste'))?.focus(); }
                            else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); elegir(p); }
                          }}
                          className="flex flex-col p-3 border-b border-[var(--color-border)] cursor-pointer outline-none hover:bg-[var(--color-ink)] hover:text-white focus:bg-[var(--color-ink)] focus:text-white group"
                        >
                          {/* Sin stock: el conteo es a ciegas */}
                          <span className="text-[10px] font-bold text-[var(--color-muted)] group-hover:text-white group-focus:text-white">{p.code} | {p.category}</span>
                          <span className="text-xs font-black uppercase">{p.name}</span>
                        </div>
                      )) : (
                        <div className="p-4 text-center text-[10px] font-bold text-[var(--color-muted)] uppercase">No se encontraron productos</div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 2. ¿QUÉ PASÓ? (solo si puede las dos cosas con este producto) */}
            {producto && modos.length > 1 && (
              <div>
                <p className="text-[10px] font-black text-[var(--color-ink)] uppercase tracking-widest mb-2">2. ¿Qué pasó? (← →)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup" aria-label="¿Qué pasó?">
                  {MODOS.filter((m) => modos.includes(m.modo)).map((m, i, lista) => (
                    <button
                      key={m.modo}
                      id={`modo-ajuste-${m.modo}`}
                      type="button"
                      role="radio"
                      aria-checked={modo === m.modo}
                      onClick={() => { cambiarModo(m.modo); irAlPrimerCampo(m.modo); }}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                          e.preventDefault();
                          const otro = lista[(i + (e.key === 'ArrowRight' ? 1 : -1) + lista.length) % lista.length].modo;
                          cambiarModo(otro);
                          document.getElementById(`modo-ajuste-${otro}`)?.focus();
                        } else if (e.key === 'Enter' || e.key === 'ArrowDown') {
                          e.preventDefault();
                          irAlPrimerCampo(m.modo);
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault(); document.getElementById('btn-cambiar-producto-ajuste')?.focus();
                        }
                      }}
                      className={`text-left p-3 border-2 cursor-pointer outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-ink)] ${modo === m.modo ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-white' : 'border-[var(--color-border)] bg-white text-[var(--color-ink)] hover:border-[var(--color-ink)]'}`}
                    >
                      <span className="block text-xs font-black uppercase tracking-widest">{modo === m.modo ? '● ' : '○ '}{m.titulo}</span>
                      <span className={`block text-[11px] font-bold ${modo === m.modo ? 'text-white/80' : 'text-[var(--color-muted)]'}`}>{m.ayuda}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* SALIÓ DEL STOCK: lote y cantidad */}
            {producto && modo === 'SALIDA' && (
              <>
                {!consumo && selectorLote(`${n}. ¿De qué lote? ${lotes.length > 1 ? `(Enter: ver los ${lotes.length})` : ''}`)}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="input-cantidad-ajuste" className="text-[10px] font-black text-[var(--color-ink)] uppercase tracking-widest block">
                      {consumo ? `${n}. ¿Cuánto se gastó? (S/)` : `${n + 1}. ¿Cuántos salieron? (${unidad})`}
                    </label>
                    <span className="text-[11px] font-black text-amber-500 uppercase flex items-center gap-1">
                      <span>ENTER para continuar</span>
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      id="input-cantidad-ajuste"
                      type="number"
                      min="0"
                      step="any"
                      autoComplete="off"
                      data-lpignore="true"
                      placeholder="0"
                      value={cantidad}
                      onChange={(e) => setCantidad(e.target.value)}
                      onFocus={(e) => e.currentTarget.select()}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter' || e.key === 'ArrowDown') {
                          e.preventDefault();
                          if (await revisarCantidad()) enfocar(`motivo-ajuste-${Math.max(0, motivos.indexOf(motivo))}`);
                        } else if (e.key === 'ArrowRight') {
                          e.preventDefault();
                          document.getElementById('btn-confirmar-salida')?.focus();
                        } else if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById(campoAntesDeCantidad())?.focus(); }
                      }}
                      className="w-full sm:w-60 bg-white border-2 border-[var(--color-border)] p-3 text-sm font-black text-[var(--color-ink)] text-right outline-none focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)]"
                    />
                    <button
                      id="btn-confirmar-salida"
                      type="button"
                      onClick={async () => {
                        if (await revisarCantidad()) enfocar(`motivo-ajuste-${Math.max(0, motivos.indexOf(motivo))}`);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowLeft') { e.preventDefault(); document.getElementById('input-cantidad-ajuste')?.focus(); }
                        else if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById(campoAntesDeCantidad())?.focus(); }
                      }}
                      className="h-[46px] px-4 bg-[var(--color-ink)] text-[var(--color-bg)] hover:opacity-90 font-black text-xs uppercase flex items-center justify-center gap-2 border-2 border-[var(--color-ink)] cursor-pointer select-none shrink-0"
                    >
                      <span>Continuar</span>
                      <span className="bg-amber-400 text-black px-1.5 py-0.5 rounded font-black text-[10px] tracking-wider">
                        ENTER ↵
                      </span>
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/30 text-xs font-bold text-[var(--color-ink)]">
                    <span className="bg-amber-500 text-black font-black px-1.5 py-0.5 rounded text-[10px] uppercase shrink-0">Aviso</span>
                    <span>
                      {consumo ? 'Escribe el gasto y presiona ' : 'Escribe cuántos salieron y presiona '}
                      <kbd className="px-1.5 py-0.5 bg-[var(--color-bg-2)] border border-[var(--color-border)] rounded font-mono font-black text-[var(--color-ink)]">ENTER ↵</kbd> o el botón <strong>Continuar</strong> para elegir el motivo.
                    </span>
                  </div>
                  {consumo && <p className="text-[11px] font-bold text-[var(--color-muted)] mt-1">Es de consumo (no lleva stock): se anota como gasto.</p>}
                </div>
              </>
            )}

            {/* CONTÉ LO QUE HAY */}
            {producto && modo === 'CONTEO' && veLotes && selectorLote(`${n}. ¿A qué lote va la diferencia? (Enter: elegir)`)}
            {producto && modo === 'CONTEO' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="input-contado" className="text-[10px] font-black text-[var(--color-ink)] uppercase tracking-widest block">
                    {veLotes ? n + 1 : n}. ¿Cuántos hay? ({unidad})
                  </label>
                  {diferencia === null && (
                    <span className="text-[11px] font-black text-amber-500 uppercase flex items-center gap-1">
                      <span>ENTER para continuar</span>
                    </span>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    id="input-contado"
                    type="number"
                    min="0"
                    step="any"
                    autoComplete="off"
                    data-lpignore="true"
                    placeholder="0"
                    value={contado}
                    readOnly={diferencia !== null}
                    onChange={(e) => setContado(e.target.value)}
                    onFocus={(e) => e.currentTarget.select()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); if (diferencia === null) void calcular(); else enfocar('motivo-ajuste-0'); }
                      else if (e.key === 'ArrowRight' && diferencia === null) { e.preventDefault(); document.getElementById('btn-confirmar-contado')?.focus(); }
                      else if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById(campoAntesDeCantidad())?.focus(); }
                      else if (e.key === 'ArrowDown' && diferencia !== null) { e.preventDefault(); document.getElementById('motivo-ajuste-0')?.focus(); }
                    }}
                    className="w-full sm:w-60 bg-white border-2 border-[var(--color-border)] p-3 text-sm font-black text-[var(--color-ink)] text-right outline-none focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)] read-only:bg-[var(--color-bg)]"
                  />
                  {diferencia === null && (
                    <button
                      id="btn-confirmar-contado"
                      type="button"
                      disabled={calculandoEstado}
                      onClick={() => void calcular()}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowLeft') { e.preventDefault(); document.getElementById('input-contado')?.focus(); }
                        else if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById(campoAntesDeCantidad())?.focus(); }
                      }}
                      className="h-[46px] px-4 bg-[var(--color-ink)] text-[var(--color-bg)] hover:opacity-90 font-black text-xs uppercase flex items-center justify-center gap-2 border-2 border-[var(--color-ink)] cursor-pointer select-none shrink-0"
                    >
                      <span>{calculandoEstado ? 'Revisando...' : 'Continuar'}</span>
                      <span className="bg-amber-400 text-black px-1.5 py-0.5 rounded font-black text-[10px] tracking-wider">
                        ENTER ↵
                      </span>
                    </button>
                  )}
                </div>
                {diferencia === null && (
                  <div className="mt-2 flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/30 text-xs font-bold text-[var(--color-ink)]">
                    <span className="bg-amber-500 text-black font-black px-1.5 py-0.5 rounded text-[10px] uppercase shrink-0">Aviso</span>
                    <span>
                      Escribe la cantidad contada y presiona <kbd className="px-1.5 py-0.5 bg-[var(--color-bg-2)] border border-[var(--color-border)] rounded font-mono font-black text-[var(--color-ink)]">ENTER ↵</kbd> o el botón <strong>Continuar</strong> para revisar la diferencia.
                    </span>
                  </div>
                )}
                {diferencia !== null && (
                  <div id="ajuste-diferencia" role="status" className={`mt-3 p-3 border-2 font-black uppercase ${diferencia < 0 ? 'border-[var(--color-danger)] bg-[var(--color-danger-bg)] text-[var(--color-danger)]' : 'border-[var(--color-info)] bg-[var(--color-info-bg)] text-[var(--color-info)]'}`}>
                    {diferencia < 0 ? `Faltan ${formatearCantidad(-diferencia, unidad)} ${unidad}` : `Sobran ${formatearCantidad(diferencia, unidad)} ${unidad}`}
                    <span className="block text-[11px] font-bold normal-case">
                      {diferencia < 0
                        ? `Se guardará como merma (sale ${lote ? `del lote del ${fechaCorta(lote.created_at)}` : 'del lote más antiguo'}).`
                        : `Se guardará como sobrante (entra ${lote ? `al lote del ${fechaCorta(lote.created_at)}` : 'al último lote'}).`} Quedará tu nombre, la hora y el turno.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* MOTIVO Y JUSTIFICACIÓN (los dos casos) */}
            {pideMotivo && (
              <div className="flex flex-col gap-4 border-t-2 border-[var(--color-border)] pt-4">
                <div>
                  <p className="text-[10px] font-black text-[var(--color-ink)] uppercase tracking-widest mb-2">Motivo *</p>
                  <div className="flex flex-wrap gap-2" role="listbox" aria-label="Motivo">
                    {motivos.map((m, i) => (
                      <button
                        key={m}
                        id={`motivo-ajuste-${i}`}
                        type="button"
                        role="option"
                        aria-selected={motivo === m}
                        data-motivo-ajuste="true"
                        onClick={() => { setMotivo(m); enfocar('input-justificacion-ajuste'); }}
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowRight') { e.preventDefault(); document.getElementById(`motivo-ajuste-${(i + 1) % motivos.length}`)?.focus(); }
                          else if (e.key === 'ArrowLeft') { e.preventDefault(); document.getElementById(`motivo-ajuste-${(i - 1 + motivos.length) % motivos.length}`)?.focus(); }
                          else if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById(campoAntesDelMotivo)?.focus(); }
                          else if (e.key === 'ArrowDown') { e.preventDefault(); document.getElementById('input-justificacion-ajuste')?.focus(); }
                        }}
                        className={`${claseBotonBarra(motivo === m)} !h-[38px] !px-3`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="input-justificacion-ajuste" className="text-[10px] font-black text-[var(--color-ink)] uppercase tracking-widest mb-2 block">Justificación * (qué pasó)</label>
                  <textarea
                    id="input-justificacion-ajuste"
                    rows={2}
                    value={justificacion}
                    onChange={(e) => setJustificacion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); document.getElementById('btn-guardar-ajuste')?.focus(); }
                      else if (e.key === 'ArrowUp' && e.currentTarget.selectionStart === 0) {
                        e.preventDefault();
                        document.getElementById(`motivo-ajuste-${Math.max(0, motivos.indexOf(motivo))}`)?.focus();
                      } else if (e.key === 'ArrowDown' && e.currentTarget.selectionEnd === e.currentTarget.value.length) {
                        e.preventDefault(); document.getElementById('btn-guardar-ajuste')?.focus();
                      }
                    }}
                    placeholder={modo === 'SALIDA' ? 'EJ.: SE ROMPIERON AL BAJARLAS DEL ESTANTE' : 'EJ.: NO SE ENCONTRARON EN EL ESTANTE NI EN EL ALMACÉN'}
                    className="w-full bg-white border-2 border-[var(--color-border)] p-3 text-xs font-bold text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)] resize-none"
                  />
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3">
                  {modo === 'CONTEO' && (
                    <button
                      id="btn-recontar"
                      type="button"
                      onClick={recontar}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowRight') { e.preventDefault(); document.getElementById('btn-guardar-ajuste')?.focus(); }
                        else if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById('input-justificacion-ajuste')?.focus(); }
                      }}
                      className={claseBotonBarra(false)}
                    >
                      Volver a contar
                    </button>
                  )}
                  <button
                    id="btn-guardar-ajuste"
                    type="button"
                    aria-disabled={guardando}
                    onClick={() => void guardar()}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowLeft' && modo === 'CONTEO') { e.preventDefault(); document.getElementById('btn-recontar')?.focus(); }
                      else if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById('input-justificacion-ajuste')?.focus(); }
                    }}
                    className={claseBotonPrincipal}
                  >
                    {guardando ? 'Guardando...' : 'Guardar ajuste'}
                  </button>
                </div>
              </div>
            )}
            {ultimo && <p id="ajuste-ultimo" role="status" className="text-xs font-black text-[var(--color-accent)] uppercase">{ultimo}</p>}
          </div>

          {/* LO HECHO EN ESTA VENTANA */}
          <p className="text-[12px] font-black uppercase tracking-widest text-[var(--color-muted)] shrink-0">Hechos ahora ({hechos.length})</p>
          <CajaLista vacia={!hechos.length} mensaje="Todavía no hiciste ningún ajuste.">
            {hechos.map((h, i) => (
              <FilaLista
                key={i}
                data-ajuste-fila="true"
                titulo={h.producto}
                subtitulo={<>
                  <LineaDato>{h.modo === 'CONTEO' ? `Contó ${formatearCantidad(h.cantidad, h.unidad)} ${h.unidad}` : h.consumo ? `Gasto de S/ ${h.cantidad.toFixed(2)}` : `Salieron ${formatearCantidad(h.cantidad, h.unidad)} ${h.unidad}`} · {h.hora}</LineaDato>
                  {h.motivo && <LineaDato>Motivo: {h.motivo}</LineaDato>}
                </>}
                centro={h.modo === 'SALIDA' ? <Etiqueta tono="rojo">{h.consumo ? 'Gasto' : 'Merma'}</Etiqueta> : h.diferencia === 0 ? <Etiqueta tono="verde">Cuadra</Etiqueta> : h.diferencia < 0 ? <Etiqueta tono="rojo">Merma</Etiqueta> : <Etiqueta tono="azul">Sobrante</Etiqueta>}
                derecha={<DatoFila etiqueta="Diferencia" valor={h.consumo ? '—' : `${h.diferencia > 0 ? '+' : ''}${formatearCantidad(h.diferencia, h.unidad)} ${h.unidad}`} tono={h.diferencia < 0 ? 'rojo' : h.diferencia > 0 ? 'verde' : 'normal'} />}
              />
            ))}
          </CajaLista>
        </CuerpoVentana>
      </div>
    </div>
  );
};

// Salida elegida sin la pregunta "¿Qué pasó?" (solo puede sacar): cuando llegan los lotes, el foco pasa al lote
// (o a la cantidad si no hay lotes). Con la pregunta, el foco queda en ella hasta que el empleado elija.
function useEffectFocoLote(producto: Product | null, modo: Modo, cargando: boolean, cuantosModos: number) {
  const antes = useRef(cargando);
  useEffect(() => {
    const termino = antes.current && !cargando;
    antes.current = cargando;
    if (!termino || !producto || modo !== 'SALIDA' || cuantosModos > 1) return;
    setTimeout(() => (document.getElementById('lote-ajuste-elegido') || document.getElementById('input-cantidad-ajuste'))?.focus(), 30);
  }, [producto, modo, cargando, cuantosModos]);
}
