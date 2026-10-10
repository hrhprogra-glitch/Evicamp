const fs = require('fs');

let content1 = fs.readFileSync('src/sections/Finanzas/index.tsx', 'utf-8');
content1 = content1.replace(
  /supabase\.from\('sales'\)\.select\('\*, sale_details\(product_name\)'\)/g,
  "supabase.from('sales').select('*')"
);
fs.writeFileSync('src/sections/Finanzas/index.tsx', content1);

let content2 = fs.readFileSync('src/sections/Finanzas/components/ModalDetalleCaja.tsx', 'utf-8');
content2 = content2.replace(
  /supabase\.from\('sales'\)\.select\('\*, sale_details\(product_name\)'\)/g,
  "supabase.from('sales').select('*')"
);
content2 = content2.replace(
  /supabase\n\s*\.from\('sales'\)\n\s*\.select\('\*, sale_details\(product_name\)'\)/g,
  "supabase\n      .from('sales')\n      .select('*')"
);
fs.writeFileSync('src/sections/Finanzas/components/ModalDetalleCaja.tsx', content2);
console.log('Reverted queries');
