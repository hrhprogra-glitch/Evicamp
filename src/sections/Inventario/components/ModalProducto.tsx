import React, { useState, useEffect, useRef } from 'react';
import { X, Package, Scale, Coffee, ArrowLeft, Save, ImagePlus, Search, Loader2, Database, Plus, Layers, Trash2, Boxes, ChefHat, ChevronRight, ChevronLeft, SlidersHorizontal, Check } from 'lucide-react';
import { supabase } from '../../../db/supabase'; // RETORNO TÉCNICO: Conexión a la DB
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { usePermiso } from '../../../utils/permisos';
import { buscarImagenes, fotoParaGuardar, achicarImagen } from '../../../utils/buscarImagenes';
import { confirmar } from '../../../utils/dialogos';
import { UNIDADES, unidadDe } from '../../../utils/unidades';
import { escalasValidas } from '../../../utils/preciosCantidad';
import { presentacionesValidas } from '../../../utils/presentaciones';
import type { ProductRecipeItem } from '../types';

// Componente de Notificación de Errores (Diseño Geométrico y Alto Contraste)
const TechnicalAlert = ({ message }: { message: string }) => {
  return (
    <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-none p-4 w-full shadow-none mb-2">
      <div className="flex items-center justify-between">
        <h4 className="text-[var(--color-ink)] font-bold text-sm tracking-widest uppercase">
          ERROR DE INTEGRIDAD GEOMÉTRICA
        </h4>
        <span className="text-[var(--color-ink)] font-bold text-sm">409</span>
      </div>
      <div className="mt-2 pt-2 border-t border-[#E2E8F0]">
        <p className="text-[#64748B] text-xs font-mono leading-relaxed">
          {message || "El código interno o código de barras ya existe en el sistema. Asigne un código único o deje el campo en blanco."}
        </p>
      </div>
    </div>
  );
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onGoToLotes?: (producto: any) => void;
  onProductSaved?: (newProduct: any) => void;
  initialData?: any; 
  productosExistentes?: any[];
}

// Los 3 tipos de comportamiento en el sistema
type ProductNature = 'UNIDAD' | 'PESO' | 'CONSUMO' | null;

export const ModalProducto: React.FC<Props> = ({ isOpen, onClose, onGoToLotes, onProductSaved, initialData, productosExistentes = [] }) => {
  // Al EDITAR, el precio solo se cambia con el permiso "modificar precios" (el servidor también lo exige)
  const puedePrecios = usePermiso('almacen_modificar_precios');
  const precioBloqueado = !!initialData && !puedePrecios;
  const [step, setStep] = useState<1 | 2>(1);
  const [nature, setNature] = useState<ProductNature>(null);
  // Panel lateral derecho para opciones avanzadas (tallas, recetas, empaques, ubicación, garantía)
  const [showAdvancedPanel, setShowAdvancedPanel] = useState(false);
  // Fase 1.3: precios por cantidad ("desde N → precio"), 3 filas opcionales
  type FilaEscala = { desde: string; precio: string };
  const filasEscalas = (lista?: { desde: number; precio: number }[]): FilaEscala[] => {
    const filas = (lista || []).slice(0, 3).map((e) => ({ desde: String(e.desde), precio: String(e.precio) }));
    while (filas.length < 3) filas.push({ desde: '', precio: '' });
    return filas;
  };
  const [escalas, setEscalas] = useState<FilaEscala[]>(filasEscalas());
  // Fase 1.2: presentaciones (caja, paquete…), 3 filas opcionales: unidad · trae · precio · código de barras
  type FilaPres = { unidad: string; factor: string; precio: string; barcode: string };
  const filasPres = (lista?: { unidad: string; factor: number; precio: number; barcode?: string | null }[]): FilaPres[] => {
    const filas = (lista || []).slice(0, 3).map((e) => ({ unidad: e.unidad, factor: String(e.factor), precio: String(e.precio), barcode: e.barcode || '' }));
    while (filas.length < 3) filas.push({ unidad: 'CAJA', factor: '', precio: '', barcode: '' });
    return filas;
  };
  const [presentacionesForm, setPresentacionesForm] = useState<FilaPres[]>(filasPres());
  const cambiarPres = (i: number, campo: keyof FilaPres, valor: string) => setPresentacionesForm((prev) => prev.map((f, j) => (j === i ? { ...f, [campo]: valor } : f)));
  const COLS_PRES = ['unidad', 'factor', 'precio', 'barcode'] as const;
  const teclasPres = (e: React.KeyboardEvent<HTMLElement>, fila: number, col: typeof COLS_PRES[number]) => {
    const ir = (id: string) => { const el = document.getElementById(id) as HTMLElement | null; if (el) { el.focus(); if (el instanceof HTMLInputElement) el.select?.(); } return !!el; };
    const c = COLS_PRES.indexOf(col);
    if (e.key === 'ArrowDown') { e.preventDefault(); if (!ir(`pres-${col}-${fila + 1}`)) ir('check-tiene-variantes') || ir('btn-guardar-producto'); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (!ir(`pres-${col}-${fila - 1}`)) ir('escala-precio-2') || ir('btn-es-bolsa-producto') || ir('input-ubicacion-producto') || ir('select-unidad-peso-producto'); }
    else if (e.key === 'ArrowRight' && c < COLS_PRES.length - 1) { e.preventDefault(); ir(`pres-${COLS_PRES[c + 1]}-${fila}`); }
    else if (e.key === 'ArrowLeft' && c > 0) { e.preventDefault(); ir(`pres-${COLS_PRES[c - 1]}-${fila}`); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (col === 'unidad') { try { (e.currentTarget as HTMLSelectElement & { showPicker?: () => void }).showPicker?.(); } catch { /* sin showPicker */ } return; }
      if (c < COLS_PRES.length - 1) ir(`pres-${COLS_PRES[c + 1]}-${fila}`); else if (!ir(`pres-unidad-${fila + 1}`)) ir('check-tiene-variantes') || ir('btn-guardar-producto');
    }
  };
  const cambiarEscala = (i: number, campo: keyof FilaEscala, valor: string) => setEscalas((prev) => prev.map((f, j) => (j === i ? { ...f, [campo]: valor } : f)));
  // ↑ ↓ entre filas, ← → entre "desde" y "precio", Enter al siguiente; al terminar, Guardar o Variantes
  const teclasEscala = (e: React.KeyboardEvent<HTMLInputElement>, fila: number, col: 'desde' | 'precio') => {
    const ir = (id: string) => { const el = document.getElementById(id) as HTMLElement | null; if (el) { el.focus(); if (el instanceof HTMLInputElement) el.select?.(); } return !!el; };
    if (e.key === 'ArrowDown') { e.preventDefault(); if (!ir(`escala-${col}-${fila + 1}`)) ir('pres-unidad-0') || ir('check-tiene-variantes') || ir('btn-guardar-producto'); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (!ir(`escala-${col}-${fila - 1}`)) ir('btn-es-bolsa-producto') || ir('input-ubicacion-producto') || ir('select-unidad-peso-producto') || ir('input-stock-minimo-producto'); }
    else if (e.key === 'ArrowRight' && col === 'desde') { e.preventDefault(); ir(`escala-precio-${fila}`); }
    else if (e.key === 'ArrowLeft' && col === 'precio') { e.preventDefault(); ir(`escala-desde-${fila}`); }
    else if (e.key === 'Enter') { e.preventDefault(); if (col === 'desde') ir(`escala-precio-${fila}`); else if (!ir(`escala-desde-${fila + 1}`)) ir('pres-unidad-0') || ir('check-tiene-variantes') || ir('btn-guardar-producto'); }
  };
  // Fase 7: Navegación de Variantes con Teclado
  const COLS_VAR = ['talla', 'color', 'nombre', 'barcode', 'price', 'quitar'] as const;
  const teclasVar = (e: React.KeyboardEvent<HTMLElement>, fila: number, col: typeof COLS_VAR[number]) => {
    const ir = (id: string) => {
      const el = document.getElementById(id) as HTMLElement | null;
      if (el) {
        el.focus();
        if (el instanceof HTMLInputElement) el.select?.();
      }
      return !!el;
    };
    const c = COLS_VAR.indexOf(col);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!ir(`var-${col}-${fila + 1}`)) {
        ir('btn-agregar-variante-manual') || ir('btn-guardar-producto');
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!ir(`var-${col}-${fila - 1}`)) {
        ir('check-tiene-variantes');
      }
    } else if (e.key === 'ArrowRight' && c < COLS_VAR.length - 1) {
      e.preventDefault();
      ir(`var-${COLS_VAR[c + 1]}-${fila}`);
    } else if (e.key === 'ArrowLeft' && c > 0) {
      e.preventDefault();
      ir(`var-${COLS_VAR[c - 1]}-${fila}`);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (col === 'quitar') {
        eliminarVariante(fila);
        setTimeout(() => {
          (document.getElementById(`var-talla-${Math.min(fila, Math.max(0, variantesLista.length - 2))}`) ||
           document.getElementById('btn-agregar-variante-manual') ||
           document.getElementById('check-tiene-variantes'))?.focus();
        }, 30);
        return;
      }
      if (c < COLS_VAR.length - 1) {
        ir(`var-${COLS_VAR[c + 1]}-${fila}`);
      } else if (!ir(`var-talla-${fila + 1}`)) {
        ir('btn-agregar-variante-manual') || ir('btn-guardar-producto');
      }
    }
  };
  // Fase 7: Tallas y Colores (Variantes con stock propio)
  interface FilaVarianteForm {
    id?: number | string;
    nombre_variante: string;
    talla: string;
    color: string;
    barcode: string;
    code: string;
    price: string;
    precioMayorista: string;
    cost_price: string;
    quantity: string;
    min_stock: string;
  }
  const [tieneVariantes, setTieneVariantes] = useState(false);
  const [variantesLista, setVariantesLista] = useState<FilaVarianteForm[]>([]);

  // Fase 8: Recetas y Combos
  const [mostrarEnCatalogo, setMostrarEnCatalogo] = useState(true);
  const [destacadoCatalogo, setDestacadoCatalogo] = useState(false);
  const [tipoCompuesto, setTipoCompuesto] = useState<'ESTANDAR' | 'COMBO' | 'RECETA'>('ESTANDAR');
  const [costoAdicionalProd, setCostoAdicionalProd] = useState<string>('');
  const [recetaItems, setRecetaItems] = useState<ProductRecipeItem[]>([]);
  const [busquedaInsumo, setBusquedaInsumo] = useState('');
  const [insumoElegido, setInsumoElegido] = useState<any | null>(null);
  const [cantInsumo, setCantInsumo] = useState('1');
  const [showInsumoDropdown, setShowInsumoDropdown] = useState(false);

  const agregarInsumo = () => {
    if (!insumoElegido) return;
    const cant = Number(cantInsumo) || 1;
    if (cant <= 0) return;

    const yaExiste = recetaItems.some(item => String(item.component_product_id) === String(insumoElegido.id));
    if (yaExiste) {
      setRecetaItems(prev => prev.map(item =>
        String(item.component_product_id) === String(insumoElegido.id)
          ? { ...item, quantity: item.quantity + cant }
          : item
      ));
    } else {
      setRecetaItems(prev => [
        ...prev,
        {
          component_product_id: insumoElegido.id,
          quantity: cant,
          component_name: insumoElegido.name,
          component_unit: insumoElegido.unit || 'UND',
          component_cost: insumoElegido.cost || 0
        }
      ]);
    }

    setInsumoElegido(null);
    setBusquedaInsumo('');
    setCantInsumo('1');
    setShowInsumoDropdown(false);
  };

  const eliminarInsumo = (idx: number) => {
    setRecetaItems(prev => prev.filter((_, i) => i !== idx));
  };

  const agregarVarianteVacia = () => {
    setVariantesLista(prev => [
      ...prev,
      {
        nombre_variante: '',
        talla: '',
        color: '',
        barcode: '',
        code: '',
        price: '',
        precioMayorista: '',
        cost_price: '',
        quantity: '0',
        min_stock: '2',
      }
    ]);
  };


  const eliminarVariante = (index: number) => {
    setVariantesLista(prev => prev.filter((_, i) => i !== index));
  };

  const actualizarVariante = (index: number, campo: keyof FilaVarianteForm, valor: string) => {
    setVariantesLista(prev => prev.map((v, i) => {
      if (i !== index) return v;
      const updated = { ...v, [campo]: valor };
      if (campo === 'talla' || campo === 'color') {
        const t = campo === 'talla' ? valor.trim().toUpperCase() : v.talla.trim().toUpperCase();
        const c = campo === 'color' ? valor.trim().toUpperCase() : v.color.trim().toUpperCase();
        if (t && c) updated.nombre_variante = `TALLA ${t} / ${c}`;
        else if (t) updated.nombre_variante = `TALLA ${t}`;
        else if (c) updated.nombre_variante = `COLOR ${c}`;
      }
      return updated;
    }));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  // ESTADOS PARA EL AUTOCOMPLETADO DE CATEGORÍAS
  const [categoriasLista, setCategoriasLista] = useState<string[]>([]);
  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const catContainerRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer clic fuera del contenedor de categoría
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (catContainerRef.current && !catContainerRef.current.contains(e.target as Node)) {
        setShowCatDropdown(false);
      }
    };
    if (showCatDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCatDropdown]);

  // Cargar tabla categories directamente desde Supabase
  useEffect(() => {
    const fetchCategorias = async () => {
      const { data } = await supabase.from('categories').select('name');
      if (data) {
        const dbCats = data.map((c: any) => c.name?.trim().toUpperCase()).filter(Boolean);
        setCategoriasLista(Array.from(new Set(dbCats)).sort());
      }
    };
    if (isOpen) fetchCategorias();
  }, [isOpen]);

  const handleCrearCategoria = async (nombreCat: string) => {
    const nuevaCat = nombreCat?.trim().toUpperCase();
    if (!nuevaCat) return;

    if (!categoriasLista.includes(nuevaCat)) {
      setCategoriasLista(prev => [...prev, nuevaCat].sort());
      try {
        await supabase.from('categories').insert([{ id: Date.now(), name: nuevaCat, is_synced: 1 }]);
      } catch (err) {
        console.error('Error insertando categoría en db:', err);
      }
    }

    setFormData(prev => ({ ...prev, category: nuevaCat }));
    setShowCatDropdown(false);
    setTimeout(() => {
      document.getElementById('input-codigo-producto')?.focus();
    }, 50);
  };

  const handleEliminarCategoria = async (cat: string) => {
    if (await confirmar(`¿Estás seguro de que deseas eliminar la categoría "${cat}" DEFINITIVAMENTE de tu base de datos?`)) {
      setCategoriasLista(prev => prev.filter(c => c !== cat));
      if (formData.category === cat) {
        setFormData(prev => ({ ...prev, category: '' }));
      }
      try {
        await supabase.from('categories').delete().eq('name', cat);
      } catch (err) {
        console.error('Error eliminando categoría en db:', err);
      }
      document.getElementById('input-categoria-producto')?.focus();
    }
  };
  // ESTADOS PARA BÚSQUEDA DE IMÁGENES
  const [imageQuery, setImageQuery] = useState('');
  const [isSearchingImage, setIsSearchingImage] = useState(false);

  // Código de barras → nombre e imagen desde Open Food Facts (base pública de productos de marca).
  // Solo cuando el usuario escanea/escribe el código (no al abrir un producto guardado) y SIN pisar
  // lo que ya puso: el nombre se llena solo si está vacío, y la imagen solo si no eligió una.
  const [codigoParaBuscar, setCodigoParaBuscar] = useState('');
  const [estadoCodigo, setEstadoCodigo] = useState<{ tipo: 'buscando' | 'encontrado' | 'no-registrado'; texto: string } | null>(null);
  useEffect(() => {
    const codigo = codigoParaBuscar.trim();
    if (!/^\d{8,14}$/.test(codigo)) { setEstadoCodigo(null); return; }
    const control = new AbortController();
    const espera = setTimeout(async () => {
      setEstadoCodigo({ tipo: 'buscando', texto: 'Buscando el producto por su código...' });
      try {
        const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${codigo}.json?fields=product_name,product_name_es,brands,quantity,image_front_url`, { signal: control.signal });
        const datos = await r.json();
        const p = datos?.status === 1 ? datos.product : null;
        const nombreBase = (p?.product_name_es || p?.product_name || '').trim();
        if (!p || (!nombreBase && !p.image_front_url)) {
          setEstadoCodigo({ tipo: 'no-registrado', texto: 'Este código no está registrado: escribe el nombre y elige la imagen.' });
          return;
        }
        const marca = String(p.brands || '').split(',')[0].trim();
        const compacto = (s: string) => s.toLowerCase().replace(/\s+/g, '');
        const cantidad = String(p.quantity || '').trim();
        const partes = [
          marca && !compacto(nombreBase).includes(compacto(marca)) ? marca : '',
          nombreBase,
          cantidad && !compacto(nombreBase).includes(compacto(cantidad)) ? cantidad : '', // "500ml" no dos veces
        ];
        const nombre = partes.filter(Boolean).join(' ').replace(/\s+/g, ' ').toUpperCase();
        const yaTeniaNombre = !!(document.getElementById('input-nombre-producto') as HTMLInputElement | null)?.value.trim();
        setFormData((prev) => ({
          ...prev,
          name: prev.name.trim() ? prev.name : nombre,          // si ya escribió un nombre, se respeta
          image: prev.image || p.image_front_url || '',         // si ya eligió imagen, se respeta
          marca: prev.marca.trim() ? prev.marca : (marca ? marca.toUpperCase() : ''),
        }));
        setEstadoCodigo({
          tipo: 'encontrado',
          texto: yaTeniaNombre ? `Encontrado: ${nombre}. Se dejó el nombre que escribiste.` : `Encontrado: ${nombre || 'producto con imagen'}`,
        });
      } catch (e: any) {
        if (e?.name !== 'AbortError') setEstadoCodigo({ tipo: 'no-registrado', texto: 'No se pudo consultar el código (¿sin internet?).' });
      }
    }, 600); // el lector escribe el código de golpe: se espera a que termine
    return () => { clearTimeout(espera); control.abort(); };
  }, [codigoParaBuscar]);
  const [imageResults, setImageResults] = useState<string[]>([]);
  const [showImageResults, setShowImageResults] = useState(false); // <-- Controla si la galería está abierta o cerrada
  // Imagen marcada con el teclado en la galería (-1 = ninguna; el foco sigue en el buscador)
  const [imgResaltada, setImgResaltada] = useState(-1);
  useEffect(() => { setImgResaltada(-1); }, [imageResults]);
  const aplicarImagen = (imgUrl: string) => {
    setFormData((prev) => ({ ...prev, image: imgUrl }));
    // Pixabay no permite enlazar sus fotos: se reemplaza por una copia achicada guardada en el producto
    void fotoParaGuardar(imgUrl).then((copia) => {
      if (copia !== imgUrl) setFormData((prev) => (prev.image === imgUrl ? { ...prev, image: copia } : prev));
    });
    setImageResults([]);
    setImageQuery('');
    setShowImageResults(false);
    setImgResaltada(-1);
  };

  // 1. LIMPIEZA DE MEMORIA AL ABRIR EL MODAL
  // 1. CONTROL DE MEMORIA AL ABRIR (MODO CREACIÓN vs MODO EDICIÓN)
  useEffect(() => {
    if (isOpen) {
      setImageQuery('');
      setImageResults([]);
      setShowImageResults(false);

      if (initialData) {
        // MODO EDICIÓN: Cargamos datos y saltamos al Paso 2
        setFormData({
          name: initialData.name || '',
          category: initialData.category || '',
          // "NO-SKU" es solo lo que muestra la lista cuando el producto no tiene código: no es un código real
          // (si se cargaba, chocaba con los demás productos sin código y no dejaba guardar; al guardar se genera uno)
          code: initialData.code && initialData.code !== 'NO-SKU' ? initialData.code : '',
          barcode: initialData.barcode || '',
          price: initialData.price?.toString() || '',
          precioMayorista: initialData.precioMayorista?.toString() || '',
          minStock: initialData.minStock?.toString() || '5',
          weightUnit: unidadDe(initialData).corto, // fase 1.1: "Se vende por" (UND, BOLSA, KG, M…)
          image: initialData.image || '',
          marca: initialData.marca || '',
          modelo: initialData.modelo || '',
          medida: initialData.medida || '',
          laboratorio: initialData.laboratorio || '',
          ubicacion: initialData.ubicacion || '',
          controlaSeries: Boolean(initialData.controla_series ?? initialData.controlaSeries),
          mesesGarantia: (initialData.meses_garantia ?? initialData.mesesGarantia ?? 0).toString(),
          tipoIgv: (initialData.tipo_igv ?? initialData.tipoIgv ?? 'GRAVADO') as 'GRAVADO' | 'EXONERADO' | 'INAFECTO',
          esBolsa: Boolean(initialData.es_bolsa ?? initialData.esBolsa)
        });
        
        const tipoUnidad = unidadDe(initialData).tipo;
        if (tipoUnidad === 'ENTERA') setNature('UNIDAD');
        else if (tipoUnidad === 'DECIMAL') setNature('PESO');
        else setNature('CONSUMO');
        setEscalas(filasEscalas(initialData.preciosCantidad)); // fase 1.3
        setPresentacionesForm(filasPres(initialData.presentaciones)); // fase 1.2
        
        const tieneVars = Boolean(initialData.tieneVariantes || initialData.tiene_variantes || (initialData.variantes && initialData.variantes.length > 0));
        setTieneVariantes(tieneVars);
        if (tieneVars && Array.isArray(initialData.variantes)) {
          setVariantesLista(initialData.variantes.map((v: any) => ({
            id: v.id,
            nombre_variante: v.nombre_variante || '',
            talla: v.talla || '',
            color: v.color || '',
            barcode: v.barcode || '',
            code: v.code || '',
            price: v.price != null && v.price !== '' ? String(v.price) : '',
            precioMayorista: v.precio_mayorista != null && v.precio_mayorista !== '' ? String(v.precio_mayorista) : '',
            cost_price: v.cost_price != null && v.cost_price !== '' ? String(v.cost_price) : '',
            quantity: String(v.quantity ?? 0),
            min_stock: String(v.min_stock ?? 2),
          })));
        } else {
          setVariantesLista([]);
        }

        // Fase 8: Carga de combo/receta
        setMostrarEnCatalogo(initialData.mostrar_en_catalogo !== false && initialData.mostrarEnCatalogo !== false);
        setDestacadoCatalogo(Boolean(initialData.destacado_catalogo ?? initialData.destacadoCatalogo));
        const tComp = (initialData.tipoCompuesto || initialData.tipo_compuesto || 'ESTANDAR') as 'ESTANDAR' | 'COMBO' | 'RECETA';
        setTipoCompuesto(tComp);
        setCostoAdicionalProd(initialData.costoAdicionalProduccion || initialData.costo_adicional_produccion ? String(initialData.costoAdicionalProduccion || initialData.costo_adicional_produccion) : '');

        if (initialData.id) {
          supabase.from('product_recipes').select('*').eq('parent_product_id', initialData.id).then(({ data: recData }) => {
            if (recData && recData.length > 0) {
              const mapeados = recData.map((r: any) => {
                const compProd = productosExistentes.find((p: any) => String(p.id) === String(r.component_product_id));
                return {
                  id: r.id,
                  parent_product_id: r.parent_product_id,
                  component_product_id: r.component_product_id,
                  component_variant_id: r.component_variant_id,
                  quantity: Number(r.quantity) || 1,
                  component_name: compProd?.name || 'Insumo #' + r.component_product_id,
                  component_unit: compProd?.unit || 'UND',
                  component_cost: compProd?.cost || 0
                };
              });
              setRecetaItems(mapeados);
            } else {
              setRecetaItems([]);
            }
          });
        } else {
          setRecetaItems([]);
        }

        const tieneAvanzados = Boolean(
          initialData.marca?.trim() ||
          initialData.modelo?.trim() ||
          initialData.medida?.trim() ||
          initialData.laboratorio?.trim() ||
          initialData.ubicacion?.trim() ||
          Number(initialData.meses_garantia ?? initialData.mesesGarantia ?? 0) > 0 ||
          Boolean(initialData.controla_series ?? initialData.controlaSeries) ||
          (initialData.tipo_igv ?? initialData.tipoIgv ?? 'GRAVADO') !== 'GRAVADO' ||
          Boolean(initialData.es_bolsa ?? initialData.esBolsa) ||
          (initialData.preciosCantidad && initialData.preciosCantidad.length > 0) ||
          (initialData.presentaciones && initialData.presentaciones.length > 0) ||
          tieneVars ||
          tComp !== 'ESTANDAR'
        );
        setShowAdvancedPanel(tieneAvanzados);

        setStep(2);
      } else {
        // MODO CREACIÓN: Limpiamos todo y cerramos panel lateral para máxima rapidez y simplicidad
        setStep(1);
        setNature(null);
        setShowAdvancedPanel(false);
        setFormData({ name: '', category: '', code: '', barcode: '', price: '', precioMayorista: '', minStock: '5', weightUnit: 'KG', image: '', marca: '', modelo: '', medida: '', laboratorio: '', ubicacion: '', controlaSeries: false, mesesGarantia: '0', tipoIgv: 'GRAVADO', esBolsa: false });
        setEscalas(filasEscalas());
        setPresentacionesForm(filasPres());
        setTieneVariantes(false);
        setVariantesLista([]);
        setMostrarEnCatalogo(true);
        setDestacadoCatalogo(false);
        setTipoCompuesto('ESTANDAR');
        setCostoAdicionalProd('');
        setRecetaItems([]);
        setBusquedaInsumo('');
        setInsumoElegido(null);
        setCantInsumo('1');
      }
    }
  }, [isOpen, initialData]);

  // CONTROLADOR PARA CANCELAR PETICIONES OBSOLETAS
  const abortControllerRef = useRef<AbortController | null>(null);

  // 2. OPTIMIZACIÓN: DEBOUNCE REDUCIDO A 300ms
  useEffect(() => {
    if (!imageQuery || imageQuery.length < 2 || imageQuery.startsWith('http')) {
      setImageResults([]);
      setShowImageResults(false);
      return;
    }

    const timer = setTimeout(() => {
      ejecutarBusquedaAPI(imageQuery);
    }, 300); // Reducido para mayor sensación de velocidad

    return () => clearTimeout(timer);
  }, [imageQuery]);

  // 3. MOTOR DE BÚSQUEDA HÍBRIDO (RENDERIZADO PROGRESIVO ULTRA-RÁPIDO)
  const ejecutarBusquedaAPI = async (query: string) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsSearchingImage(true);
    setShowImageResults(true);
    setImageResults([]); // Limpiamos la pantalla al instante para la nueva búsqueda

    try {
      // Pixabay por el servidor; si no hay, fotos de Commons que nombran lo buscado (src/utils/buscarImagenes.ts).
      // 4 = una fila: entra completa en la ventana sin tapar los botones
      const fotos = await buscarImagenes(query, abortController.signal, 4);
      if (!abortController.signal.aborted) setImageResults(fotos.map((f) => f.url));

    } catch (e: any) {
      if (e.name === 'AbortError') return;
    } finally {
      if (!abortController.signal.aborted) {
        setIsSearchingImage(false);
      }
    }
  };

  // Estado de errores técnicos
  const [integrityError, setIntegrityError] = useState<string | null>(null);

  // Estado del formulario
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    code: '',
    barcode: '',
    price: '',
    precioMayorista: '',
    minStock: '5',
    weightUnit: 'KG', // Solo importa si nature === 'PESO'
    image: '', // <-- NUEVO ESTADO PARA LA IMAGEN
    marca: '',
    modelo: '',
    medida: '',
    laboratorio: '',
    ubicacion: '',
    controlaSeries: false,
    mesesGarantia: '0',
    tipoIgv: 'GRAVADO' as 'GRAVADO' | 'EXONERADO' | 'INAFECTO', // fase 11.2
    esBolsa: false
  });

  const resetAndClose = () => {
    setMostrarEnCatalogo(true);
    setDestacadoCatalogo(false);
    setIntegrityError(null);
    setCodigoParaBuscar('');
    setStep(1);
    setNature(null);
    setFormData({ name: '', category: '', code: '', barcode: '', price: '', precioMayorista: '', minStock: '5', weightUnit: 'KG', image: '', marca: '', modelo: '', medida: '', laboratorio: '', ubicacion: '', controlaSeries: false, mesesGarantia: '0', tipoIgv: 'GRAVADO', esBolsa: false });
    setEscalas(filasEscalas());
    setPresentacionesForm(filasPres());
    setTieneVariantes(false);
    setVariantesLista([]);
    setImageQuery('');
    setImageResults([]);
    setShowImageResults(false);
    onClose();
  };

  useCerrarConEscape(isOpen, resetAndClose);

  // Auto-Focus al abrir el modal o cambiar de paso
  useEffect(() => {
    if (!isOpen) return;

    const enforceFocus = () => {
      if (step === 2) {
        const nameInput = document.getElementById('input-nombre-producto');
        if (nameInput) nameInput.focus();
        else document.getElementById('btn-cerrar-modal-producto')?.focus();
      } else {
        const targetId = 
          nature === 'PESO' ? 'btn-naturaleza-peso' : 
          nature === 'CONSUMO' ? 'btn-naturaleza-consumo' : 
          'btn-naturaleza-unidad';
        const targetBtn = document.getElementById(targetId);
        if (targetBtn) targetBtn.focus();
        else document.getElementById('btn-cerrar-modal-producto')?.focus();
      }
    };

    const timer = setTimeout(enforceFocus, 50);
    return () => clearTimeout(timer);
  }, [isOpen, step]);

  // Focus Trap y Navegación de Teclado para ModalProducto
  useEffect(() => {
    if (!isOpen) return;

    const handleFormKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement;

      // Escape cierra dropdown primero si está abierto
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (showCatDropdown) {
          setShowCatDropdown(false);
          document.getElementById('input-categoria-producto')?.focus();
          return;
        }
        resetAndClose();
        return;
      }

      // ================= FOCUS TRAP DETERMINÍSTICO PARA TAB =================
      if (e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();

        const step1Ids = [
          'btn-cerrar-modal-producto',
          'btn-naturaleza-unidad',
          'btn-naturaleza-peso',
          'btn-naturaleza-consumo'
        ];

        const step2Ids = [
          'btn-volver-step-1',
          'btn-cerrar-modal-producto',
          'input-nombre-producto',
          'input-categoria-producto',
          'input-codigo-producto',
          'input-barcode-producto',
          'input-buscar-foto-producto',
          'btn-subir-local-producto',
          'input-precio-producto',
          'input-precio-mayorista-producto',
          'input-stock-minimo-producto',
          'select-unidad-peso-producto',
          'btn-toggle-opciones-avanzadas',
          'input-marca-producto',
          'input-modelo-producto',
          'input-medida-producto',
          'input-laboratorio-producto',
          'input-ubicacion-producto',
          'input-meses-garantia-producto',
          'input-controla-series-producto',
          'btn-igv-GRAVADO', 'btn-igv-EXONERADO', 'btn-igv-INAFECTO', 'btn-es-bolsa-producto',
          'escala-desde-0', 'escala-precio-0', 'escala-desde-1', 'escala-precio-1', 'escala-desde-2', 'escala-precio-2',
          ...[0, 1, 2].flatMap((i) => [`pres-unidad-${i}`, `pres-factor-${i}`, `pres-precio-${i}`, `pres-barcode-${i}`]),
          'btn-guardar-producto',
          'btn-guardar-ir-lotes'
        ];

        const targetIds = step === 1 ? step1Ids : step2Ids;
        const focusables = targetIds
          .map(id => document.getElementById(id))
          .filter((el): el is HTMLElement => Boolean(el && (el.offsetParent !== null || el.getClientRects().length > 0) && !el.hasAttribute('disabled')));

        if (focusables.length > 0) {
          const currentIndex = focusables.indexOf(active);
          if (e.shiftKey) {
            const prevIndex = currentIndex <= 0 ? focusables.length - 1 : currentIndex - 1;
            focusables[prevIndex]?.focus();
          } else {
            const nextIndex = currentIndex === -1 || currentIndex >= focusables.length - 1 ? 0 : currentIndex + 1;
            focusables[nextIndex]?.focus();
          }
        }
        return;
      }

      // ================= NAVEGACIÓN EN PASO 1 (NATURALEZA) =================
      if (step === 1) {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          if (active?.id === 'btn-naturaleza-unidad') {
            document.getElementById('btn-naturaleza-peso')?.focus();
          } else if (active?.id === 'btn-naturaleza-peso') {
            document.getElementById('btn-naturaleza-consumo')?.focus();
          } else if (active?.id === 'btn-naturaleza-consumo') {
            document.getElementById('btn-naturaleza-unidad')?.focus();
          } else {
            document.getElementById('btn-naturaleza-unidad')?.focus();
          }
          return;
        }

        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          if (active?.id === 'btn-naturaleza-consumo') {
            document.getElementById('btn-naturaleza-peso')?.focus();
          } else if (active?.id === 'btn-naturaleza-peso') {
            document.getElementById('btn-naturaleza-unidad')?.focus();
          } else if (active?.id === 'btn-naturaleza-unidad') {
            document.getElementById('btn-naturaleza-consumo')?.focus();
          } else {
            document.getElementById('btn-naturaleza-consumo')?.focus();
          }
          return;
        }

        if (e.key === 'ArrowUp') {
          if (['btn-naturaleza-unidad', 'btn-naturaleza-peso', 'btn-naturaleza-consumo'].includes(active?.id)) {
            e.preventDefault();
            document.getElementById('btn-cerrar-modal-producto')?.focus();
            return;
          }
        }

        if (e.key === 'ArrowDown') {
          if (active?.id === 'btn-cerrar-modal-producto') {
            e.preventDefault();
            const targetId = nature === 'PESO' ? 'btn-naturaleza-peso' : (nature === 'CONSUMO' ? 'btn-naturaleza-consumo' : 'btn-naturaleza-unidad');
            document.getElementById(targetId)?.focus();
            return;
          }
        }
        return;
      }

      // ================= NAVEGACIÓN EN PASO 2 (DETALLES) =================
      if (step === 2) {
        // Cabecera
        if (active?.id === 'btn-volver-step-1') {
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            document.getElementById('btn-cerrar-modal-producto')?.focus();
            return;
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            document.getElementById('input-nombre-producto')?.focus();
            return;
          }
        }

        if (active?.id === 'btn-cerrar-modal-producto') {
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            document.getElementById('btn-volver-step-1')?.focus();
            return;
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            document.getElementById('input-nombre-producto')?.focus();
            return;
          }
        }

        // Nombre
        if (active?.id === 'input-nombre-producto') {
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            document.getElementById('btn-volver-step-1')?.focus();
            return;
          }
          if (e.key === 'ArrowDown' || e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('input-categoria-producto')?.focus();
            return;
          }
        }

        // Categoría
        if (active?.id === 'input-categoria-producto') {
          if (e.key === 'ArrowUp') {
            const btnAdd = document.getElementById('btn-agregar-categoria');
            if (btnAdd && showCatDropdown) {
              e.preventDefault();
              btnAdd.focus();
              return;
            }
            e.preventDefault();
            setShowCatDropdown(false);
            document.getElementById('input-nombre-producto')?.focus();
            return;
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!showCatDropdown) {
              setShowCatDropdown(true);
            }
            setTimeout(() => {
              const firstItem = document.querySelector('[data-cat-item="true"]') as HTMLElement;
              if (firstItem) {
                firstItem.focus();
              } else {
                document.getElementById('input-codigo-producto')?.focus();
              }
            }, 30);
            return;
          }
          if (e.key === 'ArrowRight') {
            const input = active as HTMLInputElement;
            if (!input.value || input.selectionEnd === input.value.length) {
              e.preventDefault();
              setShowCatDropdown(false);
              document.getElementById('input-codigo-producto')?.focus();
              return;
            }
          }
          if (e.key === 'Enter') {
            e.preventDefault();
            const typedCat = formData.category?.trim().toUpperCase() || '';
            if (typedCat) {
              const matches = categoriasLista.filter(c => c.includes(typedCat));
              if (matches.length > 0) {
                const chosen = matches.find(c => c === typedCat) || matches[0];
                setFormData(prev => ({ ...prev, category: chosen }));
                setShowCatDropdown(false);
                document.getElementById('input-codigo-producto')?.focus();
              } else {
                handleCrearCategoria(typedCat);
              }
            } else {
              setShowCatDropdown(false);
              document.getElementById('input-codigo-producto')?.focus();
            }
            return;
          }
        }

        // Elemento dentro del desplegable de categorías
        if (active?.getAttribute('data-cat-item') === 'true') {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            const items = Array.from(document.querySelectorAll('[data-cat-item="true"]')) as HTMLElement[];
            const idx = items.indexOf(active);
            if (idx !== -1 && idx < items.length - 1) {
              items[idx + 1].focus();
            }
            return;
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            const items = Array.from(document.querySelectorAll('[data-cat-item="true"]')) as HTMLElement[];
            const idx = items.indexOf(active);
            if (idx > 0) {
              items[idx - 1].focus();
            } else {
              document.getElementById('input-categoria-producto')?.focus();
            }
            return;
          }
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            const btnEliminar = active.querySelector('.btn-eliminar-cat') as HTMLElement;
            if (btnEliminar) {
              btnEliminar.focus();
            } else {
              setShowCatDropdown(false);
              document.getElementById('input-codigo-producto')?.focus();
            }
            return;
          }
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            document.getElementById('input-categoria-producto')?.focus();
            return;
          }
          if (e.key === 'Delete') {
            const btnEliminar = active.querySelector('.btn-eliminar-cat') as HTMLElement;
            if (btnEliminar) {
              e.preventDefault();
              btnEliminar.click();
              return;
            }
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            setShowCatDropdown(false);
            document.getElementById('input-categoria-producto')?.focus();
            return;
          }
        }

        // Botón eliminar dentro del desplegable
        if (active?.classList.contains('btn-eliminar-cat')) {
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            const parentItem = active.closest('[data-cat-item="true"]') as HTMLElement;
            parentItem?.focus();
            return;
          }
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            setShowCatDropdown(false);
            document.getElementById('input-codigo-producto')?.focus();
            return;
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            const items = Array.from(document.querySelectorAll('[data-cat-item="true"]')) as HTMLElement[];
            const currentItem = active.closest('[data-cat-item="true"]') as HTMLElement;
            const idx = items.indexOf(currentItem);
            if (idx !== -1 && idx < items.length - 1) {
              items[idx + 1].focus();
            }
            return;
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            const items = Array.from(document.querySelectorAll('[data-cat-item="true"]')) as HTMLElement[];
            const currentItem = active.closest('[data-cat-item="true"]') as HTMLElement;
            const idx = items.indexOf(currentItem);
            if (idx > 0) {
              items[idx - 1].focus();
            } else {
              document.getElementById('input-categoria-producto')?.focus();
            }
            return;
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            setShowCatDropdown(false);
            document.getElementById('input-categoria-producto')?.focus();
            return;
          }
        }

        // Botón superior "+ AGREGAR"
        if (active?.id === 'btn-agregar-categoria') {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            document.getElementById('input-categoria-producto')?.focus();
            return;
          }
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            document.getElementById('btn-cerrar-lista-categoria')?.focus();
            return;
          }
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            document.getElementById('input-categoria-producto')?.focus();
            return;
          }
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCrearCategoria(formData.category);
            return;
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            setShowCatDropdown(false);
            document.getElementById('input-categoria-producto')?.focus();
            return;
          }
        }

        // Botón superior "CERRAR LISTA"
        if (active?.id === 'btn-cerrar-lista-categoria') {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            document.getElementById('input-categoria-producto')?.focus();
            return;
          }
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            const btnAdd = document.getElementById('btn-agregar-categoria');
            if (btnAdd) btnAdd.focus();
            else document.getElementById('input-categoria-producto')?.focus();
            return;
          }
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            setShowCatDropdown(false);
            document.getElementById('input-codigo-producto')?.focus();
            return;
          }
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
            e.preventDefault();
            setShowCatDropdown(false);
            document.getElementById('input-categoria-producto')?.focus();
            return;
          }
        }

        // Código (SKU): Enter/↓ pasa al código de barras
        if (active?.id === 'input-codigo-producto') {
          const input = active as HTMLInputElement;
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            document.getElementById('input-nombre-producto')?.focus();
            return;
          }
          if (e.key === 'ArrowDown' || e.key === 'Enter' || (e.key === 'ArrowRight' && input.selectionEnd === input.value.length)) {
            e.preventDefault();
            document.getElementById('input-barcode-producto')?.focus();
            return;
          }
          if (e.key === 'ArrowLeft' && (!input.value || input.selectionStart === 0)) {
            e.preventDefault();
            document.getElementById('input-categoria-producto')?.focus();
            return;
          }
        }

        // Código de Barras / Escáner
        if (active?.id === 'input-barcode-producto') {
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            document.getElementById('input-nombre-producto')?.focus();
            return;
          }
          if (e.key === 'ArrowDown' || e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('input-buscar-foto-producto')?.focus();
            return;
          }
          if (e.key === 'ArrowLeft') {
            const input = active as HTMLInputElement;
            if (!input.value || input.selectionStart === 0) {
              e.preventDefault();
              document.getElementById('input-codigo-producto')?.focus();
              return;
            }
          }
        }

        // Buscar Imagen
        if (active?.id === 'input-buscar-foto-producto') {
          // Resultados a la vista: elegir con el teclado (↓/Enter marca, ← → mueve, Enter aplica, ↑ vuelve al texto)
          const hayResultados = showImageResults && imageResults.length > 0 && !formData.image;
          if (hayResultados && imgResaltada >= 0) {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
              e.preventDefault();
              setImgResaltada(Math.min(imageResults.length - 1, Math.max(0, imgResaltada + (e.key === 'ArrowRight' ? 1 : -1))));
              return;
            }
            if (e.key === 'Enter') {
              e.preventDefault();
              aplicarImagen(imageResults[imgResaltada]);
              return;
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              setImgResaltada(-1);
              return;
            }
          }
          if (hayResultados && imgResaltada < 0 && (e.key === 'ArrowDown' || e.key === 'Enter')) {
            e.preventDefault();
            setImgResaltada(0);
            return;
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            document.getElementById('input-categoria-producto')?.focus();
            return;
          }
          if (e.key === 'ArrowRight' && (active as HTMLInputElement).selectionEnd === (active as HTMLInputElement).value?.length) {
            e.preventDefault();
            document.getElementById('btn-subir-local-producto')?.focus();
            return;
          }
          if (e.key === 'ArrowDown' || e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('input-precio-producto')?.focus();
            return;
          }
        }

        // Botón Subir Local
        if (active?.id === 'btn-subir-local-producto') {
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            document.getElementById('input-buscar-foto-producto')?.focus();
            return;
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            document.getElementById('input-precio-producto')?.focus();
            return;
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            document.getElementById('input-barcode-producto')?.focus();
            return;
          }
        }

        // Precio de venta sugerido
        if (active?.id === 'input-precio-producto') {
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            document.getElementById('input-buscar-foto-producto')?.focus();
            return;
          }
          if (e.key === 'ArrowDown' || e.key === 'Enter') {
            e.preventDefault();
            const next = document.getElementById('input-stock-minimo-producto') || 
                         document.getElementById('select-unidad-peso-producto') || 
                         document.getElementById('btn-guardar-producto');
            next?.focus();
            return;
          }
          if (e.key === 'ArrowRight') {
            const mayorista = document.getElementById('input-precio-mayorista-producto');
            if (mayorista) {
              e.preventDefault();
              mayorista.focus();
              return;
            }
            const next = document.getElementById('input-stock-minimo-producto') || 
                         document.getElementById('btn-guardar-producto');
            if (next) {
              e.preventDefault();
              next.focus();
              return;
            }
          }
        }

        // Precio Mayorista (Opcional)
        if (active?.id === 'input-precio-mayorista-producto') {
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prev = document.getElementById('btn-subir-local-producto') || 
                         document.getElementById('input-buscar-foto-producto');
            prev?.focus();
            return;
          }
          if (e.key === 'ArrowDown' || e.key === 'Enter') {
            e.preventDefault();
            const next = document.getElementById('select-unidad-peso-producto') || 
                         document.getElementById('input-stock-minimo-producto') || 
                         document.getElementById('btn-guardar-producto');
            next?.focus();
            return;
          }
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            document.getElementById('input-precio-producto')?.focus();
            return;
          }
        }

        // Stock Mínimo
        if (active?.id === 'input-stock-minimo-producto') {
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            document.getElementById('input-precio-producto')?.focus();
            return;
          }
          if (e.key === 'ArrowDown' || e.key === 'Enter') {
            e.preventDefault();
            const next = document.getElementById('select-unidad-peso-producto') || 
                         document.getElementById('btn-toggle-opciones-avanzadas') ||
                         document.getElementById('btn-guardar-producto');
            next?.focus();
            return;
          }
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            document.getElementById('input-precio-producto')?.focus();
            return;
          }
          if (e.key === 'ArrowRight') {
            const next = document.getElementById('select-unidad-peso-producto');
            if (next) {
              e.preventDefault();
              next.focus();
              return;
            }
          }
        }

        // Unidad de Medida (select)
        if (active?.id === 'select-unidad-peso-producto') {
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            e.stopPropagation();
            const prev = document.getElementById('input-precio-mayorista-producto') ||
                         document.getElementById('input-stock-minimo-producto') || 
                         document.getElementById('input-precio-producto');
            prev?.focus();
            return;
          }
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            e.stopPropagation();
            document.getElementById('input-stock-minimo-producto')?.focus();
            return;
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            e.stopPropagation();
            (document.getElementById('btn-toggle-opciones-avanzadas') || document.getElementById('btn-guardar-producto'))?.focus();
            return;
          }
          // Enter / Espacio despliegan la lista (antes Enter saltaba a Guardar y la lista nunca se abría)
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            try { (active as HTMLSelectElement & { showPicker?: () => void }).showPicker?.(); } catch { /* navegador sin showPicker */ }
            return;
          }
          // ← → pasan a la unidad anterior / siguiente de la lista sin abrirla (antes solo KG ↔ LT)
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            e.stopPropagation();
            const opciones = Array.from((active as HTMLSelectElement).options).map((o) => o.value);
            const i = opciones.indexOf(formData.weightUnit);
            const j = Math.max(0, Math.min(opciones.length - 1, i + (e.key === 'ArrowRight' ? 1 : -1)));
            setFormData({ ...formData, weightUnit: opciones[j] });
            return;
          }
        }

        // Botón Desplegable de Opciones Avanzadas
        if (active?.id === 'btn-toggle-opciones-avanzadas') {
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prev = document.getElementById('select-unidad-peso-producto') ||
                         document.getElementById('input-stock-minimo-producto') ||
                         document.getElementById('input-precio-mayorista-producto') ||
                         document.getElementById('input-precio-producto');
            prev?.focus();
            return;
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (showAdvancedPanel) {
              const next = document.getElementById('input-marca-producto') ||
                           document.getElementById('input-meses-garantia-producto') ||
                           document.getElementById('escala-desde-0') ||
                           document.getElementById('pres-unidad-0') ||
                           document.getElementById('check-tiene-variantes') ||
                           document.getElementById('btn-tipo-estandar') ||
                           document.getElementById('btn-guardar-producto');
              next?.focus();
            } else {
              document.getElementById('btn-guardar-producto')?.focus();
            }
            return;
          }
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            setShowAdvancedPanel(prev => !prev);
            return;
          }
        }

        // FASE 3: Navegación de campos especializados
        if (active?.id === 'input-marca-producto') {
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            document.getElementById('btn-toggle-opciones-avanzadas')?.focus();
            return;
          }
          if (e.key === 'ArrowRight' || e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('input-modelo-producto')?.focus();
            return;
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            document.getElementById('input-medida-producto')?.focus();
            return;
          }
        }

        if (active?.id === 'input-modelo-producto') {
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            document.getElementById('input-marca-producto')?.focus();
            return;
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prev = document.getElementById('select-unidad-peso-producto') ||
                         document.getElementById('input-stock-minimo-producto') ||
                         document.getElementById('input-precio-mayorista-producto');
            prev?.focus();
            return;
          }
          if (e.key === 'ArrowDown' || e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('input-medida-producto')?.focus();
            return;
          }
        }

        if (active?.id === 'input-medida-producto') {
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            document.getElementById('input-marca-producto')?.focus();
            return;
          }
          if (e.key === 'ArrowRight' || e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('input-laboratorio-producto')?.focus();
            return;
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            document.getElementById('input-ubicacion-producto')?.focus();
            return;
          }
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            document.getElementById('input-modelo-producto')?.focus();
            return;
          }
        }

        if (active?.id === 'input-laboratorio-producto') {
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            document.getElementById('input-medida-producto')?.focus();
            return;
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            document.getElementById('input-modelo-producto')?.focus();
            return;
          }
          if (e.key === 'ArrowDown' || e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('input-ubicacion-producto')?.focus();
            return;
          }
        }

        if (active?.id === 'input-ubicacion-producto') {
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            document.getElementById('input-medida-producto')?.focus();
            return;
          }
          if (e.key === 'ArrowDown' || e.key === 'Enter') {
            e.preventDefault();
            const next = document.getElementById('input-meses-garantia-producto') ||
                         document.getElementById('input-controla-series-producto') ||
                         document.getElementById('escala-desde-0') ||
                         document.getElementById('pres-unidad-0') ||
                         document.getElementById('btn-guardar-producto');
            next?.focus();
            return;
          }
        }

        if (active?.id === 'input-meses-garantia-producto') {
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            document.getElementById('input-ubicacion-producto')?.focus();
            return;
          }
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('input-controla-series-producto')?.focus();
            return;
          }
        }

        if (active?.id === 'input-controla-series-producto') {
          if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            e.preventDefault();
            document.getElementById('input-meses-garantia-producto')?.focus();
            return;
          }
          if (e.key === 'ArrowDown' || e.key === 'Enter') {
            e.preventDefault();
            document.getElementById(`btn-igv-${formData.tipoIgv}`)?.focus();
            return;
          }
        }

        // Botón Guardar
        if (active?.id === 'btn-guardar-producto') {
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            const checkEl = document.getElementById('check-tiene-variantes') as HTMLInputElement | null;
            const tieneVarsActivas = checkEl?.checked || tieneVariantes;
            const ultimasVars = Array.from(document.querySelectorAll('[id^="var-price-"]'));
            const ultimaVar = ultimasVars.length > 0 ? (ultimasVars[ultimasVars.length - 1] as HTMLElement) : null;
            const prev = document.getElementById('btn-agregar-insumo') ||
                         document.getElementById('input-buscar-insumo') ||
                         document.getElementById('btn-tipo-estandar') ||
                         (tieneVarsActivas ? (document.getElementById('btn-agregar-variante-manual') || ultimaVar) : null) ||
                         document.getElementById('check-tiene-variantes') ||
                         document.getElementById('pres-barcode-2') ||
                         document.getElementById('pres-barcode-1') ||
                         document.getElementById('pres-barcode-0') ||
                         document.getElementById('escala-precio-2') ||
                         document.getElementById('input-ubicacion-producto') ||
                         document.getElementById('btn-toggle-opciones-avanzadas') ||
                         document.getElementById('select-unidad-peso-producto') || 
                         document.getElementById('input-stock-minimo-producto') || 
                         document.getElementById('input-precio-producto');
            prev?.focus();
            return;
          }
          if (e.key === 'ArrowRight') {
            const btnIrLotes = document.getElementById('btn-guardar-ir-lotes');
            if (btnIrLotes) {
              e.preventDefault();
              btnIrLotes.focus();
              return;
            }
          }
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleSave(false);
            return;
          }
        }

        // Botón Guardar e ir a Lotes
        if (active?.id === 'btn-guardar-ir-lotes') {
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            const checkEl = document.getElementById('check-tiene-variantes') as HTMLInputElement | null;
            const tieneVarsActivas = checkEl?.checked || tieneVariantes;
            const ultimasVars = Array.from(document.querySelectorAll('[id^="var-price-"]'));
            const ultimaVar = ultimasVars.length > 0 ? (ultimasVars[ultimasVars.length - 1] as HTMLElement) : null;
            const prev = document.getElementById('btn-agregar-insumo') ||
                         document.getElementById('input-buscar-insumo') ||
                         document.getElementById('btn-tipo-estandar') ||
                         (tieneVarsActivas ? (document.getElementById('btn-agregar-variante-manual') || ultimaVar) : null) ||
                         document.getElementById('check-tiene-variantes') ||
                         document.getElementById('pres-barcode-2') ||
                         document.getElementById('pres-barcode-1') ||
                         document.getElementById('pres-barcode-0') ||
                         document.getElementById('escala-precio-2') ||
                         document.getElementById('input-ubicacion-producto') ||
                         document.getElementById('btn-toggle-opciones-avanzadas') ||
                         document.getElementById('select-unidad-peso-producto') || 
                         document.getElementById('input-stock-minimo-producto') || 
                         document.getElementById('input-precio-producto');
            prev?.focus();
            return;
          }
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            document.getElementById('btn-guardar-producto')?.focus();
            return;
          }
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleSave(true);
            return;
          }
        }
      }
    };

    window.addEventListener('keydown', handleFormKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleFormKeyDown, { capture: true });
  }, [isOpen, step, nature, formData, escalas, presentacionesForm, tieneVariantes, variantesLista, tipoCompuesto, recetaItems, isSubmitting, categoriasLista, showImageResults, imageResults, imgResaltada, showAdvancedPanel]);

  if (!isOpen) return null;

  const handleNatureSelect = (selectedNature: ProductNature) => {
    setNature(selectedNature);
    // Fase 1.1: la unidad más común de ese tipo (se cambia en "Se vende por")
    setFormData((f) => ({ ...f, weightUnit: selectedNature === 'PESO' ? (unidadDe({ unit: f.weightUnit }).tipo === 'DECIMAL' ? f.weightUnit : 'KG') : selectedNature === 'UNIDAD' ? (unidadDe({ unit: f.weightUnit }).tipo === 'ENTERA' ? f.weightUnit : 'UND') : 'CONSUMO' }));
    setStep(2);
  };

  const handleSave = async (goToLotes: boolean) => {
    if (!formData.name?.trim()) {
      setIntegrityError('El nombre del producto es obligatorio.');
      document.getElementById('input-nombre-producto')?.focus();
      return;
    }
    if (isSubmitting) return;
    // Sin internet también se crea y edita: va a la cola y se sube solo al volver (src/utils/sinInternet.ts)
    // Botón que se usó: si algo falla, el foco vuelve ahí
    const botonUsado = document.getElementById(goToLotes ? 'btn-guardar-ir-lotes' : 'btn-guardar-producto');

    const nombreLimpio = formData.name.trim().toUpperCase();
    const codigoBarrasLimpio = formData.barcode?.trim() || '';
    const codigoLimpio = formData.code?.trim().toUpperCase() || '';

    // === VALIDACIÓN DE INTEGRIDAD ===
    const isDuplicate = productosExistentes.some((p: any) => {
      // Con String(): el id puede llegar como número o como texto (copia sin internet) y el producto
      // se tomaba a sí mismo como "duplicado" y no se guardaba (MEMORIA-IA §6 n.º 6)
      if (initialData && String(p.id) === String(initialData.id)) return false;
      const mismoNombre = p.name.toUpperCase() === nombreLimpio;
      const mismoCodigoBarras = codigoBarrasLimpio !== '' && p.barcode === codigoBarrasLimpio;
      const mismoCodigo = codigoLimpio !== '' && String(p.code || '').toUpperCase() === codigoLimpio;
      return mismoNombre || mismoCodigoBarras || mismoCodigo;
    });

    // 🔥 SALIMOS ANTES DE BLOQUEAR LA PANTALLA SI HAY ERROR
    if (isDuplicate) {
       setIntegrityError('El código interno, código de barras o nombre ya existe en otro producto. Por favor asigne uno único o deje el código en blanco.');
       return; 
    }

    setIntegrityError(null);
    setIsSubmitting(true); // 🔥 AHORA SÍ, ACTIVAMOS EL "PROCESANDO..." DE FORMA SEGURA

    try {
      // Fase 1.1: la unidad elegida en "Se vende por" y su código SUNAT (Catálogo 03, src/utils/unidades.ts)
      const unidadAsignada = nature === 'CONSUMO' ? 'CONSUMO' : formData.weightUnit;
      const codigoSunat = unidadDe({ unit: unidadAsignada }).codigo;
      // Fase 1.3: precios por cantidad válidos (vacío = sin escalas); los de consumo no llevan
      const preciosCantidad = nature === 'CONSUMO' ? [] : escalasValidas(escalas.map((f) => ({ desde: f.desde, precio: f.precio })));
      // Fase 1.2: presentaciones válidas (unidad, trae 2 o más, precio); los de consumo no llevan
      const presentaciones = nature === 'CONSUMO' ? [] : presentacionesValidas(presentacionesForm.map((f) => ({ unidad: f.unidad, factor: Number(f.factor), precio: Number(f.precio), barcode: f.barcode })));
      const conEscalas = precioBloqueado ? {} : { precios_cantidad: preciosCantidad.length ? preciosCantidad : null, presentaciones: presentaciones.length ? presentaciones : null };
      let productoGuardado;

      // === SANEAMIENTO ESTRICTO DE PAYLOAD ===
      // Si el usuario deja los campos en blanco, los forzamos a NULL
      const safeCode = codigoLimpio || null;
      const safeBarcode = formData.barcode?.trim() || null;
      // Código (SKU) vacío: se genera uno de 6 dígitos (también al editar, para que ningún producto quede sin código)
      const codigoGenerado = safeCode || `SKU-${Math.floor(100000 + Math.random() * 900000)}`;

      // Fase 3: campos especializados saneados
      const safeMarca = formData.marca?.trim().toUpperCase() || null;
      const safeModelo = formData.modelo?.trim().toUpperCase() || null;
      const safeMedida = formData.medida?.trim().toUpperCase() || null;
      const safeLaboratorio = formData.laboratorio?.trim().toUpperCase() || null;
      const safeUbicacion = formData.ubicacion?.trim().toUpperCase() || null;

      const totalStockVariantes = tieneVariantes
        ? variantesLista.reduce((acc, v) => acc + (v.id ? Math.max(0, Number(v.quantity) || 0) : 0), 0)
        : null;

      if (initialData) {
        // [ RETORNO ]: MODO EDICIÓN
        const { data, error } = await supabase.from('products').update({
          name: nombreLimpio,
          category: formData.category || 'GENERAL',
          code: codigoGenerado,
          barcode: safeBarcode,
          price: Number(formData.price) || 0,
          precio_mayorista: formData.precioMayorista ? Number(formData.precioMayorista) : null,
          min_stock: Number(formData.minStock) || 5,
          control_type: nature === 'PESO' ? 'WEIGHT' : 'UND',
          weight_unit: nature === 'PESO' ? formData.weightUnit : null,
          unit: unidadAsignada,
          sunat_unit_code: codigoSunat,
          ...conEscalas,
          image_url: formData.image,
          marca: safeMarca,
          modelo: safeModelo,
          medida: safeMedida,
          laboratorio: safeLaboratorio,
          ubicacion: safeUbicacion,
          controla_series: formData.controlaSeries,
          meses_garantia: Number(formData.mesesGarantia) || 0,
          tipo_igv: formData.tipoIgv,
          es_bolsa: formData.esBolsa,
          mostrar_en_catalogo: mostrarEnCatalogo,
          destacado_catalogo: destacadoCatalogo,
          tiene_variantes: tieneVariantes,
          tipo_compuesto: tipoCompuesto,
          costo_adicional_produccion: tipoCompuesto === 'RECETA' ? (Number(costoAdicionalProd) || 0) : 0,
          ...(tieneVariantes && totalStockVariantes !== null ? { quantity: totalStockVariantes } : {}),
          is_active: 1
        }).eq('id', initialData.id).select().single();

        if (error) throw error;
        productoGuardado = data;
        
        alert(`PRODUCTO ACTUALIZADO CORRECTAMENTE.\nNombre: ${nombreLimpio}`);
      } else {
        // [ SALIDA ]: MODO CREACIÓN
        const { data, error } = await supabase.from('products').insert([{
          name: nombreLimpio,
          category: formData.category || 'GENERAL',
          code: codigoGenerado,
          barcode: safeBarcode,
          price: Number(formData.price) || 0,
          precio_mayorista: formData.precioMayorista ? Number(formData.precioMayorista) : null,
          quantity: tieneVariantes && totalStockVariantes !== null ? totalStockVariantes : 0,
          min_stock: Number(formData.minStock) || 5,
          control_type: nature === 'PESO' ? 'WEIGHT' : 'UND',
          weight_unit: nature === 'PESO' ? formData.weightUnit : null,
          unit: unidadAsignada,
          sunat_unit_code: codigoSunat,
          ...conEscalas,
          image_url: formData.image,
          marca: safeMarca,
          modelo: safeModelo,
          medida: safeMedida,
          laboratorio: safeLaboratorio,
          ubicacion: safeUbicacion,
          controla_series: formData.controlaSeries,
          meses_garantia: Number(formData.mesesGarantia) || 0,
          tipo_igv: formData.tipoIgv,
          es_bolsa: formData.esBolsa,
          mostrar_en_catalogo: mostrarEnCatalogo,
          destacado_catalogo: destacadoCatalogo,
          tiene_variantes: tieneVariantes,
          tipo_compuesto: tipoCompuesto,
          costo_adicional_produccion: tipoCompuesto === 'RECETA' ? (Number(costoAdicionalProd) || 0) : 0,
          is_synced: '1',
          is_active: 1 // <--- 🔥 ¡SEGUNDA LÍNEA MÁGICA PARA LOS PRODUCTOS!
        }]).select().single();

        if (error) throw error;
        productoGuardado = data;
        alert(`PRODUCTO CREADO CORRECTAMENTE.\nNombre: ${nombreLimpio}`);
      }

      // FASE 7: Guardar y sincronizar variantes en product_variants
      let variantesGuardadasFinales: any[] = [];
      if (tieneVariantes && variantesLista.length > 0) {
        const idsConservados: any[] = [];
        for (const v of variantesLista) {
          const varPayload: any = {
            product_id: productoGuardado.id,
            nombre_variante: (v.nombre_variante.trim() || `${v.talla} ${v.color}`).trim().toUpperCase() || 'VAR',
            talla: v.talla.trim().toUpperCase() || null,
            color: v.color.trim().toUpperCase() || null,
            barcode: v.barcode.trim() || null,
            code: v.code.trim().toUpperCase() || null,
            price: v.price !== '' ? Number(v.price) : null,
            precio_mayorista: v.precioMayorista !== '' ? Number(v.precioMayorista) : null,
            cost_price: v.cost_price !== '' ? Number(v.cost_price) : null,
            quantity: v.id ? Math.max(0, Number(v.quantity) || 0) : 0,
            min_stock: Number(v.min_stock) || 2,
            is_active: 1,
            is_synced: 1
          };

          if (v.id) {
            const { data: vUpd } = await supabase.from('product_variants').update(varPayload).eq('id', v.id).select().single();
            idsConservados.push(v.id);
            variantesGuardadasFinales.push(vUpd || { ...varPayload, id: v.id });
          } else {
            const { data: vNew } = await supabase.from('product_variants').insert([varPayload]).select().single();
            if (vNew) {
              idsConservados.push(vNew.id);
              variantesGuardadasFinales.push(vNew);
            }
          }
        }

        // Si se editaron y algunas variantes se quitaron de la lista: marcarlas is_active = 0
        if (initialData?.variantes && Array.isArray(initialData.variantes)) {
          const eliminadas = initialData.variantes.filter((ov: any) => !idsConservados.includes(ov.id));
          for (const elim of eliminadas) {
            await supabase.from('product_variants').update({ is_active: 0 }).eq('id', elim.id);
          }
        }
      } else if (initialData?.variantes && initialData.variantes.length > 0 && !tieneVariantes) {
        // Se desactivaron las variantes del producto
        await supabase.from('product_variants').update({ is_active: 0 }).eq('product_id', productoGuardado.id);
      }

      // FASE 8: Guardar o limpiar product_recipes
      if (tipoCompuesto !== 'ESTANDAR' && recetaItems.length > 0) {
        await supabase.from('product_recipes').delete().eq('parent_product_id', productoGuardado.id);
        const recPayload = recetaItems.map(item => ({
          parent_product_id: productoGuardado.id,
          component_product_id: item.component_product_id,
          component_variant_id: item.component_variant_id || null,
          quantity: Number(item.quantity) || 1
        }));
        await supabase.from('product_recipes').insert(recPayload);
      } else if (initialData?.id) {
        await supabase.from('product_recipes').delete().eq('parent_product_id', productoGuardado.id);
      }

      // Sincronizamos con la pantalla
      if (onProductSaved) {
        onProductSaved({
          ...productoGuardado, 
          imageUrl: productoGuardado.image_url, 
          minStock: productoGuardado.min_stock,
          unit: unidadAsignada,
          is_active: 1,
          tieneVariantes,
          variantes: variantesGuardadasFinales,
          tipoCompuesto,
          costoAdicionalProduccion: Number(costoAdicionalProd) || 0,
          recetas: recetaItems
        });
      }

      resetAndClose();

      // Pasamos el producto real al Lote
      if (goToLotes && onGoToLotes) {
        onGoToLotes({ ...productoGuardado, imageUrl: productoGuardado.image_url, unit: unidadAsignada });
      }

    } catch (error: any) {
      console.error("Error al guardar:", error);
      // 🛡️ EVICAMP: Enrutamiento a UI Geométrica
      if (error?.code === '23505' || error?.message?.includes('duplicate')) {
        setIntegrityError("El Código Interno o Código de Barras que intenta guardar YA EXISTE en otro producto. Por favor, asigne un código único o deje el campo en blanco.");
      } else {
        setIntegrityError(`ERROR DE SISTEMA: ${error?.message || 'Fallo de comunicación con la base de datos.'}`);
      }
      setTimeout(() => botonUsado?.focus(), 0); // ya desbloqueado (finally)
    } finally {
      setIsSubmitting(false);
    }
  };

  // Detectar si el producto actual tiene alguna opción avanzada configurada
  const tieneOpcionesAvanzadasActivas = Boolean(
    formData.marca?.trim() ||
    formData.modelo?.trim() ||
    formData.medida?.trim() ||
    formData.laboratorio?.trim() ||
    formData.ubicacion?.trim() ||
    Number(formData.mesesGarantia || 0) > 0 ||
    formData.controlaSeries ||
    formData.tipoIgv !== 'GRAVADO' ||
    formData.esBolsa ||
    escalas.some(e => e.desde && e.precio) ||
    presentacionesForm.some(p => p.factor && p.precio) ||
    tieneVariantes ||
    tipoCompuesto !== 'ESTANDAR' ||
    recetaItems.length > 0
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 font-mono overflow-hidden">
      <div className={`ventana-sobria bg-[var(--color-surface)] w-full border-2 border-[var(--color-ink)] flex flex-col max-h-[calc(94dvh/var(--ui-zoom))] sm:max-h-[calc(88dvh/var(--ui-zoom))] sm:mt-2 transition-all duration-300 ${step === 1 ? 'max-w-4xl' : 'max-w-4xl'}`}>

        {/* HEADER */}
        <div style={{ '--icono': 'var(--color-accent-shadow)' } as React.CSSProperties} className="ventana-cabecera bg-[var(--color-ink)] text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {step === 2 && (
              <button 
                id="btn-volver-step-1"
                onClick={() => setStep(1)} 
                className="hover:text-[var(--color-success)] focus:text-[var(--color-success)] focus:outline-none focus:ring-2 focus:ring-[var(--color-success)] p-1 transition-colors mr-2 cursor-pointer"
                title="Volver a seleccionar tipo"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <div>
              <h2 className="ventana-cabecera__titulo text-sm font-black uppercase tracking-widest text-[var(--color-success)]">
                {step === 1 ? 'Paso 1: Naturaleza del Producto' : 'Paso 2: Detalles del Producto'}
              </h2>
              <p className="text-[10px] font-bold opacity-80 uppercase tracking-wider">
                {step === 1 ? 'Selecciona cómo se controlará el stock' : `Configurando producto por ${nature}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              id="btn-cerrar-modal-producto"
              onClick={resetAndClose} 
              className="ventana-cerrar hover:text-[var(--color-danger)] focus:text-[var(--color-danger)] focus:outline-none focus:ring-2 focus:ring-red-400 focus:bg-white/20 p-1.5 transition-colors cursor-pointer rounded-none"
              title="Cerrar ventana (Escape)"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* CUERPO DEL MODAL */}
        <div className="p-4 sm:p-8 overflow-y-auto custom-scrollbar bg-[var(--color-surface)] flex-1 min-h-0">
          
          {/* VISTA 1: SELECCIÓN DE NATURALEZA */}
          {step === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Opción: UNIDAD */}
              <button 
                id="btn-naturaleza-unidad"
                onClick={() => handleNatureSelect('UNIDAD')}
                className={`bg-[var(--color-surface)] border-2 ${nature === 'UNIDAD' ? 'border-[var(--color-success)] shadow-[4px_4px_0_0_var(--color-success)]' : 'border-[#E2E8F0]'} p-6 flex flex-col items-center text-center gap-4 hover:border-[var(--color-success)] hover:shadow-[4px_4px_0_0_var(--color-success)] hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-[var(--color-success)] focus:shadow-[4px_4px_0_0_var(--color-success)] focus:-translate-y-1 transition-all cursor-pointer group rounded-none`}
              >
                <div className="w-16 h-16 bg-[#F8FAFC] rounded-none flex items-center justify-center group-hover:bg-[#ECFDF5] transition-colors border-2 border-[#E2E8F0] group-hover:border-[var(--color-success)]">
                  <Package size={32} className="text-[#64748B] group-hover:text-[var(--color-success)] transition-colors" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-[var(--color-ink)] uppercase tracking-widest mb-2">Por Unidad</h3>
                  <p className="text-[9px] font-bold text-[#64748B] uppercase">Se vende entero: unidad, bolsa, caja, paquete, docena, par, rollo…</p>
                </div>
              </button>

              {/* Opción: PESO */}
              <button 
                id="btn-naturaleza-peso"
                onClick={() => handleNatureSelect('PESO')}
                className={`bg-[var(--color-surface)] border-2 ${nature === 'PESO' ? 'border-[#3B82F6] shadow-[4px_4px_0_0_#3B82F6]' : 'border-[#E2E8F0]'} p-6 flex flex-col items-center text-center gap-4 hover:border-[#3B82F6] hover:shadow-[4px_4px_0_0_#3B82F6] hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-[#3B82F6] focus:shadow-[4px_4px_0_0_#3B82F6] focus:-translate-y-1 transition-all cursor-pointer group rounded-none`}
              >
                <div className="w-16 h-16 bg-[#F8FAFC] rounded-none flex items-center justify-center group-hover:bg-[#EFF6FF] transition-colors border-2 border-[#E2E8F0] group-hover:border-[#3B82F6]">
                  <Scale size={32} className="text-[#64748B] group-hover:text-[#3B82F6] transition-colors" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-[var(--color-ink)] uppercase tracking-widest mb-2">Por Peso o Medida</h3>
                  <p className="text-[9px] font-bold text-[#64748B] uppercase">Se vende con decimales: kilo, gramo, litro, galón, metro, metro cuadrado…</p>
                </div>
              </button>

              {/* Opción: CONSUMO */}
              <button 
                id="btn-naturaleza-consumo"
                onClick={() => handleNatureSelect('CONSUMO')}
                className={`bg-[var(--color-surface)] border-2 ${nature === 'CONSUMO' ? 'border-[var(--color-warning)] shadow-[4px_4px_0_0_var(--color-warning)]' : 'border-[#E2E8F0]'} p-6 flex flex-col items-center text-center gap-4 hover:border-[var(--color-warning)] hover:shadow-[4px_4px_0_0_var(--color-warning)] hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-[var(--color-warning)] focus:shadow-[4px_4px_0_0_var(--color-warning)] focus:-translate-y-1 transition-all cursor-pointer group rounded-none`}
              >
                <div className="w-16 h-16 bg-[#F8FAFC] rounded-none flex items-center justify-center group-hover:bg-[#FFFBEB] transition-colors border-2 border-[#E2E8F0] group-hover:border-[var(--color-warning)]">
                  <Coffee size={32} className="text-[#64748B] group-hover:text-[var(--color-warning)] transition-colors" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-[var(--color-ink)] uppercase tracking-widest mb-2">Uso Interno / Servicio</h3>
                  <p className="text-[9px] font-bold text-[#64748B] uppercase">Insumos de consumo propio o servicios que no requieren stock estricto.</p>
                </div>
              </button>

            </div>
          )}

          {/* VISTA 2: FORMULARIO DINÁMICO */}
          {step === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* === INYECCIÓN: ALERTA DE ERROR TÉCNICO === */}
              <div className="md:col-span-2">
                {integrityError && <TechnicalAlert message={integrityError} />}
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-black text-[var(--color-ink)] uppercase tracking-wider">Nombre del Producto</label>
                <input 
                  id="input-nombre-producto"
                  type="text"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  name="prod_nombre_no_history"
                  data-lpignore="true"
                  data-form-type="other"
                  placeholder="EJ: COCA COLA 3 LITROS RETORNABLE..."
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-[var(--color-surface)] border-2 border-[#CBD5E1] p-2.5 text-xs font-black text-[var(--color-ink)] uppercase outline-none focus:border-[var(--color-success)] transition-colors"
                />
              </div>

              <div ref={catContainerRef} className="space-y-1.5 relative">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black text-[var(--color-ink)] uppercase tracking-wider">Categoría</label>
                  
                  {/* CONTROLES SUPERIORES: AGREGAR Y CERRAR */}
                  {showCatDropdown && (
                    <div className="flex items-center gap-3">
                      {formData.category?.trim() && !categoriasLista.includes(formData.category.trim().toUpperCase()) && (
                        <button 
                          id="btn-agregar-categoria"
                          type="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.preventDefault();
                            handleCrearCategoria(formData.category);
                          }}
                          className="text-[11px] font-black text-[var(--color-success)] uppercase hover:underline focus:underline focus:outline-none focus:ring-1 focus:ring-[var(--color-success)] cursor-pointer flex items-center gap-1"
                        >
                          <Plus size={12} /> AGREGAR "{formData.category.trim().toUpperCase()}"
                        </button>
                      )}
                      <button 
                        id="btn-cerrar-lista-categoria"
                        type="button"
                        tabIndex={0}
                        onClick={() => setShowCatDropdown(false)} 
                        className="text-[10px] font-bold text-[var(--color-danger)] uppercase hover:underline focus:underline focus:outline-none focus:ring-1 focus:ring-[var(--color-danger)] cursor-pointer"
                      >
                        Cerrar Lista
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="relative">
                  <input 
                    id="input-categoria-producto"
                    type="text"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    name="prod_categoria_no_history"
                    data-lpignore="true"
                    data-form-type="other"
                    placeholder="BUSCAR O ESCRIBIR CATEGORÍA..."
                    value={formData.category}
                    onChange={(e) => {
                      setFormData(prev => ({...prev, category: e.target.value.toUpperCase()}));
                      setShowCatDropdown(true);
                    }}
                    onFocus={() => setShowCatDropdown(true)}
                    className="w-full bg-[var(--color-surface)] border-2 border-[#CBD5E1] p-2.5 text-xs font-black text-[var(--color-ink)] uppercase outline-none focus:border-[var(--color-success)] focus:ring-2 focus:ring-[var(--color-success)] transition-colors"
                  />
                  
                  {/* DROPDOWN INTELIGENTE DE CATEGORÍAS */}
                  {showCatDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-surface)] border-2 border-[var(--color-ink)] shadow-[4px_4px_0_0_var(--color-ink)] z-50 max-h-56 overflow-y-auto custom-scrollbar">
                      {/* Opción rápida de agregar si la categoría escrita no existe en la lista */}
                      {formData.category?.trim() && !categoriasLista.includes(formData.category.trim().toUpperCase()) && (
                        <div 
                          data-cat-item="true"
                          role="option"
                          tabIndex={0}
                          onClick={() => handleCrearCategoria(formData.category)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleCrearCategoria(formData.category);
                            }
                          }}
                          className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-800 font-black text-xs uppercase cursor-pointer hover:bg-[#1E293B] hover:text-white focus:!bg-[#1E293B] focus:!text-white border-b-2 border-[#1E293B] outline-none transition-colors group"
                        >
                          <Plus size={14} className="shrink-0 text-emerald-600 group-hover:text-emerald-400 group-focus:text-emerald-400" />
                          <span className="flex-1">CREAR NUEVA CATEGORÍA "{formData.category.trim().toUpperCase()}"</span>
                        </div>
                      )}

                      {categoriasLista.filter(c => c.includes(formData.category?.trim().toUpperCase() || '')).length > 0 ? (
                        categoriasLista.filter(c => c.includes(formData.category?.trim().toUpperCase() || '')).map(cat => (
                          <div 
                            key={cat} 
                            data-cat-item="true"
                            role="option"
                            tabIndex={0}
                            onClick={() => { 
                              setFormData(prev => ({...prev, category: cat})); 
                              setShowCatDropdown(false); 
                              document.getElementById('input-codigo-producto')?.focus();
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                setFormData(prev => ({...prev, category: cat})); 
                                setShowCatDropdown(false); 
                                document.getElementById('input-codigo-producto')?.focus();
                              }
                            }}
                            className="flex items-center justify-between p-3 bg-white hover:bg-[#1E293B] hover:text-white focus:!bg-[#1E293B] focus:!text-white border-b border-[#E2E8F0] last:border-0 cursor-pointer group outline-none transition-colors"
                          >
                            <span className="flex-1 text-xs font-black text-[#1E293B] group-hover:text-white group-focus:!text-white">
                              {cat}
                            </span>
                            <button 
                              type="button"
                              tabIndex={0}
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                handleEliminarCategoria(cat);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleEliminarCategoria(cat);
                                }
                              }}
                              className="btn-eliminar-cat text-[#94A3B8] group-hover:text-slate-300 group-focus:text-slate-300 hover:text-red-500 hover:bg-red-50 focus:!text-white focus:!bg-red-600 focus:outline-none focus:ring-1 focus:ring-white p-1 transition-colors cursor-pointer"
                              title={`Eliminar categoría ${cat}`}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))
                      ) : (
                        !formData.category?.trim() && (
                          <div className="p-4 flex flex-col items-center justify-center gap-2 bg-[#F8FAFC] text-center">
                            <span className="text-[10px] font-bold text-[#64748B] uppercase">No hay categorías registradas.</span>
                            <span className="text-[9px] font-bold text-[var(--color-ink)] uppercase">Escribe un nombre para crear una nueva.</span>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Código (SKU) propio del negocio y código de barras; el SKU vacío se genera solo al guardar */}
              <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="input-codigo-producto" className="block text-xs font-black text-[var(--color-ink)] uppercase tracking-wider">Código (SKU)</label>
                <input
                  id="input-codigo-producto"
                  type="text"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  name="prod_code_no_history"
                  data-lpignore="true"
                  data-form-type="other"
                  placeholder="AUTOMÁTICO"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full bg-[var(--color-surface)] border-2 border-[#CBD5E1] p-2.5 text-xs font-black text-[var(--color-ink)] uppercase outline-none focus:border-[var(--color-success)] focus:ring-2 focus:ring-[var(--color-success)] transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="input-barcode-producto" className="block text-xs font-black text-[var(--color-ink)] uppercase tracking-wider">Código de Barras</label>
                <input
                  id="input-barcode-producto"
                  type="text"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  name="prod_barcode_no_history"
                  data-lpignore="true"
                  data-form-type="other"
                  placeholder="ESCANEAR O ESCRIBIR..."
                  value={formData.barcode}
                  onChange={(e) => { setFormData({...formData, barcode: e.target.value}); setCodigoParaBuscar(e.target.value); }}
                  className="w-full bg-[var(--color-surface)] border-2 border-[#CBD5E1] p-2.5 text-xs font-black text-[var(--color-ink)] uppercase outline-none focus:border-[var(--color-success)] focus:ring-2 focus:ring-[var(--color-success)] transition-colors"
                />
              </div>
                {estadoCodigo && (
                  <p role="status" className={`col-span-2 text-xs font-black uppercase tracking-wide ${
                    estadoCodigo.tipo === 'encontrado' ? 'text-[var(--color-success)]' : estadoCodigo.tipo === 'buscando' ? 'text-[var(--color-muted)]' : 'text-[var(--color-warning-dark)]'
                  }`}>
                    {estadoCodigo.tipo === 'buscando' ? '⏳ ' : estadoCodigo.tipo === 'encontrado' ? '✅ ' : 'ℹ️ '}{estadoCodigo.texto}
                  </p>
                )}
              </div>

              {/* === SECCIÓN DE BÚSQUEDA DE IMAGEN === */}
              <div className="md:col-span-2 space-y-1.5 relative">
                <label className="text-xs font-black text-[var(--color-ink)] uppercase tracking-wider">
                  Foto del Producto
                </label>
                <div className="flex flex-col sm:flex-row gap-2.5 relative">
                  <div className="flex-1 flex border-2 border-[#CBD5E1] bg-[var(--color-surface)] focus-within:border-[var(--color-success)] transition-colors relative">
                    <div className="w-12 flex items-center justify-center bg-[var(--color-surface)] border-r-2 border-[#CBD5E1] shrink-0">
                      {isSearchingImage ? (
                        <Loader2 size={16} className="text-[var(--color-success)] animate-spin" />
                      ) : (
                        <Search size={16} className="text-[#64748B]" />
                      )}
                    </div>
                    <input 
                      id="input-buscar-foto-producto"
                      type="text"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      name="prod_foto_no_history"
                      data-lpignore="true"
                      data-form-type="other"
                      placeholder="BUSCAR EN INTERNET O PEGAR ENLACE DE FOTO..."
                      // Una foto ya copiada al producto (data:...) no se muestra como texto: se ve abajo
                      value={imageQuery || (formData.image.startsWith('data:') ? '' : formData.image)}
                      onFocus={() => {
                        if (imageResults.length > 0) setShowImageResults(true);
                      }}
                      onBlur={() => setTimeout(() => setShowImageResults(false), 200)}
                      // En Google: clic derecho en la foto → "Copiar imagen", y aquí Ctrl+V
                      onPaste={(e) => {
                        const archivo = Array.from(e.clipboardData.files).find((f) => f.type.startsWith('image/'));
                        if (!archivo) return; // texto o enlace: lo maneja onChange
                        e.preventDefault();
                        void achicarImagen(archivo).then((foto) => aplicarImagen(foto)).catch(() => alert('No se pudo leer esa imagen. Prueba descargándola y usando "Subir local".'));
                      }}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.startsWith('http')) {
                          aplicarImagen(val); // enlace pegado: se guarda una copia achicada si la página lo permite
                        } else {
                          setImageQuery(val);
                          setFormData({...formData, image: ''});
                        }
                      }}
                      className="w-full p-2.5 text-xs font-black text-[var(--color-ink)] outline-none rounded-none bg-[var(--color-surface)] border-0 focus:ring-2 focus:ring-[var(--color-success)]"
                    />
                  </div>
                  
                  <label 
                    id="btn-subir-local-producto"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        const fileInput = document.getElementById('input-file-local-producto') as HTMLInputElement;
                        fileInput?.click();
                      } else if (e.key === 'ArrowLeft') {
                        e.preventDefault();
                        document.getElementById('input-buscar-foto-producto')?.focus();
                      } else if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        document.getElementById('input-precio-producto')?.focus();
                      }
                    }}
                    className="bg-[var(--color-ink)] text-white px-5 py-2.5 border-2 border-[var(--color-ink)] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] focus:bg-[var(--color-surface)] focus:text-[var(--color-ink)] transition-all cursor-pointer rounded-none shadow-[3px_3px_0_0_var(--color-ink)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] shrink-0"
                  >
                    <ImagePlus size={16} /> Subir Local
                    <input 
                      id="input-file-local-producto"
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        if(e.target.files && e.target.files[0]) {
                          // La foto se guarda achicada dentro del producto (una de Google puede pesar varios MB)
                          void achicarImagen(e.target.files[0])
                            .then((foto) => setFormData((prev) => ({ ...prev, image: foto })))
                            .catch(() => alert('No se pudo leer esa imagen. Prueba con otra (JPG o PNG).'));
                          e.target.value = ''; // permite volver a elegir el mismo archivo
                        }
                      }}
                    />
                  </label>

                  {/* GALERÍA DE RESULTADOS (DISEÑO FLOTANTE QUE NO ESTORBA) */}
                  {showImageResults && imageResults.length > 0 && !formData.image && (
                    <div className="absolute top-full left-0 w-full sm:w-[calc(100%-140px)] mt-1 p-2 border-2 border-[var(--color-ink)] bg-[#F8FAFC] shadow-[4px_4px_0_0_var(--color-ink)] z-50">
                      <div className="grid grid-cols-4 gap-2">
                        {imageResults.map((imgUrl, idx) => (
                          <div 
                            key={idx} 
                            onMouseDown={(e) => {
                              // onMouseDown evita que el onBlur del input se dispare antes
                              e.preventDefault();
                              aplicarImagen(imgUrl);
                            }}
                            aria-selected={imgResaltada === idx}
                            className={`aspect-square border-2 bg-[var(--color-surface)] hover:border-[var(--color-success)] cursor-pointer overflow-hidden transition-all hover:scale-105 flex items-center justify-center ${
                              imgResaltada === idx ? 'border-[var(--color-success)] ring-4 ring-[var(--color-success)] scale-105' : 'border-[#E2E8F0]'
                            }`}
                          >
                            <img 
                              src={imgUrl} 
                              alt="Resultado" 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // Si la imagen original se rompe, ponemos una de respaldo limpia sin letras raras
                                (e.target as HTMLImageElement).src = `https://placehold.co/200x200/F8FAFC/94A3B8?text=NO+IMAGEN`;
                              }}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="text-center mt-2 text-[9px] font-bold text-[#94A3B8] uppercase tracking-widest">
                        {imgResaltada >= 0 ? '← → para elegir · Enter para aplicar · ↑ para volver' : 'Selecciona una imagen (↓ o clic) para aplicarla'}
                      </div>
                    </div>
                  )}
                </div>

                {/* VISTA PREVIA DE LA IMAGEN SELECCIONADA */}
                {formData.image && (
                  <div className="mt-2 flex items-center gap-4 p-2 border-2 border-[#E2E8F0] bg-[#F8FAFC]">
                    <div className="w-16 h-16 border border-[#E2E8F0] overflow-hidden bg-[var(--color-surface)] shrink-0 flex items-center justify-center">
                      <img 
                        src={formData.image} 
                        alt="Vista previa" 
                        className="w-full h-full object-cover" 
                        onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/200x200/F8FAFC/94A3B8?text=ERROR`; }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-[var(--color-success)] uppercase tracking-widest">Imagen Seleccionada</p>
                      <p className="text-[9px] text-[#64748B] truncate mt-1">{formData.image}</p>
                    </div>
                    <button 
                      onClick={() => setFormData({...formData, image: ''})}
                      className="text-[var(--color-danger)] hover:bg-[#FEF2F2] p-2 transition-colors border-2 border-transparent hover:border-[var(--color-danger)] cursor-pointer"
                      title="Quitar imagen"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-[var(--color-ink)] uppercase tracking-wider flex items-center justify-between">
                  <span>Precio de Venta (PVP)</span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 font-bold">PRECIO EN CAJA</span>
                </label>
                <input 
                  id="input-precio-producto"
                  type="number"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  name="prod_precio_no_history"
                  data-lpignore="true"
                  data-form-type="other"
                  placeholder="0.00 (Precio en Caja)"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  readOnly={precioBloqueado}
                  title={precioBloqueado ? 'Necesitas el permiso "Modificar precios" para cambiar el precio' : undefined}
                  className="w-full bg-[var(--color-surface)] read-only:opacity-60 read-only:cursor-not-allowed border-2 border-[#CBD5E1] p-2.5 text-xs font-black text-[var(--color-ink)] uppercase outline-none focus:border-[var(--color-success)] focus:ring-2 focus:ring-[var(--color-success)] transition-colors"
                />
              </div>

              {/* FASE 4.4: Precio Mayorista Opcional */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-[var(--color-ink)] uppercase tracking-wider flex items-center justify-between">
                  <span>Precio Mayorista (Opcional)</span>
                  <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 font-bold">MAYORISTA</span>
                </label>
                <input 
                  id="input-precio-mayorista-producto"
                  type="number"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  name="prod_precio_mayorista_no_history"
                  data-lpignore="true"
                  data-form-type="other"
                  placeholder="0.00 (Opcional)"
                  value={formData.precioMayorista}
                  onChange={(e) => setFormData({...formData, precioMayorista: e.target.value})}
                  readOnly={precioBloqueado}
                  title={precioBloqueado ? 'Necesitas el permiso "Modificar precios" para cambiar el precio' : undefined}
                  className="w-full bg-[var(--color-surface)] read-only:opacity-60 read-only:cursor-not-allowed border-2 border-[#CBD5E1] p-2.5 text-xs font-black text-[var(--color-ink)] uppercase outline-none focus:border-[var(--color-success)] focus:ring-2 focus:ring-[var(--color-success)] transition-colors"
                />
              </div>

              {nature !== 'CONSUMO' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-[var(--color-ink)] uppercase tracking-wider">Stock Mínimo (Alerta)</label>
                  <input 
                    id="input-stock-minimo-producto"
                    type="number"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    name="prod_minstock_no_history"
                    data-lpignore="true"
                    data-form-type="other"
                    value={formData.minStock}
                    onChange={(e) => setFormData({...formData, minStock: e.target.value})}
                    className="w-full bg-[var(--color-surface)] border-2 border-[#CBD5E1] p-2.5 text-xs font-black text-[var(--color-ink)] uppercase outline-none focus:border-[var(--color-success)] focus:ring-2 focus:ring-[var(--color-success)] transition-colors"
                  />
                </div>
              )}

              {/* CAMPOS CONDICIONALES BASADOS EN LA NATURALEZA */}
              {(nature === 'PESO' || nature === 'UNIDAD') && (
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-[var(--color-ink)] uppercase tracking-wider flex justify-between">
                    <span>Unidad de Venta</span>
                    <span id="codigo-sunat-producto" className="text-[10px] text-[var(--color-muted)] font-bold">SUNAT: {unidadDe({ unit: formData.weightUnit }).codigo}</span>
                  </label>
                  <select 
                    id="select-unidad-peso-producto"
                    value={formData.weightUnit}
                    onChange={(e) => setFormData({...formData, weightUnit: e.target.value})}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        // Abrir la lista con el teclado (antes solo con el mouse)
                        e.preventDefault();
                        try { (e.currentTarget as HTMLSelectElement & { showPicker?: () => void }).showPicker?.(); } catch { /* navegador sin showPicker */ }
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        const minStock = document.getElementById('input-stock-minimo-producto');
                        if (minStock) minStock.focus();
                        else document.getElementById('input-precio-producto')?.focus();
                      } else if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        (document.getElementById('btn-toggle-opciones-avanzadas') || document.getElementById('btn-guardar-producto'))?.focus();
                      }
                    }}
                    className="w-full bg-[var(--color-surface)] border-2 border-[#CBD5E1] p-2.5 text-xs font-black text-[var(--color-ink)] uppercase outline-none focus:border-[var(--color-success)] focus:ring-2 focus:ring-[var(--color-success)] transition-colors cursor-pointer"
                  >
                    {/* Fase 1.1: unidades del Catálogo 03 de SUNAT del tipo elegido (enteras o con decimales) */}
                    {UNIDADES.filter((u) => u.tipo === (nature === 'PESO' ? 'DECIMAL' : 'ENTERA')).map((u) => (
                      <option key={u.codigo} value={u.corto}>{u.nombre} ({u.corto})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* UN SOLO BOTÓN PARA OPCIONES AVANZADAS (DESPLIEGUE HACIA ABAJO) */}
              <div className="md:col-span-2 pt-2 border-t-2 border-[var(--color-ink)]">
                <button
                  id="btn-toggle-opciones-avanzadas"
                  type="button"
                  tabIndex={0}
                  onClick={() => setShowAdvancedPanel(prev => !prev)}
                  className={`group w-full p-3.5 border-2 transition-all flex items-center justify-between cursor-pointer outline-none focus:ring-4 focus:ring-[var(--color-ink)] focus:border-[var(--color-ink)] focus:bg-[#E2E8F0] ${
                    showAdvancedPanel
                      ? 'border-[var(--color-ink)] bg-slate-100 text-[var(--color-ink)] shadow-[3px_3px_0_0_var(--color-ink)]'
                      : 'border-[#CBD5E1] hover:border-[var(--color-ink)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-slate-50 focus:shadow-[3px_3px_0_0_var(--color-ink)]'
                  }`}
                >
                  <div className="flex items-center gap-3 text-left">
                    <SlidersHorizontal size={18} className={`${showAdvancedPanel ? 'text-[var(--color-success)]' : 'text-slate-500'} group-focus:text-[var(--color-ink)]`} />
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider block">
                        {showAdvancedPanel ? '▼ Opciones Avanzadas (Ubicación, Garantías, Escalas, Tallas, Recetas)' : '▶ Más Opciones Avanzadas (Ubicación, Garantías, Escalas, Tallas, Recetas)'}
                      </span>
                      <span className="text-[10px] text-[#64748B] font-bold group-focus:text-[var(--color-ink)]">
                        {showAdvancedPanel ? 'Haz clic para replegar las opciones avanzadas' : 'Empaques por caja, tallas de ropa/calzado, recetas o ubicación en tienda'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    {tieneOpcionesAvanzadasActivas && (
                      <span className="text-[10px] font-black uppercase bg-emerald-600 text-white px-2 py-0.5">
                        ✓ Activas
                      </span>
                    )}
                    <span className={`text-xs font-black px-3.5 py-1.5 transition-all shadow-[2px_2px_0_0_var(--color-ink)] border-2 border-[var(--color-ink)] ${
                      showAdvancedPanel
                        ? 'bg-[var(--color-ink)] text-white group-focus:bg-[var(--color-success)] group-focus:text-[var(--color-ink)]'
                        : 'bg-[var(--color-ink)] text-white group-focus:bg-[var(--color-success)] group-focus:text-[var(--color-ink)]'
                    }`}>
                      {showAdvancedPanel ? 'Ocultar ▲' : 'Desplegar ▼'}
                    </span>
                  </div>
                </button>
              </div>

              {/* CONTENIDO DESPLEGABLE HACIA ABAJO DE OPCIONES AVANZADAS */}
              {showAdvancedPanel && (
                <>
                  {/* FASE 3: BÚSQUEDAS ESPECIALIZADAS Y UBICACIÓN EN TIENDA (OPCIONAL) */}
                  <div className="md:col-span-2 pt-4 border-t-2 border-[#CBD5E1] space-y-3">
                    <div className="flex items-center justify-between pb-1 border-b border-[#E2E8F0]">
                      <span className="text-xs font-black text-[var(--color-ink)] uppercase tracking-wider flex items-center gap-1.5">
                        <span>🔍 Búsqueda y Ubicación en Tienda</span>
                        <span className="text-[10px] text-[var(--color-muted)] font-bold">(OPCIONAL)</span>
                      </span>
                      <span className="text-[10px] text-[#64748B] font-bold">Filtros rápidos</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Marca */}
                      <div className="space-y-1">
                        <label htmlFor="input-marca-producto" className="block text-xs font-black text-[var(--color-ink)] uppercase tracking-wider">
                          Marca / Fabricante
                        </label>
                        <input
                          id="input-marca-producto"
                          type="text"
                          autoComplete="off"
                          placeholder="EJ: YALE, GLORIA, BOSCH"
                          value={formData.marca}
                          onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                          className="w-full bg-[var(--color-surface)] border-2 border-[#CBD5E1] p-2.5 text-xs font-black text-[var(--color-ink)] uppercase outline-none focus:border-[var(--color-success)] focus:ring-2 focus:ring-[var(--color-success)] transition-colors"
                        />
                      </div>

                      {/* Modelo */}
                      <div className="space-y-1">
                        <label htmlFor="input-modelo-producto" className="block text-xs font-black text-[var(--color-ink)] uppercase tracking-wider">
                          Modelo / Versión
                        </label>
                        <input
                          id="input-modelo-producto"
                          type="text"
                          autoComplete="off"
                          placeholder="EJ: 50MM, PLUS, X-200"
                          value={formData.modelo}
                          onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                          className="w-full bg-[var(--color-surface)] border-2 border-[#CBD5E1] p-2.5 text-xs font-black text-[var(--color-ink)] uppercase outline-none focus:border-[var(--color-success)] focus:ring-2 focus:ring-[var(--color-success)] transition-colors"
                        />
                      </div>

                      {/* Medida */}
                      <div className="space-y-1">
                        <label htmlFor="input-medida-producto" className="block text-xs font-black text-[var(--color-ink)] uppercase tracking-wider">
                          Medida / Capacidad
                        </label>
                        <input
                          id="input-medida-producto"
                          type="text"
                          autoComplete="off"
                          placeholder="EJ: 1/2 PULGADA, 500ML"
                          value={formData.medida}
                          onChange={(e) => setFormData({ ...formData, medida: e.target.value })}
                          className="w-full bg-[var(--color-surface)] border-2 border-[#CBD5E1] p-2.5 text-xs font-black text-[var(--color-ink)] uppercase outline-none focus:border-[var(--color-success)] focus:ring-2 focus:ring-[var(--color-success)] transition-colors"
                        />
                      </div>

                      {/* Laboratorio / Composición */}
                      <div className="space-y-1">
                        <label htmlFor="input-laboratorio-producto" className="block text-xs font-black text-[var(--color-ink)] uppercase tracking-wider">
                          Laboratorio / Detalle
                        </label>
                        <input
                          id="input-laboratorio-producto"
                          type="text"
                          autoComplete="off"
                          placeholder="EJ: BAYER, PARACETAMOL"
                          value={formData.laboratorio}
                          onChange={(e) => setFormData({ ...formData, laboratorio: e.target.value })}
                          className="w-full bg-[var(--color-surface)] border-2 border-[#CBD5E1] p-2.5 text-xs font-black text-[var(--color-ink)] uppercase outline-none focus:border-[var(--color-success)] focus:ring-2 focus:ring-[var(--color-success)] transition-colors"
                        />
                      </div>

                      {/* Ubicación en tienda (Full width) */}
                      <div className="space-y-1 sm:col-span-2">
                        <label htmlFor="input-ubicacion-producto" className="block text-xs font-black text-[var(--color-ink)] uppercase tracking-wider">
                          📍 Ubicación en Tienda
                        </label>
                        <input
                          id="input-ubicacion-producto"
                          type="text"
                          autoComplete="off"
                          placeholder="EJ: PASILLO 2 - ESTANTE B, VITRINA CENTRAL"
                          value={formData.ubicacion}
                          onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                          className="w-full bg-[var(--color-surface)] border-2 border-[#CBD5E1] p-2.5 text-xs font-black text-[var(--color-ink)] uppercase outline-none focus:border-[var(--color-success)] focus:ring-2 focus:ring-[var(--color-success)] transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* FASE 6: GARANTÍA Y CONTROL DE SERIES / IMEI (OPCIONAL) */}
                  <div className="md:col-span-2 pt-4 border-t-2 border-[#CBD5E1] space-y-3">
                    <div className="flex items-center justify-between pb-1 border-b border-[#E2E8F0]">
                      <span className="text-xs font-black text-[var(--color-ink)] uppercase tracking-wider flex items-center gap-1.5">
                        <span>🛡️ Garantía y Series / IMEI</span>
                        <span className="text-[10px] text-[var(--color-muted)] font-bold">(OPCIONAL)</span>
                      </span>
                      <span className="text-[10px] text-[#64748B] font-bold">Celulares, repuestos</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Meses de Garantía */}
                      <div className="space-y-1">
                        <label htmlFor="input-meses-garantia-producto" className="block text-xs font-black text-[var(--color-ink)] uppercase tracking-wider">
                          Garantía de Fábrica (Meses)
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            id="input-meses-garantia-producto"
                            type="number"
                            min="0"
                            placeholder="0"
                            value={formData.mesesGarantia}
                            onChange={(e) => setFormData({ ...formData, mesesGarantia: e.target.value })}
                            className="w-20 bg-[var(--color-surface)] border-2 border-[#CBD5E1] p-2 text-xs font-black text-center text-[var(--color-ink)] outline-none focus:border-[var(--color-success)] focus:ring-2 focus:ring-[var(--color-success)] transition-colors"
                          />
                          <span className="text-xs font-bold text-[var(--color-ink)] uppercase">meses de garantía</span>
                        </div>
                      </div>

                      {/* Control de Serie / IMEI por unidad */}
                      <div className="space-y-1 pt-1">
                        <label className="flex items-start gap-2 p-2.5 bg-[var(--color-surface)] border-2 border-[#CBD5E1] hover:border-[var(--color-success)] transition-colors cursor-pointer">
                          <input
                            id="input-controla-series-producto"
                            type="checkbox"
                            checked={formData.controlaSeries}
                            onChange={(e) => setFormData({ ...formData, controlaSeries: e.target.checked })}
                            className="w-4 h-4 mt-0.5 text-[var(--color-success)] rounded-none border-2 border-[#CBD5E1] focus:ring-2 focus:ring-[var(--color-success)] cursor-pointer shrink-0"
                          />
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-[var(--color-ink)] uppercase leading-tight">
                              Exigir Nº de Serie / IMEI al vender en Caja
                            </span>
                            <span className="text-[10px] text-[#64748B] font-bold mt-0.5">
                              Pedirá escanear o escribir el código grabado de cada unidad física.
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Fase 11.2: impuesto del producto (para boletas y facturas) y bolsas plásticas (ICBPER) */}
                  <div className="md:col-span-2 pt-4 border-t-2 border-[#CBD5E1] space-y-2" id="bloque-impuesto-producto">
                    <div className="pb-1 border-b border-[#E2E8F0] flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-[var(--color-ink)] uppercase tracking-wider">🧾 Impuesto (boletas y facturas)</span>
                      <span className="text-[10px] text-[#64748B] font-bold">Si no sabes, déjalo "Con IGV"</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {([['GRAVADO', 'Con IGV'], ['EXONERADO', 'Exonerado'], ['INAFECTO', 'Inafecto']] as const).map(([valor, nombre], i, lista) => (
                        <button
                          key={valor}
                          id={`btn-igv-${valor}`}
                          type="button"
                          aria-pressed={formData.tipoIgv === valor}
                          onClick={() => setFormData({ ...formData, tipoIgv: valor })}
                          onKeyDown={(e) => {
                            const ir = (id: string) => { e.preventDefault(); e.stopPropagation(); document.getElementById(id)?.focus(); };
                            if (e.key === 'ArrowRight') ir(lista[i + 1] ? `btn-igv-${lista[i + 1][0]}` : 'btn-es-bolsa-producto');
                            else if (e.key === 'ArrowLeft') { if (lista[i - 1]) ir(`btn-igv-${lista[i - 1][0]}`); else { e.preventDefault(); e.stopPropagation(); } }
                            else if (e.key === 'ArrowUp') ir('input-controla-series-producto');
                            else if (e.key === 'ArrowDown') {
                              e.preventDefault(); e.stopPropagation();
                              (document.getElementById('escala-desde-0') || document.getElementById('pres-unidad-0') || document.getElementById('check-tiene-variantes') || document.getElementById('btn-guardar-producto'))?.focus();
                            }
                          }}
                          className={`px-3 py-2 border-2 text-xs font-black uppercase tracking-wider cursor-pointer outline-none focus:ring-2 focus:ring-[var(--color-success)] ${
                            formData.tipoIgv === valor ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]' : 'bg-[var(--color-surface)] text-[var(--color-ink)] border-[#CBD5E1] hover:border-[var(--color-ink)]'
                          }`}
                        >
                          {nombre}
                        </button>
                      ))}
                      <button
                        id="btn-es-bolsa-producto"
                        type="button"
                        role="switch"
                        aria-checked={formData.esBolsa}
                        onClick={() => setFormData({ ...formData, esBolsa: !formData.esBolsa })}
                        onKeyDown={(e) => {
                          const ir = (id: string) => { e.preventDefault(); e.stopPropagation(); document.getElementById(id)?.focus(); };
                          if (e.key === 'ArrowLeft') ir('btn-igv-INAFECTO');
                          else if (e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); }
                          else if (e.key === 'ArrowUp') ir('input-controla-series-producto');
                          else if (e.key === 'ArrowDown') {
                            e.preventDefault(); e.stopPropagation();
                            (document.getElementById('escala-desde-0') || document.getElementById('pres-unidad-0') || document.getElementById('check-tiene-variantes') || document.getElementById('btn-guardar-producto'))?.focus();
                          }
                        }}
                        className={`ml-0 sm:ml-3 px-3 py-2 border-2 text-xs font-black uppercase tracking-wider cursor-pointer outline-none focus:ring-2 focus:ring-[var(--color-success)] ${
                          formData.esBolsa ? 'bg-amber-500 text-white border-amber-600' : 'bg-[var(--color-surface)] text-[var(--color-ink)] border-[#CBD5E1] hover:border-[var(--color-ink)]'
                        }`}
                      >
                        {formData.esBolsa ? '✔ Es bolsa plástica' : 'Es bolsa plástica'}
                      </button>
                    </div>
                    <p className="text-[10px] font-bold text-[#64748B]">
                      {formData.tipoIgv === 'EXONERADO' ? 'Exonerado: no paga IGV (ej. algunos productos agrícolas sin procesar, libros, ventas en la Amazonía).'
                        : formData.tipoIgv === 'INAFECTO' ? 'Inafecto: está fuera del IGV por ley. Confírmalo con tu contador.'
                        : 'Con IGV: el precio ya incluye el 18 % de IGV (la mayoría de productos).'}
                      {formData.esBolsa ? ' Bolsa plástica: el precio debe incluir el impuesto a la bolsa (ICBPER, S/ 0.50 por bolsa).' : ''}
                    </p>
                  </div>

                  {/* Fase 1.3: precios por cantidad (opcional) */}
                  {(nature === 'PESO' || nature === 'UNIDAD') && (
                    <div className="md:col-span-2 pt-4 border-t-2 border-[#CBD5E1] space-y-3" id="bloque-escalas-producto">
                      <div className="pb-1 border-b border-[#E2E8F0]">
                        <label className="text-xs font-black text-[var(--color-ink)] uppercase tracking-wider block">
                          🏷️ Precios por cantidad (Escalas de descuento)
                        </label>
                        <p className="text-[10px] font-bold text-[#64748B]">Ejemplo: desde 6 unidades a S/ 1.80. Al alcanzar esa cantidad en Caja, se aplica el precio con descuento automáticamente.{precioBloqueado ? ' (Sin permiso para cambiar precios)' : ''}</p>
                      </div>
                      <div className="space-y-2">
                        {escalas.map((f, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-[#64748B] uppercase w-12">Desde</span>
                            <input id={`escala-desde-${i}`} type="number" min="0" step="any" autoComplete="off" data-lpignore="true" placeholder="—"
                              value={f.desde} onChange={(e) => cambiarEscala(i, 'desde', e.target.value)} onKeyDown={(e) => teclasEscala(e, i, 'desde')}
                              readOnly={precioBloqueado} aria-label={`Escala ${i + 1}: desde`}
                              className="w-24 bg-[var(--color-surface)] border-2 border-[#CBD5E1] p-2 text-xs font-black text-right outline-none focus:border-[var(--color-success)] focus:ring-2 focus:ring-[var(--color-success)] read-only:opacity-60" />
                            <span className="text-[10px] font-black text-[#64748B] uppercase w-14">{formData.weightUnit} → S/</span>
                            <input id={`escala-precio-${i}`} type="number" min="0" step="0.01" autoComplete="off" data-lpignore="true" placeholder="0.00"
                              value={f.precio} onChange={(e) => cambiarEscala(i, 'precio', e.target.value)} onKeyDown={(e) => teclasEscala(e, i, 'precio')}
                              readOnly={precioBloqueado} aria-label={`Escala ${i + 1}: precio`}
                              className="w-28 bg-[var(--color-surface)] border-2 border-[#CBD5E1] p-2 text-xs font-black text-right outline-none focus:border-[var(--color-success)] focus:ring-2 focus:ring-[var(--color-success)] read-only:opacity-60" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fase 1.2: presentaciones (caja, paquete, docena…) */}
                  {(nature === 'PESO' || nature === 'UNIDAD') && (
                    <div className="md:col-span-2 pt-4 border-t-2 border-[#CBD5E1] space-y-3" id="bloque-presentaciones-producto">
                      <div className="pb-1 border-b border-[#E2E8F0]">
                        <label className="text-xs font-black text-[var(--color-ink)] uppercase tracking-wider block">
                          📦 Presentaciones (Venta por Caja, Six-pack, etc.)
                        </label>
                        <p className="text-[10px] font-bold text-[#64748B]">Ejemplo: CAJA que contiene 12 {formData.weightUnit} a S/ 60. En Caja, vender 1 caja descuenta automáticamente 12 unidades del almacén.</p>
                      </div>
                      <div className="space-y-2">
                        {presentacionesForm.map((f, i) => (
                          <div key={i} className="flex flex-wrap items-center gap-2">
                            <select id={`pres-unidad-${i}`} value={f.unidad} onChange={(e) => cambiarPres(i, 'unidad', e.target.value)} onKeyDown={(e) => teclasPres(e, i, 'unidad')}
                              disabled={precioBloqueado} aria-label={`Presentación ${i + 1}: unidad`}
                              className="w-28 bg-[var(--color-surface)] border-2 border-[#CBD5E1] p-2 text-xs font-black uppercase outline-none focus:border-[var(--color-success)] focus:ring-2 focus:ring-[var(--color-success)] cursor-pointer">
                              {UNIDADES.filter((u) => u.tipo === 'ENTERA' && u.corto !== 'UND').map((u) => <option key={u.codigo} value={u.corto}>{u.nombre}</option>)}
                            </select>
                            <span className="text-[10px] font-black text-[#64748B] uppercase">trae</span>
                            <input id={`pres-factor-${i}`} type="number" min="2" step="any" autoComplete="off" data-lpignore="true" placeholder="12"
                              value={f.factor} onChange={(e) => cambiarPres(i, 'factor', e.target.value)} onKeyDown={(e) => teclasPres(e, i, 'factor')}
                              readOnly={precioBloqueado} aria-label={`Presentación ${i + 1}: cuántas trae`}
                              className="w-20 bg-[var(--color-surface)] border-2 border-[#CBD5E1] p-2 text-xs font-black text-right outline-none focus:border-[var(--color-success)] focus:ring-2 focus:ring-[var(--color-success)] read-only:opacity-60" />
                            <span className="text-[10px] font-black text-[#64748B] uppercase">S/</span>
                            <input id={`pres-precio-${i}`} type="number" min="0" step="0.01" autoComplete="off" data-lpignore="true" placeholder="0.00"
                              value={f.precio} onChange={(e) => cambiarPres(i, 'precio', e.target.value)} onKeyDown={(e) => teclasPres(e, i, 'precio')}
                              readOnly={precioBloqueado} aria-label={`Presentación ${i + 1}: precio`}
                              className="w-24 bg-[var(--color-surface)] border-2 border-[#CBD5E1] p-2 text-xs font-black text-right outline-none focus:border-[var(--color-success)] focus:ring-2 focus:ring-[var(--color-success)] read-only:opacity-60" />
                            <input id={`pres-barcode-${i}`} type="text" autoComplete="off" data-lpignore="true" placeholder="Código de barras (opcional)"
                              value={f.barcode} onChange={(e) => cambiarPres(i, 'barcode', e.target.value)} onKeyDown={(e) => teclasPres(e, i, 'barcode')}
                              readOnly={precioBloqueado} aria-label={`Presentación ${i + 1}: código de barras`}
                              className="w-full sm:flex-1 min-w-[140px] bg-[var(--color-surface)] border-2 border-[#CBD5E1] p-2 text-xs font-black outline-none focus:border-[var(--color-success)] focus:ring-2 focus:ring-[var(--color-success)] read-only:opacity-60" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* FASE 7: TALLAS Y COLORES (VARIANTES CON STOCK PROPIO) */}
                  {(nature === 'UNIDAD' || nature === 'PESO') && (
                    <div className="md:col-span-2 pt-4 border-t-2 border-[#CBD5E1] space-y-3" id="bloque-variantes-producto">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E2E8F0]">
                        <div className="flex items-center gap-2">
                          <Layers size={18} className="text-fuchsia-600 shrink-0" />
                          <div>
                            <span className="text-xs font-black text-[var(--color-ink)] uppercase tracking-wider block">
                              Tallas y Colores (Variantes)
                            </span>
                            <span className="text-[10px] text-[#64748B] font-bold">
                              Permite gestionar stock y precios independientes por cada talla o color
                            </span>
                          </div>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer self-start sm:self-auto bg-[var(--color-surface)] px-3 py-1.5 border-2 border-[var(--color-ink)] font-black text-xs uppercase hover:bg-fuchsia-50 transition-colors shadow-[2px_2px_0_0_var(--color-ink)]">
                          <input
                            id="check-tiene-variantes"
                            type="checkbox"
                            checked={tieneVariantes}
                            onChange={(e) => {
                              const val = e.target.checked;
                              setTieneVariantes(val);
                              if (val && variantesLista.length === 0) {
                                agregarVarianteVacia();
                              }
                            }}
                            className="w-4 h-4 text-fuchsia-600 rounded-none border-2 border-[var(--color-ink)] cursor-pointer"
                          />
                          <span>{tieneVariantes ? 'Variantes Activadas' : 'Activar Variantes'}</span>
                        </label>
                      </div>

                      {tieneVariantes && (
                        <div className="space-y-3">
                          {/* Tabla de Variantes (fluye con el modal principal) */}
                          {variantesLista.length > 0 && (
                            <div className="space-y-2">
                              {variantesLista.map((v, idx) => (
                                <div key={idx} className="bg-[var(--color-surface)] p-2.5 border-2 border-[#CBD5E1] space-y-2 text-xs">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-black text-xs uppercase text-[var(--color-ink)] truncate">
                                      {v.nombre_variante || `Variante #${idx + 1}`}
                                    </span>
                                    <button
                                      id={`var-quitar-${idx}`}
                                      type="button"
                                      onClick={() => eliminarVariante(idx)}
                                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                                      title="Eliminar variante"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                  <div className="grid grid-cols-4 gap-2">
                                    <input
                                      id={`var-talla-${idx}`}
                                      type="text"
                                      placeholder="Talla"
                                      value={v.talla}
                                      onChange={(e) => actualizarVariante(idx, 'talla', e.target.value)}
                                      className="bg-[var(--color-surface)] border-2 border-[#CBD5E1] p-1.5 text-xs font-black uppercase outline-none focus:border-fuchsia-600"
                                    />
                                    <input
                                      id={`var-color-${idx}`}
                                      type="text"
                                      placeholder="Color"
                                      value={v.color}
                                      onChange={(e) => actualizarVariante(idx, 'color', e.target.value)}
                                      className="bg-[var(--color-surface)] border-2 border-[#CBD5E1] p-1.5 text-xs font-black uppercase outline-none focus:border-fuchsia-600"
                                    />
                                    <input
                                      id={`var-price-${idx}`}
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      placeholder="Precio"
                                      value={v.price}
                                      onChange={(e) => actualizarVariante(idx, 'price', e.target.value)}
                                      className="bg-[var(--color-surface)] border-2 border-[#CBD5E1] p-1.5 text-xs font-black text-right outline-none focus:border-fuchsia-600"
                                      title="Precio de esta variante"
                                    />
                                    <input
                                      id={`var-barcode-${idx}`}
                                      type="text"
                                      placeholder="Barras"
                                      value={v.barcode}
                                      onChange={(e) => actualizarVariante(idx, 'barcode', e.target.value)}
                                      className="bg-[var(--color-surface)] border-2 border-[#CBD5E1] p-1.5 text-xs font-black outline-none focus:border-fuchsia-600"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          <button
                            id="btn-agregar-variante-manual"
                            type="button"
                            onClick={agregarVarianteVacia}
                            className="w-full flex items-center justify-center gap-1.5 text-xs font-black uppercase text-fuchsia-700 bg-[var(--color-surface)] hover:bg-fuchsia-50 py-2.5 border-2 border-dashed border-fuchsia-400 transition-colors cursor-pointer"
                          >
                            <Plus size={15} /> Agregar Variante Manual
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* FASE 8: TIPO DE PRODUCTO Y COMPOSICIÓN (COMBOS Y RECETAS) */}
                  {nature !== 'CONSUMO' && (
                    <div className="md:col-span-2 pt-4 border-t-2 border-[#CBD5E1] space-y-3">
                      <div className="flex items-center gap-2 pb-1 border-b border-[#E2E8F0]">
                        <Boxes className="text-amber-600" size={18} />
                        <div>
                          <h4 className="text-xs font-black text-[var(--color-ink)] uppercase tracking-wider">
                            Tipo de Producto y Composición
                          </h4>
                          <p className="text-[10px] text-[#64748B] font-bold">
                            Elige si es estándar, combo o receta elaborada
                          </p>
                        </div>
                      </div>

                      {/* SELECTOR DE 3 MODOS */}
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          id="btn-tipo-estandar"
                          type="button"
                          onClick={() => setTipoCompuesto('ESTANDAR')}
                          className={`p-2.5 border-2 text-left transition-all cursor-pointer ${
                            tipoCompuesto === 'ESTANDAR'
                              ? 'border-[var(--color-ink)] bg-slate-100 shadow-[2px_2px_0_0_var(--color-ink)]'
                              : 'border-[#CBD5E1] bg-transparent opacity-60 hover:opacity-100'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-black text-xs text-[var(--color-ink)] uppercase">
                            <Package size={14} className="text-blue-600" />
                            <span>Estándar</span>
                          </div>
                          <p className="text-[9px] text-[#64748B] font-bold mt-0.5">Compra y venta directa</p>
                        </button>

                        <button
                          id="btn-tipo-combo"
                          type="button"
                          onClick={() => setTipoCompuesto('COMBO')}
                          className={`p-2.5 border-2 text-left transition-all cursor-pointer ${
                            tipoCompuesto === 'COMBO'
                              ? 'border-amber-600 bg-amber-50 shadow-[2px_2px_0_0_rgb(217,119,6)]'
                              : 'border-[#CBD5E1] bg-transparent opacity-60 hover:opacity-100'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-black text-xs text-amber-700 uppercase">
                            <Boxes size={14} className="text-amber-600" />
                            <span>Combo</span>
                          </div>
                          <p className="text-[9px] text-[#64748B] font-bold mt-0.5">Descuenta al vender</p>
                        </button>

                        <button
                          id="btn-tipo-receta"
                          type="button"
                          onClick={() => setTipoCompuesto('RECETA')}
                          className={`p-2.5 border-2 text-left transition-all cursor-pointer ${
                            tipoCompuesto === 'RECETA'
                              ? 'border-emerald-600 bg-emerald-50 shadow-[2px_2px_0_0_rgb(5,150,105)]'
                              : 'border-[#CBD5E1] bg-transparent opacity-60 hover:opacity-100'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-black text-xs text-emerald-700 uppercase">
                            <ChefHat size={14} className="text-emerald-600" />
                            <span>Receta</span>
                          </div>
                          <p className="text-[9px] text-[#64748B] font-bold mt-0.5">Se fabrica en cocina/taller</p>
                        </button>
                      </div>

                      {/* BLOQUE DE INSUMOS SI ES COMBO O RECETA */}
                      {tipoCompuesto !== 'ESTANDAR' && (
                        <div className="space-y-3 pt-3 border-t-2 border-[#CBD5E1]">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black uppercase text-[var(--color-ink)]">
                              {tipoCompuesto === 'COMBO' ? 'Componentes del Combo:' : 'Insumos que requiere cada unidad:'}
                            </span>
                            {tipoCompuesto === 'RECETA' && (
                              <div className="flex items-center gap-2">
                                <label className="text-[10px] font-bold text-[#64748B] uppercase">Costo adic.:</label>
                                <input
                                  id="input-costo-adicional-prod"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={costoAdicionalProd}
                                  onChange={(e) => setCostoAdicionalProd(e.target.value)}
                                  className="w-20 p-1.5 text-xs font-black text-right border-2 border-[#CBD5E1] bg-[var(--color-surface)] outline-none focus:border-emerald-600"
                                  title="Mano de obra o costo indirecto por unidad"
                                />
                              </div>
                            )}
                          </div>

                          {/* BUSCADOR Y AGREGADOR DE INSUMOS */}
                          <div className="flex gap-1.5 items-center relative">
                            <div className="flex-1 relative">
                              <input
                                id="input-buscar-insumo"
                                type="text"
                                placeholder="Buscar insumo por nombre o código..."
                                value={busquedaInsumo}
                                onChange={(e) => {
                                  setBusquedaInsumo(e.target.value);
                                  setShowInsumoDropdown(true);
                                }}
                                onFocus={() => setShowInsumoDropdown(true)}
                                className="w-full p-1.5 text-xs font-black uppercase border-2 border-[#CBD5E1] bg-white outline-none focus:border-amber-600"
                              />

                              {/* DROPDOWN DE INSUMOS */}
                              {showInsumoDropdown && busquedaInsumo.trim().length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 max-h-44 overflow-y-auto bg-white border-2 border-[var(--color-ink)] shadow-lg z-50 custom-scrollbar">
                                  {productosExistentes
                                    .filter((p: any) =>
                                      p.name?.toLowerCase().includes(busquedaInsumo.toLowerCase()) ||
                                      p.code?.toLowerCase().includes(busquedaInsumo.toLowerCase()) ||
                                      p.barcode?.includes(busquedaInsumo)
                                    )
                                    .slice(0, 10)
                                    .map((p: any) => (
                                      <div
                                        key={p.id}
                                        data-insumo-item="true"
                                        onClick={() => {
                                          setInsumoElegido(p);
                                          setBusquedaInsumo(p.name);
                                          setShowInsumoDropdown(false);
                                          document.getElementById('input-cant-insumo')?.focus();
                                        }}
                                        className="p-2 border-b border-[#E2E8F0] hover:bg-amber-50 cursor-pointer flex justify-between items-center text-xs"
                                      >
                                        <div>
                                          <p className="font-bold text-[var(--color-ink)] uppercase">{p.name}</p>
                                          <p className="text-[9px] text-slate-500 font-mono">
                                            Cód: {p.code || 'S/C'} · Stock: {p.quantity ?? 0} {p.unit || 'UND'}
                                          </p>
                                        </div>
                                        <span className="text-emerald-700 font-bold font-mono text-[11px]">
                                          Costo: S/ {Number(p.cost || 0).toFixed(2)}
                                        </span>
                                      </div>
                                    ))}
                                </div>
                              )}
                            </div>

                            <div className="w-16">
                              <input
                                id="input-cant-insumo"
                                type="number"
                                min="0.001"
                                step="any"
                                placeholder="Cant."
                                value={cantInsumo}
                                onChange={(e) => setCantInsumo(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    agregarInsumo();
                                    document.getElementById('input-buscar-insumo')?.focus();
                                  }
                                }}
                                className="w-full p-1.5 text-xs font-black text-right border-2 border-[#CBD5E1] bg-white outline-none focus:border-amber-600"
                                title="Cantidad requerida por unidad"
                              />
                            </div>

                            <button
                              id="btn-agregar-insumo"
                              type="button"
                              onClick={agregarInsumo}
                              className="px-2.5 py-1.5 bg-[var(--color-ink)] text-white text-xs font-black uppercase hover:bg-amber-600 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Plus size={13} />
                            </button>
                          </div>

                          {/* TABLA DE INSUMOS CONFIGURADOS */}
                          {recetaItems.length > 0 ? (
                            <div className="border border-[#CBD5E1] overflow-hidden">
                              <div className="grid grid-cols-12 gap-1 bg-slate-200 p-1 text-[8px] font-black uppercase text-[#64748B]">
                                <span className="col-span-6">Insumo</span>
                                <span className="col-span-2 text-right">Cant.</span>
                                <span className="col-span-3 text-right">Costo Estim.</span>
                                <span className="col-span-1 text-center">✕</span>
                              </div>
                              <div className="max-h-36 overflow-y-auto divide-y divide-slate-100">
                                {recetaItems.map((item, idx) => (
                                  <div key={idx} className="grid grid-cols-12 gap-1 p-1.5 text-xs items-center hover:bg-slate-50">
                                    <span className="col-span-6 font-bold text-[var(--color-ink)] uppercase truncate text-[11px]">
                                      {item.component_name || `Insumo #${item.component_product_id}`}
                                    </span>
                                    <span className="col-span-2 text-right font-black text-slate-700 text-[11px]">
                                      {item.quantity} {item.component_unit || 'UND'}
                                    </span>
                                    <span className="col-span-3 text-right text-slate-500 font-mono text-[10px]">
                                      S/ {(Number(item.component_cost || 0) * item.quantity).toFixed(2)}
                                    </span>
                                    <div className="col-span-1 flex justify-center">
                                      <button
                                        id={`btn-quitar-insumo-${idx}`}
                                        type="button"
                                        onClick={() => eliminarInsumo(idx)}
                                        className="p-0.5 text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                                        title="Quitar de la receta"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="p-1.5 bg-slate-100 flex justify-between items-center text-xs border-t border-slate-200">
                                <span className="text-[9px] text-[#64748B] font-bold uppercase">
                                  Total: {recetaItems.length}
                                </span>
                                <span className="font-black text-[var(--color-ink)] text-[11px]">
                                  Costo estimado:{' '}
                                  <strong className="text-emerald-700">
                                    S/{' '}
                                    {(
                                      recetaItems.reduce((acc, it) => acc + (Number(it.component_cost || 0) * it.quantity), 0) +
                                      (tipoCompuesto === 'RECETA' ? (Number(costoAdicionalProd) || 0) : 0)
                                    ).toFixed(2)}
                                  </strong>
                                </span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[9px] text-amber-700 bg-amber-50 p-1.5 border border-amber-200 font-bold">
                              ⚠️ Aún no has agregado componentes a este combo o receta.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                                  {/* FASE 10: TIENDA WEB / CATÁLOGO VIRTUAL (OPCIONAL) */}
                  <div className="md:col-span-2 pt-4 border-t-2 border-[#CBD5E1] space-y-3" id="bloque-tienda-web-producto">
                    <div className="flex items-center justify-between pb-1 border-b border-[#E2E8F0]">
                      <span className="text-xs font-black text-[var(--color-ink)] uppercase tracking-wider flex items-center gap-1.5">
                        <span>🌐 Tienda Web y Pedidos WhatsApp</span>
                        <span className="text-[10px] text-[var(--color-muted)] font-bold">(OPCIONAL)</span>
                      </span>
                      <span className="text-[10px] text-[#64748B] font-bold">Visibilidad Online</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="flex items-start gap-2.5 p-2.5 bg-[var(--color-surface)] border-2 border-[#CBD5E1] hover:border-[var(--color-success)] transition-colors cursor-pointer">
                        <input
                          id="input-mostrar-en-catalogo"
                          type="checkbox"
                          checked={mostrarEnCatalogo}
                          onChange={(e) => setMostrarEnCatalogo(e.target.checked)}
                          className="w-4 h-4 mt-0.5 text-[var(--color-success)] rounded-none border-2 border-[#CBD5E1] focus:ring-2 focus:ring-[var(--color-success)] cursor-pointer shrink-0"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-[var(--color-ink)] uppercase leading-tight">
                            Publicar en Tienda Web
                          </span>
                          <span className="text-[10px] text-[#64748B] font-bold mt-0.5">
                            Visible para clientes en PC y celular para armar pedidos.
                          </span>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 p-2.5 bg-[var(--color-surface)] border-2 border-[#CBD5E1] hover:border-[var(--color-success)] transition-colors cursor-pointer">
                        <input
                          id="input-destacado-catalogo"
                          type="checkbox"
                          checked={destacadoCatalogo}
                          onChange={(e) => setDestacadoCatalogo(e.target.checked)}
                          className="w-4 h-4 mt-0.5 text-amber-500 rounded-none border-2 border-[#CBD5E1] focus:ring-2 focus:ring-amber-500 cursor-pointer shrink-0"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-[var(--color-ink)] uppercase leading-tight flex items-center gap-1">
                            ⭐ Producto Destacado
                          </span>
                          <span className="text-[10px] text-[#64748B] font-bold mt-0.5">
                            Aparece primero en la portada de la Tienda Web.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>
                </>
              )}

            </div>
          )}

        </div>

        {/* FOOTER PRINCIPAL - Botones alineados y limpios */}
        {step === 2 && (
          <div className="bg-[var(--color-surface)] px-6 py-3.5 border-t-2 border-[var(--color-ink)] flex items-center justify-end gap-3 shrink-0">
            <button 
              id="btn-guardar-producto"
              onClick={() => handleSave(false)}
              disabled={isSubmitting}
              className="bg-[var(--color-surface)] text-[var(--color-ink)] px-5 py-2.5 border-2 border-[var(--color-ink)] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#F8FAFC] hover:border-[var(--color-success)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] focus:bg-[#E2E8F0] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[3px_3px_0_0_var(--color-ink)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] cursor-pointer rounded-none min-w-[120px]"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />} 
              <span>{isSubmitting ? 'Procesando...' : 'Guardar'}</span>
            </button>

            {nature !== 'CONSUMO' && !initialData && (
              <button 
                id="btn-guardar-ir-lotes"
                onClick={() => handleSave(true)}
                disabled={isSubmitting}
                className="bg-[var(--color-success)] text-[var(--color-ink)] px-5 py-2.5 border-2 border-[var(--color-ink)] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[var(--color-ink)] hover:text-[var(--color-success)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] focus:bg-[var(--color-ink)] focus:text-[var(--color-success)] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[3px_3px_0_0_var(--color-success)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] cursor-pointer rounded-none min-w-[180px]"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={15} /> : <Database size={15} />}
                <span>{isSubmitting ? 'Procesando...' : 'Guardar e ir a Lotes'}</span>
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
};