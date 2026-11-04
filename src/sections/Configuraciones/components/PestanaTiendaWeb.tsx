import React, { useState, useEffect } from 'react';
import { ShoppingBag, Globe, Phone, ExternalLink, Copy, Check, Save, Loader2, Smartphone, Laptop, MessageCircle } from 'lucide-react';
import { supabase } from '../../../db/supabase';
import { avisar } from '../../../utils/dialogos';

export const PestanaTiendaWeb: React.FC = () => {
  const [activo, setActivo] = useState(true);
  const [whatsapp, setWhatsapp] = useState('');
  const [ocultarPrecios, setOcultarPrecios] = useState(false);
  const [mensajeBienvenida, setMensajeBienvenida] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [empresaId, setEmpresaId] = useState<number | null>(null);

  const urlTienda = typeof window !== 'undefined' 
    ? `${window.location.origin}/#/tienda` 
    : 'https://siumax.duckdns.org/#/tienda';

  useEffect(() => {
    const fetchConfig = async () => {
      setCargando(true);
      try {
        const { data, error } = await supabase
          .from('empresa_config')
          .select('id, catalogo_activo, catalogo_whatsapp, catalogo_ocultar_precios, catalogo_mensaje_bienvenida, telefono')
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (data) {
          setEmpresaId(data.id);
          setActivo(data.catalogo_activo ?? true);
          setWhatsapp(data.catalogo_whatsapp || data.telefono || '');
          setOcultarPrecios(data.catalogo_ocultar_precios ?? false);
          setMensajeBienvenida(
            data.catalogo_mensaje_bienvenida ||
              '¡Hola! Te compartimos nuestra Tienda Web. Elige tus productos y realiza tu pedido directo a nuestro WhatsApp.'
          );
        }
      } catch (err) {
        console.error('Error al cargar config de Tienda Web:', err);
      } finally {
        setCargando(false);
      }
    };

    fetchConfig();
  }, []);

  const handleCopiarEnlace = () => {
    navigator.clipboard.writeText(urlTienda);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const handleGuardar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setGuardando(true);

    try {
      const payload = {
        catalogo_activo: activo,
        catalogo_whatsapp: whatsapp.trim() || null,
        catalogo_ocultar_precios: ocultarPrecios,
        catalogo_mensaje_bienvenida: mensajeBienvenida.trim() || null,
      };

      if (empresaId) {
        const { error } = await supabase
          .from('empresa_config')
          .update(payload)
          .eq('id', empresaId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('empresa_config')
          .insert([payload]);

        if (error) throw error;
      }

      avisar('Los ajustes de la Tienda Web se actualizaron correctamente.');
    } catch (err: any) {
      console.error('Error al guardar Tienda Web:', err);
      avisar(err.message || 'No se pudieron guardar los ajustes.');
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="py-12 text-center font-mono text-xs uppercase text-[var(--color-muted)]">
        Cargando configuración de la Tienda Web...
      </div>
    );
  }

  return (
    <div className="space-y-6 font-mono text-[var(--color-ink)] max-w-3xl">
      {/* Cabecera */}
      <div className="pb-3 border-b-2 border-[var(--color-ink)]">
        <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
          <ShoppingBag size={18} className="text-[var(--color-accent)]" />
          Tienda Web para Clientes (PC y Celular) — Fase 10
        </h2>
        <p className="text-xs text-[var(--color-muted)] font-sans mt-0.5">
          Permite a tus clientes ver tus productos desde su computadora o celular, armar su carrito y enviarte pedidos automáticos a WhatsApp.
        </p>
      </div>

      {/* Tarjeta Enlace Público */}
      <div className="p-4 tarjeta-sobria bg-[var(--color-surface)] border border-[var(--color-border)]">
        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-ink)] block mb-1">
          🌐 Enlace Público de tu Tienda Web
        </span>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            type="text"
            readOnly
            value={urlTienda}
            className="flex-1 px-3 py-2 text-xs font-mono bg-white border border-[var(--color-border)] select-all"
          />
          <button
            id="btn-copiar-enlace-tienda"
            type="button"
            onClick={handleCopiarEnlace}
            style={{ '--icono': 'var(--color-accent-shadow)' } as React.CSSProperties}
            className="boton-cabecera flex items-center justify-center gap-1.5 px-4 py-2 border border-[var(--color-border)] font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            {copiado ? <Check size={14} /> : <Copy size={14} />}
            {copiado ? '¡Copiado!' : 'Copiar Enlace'}
          </button>
          <a
            href={urlTienda}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[var(--color-bg)] text-[var(--color-ink)] border border-[var(--color-border)] font-bold text-xs uppercase tracking-wider hover:bg-[var(--color-bg-2)] transition-colors cursor-pointer"
          >
            <ExternalLink size={14} /> Ver Tienda
          </a>
        </div>
        <div className="flex items-center gap-4 mt-2 text-[11px] text-emerald-800 font-sans">
          <span className="flex items-center gap-1">
            <Laptop size={13} /> Optimizado para PC
          </span>
          <span className="flex items-center gap-1">
            <Smartphone size={13} /> Optimizado para Celular
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle size={13} /> Pedidos a WhatsApp
          </span>
        </div>
      </div>

      {/* Formulario de Ajustes */}
      <form onSubmit={handleGuardar} className="space-y-4">
        {/* Switch Tienda Activa */}
        <div className="p-3 tarjeta-sobria border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase block">
              Estado de la Tienda Web
            </span>
            <span className="text-xs text-[var(--color-muted)] font-sans">
              Si la desactivas, los clientes verán un aviso de mantenimiento temporal.
            </span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
              className="w-5 h-5 text-[var(--color-accent)] focus:ring-[var(--color-accent)] border-[var(--color-ink)]"
            />
            <span className={`text-xs font-black uppercase ${activo ? 'text-emerald-600' : 'text-red-500'}`}>
              {activo ? 'Activa y Visible' : 'Pausada'}
            </span>
          </label>
        </div>

        {/* WhatsApp Receptor */}
        <div>
          <label className="block text-xs font-bold uppercase mb-1">
            Número de WhatsApp donde recibirás los pedidos <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center">
            <span className="px-3 py-2 bg-[var(--color-ink)] text-white text-xs font-bold border-2 border-r-0 border-[var(--color-ink)]">
              +51
            </span>
            <input
              id="input-tienda-web-whatsapp"
              type="text"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ''))}
              placeholder="Ej. 987654321"
              maxLength={12}
              required
              className="flex-1 px-3 py-2 border-2 border-[var(--color-ink)] bg-[var(--color-surface)] text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded-none"
            />
          </div>
          <span className="text-[11px] text-[var(--color-muted)] font-sans mt-0.5 block">
            A este WhatsApp se abrirá la conversación con la lista detallada y el monto total de cada compra.
          </span>
        </div>

        {/* Modo Ocultar Precios */}
        <div className="p-3 tarjeta-sobria border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase block">
              Ocultar Precios al Público (Modo Cotización / Mayorista)
            </span>
            <span className="text-xs text-[var(--color-muted)] font-sans">
              En lugar de mostrar el precio, el botón dirá "Consultar Precio" o "Cotizar por WhatsApp".
            </span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={ocultarPrecios}
              onChange={(e) => setOcultarPrecios(e.target.checked)}
              className="w-5 h-5 text-[var(--color-accent)] focus:ring-[var(--color-accent)] border-[var(--color-ink)]"
            />
            <span className="text-xs font-bold uppercase">
              {ocultarPrecios ? 'Precios Ocultos' : 'Precios Visibles'}
            </span>
          </label>
        </div>

        {/* Mensaje de Bienvenida */}
        <div>
          <label className="block text-xs font-bold uppercase mb-1">
            Mensaje de Bienvenida o Indicaciones en la Tienda
          </label>
          <textarea
            rows={2}
            value={mensajeBienvenida}
            onChange={(e) => setMensajeBienvenida(e.target.value)}
            placeholder="Mensaje de bienvenida para los clientes que entran a la tienda web..."
            className="w-full px-3 py-2 border-2 border-[var(--color-ink)] bg-[var(--color-surface)] text-xs font-sans focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded-none"
          />
        </div>

        {/* Botón Guardar */}
        <div className="flex justify-end pt-3 border-t-2 border-[var(--color-ink)]">
          <button
            type="submit"
            disabled={guardando}
            style={{ '--icono': 'var(--color-accent-shadow)' } as React.CSSProperties}
            className="boton-cabecera flex items-center gap-2 px-6 py-2.5 font-black text-xs uppercase tracking-widest cursor-pointer disabled:opacity-50"
          >
            {guardando ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Guardando...
              </>
            ) : (
              <>
                <Save size={16} /> Guardar Cambios
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
