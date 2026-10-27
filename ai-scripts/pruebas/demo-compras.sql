-- Datos DEMO de la fase 2.4 en siumax (base de pruebas siuhub), categoría "DEMO COMPRAS". Se quedan para que el
-- usuario los vea. Las ventas descuentan el stock (trigger), por eso el stock inicial = lo que queda + lo vendido.
BEGIN;
INSERT INTO providers (id, ruc, razon_social, estado) VALUES
  ('d0000000-0000-4000-8000-000000000024', '20999999241', 'PROVEEDOR DEMO COMPRAS', 'ACTIVO'),
  ('d0000000-0000-4000-8000-000000000025', '20999999252', 'PROVEEDOR DEMO SIN LOTES', 'ACTIVO')
ON CONFLICT (id) DO NOTHING;

WITH d(n, nombre, queda, vendido, costo, precio, prov) AS (VALUES
  (1, 'DEMO ARROZ 1KG', 8, 60, 3.5, 4.5, true),        -- se vende 2/día: para 15 días pedir 22
  (2, 'DEMO FIDEO 500G', 2, 45, 2.0, 3.0, true),       -- 1.5/día: pedir 21
  (3, 'DEMO GASEOSA 1.5L', 50, 30, 4.0, 6.0, true),    -- 1/día y hay 50: no hace falta pedir
  (4, 'DEMO SHAMPOO 400ML', 24, 0, 9.0, 14.0, false),  -- sin ventas en 30 días: S/ 216 parados
  (5, 'DEMO PILAS AA X4', 40, 0, 5.0, 8.0, false)      -- sin ventas en 30 días: S/ 200 parados
)
INSERT INTO products (id, name, category, code, price, cost_price, quantity, min_stock, unit, is_active, is_synced)
SELECT 920000 + n, nombre, 'DEMO COMPRAS', 'DEMO-CMP-' || n, precio, costo, queda + vendido, 3, 'UND', 1, 1 FROM d
ON CONFLICT (id) DO NOTHING;

INSERT INTO batches (id, product_id, quantity, initial_quantity, cost_total, cost_unit, document_ref, supplier, provider_id, is_active, is_synced, created_at)
SELECT 920100 + n, 920000 + n, queda + vendido, queda + vendido, (queda + vendido) * costo, costo, 'DEMO-CMP-F' || n,
       CASE WHEN prov THEN 'PROVEEDOR DEMO COMPRAS' END, CASE WHEN prov THEN 'd0000000-0000-4000-8000-000000000024'::uuid END, 1, 1, now() - interval '40 day'
FROM (VALUES (1, 8, 60, 3.5, true), (2, 2, 45, 2.0, true), (3, 50, 30, 4.0, true), (4, 24, 0, 9.0, false), (5, 40, 0, 5.0, false)) AS x(n, queda, vendido, costo, prov)
ON CONFLICT (id) DO NOTHING;

-- Ventas de hace 5 días (dentro de los 30) y una del shampoo de hace 40 días (fuera de los 30)
INSERT INTO sales (id, total, payment_type, amount_cash, amount_yape, amount_card, amount_credit, sunat_status, created_at, is_synced)
VALUES (920201, 0, 'EFECTIVO', 0, 0, 0, 0, 'ACEPTADO', now() - interval '5 day', 1),
       (920202, 14, 'EFECTIVO', 14, 0, 0, 0, 'ACEPTADO', now() - interval '40 day', 1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO sale_details (id, sale_id, product_id, product_name, quantity, price_at_moment, subtotal, is_synced)
VALUES (920301, 920201, 920001, 'DEMO ARROZ 1KG', 60, 4.5, 270, 1),
       (920302, 920201, 920002, 'DEMO FIDEO 500G', 45, 3.0, 135, 1),
       (920303, 920201, 920003, 'DEMO GASEOSA 1.5L', 30, 6.0, 180, 1)
ON CONFLICT (id) DO NOTHING;
-- El shampoo: la venta vieja no descuenta (para que queden 24 justos se suma 1 antes)
UPDATE products SET quantity = quantity + 1 WHERE id = 920004 AND NOT EXISTS (SELECT 1 FROM sale_details WHERE id = 920304);
UPDATE batches SET quantity = quantity + 1, initial_quantity = initial_quantity + 1 WHERE id = 920104 AND NOT EXISTS (SELECT 1 FROM sale_details WHERE id = 920304);
INSERT INTO sale_details (id, sale_id, product_id, product_name, quantity, price_at_moment, subtotal, is_synced)
VALUES (920304, 920202, 920004, 'DEMO SHAMPOO 400ML', 1, 14, 14, 1)
ON CONFLICT (id) DO NOTHING;
UPDATE sales SET total = 585, amount_cash = 585 WHERE id = 920201;

SELECT p.name, p.quantity, v.vendido, v.ultima_venta::date
FROM products p LEFT JOIN fn_ventas_por_producto(30) v ON v.product_id = p.id WHERE p.category = 'DEMO COMPRAS' ORDER BY p.id;
COMMIT;
