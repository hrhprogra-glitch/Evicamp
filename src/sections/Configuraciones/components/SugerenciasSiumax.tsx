// src/sections/Configuraciones/components/SugerenciasSiumax.tsx
// Ajustes > Sugerencias y errores: el negocio le escribe directo a SiuMax (llega al Panel de Control).
// Se envía a /api/sugerencias del propio link; nginx lo reenvía al panel con el link de origen
// (snippets/siumax-sugerencias.conf, ai-scripts/sugerencias-servidor.cjs; recibe servidor/panel/panel.py).
import React, { useState } from 'react';
import { Lightbulb, Bug, HelpCircle, Send, Loader2 } from 'lucide-react';
import { useEmpleado } from '../../../utils/permisos';
import { leerToken } from '../../../utils/sesion';
import { hayConexion } from '../../../utils/sinInternet';
import { avisar } from '../../../utils/dialogos';

type Tipo = 'sugerencia' | 'error' | 'pregunta';
const TIPOS: { id: Tipo; nombre: string; ayuda: string; Icono: typeof Lightbulb }[] = [
  { id: 'sugerencia', nombre: 'Sugerencia', ayuda: 'Una idea para mejorar el sistema', Icono: Lightbulb },
  { id: 'error', nombre: 'Error', ayuda: 'Algo que no funciona bien', Icono: Bug },
  { id: 'pregunta', nombre: 'Pregunta', ayuda: 'Una duda sobre cómo usar algo', Icono: HelpCircle },
];
const SECCIONES = ['Caja', 'Clientes', 'Inventario', 'Conteos', 'Finanzas', 'Utilidades', 'Ajustes', 'Otro'];

export const SugerenciasSiumax: React.FC = () => {
  const empleado = useEmpleado();
  const [tipo, setTipo] = useState<Tipo>('sugerencia');
  const [seccion, setSeccion] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [contacto, setContacto] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    const texto = mensaje.trim();
    if (texto.length < 5) { void avisar('Escribe tu mensaje (al menos 5 letras).'); document.getElementById('sug-mensaje')?.focus(); return; }
    if (!hayConexion()) { void avisar('🔌 Sin internet: envíalo cuando vuelva la conexión. Tu mensaje sigue escrito aquí.'); return; }
    setEnviando(true);
    try {
      const token = leerToken();
      const r = await fetch('/api/sugerencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'x-sesion': token } : {}) },
        body: JSON.stringify({
          tipo, seccion, mensaje: texto, contacto: contacto.trim(),
          nombre: empleado?.nombre || '', email: empleado?.email || '',
        }),
      });
      const datos = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(datos.error || 'No se pudo enviar.');
      setMensaje('');
      setSeccion('');
      await avisar('✅ ¡Gracias! Tu mensaje le llegó al equipo de SiuMax. Lo revisaremos pronto.');
    } catch (e: any) {
      void avisar(`❌ ${e?.message || 'No se pudo enviar.'} Intenta de nuevo en unos minutos.`);
    } finally {
      setEnviando(false);
    }
  };

  const flechas = (arriba: string | null, abajo: string | null) => (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp' && arriba) { e.preventDefault(); document.getElementById(arriba)?.focus(); }
    if (e.key === 'ArrowDown' && abajo) { e.preventDefault(); document.getElementById(abajo)?.focus(); }
  };

  return (
    <div className="max-w-3xl bg-white border-2 border-[var(--color-ink)] shadow-[4px_4px_0_0_var(--color-ink)] p-4 lg:p-6 font-mono space-y-5">
      <div>
        <h2 className="text-lg font-black uppercase tracking-wider text-[var(--color-ink)]">Escríbele a SiuMax</h2>
        <p className="text-xs font-bold text-[var(--color-muted)] mt-1">
          ¿Algo no funciona, tienes una idea o una duda? Tu mensaje le llega directo al equipo que hace el sistema.
        </p>
      </div>

      {/* Tipo: ← → para cambiar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="radiogroup" aria-label="Tipo de mensaje">
        {TIPOS.map(({ id, nombre, ayuda, Icono }, i) => (
          <button
            key={id}
            id={`sug-tipo-${id}`}
            type="button"
            role="radio"
            aria-checked={tipo === id}
            onClick={() => setTipo(id)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                const otro = TIPOS[(i + (e.key === 'ArrowRight' ? 1 : TIPOS.length - 1)) % TIPOS.length];
                setTipo(otro.id);
                document.getElementById(`sug-tipo-${otro.id}`)?.focus();
              } else flechas('btn-tab-sugerencias', 'sug-seccion')(e);
            }}
            className={`text-left p-3 border-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] cursor-pointer ${
              tipo === id ? 'border-[var(--color-accent)] bg-[var(--color-accent-bg)]' : 'border-[var(--color-border)] hover:border-[var(--color-ink)]'
            }`}
          >
            <span className="flex items-center gap-2 text-sm font-black uppercase text-[var(--color-ink)]"><Icono size={16} /> {nombre}</span>
            <span className="block text-[11px] font-bold text-[var(--color-muted)] mt-1">{ayuda}</span>
          </button>
        ))}
      </div>

      <label className="block space-y-1">
        <span className="text-[11px] font-black uppercase tracking-widest text-[var(--color-ink)]">¿En qué parte del sistema? (opcional)</span>
        <select id="sug-seccion" value={seccion} onChange={(e) => setSeccion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); try { (e.currentTarget as HTMLSelectElement & { showPicker?: () => void }).showPicker?.(); } catch { /* sin showPicker */ } }
            else flechas(`sug-tipo-${tipo}`, 'sug-mensaje')(e);
          }}
          className="w-full border-2 border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-xs font-black uppercase text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)]">
          <option value="">— Elegir —</option>
          {SECCIONES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>

      <label className="block space-y-1">
        <span className="text-[11px] font-black uppercase tracking-widest text-[var(--color-ink)]">Tu mensaje</span>
        <textarea id="sug-mensaje" value={mensaje} maxLength={2000} rows={6}
          onChange={(e) => setMensaje(e.target.value)}
          onKeyDown={(e) => {
            // Ctrl+Enter envía; las flechas solo salen del cuadro en el borde del texto
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void enviar(); }
            const t = e.currentTarget;
            if (e.key === 'ArrowUp' && t.selectionStart === 0) flechas('sug-seccion', null)(e);
            if (e.key === 'ArrowDown' && t.selectionEnd === t.value.length) flechas(null, 'sug-contacto')(e);
          }}
          placeholder={tipo === 'error' ? 'Cuéntanos qué hiciste y qué pasó. Ej: al cobrar con Yape la caja no sumó el monto...' : 'Escribe aquí...'}
          className="w-full border-2 border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-sm font-bold text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)] resize-y" />
        <span className="block text-right text-[10px] font-bold text-[var(--color-muted)]">{mensaje.length}/2000 · Ctrl+Enter para enviar</span>
      </label>

      <label className="block space-y-1">
        <span className="text-[11px] font-black uppercase tracking-widest text-[var(--color-ink)]">WhatsApp o teléfono para responderte (opcional)</span>
        <input id="sug-contacto" type="tel" autoComplete="off" value={contacto} maxLength={30}
          onChange={(e) => setContacto(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('btn-enviar-sugerencia')?.focus(); } else flechas('sug-mensaje', 'btn-enviar-sugerencia')(e); }}
          placeholder="Ej: 987 654 321"
          className="w-full border-2 border-[var(--color-border)] bg-[var(--color-bg)] p-3 text-sm font-bold text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)]" />
      </label>

      <button id="btn-enviar-sugerencia" type="button" onClick={() => void enviar()} disabled={enviando}
        onKeyDown={flechas('sug-contacto', null)}
        className="w-full sm:w-auto bg-[var(--color-ink)] text-white px-6 py-3 border-2 border-[var(--color-ink)] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-[var(--color-accent)] disabled:opacity-60 cursor-pointer shadow-[4px_4px_0_0_var(--color-accent)]">
        {enviando ? <><Loader2 size={16} className="animate-spin" /> Enviando...</> : <><Send size={16} /> Enviar a SiuMax</>}
      </button>
    </div>
  );
};
