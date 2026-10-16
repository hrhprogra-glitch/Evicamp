import React, { useState, useEffect, useRef } from 'react';
import { Building2, FileText, MapPin, Phone, Upload, Save, Image as ImageIcon, Loader2 } from 'lucide-react';
import { supabase } from '../../../db/supabase';

// El logo se guarda como imagen dentro de empresa_config (no hay servidor de archivos en el VPS):
// se achica a 300 px como máximo para que pese poco (PNG conserva la transparencia; si pesa mucho, JPG)
const LADO_MAXIMO_LOGO = 300;
const achicarLogo = (archivo: File) =>
  new Promise<string>((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(archivo);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const escala = Math.min(1, LADO_MAXIMO_LOGO / Math.max(img.width, img.height));
      const lienzo = document.createElement('canvas');
      lienzo.width = Math.max(1, Math.round(img.width * escala));
      lienzo.height = Math.max(1, Math.round(img.height * escala));
      lienzo.getContext('2d')!.drawImage(img, 0, 0, lienzo.width, lienzo.height);
      const png = lienzo.toDataURL('image/png');
      if (png.length <= 200_000) return resolve(png);
      const fondo = document.createElement('canvas'); // JPG no tiene transparencia: fondo blanco
      fondo.width = lienzo.width; fondo.height = lienzo.height;
      const ctx = fondo.getContext('2d')!;
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, fondo.width, fondo.height); ctx.drawImage(lienzo, 0, 0);
      resolve(fondo.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Imagen inválida')); };
    img.src = url;
  });

export const FormularioEmpresa: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [empresaId, setEmpresaId] = useState<number | null>(null);
  const [archivoLogo, setArchivoLogo] = useState<File | null>(null);
  const nombreEmpresaRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [empresa, setEmpresa] = useState({
    nombre_empresa: '',
    ruc: '',
    direccion: '',
    telefono: '',
    logo_url: '',
  });

  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        if (!document.querySelector('[role="dialog"]') && !document.querySelector('.fixed.inset-0.z-50')) {
          nombreEmpresaRef.current?.focus();
          nombreEmpresaRef.current?.select();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const focusAndSelect = (id: string) => {
    const el = document.getElementById(id) as HTMLElement | null;
    if (el) {
      el.focus();
      (el as HTMLInputElement)?.select?.();
    }
  };

  const canExitRight = (input: HTMLInputElement) => {
    const isAllSelected = input.selectionStart === 0 && input.selectionEnd === input.value.length;
    const isAtEnd = input.selectionStart === input.value.length;
    return isAllSelected || isAtEnd;
  };

  const canExitLeft = (input: HTMLInputElement) => {
    const isAllSelected = input.selectionStart === 0 && input.selectionEnd === input.value.length;
    const isAtStart = input.selectionStart === 0;
    return isAllSelected || isAtStart;
  };

  // 🔒 Navegación fluida con tecla Tab entre campos del formulario sin abrir el sidebar
  useEffect(() => {
    const handleTabTrap = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        const order = [
          'input-empresa-nombre',
          'input-empresa-ruc',
          'input-empresa-telefono',
          'input-empresa-direccion',
          'btn-guardar-empresa',
          'btn-subir-logo-empresa',
        ];

        const activeId = document.activeElement?.id;
        const currentIndex = order.indexOf(activeId || '');

        if (currentIndex !== -1) {
          e.preventDefault();
          e.stopPropagation();

          let nextIndex = e.shiftKey ? currentIndex - 1 : currentIndex + 1;
          if (nextIndex < 0) nextIndex = order.length - 1;
          if (nextIndex >= order.length) nextIndex = 0;

          focusAndSelect(order[nextIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleTabTrap, { capture: true });
    return () => window.removeEventListener('keydown', handleTabTrap, { capture: true });
  }, []);

  useEffect(() => {
    const fetchEmpresa = async () => {
      try {
        const { data, error } = await supabase.from('empresa_config').select('*').limit(1).single();
        if (error && error.code !== 'PGRST116') throw error;

        if (data) {
          setEmpresaId(data.id);
          setEmpresa({
            nombre_empresa: data.nombre_empresa || '',
            ruc: data.ruc || '',
            direccion: data.direccion || '',
            telefono: data.telefono || '',
            logo_url: data.logo_url || '',
          });
          setLogoPreview(data.logo_url || null); // Muestra el logo real de la base de datos
        }
      } catch (error) {
        console.error('Error cargando datos:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchEmpresa();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmpresa({ ...empresa, [e.target.name]: e.target.value });
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite volver a elegir el mismo archivo
    if (!file) return;
    try {
      setArchivoLogo(file);
      setLogoPreview(await achicarLogo(file));
    } catch {
      setArchivoLogo(null);
      alert('❌ No se pudo leer esa imagen. Prueba con un PNG o JPG.');
    }
  };

  const quitarLogo = () => {
    setArchivoLogo(null);
    setLogoPreview(null);
    setEmpresa({ ...empresa, logo_url: '' });
  };

  const handleGuardar = async () => {
    setGuardando(true);
    try {
      // El logo va dentro de la base (ya achicado), no en un servidor de archivos
      const finalLogoUrl = archivoLogo ? logoPreview : empresa.logo_url;
      const datosAGuardar = { ...empresa, logo_url: finalLogoUrl || '' };

      // Guardamos en la tabla
      if (empresaId) {
        const { error } = await supabase.from('empresa_config').update(datosAGuardar).eq('id', empresaId);
        if (error) throw error;
        alert('✅ Datos guardados correctamente. El sistema se actualizará ahora.');
        window.location.reload(); // <--- ESTA LÍNEA FUERZA LA ACTUALIZACIÓN VISUAL
      } else {
        const { error } = await supabase.from('empresa_config').insert([datosAGuardar]);
        if (error) throw error;
        alert('✅ Empresa registrada. El sistema se actualizará ahora.');
        window.location.reload(); // <--- ESTA LÍNEA FUERZA LA ACTUALIZACIÓN VISUAL
      }
      
      setArchivoLogo(null);
    } catch (error) {
      console.error('Error al guardar:', error);
      alert('❌ Hubo un error al guardar los datos');
    } finally {
      setGuardando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-4">
        <div className="w-8 h-8 border-4 border-[var(--color-border)] border-t-[var(--color-ink)] animate-spin rounded-full"></div>
        <span className="text-[12px] font-black text-[var(--color-ink)] uppercase tracking-widest font-mono">Cargando...</span>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[var(--color-border)] shadow-sm">
      <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-bg)] flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <div>
          <h2 className="text-[var(--color-ink)] font-bold uppercase text-sm flex items-center gap-2">
            <Building2 size={18} className="text-[var(--color-accent)]" />
            Perfil de la Empresa
          </h2>
          <p className="text-[var(--color-muted)] font-mono text-xs mt-1">
            Estos datos aparecerán en los tickets de venta y reportes.
          </p>
        </div>
        <button
          id="btn-guardar-empresa"
          onClick={handleGuardar}
          disabled={guardando}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              e.stopPropagation();
              document.getElementById('btn-tab-empresa')?.focus();
            } else if (e.key === 'ArrowLeft') {
              e.preventDefault();
              e.stopPropagation();
              focusAndSelect('input-empresa-nombre');
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              e.stopPropagation();
              focusAndSelect('input-empresa-telefono');
            }
          }}
          className={`${guardando ? 'bg-[var(--color-subtle)]' : 'bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)]'} text-white px-5 py-2.5 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 focus:outline-none focus:ring-4 focus:ring-[var(--color-ink)] focus:bg-[var(--color-ink)] focus:shadow-[4px_4px_0_0_var(--color-accent)] cursor-pointer`}
        >
          {guardando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {guardando ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      <div className="p-6 flex flex-col md:flex-row gap-3 lg:gap-4">
        {/* COLUMNA IZQUIERDA: LOGO */}
        <div className="w-full md:w-1/3 flex flex-col items-center md:border-r border-dashed border-[var(--color-border)] md:pr-8">
          <div 
            id="btn-subir-logo-empresa"
            role="button"
            tabIndex={0}
            title="Presiona Enter o Espacio para subir o cambiar el logo"
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                fileInputRef.current?.click();
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                e.stopPropagation();
                focusAndSelect('input-empresa-nombre');
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('btn-tab-empresa')?.focus();
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                const quitar = document.getElementById('btn-quitar-logo');
                if (quitar) quitar.focus();
                else focusAndSelect('input-empresa-ruc');
              }
            }}
            className="w-40 h-40 border-2 border-dashed border-[var(--color-line-light)] bg-[var(--color-bg)] flex flex-col items-center justify-center mb-4 relative overflow-hidden group cursor-pointer focus:outline-none focus:ring-4 focus:ring-[var(--color-ink)]"
          >
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-2" />
            ) : (
              <>
                <ImageIcon size={40} className="text-[var(--color-subtle)] mb-2" />
                <span className="text-[var(--color-muted)] text-xs font-mono text-center px-4">Sin logo actual</span>
              </>
            )}
            
            {/* Overlay para cambiar imagen */}
            <div className="absolute inset-0 bg-[var(--color-ink)]/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity text-white pointer-events-none">
              <Upload size={24} className="mb-2 text-[var(--color-accent)]" />
              <span className="text-xs font-bold uppercase tracking-wider">Subir Logo</span>
            </div>
            <input 
              ref={fileInputRef}
              autoComplete="off" 
              type="file" 
              accept="image/*" 
              onChange={handleLogoChange} 
              className="hidden" 
            />
          </div>
          <p className="text-[12px] text-[var(--color-muted)] font-mono text-center">
            Formato recomendado: PNG transparente.<br />Sale arriba en el ticket de venta.
          </p>
          {logoPreview && (
            <button
              id="btn-quitar-logo"
              type="button"
              onClick={() => {
                quitarLogo();
                setTimeout(() => document.getElementById('btn-subir-logo-empresa')?.focus(), 0);
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  e.stopPropagation();
                  document.getElementById('btn-subir-logo-empresa')?.focus();
                } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  e.stopPropagation();
                  focusAndSelect('input-empresa-ruc');
                }
              }}
              className="mt-2 px-2 py-1 text-[12px] font-mono font-bold uppercase text-[var(--color-danger)] underline cursor-pointer hover:opacity-70 focus:outline-none focus:ring-2 focus:ring-[var(--color-danger)]"
            >
              Quitar logo
            </button>
          )}
        </div>

        {/* COLUMNA DERECHA: DATOS TEXTUALES */}
        <div className="w-full md:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nombre */}
          <div className="col-span-1 md:col-span-2">
            <label className="block text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider mb-2 flex items-center gap-2">
              <Building2 size={14} className="text-[var(--color-muted)]" />
              Razón Social / Nombre Comercial
            </label>
            <input 
              id="input-empresa-nombre"
              ref={nombreEmpresaRef}
              autoComplete="off" 
              type="text"
              name="nombre_empresa"
              value={empresa.nombre_empresa}
              onChange={handleChange}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown' || e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  focusAndSelect('input-empresa-ruc');
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  e.stopPropagation();
                  document.getElementById('btn-tab-empresa')?.focus();
                } else if (e.key === 'ArrowLeft') {
                  if (canExitLeft(e.currentTarget)) {
                    e.preventDefault();
                    e.stopPropagation();
                    document.getElementById('btn-subir-logo-empresa')?.focus();
                  }
                } else if (e.key === 'ArrowRight') {
                  if (canExitRight(e.currentTarget)) {
                    e.preventDefault();
                    e.stopPropagation();
                    document.getElementById('btn-guardar-empresa')?.focus();
                  }
                }
              }}
              className="w-full border-2 border-[var(--color-border)] p-3 text-sm focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)] focus:bg-amber-50/40 outline-none transition-all uppercase"
              placeholder="Ej. Mi Bodega S.A.C."
            />
          </div>

          {/* RUC */}
          <div>
            <label className="block text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider mb-2 flex items-center gap-2">
              <FileText size={14} className="text-[var(--color-muted)]" />
              RUC
            </label>
            <input 
              id="input-empresa-ruc"
              autoComplete="off" 
              type="text"
              name="ruc"
              value={empresa.ruc}
              onChange={handleChange}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  e.stopPropagation();
                  focusAndSelect('input-empresa-direccion');
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  e.stopPropagation();
                  focusAndSelect('input-empresa-nombre');
                } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
                  if (e.key === 'Enter' || canExitRight(e.currentTarget)) {
                    e.preventDefault();
                    e.stopPropagation();
                    focusAndSelect('input-empresa-telefono');
                  }
                } else if (e.key === 'ArrowLeft') {
                  if (canExitLeft(e.currentTarget)) {
                    e.preventDefault();
                    e.stopPropagation();
                    document.getElementById('btn-subir-logo-empresa')?.focus();
                  }
                }
              }}
              className="w-full border-2 border-[var(--color-border)] p-3 text-sm focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)] focus:bg-amber-50/40 outline-none transition-all font-mono uppercase"
              placeholder="Ej. 20123456789"
              maxLength={11}
            />
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider mb-2 flex items-center gap-2">
              <Phone size={14} className="text-[var(--color-muted)]" />
              Teléfono de Contacto
            </label>
            <input 
              id="input-empresa-telefono"
              autoComplete="off" 
              type="text"
              name="telefono"
              value={empresa.telefono}
              onChange={handleChange}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown' || e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  focusAndSelect('input-empresa-direccion');
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  e.stopPropagation();
                  document.getElementById('btn-guardar-empresa')?.focus();
                } else if (e.key === 'ArrowLeft') {
                  if (canExitLeft(e.currentTarget)) {
                    e.preventDefault();
                    e.stopPropagation();
                    focusAndSelect('input-empresa-ruc');
                  }
                } else if (e.key === 'ArrowRight') {
                  if (canExitRight(e.currentTarget)) {
                    e.preventDefault();
                    e.stopPropagation();
                    document.getElementById('btn-guardar-empresa')?.focus();
                  }
                }
              }}
              className="w-full border-2 border-[var(--color-border)] p-3 text-sm focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)] focus:bg-amber-50/40 outline-none transition-all font-mono uppercase"
              placeholder="Ej. 987654321"
            />
          </div>

          {/* Dirección */}
          <div className="col-span-1 md:col-span-2">
            <label className="block text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider mb-2 flex items-center gap-2">
              <MapPin size={14} className="text-[var(--color-muted)]" />
              Dirección Fiscal
            </label>
            <input 
              id="input-empresa-direccion"
              autoComplete="off" 
              type="text"
              name="direccion"
              value={empresa.direccion}
              onChange={handleChange}
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  e.stopPropagation();
                  focusAndSelect('input-empresa-telefono');
                } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  document.getElementById('btn-guardar-empresa')?.focus();
                } else if (e.key === 'ArrowLeft') {
                  if (canExitLeft(e.currentTarget)) {
                    e.preventDefault();
                    e.stopPropagation();
                    document.getElementById('btn-subir-logo-empresa')?.focus();
                  }
                } else if (e.key === 'ArrowRight') {
                  if (canExitRight(e.currentTarget)) {
                    e.preventDefault();
                    e.stopPropagation();
                    document.getElementById('btn-guardar-empresa')?.focus();
                  }
                }
              }}
              className="w-full border-2 border-[var(--color-border)] p-3 text-sm focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)] focus:bg-amber-50/40 outline-none transition-all uppercase"
              placeholder="Ej. Av. Los Pinos 123, Distrito"
            />
          </div>
        </div>
      </div>
    </div>
  );
};


