const fs = require('fs');
const path = require('path');

const dir = 'src/sections/Inventario';

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Replace colors
  content = content.replace(/bg-white/g, 'bg-[var(--color-surface)]');
  content = content.replace(/text-black/g, 'text-[var(--color-ink)]');
  content = content.replace(/border-black/g, 'border-[var(--color-ink)]');
  content = content.replace(/bg-black/g, 'bg-[var(--color-ink)]');
  
  // Replace hardcoded Hex colors
  content = content.replace(/#1E293B/g, 'var(--color-ink)');
  content = content.replace(/#10B981/g, 'var(--color-success)');
  content = content.replace(/#EF4444/g, 'var(--color-danger)');
  content = content.replace(/#F59E0B/g, 'var(--color-warning)');
  content = content.replace(/#000000/g, 'var(--color-border)');
  
  // Also clean up any bg-[var(--color-surface)]/60 or similar where bg-black/60 was intended for modals
  content = content.replace(/bg-\[var\(--color-ink\)\]\/60/g, 'bg-black/60');
  
  fs.writeFileSync(filePath, content);
}

function processDir(directory) {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      replaceInFile(fullPath);
    }
  }
}

processDir(dir);
console.log("Inventario colors purged and replaced with CSS variables.");
