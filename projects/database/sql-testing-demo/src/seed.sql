-- FastWare WMS seed data
INSERT INTO warehouses (name, zone, capacity) VALUES
    ('FastWare Zone A', 'A', 1000),
    ('FastWare Zone B', 'B',  800),
    ('FastWare Zone C', 'C',  500);

-- ANC-X1: above safety stock; USB-HUB + MSE-PRO: below (reorder alert)
INSERT INTO inventory (sku, warehouse_id, qty, safety_stock) VALUES
    ('ANC-X1',  1, 200, 50),
    ('USB-HUB', 1,  30, 50),
    ('KBD-MX',  2, 100, 20),
    ('MSE-PRO', 2,   5, 20),
    ('MON-27',  3,  50, 10);

INSERT INTO orders (client_id, status) VALUES
    (101, 'pending'),
    (102, 'fulfilled'),
    (103, 'pending');

INSERT INTO stock_movements (sku, order_id, movement_type, qty) VALUES
    ('ANC-X1',  NULL, 'inbound',  200),
    ('USB-HUB', NULL, 'inbound',   30),
    ('KBD-MX',  NULL, 'inbound',  100),
    ('ANC-X1',  2,    'outbound',  10),
    ('KBD-MX',  2,    'outbound',   5);
