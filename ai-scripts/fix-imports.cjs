const fs = require('fs');
const path = require('path');

const dir = 'src/sections/Inventario/components';
const filesToUpdate = ['ModalLote.tsx', 'ModalMerma.tsx', 'ModalProducto.tsx'];

filesToUpdate.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Replace the import path and name
  content = content.replace(/import\s+\{\s*useEscapeClose\s*\}\s+from\s+['"]\.\.\/\.\.\/\.\.\/utils\/useEscapeClose['"];/g, 
                            "import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';");
  
  // Replace the function call
  content = content.replace(/useEscapeClose\(/g, "useCerrarConEscape(");
  
  fs.writeFileSync(filePath, content);
  console.log(`Updated ${file}`);
});
