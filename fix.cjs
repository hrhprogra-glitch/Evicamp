const fs = require('fs');
let code = fs.readFileSync('src/sections/Fiados/components/ModalClientes.tsx', 'utf-8');

code = code.replace(
  '        <span>S/ {Number(det.subtotal).toFixed(2)}</span>\n      </div>\n    )) : (\n      <p className="text-xs text-[var(--color-subtle)] italic">No hay productos registrados.</p>\n    )}\n  </div>\n</div>',
  '        <span>S/ {Number(det.subtotal).toFixed(2)}</span>\n      </div>\n    )) : (\n      <p className="text-xs text-[var(--color-subtle)] italic">No hay productos registrados.</p>\n    )}\n  </div>\n</div>\n</div>\n</div>'
);

fs.writeFileSync('src/sections/Fiados/components/ModalClientes.tsx', code);
