const fs = require('fs');

// 1. Modificar ModalProducto.tsx
let modalCode = fs.readFileSync('src/sections/Inventario/components/ModalProducto.tsx', 'utf-8');

// Añadir quantity y cost a formData
modalCode = modalCode.replace(
  /setFormData\(\{ name: '', category: '', code: '', barcode: '', price: '', minStock: '5', weightUnit: 'KG', image: '' \}\);/g,
  "setFormData({ name: '', category: '', code: '', barcode: '', price: '', cost: '', quantity: '', minStock: '5', weightUnit: 'KG', image: '' });"
);

modalCode = modalCode.replace(
  /price: '',\r?\n?\s*minStock: '5',/g,
  "price: '',\n      cost: '',\n      quantity: '',\n      minStock: '5',"
);

modalCode = modalCode.replace(
  /price: initialData\.price\?\.toString\(\) \|\| '',\r?\n?\s*minStock: initialData\.minStock\?\.toString\(\) \|\| '5',/g,
  "price: initialData.price?.toString() || '',\n            cost: initialData.cost?.toString() || initialData.cost_price?.toString() || '',\n            quantity: initialData.quantity?.toString() || '',\n            minStock: initialData.minStock?.toString() || '5',"
);

// Añadir campos en el update y insert
modalCode = modalCode.replace(
  /price: precioFinal,\r?\n?\s*min_stock: Number\(formData\.minStock\) \|\| 5,/g,
  "price: precioFinal,\n            cost_price: Number(formData.cost) || 0,\n            quantity: Number(formData.quantity) || 0,\n            min_stock: Number(formData.minStock) || 5,"
);

modalCode = modalCode.replace(
  /price: Number\(formData\.price\) \|\| 0,\r?\n?\s*quantity: 0,/g,
  "price: Number(formData.price) || 0,\n            cost_price: Number(formData.cost) || 0,\n            quantity: Number(formData.quantity) || 0,"
);

// Quitar los botones que mandan a "LOTES"
const loteBtnsRegex = /\{nature !== 'CONSUMO' && !initialData && \([\s\S]*?Guardar y Agregar Lote[\s\S]*?<\/button>\r?\n?\s*\)\}/;
modalCode = modalCode.replace(loteBtnsRegex, '');

// Añadir los inputs de costo y cantidad en la vista (despues del precio)
const priceInputRegex = /(<div className="space-y-2">\r?\n?\s*<label className="text-\[12px\] font-black text-\[var\(--color-ink\)\] uppercase tracking-widest">Precio de Venta Sugerido<\/label>[\s\S]*?<\/div>)/;
const inputAdd = `$1\n
                {nature !== 'CONSUMO' && (
                  <>
                  <div className="space-y-2">
                    <label className="text-[12px] font-black text-[var(--color-ink)] uppercase tracking-widest">Costo de Compra</label>
                    <input autoComplete="off" type="number" placeholder="0.00" value={formData.cost} onChange={(e) => setFormData({...formData, cost: e.target.value})} disabled={!!initialData && !puedeCambiarPrecio} className="w-full bg-white disabled:bg-[var(--color-bg-2)] disabled:text-[var(--color-subtle)] disabled:cursor-not-allowed border-2 border-[var(--color-border)] p-3 text-xs font-black text-[var(--color-ink)] uppercase outline-none focus:border-[var(--color-accent)] transition-colors" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[12px] font-black text-[var(--color-ink)] uppercase tracking-widest">Stock {initialData ? 'Actual' : 'Inicial'}</label>
                    <input autoComplete="off" type="number" placeholder="0" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: e.target.value})} className="w-full bg-white border-2 border-[var(--color-border)] p-3 text-xs font-black text-[var(--color-ink)] uppercase outline-none focus:border-[var(--color-accent)] transition-colors" />
                  </div>
                  </>
                )}
`;
modalCode = modalCode.replace(priceInputRegex, inputAdd);

fs.writeFileSync('src/sections/Inventario/components/ModalProducto.tsx', modalCode);
console.log("ModalProducto modified!");

// 2. Remove Compras from SideBar.tsx
let sidebarCode = fs.readFileSync('src/layout/SideBar.tsx', 'utf-8');
sidebarCode = sidebarCode.replace(/\r?\n?\s*\{ id: 'proveedores', name: 'Compras', icon: Truck \},/g, '');
fs.writeFileSync('src/layout/SideBar.tsx', sidebarCode);
console.log("SideBar modified!");

