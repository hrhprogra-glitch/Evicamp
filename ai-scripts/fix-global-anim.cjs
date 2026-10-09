const fs = require('fs');

let cssFile = 'src/index.css';
let cssCode = fs.readFileSync(cssFile, 'utf-8');

const newAnimations = `
/* ==========================================================================
   ANIMACIONES DE ENTRADA GLOBALES (EFECTO PREMIUM / DINÁMICO)
   Solicitado: Ventanas flotantes, tablas, y botones de secciones.
   ========================================================================== */

/* 1. Ventanas Flotantes (Backdrop y Contenedor) */
div[role="dialog"] {
  animation: agy-fade-in 0.2s ease-out forwards;
}
div[role="dialog"] > div {
  animation: agy-slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

/* 2. Tablas y Listas de datos */
table, 
.grid-cols-1.divide-y-2,
.overflow-x-auto > table,
.overflow-y-auto > div.grid {
  animation: agy-fade-slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

/* 3. Botones de todas las secciones (excluyendo ventanas flotantes) */
/* La clase .fixed de Tailwind se usa para los modales, por lo que aplicamos solo a botones que no sean descendientes de .fixed */
body *:not(.fixed) > button,
section button,
nav button {
  animation: agy-fade-in 0.5s ease-out forwards;
}
/* Evitar que botones dentro del modal vuelvan a animarse si el selector de arriba los pesca por accidente */
.fixed button {
  animation: none !important;
}

/* Definición de Keyframes */
@keyframes agy-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes agy-slide-up {
  from { opacity: 0; transform: translateY(20px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes agy-fade-slide-up {
  from { opacity: 0; transform: translateY(15px); }
  to { opacity: 1; transform: translateY(0); }
}
`;

if (!cssCode.includes('AGY_ANIMACIONES_GLOBALES')) {
  cssCode = cssCode + "\n/* AGY_ANIMACIONES_GLOBALES */" + newAnimations;
  fs.writeFileSync(cssFile, cssCode);
  console.log("Global animations applied!");
} else {
  console.log("Animations already exist.");
}
