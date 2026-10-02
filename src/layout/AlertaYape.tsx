// src/layout/AlertaYape.tsx
// Avisa dentro del sistema, con sonido, apenas llega un pago por Yape detectado por el
// celular dedicado (vía MacroDroid -> fn_registrar_notificacion_yape). Se queda visible
// hasta que alguien lo marca como visto, para no perder el aviso si nadie mira la pantalla
// justo quando llega.
import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Smartphone } from 'lucide-react';
import { supabase } from '../db/supabase';

interface NotificacionYape {
  id: number;
  monto: number | null;
  texto_raw: string | null;
  remitente: string | null;
  created_at: string;
}

const CONSULTAR_CADA_MS = 5000;

export const AlertaYape: React.FC = () => {
  const [notificaciones, setNotificaciones] = useState<NotificacionYape[]>([]);
  const idsConocidosRef = useRef<Set<number>>(new Set());
  const audioCtxRef = useRef<AudioContext | null>(null);

  const reproducirSonido = () => {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      // Dos tonos cortos ascendentes, tipo "cha-ching" simple, sin depender de un archivo .mp3
      [660, 880].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const inicio = ctx.currentTime + i * 0.14;
        gain.gain.setValueAtTime(0.0001, inicio);
        gain.gain.exponentialRampToValueAtTime(0.25, inicio + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.28);
        osc.connect(gain).connect(ctx.destination);
        osc.start(inicio);
        osc.stop(inicio + 0.3);
      });
    } catch { /* si el navegador bloquea audio sin interacción previa, no pasa nada grave */ }
  };

  useEffect(() => {
    let activo = true;

    const consultar = async () => {
      const { data } = await supabase
        .from('yape_notifications')
        .select('id, monto, texto_raw, remitente, created_at')
        .eq('leido', false)
        .order('created_at', { ascending: false });

      if (!activo || !data) return;

      const hayNuevo = data.some(n => !idsConocidosRef.current.has(n.id));
      if (hayNuevo && idsConocidosRef.current.size > 0) reproducirSonido();
      // La primera consulta (al abrir el sistema) no suena: solo avisa de lo que llega después.
      data.forEach(n => idsConocidosRef.current.add(n.id));

      setNotificaciones(data as NotificacionYape[]);
    };

    consultar();
    const intervalo = setInterval(consultar, CONSULTAR_CADA_MS);
    return () => { activo = false; clearInterval(intervalo); };
  }, []);

  const marcarVisto = async (id: number) => {
    setNotificaciones(prev => prev.filter(n => n.id !== id));
    await supabase.from('yape_notifications').update({ leido: true }).eq('id', id);
  };

  if (notificaciones.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[99999] flex flex-col gap-3 w-[90vw] max-w-sm">
      {notificaciones.map(n => (
        <div
          key={n.id}
          className="bg-[var(--color-accent)] border-2 border-[var(--color-ink)] shadow-[6px_6px_0_0_var(--color-ink)] p-4 font-mono animate-fade-in"
        >
          <div className="flex items-start gap-3">
            <div className="bg-white p-2 border-2 border-[var(--color-ink)] shrink-0">
              <Smartphone size={20} className="text-[var(--color-accent)]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black uppercase tracking-widest text-[var(--color-accent-bg)]">Yape recibido</p>
              {n.monto != null ? (
                <p className="text-2xl font-black text-white leading-tight">S/ {Number(n.monto).toFixed(2)}</p>
              ) : (
                // No se pudo detectar el monto del texto de la notificación: mostramos el
                // texto tal cual para que igual se sepa que llegó un pago.
                <p className="text-sm font-black text-white leading-tight break-words">{n.texto_raw || 'Monto no detectado'}</p>
              )}
              {n.remitente && <p className="text-xs font-bold text-[var(--color-accent-bg)] truncate">De: {n.remitente}</p>}
            </div>
          </div>
          <button
            onClick={() => marcarVisto(n.id)}
            className="mt-3 w-full flex items-center justify-center gap-2 bg-white text-[var(--color-ink)] py-2 font-black text-[11px] uppercase tracking-widest border-2 border-[var(--color-ink)] hover:bg-[var(--color-ink)] hover:text-white transition-colors cursor-pointer"
          >
            <CheckCircle2 size={16} /> Visto
          </button>
        </div>
      ))}
    </div>
  );
};
