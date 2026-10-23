// src/sections/Inventario/components/ModalTomaInventario.tsx
// TOMA DE INVENTARIO (fase 2.2, botón "Contar" de la sección Mermas): el empleado cuenta A CIEGAS (nunca ve cuánto dice el sistema antes de
// contar). Al escribir lo que hay, el sistema muestra si falta o sobra; si hay diferencia, el motivo y la
// justificación son obligatorios. Se aplica al instante, sin límite ni aprobación: lo hace el servidor con
// fn_registrar_conteo (servidor/sql/seguridad-sesion.sql), que deja la merma o el sobrante en Mermas con quién,
// cuándo y el turno. Sin internet se imita y se sube después (src/utils/sinInternet.ts → IMITAR_RPC).
import React, { useMemo, useRef, useState } from 'react';
import { ClipboardCheck, Search, X } from 'lucide-react';
import { supabase } from '../../../db/supabase';
import type { Product } from '../types';
import { coincideBusqueda } from '../../../utils/busqueda';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { avisar } from '../../../utils/dialogos';
import { formatearCantidad } from '../../../utils/formato';
import { MOTIVOS_FALTA, MOTIVOS_SOBRA } from '../motivosConteo';
import { CuerpoVentana, CajaLista, FilaLista, LineaDato, Etiqueta, DatoFila, claseBotonBarra, claseBotonPrincipal } from '../../../components/ListaVentana';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onContado?: (productoId: string | number, contado: number) => void; // para refrescar el stock de la pantalla
}


interface Contado { producto: string; unidad: string; contado: number; diferencia: number; motivo: string; hora: string }

const redondear = (n: number) => Math.round(n * 1000) / 1000;
const enfocar = (id: string) => setTimeout(() => document.getElementById(id)?.focus(), 30);

export const ModalTomaInventario: React.FC<Props> = ({ isOpen, onClose, products, onContado }) => {
  const [busqueda, setBusqueda] = useState('');
  // La lista aparece desde la 1ra letra (o con ↓ en vacío): al abrir no tapa el resto de la ventana
  const [abierta, setAbierta] = useState(false);
  const [producto, setProducto] = useState<Product | null>(null);
  const [contado, setContado] = useState('');
  const [diferencia, setDiferencia] = useState<number | null>(null); // null = todavía no se calculó
  const [motivo, setMotivo] = useState('');
  const [justificacion, setJustificacion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [contados, setContados] = useState<Contado[]>([]);
  const [ultimo, setUltimo] = useState('');
  const calculando = useRef(false);

  useCerrarConEscape(isOpen, onClose);

  // Los de consumo (bolsas, servicios) no llevan stock: no se cuentan
  const contables = useMemo(() => products.filter((p) => String(p.unit).toUpperCase() !== 'CONSUMO'), [products]);
  const filtrados = useMemo(() => {
    const texto = busqueda.trim();
    if (!texto) return contables;
    // El lector de código de barras: el código exacto va primero
    const exacto = contables.filter((p) => [p.code, p.barcode].some((c) => c && String(c).toUpperCase() === texto.toUpperCase()));
    const resto = contables.filter((p) => !exacto.includes(p) && coincideBusqueda([p.name, p.code, p.barcode], texto));
    return [...exacto, ...resto];
  }, [contables, busqueda]);

  if (!isOpen) return null;

  const motivos = diferencia !== null && diferencia < 0 ? MOTIVOS_FALTA : MOTIVOS_SOBRA;
  const unidad = producto?.unit || 'UND';

  const reiniciar = () => {
    setProducto(null); setBusqueda(''); setContado(''); setDiferencia(null); setMotivo(''); setJustificacion('');
    setAbierta(false);
    enfocar('input-buscar-conteo');
  };

  const elegir = (p: Product) => {
    setProducto(p); setBusqueda(''); setAbierta(false); setContado(''); setDiferencia(null); setMotivo(''); setJustificacion('');
    enfocar('input-contado');
  };

  const recontar = () => {
    setDiferencia(null); setMotivo(''); setJustificacion('');
    setTimeout(() => { const i = document.getElementById('input-contado') as HTMLInputElement | null; i?.focus(); i?.select(); }, 30);
  };

  const guardar = async (dif: number) => {
    if (!producto || guardando) return;
    if (dif !== 0 && !motivo) { await avisar('Elige el motivo de la diferencia.'); enfocar(`motivo-conteo-0`); return; }
    if (dif !== 0 && justificacion.trim().length < 3) { await avisar('Escribe la justificación: qué pasó con la diferencia.'); enfocar('input-justificacion-conteo'); return; }
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
      });
      if (error) throw error;
      const real = Number((data as { diferencia?: number } | null)?.diferencia ?? dif);
      setContados((lista) => [{ producto: producto.name, unidad, contado: Number(contado), diferencia: real, motivo: real !== 0 ? motivo : '', hora: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) }, ...lista]);
      setUltimo(real === 0 ? `✔ ${producto.name}: cuadra.` : `✔ ${producto.name}: ${real < 0 ? 'faltante guardado como merma' : 'sobrante guardado'} (${motivo}).`);
      onContado?.(producto.id, Number(contado));
      reiniciar();
    } catch (e) {
      await avisar(`No se pudo guardar el conteo: ${(e as Error).message}`);
      enfocar(dif !== 0 ? 'btn-guardar-conteo' : 'input-contado');
    } finally {
      setGuardando(false);
    }
  };

  // Enter en "¿Cuántos hay?": recién ahí se mira el stock (el más reciente) y se calcula la diferencia
  const calcular = async () => {
    if (!producto || calculando.current) return;
    if (contado.trim() === '' || Number.isNaN(Number(contado)) || Number(contado) < 0) { await avisar('Escribe cuánto contaste (0 o más).'); enfocar('input-contado'); return; }
    calculando.current = true;
    try {
      // Con el id: sin internet esa copia se actualiza con cada conteo (sinInternet.ts → cambiarEnCopias busca por id)
      const { data } = await supabase.from('products').select('id, quantity').eq('id', producto.id);
      const sistema = Number(data?.[0]?.quantity ?? producto.quantity ?? 0);
      const dif = redondear(Number(contado) - sistema);
      if (dif === 0) { await guardar(0); return; }
      setDiferencia(dif);
      setMotivo('');
      enfocar('motivo-conteo-0');
    } finally {
      calculando.current = false;
    }
  };

  const items = () => Array.from(document.querySelectorAll('[data-conteo-prod-item="true"]')) as HTMLElement[];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 font-mono">
      <div role="dialog" aria-label="Toma de inventario" className="bg-[var(--color-surface)] w-full max-w-3xl border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] flex flex-col h-[calc(90dvh/var(--ui-zoom))]">
        {/* CABECERA */}
        <div className="bg-[var(--color-ink)] text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <ClipboardCheck size={24} className="text-[var(--color-warning)]" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-[var(--color-warning)]">Toma de inventario</h2>
              <p className="text-[9px] font-bold opacity-80 uppercase tracking-widest">Conteo a ciegas: escribe lo que hay en el estante</p>
            </div>
          </div>
          <button
            id="btn-cerrar-conteo"
            onClick={onClose}
            onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); document.getElementById(producto ? 'btn-cambiar-producto-conteo' : 'input-buscar-conteo')?.focus(); } }}
            className="hover:text-[var(--color-danger)] focus:text-[var(--color-danger)] focus:outline-none focus:ring-2 focus:ring-red-400 focus:bg-white/20 p-1.5 transition-colors cursor-pointer rounded-none"
            title="Cerrar ventana (Escape)"
          >
            <X size={20} />
          </button>
        </div>

        <CuerpoVentana>
          {/* CONTAR */}
          <div className="border-2 border-[var(--color-border)] bg-white p-3 sm:p-4 flex flex-col gap-4 shrink-0">
            {/* Si el selector sale del buscador y de su lista (ej. ↑ a la X), la lista se cierra */}
            <div className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setAbierta(false); }}>
              <label className="text-[10px] font-black text-[var(--color-ink)] uppercase tracking-widest flex items-center gap-2 mb-2">
                <Search size={14} /> 1. Producto
              </label>
              {producto ? (
                <div className="flex items-center justify-between border-2 border-[var(--color-ink)] p-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-[var(--color-muted)] uppercase">{producto.code} · {producto.category}</p>
                    <p id="conteo-producto-elegido" className="font-black text-[var(--color-ink)] uppercase truncate">{producto.name}</p>
                  </div>
                  <button
                    id="btn-cambiar-producto-conteo"
                    type="button"
                    onClick={reiniciar}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById('btn-cerrar-conteo')?.focus(); }
                      else if (e.key === 'ArrowDown') { e.preventDefault(); document.getElementById('input-contado')?.focus(); }
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
                    id="input-buscar-conteo"
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
                      else if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById('btn-cerrar-conteo')?.focus(); }
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
                          data-conteo-prod-item="true"
                          onClick={() => elegir(p)}
                          onKeyDown={(e) => {
                            const lista = items(); const i = lista.indexOf(e.currentTarget);
                            if (e.key === 'ArrowDown') { e.preventDefault(); lista[i + 1]?.focus(); }
                            else if (e.key === 'ArrowUp') { e.preventDefault(); (i > 0 ? lista[i - 1] : document.getElementById('input-buscar-conteo'))?.focus(); }
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

            <div>
              <label htmlFor="input-contado" className="text-[10px] font-black text-[var(--color-ink)] uppercase tracking-widest mb-2 block">
                2. ¿Cuántos hay? {producto ? `(${unidad})` : ''}
              </label>
              <input
                id="input-contado"
                type="number"
                min="0"
                step="any"
                autoComplete="off"
                data-lpignore="true"
                placeholder="0"
                value={contado}
                readOnly={!producto || diferencia !== null}
                aria-disabled={!producto}
                onChange={(e) => setContado(e.target.value)}
                onFocus={(e) => e.currentTarget.select()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); if (diferencia === null) void calcular(); else enfocar('motivo-conteo-0'); }
                  else if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById(producto ? 'btn-cambiar-producto-conteo' : 'input-buscar-conteo')?.focus(); }
                  else if (e.key === 'ArrowDown' && diferencia !== null) { e.preventDefault(); document.getElementById('motivo-conteo-0')?.focus(); }
                }}
                className="w-full sm:w-60 bg-white border-2 border-[var(--color-border)] p-3 text-sm font-black text-[var(--color-ink)] text-right outline-none focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)] read-only:bg-[var(--color-bg)]"
              />
              {producto && diferencia === null && (
                <p className="text-[11px] font-bold text-[var(--color-muted)] mt-1">Enter para revisar la diferencia.</p>
              )}
            </div>

            {diferencia !== null && producto && (
              <div className="flex flex-col gap-4 border-t-2 border-[var(--color-border)] pt-4">
                <div id="conteo-diferencia" role="status" className={`p-3 border-2 font-black uppercase ${diferencia < 0 ? 'border-[var(--color-danger)] bg-[var(--color-danger-bg)] text-[var(--color-danger)]' : 'border-[var(--color-info)] bg-[var(--color-info-bg)] text-[var(--color-info)]'}`}>
                  {diferencia < 0 ? `Faltan ${formatearCantidad(-diferencia, unidad)} ${unidad}` : `Sobran ${formatearCantidad(diferencia, unidad)} ${unidad}`}
                  <span className="block text-[11px] font-bold normal-case">
                    {diferencia < 0 ? 'Se guardará como merma (sale del lote más antiguo).' : 'Se guardará como sobrante (entra al último lote).'} Quedará tu nombre, la hora y el turno.
                  </span>
                </div>

                <div>
                  <p className="text-[10px] font-black text-[var(--color-ink)] uppercase tracking-widest mb-2">3. Motivo *</p>
                  <div className="flex flex-wrap gap-2" role="listbox" aria-label="Motivo">
                    {motivos.map((m, i) => (
                      <button
                        key={m}
                        id={`motivo-conteo-${i}`}
                        type="button"
                        role="option"
                        aria-selected={motivo === m}
                        data-motivo-conteo="true"
                        onClick={() => { setMotivo(m); enfocar('input-justificacion-conteo'); }}
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowRight') { e.preventDefault(); document.getElementById(`motivo-conteo-${(i + 1) % motivos.length}`)?.focus(); }
                          else if (e.key === 'ArrowLeft') { e.preventDefault(); document.getElementById(`motivo-conteo-${(i - 1 + motivos.length) % motivos.length}`)?.focus(); }
                          else if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById('input-contado')?.focus(); }
                          else if (e.key === 'ArrowDown') { e.preventDefault(); document.getElementById('input-justificacion-conteo')?.focus(); }
                        }}
                        className={`${claseBotonBarra(motivo === m)} !h-[38px] !px-3`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="input-justificacion-conteo" className="text-[10px] font-black text-[var(--color-ink)] uppercase tracking-widest mb-2 block">4. Justificación * (qué pasó)</label>
                  <textarea
                    id="input-justificacion-conteo"
                    rows={2}
                    value={justificacion}
                    onChange={(e) => setJustificacion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); document.getElementById('btn-guardar-conteo')?.focus(); }
                      else if (e.key === 'ArrowUp' && e.currentTarget.selectionStart === 0) {
                        e.preventDefault();
                        const i = Math.max(0, motivos.indexOf(motivo));
                        document.getElementById(`motivo-conteo-${i}`)?.focus();
                      } else if (e.key === 'ArrowDown' && e.currentTarget.selectionEnd === e.currentTarget.value.length) {
                        e.preventDefault(); document.getElementById('btn-guardar-conteo')?.focus();
                      }
                    }}
                    placeholder="EJ.: NO SE ENCONTRARON EN EL ESTANTE NI EN EL ALMACÉN"
                    className="w-full bg-white border-2 border-[var(--color-border)] p-3 text-xs font-bold text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)] resize-none"
                  />
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3">
                  <button
                    id="btn-recontar"
                    type="button"
                    onClick={recontar}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowRight') { e.preventDefault(); document.getElementById('btn-guardar-conteo')?.focus(); }
                      else if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById('input-justificacion-conteo')?.focus(); }
                    }}
                    className={claseBotonBarra(false)}
                  >
                    Volver a contar
                  </button>
                  <button
                    id="btn-guardar-conteo"
                    type="button"
                    aria-disabled={guardando}
                    onClick={() => void guardar(diferencia)}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowLeft') { e.preventDefault(); document.getElementById('btn-recontar')?.focus(); }
                      else if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById('input-justificacion-conteo')?.focus(); }
                    }}
                    className={claseBotonPrincipal}
                  >
                    {guardando ? 'Guardando...' : 'Guardar ajuste'}
                  </button>
                </div>
              </div>
            )}
            {ultimo && <p id="conteo-ultimo" role="status" className="text-xs font-black text-[var(--color-accent)] uppercase">{ultimo}</p>}
          </div>

          {/* LO CONTADO EN ESTA VENTANA */}
          <p className="text-[12px] font-black uppercase tracking-widest text-[var(--color-muted)] shrink-0">Contados ahora ({contados.length})</p>
          <CajaLista vacia={!contados.length} mensaje="Todavía no contaste ningún producto.">
            {contados.map((c, i) => (
              <FilaLista
                key={i}
                data-conteo-fila="true"
                titulo={c.producto}
                subtitulo={<><LineaDato>Contó {formatearCantidad(c.contado, c.unidad)} {c.unidad} · {c.hora}</LineaDato>{c.motivo && <LineaDato>Motivo: {c.motivo}</LineaDato>}</>}
                centro={c.diferencia === 0 ? <Etiqueta tono="verde">Cuadra</Etiqueta> : c.diferencia < 0 ? <Etiqueta tono="rojo">Merma</Etiqueta> : <Etiqueta tono="azul">Sobrante</Etiqueta>}
                derecha={<DatoFila etiqueta="Diferencia" valor={`${c.diferencia > 0 ? "+" : ""}${formatearCantidad(c.diferencia, c.unidad)} ${c.unidad}`} tono={c.diferencia < 0 ? 'rojo' : c.diferencia > 0 ? 'verde' : 'normal'} />}
              />
            ))}
          </CajaLista>
        </CuerpoVentana>
      </div>
    </div>
  );
};
