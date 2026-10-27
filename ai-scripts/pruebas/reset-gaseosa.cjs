// Deja la DEMO GASEOSA (siumax/siuhub) como en demo-compras.sql: 50 en stock y solo la venta demo de 30 en los últimos 30 días
// (las pruebas de la fase 1 la venden y eso cambia lo que "Sugerir pedido" debe sugerir).
const path = require('path'); const P = process.argv[2];
const { NodeSSH } = require(path.join(P, 'node_modules/node-ssh')); const { conexionVps } = require(path.join(P, 'ai-scripts/vps.cjs'));
(async () => { const s = new NodeSSH(); await s.connect(conexionVps);
 const q = `BEGIN;
 UPDATE sale_details SET product_id = NULL WHERE product_id = 920003 AND sale_id <> 920201 AND sale_id IN (SELECT id FROM sales WHERE created_at > now() - interval '31 day');
 UPDATE products SET quantity = 50 WHERE id = 920003; UPDATE batches SET quantity = 50 WHERE id = 920103;
 COMMIT; SELECT quantity FROM products WHERE id = 920003;`;
 const r = await s.execCommand('runuser -u postgres -- psql -At -d siuhub', { stdin: q }); console.log(r.stdout, r.stderr); s.dispose(); })();
