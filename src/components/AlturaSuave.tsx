// src/components/AlturaSuave.tsx
// Envuelve un contenido que crece o se achica (aparecen campos, avisos, listas) y anima su ALTURA, así la ventana no
// "salta" de tamaño de golpe (pedido del dueño 06/11/2026: "se ve como se acomoda todo rápido").
// Lo de adentro debe ir en el flujo (sin listas flotantes): el contenedor recorta lo que se sale mientras se anima.
// Sin animación si el equipo pide reducir movimiento.
import React, { useLayoutEffect, useRef, useState } from 'react';

const sinMovimiento = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const AlturaSuave: React.FC<{ children: React.ReactNode; className?: string; ms?: number }> = ({ children, className = '', ms = 260 }) => {
  const dentro = useRef<HTMLDivElement>(null);
  const [alto, setAlto] = useState<number | undefined>(undefined);
  const [animando, setAnimando] = useState(false);

  useLayoutEffect(() => {
    const el = dentro.current;
    if (!el) return;
    const medir = () => setAlto((antes) => {
      const nuevo = el.offsetHeight;
      if (antes !== undefined && antes !== nuevo) setAnimando(true);
      return nuevo;
    });
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      className={className}
      onTransitionEnd={(e) => { if (e.target === e.currentTarget) setAnimando(false); }}
      style={{
        height: alto,
        transition: sinMovimiento() ? undefined : `height ${ms}ms ease`,
        // solo se recorta mientras cambia de alto: así los anillos del selector nunca quedan cortados
        overflow: animando ? 'hidden' : 'visible',
      }}
    >
      <div ref={dentro}>{children}</div>
    </div>
  );
};
