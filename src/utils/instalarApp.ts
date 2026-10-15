/**
 * src/utils/instalarApp.ts
 * App instalable (PWA): registra el service worker y guarda el aviso de instalación del navegador
 * para mostrarlo con nuestro propio botón "Instalar app".
 */
import { useEffect, useState } from 'react';

interface EventoInstalacion extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let avisoPendiente: EventoInstalacion | null = null;
const suscriptores = new Set<() => void>();
const avisar = () => suscriptores.forEach((fn) => fn());

// Ya abierta como app instalada (ventana propia, sin barra del navegador)
const yaInstalada = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

// Se llama al iniciar la app: el aviso del navegador puede llegar antes de que React dibuje el botón
export const iniciarAppInstalable = () => {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // guardamos el aviso para lanzarlo desde nuestro botón
    avisoPendiente = e as EventoInstalacion;
    avisar();
  });
  window.addEventListener('appinstalled', () => {
    avisoPendiente = null;
    avisar();
  });

  // Solo en la versión publicada: en desarrollo el service worker estorbaría la recarga en caliente
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }
};

// true si el navegador permite instalar ahora (y la app aún no está instalada)
export const usePuedeInstalar = () => {
  const [puede, setPuede] = useState(() => !!avisoPendiente && !yaInstalada());
  useEffect(() => {
    const actualizar = () => setPuede(!!avisoPendiente && !yaInstalada());
    suscriptores.add(actualizar);
    return () => { suscriptores.delete(actualizar); };
  }, []);
  return puede;
};

// === APP DE ESCRITORIO (PC de la caja) ===
export const RUTA_INSTALADOR_PC = '/descargas/SiuHub-Setup.exe';

// true en una PC con Windows, fuera de la app de escritorio, si el instalador está publicado
export const useHayInstaladorPC = () => {
  const [hay, setHay] = useState(false);
  useEffect(() => {
    const enEscritorio = !!(window as Window & { siuhubEscritorio?: unknown }).siuhubEscritorio;
    if (enEscritorio || !/Windows/i.test(navigator.userAgent)) return;
    // El servidor responde index.html (200) a rutas que no existen; por eso se revisa el tipo de archivo
    fetch(RUTA_INSTALADOR_PC, { method: 'HEAD' })
      .then((r) => setHay(r.ok && !(r.headers.get('content-type') || '').includes('text/html')))
      .catch(() => {});
  }, []);
  return hay;
};

export const instalarApp = async () => {
  if (!avisoPendiente) return;
  const aviso = avisoPendiente;
  await aviso.prompt();
  await aviso.userChoice;
  avisoPendiente = null; // el navegador solo deja usar el aviso una vez
  avisar();
};
