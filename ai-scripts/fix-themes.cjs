const fs = require('fs');

// 1. Rename 'Monocromático' to 'Modo Oscuro (Dark)' in ThemeSwitcher.tsx
let themeFile = 'src/sections/Configuraciones/components/ThemeSwitcher.tsx';
let themeCode = fs.readFileSync(themeFile, 'utf-8');

themeCode = themeCode.replace(
  "{ id: 'monochrome', nombre: 'Monocromático'", 
  "{ id: 'monochrome', nombre: 'Modo Oscuro (Dark)'"
);
fs.writeFileSync(themeFile, themeCode);

// 2. Fix hardcoded 'bg-white' and '#1E293B' in Inventario/index.tsx
let invFile = 'src/sections/Inventario/index.tsx';
let invCode = fs.readFileSync(invFile, 'utf-8');

// Replace bg-white with bg-[var(--color-bg)] or bg-[var(--color-surface)] safely
// Be careful: Inventario main container uses bg-white. Let's make it bg-[var(--color-bg)].
invCode = invCode.replace(/bg-white/g, "bg-[var(--color-bg)]");

// The header used bg-[var(--color-bg)] instead of bg-white but then we have text-[#1E293B]
invCode = invCode.replace(/text-\[\#1E293B\]/g, "text-[var(--color-ink)]");

fs.writeFileSync(invFile, invCode);

// 3. Fix the "sigue igual de brusco agrega animación mejor"
// The user doesn't like the instant transition for ModalClientes. They explicitly want an ANIMATION.
// Let's add animate-fade-in to ModalClientes!
let modalClientesFile = 'src/sections/Fiados/components/ModalClientes.tsx';
let modalClientesCode = fs.readFileSync(modalClientesFile, 'utf-8');

// The main dialog wrapper has: `role="dialog" aria-modal="true" className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 font-mono"`
if (!modalClientesCode.includes('animate-fade-in')) {
  modalClientesCode = modalClientesCode.replace(
    'backdrop-blur-sm z-50',
    'backdrop-blur-sm z-50 animate-fade-in'
  );
  // Also add animate-slide-up to the inner window
  modalClientesCode = modalClientesCode.replace(
    'className="bg-white w-full max-w-6xl',
    'className="bg-[var(--color-surface)] animate-slide-up w-full max-w-6xl'
  );
  fs.writeFileSync(modalClientesFile, modalClientesCode);
}

console.log("Fixes applied: dark theme renamed, inventario colors fixed, animations added.");
