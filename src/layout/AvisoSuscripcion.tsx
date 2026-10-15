// Aviso de vencimiento del plan de SiuHub. El Panel de Control escribe /suscripcion.json
// en el link de cada cliente; Evicamp y SiuHub no lo tienen y simplemente no muestran nada.
import React, { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export interface Suscripcion {
  estado: 'AL_DIA' | 'POR_VENCER' | 'VENCIDO' | 'SIN_PLAN';
  dias_restantes: number | null;
  proximo_pago: string | null;
  fecha_suspension: string | null;
  pagar_url?: string | null; // Mercado Pago (tarjeta o Yape); el pago se registra solo
}

const REVISAR_CADA_MS = 60 * 60 * 1000;
const CLAVE_CERRADO = 'siuhub_aviso_plan_cerrado';
export const fechaPe = (iso: string | null) => (iso ? iso.split('-').reverse().join('/') : '');

// Estado del plan del cliente (null en Evicamp/SiuHub, que no tienen /suscripcion.json)
export const useSuscripcion = () => {
  const [plan, setPlan] = useState<Suscripcion | null>(null);
  useEffect(() => {
    const revisar = () => {
      fetch('/suscripcion.json', { cache: 'no-store' })
        .then((r) => (r.ok && (r.headers.get('content-type') || '').includes('json') ? r.json() : null))
        .then(setPlan)
        .catch(() => {});
    };
    revisar();
    const intervalo = setInterval(revisar, REVISAR_CADA_MS);
    return () => clearInterval(intervalo);
  }, []);
  return plan;
};

export const AvisoSuscripcion: React.FC = () => {
  const plan = useSuscripcion();
  const [cerrado, setCerrado] = useState(() => {
    try { return sessionStorage.getItem(CLAVE_CERRADO) === new Date().toDateString(); } catch { return false; }
  });

  if (!plan || cerrado || (plan.estado !== 'POR_VENCER' && plan.estado !== 'VENCIDO')) return null;

  const vencido = plan.estado === 'VENCIDO';
  const dias = plan.dias_restantes ?? 0;
  const mensaje = vencido
    ? `Tu plan de SiuHub venció el ${fechaPe(plan.proximo_pago)}. El servicio se suspenderá el ${fechaPe(plan.fecha_suspension)} si no se renueva.`
    : `Tu plan de SiuHub vence ${dias === 0 ? 'hoy' : dias === 1 ? 'mañana' : `en ${dias} días`} (${fechaPe(plan.proximo_pago)}). Renuévalo para no perder el acceso.`;

  const cerrar = () => {
    setCerrado(true);
    try { sessionStorage.setItem(CLAVE_CERRADO, new Date().toDateString()); } catch { /* sin almacenamiento */ }
  };

  return (
    <div
      role="alert"
      className={`shrink-0 flex items-start sm:items-center gap-3 px-3 py-2 border-b-2 font-mono text-xs font-bold ${
        vencido
          ? 'bg-[var(--color-danger-bg)] border-[var(--color-danger)] text-[var(--color-danger)]'
          : 'bg-[var(--color-warning-bg)] border-[var(--color-warning)] text-[var(--color-warning-dark)]'
      }`}
    >
      <AlertTriangle size={16} className="shrink-0" />
      <span className="flex-1">{mensaje}</span>
      {plan.pagar_url && (
        <a
          href={plan.pagar_url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 px-3 py-1 border-2 border-current bg-white font-black uppercase tracking-widest hover:bg-[var(--color-ink)] hover:text-white transition-colors"
        >
          Pagar ahora
        </a>
      )}
      <button onClick={cerrar} aria-label="Ocultar aviso por hoy" title="Ocultar por hoy" className="shrink-0 p-1 cursor-pointer hover:opacity-70">
        <X size={16} />
      </button>
    </div>
  );
};
