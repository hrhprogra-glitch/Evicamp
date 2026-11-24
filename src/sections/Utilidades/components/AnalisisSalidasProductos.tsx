import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, Package } from 'lucide-react';
import { supabase } from '../../../db/supabase';
import { traerTodo } from '../../../utils/traerTodo';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { PaginacionSobrio } from '../../../components/PaginacionSobrio';
import { clicConTeclado } from '../../../utils/clicConTeclado';

type ProductoSalida = {
  key: string;
  productId: number | null;
  nombre: string;
  esExterno: boolean;
  cantidadTotal: number;
  cantidadDevuelta: number;
  cantidadUsada: number;
  numSalidas: number;
  ultimaSalida: string;
};

type DetalleSalida = {
  salidaId: number;
  codigo: string;
  fecha: string;
  cliente: string;
  estado: string;
  cantidad: number;
  devuelto: number;
  usado: number;
};

interface Props {
  onClose?: () => void;
  onNavigate?: (view: string, state?: any) => void;
}

const fechaCorta = (v: string) => {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v).slice(0, 10);
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const estadoLabel = (estado: string) => {
  const e = String(estado || '').toUpperCase();
  if (e === 'FINALIZADO') return 'Finalizado';
  if (e === 'EN_PROCESO') return 'En proceso';
  if (e === 'CANCELADO') return 'Cancelado';
  return e || '—';
};

export const AnalisisSalidasProductos = ({ onClose, onNavigate }: Props) => {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productos, setProductos] = useState<ProductoSalida[]>([]);
  const [detallePorKey, setDetallePorKey] = useState<Record<string, DetalleSalida[]>>({});
  const [busqueda, setBusqueda] = useState('');
  const [seleccionado, setSeleccionado] = useState<ProductoSalida | null>(null);
  const [pagina, setPagina] = useState(1);
  const searchRef = useRef<HTMLInputElement>(null);
  const seleccionadoRef = useRef<ProductoSalida | null>(null);
  seleccionadoRef.current = seleccionado;

  useCerrarConEscape(true, () => {
    if (seleccionadoRef.current) { setSeleccionado(null); return; }
    onClose?.();
  });

  useEffect(() => {
    let vivo = true;
    const cargar = async () => {
      setCargando(true);
      setError(null);
      try {
        const { data: salidasData, error: errSal } = await traerTodo<any>(() =>
          supabase.from('salidas').select('id, codigo, fecha, created_at, estado, customer:customers(name)').order('id')
        );
        if (errSal) throw errSal;
        const { data: itemsData, error: errItems } = await traerTodo<any>(() =>
          supabase.from('salida_items').select('id, salida_id, product_id, descripcion, cantidad, cantidad_devuelta, es_externo').order('id')
        );
        if (errItems) throw errItems;
        const salidas = salidasData || [];
        const items = itemsData || [];
        const salidasMap = new Map<number, any>();
        salidas.forEach((s: any) => salidasMap.set(Number(s.id), s));

        const agg = new Map<string, ProductoSalida>();
        const det = new Map<string, DetalleSalida[]>();

        for (const it of items || []) {
          const salida = salidasMap.get(Number(it.salida_id));
          if (!salida) continue;
          if (String(salida.estado || '').toUpperCase() === 'CANCELADO') continue;

          const esExterno = !!it.es_externo || !it.product_id;
          const key = esExterno ? `ext:${String(it.descripcion || '').trim().toLowerCase()}` : `prod:${it.product_id}`;
          const nombre = String(it.descripcion || 'Producto').trim() || 'Producto';
          const cantidad = Number(it.cantidad || 0);
          const devuelto = Number(it.cantidad_devuelta || 0);
          const usado = Math.max(0, cantidad - devuelto);
          const fecha = salida.fecha || salida.created_at || '';

          if (!agg.has(key)) {
            agg.set(key, {
              key,
              productId: it.product_id ? Number(it.product_id) : null,
              nombre,
              esExterno,
              cantidadTotal: 0,
              cantidadDevuelta: 0,
              cantidadUsada: 0,
              numSalidas: 0,
              ultimaSalida: fecha,
            });
            det.set(key, []);
          }
          const p = agg.get(key)!;
          p.cantidadTotal += cantidad;
          p.cantidadDevuelta += devuelto;
          p.cantidadUsada += usado;
          if (!p.ultimaSalida || new Date(fecha).getTime() > new Date(p.ultimaSalida).getTime()) {
            p.ultimaSalida = fecha;
          }

          const detalleLista = det.get(key)!;
          let fila = detalleLista.find((d) => d.salidaId === Number(salida.id));
          if (!fila) {
            fila = {
              salidaId: Number(salida.id),
              codigo: String(salida.codigo || `SAL-${salida.id}`),
              fecha,
              cliente: salida.customer?.name || '—',
              estado: String(salida.estado || ''),
              cantidad: 0,
              devuelto: 0,
              usado: 0,
            };
            detalleLista.push(fila);
          }
          fila.cantidad += cantidad;
          fila.devuelto += devuelto;
          fila.usado += usado;
        }

        const lista = Array.from(agg.values()).map((p) => ({
          ...p,
          numSalidas: (det.get(p.key) || []).length,
        }));
        lista.sort((a, b) => b.cantidadUsada - a.cantidadUsada || a.nombre.localeCompare(b.nombre, 'es'));

        const detObj: Record<string, DetalleSalida[]> = {};
        for (const [k, arr] of det.entries()) {
          arr.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
          detObj[k] = arr;
        }

        if (!vivo) return;
        setProductos(lista);
        setDetallePorKey(detObj);
      } catch (e: any) {
        console.error('Error cargando análisis de salidas:', e);
        if (vivo) setError(e?.message || 'No se pudo cargar el análisis de salidas.');
      } finally {
        if (vivo) setCargando(false);
      }
    };
    cargar();
    return () => { vivo = false; };
  }, []);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return productos;
    return productos.filter((p) => p.nombre.toLowerCase().includes(q));
  }, [productos, busqueda]);

  useEffect(() => { setPagina(1); }, [busqueda]);

  const porPagina = 50;
  const totalPaginas = Math.ceil(filtrados.length / porPagina) || 1;
  const inicio = (pagina - 1) * porPagina;
  const paginados = filtrados.slice(inicio, inicio + porPagina);
  const detalle = seleccionado ? (detallePorKey[seleccionado.key] || []) : [];

  const focusPaginacionTop = () => {
    const el = document.getElementById('btn-pag-analisis-salidas-ant') || document.getElementById('btn-pag-analisis-salidas-sig');
    el?.focus();
  };

  const paginacion = (pos: 'top' | 'bottom') => (
    <PaginacionSobrio
      pagina={pagina}
      totalPaginas={totalPaginas}
      onCambiar={setPagina}
      prefijo="analisis-salidas"
      posicion={pos}
      selectorFilas="#tabla-analisis-salidas [data-row='true']"
      idBuscador="buscador-analisis-salidas"
      idFocoIzquierda={busqueda ? 'btn-borrar-buscador-analisis-salidas' : 'buscador-analisis-salidas'}
    />
  );

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="flex flex-col xl:flex-row gap-3 sm:gap-4 shrink-0 items-stretch xl:items-center justify-between">
        <div className="buscador-sobrio w-full xl:flex-1 shrink-0">
          <div className="buscador-sobrio__icono"><Search size={18} /></div>
          <input
            ref={searchRef}
            id="buscador-analisis-salidas"
            type="text"
            autoComplete="off"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="BUSCAR PRODUCTO POR NOMBRE..."
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                if (busqueda) setBusqueda('');
                else if (seleccionadoRef.current) setSeleccionado(null);
                else onClose?.();
                return;
              }
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (paginados.length > 0) focusPaginacionTop();
                return;
              }
              if (e.key === 'ArrowRight' && busqueda && e.currentTarget.selectionStart === busqueda.length) {
                e.preventDefault();
                document.getElementById('btn-borrar-buscador-analisis-salidas')?.focus();
                return;
              }
              if (e.key === 'Enter' && filtrados.length > 0) {
                e.preventDefault();
                setSeleccionado(filtrados[0]);
              }
            }}
          />
          {busqueda && (
            <div className="buscador-sobrio__match">
              <span className="buscador-sobrio__conteo">{filtrados.length} MATCH</span>
              <button
                id="btn-borrar-buscador-analisis-salidas"
                type="button"
                className="buscador-sobrio__borrar"
                onClick={() => { setBusqueda(''); searchRef.current?.focus(); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
                    e.preventDefault();
                    setBusqueda('');
                    searchRef.current?.focus();
                  } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    searchRef.current?.focus();
                    const len = searchRef.current?.value.length || 0;
                    searchRef.current?.setSelectionRange(len, len);
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    focusPaginacionTop();
                  }
                }}
                aria-label="Borrar búsqueda"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="tabla-marco flex flex-col">
        {paginacion('top')}

        {cargando ? (
          <div className="vacio-sobrio">
            <Search size={32} />
            Cargando análisis de salidas...
          </div>
        ) : error ? (
          <div className="vacio-sobrio">
            <Search size={32} />
            {error}
          </div>
        ) : filtrados.length === 0 ? (
          <div className="vacio-sobrio">
            <Search size={32} />
            No se encontraron productos con esos parámetros.
          </div>
        ) : (
          <div id="tabla-analisis-salidas" className="w-full">
            <div className="hidden md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,1fr)] tabla-cabecera sticky top-0 z-10">
              <div className="p-4">Producto</div>
              <div className="p-4 text-right">Cant. salida</div>
              <div className="p-4 text-right">Devuelto</div>
              <div className="p-4 text-right">Usado</div>
              <div className="p-4 text-right">N° salidas</div>
              <div className="p-4 text-left">Última salida</div>
            </div>
            <div className="bg-[var(--color-surface)]">
              {paginados.map((p) => (
                <div
                  key={p.key}
                  data-row="true"
                  {...clicConTeclado(() => setSeleccionado(p))}
                  className="grid grid-cols-2 gap-x-4 gap-y-2.5 p-3 sm:p-4 md:p-0 md:gap-0 md:grid-cols-[minmax(0,2fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,1fr)] md:items-center tabla-fila cursor-pointer group"
                  title="Ver detalle de salidas (Enter o Clic)"
                >
                  <div className="col-span-2 md:col-span-1 md:p-4 min-w-0">
                    <span className="md:hidden block text-[10px] font-black uppercase tracking-wider text-[var(--color-muted)]">Producto</span>
                    <p className="text-xs font-black text-[var(--color-ink)] uppercase mb-1 break-words">{p.nombre}</p>
                    {p.esExterno && (
                      <span className="text-[12px] font-black text-[var(--color-muted)] border border-[var(--color-border)] bg-[var(--color-bg-2)] px-2 py-0.5 rounded-none uppercase tracking-widest">Externo</span>
                    )}
                  </div>
                  <div className="md:p-4 md:text-right"><span className="md:hidden block text-[10px] font-black uppercase tracking-wider text-[var(--color-muted)]">Cant. salida</span><span className="font-mono text-xs font-black text-[var(--color-ink)]">{p.cantidadTotal.toLocaleString('es-PE')}</span></div>
                  <div className="md:p-4 md:text-right"><span className="md:hidden block text-[10px] font-black uppercase tracking-wider text-[var(--color-muted)]">Devuelto</span><span className={`font-mono text-xs font-black ${p.cantidadDevuelta > 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-muted)]'}`}>{p.cantidadDevuelta > 0 ? p.cantidadDevuelta.toLocaleString('es-PE') : '—'}</span></div>
                  <div className="md:p-4 md:text-right"><span className="md:hidden block text-[10px] font-black uppercase tracking-wider text-[var(--color-muted)]">Usado</span><span className="font-mono text-xs font-black text-[var(--color-ink)]">{p.cantidadUsada.toLocaleString('es-PE')}</span></div>
                  <div className="md:p-4 md:text-right"><span className="md:hidden block text-[10px] font-black uppercase tracking-wider text-[var(--color-muted)]">N° salidas</span><span className="font-mono text-xs font-black text-[var(--color-ink)]">{p.numSalidas}</span></div>
                  <div className="md:p-4"><span className="md:hidden block text-[10px] font-black uppercase tracking-wider text-[var(--color-muted)]">Última salida</span><span className="font-mono text-xs font-black text-[var(--color-muted)]">{fechaCorta(p.ultimaSalida)}</span></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {paginacion('bottom')}
      </div>

      {seleccionado && (
        <div className="fixed inset-0 z-[130] bg-black/40 flex items-center justify-center p-2 sm:p-4" onClick={(e) => { if (e.target === e.currentTarget) setSeleccionado(null); }}>
          <div className="ventana-sobria w-full max-w-4xl max-h-[88vh] flex flex-col font-mono">
            <div className="ventana-cabecera" style={{ '--icono': 'var(--color-ink)' } as React.CSSProperties}>
              <div className="min-w-0 flex-1">
                <h2 className="ventana-cabecera__titulo">
                  <Package size={18} />
                  <span className="truncate">Salidas de {seleccionado.nombre}</span>
                </h2>
                <p className="ventana-cabecera__subtitulo mt-1">{detalle.length} salida(s) · Neto {seleccionado.cantidadUsada.toLocaleString('es-PE')}</p>
              </div>
              <button
                id="btn-cerrar-detalle-salidas-producto"
                type="button"
                autoFocus
                onClick={() => setSeleccionado(null)}
                className="ventana-cerrar"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-3 sm:p-4 bg-[var(--color-surface)]">
              {detalle.length === 0 ? (
                <div className="vacio-sobrio">
                  <Search size={32} />
                  No se encontraron salidas para este producto.
                </div>
              ) : (
                <div className="tabla-marco">
                  <div className="hidden md:grid md:grid-cols-[minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,1.4fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.9fr)] tabla-cabecera sticky top-0 z-10">
                    <div className="p-3">Fecha</div>
                    <div className="p-3">Salida</div>
                    <div className="p-3">Cliente</div>
                    <div className="p-3 text-right">Cantidad</div>
                    <div className="p-3 text-right">Devuelto</div>
                    <div className="p-3 text-right">Usado</div>
                    <div className="p-3">Estado</div>
                  </div>
                  <div className="bg-[var(--color-surface)]">
                    {detalle.map((d) => (
                      <div
                        key={`${d.salidaId}-${d.codigo}`}
                        {...(onNavigate ? clicConTeclado(() => onNavigate('salidas', { salidaId: d.salidaId, volverA: 'utilidades', volverTab: 'salidas' })) : {})}
                        className={`grid grid-cols-2 gap-x-4 gap-y-2 p-3 md:p-0 md:gap-0 md:grid-cols-[minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,1.4fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.9fr)] md:items-center tabla-fila ${onNavigate ? 'cursor-pointer' : ''}`}
                        title={onNavigate ? 'Ir a esta salida (Enter o Clic)' : undefined}
                      >
                        <div className="md:p-3"><span className="md:hidden block text-[10px] font-black uppercase tracking-wider text-[var(--color-muted)]">Fecha</span><span className="font-mono text-xs font-black text-[var(--color-muted)]">{fechaCorta(d.fecha)}</span></div>
                        <div className="md:p-3"><span className="md:hidden block text-[10px] font-black uppercase tracking-wider text-[var(--color-muted)]">Salida</span><span className="font-mono text-xs font-black text-[var(--color-ink)]">{d.codigo}</span></div>
                        <div className="col-span-2 md:col-span-1 md:p-3 min-w-0"><span className="md:hidden block text-[10px] font-black uppercase tracking-wider text-[var(--color-muted)]">Cliente</span><span className="text-xs font-bold text-[var(--color-ink)] uppercase break-words">{d.cliente}</span></div>
                        <div className="md:p-3 md:text-right"><span className="md:hidden block text-[10px] font-black uppercase tracking-wider text-[var(--color-muted)]">Cantidad</span><span className="font-mono text-xs font-black text-[var(--color-ink)]">{d.cantidad.toLocaleString('es-PE')}</span></div>
                        <div className="md:p-3 md:text-right"><span className="md:hidden block text-[10px] font-black uppercase tracking-wider text-[var(--color-muted)]">Devuelto</span><span className={`font-mono text-xs font-black ${d.devuelto > 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-muted)]'}`}>{d.devuelto > 0 ? d.devuelto.toLocaleString('es-PE') : '—'}</span></div>
                        <div className="md:p-3 md:text-right"><span className="md:hidden block text-[10px] font-black uppercase tracking-wider text-[var(--color-muted)]">Usado</span><span className="font-mono text-xs font-black text-[var(--color-ink)]">{d.usado.toLocaleString('es-PE')}</span></div>
                        <div className="md:p-3"><span className="md:hidden block text-[10px] font-black uppercase tracking-wider text-[var(--color-muted)]">Estado</span><span className="text-[12px] font-black uppercase tracking-widest text-[var(--color-ink)]">{estadoLabel(d.estado)}</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
