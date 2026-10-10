const fs = require('fs');
let c = fs.readFileSync('src/sections/Finanzas/components/ModalDetalleCaja.tsx', 'utf-8');
c = c.replace(
  /<\/div>\r?\n\s*<\/div>\r?\n\s*\);\r?\n\};/,
  `      </div>
    </div>
    {ticketSeleccionado && (
      <ModalDetalleTicket
        ticketId={ticketSeleccionado}
        onClose={() => setTicketSeleccionado(null)}
      />
    )}
    </>
  );
};`
);
fs.writeFileSync('src/sections/Finanzas/components/ModalDetalleCaja.tsx', c);
