const fs = require('fs');

let indexCode = fs.readFileSync('src/sections/Inventario/index.tsx', 'utf-8');

const regex = /<ModalProducto\s+isOpen=\{isModalOpen\}\s+initialData=\{productToEdit\}\s+productosExistentes=\{products\}/;

const replaceWith = `<ModalProducto 
        isOpen={isModalOpen} 
        initialData={productToEdit}
        productosExistentes={products}
        onGoToLotes={() => {
          setIsModalOpen(false);
          setProductToEdit(null);
          setVistaActiva('LOTES');
        }}`;

if (regex.test(indexCode)) {
  indexCode = indexCode.replace(regex, replaceWith);
  fs.writeFileSync('src/sections/Inventario/index.tsx', indexCode);
  console.log("Added onGoToLotes to ModalProducto!");
} else {
  console.log("Could not find ModalProducto props to replace.");
}
