// src/sections/Inventario/components/ModalProduccion.tsx
// ARMAR PRODUCTO (botón de Inventario, antes "Producir"; pedido del dueño 06/11/2026): al abrir se elige
//  - TALLAS Y COLORES: un producto con varias tallas/colores (product_variants), cada una con su precio y código de
//    barras opcionales. "Guardar e ir a Lotes" abre Ingresar lote (pide cuántas llegaron de cada talla).
//  - COMBOS Y RECETAS (desde el 05/11/2026; antes en Nuevo producto):
//  - LISTA: los combos y recetas, cuántos alcanzan con el stock de hoy; Producir (recetas) y Cambiar.
//  - FORMULARIO (nuevo o cambiar): 1. nombre → 2. productos que usa (cantidad por unidad) → 3. combo o receta →
//    4. precio y categoría (con lo que cuesta armarlo y la ganancia) → Guardar / Producir ahora / Ir a Lotes.
//  - PRODUCIR una receta: fn_producir_receta descuenta los insumos (lotes más antiguos primero) y crea el lote con el
//    costo real. TOPE: no deja producir más de lo que alcanza el insumo que se acaba primero.
// Combo = se descuentan sus partes al venderlo (no se produce). Receta = se prepara antes con Producir.
// El costo adicional (gas, mano de obra) se guarda POR UNIDAD; al producir se manda por todo el lote (× cantidad).
// Antes esto estaba en Nuevo producto › opciones avanzadas (ahí ahora solo queda un botón que abre esta ventana).
import React, { useEffect, useMemo, useState } from 'react';
import { ChefHat, Boxes, Plus, Trash2, X, Search, ChevronDown, Layers } from 'lucide-react';
import { supabase } from '../../../db/supabase';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { avisar, confirmar } from '../../../utils/dialogos';
import { coincideBusqueda } from '../../../utils/busqueda';
import { formatearCantidad } from '../../../utils/formato';
import { useEmpleado, usePermiso } from '../../../utils/permisos';
import { CuerpoVentana, CajaLista, FilaLista, LineaDato, Etiqueta, DatoFila, claseBotonBarra, claseBotonPrincipal } from '../../../components/ListaVentana';
import type { Product } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;               // recargar productos y lotes de Inventario
  productos: Product[];
  productoInicial?: Product | null;     // desde la fila (gorrito) o desde "Cambiar sus productos" de Nuevo producto
  onIrALotes?: (nombre: string) => void; // pestaña Lotes buscando ese producto
  paraCambiar?: boolean;                 // desde "Cambiar sus productos en Producir": abre el formulario, no Producir
  onIngresarLote?: (producto: Product) => void; // "Guardar e ir a Lotes" de Tallas y colores: abre Ingresar lote
}

type Tipo = 'COMBO' | 'RECETA';
type Vista = 'LISTA' | 'FORM' | 'PRODUCIR' | 'TALLAS';
// Una fila de Tallas y colores (id = la variante ya guardada)
interface FilaTalla { id?: string | number; talla: string; color: string; precio: string; barcode: string; stock?: number }
interface Insumo { component_product_id: string; component_variant_id?: string | number | null; quantity: number }
// Lo que se está produciendo (recién guardado o elegido de la lista)
interface Elegido { id: string; name: string; unit: string; costoAdicional: number; insumos: Insumo[] }

const enfocar = (id: string) => setTimeout(() => document.getElementById(id)?.focus(), 40);
const soles = (n: number) => `S/ ${(Number(n) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const ModalProduccion: React.FC<Props> = ({ isOpen, onClose, onSuccess, productos, productoInicial, onIrALotes, paraCambiar, onIngresarLote }) => {
  const empleado = useEmpleado();
  const puedeCrear = usePermiso('almacen_crear_editar_productos');
  const [vista, setVista] = useState<Vista>('LISTA');
  const [recetas, setRecetas] = useState<Record<string, Insumo[]>>({});
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  // Formulario
  const [editId, setEditId] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [listaAbierta, setListaAbierta] = useState(false);
  const [elegidoInsumo, setElegidoInsumo] = useState<Product | null>(null);
  const [cantInsumo, setCantInsumo] = useState('1');
  const [tipo, setTipo] = useState<Tipo | null>(null);
  const [costoAdic, setCostoAdic] = useState('');
  const [precio, setPrecio] = useState('');
  const [categoria, setCategoria] = useState('');
  const [catAbierta, setCatAbierta] = useState(false);
  // Producir
  const [elegido, setElegido] = useState<Elegido | null>(null);
  const [desdeGuardar, setDesdeGuardar] = useState(false); // llegó a Producir desde "Guardar e ir a Lotes"
  const [cantidad, setCantidad] = useState('1');
  // Gasto extra de TODO el lote (lo que se escribe). Mientras no se toque, se propone: lo guardado por unidad × cantidad
  const [costoAdicProd, setCostoAdicProd] = useState('0');
  const [adicEditado, setAdicEditado] = useState(false);
  const [avisoTope, setAvisoTope] = useState('');
  // Tallas y colores
  const [tallas, setTallas] = useState<FilaTalla[]>([]);
  const [tallasQuitadas, setTallasQuitadas] = useState<(string | number)[]>([]);

  useCerrarConEscape(isOpen, onClose);

  const porId = useMemo(() => new Map(productos.map((p) => [String(p.id), p])), [productos]);
  const compuestos = useMemo(() => productos.filter((p) => p.activo !== false && (p.tipoCompuesto === 'COMBO' || p.tipoCompuesto === 'RECETA')), [productos]);
  const tieneTallas = (p: Product) => Boolean(p.tieneVariantes || (p.variantes && p.variantes.length > 0));
  const conTallas = useMemo(() => productos.filter((p) => p.activo !== false && tieneTallas(p) && p.tipoCompuesto !== 'COMBO' && p.tipoCompuesto !== 'RECETA'), [productos]); // eslint-disable-line react-hooks/exhaustive-deps
  // La lista de abajo: primero los de tallas, luego combos y recetas
  const armados = useMemo(() => [...conTallas.map((p) => ({ p, clase: 'TALLAS' as const })), ...compuestos.map((p) => ({ p, clase: p.tipoCompuesto as Tipo }))], [conTallas, compuestos]);
  // Categorías: la misma tabla que Nuevo producto (categories), para crear y borrar igual que ahí
  const [categorias, setCategorias] = useState<string[]>([]);
  useEffect(() => {
    if (!isOpen) return;
    void supabase.from('categories').select('name').then(({ data }) => {
      setCategorias(Array.from(new Set((data || []).map((x: { name?: string }) => String(x.name || '').trim().toUpperCase()).filter(Boolean))).sort());
    });
  }, [isOpen]);
  const crearCategoria = async (nombreCat: string) => {
    const nueva = nombreCat.trim().toUpperCase();
    if (!nueva) return;
    if (!categorias.includes(nueva)) {
      setCategorias((l) => [...l, nueva].sort());
      const { error } = await supabase.from('categories').insert([{ id: Date.now(), name: nueva, is_synced: 1 }]);
      if (error) console.error('No se pudo crear la categoría:', error);
    }
    setCategoria(nueva); setCatAbierta(false); enfocar('input-categoria-compuesto');
  };
  const eliminarCategoria = async (cat: string) => {
    if (!(await confirmar(`¿Eliminar la categoría "${cat}" DEFINITIVAMENTE?\n(Los productos que ya la tienen no cambian.)`))) { enfocar('input-categoria-compuesto'); return; }
    setCategorias((l) => l.filter((x) => x !== cat));
    if (categoria.trim().toUpperCase() === cat) setCategoria('');
    const { error } = await supabase.from('categories').delete().eq('name', cat);
    if (error) console.error('No se pudo eliminar la categoría:', error);
    enfocar('input-categoria-compuesto');
  };

  // Al abrir: se leen todas las recetas (es una tabla chica) y se va a donde corresponde
  useEffect(() => {
    if (!isOpen) return;
    let vigente = true;
    setCargando(true);
    (async () => {
      const { data } = await supabase.from('product_recipes').select('*');
      if (!vigente) return;
      const mapa: Record<string, Insumo[]> = {};
      (data || []).forEach((r: any) => {
        const k = String(r.parent_product_id);
        (mapa[k] ||= []).push({ component_product_id: String(r.component_product_id), component_variant_id: r.component_variant_id, quantity: Number(r.quantity) || 1 });
      });
      setRecetas(mapa);
      setCargando(false);
      const p = productoInicial;
      if (p && !paraCambiar && p.tipoCompuesto === 'RECETA' && (mapa[String(p.id)] || []).length) irAProducir(p, mapa[String(p.id)]);
      else if (p && (p.tipoCompuesto === 'COMBO' || p.tipoCompuesto === 'RECETA')) abrirFormulario(p, mapa[String(p.id)] || []);
      else if (p && tieneTallas(p)) abrirTallas(p);
      else { setVista('LISTA'); enfocar('btn-nuevo-tallas'); }
    })();
    return () => { vigente = false; };
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Stock de un insumo (si es una variante, el de la variante)
  const stockDe = (i: Insumo) => {
    const p = porId.get(String(i.component_product_id));
    if (i.component_variant_id && p?.variantes) {
      const v = (p.variantes as any[]).find((x) => String(x.id) === String(i.component_variant_id));
      if (v) return Number(v.quantity) || 0;
    }
    return Math.max(0, Number(p?.quantity) || 0);
  };
  const nombreDe = (i: Insumo) => {
    const p = porId.get(String(i.component_product_id));
    const v = i.component_variant_id && p?.variantes ? (p.variantes as any[]).find((x) => String(x.id) === String(i.component_variant_id)) : null;
    return `${p?.name || `Producto #${i.component_product_id}`}${v ? ` (${v.nombre_variante || [v.talla, v.color].filter(Boolean).join(' ')})` : ''}`;
  };
  const unidadDe = (i: Insumo) => porId.get(String(i.component_product_id))?.unit || 'UND';
  const costoDe = (i: Insumo) => (Number(porId.get(String(i.component_product_id))?.cost) || 0) * i.quantity;

  // TOPE: cuántos alcanzan con el stock de hoy y qué insumo lo limita (el que se acaba primero)
  const tope = (lista: Insumo[]) => {
    if (!lista.length) return { max: 0, limita: null as Insumo | null };
    let max = Infinity; let limita: Insumo | null = null;
    for (const i of lista) {
      const n = i.quantity > 0 ? Math.floor(stockDe(i) / i.quantity + 1e-9) : 0;
      if (n < max) { max = n; limita = i; }
    }
    return { max: Math.max(0, max), limita };
  };
  const textoLimita = (t: ReturnType<typeof tope>) => t.limita
    ? `lo limita ${nombreDe(t.limita)} (hay ${formatearCantidad(stockDe(t.limita), unidadDe(t.limita))} ${unidadDe(t.limita)}, cada uno usa ${formatearCantidad(t.limita.quantity, unidadDe(t.limita))})`
    : '';

  // ---------- FORMULARIO ----------
  const abrirFormulario = (p: Product | null, lista: Insumo[] = []) => {
    setDesdeGuardar(false);
    setEditId(p ? String(p.id) : null);
    setNombre(p?.name || '');
    setInsumos(lista.map((i) => ({ ...i })));
    setTipo(p ? (p.tipoCompuesto as Tipo) : null);
    setCostoAdic(p && Number(p.costoAdicionalProduccion) ? String(p.costoAdicionalProduccion) : '');
    setPrecio(p && Number(p.price) ? String(p.price) : '');
    setCategoria(p?.category || '');
    setBusqueda(''); setElegidoInsumo(null); setCantInsumo('1'); setListaAbierta(false);
    setVista('FORM');
    enfocar('input-nombre-compuesto');
  };

  const candidatos = useMemo(() => {
    const t = busqueda.trim();
    if (!t) return [];
    return productos
      .filter((p) => p.activo !== false && String(p.id) !== editId && p.tipoCompuesto !== 'COMBO')
      .filter((p) => coincideBusqueda([p.name, p.code, p.barcode, p.marca], t))
      .slice(0, 12);
  }, [productos, busqueda, editId]);

  const elegirInsumo = (p: Product) => {
    setElegidoInsumo(p); setBusqueda(p.name); setListaAbierta(false);
    enfocar('input-buscar-insumo-prod'); // vuelve a donde salió; a la cantidad se pasa con →
  };

  const agregarInsumo = async () => {
    const p = elegidoInsumo || candidatos[0];
    const cant = Number(cantInsumo);
    if (!p) { await avisar('Busca y elige un producto para agregar.'); enfocar('input-buscar-insumo-prod'); return; }
    if (!(cant > 0)) { await avisar('Escribe cuánto usa cada unidad (más de 0).'); enfocar('input-cant-insumo-prod'); return; }
    setInsumos((prev) => {
      const ya = prev.find((i) => i.component_product_id === String(p.id) && !i.component_variant_id);
      return ya ? prev.map((i) => (i === ya ? { ...i, quantity: i.quantity + cant } : i)) : [...prev, { component_product_id: String(p.id), quantity: cant }];
    });
    setElegidoInsumo(null); setBusqueda(''); setCantInsumo('1');
  };

  const categoriasFiltradas = categorias.filter((c) => !categoria.trim() || c.includes(categoria.trim().toUpperCase()));
  const costoArmar = insumos.reduce((a, i) => a + costoDe(i), 0) + (tipo === 'RECETA' ? Number(costoAdic) || 0 : 0);
  const ganancia = (Number(precio) || 0) - costoArmar;
  const topeForm = tope(insumos);

  // Guarda el combo o receta; devuelve el id (o null si no se pudo)
  const guardarCompuesto = async (): Promise<string | null> => {
    const n = nombre.trim().toUpperCase();
    if (n.length < 2) { await avisar('Escribe el nombre.'); enfocar('input-nombre-compuesto'); return null; }
    if (!insumos.length) { await avisar('Agrega los productos que usa.'); enfocar('input-buscar-insumo-prod'); return null; }
    if (!tipo) { await avisar('Elige cómo se vende: Combo o Receta.'); enfocar('btn-tipo-compuesto-COMBO'); return null; }
    if (!(Number(precio) > 0)) { await avisar('Escribe el precio de venta.'); enfocar('input-precio-compuesto'); return null; }
    setGuardando(true);
    try {
      const datos = {
        name: n,
        category: categoria.trim().toUpperCase() || 'GENERAL',
        price: Number(precio),
        tipo_compuesto: tipo,
        costo_adicional_produccion: tipo === 'RECETA' ? Number(costoAdic) || 0 : 0,
      };
      const cat = categoria.trim().toUpperCase();
      if (cat && !categorias.includes(cat)) {
        setCategorias((l) => [...l, cat].sort());
        await supabase.from('categories').insert([{ id: Date.now(), name: cat, is_synced: 1 }]);
      }
      let id = editId;
      if (id) {
        const { error } = await supabase.from('products').update(datos).eq('id', id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('products').insert([{
          ...datos,
          code: `SKU-${Math.floor(100000 + Math.random() * 900000)}`,
          quantity: 0, min_stock: 0, control_type: 'UND', unit: 'UND', sunat_unit_code: 'NIU',
          tipo_igv: 'GRAVADO', mostrar_en_catalogo: true, is_synced: '1', is_active: 1,
        }]).select().single();
        if (error) throw error;
        id = String(data.id);
      }
      // Sus productos: se reemplazan todos (como hacía Nuevo producto)
      const { error: e1 } = await supabase.from('product_recipes').delete().eq('parent_product_id', id);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from('product_recipes').insert(insumos.map((i) => ({
        parent_product_id: id, component_product_id: i.component_product_id, component_variant_id: i.component_variant_id || null, quantity: i.quantity,
      })));
      if (e2) throw e2;
      setRecetas((r) => ({ ...r, [id as string]: insumos }));
      onSuccess?.();
      return id;
    } catch (e) {
      const m = (e as { message?: string; code?: string });
      await avisar(m.code === '23505' ? 'Ya existe un producto con ese código. Vuelve a guardar.' : `No se pudo guardar: ${m.message || e}`);
      enfocar('btn-guardar-compuesto');
      return null;
    } finally {
      setGuardando(false);
    }
  };

  const alGuardar = async (luego: 'LISTA' | 'LOTES') => {
    if (guardando) return;
    const id = await guardarCompuesto();
    if (!id) return;
    const n = nombre.trim().toUpperCase();
    if (luego === 'LOTES') {
      // A la pantalla del lote: "¿Cuántos vas a producir?" con el tope (descuenta los insumos y crea el lote con su costo)
      irAProducir({ id, name: n, unit: 'UND', costoAdicionalProduccion: tipo === 'RECETA' ? Number(costoAdic) || 0 : 0 } as unknown as Product, insumos);
      setDesdeGuardar(true);
    } else {
      // Guardar: solo guarda y cierra la ventana
      onClose();
      void avisar(`✔ ${n} guardado como ${tipo === 'COMBO' ? 'combo' : 'receta'}.`);
    }
  };

  // ---------- TALLAS Y COLORES ----------
  const filaVacia = (): FilaTalla => ({ talla: '', color: '', precio: '', barcode: '' });
  const abrirTallas = (p: Product | null) => {
    setDesdeGuardar(false);
    setEditId(p ? String(p.id) : null);
    setNombre(p?.name || '');
    setPrecio(p && Number(p.price) ? String(p.price) : '');
    setCategoria(p?.category || '');
    setCatAbierta(false);
    const vars = (p?.variantes || []) as any[];
    setTallas(vars.length ? vars.map((v) => ({ id: v.id, talla: v.talla || '', color: v.color || '', precio: v.price != null && v.price !== '' ? String(v.price) : '', barcode: v.barcode || '', stock: Number(v.quantity) || 0 })) : [filaVacia()]);
    setTallasQuitadas([]);
    setVista('TALLAS');
    enfocar('input-nombre-tallas');
  };
  const cambiarFila = (idx: number, campo: keyof FilaTalla, valor: string) => setTallas((l) => l.map((t, k) => (k === idx ? { ...t, [campo]: valor } : t)));
  const agregarFila = () => { const n = tallas.length; setTallas((l) => [...l, filaVacia()]); enfocar(`talla-talla-${n}`); };
  const quitarFila = (idx: number) => {
    const t = tallas[idx];
    if (t?.id != null) setTallasQuitadas((q) => [...q, t.id as string | number]);
    const quedan = tallas.length - 1;
    setTallas((l) => l.filter((_, k) => k !== idx));
    enfocar(quedan > 0 ? `btn-quitar-talla-${Math.min(idx, quedan - 1)}` : 'btn-agregar-talla');
  };

  // Guarda el producto con sus tallas y colores; devuelve el producto (o null)
  const guardarTallas = async (): Promise<Product | null> => {
    const n = nombre.trim().toUpperCase();
    const filas = tallas.filter((t) => t.talla.trim() || t.color.trim() || t.barcode.trim() || t.precio.trim());
    if (n.length < 2) { await avisar('Escribe el nombre.'); enfocar('input-nombre-tallas'); return null; }
    if (!(Number(precio) > 0)) { await avisar('Escribe el precio de venta.'); enfocar('input-precio-tallas'); return null; }
    if (!filas.length) { await avisar('Agrega al menos una talla o color.'); enfocar('talla-talla-0'); return null; }
    const sinNombre = filas.findIndex((t) => !t.talla.trim() && !t.color.trim());
    if (sinNombre >= 0) { await avisar('Cada fila necesita su talla o su color.'); enfocar(`talla-talla-${tallas.indexOf(filas[sinNombre])}`); return null; }
    const claves = filas.map((t) => `${t.talla.trim().toUpperCase()}|${t.color.trim().toUpperCase()}`);
    if (new Set(claves).size !== claves.length) { await avisar('Hay dos filas con la misma talla y color.'); return null; }
    setGuardando(true);
    try {
      const cat = categoria.trim().toUpperCase();
      if (cat && !categorias.includes(cat)) {
        setCategorias((l) => [...l, cat].sort());
        await supabase.from('categories').insert([{ id: Date.now(), name: cat, is_synced: 1 }]);
      }
      const datos = { name: n, category: cat || 'GENERAL', price: Number(precio), tiene_variantes: true };
      let id = editId;
      if (id) {
        const { error } = await supabase.from('products').update(datos).eq('id', id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('products').insert([{
          ...datos,
          code: `SKU-${Math.floor(100000 + Math.random() * 900000)}`,
          quantity: 0, min_stock: 0, control_type: 'UND', unit: 'UND', sunat_unit_code: 'NIU',
          tipo_igv: 'GRAVADO', mostrar_en_catalogo: true, tipo_compuesto: 'ESTANDAR', is_synced: '1', is_active: 1,
        }]).select().single();
        if (error) throw error;
        id = String(data.id);
      }
      // Cada talla/color: las nuevas se crean con stock 0 (el stock entra por Ingresar lote); a las ya guardadas
      // solo se les cambian sus datos (nunca el stock); las quitadas quedan inactivas (su historial no se pierde)
      const guardadas: any[] = [];
      for (const t of filas) {
        const datosVar = {
          product_id: id,
          nombre_variante: `${t.talla.trim()} ${t.color.trim()}`.trim().toUpperCase(),
          talla: t.talla.trim().toUpperCase() || null,
          color: t.color.trim().toUpperCase() || null,
          barcode: t.barcode.trim() || null,
          price: t.precio.trim() !== '' ? Number(t.precio) : null,
          is_active: 1, is_synced: 1,
        };
        if (t.id != null) {
          const { data, error } = await supabase.from('product_variants').update(datosVar).eq('id', t.id).select().single();
          if (error) throw error;
          guardadas.push(data);
        } else {
          const { data, error } = await supabase.from('product_variants').insert([{ ...datosVar, quantity: 0, min_stock: 2 }]).select().single();
          if (error) throw error;
          guardadas.push(data);
        }
      }
      for (const q of tallasQuitadas) {
        const { error } = await supabase.from('product_variants').update({ is_active: 0 }).eq('id', q);
        if (error) throw error;
      }
      onSuccess?.();
      return { id, name: n, price: Number(precio), cost: 0, quantity: 0, minStock: 0, code: '', barcode: '', category: cat || 'GENERAL', unit: 'UND', tieneVariantes: true, variantes: guardadas } as unknown as Product;
    } catch (e) {
      const m = (e as { message?: string; code?: string });
      await avisar(m.code === '23505' ? 'Ese código de barras ya lo tiene otro producto o talla.' : `No se pudo guardar: ${m.message || e}`);
      return null;
    } finally {
      setGuardando(false);
    }
  };
  const alGuardarTallas = async (luego: 'CERRAR' | 'LOTES') => {
    if (guardando) return;
    const p = await guardarTallas();
    if (!p) return;
    onClose();
    if (luego === 'LOTES') onIngresarLote?.(p);
    else void avisar(`✔ ${p.name} guardado con ${(p.variantes || []).length} talla(s) / color(es).`);
  };

  // ---------- PRODUCIR ----------
  const irAProducir = (p: Product, lista: Insumo[]) => {
    setDesdeGuardar(false);
    setElegido({ id: String(p.id), name: p.name, unit: p.unit || 'UND', costoAdicional: Number(p.costoAdicionalProduccion) || 0, insumos: lista });
    const t = tope(lista);
    setCantidad(t.max > 0 ? '1' : '0');
    setCostoAdicProd('0');
    setAdicEditado(false);
    setAvisoTope('');
    setVista('PRODUCIR');
    setTimeout(() => { const c = document.getElementById('input-cantidad-produccion') as HTMLInputElement | null; c?.focus(); c?.select(); }, 60);
  };
  const topeProd = elegido ? tope(elegido.insumos) : { max: 0, limita: null };
  const cambiarCantidad = (v: string) => {
    const n = Math.floor(Number(v));
    if (v !== '' && n > topeProd.max) {
      setCantidad(String(topeProd.max));
      setAvisoTope(`Solo alcanza para ${topeProd.max}: ${textoLimita(topeProd)}.`);
    } else { setCantidad(v); setAvisoTope(''); }
  };
  const cantProd = Math.floor(Number(cantidad) || 0);
  const costoInsumosProd = elegido ? elegido.insumos.reduce((a, i) => a + costoDe(i), 0) * cantProd : 0;
  const costoAdicTotal = adicEditado ? (Number(costoAdicProd) || 0) : Math.round((elegido?.costoAdicional || 0) * cantProd * 100) / 100;
  const adicPorUnidad = cantProd > 0 ? costoAdicTotal / cantProd : 0;
  const costoUnitProd = cantProd > 0 ? (costoInsumosProd + costoAdicTotal) / cantProd : 0;

  const producir = async () => {
    if (!elegido || guardando) return;
    if (topeProd.max <= 0) { await avisar(`No alcanza para producir ni 1: ${textoLimita(topeProd)}.`); return; }
    if (!(cantProd > 0)) { await avisar('Escribe cuántos vas a producir (1 o más).'); enfocar('input-cantidad-produccion'); return; }
    if (cantProd > topeProd.max) { cambiarCantidad(String(cantProd)); return; }
    setGuardando(true);
    try {
      const { data, error } = await supabase.rpc('fn_producir_receta', {
        p_product_id: Number(elegido.id),
        p_cantidad: cantProd,
        p_costo_adicional: costoAdicTotal,          // la función lo recibe por TODO el lote
        p_usuario: empleado?.nombre || 'Sistema',
      });
      if (error) throw error;
      if (adicEditado && cantProd > 0) {
        // (si no hay permiso para cambiar productos, no pasa nada: solo no se recuerda)
        await supabase.from('products').update({ costo_adicional_produccion: Math.round(adicPorUnidad * 100) / 100 }).eq('id', elegido.id);
      }
      onSuccess?.();
      const ir = await confirmar(`✔ Producidos ${cantProd} ${elegido.unit} de ${elegido.name}.\nLote ${data?.batch_code || ''} · costo por unidad ${soles(Number(data?.cost_unit ?? costoUnitProd))}.\n\n¿Ver sus lotes?`);
      if (ir) { onClose(); onIrALotes?.(elegido.name); }
      else { setVista('LISTA'); enfocar('btn-nuevo-compuesto'); }
    } catch (e) {
      await avisar(`No se pudo producir: ${(e as Error).message}`);
      enfocar('btn-producir-ahora');
    } finally {
      setGuardando(false);
    }
  };

  if (!isOpen) return null;

  const etiquetaCampo = 'text-[10px] font-black text-[var(--color-ink)] uppercase tracking-widest mb-2 block';
  const claseCampo = 'w-full bg-white border-2 border-[var(--color-border)] p-3 text-xs font-black text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)]';
  const items = () => Array.from(document.querySelectorAll('[data-insumo-prod="true"]')) as HTMLElement[];

  // Tabla de productos que usa (formulario y producir)
  const tablaInsumos = (lista: Insumo[], cant: number | null, quitar?: (i: number) => void) => (
    <div className="border-2 border-[var(--color-border)] bg-white">
      <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-[var(--color-muted)] border-b-2 border-[var(--color-border)]">
        <span className="col-span-5">Producto</span>
        <span className="col-span-2 text-right">Por unidad</span>
        <span className="col-span-2 text-right">{cant !== null ? 'Necesitas' : 'Costo'}</span>
        <span className={`${quitar ? 'col-span-2' : 'col-span-3'} text-right`}>Hay</span>
        {quitar && <span className="col-span-1" />}
      </div>
      {lista.map((i, idx) => {
        const u = unidadDe(i);
        const necesita = cant !== null ? cant * i.quantity : 0;
        const falta = cant !== null && stockDe(i) < necesita;
        return (
          <div key={`${i.component_product_id}-${i.component_variant_id ?? ''}`} className={`grid grid-cols-12 gap-2 px-3 py-2 items-center text-xs border-b border-[var(--color-border)] last:border-b-0 ${falta ? 'bg-[var(--color-danger-bg)]' : ''}`}>
            <span className="col-span-5 font-black uppercase text-[var(--color-ink)] truncate" title={nombreDe(i)}>{nombreDe(i)}</span>
            <span className="col-span-2 text-right font-bold text-[var(--color-ink)]">{formatearCantidad(i.quantity, u)} {u}</span>
            <span className="col-span-2 text-right font-bold text-[var(--color-ink)]">{cant !== null ? `${formatearCantidad(necesita, u)} ${u}` : soles(costoDe(i))}</span>
            <span className={`${quitar ? 'col-span-2' : 'col-span-3'} text-right font-black ${falta || stockDe(i) < i.quantity ? 'text-[var(--color-danger)]' : 'text-[var(--color-accent)]'}`}>{formatearCantidad(stockDe(i), u)} {u}</span>
            {quitar && (
              <span className="col-span-1 flex justify-end">
                <button id={`btn-quitar-insumo-prod-${idx}`} type="button" onClick={() => quitar(idx)} title="Quitar"
                  className="p-1.5 border-2 border-transparent text-[var(--color-danger)] hover:border-[var(--color-danger)] focus:outline-none focus:border-[var(--color-danger)] cursor-pointer">
                  <Trash2 size={14} />
                </button>
              </span>
            )}
          </div>
        );
      })}
    </div>
  );

  // Categoría (Combos/recetas y Tallas y colores): lista del sistema; crea y borra categorías como Nuevo producto
  const campoCategoria = (
                <div className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setCatAbierta(false); }}>
                  <label htmlFor="input-categoria-compuesto" className={etiquetaCampo}>Categoría</label>
                  <input id="input-categoria-compuesto" type="text" autoComplete="off" spellCheck={false} placeholder="GENERAL" value={categoria}
                    onChange={(e) => { setCategoria(e.target.value); setCatAbierta(true); }}
                    onClick={() => setCatAbierta((v) => !v)}
                    onKeyDown={(e) => {
                      const items = () => Array.from(document.querySelectorAll('[data-cat-prod="true"]')) as HTMLElement[];
                      if (e.key === 'Enter') {
                        // Enter no pasa al siguiente cuadro. Con algo escrito y sin elegir de la lista: se guarda LO ESCRITO;
                        // vacío: abre la lista para elegir (de la lista se elige con ↓ y Enter, o clic)
                        e.preventDefault();
                        if (!catAbierta) setCatAbierta(true);
                        else if (categoria.trim()) void crearCategoria(categoria);
                        else setCatAbierta(false);
                      } else if (e.key === 'ArrowDown' && catAbierta && items().length) { e.preventDefault(); items()[0]?.focus(); }
                      else if (e.key === 'Escape' && catAbierta) { e.preventDefault(); e.stopPropagation(); setCatAbierta(false); }
                    }}
                    className={`${claseCampo} uppercase pr-9`} />
                  <ChevronDown size={16} className={`absolute right-3 top-[38px] text-[var(--color-muted)] pointer-events-none transition-transform ${catAbierta ? 'rotate-180' : ''}`} />
                  {catAbierta && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-[var(--color-ink)] z-50 max-h-56 overflow-y-auto">
                      {/* Lo escrito no existe: opción para crearla (como en Nuevo producto) */}
                      {categoria.trim() && !categorias.includes(categoria.trim().toUpperCase()) && (
                        <div role="option" tabIndex={0} data-cat-prod="true" id="cat-prod-crear"
                          onClick={() => void crearCategoria(categoria)}
                          onKeyDown={(e) => {
                            const l = Array.from(document.querySelectorAll('[data-cat-prod="true"]')) as HTMLElement[]; const i = l.indexOf(e.currentTarget);
                            if (e.key === 'ArrowDown') { e.preventDefault(); l[i + 1]?.focus(); }
                            else if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById('input-categoria-compuesto')?.focus(); }
                            else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); void crearCategoria(categoria); }
                            else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setCatAbierta(false); enfocar('input-categoria-compuesto'); }
                          }}
                          className="flex items-center gap-2 p-3 border-b-2 border-[var(--color-ink)] cursor-pointer outline-none text-xs font-black uppercase text-[var(--color-accent)] hover:bg-[var(--color-ink)] hover:text-white focus:bg-[var(--color-ink)] focus:text-white">
                          <Plus size={14} className="shrink-0" /> Crear nueva categoría «{categoria.trim().toUpperCase()}»
                        </div>
                      )}
                      {categoriasFiltradas.map((cat) => (
                        <div key={cat} role="option" tabIndex={0} data-cat-prod="true" aria-selected={categoria.toUpperCase() === cat}
                          onClick={() => { setCategoria(cat); setCatAbierta(false); enfocar('input-categoria-compuesto'); }}
                          onKeyDown={(e) => {
                            if (e.target !== e.currentTarget) return;
                            const l = Array.from(document.querySelectorAll('[data-cat-prod="true"]')) as HTMLElement[]; const i = l.indexOf(e.currentTarget);
                            if (e.key === 'ArrowDown') { e.preventDefault(); l[i + 1]?.focus(); }
                            else if (e.key === 'ArrowUp') { e.preventDefault(); (i > 0 ? l[i - 1] : document.getElementById('input-categoria-compuesto'))?.focus(); }
                            else if (e.key === 'ArrowRight') { e.preventDefault(); (e.currentTarget.querySelector('[data-borrar-cat]') as HTMLElement | null)?.focus(); }
                            else if (e.key === 'Delete') { e.preventDefault(); void eliminarCategoria(cat); }
                            else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCategoria(cat); setCatAbierta(false); enfocar('input-categoria-compuesto'); }
                            else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setCatAbierta(false); enfocar('input-categoria-compuesto'); }
                          }}
                          className="group flex items-center justify-between gap-3 p-3 border-b border-[var(--color-border)] cursor-pointer outline-none text-xs font-black uppercase text-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-white focus:bg-[var(--color-ink)] focus:text-white">
                          <span className="truncate">{cat}</span>
                          <button type="button" data-borrar-cat="true" title={`Eliminar categoría ${cat} (Supr)`}
                            onClick={(e) => { e.stopPropagation(); void eliminarCategoria(cat); }}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); void eliminarCategoria(cat); }
                              else if (e.key === 'ArrowLeft') { e.preventDefault(); (e.currentTarget.closest('[data-cat-prod="true"]') as HTMLElement | null)?.focus(); }
                              else if (e.key === 'Escape') { e.preventDefault(); setCatAbierta(false); enfocar('input-categoria-compuesto'); }
                              else if (['ArrowUp', 'ArrowDown', 'ArrowRight'].includes(e.key)) e.preventDefault();
                            }}
                            className="shrink-0 p-1 border-2 border-transparent text-[var(--color-muted)] group-hover:text-white group-focus:text-white hover:!text-[var(--color-danger)] focus:outline-none focus:!bg-[var(--color-danger)] focus:!text-white cursor-pointer">
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                      {!categoriasFiltradas.length && !categoria.trim() && (
                        <div className="p-3 text-[11px] font-black uppercase text-[var(--color-muted)]">Todavía no hay categorías: escribe una y presiona Enter</div>
                      )}
                    </div>
                  )}
                </div>
  );

  const titulo = vista === 'FORM' ? (editId ? 'Cambiar combo o receta' : 'Nuevo combo o receta') : vista === 'PRODUCIR' ? `${desdeGuardar ? 'Crear lote' : 'Producir'}: ${elegido?.name || ''}` : vista === 'TALLAS' ? (editId ? 'Cambiar tallas y colores' : 'Nuevo producto con tallas y colores') : 'Armar producto';
  const subtitulo = vista === 'FORM' ? 'Nombre → productos que usa → combo o receta → precio'
    : vista === 'PRODUCIR' ? 'Descuenta los insumos y crea el lote con su costo real'
    : vista === 'TALLAS' ? 'Nombre → precio y categoría → tallas y colores'
    : 'Elige qué vas a armar';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 font-mono">
      <div id="modal-produccion-receta" role="dialog" aria-label="Armar producto" className={`ventana-sobria bg-[var(--color-surface)] w-full max-w-3xl border-2 border-[var(--color-ink)] flex flex-col ${vista === 'LISTA' || cargando ? 'h-[calc(90dvh/var(--ui-zoom))]' : 'max-h-[calc(90dvh/var(--ui-zoom))]'}`}>
        {/* CABECERA */}
        <div style={{ '--icono': 'var(--color-accent-shadow)' } as React.CSSProperties} className="ventana-cabecera bg-[var(--color-ink)] text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {vista === 'FORM' || vista === 'PRODUCIR' ? <ChefHat size={24} className="text-[var(--color-warning)] shrink-0" /> : <Layers size={24} className="text-[var(--color-warning)] shrink-0" />}
            <div className="min-w-0">
              <h2 className="ventana-cabecera__titulo text-sm font-black uppercase tracking-widest text-[var(--color-warning)] truncate">{titulo}</h2>
              <p className="text-[9px] font-bold opacity-80 uppercase tracking-widest">{subtitulo}</p>
            </div>
          </div>
          <button id="btn-cerrar-produccion" type="button" onClick={onClose} title="Cerrar (Escape)" className="ventana-cerrar p-1.5 cursor-pointer rounded-none"><X size={20} /></button>
        </div>

        <CuerpoVentana>
          {cargando ? (
            <p className="text-xs font-black uppercase text-[var(--color-muted)]">Cargando…</p>
          ) : vista === 'LISTA' ? (
            <>
              {/* ¿Qué vas a armar? (como el paso 1 de Nuevo producto) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
                <button id="btn-nuevo-tallas" type="button"
                  onClick={() => (puedeCrear ? abrirTallas(null) : avisar('🔒 No tienes permiso para crear productos.'))}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowRight') { e.preventDefault(); document.getElementById('btn-nuevo-compuesto')?.focus(); }
                    else if (e.key === 'ArrowLeft') { e.preventDefault();  }
                    else if (e.key === 'ArrowDown') { e.preventDefault(); (document.querySelector('[data-fila-compuesto="true"]') as HTMLElement | null)?.focus(); }
                  }}
                  className="text-left p-4 border-2 border-[var(--color-border)] bg-white text-[var(--color-ink)] hover:border-[var(--color-ink)] cursor-pointer outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-ink)]">
                  <span className="flex items-center gap-2 text-sm font-black uppercase tracking-widest"><Layers size={18} /> Tallas y colores</span>
                  <span className="block mt-1 text-[11px] font-bold text-[var(--color-muted)]">Un producto con varias tallas o colores (ropa, calzado…), cada uno con su stock</span>
                </button>
                <button id="btn-nuevo-compuesto" type="button"
                  onClick={() => (puedeCrear ? abrirFormulario(null) : avisar('🔒 No tienes permiso para crear productos.'))}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowRight') { e.preventDefault();  }
                    else if (e.key === 'ArrowLeft') { e.preventDefault(); document.getElementById('btn-nuevo-tallas')?.focus(); }
                    else if (e.key === 'ArrowDown') { e.preventDefault(); (document.querySelector('[data-fila-compuesto="true"]') as HTMLElement | null)?.focus(); }
                  }}
                  className="text-left p-4 border-2 border-[var(--color-border)] bg-white text-[var(--color-ink)] hover:border-[var(--color-ink)] cursor-pointer outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-ink)]">
                  <span className="flex items-center gap-2 text-sm font-black uppercase tracking-widest"><ChefHat size={18} /> Combos y recetas</span>
                  <span className="block mt-1 text-[11px] font-bold text-[var(--color-muted)]">Juntar productos: combo (se descuenta al vender) o receta (se prepara antes)</span>
                </button>
              </div>
              <p className="text-[12px] font-black uppercase tracking-widest text-[var(--color-muted)] shrink-0">Lo que ya armaste ({armados.length})</p>
              <CajaLista vacia={!armados.length} mensaje="Todavía no armaste nada. Elige arriba qué vas a armar.">
                {armados.map(({ p, clase }, idx) => {
                  const lista = recetas[String(p.id)] || [];
                  const t = tope(lista);
                  const esReceta = clase === 'RECETA';
                  const esTallas = clase === 'TALLAS';
                  const nVar = (p.variantes || []).length;
                  const abrir = () => (esTallas ? abrirTallas(p) : esReceta && lista.length ? irAProducir(p, lista) : abrirFormulario(p, lista));
                  const cambiar = () => (puedeCrear ? (esTallas ? abrirTallas(p) : abrirFormulario(p, lista)) : avisar('🔒 No tienes permiso para cambiar productos.'));
                  const primerBoton = esTallas ? `btn-lote-tallas-${idx}` : esReceta ? `btn-producir-compuesto-${idx}` : `btn-cambiar-compuesto-${idx}`;
                  return (
                    <FilaLista
                      key={`${clase}-${p.id}`}
                      id={`fila-compuesto-${idx}`}
                      tabIndex={0}
                      data-fila-compuesto="true"
                      onKeyDown={(e) => {
                        const filas = Array.from(document.querySelectorAll('[data-fila-compuesto="true"]')) as HTMLElement[];
                        if (e.target !== e.currentTarget) return;
                        if (e.key === 'ArrowDown') { e.preventDefault(); filas[idx + 1]?.focus(); }
                        else if (e.key === 'ArrowUp') { e.preventDefault(); (filas[idx - 1] || document.getElementById('btn-nuevo-tallas'))?.focus(); }
                        else if (e.key === 'ArrowRight') { e.preventDefault(); document.getElementById(primerBoton)?.focus(); }
                        else if (e.key === 'Enter') { e.preventDefault(); abrir(); }
                      }}
                      titulo={p.name}
                      subtitulo={esTallas ? <>
                        <LineaDato>{nVar} talla(s) / color(es) · precio {soles(Number(p.price) || 0)}</LineaDato>
                        <LineaDato>Stock {formatearCantidad(p.quantity, p.unit)} {p.unit}</LineaDato>
                      </> : <>
                        <LineaDato>{lista.length} producto(s) · precio {soles(Number(p.price) || 0)}{esReceta ? ` · stock ${formatearCantidad(p.quantity, p.unit)} ${p.unit}` : ''}</LineaDato>
                        <LineaDato>{lista.length ? (t.max > 0 ? `Alcanza para ${t.max}` : `No alcanza: ${textoLimita(t)}`) : 'Sin productos: agrégalos con Cambiar'}</LineaDato>
                      </>}
                      centro={<Etiqueta tono={esTallas ? 'azul' : esReceta ? 'verde' : 'ambar'}>{esTallas ? 'Tallas' : esReceta ? 'Receta' : 'Combo'}</Etiqueta>}
                      derecha={
                        <div className="flex items-center gap-2">
                          {esTallas && (
                            <button id={`btn-lote-tallas-${idx}`} type="button"
                              onClick={() => { onClose(); onIngresarLote?.(p); }}
                              onKeyDown={(e) => { if (e.key === 'ArrowRight') { e.preventDefault(); document.getElementById(`btn-cambiar-compuesto-${idx}`)?.focus(); } else if (e.key === 'ArrowLeft') { e.preventDefault(); document.getElementById(`fila-compuesto-${idx}`)?.focus(); } }}
                              className={`${claseBotonBarra(true)} !h-[38px] !px-3`}>
                              Ingresar lote
                            </button>
                          )}
                          {esReceta && (
                            <button id={`btn-producir-compuesto-${idx}`} type="button" disabled={!lista.length}
                              onClick={() => irAProducir(p, lista)}
                              onKeyDown={(e) => { if (e.key === 'ArrowRight') { e.preventDefault(); document.getElementById(`btn-cambiar-compuesto-${idx}`)?.focus(); } else if (e.key === 'ArrowLeft') { e.preventDefault(); document.getElementById(`fila-compuesto-${idx}`)?.focus(); } }}
                              className={`${claseBotonBarra(true)} !h-[38px] !px-3 disabled:opacity-40`}>
                              <ChefHat size={14} /> Producir
                            </button>
                          )}
                          <button id={`btn-cambiar-compuesto-${idx}`} type="button"
                            onClick={cambiar}
                            onKeyDown={(e) => { if (e.key === 'ArrowLeft') { e.preventDefault(); document.getElementById(primerBoton === `btn-cambiar-compuesto-${idx}` ? `fila-compuesto-${idx}` : primerBoton)?.focus(); } else if (e.key === 'ArrowRight') e.preventDefault(); }}
                            className={`${claseBotonBarra(false)} !h-[38px] !px-3`}>
                            Cambiar
                          </button>
                        </div>
                      }
                    />
                  );
                })}
              </CajaLista>
            </>
          ) : vista === 'TALLAS' ? (
            <div className="flex flex-col gap-5 shrink-0">
              <div>
                <label htmlFor="input-nombre-tallas" className={etiquetaCampo}>1. Nombre</label>
                <input id="input-nombre-tallas" type="text" autoComplete="off" spellCheck={false} value={nombre}
                  placeholder="EJ.: ZAPATILLA URBANA · POLO BÁSICO"
                  onChange={(e) => setNombre(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} // Enter no pasa al siguiente cuadro
                  className={`${claseCampo} uppercase`} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="input-precio-tallas" className={etiquetaCampo}>2. Precio de venta (S/)</label>
                  <input id="input-precio-tallas" type="number" min="0" step="0.01" placeholder="0.00" value={precio}
                    onChange={(e) => setPrecio(e.target.value)} onFocus={(e) => e.currentTarget.select()}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} // Enter no pasa al siguiente cuadro
                    className={`${claseCampo} text-right`} />
                  <p className="mt-1 text-[11px] font-bold text-[var(--color-muted)]">Si una talla o color cuesta distinto, ponle su precio abajo.</p>
                </div>
                {campoCategoria}
              </div>
              <div>
                <p className={etiquetaCampo}>3. Tallas y colores</p>
                <div className="border-2 border-[var(--color-border)] bg-white">
                  <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-[var(--color-muted)] border-b-2 border-[var(--color-border)]">
                    <span className="col-span-3">Talla</span>
                    <span className="col-span-3">Color</span>
                    <span className="col-span-2">Precio</span>
                    <span className="col-span-3">Código de barras</span>
                    <span className="col-span-1" />
                  </div>
                  {tallas.map((t, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 px-3 py-2 items-center border-b border-[var(--color-border)] last:border-b-0">
                      <input id={`talla-talla-${idx}`} type="text" autoComplete="off" spellCheck={false} placeholder="EJ.: 38 · M" value={t.talla}
                        onChange={(e) => cambiarFila(idx, 'talla', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                        className={`${claseCampo} col-span-3 uppercase !p-2`} />
                      <input id={`talla-color-${idx}`} type="text" autoComplete="off" spellCheck={false} placeholder="EJ.: NEGRO" value={t.color}
                        onChange={(e) => cambiarFila(idx, 'color', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                        className={`${claseCampo} col-span-3 uppercase !p-2`} />
                      <input id={`talla-precio-${idx}`} type="number" min="0" step="0.01" placeholder={precio || '0.00'} value={t.precio} title="Vacío = el precio de arriba"
                        onChange={(e) => cambiarFila(idx, 'precio', e.target.value)} onFocus={(e) => e.currentTarget.select()} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                        className={`${claseCampo} col-span-2 text-right !p-2`} />
                      <input id={`talla-barcode-${idx}`} type="text" autoComplete="off" spellCheck={false} placeholder="OPCIONAL" value={t.barcode}
                        onChange={(e) => cambiarFila(idx, 'barcode', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                        className={`${claseCampo} col-span-3 !p-2`} />
                      <span className="col-span-1 flex flex-col items-end">
                        <button id={`btn-quitar-talla-${idx}`} type="button" onClick={() => quitarFila(idx)} title="Quitar esta talla o color"
                          className="p-1.5 border-2 border-transparent text-[var(--color-danger)] hover:border-[var(--color-danger)] focus:outline-none focus:border-[var(--color-danger)] cursor-pointer">
                          <Trash2 size={14} />
                        </button>
                        {t.id != null && <span className="text-[10px] font-black text-[var(--color-muted)] whitespace-nowrap">hay {t.stock ?? 0}</span>}
                      </span>
                    </div>
                  ))}
                </div>
                <button id="btn-agregar-talla" type="button" onClick={agregarFila} className={`${claseBotonBarra(false)} mt-2`}>
                  <Plus size={16} /> Agregar talla o color
                </button>
                <p className="mt-2 text-[11px] font-bold text-[var(--color-muted)]">El stock de cada talla entra con «Guardar e ir a Lotes» (Ingresar lote pide cuántas llegaron de cada una).</p>
              </div>
            </div>
          ) : vista === 'FORM' ? (
            <div className="flex flex-col gap-5 shrink-0">
              {/* 1. NOMBRE */}
              <div>
                <label htmlFor="input-nombre-compuesto" className={etiquetaCampo}>1. Nombre</label>
                <input id="input-nombre-compuesto" type="text" autoComplete="off" spellCheck={false} value={nombre}
                  placeholder="EJ.: JUGO DE NARANJA · COMBO HAMBURGUESA + GASEOSA"
                  onChange={(e) => setNombre(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} // Enter no pasa al siguiente cuadro
                  className={`${claseCampo} uppercase`} />
              </div>

              {/* 2. PRODUCTOS QUE USA */}
              <div>
                <p className={etiquetaCampo}>2. Productos que usa (cuánto lleva cada unidad)</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setListaAbierta(false); }}>
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] pointer-events-none" />
                    <input id="input-buscar-insumo-prod" type="text" autoComplete="off" spellCheck={false} value={busqueda}
                      placeholder="BUSCA EL PRODUCTO POR NOMBRE O CÓDIGO…"
                      onChange={(e) => { setBusqueda(e.target.value); setElegidoInsumo(null); setListaAbierta(e.target.value.trim() !== ''); }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); if (candidatos[0]) elegirInsumo(elegidoInsumo || candidatos[0]); }
                        else if (e.key === 'ArrowDown' && listaAbierta && candidatos.length) { e.preventDefault(); setTimeout(() => items()[0]?.focus(), 20); }
                      }}
                      className={`${claseCampo} pl-9 uppercase`} />
                    {listaAbierta && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-[var(--color-ink)] z-50 max-h-56 overflow-y-auto">
                        {candidatos.length ? candidatos.map((p) => (
                          <div key={p.id} role="option" tabIndex={0} data-insumo-prod="true"
                            onClick={() => elegirInsumo(p)}
                            onKeyDown={(e) => {
                              const l = items(); const i = l.indexOf(e.currentTarget);
                              if (e.key === 'ArrowDown') { e.preventDefault(); l[i + 1]?.focus(); }
                              else if (e.key === 'ArrowUp') { e.preventDefault(); (i > 0 ? l[i - 1] : document.getElementById('input-buscar-insumo-prod'))?.focus(); }
                              else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); elegirInsumo(p); }
                              else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setListaAbierta(false); enfocar('input-buscar-insumo-prod'); }
                            }}
                            className="flex items-center justify-between gap-3 p-3 border-b border-[var(--color-border)] cursor-pointer outline-none text-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-white focus:bg-[var(--color-ink)] focus:text-white">
                            <span className="text-xs font-black uppercase truncate">{p.name}</span>
                            <span className="text-[11px] font-bold shrink-0">Hay {formatearCantidad(p.quantity, p.unit)} {p.unit} · {soles(Number(p.cost) || 0)}</span>
                          </div>
                        )) : <div className="p-3 text-[11px] font-black uppercase text-[var(--color-muted)]">No se encontraron productos</div>}
                      </div>
                    )}
                  </div>
                  {/* La unidad del producto elegido al lado de la cantidad (pedido del dueño: "¿ese 1 es unidad o kilo?") */}
                  <div className="relative sm:w-36">
                    <input id="input-cant-insumo-prod" type="number" min="0" step="any" value={cantInsumo} title="Cuánto lleva cada unidad"
                      onChange={(e) => setCantInsumo(e.target.value)}
                      onFocus={(e) => e.currentTarget.select()}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void agregarInsumo(); } }}
                      className={`${claseCampo} text-right pr-14`} />
                    <span id="unidad-cant-insumo-prod" className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-black uppercase text-[var(--color-muted)] pointer-events-none">
                      {elegidoInsumo?.unit || '—'}
                    </span>
                  </div>
                  <button id="btn-agregar-insumo-prod" type="button" onClick={() => void agregarInsumo()} className={claseBotonBarra(false)}>
                    <Plus size={16} /> Agregar
                  </button>
                </div>
                {elegidoInsumo && (
                  <p id="frase-cant-insumo-prod" className="mt-2 text-[11px] font-black uppercase text-[var(--color-ink)]">
                    Cada {nombre.trim() || 'unidad'} lleva {Number(cantInsumo) > 0 ? formatearCantidad(Number(cantInsumo), elegidoInsumo.unit) : '…'} {elegidoInsumo.unit || 'UND'} de {elegidoInsumo.name}
                    {/KG|G|GR|L|LT|ML/i.test(elegidoInsumo.unit || '') ? ' (puedes usar decimales: 0.25 = un cuarto)' : ''}
                  </p>
                )}
                <div className="mt-3">
                  {insumos.length ? tablaInsumos(insumos, null, (i) => {
                    // Quitar: el selector queda en el producto que sigue (o en el buscador si ya no queda ninguno)
                    const quedan = insumos.length - 1;
                    setInsumos((l) => l.filter((_, k) => k !== i));
                    enfocar(quedan > 0 ? `btn-quitar-insumo-prod-${Math.min(i, quedan - 1)}` : 'input-buscar-insumo-prod');
                  }) : (
                    <p className="text-[11px] font-bold text-[var(--color-muted)]">Busca el producto (Enter lo elige), pasa con → a la cantidad y presiona Enter o «Agregar».</p>
                  )}
                  {insumos.length > 0 && (
                    <p id="tope-formulario" className={`mt-2 text-[11px] font-black uppercase ${topeForm.max > 0 ? 'text-[var(--color-accent)]' : 'text-[var(--color-danger)]'}`}>
                      Con lo que tienes alcanza para {topeForm.max} · {textoLimita(topeForm)}
                    </p>
                  )}
                </div>
              </div>

              {/* 3. COMBO O RECETA */}
              <div>
                <p className={etiquetaCampo}>3. ¿Cómo se vende?</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup" aria-label="¿Cómo se vende?">
                  {([['COMBO', 'Combo', 'Sus partes se descuentan solas al venderlo', Boxes], ['RECETA', 'Receta', 'Se prepara antes con «Producir»', ChefHat]] as const).map(([t, tit, ayuda, Icono]) => (
                    <button key={t} id={`btn-tipo-compuesto-${t}`} type="button" role="radio" aria-checked={tipo === t}
                      onClick={() => setTipo(t)} // Enter = clic: elige y el selector se queda (regla del selector)
                      className={`text-left p-3 border-2 cursor-pointer outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-ink)] ${tipo === t ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-white' : 'border-[var(--color-border)] bg-white text-[var(--color-ink)] hover:border-[var(--color-ink)]'}`}>
                      <span className="flex items-center gap-2 text-xs font-black uppercase tracking-widest">{tipo === t ? '●' : '○'} <Icono size={14} /> {tit}</span>
                      <span className={`block text-[11px] font-bold ${tipo === t ? 'text-white/80' : 'text-[var(--color-muted)]'}`}>{ayuda}</span>
                    </button>
                  ))}
                </div>
                {tipo === 'RECETA' && (
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <label htmlFor="input-costo-adic-compuesto" className="text-[10px] font-black text-[var(--color-ink)] uppercase tracking-widest">Costo adicional por unidad (gas, mano de obra) S/</label>
                    <input id="input-costo-adic-compuesto" type="number" min="0" step="0.01" placeholder="0.00" value={costoAdic}
                      onChange={(e) => setCostoAdic(e.target.value)} onFocus={(e) => e.currentTarget.select()}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} // Enter no pasa al siguiente cuadro
                      className={`${claseCampo} !w-32 text-right`} />
                  </div>
                )}
              </div>

              {/* 4. PRECIO Y CATEGORÍA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="input-precio-compuesto" className={etiquetaCampo}>4. Precio de venta (S/)</label>
                  <input id="input-precio-compuesto" type="number" min="0" step="0.01" placeholder="0.00" value={precio}
                    onChange={(e) => setPrecio(e.target.value)} onFocus={(e) => e.currentTarget.select()}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} // Enter no pasa al siguiente cuadro
                    className={`${claseCampo} text-right`} />
                </div>
                {campoCategoria}
              </div>
              <div id="resumen-compuesto" className="grid grid-cols-3 gap-2 border-2 border-[var(--color-border)] p-3">
                <DatoFila etiqueta="Cuesta armarlo" valor={soles(costoArmar)} />
                <DatoFila etiqueta="Precio" valor={soles(Number(precio) || 0)} />
                <DatoFila etiqueta="Ganas por unidad" valor={`${soles(ganancia)}${Number(precio) > 0 ? ` (${Math.round((ganancia / Number(precio)) * 100)}%)` : ''}`} tono={ganancia > 0 ? 'verde' : ganancia < 0 ? 'rojo' : 'normal'} />
              </div>
            </div>
          ) : elegido && (
            <div className="flex flex-col gap-4 shrink-0">
              <p id="tope-produccion" role="status" className={`p-3 border-2 text-xs font-black uppercase ${topeProd.max > 0 ? 'border-[var(--color-accent)] bg-[var(--color-accent-bg)] text-[var(--color-accent)]' : 'border-[var(--color-danger)] bg-[var(--color-danger-bg)] text-[var(--color-danger)]'}`}>
                {topeProd.max > 0 ? `Puedes producir hasta ${topeProd.max} ${elegido.unit}` : 'No alcanza para producir'}
                <span className="block text-[11px] font-bold normal-case">{textoLimita(topeProd)}</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="input-cantidad-produccion" className={etiquetaCampo}>¿Cuántos vas a producir? ({elegido.unit})</label>
                  <input id="input-cantidad-produccion" type="number" min="0" step="1" max={topeProd.max} value={cantidad} disabled={topeProd.max <= 0}
                    onChange={(e) => cambiarCantidad(e.target.value)} onFocus={(e) => e.currentTarget.select()}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} // Enter no pasa al siguiente cuadro
                    className={`${claseCampo} text-right disabled:opacity-50`} />
                </div>
                <div>
                  <label htmlFor="input-costo-adicional-produccion" className={etiquetaCampo}>Gastos extra de todo el lote (gas, mano de obra) S/</label>
                  <input id="input-costo-adicional-produccion" type="number" min="0" step="0.01"
                    value={adicEditado ? costoAdicProd : String(costoAdicTotal)}
                    onChange={(e) => { setAdicEditado(true); setCostoAdicProd(e.target.value); }} onFocus={(e) => e.currentTarget.select()}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} // Enter no pasa al siguiente cuadro
                    className={`${claseCampo} text-right`} />
                  <p id="adicional-por-unidad" className="mt-1 text-[11px] font-black uppercase text-[var(--color-muted)]">
                    {cantProd > 0 ? `= ${soles(adicPorUnidad)} por unidad (${soles(costoAdicTotal)} ÷ ${cantProd})` : 'Se reparte entre las unidades'}
                  </p>
                </div>
              </div>
              {avisoTope && <p id="aviso-tope" role="alert" className="text-[11px] font-black uppercase text-[var(--color-danger)]">{avisoTope}</p>}
              {tablaInsumos(elegido.insumos, cantProd)}
              <div className="grid grid-cols-3 gap-2 border-2 border-[var(--color-border)] p-3">
                <DatoFila etiqueta="Insumos" valor={soles(costoInsumosProd)} />
                <DatoFila etiqueta="Gastos extra (lote)" valor={soles(costoAdicTotal)} />
                <DatoFila etiqueta="Costo por unidad" valor={soles(costoUnitProd)} tono="verde" />
              </div>
            </div>
          )}
        </CuerpoVentana>

        {/* PIE: siempre a la vista */}
        {vista !== 'LISTA' && !cargando && (
          <div className="shrink-0 border-t-2 border-[var(--color-ink)] px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-end gap-3 bg-[var(--color-surface)]">
            <button id="btn-volver-produccion" type="button" onClick={() => { setVista('LISTA'); enfocar('btn-nuevo-tallas'); }} className={`${claseBotonBarra(false)} sm:mr-auto whitespace-nowrap`}>
              ← Volver
            </button>
            {vista === 'TALLAS' ? (
              <>
                <button id="btn-guardar-ir-lotes-tallas" type="button" disabled={guardando} onClick={() => void alGuardarTallas('LOTES')} className={`${claseBotonBarra(false)} whitespace-nowrap`}>Guardar e ir a Lotes</button>
                <button id="btn-guardar-tallas" type="button" disabled={guardando} onClick={() => void alGuardarTallas('CERRAR')} className={claseBotonPrincipal}>
                  {guardando ? 'Guardando…' : 'Guardar'}
                </button>
              </>
            ) : vista === 'FORM' ? (
              <>
                {/* Solo Guardar y Guardar e ir a Lotes (pedido del dueño 05/11/2026); para producir: «Producir» en la lista */}
                {tipo === 'RECETA' && (
                  <button id="btn-guardar-ir-lotes-compuesto" type="button" disabled={guardando} onClick={() => void alGuardar('LOTES')} className={`${claseBotonBarra(false)} whitespace-nowrap`}>Guardar e ir a Lotes</button>
                )}
                <button id="btn-guardar-compuesto" type="button" disabled={guardando} onClick={() => void alGuardar('LISTA')} className={claseBotonPrincipal}>
                  {guardando ? 'Guardando…' : 'Guardar'}
                </button>
              </>
            ) : (
              <button id="btn-producir-ahora" type="button" aria-disabled={guardando || topeProd.max <= 0} onClick={() => void producir()} className={`${claseBotonPrincipal} ${topeProd.max <= 0 ? 'opacity-50' : ''}`}>
                <ChefHat size={14} /> {guardando ? 'Produciendo…' : `Producir ${cantProd > 0 ? cantProd : ''}`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
