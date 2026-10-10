const fs = require('fs');
let content = fs.readFileSync('src/sections/Finanzas/components/ModalDetalleCaja.tsx', 'utf-8');
content = content.replace(
  /const totalExternos = movsExternos\.reduce\(\(a, m\) => a \+ \(m\.type === 'INGRESO' \? Number\(m\.amount\) : -Number\(m\.amount\)\), 0\);/,
  `const totalExternos = movsExternos.reduce((a, m) => a + (m.type === 'INGRESO' ? Number(m.amount) : -Number(m.amount)), 0);
  const totalMovimientos = movimientos.reduce((a, m) => a + (m.type === 'INGRESO' ? Number(m.amount) : -Number(m.amount)), 0);`
);
fs.writeFileSync('src/sections/Finanzas/components/ModalDetalleCaja.tsx', content);
