const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const insertIndex = lines.findIndex(l => l.includes('const movsUnificados: UnifiedItem[] = (movData || []).map((m: any) => ({'));

  if (insertIndex > -1) {
    lines[insertIndex] = `        const custIds = new Set();
        (movData || []).forEach((m: any) => {
          if (m.description) {
            const match = m.description.match(/Cliente ID: (\\d+)/);
            if (match) custIds.add(match[1]);
          }
        });
        const customersMap: Record<string, string> = {};
        if (custIds.size > 0) {
          const { data: custData } = await supabase.from('customers').select('id, name').in('id', Array.from(custIds));
          if (custData) {
            custData.forEach(c => customersMap[c.id] = c.name);
          }
        }

        const movsUnificados: UnifiedItem[] = (movData || []).map((m: any) => {
          let desc = m.description;
          if (desc) {
            const match = desc.match(/Cliente ID: (\\d+)/);
            if (match && customersMap[match[1]]) {
              desc = desc.replace(\`Cliente ID: \${match[1]}\`, \`Cliente: \${customersMap[match[1]]}\`);
            }
          }
          return {`;
    const descIndex = lines.findIndex((l, i) => i > insertIndex && l.includes('descripcion: m.description,'));
    lines[descIndex] = lines[descIndex].replace('descripcion: m.description,', 'descripcion: desc,');
    
    fs.writeFileSync(filePath, lines.join('\n'));
    console.log('Fixed', filePath);
  } else {
    console.log('Could not find insert index in', filePath);
  }
}

fixFile('src/sections/Finanzas/index.tsx');

// Now for ModalDetalleCaja.tsx
let contentModal = fs.readFileSync('src/sections/Finanzas/components/ModalDetalleCaja.tsx', 'utf-8');
const linesModal = contentModal.split('\n');
const insertIndexModal = linesModal.findIndex(l => l.includes('setMovimientos(movs || []);'));

if (insertIndexModal > -1) {
  linesModal[insertIndexModal] = `
    const custIds = new Set();
    (movs || []).forEach((m: any) => {
      if (m.description) {
        const match = m.description.match(/Cliente ID: (\\d+)/);
        if (match) custIds.add(match[1]);
      }
    });
    const customersMap: Record<string, string> = {};
    if (custIds.size > 0) {
      const { data: custData } = await supabase.from('customers').select('id, name').in('id', Array.from(custIds));
      if (custData) {
        custData.forEach(c => customersMap[c.id] = c.name);
      }
    }
    
    const movsConNombre = (movs || []).map(m => {
      let desc = m.description;
      if (desc) {
        const match = desc.match(/Cliente ID: (\\d+)/);
        if (match && customersMap[match[1]]) {
          desc = desc.replace(\`Cliente ID: \${match[1]}\`, \`Cliente: \${customersMap[match[1]]}\`);
        }
      }
      return { ...m, description: desc };
    });
    
    setMovimientos(movsConNombre);`;
  
  fs.writeFileSync('src/sections/Finanzas/components/ModalDetalleCaja.tsx', linesModal.join('\n'));
  console.log('Fixed ModalDetalleCaja.tsx');
} else {
  console.log('Could not find insert index in ModalDetalleCaja.tsx');
}
