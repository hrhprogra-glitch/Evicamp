// Utilidades › Imprimir productos (25/11/2026): listado A4/PDF de los productos ACTIVOS,
// con categorías elegibles con casillas, columnas opcionales y una columna en blanco
// para anotar la CANTIDAD A PEDIR. Igual que en Inventario: el stock se calcula
// con lotes y variantes, no solo products.quantity.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Printer, X } from 'lucide-react';
import { supabase } from '../../../db/supabase';
import { traerTodo } from '../../../utils/traerTodo';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { avisar } from '../../../utils/dialogos';
import { fechaLocalPeru } from '../../../utils/ingresos';
import { formatearMonto } from '../../../utils/formato';
import { useEmpresaComprobante } from '../../Salidas/empresa';

interface Props {
  onClose: () => void;
}

type Columna = 'codigo' | 'nombre' | 'categoria' | 'stock' | 'precio' | 'pedido';
type Columnas = Record<Columna, boolean>;

interface ProductoImprimir {
  id: string | number;
  code: string;
  name: string;
  category: string;
  stock: number;
  unit: string;
  price: number;
}

const COLUMNAS: { id: Columna; etiqueta: string }[] = [
  { id: 'codigo', etiqueta: 'CÓDIGO' },
  { id: 'nombre', etiqueta: 'NOMBRE' },
  { id: 'categoria', etiqueta: 'CATEGORÍA' },
  { id: 'stock', etiqueta: 'STOCK' },
  { id: 'precio', etiqueta: 'PRECIO' },
  { id: 'pedido', etiqueta: 'CANT. A PEDIR' },
];

const escaparHtml = (valor: unknown) => String(valor ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const ModalImprimirProductos: React.FC<Props> = ({ onClose }) => {
  const [productos, setProductos] = useState<ProductoImprimir[]>([]);
  const [cargando, setCargando] = useState(true);
  // null = todas las categorías marcadas. Al desmarcar una se guarda el conjunto elegido.
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState<Set<string> | null>(null);
  const [columnas, setColumnas] = useState<Columnas>({
    codigo: true, nombre: true, categoria: true, stock: true, precio: false, pedido: true,
  });
  const marco = useRef<HTMLIFrameElement>(null);
  const empresa = useEmpresaComprobante();

  const cerrar = () => {
    onClose();
    setTimeout(() => document.getElementById('btn-imprimir-productos-utilidades')?.focus(), 50);
  };
  useCerrarConEscape(true, cerrar);

  // Solo se consulta cuando se abre la ventana; traerTodo respeta la copia sin internet.
  useEffect(() => {
    let vivo = true;
    const cargar = async () => {
      setCargando(true);
      const [resProductos, resLotes, resVariantes] = await Promise.all([
        traerTodo<any>(() => supabase.from('products')
          .select('id, name, code, category, quantity, price, unit, weight_unit, control_type, tiene_variantes, is_active')
          .eq('is_active', 1).order('name').order('id')),
        traerTodo<any>(() => supabase.from('batches').select('id, product_id, quantity').order('id')),
        traerTodo<any>(() => supabase.from('product_variants').select('id, product_id, quantity, is_active').eq('is_active', 1).order('id')),
      ]);
      if (!vivo) return;
      if (resProductos.error) {
        console.error('Error cargando productos para imprimir:', resProductos.error);
        setCargando(false);
        await avisar('No se pudieron cargar los productos para imprimir. Revisa la conexión e inténtalo de nuevo.');
        return;
      }
      if (resLotes.error) console.error('Error cargando lotes para imprimir:', resLotes.error);
      if (resVariantes.error) console.error('Error cargando variantes para imprimir:', resVariantes.error);

      const lotesPorProducto = new Map<string, any[]>();
      (resLotes.data || []).forEach((l: any) => {
        const clave = String(l.product_id);
        if (!lotesPorProducto.has(clave)) lotesPorProducto.set(clave, []);
        lotesPorProducto.get(clave)!.push(l);
      });
      const variantesPorProducto = new Map<string, any[]>();
      (resVariantes.data || []).forEach((v: any) => {
        const clave = String(v.product_id);
        if (!variantesPorProducto.has(clave)) variantesPorProducto.set(clave, []);
        variantesPorProducto.get(clave)!.push(v);
      });

      const lista: ProductoImprimir[] = (resProductos.data || []).map((p: any) => {
        const lotes = lotesPorProducto.get(String(p.id)) || [];
        const variantes = variantesPorProducto.get(String(p.id)) || [];
        const stockBase = lotes.length
          ? lotes.reduce((sum: number, l: any) => sum + (Number(l.quantity) || 0), 0)
          : (Number(p.quantity) || 0);
        const stockVariantes = variantes.reduce((sum: number, v: any) => sum + (Number(v.quantity) || 0), 0);
        const tieneVariantes = Boolean(p.tiene_variantes || variantes.length);
        return {
          id: p.id,
          code: p.code || 'NO-SKU',
          name: p.name || 'SIN NOMBRE',
          category: p.category || 'GENERAL',
          stock: tieneVariantes ? stockVariantes + stockBase : stockBase,
          unit: p.unit || p.weight_unit || (p.control_type === 'WEIGHT' ? 'KG' : 'UND'),
          price: Number(p.price) || 0,
        };
      });
      setProductos(lista);
      setCategoriasSeleccionadas(null);
      setCargando(false);
    };
    void cargar();
    return () => { vivo = false; };
  }, []);

  const categorias = useMemo(
    () => Array.from(new Set(productos.map((p) => p.category))).sort((a, b) => a.localeCompare(b)),
    [productos],
  );
  const todasCategorias = categoriasSeleccionadas === null || categoriasSeleccionadas.size === categorias.length;
  const filtrados = useMemo(
    () => productos.filter((p) => todasCategorias || categoriasSeleccionadas!.has(p.category)),
    [productos, todasCategorias, categoriasSeleccionadas],
  );
  const columnasActivas = COLUMNAS.filter((c) => columnas[c.id]);

  const alternarCategoria = (cat: string) => {
    setCategoriasSeleccionadas((prev) => {
      const elegidas = prev === null ? new Set(categorias) : new Set(prev);
      if (elegidas.has(cat)) elegidas.delete(cat);
      else elegidas.add(cat);
      return elegidas;
    });
  };

  const marcarTodasCategorias = (marcadas: boolean) => {
    setCategoriasSeleccionadas(marcadas ? null : new Set<string>());
  };

  const alternarColumna = (id: Columna) => {
    setColumnas((prev) => {
      const siguiente = { ...prev, [id]: !prev[id] };
      // Siempre debe quedar una columna con datos (CANT. A PEDIR no cuenta).
      if (!COLUMNAS.some((c) => c.id !== 'pedido' && siguiente[c.id])) return prev;
      return siguiente;
    });
  };

  // Flechas recorren los controles de la ventana; espacio marca casillas.
  const idsNavegacion = useMemo(() => [
    'casilla-todas-categorias',
    ...categorias.map((_, i) => `casilla-categoria-${i}`),
    'casilla-codigo', 'casilla-nombre', 'casilla-categoria', 'casilla-stock', 'casilla-precio', 'casilla-pedido',
    'btn-imprimir-productos-hoja',
  ], [categorias]);

  useEffect(() => {
    const manejar = (e: KeyboardEvent) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      const id = (document.activeElement as HTMLElement | null)?.id || '';
      const actual = idsNavegacion.indexOf(id);
      const paso = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
      const destino = actual < 0 ? 0 : Math.min(idsNavegacion.length - 1, Math.max(0, actual + paso));
      e.preventDefault();
      e.stopPropagation();
      document.getElementById(idsNavegacion[destino])?.focus();
    };
    window.addEventListener('keydown', manejar, true);
    return () => window.removeEventListener('keydown', manejar, true);
  }, [idsNavegacion]);

  // Al cerrar la ventana de impresión del navegador, el selector vuelve al botón Imprimir.
  useEffect(() => {
    const recuperar = () => setTimeout(() => {
      const activo = document.activeElement;
      if (!activo || activo === document.body || activo.tagName === 'IFRAME') {
        document.getElementById('btn-imprimir-productos-hoja')?.focus();
      }
    }, 80);
    window.addEventListener('focus', recuperar);
    return () => window.removeEventListener('focus', recuperar);
  }, []);

  const valorCelda = (id: Columna, p: ProductoImprimir) => {
    if (id === 'pedido') return ''; // espacio en blanco para anotar a mano
    if (id === 'codigo') return escaparHtml(p.code);
    if (id === 'nombre') return escaparHtml(p.name);
    if (id === 'categoria') return escaparHtml(p.category);
    if (id === 'stock') return escaparHtml(`${p.stock.toLocaleString('es-PE', { maximumFractionDigits: 3 })} ${p.unit}`.trim());
    return `S/ ${formatearMonto(p.price)}`;
  };

  const html = useMemo(() => {
    const claseColumna = (id: Columna) =>
      id === 'pedido' ? ' class="pedido"' : (id === 'stock' || id === 'precio') ? ' class="num"' : '';
    const cabeceras = columnasActivas
      .map((c) => `<th${claseColumna(c.id)}>${c.etiqueta}</th>`).join('');
    const filas = filtrados.map((p) => `<tr>${columnasActivas.map((c) =>
      `<td${claseColumna(c.id)}>${valorCelda(c.id, p)}</td>`).join('')}</tr>`).join('');
    const nombreEmpresa = escaparHtml(empresa.nombre || 'ECO SISTEMAS URH');
    const ruc = empresa.ruc ? `<small>RUC: ${escaparHtml(empresa.ruc)}</small>` : '';
    const telefono = empresa.telefono ? `<small>Tel.: ${escaparHtml(empresa.telefono)}</small>` : '';
    const subtitulo = todasCategorias
      ? 'TODAS LAS CATEGORÍAS'
      : categoriasSeleccionadas && categoriasSeleccionadas.size > 0
        ? `${categoriasSeleccionadas.size} CATEGORÍA(S) ELEGIDA(S)`
        : 'SIN CATEGORÍAS ELEGIDAS';
    return `<!doctype html><html lang="es"><head><meta charset="UTF-8"><title>Listado de productos</title>
<style>
@page { size: A4; margin: 12mm; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
html, body { margin: 0; background: #fff; color: #111; font-family: Arial, Helvetica, sans-serif; font-size: 10px; }
.cabecera { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; border-top: 5px solid #111; border-bottom: 1px solid #111; padding: 10px 0 8px; margin-bottom: 12px; }
.empresa { font-size: 14px; font-weight: 800; letter-spacing: .5px; }
.empresa small { display: block; font-size: 9px; font-weight: normal; margin-top: 2px; }
.titulo { text-align: right; }
.titulo strong { font-size: 15px; letter-spacing: 1.5px; }
.titulo div { font-size: 9px; margin-top: 3px; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; border-top: 3px double #111; }
th, td { border: 1px solid #111; padding: 5px 6px; text-align: left; vertical-align: middle; overflow-wrap: anywhere; }
th { background: #1f2937; color: #fff; font-size: 9px; text-transform: uppercase; letter-spacing: .6px; text-align: center; }
th:first-child, td:first-child { border-left: 2px solid #111; }
th:last-child, td:last-child { border-right: 2px solid #111; }
tbody tr:nth-child(even) td { background: #f3f4f6; }
tbody td { height: 21px; }
th.num, td.num { text-align: right; font-variant-numeric: tabular-nums; }
th.pedido, td.pedido { width: 96px; text-align: center; }
td.pedido { background: #fff !important; border-bottom: 2px solid #111; }
thead { display: table-header-group; }
tr { break-inside: avoid; }
tfoot td { background: #e8e8e8; font-weight: bold; border-top: 2px solid #111; }
.pie { display: flex; justify-content: space-between; margin-top: 8px; padding-top: 4px; border-top: 1px solid #111; font-size: 8px; color: #444; }
@media screen { html, body { overflow: hidden !important; } }
</style></head><body>
<div class="cabecera">
  <div class="empresa">${nombreEmpresa}${ruc}${telefono}</div>
  <div class="titulo"><strong>LISTADO DE PRODUCTOS</strong><div>${escaparHtml(subtitulo)}</div><div>Fecha: ${escaparHtml(fechaLocalPeru())}</div></div>
</div>
<table><thead><tr>${cabeceras}</tr></thead><tbody>${filas}</tbody>
<tfoot><tr><td colspan="${columnasActivas.length}">Total: ${filtrados.length} producto(s)</td></tr></tfoot></table>
<div class="pie"><span>SiuMax Nego · listado para pedido</span><span>Productos activos</span></div>
</body></html>`;
  }, [filtrados, columnasActivas, todasCategorias, categoriasSeleccionadas, empresa]);

  const ajustarAlto = () => {
    const doc = marco.current?.contentDocument;
    if (marco.current && doc) {
      marco.current.style.height = `${Math.max(doc.documentElement.scrollHeight, doc.body?.scrollHeight || 0) + 2}px`;
      // Al imprimir, el foco entra a la hoja: Escape debe cerrar la ventana igual que en el resto del sistema.
      doc.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        e.preventDefault();
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      });
    }
  };

  const imprimir = () => {
    const ventana = marco.current?.contentWindow;
    if (!ventana) return;
    ventana.focus();
    ventana.print();
    // Terminada la impresión, el teclado vuelve al botón de la ventana (no se queda dentro del iframe).
    document.getElementById('btn-imprimir-productos-hoja')?.focus();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 font-mono" role="dialog" aria-modal="true" aria-label="Imprimir productos">
      <div className="ventana-sobria w-full max-w-5xl flex flex-col max-h-[calc(94dvh/var(--ui-zoom))]">
        <div className="ventana-cabecera">
          <div className="flex items-center gap-3 min-w-0">
            <div className="ventana-cabecera__icono"><Printer size={18} /></div>
            <div className="min-w-0">
              <h2 className="ventana-cabecera__titulo">Imprimir productos</h2>
              <p className="ventana-cabecera__subtitulo">Productos activos · hoja A4 / PDF</p>
            </div>
          </div>
          <button id="btn-cerrar-imprimir-productos" type="button" onClick={cerrar} title="Cerrar (Esc)" className="ventana-cerrar"><X size={18} /></button>
        </div>

        <div className="p-3 sm:p-4 overflow-y-auto custom-scrollbar flex flex-col gap-3 min-h-0">
          {/* Una sola fila en pantallas anchas: categorías | columnas | total y botón de imprimir. */}
          <div className="flex flex-wrap items-stretch gap-3">
            <fieldset className="border-2 border-[var(--color-border)] p-3 flex-1 min-w-[240px]">
              <legend className="px-1 text-[10px] font-black uppercase tracking-widest text-[var(--color-muted)]">Categorías a imprimir</legend>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1 max-h-28 overflow-y-auto custom-scrollbar">
                <label className="flex items-center gap-2 text-[11px] font-black uppercase text-[var(--color-ink)] cursor-pointer border-b-2 border-[var(--color-border)] pb-1">
                  <input id="casilla-todas-categorias" type="checkbox" checked={todasCategorias}
                    onChange={(e) => marcarTodasCategorias(e.target.checked)} disabled={cargando}
                    style={{ accentColor: 'var(--color-accent)' }} />
                  Todas
                </label>
                {categorias.map((cat, i) => (
                  <label key={cat} className="flex items-center gap-2 text-[11px] font-bold text-[var(--color-ink)] cursor-pointer">
                    <input id={`casilla-categoria-${i}`} type="checkbox" data-categoria={cat}
                      checked={todasCategorias || (categoriasSeleccionadas?.has(cat) ?? false)}
                      onChange={() => alternarCategoria(cat)} disabled={cargando}
                      style={{ accentColor: 'var(--color-accent)' }} />
                    <span className="truncate" title={cat}>{cat}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="border-2 border-[var(--color-border)] p-3 flex-1 min-w-[240px]">
              <legend className="px-1 text-[10px] font-black uppercase tracking-widest text-[var(--color-muted)]">Columnas a imprimir</legend>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                {COLUMNAS.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-[11px] font-bold uppercase text-[var(--color-ink)] cursor-pointer">
                    <input id={`casilla-${c.id}`} type="checkbox" data-columna={c.id} checked={columnas[c.id]}
                      onChange={() => alternarColumna(c.id)}
                      style={{ accentColor: 'var(--color-accent)' }} />
                    {c.etiqueta}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="flex flex-col justify-between gap-2 min-w-[190px]">
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-muted)]">
                {cargando ? 'Cargando productos…' : `${filtrados.length} producto(s) para imprimir`}
              </p>
              <button id="btn-imprimir-productos-hoja" type="button" onClick={imprimir} disabled={cargando || filtrados.length === 0}
                className="boton-cabecera w-full justify-center bg-[var(--color-ink)] text-[var(--color-accent)] px-4 py-3 text-xs disabled:opacity-50">
                <Printer size={16} /> Imprimir / PDF
              </button>
            </div>
          </div>

          {!cargando && (
            <div className="bg-[var(--color-bg)] border-2 border-[var(--color-border)] p-2 sm:p-3">
              <iframe ref={marco} title="Vista previa del listado de productos" srcDoc={html} tabIndex={-1}
                onLoad={ajustarAlto} scrolling="no"
                className="w-full min-h-[220px] bg-white border border-[var(--color-border)] pointer-events-none block overflow-hidden" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
