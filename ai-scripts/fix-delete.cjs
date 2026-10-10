const fs = require('fs');
let content = fs.readFileSync('src/sections/Finanzas/index.tsx', 'utf-8');

const targetRegex = /    \/\/ Los abonos de fiado los crea la base de datos: borrarlos aquí dejaría la deuda y la caja descuadradas\.\r?\n    const mov = movimientos\.find\(m => String\(m\.id\) === String\(idMov\)\);\r?\n    if \(mov && String\(mov\.flujo\) === 'INGRESO_FIADO'\) \{\r?\n      alert\('Este ingreso es un abono de crédito\. Anúlalo desde Créditos\.'\);\r?\n      return;\r?\n    \}/;

const replacement = `    const mov = movimientos.find(m => String(m.id) === String(idMov));
    if (mov && (String(mov.flujo) === 'INGRESO_FIADO' || (mov.descripcion && mov.descripcion.includes('ABONO DE FIADO')))) {
      if (!window.confirm('⚠️ ¿Seguro que deseas ANULAR este pago de fiado? La deuda regresará al cliente y el dinero se descontará de la caja.')) return;
      
      const { data: pagos } = await supabase
        .from('debt_payments')
        .select('id')
        .eq('amount', mov.monto)
        .eq('created_at', mov.created_at);
        
      if (pagos && pagos.length > 0) {
        await supabase.from('debt_payments').delete().eq('id', pagos[0].id);
      }
      
      const { error } = await supabase.from('cash_movements').delete().eq('id', idMov);
      if (error) {
        alert('Error al eliminar: ' + error.message);
      } else {
        cargarDatosCaja(true);
      }
      return;
    }`;

content = content.replace(targetRegex, replacement);
fs.writeFileSync('src/sections/Finanzas/index.tsx', content);
