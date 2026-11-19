// Tema inicial de cada sitio. El valor lo decide index.html antes de dibujar la pantalla,
// para que el primer fotograma ya salga con el color correcto (sin destello).
export type Tema = 'classic' | 'monochrome' | 'oceano' | 'atardecer' | 'bosque' | 'rosa';

declare global {
  interface Window {
    SIUMAX_TEMA_PREDETERMINADO?: Tema;
    SIUMAX_NOMBRE_SITIO?: string;
  }
}

// El nombre visible lo pone index.html según el dominio; acá solo se consume.
export const NOMBRE_SITIO = window.SIUMAX_NOMBRE_SITIO || 'SiuMax Nego';
export const ES_SITIO_OFICIAL = NOMBRE_SITIO === 'ECO SISTEMAS URH';

const TEMAS_VALIDOS: Tema[] = ['classic', 'monochrome', 'oceano', 'atardecer', 'bosque', 'rosa'];
const indicado = window.SIUMAX_TEMA_PREDETERMINADO;

export const TEMA_PREDETERMINADO: Tema = TEMAS_VALIDOS.includes(indicado as Tema)
  ? (indicado as Tema)
  : 'classic';

// Si el dispositivo ya guardó un tema (incluso Clásico), se respeta tal cual.
export const leerTema = (): Tema => {
  try {
    return (localStorage.getItem('gestorpro_theme') || TEMA_PREDETERMINADO) as Tema;
  } catch {
    return TEMA_PREDETERMINADO;
  }
};
