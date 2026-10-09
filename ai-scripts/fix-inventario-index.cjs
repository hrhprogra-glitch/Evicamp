const fs = require('fs');
let indexCode = fs.readFileSync('src/sections/Inventario/index.tsx', 'utf-8');

// 1. Remove LOTES logic from index.tsx
const batchesDataRegex = /,\r?\n?\s*\{ data: batchesData, error: batchesError \}/;
indexCode = indexCode.replace(batchesDataRegex, '');
const batchesFetchRegex = /,\r?\n?\s*traerTodo\(\(\) => supabase\.from\('batches'\)\.select\('id, product_id, quantity, cost_unit'\)\.order\('id'\)\)/;
indexCode = indexCode.replace(batchesFetchRegex, '');

const checkBatchesErrorRegex = /\s*if \(batchesError\) throw batchesError;/;
indexCode = indexCode.replace(checkBatchesErrorRegex, '');

// Simplify mapping
const mappingRegex = /\/\/ \[ SUMA GLOBAL \]: Filtramos los lotes[\s\S]*?cost: loteMasReciente \? Number\(loteMasReciente\.cost_unit\) : \(Number\(p\.cost_price\) \|\| 0\),\r?\n?\s*quantity: stockRealGlobal,/g;

const mappingReplace = `
              return {
                id: p.id,
                name: p.name || 'SIN NOMBRE',
                price: Number(p.price) || 0,
                cost: Number(p.cost_price) || 0,
                quantity: Number(p.quantity) || 0,
`;
indexCode = indexCode.replace(mappingRegex, mappingReplace);

// Remove the `vistaActiva` switch and render only `TablaProductos`
const renderRegex = /\{vistaActiva === 'PRODUCTOS' \? \([\s\S]*?\) : \([\s\S]*?TablaLotes[\s\S]*?\)\}/;
const renderReplace = `
            <TablaProductos 
              loading={loading} 
              productos={paginatedProducts} 
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              onEditProduct={(p) => {
                setProductToEdit(p);
                setIsModalOpen(true);
              }}
              onDeleteProduct={async (productToDelete) => {
                if (!window.confirm(\`¿Estás seguro de eliminar el producto "\${productToDelete.name}"?\`)) return;
                try {
                  const { error } = await supabase.rpc('delete_product_completely', { p_id: productToDelete.id });
                  if (error) throw error;
                  setProducts(prevProducts => prevProducts.filter(p => p.id !== productToDelete.id));
                } catch (error) {
                  console.error('Error al eliminar producto:', error);
                  alert('Hubo un error al eliminar el producto.');
                }
              }}
              onViewHistory={() => {}}
            />
`;

if (renderRegex.test(indexCode)) {
  indexCode = indexCode.replace(renderRegex, renderReplace);
}

fs.writeFileSync('src/sections/Inventario/index.tsx', indexCode);
console.log("Inventario index.tsx simplified!");
