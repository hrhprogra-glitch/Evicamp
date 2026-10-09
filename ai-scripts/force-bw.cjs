const fs = require('fs');

let cssFile = 'src/index.css';
let cssCode = fs.readFileSync(cssFile, 'utf-8');

const startIndex = cssCode.indexOf('html.theme-monochrome {');
if (startIndex !== -1) {
  const endIndex = cssCode.indexOf('}', startIndex);
  
  if (endIndex !== -1) {
    const newCss = `html.theme-monochrome {
  /* MODO OSCURO (Black & White Clásico) */
  --color-brand-primary: #FFFFFF;
  --color-brand-bg: #000000;
  
  /* Textos y bordes */
  --color-ink: #FFFFFF;
  --color-ink-rgb: 255, 255, 255;
  --color-ink-dark: #E5E5E5;
  --color-border: #333333; /* Bordes grises oscuros para que no sea un blanco tan chillón */
  --color-line-light: #262626;
  
  /* Grises */
  --color-muted: #A3A3A3;
  --color-subtle: #737373;
  
  /* Fondos */
  --color-bg: #000000; /* Negro absoluto */
  --color-bg-2: #0A0A0A;
  --color-surface: #111111; /* Cajas grises super oscuras */
  
  /* Acentos vibrantes (Se mantienen los colores para no perder usabilidad) */
  --color-accent: #FFFFFF;
  --color-accent-rgb: 255, 255, 255;
  --color-accent-dark: #E5E5E5;
  --color-accent-dark-2: #CCCCCC;
  --color-accent-shadow: #333333;
  --color-accent-bg: #262626;
  --color-accent-hover: #404040;
  
  /* Colores Semánticos Normales */
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

tsCode = tsCode.replace("Hacker / Matrix", "Modo Oscuro");
tsCode = tsCode.replace(
  "swatches: ['#000000', '#0A0A0A', '#22C55E', '#39FF14']", 
  "swatches: ['#000000', '#111111', '#FFFFFF', '#333333']"
);

fs.writeFileSync(tsFile, tsCode);
console.log("Black and White Dark Mode applied!");
