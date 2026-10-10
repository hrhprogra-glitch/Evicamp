const fs = require('fs');
let content = fs.readFileSync('src/sections/Finanzas/index.tsx', 'utf-8');

// Remove state
content = content.replace(/const \[pestañaFlujo, setPestañaFlujo\] = useState<'INTERNO'\|'EXTERNO'>\('INTERNO'\);\n/, '');

// Remove the tabs div
const tabsStart = '<div className="flex border-b-2 border-[var(--color-border)] bg-[var(--color-bg)] shrink-0">';
const searchStart = '<div className="p-3 sm:p-4 bg-[var(--color-bg)] border-b border-[var(--color-border)] flex flex-col sm:flex-row gap-3">';

const iStart = content.indexOf(tabsStart);
const iEnd = content.indexOf(searchStart);

if (iStart !== -1 && iEnd !== -1) {
  content = content.substring(0, iStart) + content.substring(iEnd);
} else {
  console.log('Tabs div not found');
}

// Fix the filter
const filterRegex = /movimientos={movimientos\.filter\(m => \{[\s\S]*?return m\.flujo === 'EXTERNO';\n\s*\}\)\.filter/m;

if (filterRegex.test(content)) {
  content = content.replace(filterRegex, 'movimientos={movimientos.filter');
  fs.writeFileSync('src/sections/Finanzas/index.tsx', content);
  console.log('Finanzas/index.tsx tabs removed successfully.');
} else {
  console.log('Filter not found');
}
