import React, { useState, useEffect } from 'react';
import { Building2, FileText, MapPin, Phone, Upload, Save, Image as ImageIcon, Loader2 } from 'lucide-react';
import { supabase } from '../../../db/supabase';

export const FormularioEmpresa: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [empresaId, setEmpresaId] = useState<number | null>(null);
  const [archivoLogo, setArchivoLogo] = useState<File | null>(null);
  
  const [empresa, setEmpresa] = useState({
    nombre_empresa: '',
    ruc: '',
    direccion: '',
    telefono: '',
    logo_url: '',
  });

  const [logoPreview, setLogoPreview] = useState<string | null>(null);

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

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setArchivoLogo(file); // Guardamos el archivo físico para subirlo luego
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string); // Preview temporal
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGuardar = async () => {
    setGuardando(true);
    try {
      let finalLogoUrl = empresa.logo_url;

      // Si el usuario seleccionó una imagen nueva
      if (archivoLogo) {
        // 1. Borramos el antiguo del Storage para ahorrar espacio
        if (empresaId && empresa.logo_url?.includes('empresa_logos')) {
          const oldPath = empresa.logo_url.split('empresa_logos/')[1];
          if (oldPath) await supabase.storage.from('empresa_logos').remove([oldPath]);
        }

        // 2. Subimos el nuevo
        const fileExt = archivoLogo.name.split('.').pop();
        const fileName = `logo-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('empresa_logos').upload(fileName, archivoLogo);
        if (uploadError) throw uploadError;

        // 3. Obtenemos URL pública
        const { data: publicUrlData } = supabase.storage.from('empresa_logos').getPublicUrl(fileName);
        finalLogoUrl = publicUrlData.publicUrl;
      }

      const datosAGuardar = { ...empresa, logo_url: finalLogoUrl };

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
    return <div className="p-3 lg:p-4 text-center text-[var(--color-muted)] font-mono animate-pulse">Cargando datos...</div>;
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
          onClick={handleGuardar}
          disabled={guardando}
          className={`${guardando ? 'bg-[var(--color-subtle)]' : 'bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)]'} text-white px-4 py-2 font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-2`}
        >
          {guardando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {guardando ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      <div className="p-6 flex flex-col md:flex-row gap-3 lg:gap-4">
        {/* COLUMNA IZQUIERDA: LOGO */}
        <div className="w-full md:w-1/3 flex flex-col items-center md:border-r border-dashed border-[var(--color-border)] md:pr-8">
          <div className="w-40 h-40 border-2 border-dashed border-[var(--color-line-light)] bg-[var(--color-bg)] flex flex-col items-center justify-center mb-4 relative overflow-hidden group">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-2" />
            ) : (
              <>
                <ImageIcon size={40} className="text-[var(--color-subtle)] mb-2" />
                <span className="text-[var(--color-muted)] text-xs font-mono text-center px-4">Sin logo actual</span>
              </>
            )}
            
            {/* Overlay para cambiar imagen */}
            <label className="absolute inset-0 bg-[var(--color-ink)]/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
              <Upload size={24} className="mb-2 text-[var(--color-accent)]" />
              <span className="text-xs font-bold uppercase tracking-wider">Subir Logo</span>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleLogoChange} 
                className="hidden" 
              />
            </label>
          </div>
          <p className="text-[12px] text-[var(--color-muted)] font-mono text-center">
            Formato recomendado: PNG transparente.<br />Tamaño máximo: 2MB.
          </p>
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
              type="text"
              name="nombre_empresa"
              value={empresa.nombre_empresa}
              onChange={handleChange}
              className="w-full border border-[var(--color-border)] p-3 text-sm focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] outline-none transition-all"
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
              type="text"
              name="ruc"
              value={empresa.ruc}
              onChange={handleChange}
              className="w-full border border-[var(--color-border)] p-3 text-sm focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] outline-none transition-all font-mono"
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
              type="text"
              name="telefono"
              value={empresa.telefono}
              onChange={handleChange}
              className="w-full border border-[var(--color-border)] p-3 text-sm focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] outline-none transition-all font-mono"
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
              type="text"
              name="direccion"
              value={empresa.direccion}
              onChange={handleChange}
              className="w-full border border-[var(--color-border)] p-3 text-sm focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] outline-none transition-all"
              placeholder="Ej. Av. Los Pinos 123, Distrito"
            />
          </div>
        </div>
      </div>
    </div>
  );
};