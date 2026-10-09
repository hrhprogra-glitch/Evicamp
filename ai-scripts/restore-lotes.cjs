const fs = require('fs');

let indexCode = fs.readFileSync('src/sections/Inventario/index.tsx', 'utf-8');

// 1. Import TablaLotes
const importTablaLotes = `import { TablaLotes } from './components/TablaLotes';\nimport { ModalLote } from './components/ModalLote';\n`;
if (!indexCode.includes('TablaLotes')) {
  indexCode = indexCode.replace(/import \{ TablaProductos \} from '\.\/components\/TablaProductos';/, `import { TablaProductos } from './components/TablaProductos';\n${importTablaLotes}`);
}

// 2. We need to add the toggle switch in the UI.
// Currently it renders:
// <div className={`flex-1 min-h-0 flex flex-col`}>
//   <TablaProductos ... />
// </div>

const renderRegex = /<div className=\{`flex-1 min-h-0 flex flex-col`\}>\s*\{\/\* PASAMOS LOS DATOS PAGINADOS A LA TABLA \*\/\}\s*<TablaProductos[\s\S]*?onViewHistory=\{[\s\S]*?\}\s*\/>/m;

const renderReplace = `<div className="flex gap-4 border-b-2 border-[var(--color-ink)] pb-2 mb-4">
              <button 
                onClick={() => setVistaActiva('PRODUCTOS')}
                className={\`px-6 py-2 font-black text-xs uppercase tracking-widest border-2 \${vistaActiva === 'PRODUCTOS' ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-accent)] shadow-[4px_4px_0_0_var(--color-accent)]' : 'border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-muted)] hover:border-[var(--color-ink)] hover:text-[var(--color-ink)]'} transition-all\`}
              >
                PRODUCTOS
              </button>
              <button 
                onClick={() => setVistaActiva('LOTES')}
                className={\`px-6 py-2 font-black text-xs uppercase tracking-widest border-2 \${vistaActiva === 'LOTES' ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-accent)] shadow-[4px_4px_0_0_var(--color-accent)]' : 'border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-muted)] hover:border-[var(--color-ink)] hover:text-[var(--color-ink)]'} transition-all\`}
              >
                COMPRAS Y LOTES
              </button>
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
              {vistaActiva === 'PRODUCTOS' ? (
                <TablaProductos 
                  loading={loading} 
                  productos={paginatedProducts} 
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  onUpdateProduct={async (updatedProduct) => {
                    const { error } = await supabase.from('products').update({
                      price: updatedProduct.price,
                      cost_price: updatedProduct.cost,
                      quantity: updatedProduct.quantity,
                      min_stock: updatedProduct.minStock
                    }).eq('id', updatedProduct.id);
                    if (!error) {
                      setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
                    }
                  }}
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
                      setRefreshLotesKey(prev => prev + 1);
                    } catch (error) {
                      console.error('Error al eliminar producto:', error);
                      alert('Hubo un error al eliminar el producto.');
                    }
                  }}
                  onViewHistory={() => { setVistaActiva('LOTES'); }}
                />
              ) : (
                <TablaLotes refreshKey={refreshLotesKey} products={products} onProductsUpdated={() => {
                  setLoading(true);
                  // Refresh will happen via useEffect ideally, but we can trigger a soft reload here
                  window.dispatchEvent(new CustomEvent('inventory-changed'));
                }} />
              )}`;

if (renderRegex.test(indexCode)) {
  indexCode = indexCode.replace(renderRegex, renderReplace);
}

// 3. Ensure 'supabase' is imported if we use it in onUpdateProduct inline. (It should be imported in index.tsx)
fs.writeFileSync('src/sections/Inventario/index.tsx', indexCode);
console.log("Inventario index.tsx restored with LOTES toggle!");
