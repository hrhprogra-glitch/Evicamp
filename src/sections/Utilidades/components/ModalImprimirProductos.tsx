// Utilidades › Imprimir productos (25/11/2026): listado A4/PDF de los productos ACTIVOS,
// con filtro de categoría y columnas que se pueden quitar (por ejemplo, quitar precios).
// Igual que en Inventario: el stock se calcula con lotes y variantes, no solo products.quantity.
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

type Columna = 'codigo' | 'nombre' | 'categoria' | 'stock' | 'precio';
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
];
const IDS_NAVEGACION = [
  'categoria-imprimir-productos',
  'casilla-codigo', 'casilla-nombre', 'casilla-categoria', 'casilla-stock', 'casilla-precio',
  'btn-imprimir-productos-hoja', 'btn-cancelar-imprimir-productos',
];

const escaparHtml = (valor: unknown) => String(valor ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const ModalImprimirProductos: React.FC<Props> = ({ onClose }) => {
  const [productos, setProductos] = useState<ProductoImprimir[]>([]);
  const [cargando, setCargando] = useState(true);
  const [categoria, setCategoria] = useState('TODAS');
  const [columnas, setColumnas] = useState<Columnas>({ codigo: true, nombre: true, categoria: true, stock: true, precio: true });
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
      setCargando(false);
    };
    void cargar();
    return () => { vivo = false; };
  }, []);

  const categorias = useMemo(
    () => Array.from(new Set(productos.map((p) => p.category))).sort((a, b) => a.localeCompare(b)),
    [productos],
  );
  const filtrados = useMemo(
    () => productos.filter((p) => categoria === 'TODAS' || p.category === categoria),
    [productos, categoria],
  );
  const columnasActivas = COLUMNAS.filter((c) => columnas[c.id]);

  const alternarColumna = (id: Columna) => {
    setColumnas((prev) => {
      const siguiente = { ...prev, [id]: !prev[id] };
      if (!COLUMNAS.some((c) => siguiente[c.id])) return prev; // siempre queda al menos una columna
      return siguiente;
    });
  };

  // Flechas recorren los controles de la ventana; Enter en el desplegable abre la lista.
  useEffect(() => {
    const manejar = (e: KeyboardEvent) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      const id = (document.activeElement as HTMLElement | null)?.id || '';
      const actual = IDS_NAVEGACION.indexOf(id);
      const paso = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
      const destino = actual < 0 ? 0 : Math.min(IDS_NAVEGACION.length - 1, Math.max(0, actual + paso));
      e.preventDefault();
      e.stopPropagation();
      document.getElementById(IDS_NAVEGACION[destino])?.focus();
    };
    window.addEventListener('keydown', manejar, true);
    return () => window.removeEventListener('keydown', manejar, true);
  }, []);

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
    if (id === 'codigo') return escaparHtml(p.code);
    if (id === 'nombre') return escaparHtml(p.name);
    if (id === 'categoria') return escaparHtml(p.category);
    if (id === 'stock') return escaparHtml(`${p.stock.toLocaleString('es-PE', { maximumFractionDigits: 3 })} ${p.unit}`.trim());
    return `S/ ${formatearMonto(p.price)}`;
  };

  const html = useMemo(() => {
    const cabeceras = columnasActivas.map((c) => `<th>${c.etiqueta}</th>`).join('');
    const filas = filtrados.map((p) => `<tr>${columnasActivas.map((c) => `<td>${valorCelda(c.id, p)}</td>`).join('')}</tr>`).join('');
    const nombreEmpresa = escaparHtml(empresa.nombre || 'ECO SISTEMAS URH');
    const ruc = empresa.ruc ? `<div>RUC: ${escaparHtml(empresa.ruc)}</div>` : '';
    const telefono = empresa.telefono ? `<div>Tel.: ${escaparHtml(empresa.telefono)}</div>` : '';
    return `<!doctype html><html lang="es"><head><meta charset="UTF-8"><title>Listado de productos</title>
<style>
@page { size: A4; margin: 12mm; }
html, body { margin: 0; background: #fff; color: #000; font-family: Arial, sans-serif; font-size: 10px; }
header { display: flex; justify-content: space-between; gap: 20px; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px; }
header strong { font-size: 14px; letter-spacing: 1px; }
header .derecha { text-align: right; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #000; padding: 3px 5px; text-align: left; vertical-align: top; }
th { background: #eee; font-size: 9px; }
thead { display: table-header-group; }
tr { break-inside: avoid; }
tfoot td { font-weight: bold; background: #eee; }
@media screen { html, body { overflow: hidden !important; } }
</style></head><body>
<header>
  <div><strong>${nombreEmpresa}</strong>${ruc}${telefono}</div>
  <div class="derecha"><strong>LISTADO DE PRODUCTOS</strong><div>${escaparHtml(categoria === 'TODAS' ? 'TODAS LAS CATEGORÍAS' : categoria)}</div><div>Fecha: ${escaparHtml(fechaLocalPeru())}</div></div>
</header>
<table><thead><tr>${cabeceras}</tr></thead><tbody>${filas}</tbody>
<tfoot><tr><td colspan="${columnasActivas.length}">Total: ${filtrados.length} producto(s)</td></tr></tfoot></table>
</body></html>`;
  }, [filtrados, columnasActivas, categoria, empresa]);

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
      <div className="ventana-sobria w-full max-w-4xl flex flex-col max-h-[calc(94dvh/var(--ui-zoom))]">
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

        <div className="p-3 sm:p-4 overflow-y-auto custom-scrollbar flex flex-col gap-4 min-h-0">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-[10px] font-black uppercase tracking-widest text-[var(--color-muted)]">
              Categoría
              <select id="categoria-imprimir-productos" value={categoria} disabled={cargando}
                onChange={(e) => setCategoria(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    try { e.currentTarget.showPicker?.(); } catch { /* sin calendario/lista en este navegador */ }
                  }
                }}
                className="filtro-sobrio w-56">
                <option value="TODAS">Todas las categorías</option>
                {categorias.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </label>
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-muted)] pb-3">
              {cargando ? 'Cargando productos…' : `${filtrados.length} producto(s) para imprimir`}
            </p>
          </div>

          <fieldset className="border-2 border-[var(--color-border)] p-3">
            <legend className="px-1 text-[10px] font-black uppercase tracking-widest text-[var(--color-muted)]">Columnas a imprimir</legend>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {COLUMNAS.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-[11px] font-bold uppercase text-[var(--color-ink)] cursor-pointer">
                  <input id={`casilla-${c.id}`} type="checkbox" checked={columnas[c.id]} onChange={() => alternarColumna(c.id)}
                    style={{ accentColor: 'var(--color-accent)' }} />
                  {c.etiqueta}
                </label>
              ))}
            </div>
          </fieldset>

          {!cargando && (
            <div className="bg-[var(--color-bg)] border-2 border-[var(--color-border)] p-2 sm:p-3">
              <iframe ref={marco} title="Vista previa del listado de productos" srcDoc={html} tabIndex={-1}
                onLoad={ajustarAlto} scrolling="no"
                className="w-full min-h-[220px] bg-white border border-[var(--color-border)] pointer-events-none block overflow-hidden" />
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <button id="btn-cancelar-imprimir-productos" type="button" onClick={cerrar}
              className="boton-cabecera bg-[var(--color-surface)] text-[var(--color-ink)] px-4 py-3 text-xs">Cancelar</button>
            <button id="btn-imprimir-productos-hoja" type="button" onClick={imprimir} disabled={cargando || filtrados.length === 0}
              className="boton-cabecera bg-[var(--color-ink)] text-[var(--color-accent)] px-4 py-3 text-xs disabled:opacity-50">
              <Printer size={16} /> Imprimir / PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
