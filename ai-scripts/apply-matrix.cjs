const fs = require('fs');

let cssFile = 'src/index.css';
let cssCode = fs.readFileSync(cssFile, 'utf-8');

const oldCss = `html.theme-monochrome {
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

const newCss = `html.theme-monochrome {
    /* MODO OSCURO HACKER / MATRIX */
    --color-brand-primary: #22C55E;
    --color-brand-bg: #000000;
    
    /* Textos y bordes */
    --color-ink: #22C55E; /* Neon Green */
    --color-ink-rgb: 34, 197, 94;
    --color-ink-dark: #4ADE80;
    --color-border: #22C55E; /* Bordes verdes para que resalten en el negro */
    --color-line-light: #166534;
    
    /* Grises (Ahora son verdes oscuros) */
    --color-muted: #15803D;
    --color-subtle: #166534;
    
    /* Fondos */
    --color-bg: #000000; /* Negro absoluto */
    --color-bg-2: #050505;
    --color-surface: #0A0A0A; /* Cajas ligeramente arriba del negro absoluto */
    
    /* Acentos vibrantes */
    --color-accent: #39FF14; /* Verde radioactivo */
    --color-accent-rgb: 57, 255, 20;
    --color-accent-dark: #22C55E;
    --color-accent-dark-2: #16A34A;
    --color-accent-shadow: #000000;
    --color-accent-bg: #064E3B; /* Verde muy oscuro para fondos */
    --color-accent-hover: #065F46;
    
    /* Colores Semánticos (Estilo Consola) */
    --color-danger: #FF003C; /* Rojo/Magenta neón */
    --color-danger-rgb: 255, 0, 60;
    --color-danger-bg: #4A0404;
    
    --color-success: #39FF14;
    --color-success-bg: #064E3B;
    
    --color-info: #06B6D4; /* Cyan neón */
    --color-info-bg: #083344;
    
    --color-warning: #FBBF24;
    --color-warning-bg: #451A03;
  }`;

cssCode = cssCode.replace(oldCss, newCss);

fs.writeFileSync(cssFile, cssCode);

// Actualizar nombre y swatches en ThemeSwitcher
let tsFile = 'src/sections/Configuraciones/components/ThemeSwitcher.tsx';
let tsCode = fs.readFileSync(tsFile, 'utf-8');

tsCode = tsCode.replace("Modo Oscuro (Dark)", "Hacker / Matrix");
tsCode = tsCode.replace(
  "swatches: ['#121212', '#262626', '#F59E0B', '#EF4444']", 
  "swatches: ['#000000', '#0A0A0A', '#22C55E', '#39FF14']"
);

fs.writeFileSync(tsFile, tsCode);
console.log("Matrix applied!");
