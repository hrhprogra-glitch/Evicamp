const fs = require('fs');

let cssFile = 'src/index.css';
let cssCode = fs.readFileSync(cssFile, 'utf-8');

// Buscamos el bloque de html.theme-monochrome y todo lo que está asociado a él.
const startIndex = cssCode.indexOf('html.theme-monochrome {');
if (startIndex !== -1) {
  // Encuentra dónde termina la sección de monochrome (antes de oceano)
  const endIndex = cssCode.indexOf('html[data-theme="oceano"] {');
  
  if (endIndex !== -1) {
    const newCss = `html.theme-monochrome {
  /* TEMA MONOCROMÁTICO (Estilo Claro, idéntico a Océano/Rosa pero en escala de grises) */
  --color-ink: #171717; /* Gris muy oscuro, casi negro */
  --color-ink-rgb: 23, 23, 23;
  --color-ink-dark: #000000;
  --color-border: #E5E5E5;
  --color-line-light: #D4D4D4;
  --color-muted: #737373;
  --color-subtle: #A3A3A3;
  --color-bg: #F5F5F5; /* Fondo gris súper claro */
  --color-bg-2: #E5E5E5;
  --color-surface: #FFFFFF; /* Cajas blancas, igual que los demás temas */
  --color-accent: #525252; /* Acento gris medio */
  --color-accent-rgb: 82, 82, 82;
  --color-accent-dark: #404040;
  --color-accent-dark-2: #262626;
  --color-accent-shadow: #171717;
  --color-accent-shadow-rgb: 23, 23, 23;
  --color-accent-bg: #E5E5E5;
  --color-accent-bg-2: #D4D4D4;
}

  `;
    
    // Reemplaza todo el bloque desde html.theme-monochrome hasta antes de oceano
    cssCode = cssCode.substring(0, startIndex) + newCss + cssCode.substring(endIndex);
    fs.writeFileSync(cssFile, cssCode);
  }
}

// Limpiar la regla extra que inyectamos antes
const extraRule = `/* Corrección de contraste en botones de inventario */
html.theme-monochrome .bg-\\[var\\(--color-ink\\)\\] .text-white,
html.theme-monochrome .bg-\\[var\\(--color-ink\\)\\] {
  color: var(--color-bg) !important;
}`;
if (cssCode.includes(extraRule)) {
  cssCode = cssCode.replace(extraRule, '');
  fs.writeFileSync(cssFile, cssCode);
}

// Actualizar ThemeSwitcher
let tsFile = 'src/sections/Configuraciones/components/ThemeSwitcher.tsx';
let tsCode = fs.readFileSync(tsFile, 'utf-8');

tsCode = tsCode.replace("Modo Oscuro", "Plata / Gris");
tsCode = tsCode.replace(
  "Modo Oscuro elegante con fondo negro y grises suaves para cero fatiga visual.", 
  "Estilo profesional en escala de grises y blanco, súper limpio y minimalista."
);
tsCode = tsCode.replace(
  "swatches: ['#1A1A1A', '#2A2A2A', '#F5F5F5', '#000000']", 
  "swatches: ['#171717', '#525252', '#E5E5E5', '#FFFFFF']"
);

fs.writeFileSync(tsFile, tsCode);
console.log("Light grayscale theme applied!");
