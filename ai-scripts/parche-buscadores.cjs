const fs = require('fs');
const path = require('path');

function patchFile(relPath, transformFn) {
  const fullPath = path.join(__dirname, '..', relPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`Archivo no encontrado: ${fullPath}`);
    return;
  }
  const original = fs.readFileSync(fullPath, 'utf-8');
  const updated = transformFn(original);
  if (original !== updated) {
    fs.writeFileSync(fullPath, updated, 'utf-8');
    console.log(`✅ Actualizado: ${relPath}`);
  } else {
    console.log(`ℹ️ Sin cambios necesarios: ${relPath}`);
  }
}

// 1. Inventario/index.tsx
patchFile('src/sections/Inventario/index.tsx', (content) => {
  // Agregar import si no existe
  if (!content.includes("from '../../utils/busqueda'")) {
    content = "import { coincideBusqueda } from '../../utils/busqueda';\n" + content;
  }

  // Reemplazar el bloque de búsqueda que usaba existeCoincidenciaExacta
  const regexSearch = /if\s*\(\s*searchQuery\s*\)\s*\{[\s\S]*?result\s*=\s*result\.filter\s*\(\s*p\s*=>\s*\{[\s\S]*?\}\s*\);\s*\}/;
  const newSearch = `if (searchQuery && searchQuery.trim()) {
      result = result.filter(p => {
        if (!p) return false;
        return coincideBusqueda([p.name, p.code, p.barcode], searchQuery);
      });
    }`;

  content = content.replace(regexSearch, newSearch);
  return content;
});

// 2. Inventario/components/TablaLotes.tsx
patchFile('src/sections/Inventario/components/TablaLotes.tsx', (content) => {
  if (!content.includes("from '../../../utils/busqueda'")) {
    content = "import { coincideBusqueda } from '../../../utils/busqueda';\n" + content;
  }

  // Reemplazar qLimpio, existeCoincidenciaExacta y el if (searchQuery)
  const regexExacta = /const\s+qLimpio\s*=\s*searchQuery\.toLowerCase\(\)\.trim\(\);\s*\n\s*const\s+existeCoincidenciaExacta\s*=\s*lotes\.some\([\s\S]*?\);\s*\n\s*const\s+filteredLotes\s*=\s*lotes\.filter\(lote\s*=>\s*\{[\s\S]*?\/\/ 1\.\s*Filtro de Búsqueda de Texto[\s\S]*?if\s*\(\s*searchQuery\s*\)\s*\{[\s\S]*?\}\s*\n/m;

  const newLotesSearch = `const filteredLotes = lotes.filter(lote => {
    // 1. Filtro de Búsqueda de Texto Inteligente (coincidencia flexible)
    if (searchQuery && searchQuery.trim()) {
      if (!coincideBusqueda([lote.product_name, lote.document_ref], searchQuery)) {
        return false;
      }
    }
`;

  content = content.replace(regexExacta, newLotesSearch);
  return content;
});

// 3. Punto-de-venta/components/TerminalBusqueda.tsx
patchFile('src/sections/Punto-de-venta/components/TerminalBusqueda.tsx', (content) => {
  if (!content.includes("from '../../../utils/busqueda'")) {
    content = "import { coincideBusqueda } from '../../../utils/busqueda';\n" + content;
  }

  const regexPOS = /const\s+filteredProducts\s*=\s*searchQuery\.trim\(\)\s*===\s*''\s*\n\s*\?\s*\[\]\s*\n\s*:\s*productos\.filter\(p\s*=>\s*\{[\s\S]*?return\s+nombreSeguro\.includes\(q\)[\s\S]*?\}\)\.slice\(0,\s*48\);/;

  const newPOS = `const filteredProducts = searchQuery.trim() === '' 
    ? [] 
    : productos.filter(p => {
        return coincideBusqueda([p.name, p.code, p.barcode], searchQuery);
      }).slice(0, 48);`;

  content = content.replace(regexPOS, newPOS);
  return content;
});

// 4. Inventario/components/ModalLote.tsx
patchFile('src/sections/Inventario/components/ModalLote.tsx', (content) => {
  if (!content.includes("from '../../../utils/busqueda'")) {
    content = "import { coincideBusqueda } from '../../../utils/busqueda';\n" + content;
  }

  const regexModalLote = /const\s+filteredProducts\s*=\s*productos\.filter\(p\s*=>\s*\{[\s\S]*?if\s*\(p\.unit\s*===\s*'CONSUMO'\)\s*return\s*false;[\s\S]*?return\s+p\.name\.toLowerCase\(\)\.includes\(q\)[\s\S]*?\}\);/;

  const newModalLote = `const filteredProducts = productos.filter(p => {
    if (p.unit === 'CONSUMO') return false; // <-- BLOQUEO ESTRICTO: NO MOSTRAR CONSUMO AQUÍ
    return coincideBusqueda([p.name, p.code, p.barcode], searchQuery);
  });`;

  content = content.replace(regexModalLote, newModalLote);
  return content;
});

// 5. Inventario/components/ModalMerma.tsx
patchFile('src/sections/Inventario/components/ModalMerma.tsx', (content) => {
  if (!content.includes("from '../../../utils/busqueda'")) {
    content = "import { coincideBusqueda } from '../../../utils/busqueda';\n" + content;
  }

  const regexModalMerma = /const\s+filteredProducts\s*=\s*productos\.filter\(p\s*=>\s*\{[\s\S]*?const\s+q\s*=\s*searchQuery\.toLowerCase\(\);[\s\S]*?return\s+p\.name\.toLowerCase\(\)\.includes\(q\)[\s\S]*?\}\);/;

  const newModalMerma = `const filteredProducts = productos.filter(p => {
    return coincideBusqueda([p.name, p.code, p.barcode], searchQuery);
  });`;

  content = content.replace(regexModalMerma, newModalMerma);
  return content;
});

// 6. Punto-de-venta/components/ModalCobro.tsx
patchFile('src/sections/Punto-de-venta/components/ModalCobro.tsx', (content) => {
  if (!content.includes("from '../../../utils/busqueda'")) {
    content = "import { coincideBusqueda } from '../../../utils/busqueda';\n" + content;
  }

  content = content.replace(
    /clientesDb\.filter\(c\s*=>\s*\(c\.nombre\s*\|\|\s*c\.name\s*\|\|\s*''\)\.toUpperCase\(\)\.includes\(searchCliente\)\)/g,
    "clientesDb.filter(c => coincideBusqueda([c.nombre, c.name, c.dni, c.telefono], searchCliente))"
  );
  return content;
});

// 7. Fiados/components/ModalFiado.tsx
patchFile('src/sections/Fiados/components/ModalFiado.tsx', (content) => {
  if (!content.includes("from '../../../utils/busqueda'")) {
    content = "import { coincideBusqueda } from '../../../utils/busqueda';\n" + content;
  }

  // Filtrado de productos en fiado
  const regexProdFiado = /const\s+prodFiltrados\s*=\s*searchProd\.trim\(\)\s*===\s*''\s*\?\s*\[\]\s*:\s*productos\.filter\(p\s*=>\s*\{[\s\S]*?if\s*\(!p\.name\s*\|\|\s*p\.quantity\s*<=\s*0\)\s*return\s*false;[\s\S]*?return\s+p\.name\.toLowerCase\(\)\.includes\(q\)[\s\S]*?\}\)\.slice\(0,\s*5\);/;

  const newProdFiado = `const prodFiltrados = searchProd.trim() === '' ? [] : productos.filter(p => {
    if (!p.name || p.quantity <= 0) return false; // <--- Solo productos con stock
    return coincideBusqueda([p.name, p.code, p.barcode], searchProd);
  }).slice(0, 5);`;

  content = content.replace(regexProdFiado, newProdFiado);

  // Filtrado de clientes en fiado
  content = content.replace(
    /clientes\.filter\(c\s*=>\s*c\.nombre\.toLowerCase\(\)\.includes\(searchCliente\.toLowerCase\(\)\)\)/g,
    "clientes.filter(c => coincideBusqueda([c.nombre, c.dni, c.telefono], searchCliente))"
  );

  return content;
});

// 8. Fiados/components/TablaFiados.tsx
patchFile('src/sections/Fiados/components/TablaFiados.tsx', (content) => {
  if (!content.includes("from '../../../utils/busqueda'")) {
    content = "import { coincideBusqueda } from '../../../utils/busqueda';\n" + content;
  }

  const regexTablaFiados = /const\s+nombreCliente\s*=\s*f\.clienteNombre\s*\|\|\s*'';\s*\n\s*const\s+matchBusqueda\s*=\s*nombreCliente\.toLowerCase\(\)\.includes\(searchTerm\.toLowerCase\(\)\);/;
  const newTablaFiados = `const matchBusqueda = coincideBusqueda([f.clienteNombre, f.clienteDni, f.clienteTelefono], searchTerm);`;

  content = content.replace(regexTablaFiados, newTablaFiados);
  return content;
});

// 9. Fiados/components/TablaFiadosAgrupados.tsx
patchFile('src/sections/Fiados/components/TablaFiadosAgrupados.tsx', (content) => {
  if (!content.includes("from '../../../utils/busqueda'")) {
    content = "import { coincideBusqueda } from '../../../utils/busqueda';\n" + content;
  }

  const regexAgrupados = /const\s+term\s*=\s*searchTerm\.toLowerCase\(\);\s*\n\s*const\s+matchSearch\s*=\s*c\.clienteNombre\.toLowerCase\(\)\.includes\(term\)\s*\|\|\s*\(c\.clienteDni\s*&&\s*c\.clienteDni\.includes\(term\)\);/;
  const newAgrupados = `const matchSearch = coincideBusqueda([c.clienteNombre, c.clienteDni], searchTerm);`;

  content = content.replace(regexAgrupados, newAgrupados);
  return content;
});

// 10. Mermas/index.tsx
patchFile('src/sections/Mermas/index.tsx', (content) => {
  if (!content.includes("from '../../utils/busqueda'")) {
    content = "import { coincideBusqueda } from '../../utils/busqueda';\n" + content;
  }

  const regexMermas = /if\s*\(searchQuery\)\s*\{\s*\n\s*const\s+q\s*=\s*searchQuery\.toLowerCase\(\);\s*\n\s*result\s*=\s*result\.filter\(m\s*=>\s*\n\s*m\.product_name\.toLowerCase\(\)\.includes\(q\)\s*\|\|\s*\n\s*\(m\.notes\s*&&\s*m\.notes\.toLowerCase\(\)\.includes\(q\)\)\s*\n\s*\);\s*\n\s*\}/;

  const newMermas = `if (searchQuery && searchQuery.trim()) {
      result = result.filter(m => coincideBusqueda([m.product_name, m.notes], searchQuery));
    }`;

  content = content.replace(regexMermas, newMermas);
  return content;
});

// 11. Proveedores/index.tsx
patchFile('src/sections/Proveedores/index.tsx', (content) => {
  if (!content.includes("from '../../utils/busqueda'")) {
    content = "import { coincideBusqueda } from '../../utils/busqueda';\n" + content;
  }

  const regexProv = /if\s*\(searchQueryProv\)\s*\{\s*\n\s*const\s+q\s*=\s*searchQueryProv\.toLowerCase\(\);\s*\n\s*result\s*=\s*result\.filter\(p\s*=>\s*\n\s*p\.ruc\.toLowerCase\(\)\.includes\(q\)\s*\|\|\s*\n\s*p\.razon_social\.toLowerCase\(\)\.includes\(q\)\s*\|\|\s*\n\s*\(p\.nombre_comercial\s*&&\s*p\.nombre_comercial\.toLowerCase\(\)\.includes\(q\)\)\s*\n\s*\);\s*\n\s*\}/;

  const newProv = `if (searchQueryProv && searchQueryProv.trim()) {
      result = result.filter(p => coincideBusqueda([p.ruc, p.razon_social, p.nombre_comercial], searchQueryProv));
    }`;

  content = content.replace(regexProv, newProv);
  return content;
});

// 12. Finanzas/index.tsx y ModalDetalleCaja.tsx
patchFile('src/sections/Finanzas/index.tsx', (content) => {
  if (!content.includes("from '../../utils/busqueda'")) {
    content = "import { coincideBusqueda } from '../../utils/busqueda';\n" + content;
  }
  const regexFin = /const\s+matchDesc\s*=[\s\S]*?const\s+matchProd\s*=\s*m\.productosStr\?\.toLowerCase\(\)\.includes\(st\);/;
  const newFin = `const matchProd = coincideBusqueda([m.descripcion, m.cliente_nombre, m.productosStr], st);`;
  content = content.replace(regexFin, newFin);
  return content;
});

patchFile('src/sections/Finanzas/components/ModalDetalleCaja.tsx', (content) => {
  if (!content.includes("from '../../../utils/busqueda'")) {
    content = "import { coincideBusqueda } from '../../../utils/busqueda';\n" + content;
  }
  const regexFinModal = /const\s+matchDesc\s*=[\s\S]*?const\s+matchProd\s*=\s*m\.productosStr\?\.toLowerCase\(\)\.includes\(st\);/;
  const newFinModal = `const matchProd = coincideBusqueda([m.descripcion, m.cliente_nombre, m.productosStr], st);`;
  content = content.replace(regexFinModal, newFinModal);
  return content;
});

console.log('--- TODOS LOS BUSCADORES DE EVICAMP PROCESADOS ---');
