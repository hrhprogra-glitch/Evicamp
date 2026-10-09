const fs = require('fs');

// 1. Update index.css
let cssFile = 'src/index.css';
let cssCode = fs.readFileSync(cssFile, 'utf-8');

const oldMonochromeCSS = `html.theme-monochrome {
    --color-brand-primary: #E5E5E5;
    --color-brand-bg: #121212;
    --color-ink: #E5E5E5;
    --color-ink-rgb: 229, 229, 229;
    --color-ink-dark: #FFFFFF;
    --color-border: #000000;
    --color-line-light: #404040;
    --color-muted: #A3A3A3;
    --color-subtle: #737373;
    --color-bg: #121212;
    --color-bg-2: #1A1A1A;
    --color-surface: #262626;
    --color-accent: #737373;
    --color-accent-rgb: 115, 115, 115;
    --color-accent-dark: #A3A3A3;
    --color-accent-dark-2: #D4D4D4;
    --color-accent-shadow: #000000;
    --color-accent-bg: #404040;
    --color-accent-hover: #525252;
    --color-danger: #737373;
    --color-danger-rgb: 115, 115, 115;
    --color-danger-bg: #404040;
    --color-success: #737373;
    --color-success-bg: #404040;
    --color-info: #737373;
    --color-info-bg: #404040;
    --color-warning: #737373;
    --color-warning-bg: #404040;
  }`;

const newMonochromeCSS = `html.theme-monochrome {
    /* MODO OSCURO ELEGANTE (Neo-Brutalism Dark) */
    --color-brand-primary: #E5E5E5;
    --color-brand-bg: #121212;
    
    /* Textos y bordes */
    --color-ink: #E5E5E5;
    --color-ink-rgb: 229, 229, 229;
    --color-ink-dark: #FFFFFF;
    --color-border: #000000; /* Borde absoluto para brutalismo */
    --color-line-light: #404040;
    
    /* Grises */
    --color-muted: #A3A3A3;
    --color-subtle: #737373;
    
    /* Fondos */
    --color-bg: #121212;
    --color-bg-2: #1A1A1A;
    --color-surface: #262626; /* Cajas y tarjetas */
    
    /* Acentos vibrantes (Dorados y colores vivos para contrastar con el carbón) */
    --color-accent: #F59E0B; /* Dorado / Ámbar */
    --color-accent-rgb: 245, 158, 11;
    --color-accent-dark: #D97706;
    --color-accent-dark-2: #B45309;
    --color-accent-shadow: #000000;
    --color-accent-bg: #452402; /* Fondo muy oscuro ámbar */
    --color-accent-hover: #78350F;
    
    /* Colores Semánticos Vivos */
    --color-danger: #EF4444;
    --color-danger-rgb: 239, 68, 68;
    --color-danger-bg: #450A0A;
    
    --color-success: #10B981;
    --color-success-bg: #064E3B;
    
    --color-info: #3B82F6;
    --color-info-bg: #1E3A8A;
    
    --color-warning: #F59E0B;
    --color-warning-bg: #452402;
  }`;

cssCode = cssCode.replace(oldMonochromeCSS, newMonochromeCSS);

// Quitar el filtro gris de imágenes para que no arruine las fotos
const oldFilter = `/* Invertir imágenes para que no desentonen, pero suavemente */
html.theme-monochrome img,
html.theme-monochrome video {
    filter: grayscale(1) brightness(0.8);
  }`;
cssCode = cssCode.replace(oldFilter, `/* Las imágenes ahora mantienen su color en Dark Elegante */
html.theme-monochrome img,
html.theme-monochrome video {
    filter: brightness(0.9);
  }`);

fs.writeFileSync(cssFile, cssCode);

// 2. Update ThemeSwitcher.tsx
let tsFile = 'src/sections/Configuraciones/components/ThemeSwitcher.tsx';
let tsCode = fs.readFileSync(tsFile, 'utf-8');

const oldSwatch = `swatches: ['#0A0A0A', '#1C1C1C', '#666666', '#C8C8C8']`;
const newSwatch = `swatches: ['#121212', '#262626', '#F59E0B', '#EF4444']`;

tsCode = tsCode.replace(oldSwatch, newSwatch);
fs.writeFileSync(tsFile, tsCode);

console.log("Dark Elegante applied!");
