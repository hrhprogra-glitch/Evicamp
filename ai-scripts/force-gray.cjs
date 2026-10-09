const fs = require('fs');

let cssFile = 'src/index.css';
let cssCode = fs.readFileSync(cssFile, 'utf-8');

const startIndex = cssCode.indexOf('html.theme-monochrome {');
if (startIndex !== -1) {
  const endIndex = cssCode.indexOf('}', startIndex);
  
  if (endIndex !== -1) {
    const newCss = `html.theme-monochrome {
  /* MODO OSCURO (Gris Suave, NO negro absoluto) */
  --color-brand-primary: #F5F5F5;
  --color-brand-bg: #1A1A1A;
  
  /* Textos y bordes */
  --color-ink: #F5F5F5;
  --color-ink-rgb: 245, 245, 245;
  --color-ink-dark: #FFFFFF;
  --color-border: #000000; /* Borde negro para mantener el estilo brutalista sobre el fondo gris */
  --color-line-light: #333333;
  
  /* Grises */
  --color-muted: #A3A3A3;
  --color-subtle: #737373;
  
  /* Fondos grises suaves (No queman la vista) */
  --color-bg: #1A1A1A; 
  --color-bg-2: #222222;
  --color-surface: #2A2A2A; 
  
  /* Acentos vibrantes (Se mantienen los colores para no perder usabilidad) */
  --color-accent: #FFFFFF;
  --color-accent-rgb: 255, 255, 255;
  --color-accent-dark: #E5E5E5;
  --color-accent-dark-2: #CCCCCC;
  --color-accent-shadow: #000000;
  --color-accent-bg: #333333;
  --color-accent-hover: #404040;
  
  /* Colores Semánticos Normales (¡NO en escala de grises!) */
  --color-danger: #EF4444; 
  --color-danger-rgb: 239, 68, 68;
  --color-danger-bg: #450A0A;
  
  --color-success: #10B981;
  --color-success-bg: #064E3B;
  
  --color-info: #3B82F6;
  --color-info-bg: #1E3A8A;
  
  --color-warning: #F59E0B;
  --color-warning-bg: #452402;
`;
    
    cssCode = cssCode.substring(0, startIndex) + newCss + cssCode.substring(endIndex);
    fs.writeFileSync(cssFile, cssCode);
  }
}

// Actualizar ThemeSwitcher
let tsFile = 'src/sections/Configuraciones/components/ThemeSwitcher.tsx';
let tsCode = fs.readFileSync(tsFile, 'utf-8');

tsCode = tsCode.replace(
  "swatches: ['#000000', '#111111', '#FFFFFF', '#333333']", 
  "swatches: ['#1A1A1A', '#2A2A2A', '#F5F5F5', '#000000']"
);

fs.writeFileSync(tsFile, tsCode);
console.log("Soft Gray Dark Mode applied!");
