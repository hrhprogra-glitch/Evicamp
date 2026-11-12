// Ajustes → Tipo de negocio (SiuMax Nego, fase 2, 12/11/2026). Los 7 tipos con lo que hace cada uno y los negocios
// que incluye. Se puede marcar uno o varios (negocios mixtos, decidido por el dueño). Los que aún no tienen sus
// secciones salen como "Próximamente" y no se pueden marcar. Se guarda en empresa_config.tipos_negocio.
// Teclado: ↑ ↓ recorren los tipos, Enter o Espacio marca/desmarca (el selector se queda), ↓ desde el último va a Guardar.
import React, { useEffect, useState } from 'react';
import { Briefcase, Check, Save, Loader2 } from 'lucide-react';
import { supabase } from '../../../db/supabase';
import { avisar } from '../../../utils/dialogos';
import { TIPOS_NEGOCIO, leerTiposNegocio, fijarTiposNegocio, type IdTipoNegocio } from '../../../utils/tiposNegocio';

export const PestanaTipoNegocio: React.FC = () => {
  const [elegidos, setElegidos] = useState<IdTipoNegocio[]>(['comercio']);
  const [guardados, setGuardados] = useState<IdTipoNegocio[]>(['comercio']);
  const [empresaId, setEmpresaId] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.from('empresa_config').select('id, tipos_negocio').order('id').limit(1).maybeSingle();
        if (error) throw error;
        if (data) {
          setEmpresaId(data.id);
          const lista = leerTiposNegocio(data.tipos_negocio);
          setElegidos(lista); setGuardados(lista);
        }
      } catch (err) {
        console.error('No se pudo leer el tipo de negocio:', err);
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  const alternar = (id: IdTipoNegocio) => {
    setElegidos((lista) => {
      if (!lista.includes(id)) return [...lista, id];
      if (lista.length === 1) { void avisar('El negocio necesita al menos un tipo.'); return lista; }
      return lista.filter((x) => x !== id);
    });
  };

  const guardar = async () => {
    if (guardando) return; // sin `disabled`: así el selector no se pierde mientras guarda
    setGuardando(true);
    try {
      const { error } = empresaId
        ? await supabase.from('empresa_config').update({ tipos_negocio: elegidos }).eq('id', empresaId)
        : await supabase.from('empresa_config').insert([{ tipos_negocio: elegidos }]);
      if (error) throw error;
      setGuardados(elegidos);
      fijarTiposNegocio(elegidos); // el menú cambia al instante (secciones de cada tipo: utils/tiposNegocio.ts)
      const nombres = TIPOS_NEGOCIO.filter((t) => elegidos.includes(t.id)).map((t) => t.nombre).join(', ');
      void avisar(`✅ Tipo de negocio guardado: ${nombres}.`);
    } catch (err: any) {
      void avisar(`❌ No se pudo guardar el tipo de negocio.\n\nDetalle: ${err?.message || err}`);
    } finally {
      setGuardando(false);
    }
  };

  // Teclado: lista vertical de tipos + Guardar
  const ids = [...TIPOS_NEGOCIO.map((t) => `tipo-negocio-${t.id}`), 'btn-guardar-tipo-negocio'];
  const teclas = (e: React.KeyboardEvent, id: string) => {
    const i = ids.indexOf(id);
    if (e.key === 'ArrowDown' && ids[i + 1]) { e.preventDefault(); e.stopPropagation(); document.getElementById(ids[i + 1])?.focus(); }
    else if (e.key === 'ArrowUp') {
      e.preventDefault(); e.stopPropagation();
      document.getElementById(i > 0 ? ids[i - 1] : 'btn-tab-tipo_negocio')?.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); }
  };

  if (cargando) {
    return <div className="py-12 text-center font-mono text-xs uppercase text-[var(--color-muted)]">Cargando tipo de negocio...</div>;
  }

  const cambio = elegidos.slice().sort().join() !== guardados.slice().sort().join();

  return (
    <div className="space-y-4 font-mono text-[var(--color-ink)] max-w-4xl">
      <div className="pb-3 border-b-2 border-[var(--color-ink)]">
        <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
          <Briefcase size={18} className="text-[var(--color-accent)]" /> Tipo de negocio
        </h2>
        <p className="text-xs text-[var(--color-muted)] font-sans mt-0.5">
          Elige qué tipo de negocio es el tuyo. Si tu negocio hace varias cosas (por ejemplo, una ferretería con taller), puedes marcar más de uno.
        </p>
      </div>

      <div className="flex flex-col gap-3" role="group" aria-label="Tipos de negocio">
        {TIPOS_NEGOCIO.map((t) => {
          const marcado = elegidos.includes(t.id);
          return (
            <button key={t.id} id={`tipo-negocio-${t.id}`} type="button" role="checkbox" aria-checked={marcado} aria-disabled={!t.disponible}
              onClick={() => (t.disponible ? alternar(t.id) : void avisar(`"${t.nombre}" todavía no está disponible en SiuMax Nego. ${t.nota || 'Llegará más adelante.'}`))}
              onKeyDown={(e) => teclas(e, `tipo-negocio-${t.id}`)}
              className={`tarjeta-sobria w-full text-left p-4 flex gap-4 items-start rounded-none cursor-pointer outline-none transition-colors bg-[var(--color-surface)] focus-visible:ring-2 focus-visible:ring-[var(--color-ink)] ${marcado ? '!border-[var(--color-ink)] !border-2' : ''} ${t.disponible ? 'hover:bg-[var(--color-bg)]' : 'opacity-70'}`}>
              <span className={`w-10 h-10 shrink-0 flex items-center justify-center border-2 font-black text-sm ${marcado ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]' : 'bg-[var(--color-bg)] text-[var(--color-ink)] border-[var(--color-border)]'}`}>
                {marcado ? <Check size={18} /> : t.numero}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-widest">{t.numero}. {t.nombre}</span>
                  {t.disponible
                    ? <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 border border-[var(--color-success)] text-[var(--color-success)]">Disponible</span>
                    : <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 border border-[var(--color-border)] text-[var(--color-muted)]">Próximamente</span>}
                  {marcado && <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-[var(--color-ink)] text-white">Elegido</span>}
                </span>
                <span className="block text-[12px] font-bold text-[var(--color-ink)] mt-1 font-sans">{t.queHace}</span>
                <span className="block text-[11px] text-[var(--color-muted)] mt-1.5 font-sans leading-relaxed">
                  <span className="font-black uppercase tracking-wider font-mono text-[10px]">Incluye: </span>
                  {t.negocios.join(' · ')}
                </span>
                {!t.disponible && t.nota && <span className="block text-[10px] font-bold text-[var(--color-muted)] mt-1">{t.nota}</span>}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 pt-3 border-t-2 border-[var(--color-ink)]">
        <span className="text-[11px] font-bold text-[var(--color-muted)]">
          {cambio ? 'Tienes cambios sin guardar.' : `Guardado: ${TIPOS_NEGOCIO.filter((t) => guardados.includes(t.id)).map((t) => t.nombre).join(', ')}`}
        </span>
        <button id="btn-guardar-tipo-negocio" type="button" onClick={guardar} aria-disabled={guardando}
          onKeyDown={(e) => teclas(e, 'btn-guardar-tipo-negocio')}
          style={{ '--icono': 'var(--color-accent-shadow)' } as React.CSSProperties}
          className="boton-cabecera flex items-center gap-2 px-6 py-2.5 font-black text-xs uppercase tracking-widest cursor-pointer disabled:opacity-50">
          {guardando ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : <><Save size={16} /> Guardar</>}
        </button>
      </div>
    </div>
  );
};
