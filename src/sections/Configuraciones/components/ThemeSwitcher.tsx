import React, { useState, useEffect } from 'react';
import { Palette, CheckCircle2, Monitor } from 'lucide-react';
import { leerTamanoInterfaz, guardarTamanoInterfaz, type TamanoInterfaz } from '../../../utils/tamanoInterfaz';

type Tema = 'classic' | 'monochrome' | 'oceano' | 'atardecer' | 'bosque' | 'rosa';

// Cada tema (salvo Clásico y Monocromático, que son casos especiales) solo necesita
// decir qué 4 colores mostrar en su muestra y qué atributo data-theme aplicar.
const TEMAS: { id: Tema; nombre: string; descripcion: string; swatches: string[] }[] = [
  { id: 'classic', nombre: 'Tema Clásico', descripcion: 'Colores vibrantes e indicadores visuales dinámicos (Por defecto).', swatches: ['#1E293B', '#10B981', '#F59E0B', '#EF4444'] },
  { id: 'monochrome', nombre: 'Monocromático', descripcion: 'Escala de grises, blanco y negro para menor fatiga visual.', swatches: ['#000000', '#525252', '#A3A3A3', '#E5E5E5'] },
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
    // Monocromático es un filtro (clase); los demás son paletas propias (atributo).
    // Siempre se limpian los dos primero para no dejar restos del tema anterior.
    document.documentElement.classList.remove('theme-monochrome');
    document.documentElement.removeAttribute('data-theme');
    if (newTheme === 'monochrome') {
      document.documentElement.classList.add('theme-monochrome');
    } else if (newTheme !== 'classic') {
      document.documentElement.setAttribute('data-theme', newTheme);
    }
  };

  return (
    <div className="bg-white border-2 border-[var(--color-border)] p-4 lg:p-6 w-full max-w-4xl font-mono">
      <div className="flex items-center gap-3 border-b-2 border-[var(--color-ink)] pb-4 mb-6">
        <Palette className="text-[var(--color-accent)]" size={24} />
        <h2 className="text-lg font-black uppercase text-[var(--color-ink)]">Apariencia y Colores</h2>
      </div>

      <p className="text-sm text-[var(--color-muted)] mb-6 font-bold">Selecciona el tema visual para el sistema. Este ajuste se aplicará en todas las ventanas, paneles flotantes y subsesiones del programa.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {TEMAS.map((t) => (
          <button
            key={t.id}
            onClick={() => changeTheme(t.id)}
            className={`relative flex flex-col text-left border-2 p-4 transition-all cursor-pointer ${theme === t.id ? 'border-[var(--color-accent)] shadow-[4px_4px_0_0_var(--color-ink)] bg-[var(--color-accent-bg)]' : 'border-[var(--color-border)] hover:border-[var(--color-ink)] hover:shadow-[4px_4px_0_0_var(--color-ink)] hover:-translate-y-1'}`}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-black text-[var(--color-ink)] uppercase tracking-widest">{t.nombre}</h3>
              {theme === t.id && <CheckCircle2 className="text-[var(--color-accent)]" size={20} />}
            </div>
            <div className="flex gap-2 w-full mb-3">
              {t.swatches.map((hex, i) => (
                <div key={i} className="h-6 flex-1" style={{ backgroundColor: hex }}></div>
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {([
          ['auto', 'Automático', 'Se agranda solo en televisores sin mouse.'],
          ['normal', 'Normal', 'Tamaño de PC y laptop, aunque la pantalla sea grande.'],
          ['grande', 'Grande (TV)', 'Letras y botones más grandes para leer de lejos.'],
        ] as [TamanoInterfaz, string, string][]).map(([valor, titulo, texto]) => (
          <button
            key={valor}
            onClick={() => cambiarTamano(valor)}
            className={`flex flex-col text-left border-2 p-3 transition-all cursor-pointer ${tamano === valor ? 'border-[var(--color-accent)] shadow-[4px_4px_0_0_var(--color-ink)] bg-[var(--color-accent-bg)]' : 'border-[var(--color-border)] hover:border-[var(--color-ink)]'}`}
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
