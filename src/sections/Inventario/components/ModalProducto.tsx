import React, { useState, useEffect, useRef } from 'react';
import { X, Package, Scale, Coffee, ArrowLeft, Save, ImagePlus, Search, Loader2, Database, Plus } from 'lucide-react';
import { supabase } from '../../../db/supabase'; // RETORNO TÉCNICO: Conexión a la DB
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';

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
  const [step, setStep] = useState<1 | 2>(1);
  const [nature, setNature] = useState<ProductNature>(null);
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
      document.getElementById('input-barcode-producto')?.focus();
    }, 50);
  };

  const handleEliminarCategoria = async (cat: string) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar la categoría "${cat}" DEFINITIVAMENTE de tu base de datos?`)) {
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
  const [imageResults, setImageResults] = useState<string[]>([]);
  const [showImageResults, setShowImageResults] = useState(false); // <-- Controla si la galería está abierta o cerrada

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
          code: initialData.code || '',
          barcode: initialData.barcode || '',
          price: initialData.price?.toString() || '',
          minStock: initialData.minStock?.toString() || '5',
          weightUnit: ['KG', 'GR', 'LT', 'ML'].includes(initialData.unit) ? initialData.unit : 'KG',
          image: initialData.image || ''
        });
        
        if (initialData.unit === 'UND') setNature('UNIDAD');
        else if (['KG', 'GR', 'LT', 'ML'].includes(initialData.unit)) setNature('PESO');
        else setNature('CONSUMO');
        
        setStep(2);
      } else {
        // MODO CREACIÓN: Limpiamos todo
        setStep(1);
        setNature(null);
        setFormData({ name: '', category: '', code: '', barcode: '', price: '', minStock: '5', weightUnit: 'KG', image: '' });
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
      const q = encodeURIComponent(query.trim());
      
      // Función inyectora: Coloca las fotos en pantalla APENAS llegan, sin esperar al otro
      const inyectarResultados = (nuevasFotos: string[]) => {
        if (abortController.signal.aborted || nuevasFotos.length === 0) return;
        
        setImageResults(prevFotos => {
          // Unimos las fotos anteriores con las nuevas, borramos duplicados y cortamos en 4
          const combinadas = Array.from(new Set([...prevFotos, ...nuevasFotos])).slice(0, 4);
          return combinadas;
        });
        
        // Si ya nos llegó al menos 1 resultado, matamos la animación de carga dando sensación de inmediatez
        setIsSearchingImage(false); 
      };

      // MOTOR 1: OpenFoodFacts -> Promesa suelta (No la esperamos con await)
      const fetchFood = fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${q}&search_simple=1&action=process&json=1&page_size=4&fields=image_front_small_url,image_url`, { 
        signal: abortController.signal 
      })
      .then(res => res.json())
      .then(data => data.products?.map((p: any) => p.image_front_small_url || p.image_url).filter(Boolean) || [])
      .then(inyectarResultados)
      .catch(() => {}); // Ignoramos errores silenciosamente para no romper el otro motor

      // MOTOR 2: Wikipedia API -> Promesa suelta
      const fetchWiki = fetch(`https://es.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${q}&prop=pageimages&pithumbsize=400&format=json&origin=*`, { 
        signal: abortController.signal 
      })
      .then(res => res.json())
      .then(data => {
        if (!data.query || !data.query.pages) return [];
        return Object.values(data.query.pages).map((p: any) => p.thumbnail?.source).filter(Boolean);
      })
      .then(inyectarResultados)
      .catch(() => {});

      // El código maestro solo espera en el fondo a que ambos terminen su trabajo para apagar el loader
      // en caso de que NINGUNO haya encontrado absolutamente nada.
      await Promise.all([fetchFood, fetchWiki]);

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
    minStock: '5',
    weightUnit: 'KG', // Solo importa si nature === 'PESO'
    image: '' // <-- NUEVO ESTADO PARA LA IMAGEN
  });

  const resetAndClose = () => {
    setIntegrityError(null);
    setStep(1);
    setNature(null);
    setFormData({ name: '', category: '', code: '', barcode: '', price: '', minStock: '5', weightUnit: 'KG', image: '' });
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
          'input-barcode-producto',
          'input-buscar-foto-producto',
          'btn-subir-local-producto',
          'input-precio-producto',
          'input-stock-minimo-producto',
          'select-unidad-peso-producto',
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
                document.getElementById('input-barcode-producto')?.focus();
              }
            }, 30);
            return;
          }
          if (e.key === 'ArrowRight') {
            const input = active as HTMLInputElement;
            if (!input.value || input.selectionEnd === input.value.length) {
              e.preventDefault();
              setShowCatDropdown(false);
              document.getElementById('input-barcode-producto')?.focus();
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
                document.getElementById('input-barcode-producto')?.focus();
              } else {
                handleCrearCategoria(typedCat);
              }
            } else {
              setShowCatDropdown(false);
              document.getElementById('input-barcode-producto')?.focus();
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
              document.getElementById('input-barcode-producto')?.focus();
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
            document.getElementById('input-barcode-producto')?.focus();
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
            document.getElementById('input-barcode-producto')?.focus();
            return;
          }
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
            e.preventDefault();
            setShowCatDropdown(false);
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
              document.getElementById('input-categoria-producto')?.focus();
              return;
            }
          }
        }

        // Buscar Imagen
        if (active?.id === 'input-buscar-foto-producto') {
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

        // Precio
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
            const next = document.getElementById('input-stock-minimo-producto') || 
                         document.getElementById('btn-guardar-producto');
            if (next) {
              e.preventDefault();
              next.focus();
              return;
            }
          }
        }

        // Stock Mínimo
        if (active?.id === 'input-stock-minimo-producto') {
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            document.getElementById('input-buscar-foto-producto')?.focus();
            return;
          }
          if (e.key === 'ArrowDown' || e.key === 'Enter') {
            e.preventDefault();
            const next = document.getElementById('select-unidad-peso-producto') || 
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

        // Unidad de Medida (select)
        if (active?.id === 'select-unidad-peso-producto') {
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            e.stopPropagation();
            const prev = document.getElementById('input-stock-minimo-producto') || 
                         document.getElementById('input-precio-producto');
            prev?.focus();
            return;
          }
          if (e.key === 'ArrowDown' || e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            document.getElementById('btn-guardar-producto')?.focus();
            return;
          }
        }

        // Botón Guardar
        if (active?.id === 'btn-guardar-producto') {
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prev = document.getElementById('select-unidad-peso-producto') || 
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
            const prev = document.getElementById('select-unidad-peso-producto') || 
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
  }, [isOpen, step, nature, formData, isSubmitting, categoriasLista]);

  if (!isOpen) return null;

  const handleNatureSelect = (selectedNature: ProductNature) => {
    setNature(selectedNature);
    setStep(2);
  };

  const handleSave = async (goToLotes: boolean) => {
    if (!formData.name?.trim()) {
      setIntegrityError('El nombre del producto es obligatorio.');
      document.getElementById('input-nombre-producto')?.focus();
      return;
    }
    if (isSubmitting) return;
    
    const nombreLimpio = formData.name.trim().toUpperCase();
    const codigoBarrasLimpio = formData.barcode?.trim() || '';

    // === VALIDACIÓN DE INTEGRIDAD ===
    const isDuplicate = productosExistentes.some((p: any) => {
      if (initialData && p.id === initialData.id) return false;
      const mismoNombre = p.name.toUpperCase() === nombreLimpio;
      const mismoCodigoBarras = codigoBarrasLimpio !== '' && p.barcode === codigoBarrasLimpio;
      return mismoNombre || mismoCodigoBarras;
    });

    // 🔥 SALIMOS ANTES DE BLOQUEAR LA PANTALLA SI HAY ERROR
    if (isDuplicate) {
       setIntegrityError('El código interno, código de barras o nombre ya existe en otro producto. Por favor asigne uno único o deje el código en blanco.');
       return; 
    }

    setIntegrityError(null);
    setIsSubmitting(true); // 🔥 AHORA SÍ, ACTIVAMOS EL "PROCESANDO..." DE FORMA SEGURA

    try {
      const unidadAsignada = nature === 'PESO' ? formData.weightUnit : (nature === 'CONSUMO' ? 'CONSUMO' : 'UND');
      let productoGuardado;

      // === SANEAMIENTO ESTRICTO DE PAYLOAD ===
      // Si el usuario deja los campos en blanco, los forzamos a NULL
      const safeCode = formData.code?.trim() || null;
      const safeBarcode = formData.barcode?.trim() || null;

      if (initialData) {
        // [ RETORNO ]: MODO EDICIÓN
        const { data, error } = await supabase.from('products').update({
          name: nombreLimpio,
          category: formData.category || 'GENERAL',
          code: safeCode,
          barcode: safeBarcode,
          price: Number(formData.price) || 0,
          min_stock: Number(formData.minStock) || 5,
          control_type: nature === 'PESO' ? 'WEIGHT' : 'UND',
          weight_unit: nature === 'PESO' ? formData.weightUnit : null,
          unit: unidadAsignada,
          image_url: formData.image,
          is_active: 1
        }).eq('id', initialData.id).select().single();

        if (error) throw error;
        productoGuardado = data;
        
        // [ SALIDA ]: Notificamos al inventario el éxito de la edición
        if (onProductSaved) {
          onProductSaved(productoGuardado);
        }
        
        alert(`PRODUCTO ACTUALIZADO CORRECTAMENTE.\nNombre: ${nombreLimpio}`);
      } else {
        // [ SALIDA ]: MODO CREACIÓN
        // RETORNO TÉCNICO: Autogenerador de código SKU de 6 dígitos si el campo está vacío
        const codigoGenerado = safeCode || `SKU-${Math.floor(100000 + Math.random() * 900000)}`;

        const { data, error } = await supabase.from('products').insert([{
          name: nombreLimpio,
          category: formData.category || 'GENERAL',
          code: codigoGenerado,
          barcode: safeBarcode,
          price: Number(formData.price) || 0,
          quantity: 0,
          min_stock: Number(formData.minStock) || 5,
          control_type: nature === 'PESO' ? 'WEIGHT' : 'UND',
          weight_unit: nature === 'PESO' ? formData.weightUnit : null,
          unit: unidadAsignada,
          image_url: formData.image, 
          is_synced: '1',
          is_active: 1 // <--- 🔥 ¡SEGUNDA LÍNEA MÁGICA PARA LOS PRODUCTOS!
        }]).select().single();

        if (error) throw error;
        productoGuardado = data;
        alert(`PRODUCTO CREADO CORRECTAMENTE.\nNombre: ${nombreLimpio}`);
      }

      // Sincronizamos con la pantalla
      if (onProductSaved) {
        onProductSaved({
          ...productoGuardado, 
          imageUrl: productoGuardado.image_url, 
          minStock: productoGuardado.min_stock,
          unit: unidadAsignada,
          is_active: 1
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
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 font-mono">
      <div className={`bg-[var(--color-surface)] w-full border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] flex flex-col max-h-[calc(94dvh/var(--ui-zoom))] sm:max-h-[calc(75dvh/var(--ui-zoom))] sm:mt-10 transition-all duration-300 ${step === 1 ? 'max-w-3xl' : 'max-w-2xl'}`}>
        
        {/* HEADER */}
        <div className="bg-[var(--color-ink)] text-white px-6 py-4 flex items-center justify-between shrink-0">
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
              <h2 className="text-sm font-black uppercase tracking-widest text-[var(--color-success)]">
                {step === 1 ? 'Paso 1: Naturaleza del Producto' : 'Paso 2: Detalles del Producto'}
              </h2>
              <p className="text-[9px] font-bold opacity-80 uppercase tracking-widest">
                {step === 1 ? 'Selecciona cómo se controlará el stock' : `Configurando producto por ${nature}`}
              </p>
            </div>
          </div>
          <button 
            id="btn-cerrar-modal-producto"
            onClick={resetAndClose} 
            className="hover:text-[var(--color-danger)] focus:text-[var(--color-danger)] focus:outline-none focus:ring-2 focus:ring-red-400 focus:bg-white/20 p-1.5 transition-colors cursor-pointer rounded-none"
            title="Cerrar ventana (Escape)"
          >
            <X size={20} />
          </button>
        </div>

        {/* CUERPO DEL MODAL */}
        <div className="p-4 sm:p-8 overflow-y-auto custom-scrollbar bg-[#F8FAFC] flex-1 min-h-0">
          
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
                  <p className="text-[9px] font-bold text-[#64748B] uppercase">Productos que se cuentan por piezas enteras (botellas, cajas, latas).</p>
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
                  <h3 className="text-xs font-black text-[var(--color-ink)] uppercase tracking-widest mb-2">Por Peso / Granel</h3>
                  <p className="text-[9px] font-bold text-[#64748B] uppercase">Productos que requieren balanza o medida fraccionada (KG, GR, Litros).</p>
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

              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-[var(--color-ink)] uppercase tracking-widest">Nombre / Descripción del Producto</label>
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
                  placeholder="Ej: COCA COLA 3 LITROS RETORNABLE..."
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-[var(--color-surface)] border-2 border-[#E2E8F0] p-3 text-xs font-black text-[var(--color-ink)] uppercase outline-none focus:border-[var(--color-success)] transition-colors"
                />
              </div>

              <div ref={catContainerRef} className="space-y-2 relative">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-[var(--color-ink)] uppercase tracking-widest">Categoría</label>
                  
                  {/* CONTROLES SUPERIORES: AGREGAR Y CERRAR */}
                  {showCatDropdown && (
                    <div className="flex items-center gap-4">
                      {formData.category?.trim() && !categoriasLista.includes(formData.category.trim().toUpperCase()) && (
                        <button 
                          id="btn-agregar-categoria"
                          type="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.preventDefault();
                            handleCrearCategoria(formData.category);
                          }}
                          className="text-[10px] font-black text-[var(--color-success)] uppercase hover:underline focus:underline focus:outline-none focus:ring-1 focus:ring-[var(--color-success)] cursor-pointer flex items-center gap-1"
                        >
                          <Plus size={12} /> AGREGAR "{formData.category.trim().toUpperCase()}"
                        </button>
                      )}
                      <button 
                        id="btn-cerrar-lista-categoria"
                        type="button"
                        tabIndex={0}
                        onClick={() => setShowCatDropdown(false)} 
                        className="text-[9px] font-bold text-[var(--color-danger)] uppercase hover:underline focus:underline focus:outline-none focus:ring-1 focus:ring-[var(--color-danger)] cursor-pointer"
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
                    placeholder="BUSCAR O ESCRIBIR NUEVA..."
                    value={formData.category}
                    onChange={(e) => {
                      setFormData(prev => ({...prev, category: e.target.value.toUpperCase()}));
                      setShowCatDropdown(true);
                    }}
                    onFocus={() => setShowCatDropdown(true)}
                    className="w-full bg-[var(--color-surface)] border-2 border-[#E2E8F0] p-3 text-xs font-black text-[var(--color-ink)] uppercase outline-none focus:border-[var(--color-success)] focus:ring-2 focus:ring-[var(--color-success)] transition-colors"
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
                              document.getElementById('input-barcode-producto')?.focus();
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                setFormData(prev => ({...prev, category: cat})); 
                                setShowCatDropdown(false); 
                                document.getElementById('input-barcode-producto')?.focus();
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

              <div className="space-y-2">
                <label className="text-[10px] font-black text-[var(--color-ink)] uppercase tracking-widest">Escáner (Cód. Barras)</label>
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
                  placeholder="ESCANEAR..."
                  value={formData.barcode}
                  onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                  className="w-full bg-[var(--color-surface)] border-2 border-[#E2E8F0] p-3 text-xs font-black text-[var(--color-ink)] uppercase outline-none focus:border-[var(--color-success)] focus:ring-2 focus:ring-[var(--color-success)] transition-colors"
                />
              </div>

              {/* === SECCIÓN DE BÚSQUEDA DE IMAGEN === */}
              <div className="md:col-span-2 space-y-2 relative">
                <label className="text-[10px] font-black text-[var(--color-ink)] uppercase tracking-widest">
                  Buscar Imagen en Internet o Pegar URL
                </label>
                <div className="flex flex-col sm:flex-row gap-3 relative">
                  <div className="flex-1 flex border-2 border-[#E2E8F0] bg-[var(--color-surface)] focus-within:border-[var(--color-success)] transition-colors relative">
                    <div className="w-12 flex items-center justify-center bg-[#F8FAFC] border-r-2 border-[#E2E8F0] shrink-0">
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
                      placeholder="EJ: PERA, COCA COLA, TALADRO O PEGAR URL..."
                      value={imageQuery || formData.image}
                      onFocus={() => {
                        if (imageResults.length > 0) setShowImageResults(true);
                      }}
                      onBlur={() => setTimeout(() => setShowImageResults(false), 200)} 
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.startsWith('http')) {
                          setFormData({...formData, image: val});
                          setImageQuery('');
                          setImageResults([]);
                          setShowImageResults(false);
                        } else {
                          setImageQuery(val);
                          setFormData({...formData, image: ''});
                        }
                      }}
                      className="w-full p-3 text-xs font-black text-[var(--color-ink)] outline-none rounded-none bg-[var(--color-surface)] border-0 focus:ring-2 focus:ring-[var(--color-success)]"
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
                    className="bg-[var(--color-ink)] text-white px-6 py-3 border-2 border-[var(--color-ink)] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] focus:bg-[var(--color-surface)] focus:text-[var(--color-ink)] transition-all cursor-pointer rounded-none shadow-[4px_4px_0_0_var(--color-ink)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] shrink-0"
                  >
                    <ImagePlus size={16} /> Subir Local
                    <input 
                      id="input-file-local-producto"
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        if(e.target.files && e.target.files[0]) {
                          // Lector de archivos local (Convierte la foto a Base64 para mostrarla al instante)
                          const file = e.target.files[0];
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setFormData({...formData, image: reader.result as string});
                          };
                          reader.readAsDataURL(file);
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
                              setFormData({...formData, image: imgUrl});
                              setImageResults([]);
                              setImageQuery('');
                              setShowImageResults(false);
                            }}
                            className="aspect-square border-2 border-[#E2E8F0] bg-[var(--color-surface)] hover:border-[var(--color-success)] cursor-pointer overflow-hidden transition-all hover:scale-105 flex items-center justify-center"
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
                        Selecciona una imagen para aplicarla
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

              <div className="space-y-2">
                <label className="text-[10px] font-black text-[var(--color-ink)] uppercase tracking-widest">Precio de Venta Sugerido</label>
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
                  placeholder="0.00"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  className="w-full bg-[var(--color-surface)] border-2 border-[#E2E8F0] p-3 text-xs font-black text-[var(--color-ink)] uppercase outline-none focus:border-[var(--color-success)] focus:ring-2 focus:ring-[var(--color-success)] transition-colors"
                />
              </div>

              {nature !== 'CONSUMO' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[var(--color-ink)] uppercase tracking-widest">Stock Mínimo (Alerta)</label>
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
                    className="w-full bg-[var(--color-surface)] border-2 border-[#E2E8F0] p-3 text-xs font-black text-[var(--color-ink)] uppercase outline-none focus:border-[var(--color-success)] focus:ring-2 focus:ring-[var(--color-success)] transition-colors"
                  />
                </div>
              )}

              {/* CAMPOS CONDICIONALES BASADOS EN LA NATURALEZA */}
              {nature === 'PESO' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[var(--color-ink)] uppercase tracking-widest">Unidad de Medida</label>
                  <select 
                    id="select-unidad-peso-producto"
                    value={formData.weightUnit}
                    onChange={(e) => setFormData({...formData, weightUnit: e.target.value})}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        const minStock = document.getElementById('input-stock-minimo-producto');
                        if (minStock) minStock.focus();
                        else document.getElementById('input-precio-producto')?.focus();
                      } else if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        document.getElementById('btn-guardar-producto')?.focus();
                      }
                    }}
                    className="w-full bg-[var(--color-surface)] border-2 border-[#E2E8F0] p-3 text-xs font-black text-[var(--color-ink)] uppercase outline-none focus:border-[var(--color-success)] focus:ring-2 focus:ring-[var(--color-success)] transition-colors cursor-pointer"
                  >
                    <option value="KG">Kilogramos (KG)</option>
                    <option value="GR">Gramos (GR)</option>
                    <option value="LT">Litros (LT)</option>
                    <option value="ML">Mililitros (ML)</option>
                  </select>
                </div>
              )}

            </div>
          )}
        </div>

        {/* FOOTER - Solo visible en el paso 2 */}
        {step === 2 && (
          <div className="flex justify-end items-center gap-4 mt-5 w-full">
              <button 
                id="btn-guardar-producto"
                onClick={() => handleSave(false)}
                disabled={isSubmitting}
                className="relative -top-8 -left-8 bg-[var(--color-surface)] text-[var(--color-ink)] px-6 py-3 border-2 border-[var(--color-ink)] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#F8FAFC] hover:border-[var(--color-success)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] focus:bg-[#E2E8F0] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[4px_4px_0_0_var(--color-ink)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] cursor-pointer rounded-none min-w-[140px]"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} 
                <span>{isSubmitting ? 'Procesando...' : 'Guardar'}</span>
              </button>

              {nature !== 'CONSUMO' && !initialData && (
                <button 
                  id="btn-guardar-ir-lotes"
                  onClick={() => handleSave(true)}
                  disabled={isSubmitting}
                  className="relative -top-8 -left-8 bg-[var(--color-success)] text-[var(--color-ink)] px-6 py-3 border-2 border-[var(--color-ink)] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[var(--color-ink)] hover:text-[var(--color-success)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] focus:bg-[var(--color-ink)] focus:text-[var(--color-success)] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[4px_4px_0_0_var(--color-success)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] cursor-pointer rounded-none min-w-[220px]"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Database size={16} />}
                  <span>{isSubmitting ? 'Procesando...' : 'Guardar e ir a Lotes'}</span>
                </button>
              )}
            </div>
        )}

      </div>
    </div>
  );
};