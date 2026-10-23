// src/sections/Inventario/components/ModalEtiqueta.tsx
// ETIQUETAS (fase 2.5): desde el ícono de etiqueta de cada producto (Inventario > Productos > acciones).
// Dos tipos: "Precio para el estante" (nombre y precio grande) y "Sticker para el producto" (código de barras
// grande, para escanear en Caja). El código de barras es el del producto o, si no tiene, su código interno.
// Papel: ticketera de 80 mm o 58 mm (una debajo de otra, se recortan) u hoja A4 de stickers (3 por fila).
// Imprime con useImprimir (src/utils/impresion.ts): en la app de escritorio directo a la impresora; en el
// navegador, con la ventana de impresión. Funciona sin internet (no pide nada al servidor).
import React, { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { Printer, Tag, X } from 'lucide-react';
import type { Product } from '../types';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { useImprimir } from '../../../utils/impresion';
import { avisar } from '../../../utils/dialogos';
import { CuerpoVentana, claseBotonBarra, claseBotonPrincipal } from '../../../components/ListaVentana';

type Tipo = 'PRECIO' | 'STICKER';
type Papel = '80' | '58' | 'A4';
const TIPOS: { valor: Tipo; texto: string }[] = [{ valor: 'PRECIO', texto: 'Precio para el estante' }, { valor: 'STICKER', texto: 'Sticker para el producto' }];
const PAPELES: { valor: Papel; texto: string }[] = [{ valor: '80', texto: 'Ticketera 80 mm' }, { valor: '58', texto: 'Ticketera 58 mm' }, { valor: 'A4', texto: 'Hoja A4 de stickers' }];
const ANCHO: Record<Papel, string> = { '80': '72mm', '58': '48mm', A4: '63mm' };

// Lo último elegido se recuerda en esta PC
const leer = (clave: string, defecto: string) => { try { return localStorage.getItem(clave) || defecto; } catch { return defecto; } };
const guardar = (clave: string, valor: string) => { try { localStorage.setItem(clave, valor); } catch { /* sin almacenamiento */ } };

const esPeso = (p: Product) => ['KG', 'GR', 'LT', 'ML'].includes(String(p.unit).toUpperCase()) || p.control_type === 'WEIGHT';
const codigoDeEtiqueta = (p: Product) => String(p.barcode || '').trim() || (p.code && p.code !== 'NO-SKU' ? String(p.code).trim() : '');

const CodigoBarras: React.FC<{ valor: string; alto: number; grosor: number }> = ({ valor, alto, grosor }) => {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!ref.current || !valor) return;
    try { JsBarcode(ref.current, valor, { format: 'CODE128', displayValue: false, margin: 0, height: alto, width: grosor }); } catch { /* código con caracteres raros */ }
    // JsBarcode reemplaza el estilo del svg (y los estilos base lo dejan pegado a la izquierda): se centra otra vez
    Object.assign(ref.current.style, { display: 'block', margin: '0 auto', maxWidth: '100%' });
  }, [valor, alto, grosor]);
  // Envuelto: JsBarcode reescribe el estilo del svg (se perdía el centrado)
  return <div style={{ textAlign: 'center', lineHeight: 0 }}><svg ref={ref} style={{ maxWidth: '100%', display: 'inline-block' }} /></div>;
};

// Una etiqueta (la misma en la vista previa y en la impresión)
const Etiqueta: React.FC<{ producto: Product; tipo: Tipo; papel: Papel }> = ({ producto: p, tipo, papel }) => {
  const codigo = codigoDeEtiqueta(p);
  const precio = `S/ ${Number(p.price || 0).toFixed(2)}${esPeso(p) ? ` x ${String(p.unit).toUpperCase()}` : ''}`;
  const chico = papel === '58';
  const caja: React.CSSProperties = {
    width: ANCHO[papel], boxSizing: 'border-box', padding: '2mm', fontFamily: 'Arial, Helvetica, sans-serif', color: '#000', background: '#fff',
    border: '1px dashed #999', pageBreakInside: 'avoid', breakInside: 'avoid', textAlign: 'center', overflow: 'hidden',
    ...(papel === 'A4' ? { height: '38mm' } : { marginBottom: '2mm' }),
  };
  if (tipo === 'PRECIO') {
    return (
      <div style={caja} data-etiqueta>
        <div style={{ fontSize: chico ? '10pt' : '12pt', fontWeight: 700, lineHeight: 1.15, maxHeight: '2.4em', overflow: 'hidden', textTransform: 'uppercase' }}>{p.name}</div>
        <div style={{ fontSize: chico ? '20pt' : '26pt', fontWeight: 900, lineHeight: 1.1, margin: '1mm 0' }}>{precio}</div>
        {codigo && <><CodigoBarras valor={codigo} alto={chico ? 18 : 22} grosor={1.2} /><div style={{ fontSize: '7pt' }}>{codigo}</div></>}
      </div>
    );
  }
  return (
    <div style={caja} data-etiqueta>
      {codigo && <><CodigoBarras valor={codigo} alto={chico ? 32 : 40} grosor={chico ? 1.4 : 1.8} /><div style={{ fontSize: '8pt', letterSpacing: '1px' }}>{codigo}</div></>}
      <div style={{ fontSize: chico ? '8pt' : '9pt', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'uppercase' }}>{p.name}</div>
      <div style={{ fontSize: chico ? '11pt' : '13pt', fontWeight: 900 }}>{precio}</div>
    </div>
  );
};

interface Props { producto: Product | null; onClose: () => void }

export const ModalEtiqueta: React.FC<Props> = ({ producto, onClose }) => {
  const [tipo, setTipo] = useState<Tipo>(() => (leer('siumax_etiqueta_tipo', 'PRECIO') === 'STICKER' ? 'STICKER' : 'PRECIO'));
  const [papel, setPapel] = useState<Papel>(() => { const v = leer('siumax_etiqueta_papel', '80'); return v === '58' || v === 'A4' ? v : '80'; });
  const [cantidad, setCantidad] = useState('1');
  const [listo, setListo] = useState('');
  const areaImpresion = useRef<HTMLDivElement>(null);
  const imprimir = useImprimir(areaImpresion, `Etiquetas ${producto?.name || ''}`);

  useCerrarConEscape(!!producto, onClose);
  // Al abrir, el selector en el tipo elegido (Inventario la crea de nuevo para cada producto: key)
  useEffect(() => {
    if (!producto) return;
    setTimeout(() => document.getElementById(`etiqueta-tipo-${tipo}`)?.focus(), 30);
  }, [producto]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!producto) return null;
  const codigo = codigoDeEtiqueta(producto);
  const n = Math.max(1, Math.min(200, Math.round(Number(cantidad) || 0)));

  const elegirTipo = (t: Tipo) => { setTipo(t); guardar('siumax_etiqueta_tipo', t); };
  const elegirPapel = (v: Papel) => { setPapel(v); guardar('siumax_etiqueta_papel', v); };
  const imprimirYa = async () => {
    if (!codigo && tipo === 'STICKER') { await avisar('Este producto no tiene código de barras ni código interno: ponle uno (Editar producto) para imprimir el sticker.'); return; }
    if (!Number(cantidad) || Number(cantidad) < 1) { await avisar('Escribe cuántas etiquetas quieres (de 1 a 200).'); document.getElementById('etiqueta-cantidad')?.focus(); return; }
    await imprimir();
    setListo(`Enviado a imprimir: ${n} etiqueta(s).`);
    document.getElementById('btn-imprimir-etiqueta')?.focus();
  };

  // Teclado: ↑ ↓ entre filas (X · tipo · cantidad · papel · Imprimir), ← → dentro de una fila, Enter elige
  const filas = ['btn-cerrar-etiqueta', 'fila-tipo', 'etiqueta-cantidad', 'fila-papel', 'btn-imprimir-etiqueta'];
  const filaDe = (el: HTMLElement) => (el.dataset.fila || el.id);
  const enfocarFila = (fila: string) => {
    if (fila === 'fila-tipo') document.getElementById(`etiqueta-tipo-${tipo}`)?.focus();
    else if (fila === 'fila-papel') document.getElementById(`etiqueta-papel-${papel}`)?.focus();
    else document.getElementById(fila)?.focus();
  };
  const teclas = (e: React.KeyboardEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const i = filas.indexOf(filaDe(el));
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const j = e.key === 'ArrowDown' ? Math.min(i + 1, filas.length - 1) : Math.max(i - 1, 0);
      enfocarFila(filas[j]);
    } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && el.dataset.fila) {
      e.preventDefault();
      const hermanos = Array.from(document.querySelectorAll<HTMLElement>(`[data-fila="${el.dataset.fila}"]`));
      const k = hermanos.indexOf(el) + (e.key === 'ArrowRight' ? 1 : -1);
      hermanos[(k + hermanos.length) % hermanos.length]?.focus();
    } else if (e.key === 'Enter' && el.id === 'etiqueta-cantidad') {
      e.preventDefault();
      enfocarFila('fila-papel');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 font-mono">
      <div role="dialog" aria-label="Imprimir etiquetas" className="bg-[var(--color-surface)] w-full max-w-2xl border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] flex flex-col max-h-[calc(94dvh/var(--ui-zoom))]">
        <div className="bg-[var(--color-ink)] text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Tag size={22} className="text-[var(--color-accent)] shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm font-black uppercase tracking-widest text-[var(--color-accent)]">Imprimir etiquetas</h2>
              <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest truncate">{producto.name}</p>
            </div>
          </div>
          <button id="btn-cerrar-etiqueta" onClick={onClose} onKeyDown={teclas}
            className="hover:text-[var(--color-danger)] focus:text-[var(--color-danger)] focus:outline-none focus:ring-2 focus:ring-red-400 focus:bg-white/20 p-1.5 cursor-pointer" title="Cerrar (Escape)">
            <X size={20} />
          </button>
        </div>

        <CuerpoVentana>
          <div className="border-2 border-[var(--color-border)] bg-white p-3 sm:p-4 flex flex-col gap-4 shrink-0">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-ink)] mb-2">Tipo de etiqueta</p>
              <div className="flex flex-wrap gap-2" role="listbox" aria-label="Tipo de etiqueta">
                {TIPOS.map((t) => (
                  <button key={t.valor} id={`etiqueta-tipo-${t.valor}`} type="button" role="option" aria-selected={tipo === t.valor} data-fila="fila-tipo"
                    onClick={() => elegirTipo(t.valor)} onKeyDown={teclas} className={`${claseBotonBarra(tipo === t.valor)} !h-[40px]`}>{t.texto}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="etiqueta-cantidad" className="text-[10px] font-black uppercase tracking-widest text-[var(--color-ink)]">Cuántas</label>
              <input id="etiqueta-cantidad" type="number" min="1" max="200" value={cantidad} onChange={(e) => setCantidad(e.target.value)}
                onFocus={(e) => e.currentTarget.select()} onKeyDown={teclas}
                className="w-24 border-2 border-[var(--color-border)] bg-white p-2 text-sm font-black text-right outline-none focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)]" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-ink)] mb-2">Papel</p>
              <div className="flex flex-wrap gap-2" role="listbox" aria-label="Papel">
                {PAPELES.map((v) => (
                  <button key={v.valor} id={`etiqueta-papel-${v.valor}`} type="button" role="option" aria-selected={papel === v.valor} data-fila="fila-papel"
                    onClick={() => elegirPapel(v.valor)} onKeyDown={teclas} className={`${claseBotonBarra(papel === v.valor)} !h-[40px]`}>{v.texto}</button>
                ))}
              </div>
            </div>
            {!codigo && <p className="text-xs font-bold text-[var(--color-warning-text)]">Este producto no tiene código de barras ni código interno: la etiqueta de precio sale sin código.</p>}
          </div>

          {/* Vista previa (tal como sale) */}
          <div className="border-2 border-[var(--color-border)] bg-white p-3 sm:p-4 flex flex-col items-center gap-2 shrink-0">
            <p className="self-start text-[10px] font-black uppercase tracking-widest text-[var(--color-muted)]">Vista previa</p>
            <div id="vista-previa-etiqueta"><Etiqueta producto={producto} tipo={tipo} papel={papel} /></div>
          </div>

          <div className="flex items-center justify-end gap-3 shrink-0">
            {listo && <span role="status" className="mr-auto text-xs font-black text-[var(--color-accent)] uppercase">{listo}</span>}
            <button id="btn-imprimir-etiqueta" type="button" onClick={() => void imprimirYa()} onKeyDown={teclas} className={claseBotonPrincipal}>
              <Printer size={16} /> Imprimir {n} {n === 1 ? 'etiqueta' : 'etiquetas'}
            </button>
          </div>
        </CuerpoVentana>

        {/* Lo que se imprime: N etiquetas (fuera de la pantalla) */}
        <div style={{ position: 'absolute', left: '-10000px', top: 0 }} aria-hidden="true">
          <div ref={areaImpresion} id="area-impresion-etiquetas"
            style={papel === 'A4' ? { display: 'grid', gridTemplateColumns: 'repeat(3, 63mm)', gap: '2mm', padding: '8mm', background: '#fff' } : { width: papel === '58' ? '48mm' : '72mm', background: '#fff' }}>
            {Array.from({ length: n }, (_, i) => <Etiqueta key={i} producto={producto} tipo={tipo} papel={papel} />)}
          </div>
        </div>
      </div>
    </div>
  );
};
