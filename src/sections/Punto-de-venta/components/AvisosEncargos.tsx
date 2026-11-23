// Avisos de ENCARGOS en la Caja (SiuMax Nego, 12/11/2026, pedido del dueño): "Cotizaciones: N" y "Pedidos: N", al
// lado de "Por cobrar". Cada uno abre su pestaña de Encargos.
// - Cotizaciones: las que esperan respuesta (borrador, vigente o aprobada sin convertir; no las vencidas).
//   En alerta si alguna vence hoy.
// - Pedidos: los pendientes de entregar. En alerta si alguno se entrega hoy o ya se pasó la fecha.
// En el celular: nombre corto ("Cotiz", "Pedidos") y los tres avisos del mismo ancho; desde tablet, nombre completo. Se actualizan al guardar una
// cotización o un pedido en la Caja (evento "encargos-cambiaron") y al volver a la ventana.
import React, { useCallback, useEffect, useState } from 'react';
import { FileText, Package, AlertTriangle } from 'lucide-react';
import { supabase } from '../../../db/supabase';
import { flechasCaja } from '../tecladoCaja';

export const EVENTO_ENCARGOS = 'encargos-cambiaron';
export const avisarCambioEncargos = () => window.dispatchEvent(new Event(EVENTO_ENCARGOS));

const finDeHoy = () => { const d = new Date(); d.setHours(23, 59, 59, 999); return d.getTime(); };

interface Conteo { total: number; alerta: number }

interface Props {
  conPedidos: boolean;
  onAbrir: (pestana: 'cotizaciones' | 'pedidos') => void;
}

export const AvisosEncargos: React.FC<Props> = ({ conPedidos, onAbrir }) => {
  const [coti, setCoti] = useState<Conteo>({ total: 0, alerta: 0 });
  const [ped, setPed] = useState<Conteo>({ total: 0, alerta: 0 });

  const contar = useCallback(async () => {
    const ahora = Date.now(); const fin = finDeHoy();
    const { data: c, error: ec } = await supabase.from('cotizaciones').select('estado, fecha_vencimiento').in('estado', ['BORRADOR', 'VIGENTE', 'ENVIADA', 'APROBADA']).limit(5000);
    if (!ec && c) {
      const vence = (x: any) => (x.fecha_vencimiento ? new Date(x.fecha_vencimiento).getTime() : Infinity);
      const abiertas = c.filter((x: any) => x.estado === 'APROBADA' || vence(x) >= ahora);
      setCoti({ total: abiertas.length, alerta: abiertas.filter((x: any) => x.estado !== 'APROBADA' && vence(x) <= fin).length });
    }
    if (conPedidos) {
      const { data: p, error: ep } = await supabase.from('pedidos_clientes').select('fecha_entrega').eq('estado', 'PENDIENTE').limit(5000);
      if (!ep && p) setPed({ total: p.length, alerta: p.filter((x: any) => x.fecha_entrega && new Date(x.fecha_entrega).getTime() <= fin).length });
    }
  }, [conPedidos]);

  useEffect(() => {
    contar();
    const alVolver = () => { if (document.visibilityState === 'visible') contar(); };
    window.addEventListener(EVENTO_ENCARGOS, contar);
    window.addEventListener('focus', contar);
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      window.removeEventListener(EVENTO_ENCARGOS, contar);
      window.removeEventListener('focus', contar);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [contar]);

  const boton = (id: string, pestana: 'cotizaciones' | 'pedidos', nombre: string, corto: string, Icono: typeof FileText, n: Conteo, aviso: string) => {
    const enAlerta = n.alerta > 0;
    return (
      <button
        id={id}
        type="button"
        onKeyDown={flechasCaja(id)}
        onClick={() => onAbrir(pestana)}
        title={enAlerta ? aviso : `${n.total} ${nombre.toLowerCase()} por atender`}
        aria-label={`${nombre}: ${n.total}${enAlerta ? ` (${n.alerta} para hoy)` : ''}`}
        className={`flex items-center justify-center shrink-0 whitespace-nowrap border-2 px-1.5 sm:px-3 py-1.5 sm:py-1 text-[11px] sm:text-[12px] font-black uppercase tracking-normal sm:tracking-widest transition-all cursor-pointer rounded-none ${
          enAlerta
            ? 'border-[var(--color-warning)] bg-[var(--color-warning-bg)] text-[var(--color-warning-dark)] hover:bg-[var(--color-warning)] hover:text-[var(--color-surface)]'
            : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:border-[var(--color-ink)]'
        }`}
      >
        {enAlerta ? <AlertTriangle size={12} className="mr-1.5 sm:mr-2" /> : <Icono size={12} className="mr-1.5 sm:mr-2" />}
        <span className="sm:hidden">{corto}:&nbsp;</span>
        <span className="hidden sm:inline">{nombre}:&nbsp;</span>
        <span>{n.total}</span>
      </button>
    );
  };

  return (
    <>
      {boton('btn-pos-aviso-cotizaciones', 'cotizaciones', 'Cotizaciones', 'Cotiz', FileText, coti, `${coti.alerta} cotización(es) vencen hoy`)}
      {conPedidos && boton('btn-pos-aviso-pedidos', 'pedidos', 'Pedidos', 'Pedidos', Package, ped, `${ped.alerta} pedido(s) para entregar hoy o atrasados`)}
    </>
  );
};
