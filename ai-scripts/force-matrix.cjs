const fs = require('fs');

let cssFile = 'src/index.css';
let cssCode = fs.readFileSync(cssFile, 'utf-8');

// Find the start of html.theme-monochrome
const startIndex = cssCode.indexOf('html.theme-monochrome {');
if (startIndex !== -1) {
  // Find the closing brace for html.theme-monochrome
  const endIndex = cssCode.indexOf('}', startIndex);
  
  if (endIndex !== -1) {
    const newCss = `html.theme-monochrome {
  /* MODO OSCURO HACKER / MATRIX */
  --color-brand-primary: #22C55E;
  --color-brand-bg: #000000;
  
  /* Textos y bordes */
  --color-ink: #39FF14; /* Neon Green */
  --color-ink-rgb: 57, 255, 20;
  --color-ink-dark: #4ADE80;
  --color-border: #39FF14; /* Bordes verdes para que resalten en el negro */
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
`;
    
    cssCode = cssCode.substring(0, startIndex) + newCss + cssCode.substring(endIndex);
    fs.writeFileSync(cssFile, cssCode);
    console.log("Matrix CSS block replaced successfully!");
  }
} else {
  console.log("Could not find html.theme-monochrome {");
}
