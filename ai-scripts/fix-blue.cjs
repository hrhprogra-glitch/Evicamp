const fs = require('fs');

let code = fs.readFileSync('src/sections/Inventario/components/ModalGestionProveedores.tsx', 'utf-8');

// The header has bg-[var(--color-accent)]
code = code.replace(/bg-\[var\(--color-accent\)\].*?shrink-0/, match => {
  return match.replace(/bg-\[var\(--color-accent\)\]/, 'bg-[var(--color-info)]');
});

// The close button text on hover might be text-[var(--color-accent)]
code = code.replace(/hover:text-\[var\(--color-accent\)\]/g, 'hover:text-[var(--color-info)]');

// Also the text of the title should probably be white, wait. In the screenshot, the text is black: text-[var(--color-ink)]
// Let's leave text ink. 
// However, the Nuevo Proveedor button is ink and accent?
// In ModalGestionProveedores.tsx:
// text-[var(--color-accent)] px-6 py-3 border-2 border-[var(--color-ink)]...
code = code.replace(/text-\[var\(--color-accent\)\]/g, 'text-[var(--color-info)]');
code = code.replace(/bg-\[var\(--color-accent\)\]/g, 'bg-[var(--color-info)]');
// just completely swap all --color-accent with --color-info in this file for styling.
code = code.replace(/--color-accent/g, '--color-info');

fs.writeFileSync('src/sections/Inventario/components/ModalGestionProveedores.tsx', code);
console.log("Updated to blue!");
