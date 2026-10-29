import React, { useState, useEffect } from 'react';
import { Palette, CheckCircle2, Monitor } from 'lucide-react';
import { leerTamanoInterfaz, guardarTamanoInterfaz, type TamanoInterfaz } from '../../../utils/tamanoInterfaz';

type Tema = 'classic' | 'monochrome' | 'oceano' | 'atardecer' | 'bosque' | 'rosa';

// Cada tema (salvo Clásico y Monocromático, que son casos especiales) solo necesita
// decir qué 4 colores mostrar en su muestra y qué atributo data-theme aplicar.
const TEMAS: { id: Tema; nombre: string; descripcion: string; swatches: string[] }[] = [
  { id: 'classic', nombre: 'Tema Clásico', descripcion: 'Colores vibrantes e indicadores visuales dinámicos (Por defecto).', swatches: ['#1E293B', '#10B981', '#F59E0B', '#EF4444'] },
  { id: 'monochrome', nombre: 'Modo Oscuro', descripcion: 'Negro carbón, grafito y gris acero con acentos clásicos, descanso total para la vista.', swatches: ['#0B0F17', '#111827', '#10B981', '#64748B'] },
  { id: 'oceano', nombre: 'Océano', descripcion: 'Azules fríos y relajados, ideal para jornadas largas.', swatches: ['#0F2942', '#0EA5E9', '#F59E0B', '#EF4444'] },
  { id: 'atardecer', nombre: 'Atardecer', descripcion: 'Naranjas y tonos cálidos, cálido y energético.', swatches: ['#3B2317', '#F97316', '#F59E0B', '#EF4444'] },
  { id: 'bosque', nombre: 'Bosque', descripcion: 'Verdes profundos, natural y descansado para la vista.', swatches: ['#1A2E1F', '#16A34A', '#F59E0B', '#EF4444'] },
  { id: 'rosa', nombre: 'Rosa', descripcion: 'Tonos rosa suaves, delicado y elegante.', swatches: ['#4A1942', '#EC4899', '#F59E0B', '#EF4444'] },
];

export const ThemeSwitcher: React.FC = () => {
  const [theme, setTheme] = useState<Tema>('classic');
  const [tamano, setTamano] = useState<TamanoInterfaz>(leerTamanoInterfaz());
  const cambiarTamano = (t: TamanoInterfaz) => { setTamano(t); guardarTamanoInterfaz(t); };

  useEffect(() => {
    const savedTheme = (localStorage.getItem('gestorpro_theme') || 'classic') as Tema;
    setTheme(savedTheme);
  }, []);

  const changeTheme = (newTheme: Tema) => {
    setTheme(newTheme);
    localStorage.setItem('gestorpro_theme', newTheme);
    // Siempre se limpian los atributos primero
    document.documentElement.classList.remove('theme-monochrome');
    document.documentElement.removeAttribute('data-theme');
    if (newTheme === 'monochrome') {
      document.documentElement.classList.add('theme-monochrome');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (newTheme !== 'classic') {
      document.documentElement.setAttribute('data-theme', newTheme);
    }
  };

  // 🧲 Autofoco inicial en el tema activo
  useEffect(() => {
    const timer = setTimeout(() => {
      const activeBtn = document.getElementById(`btn-tema-${theme}`) || document.getElementById('btn-tema-classic');
      activeBtn?.focus();
    }, 60);
    return () => clearTimeout(timer);
  }, []);

  // 🔒 Navegación con Tab dentro del selector de temas y tamaños sin abrir el sidebar
  useEffect(() => {
    const handleTabTrap = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        const order = [
          'btn-tema-classic',
          'btn-tema-monochrome',
          'btn-tema-oceano',
          'btn-tema-atardecer',
          'btn-tema-bosque',
          'btn-tema-rosa',
          'btn-tamano-auto',
          'btn-tamano-normal',
          'btn-tamano-grande',
        ];

        const activeId = document.activeElement?.id;
        const currentIndex = order.indexOf(activeId || '');

        if (currentIndex !== -1) {
          e.preventDefault();
          e.stopPropagation();

          if (e.shiftKey && currentIndex === 0) {
            document.getElementById('btn-tab-apariencia')?.focus();
            return;
          }

          let nextIndex = e.shiftKey ? currentIndex - 1 : currentIndex + 1;
          if (nextIndex < 0) nextIndex = order.length - 1;
          if (nextIndex >= order.length) nextIndex = 0;

          document.getElementById(order[nextIndex])?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleTabTrap, { capture: true });
    return () => window.removeEventListener('keydown', handleTabTrap, { capture: true });
  }, []);

  return (
    <div className="bg-white border-2 border-[var(--color-border)] p-4 lg:p-6 w-full max-w-4xl font-mono">
      <div className="flex items-center gap-3 border-b-2 border-[var(--color-ink)] pb-4 mb-6">
        <Palette className="text-[var(--color-accent)]" size={24} />
        <h2 className="text-lg font-black uppercase text-[var(--color-ink)]">Apariencia y Colores</h2>
      </div>

      <p className="text-sm text-[var(--color-muted)] mb-6 font-bold">Selecciona el tema visual para el sistema. Este ajuste se aplicará en todas las ventanas, paneles flotantes y subsesiones del programa.</p>

      <div id="panel-temas-ajustes" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {TEMAS.map((t, index) => (
          <button
            key={t.id}
            id={`btn-tema-${t.id}`}
            onClick={() => changeTheme(t.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                changeTheme(t.id);
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                e.stopPropagation();
                if (index % 3 < 2) {
                  document.getElementById(`btn-tema-${TEMAS[index + 1].id}`)?.focus();
                } else if (index === 2) {
                  document.getElementById(`btn-tema-${TEMAS[3].id}`)?.focus();
                } else if (index === 5) {
                  document.getElementById('btn-tamano-auto')?.focus();
                }
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                e.stopPropagation();
                if (index % 3 > 0) {
                  document.getElementById(`btn-tema-${TEMAS[index - 1].id}`)?.focus();
                } else if (index === 3) {
                  document.getElementById(`btn-tema-${TEMAS[2].id}`)?.focus();
                } else if (index === 0) {
                  document.getElementById('btn-tab-apariencia')?.focus();
                }
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                if (index < 3) {
                  document.getElementById(`btn-tema-${TEMAS[index + 3].id}`)?.focus();
                } else {
                  const sizeIds = ['btn-tamano-auto', 'btn-tamano-normal', 'btn-tamano-grande'];
                  document.getElementById(sizeIds[index - 3])?.focus();
                }
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                if (index >= 3) {
                  document.getElementById(`btn-tema-${TEMAS[index - 3].id}`)?.focus();
                } else {
                  document.getElementById('btn-tab-apariencia')?.focus();
                }
              }
            }}
            className={`relative flex flex-col text-left border-2 p-4 transition-all cursor-pointer focus:outline-none focus:ring-4 focus:ring-[var(--color-ink)] focus:bg-amber-100/50 focus:scale-[1.02] focus:shadow-[4px_4px_0_0_var(--color-ink)] ${theme === t.id ? 'border-[var(--color-accent)] shadow-[4px_4px_0_0_var(--color-ink)] bg-[var(--color-accent-bg)]' : 'border-[var(--color-border)] hover:border-[var(--color-ink)] hover:shadow-[4px_4px_0_0_var(--color-ink)] hover:-translate-y-1'}`}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-black text-[var(--color-ink)] uppercase tracking-widest">{t.nombre}</h3>
              {theme === t.id && <CheckCircle2 className="text-[var(--color-accent)]" size={20} />}
            </div>
            <div className="flex gap-2 w-full mb-3">
              {t.swatches.map((hex, i) => (
                <div key={i} className="h-6 flex-1 border border-[var(--color-border)]" style={{ backgroundColor: hex }}></div>
              ))}
            </div>
            <p className="text-xs text-[var(--color-muted)] font-bold">{t.descripcion}</p>
          </button>
        ))}
      </div>

      {/* TAMAÑO DE LA INTERFAZ (por dispositivo) */}
      <div className="flex items-center gap-3 border-b-2 border-[var(--color-ink)] pb-4 mt-8 mb-4">
        <Monitor className="text-[var(--color-accent)]" size={24} />
        <h2 className="text-lg font-black uppercase text-[var(--color-ink)]">Tamaño de la interfaz</h2>
      </div>
      <p className="text-sm text-[var(--color-muted)] mb-4 font-bold">Se guarda solo en este dispositivo. Usa "Grande" en el televisor y "Normal" en la PC si se ve demasiado grande.</p>
      <div id="panel-tamanos-ajustes" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {([
          ['auto', 'Automático', 'Se agranda solo en televisores sin mouse.'],
          ['normal', 'Normal', 'Tamaño de PC y laptop, aunque la pantalla sea grande.'],
          ['grande', 'Grande (TV)', 'Letras y botones más grandes para leer de lejos.'],
        ] as [TamanoInterfaz, string, string][]).map(([valor, titulo, texto], sizeIndex) => (
          <button
            key={valor}
            id={`btn-tamano-${valor}`}
            onClick={() => cambiarTamano(valor)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                cambiarTamano(valor);
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                e.stopPropagation();
                if (sizeIndex < 2) {
                  const nextSizes = ['auto', 'normal', 'grande'];
                  document.getElementById(`btn-tamano-${nextSizes[sizeIndex + 1]}`)?.focus();
                } else {
                  document.getElementById('btn-tamano-auto')?.focus();
                }
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                e.stopPropagation();
                if (sizeIndex > 0) {
                  const prevSizes = ['auto', 'normal', 'grande'];
                  document.getElementById(`btn-tamano-${prevSizes[sizeIndex - 1]}`)?.focus();
                } else {
                  document.getElementById('btn-tema-rosa')?.focus();
                }
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
                const targetThemes = ['btn-tema-atardecer', 'btn-tema-bosque', 'btn-tema-rosa'];
                document.getElementById(targetThemes[sizeIndex])?.focus();
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
            className={`flex flex-col text-left border-2 p-3 transition-all cursor-pointer focus:outline-none focus:ring-4 focus:ring-[var(--color-ink)] focus:bg-amber-100/50 focus:scale-[1.02] focus:shadow-[4px_4px_0_0_var(--color-ink)] ${tamano === valor ? 'border-[var(--color-accent)] shadow-[4px_4px_0_0_var(--color-ink)] bg-[var(--color-accent-bg)]' : 'border-[var(--color-border)] hover:border-[var(--color-ink)]'}`}
          >
            <span className="flex justify-between items-center font-black text-[var(--color-ink)] uppercase tracking-widest text-sm">
              {titulo}
              {tamano === valor && <CheckCircle2 className="text-[var(--color-accent)]" size={18} />}
            </span>
            <span className="text-xs text-[var(--color-muted)] font-bold mt-1">{texto}</span>
          </button>
        ))}
      </div>
    </div>
  );
};




