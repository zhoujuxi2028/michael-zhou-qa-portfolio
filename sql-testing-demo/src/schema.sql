-- FastWare WMS schema
CREATE TABLE IF NOT EXISTS warehouses (
    id       SERIAL PRIMARY KEY,
    name     TEXT   NOT NULL,
    zone     CHAR(1) NOT NULL CHECK (zone IN ('A','B','C')),
    capacity INT    NOT NULL CHECK (capacity > 0)
);

CREATE TABLE IF NOT EXISTS inventory (
    id           SERIAL PRIMARY KEY,
    sku          TEXT NOT NULL,
    warehouse_id INT  NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    qty          INT  NOT NULL DEFAULT 0 CHECK (qty >= 0),
    safety_stock INT  NOT NULL DEFAULT 10,
    UNIQUE (sku, warehouse_id)
);

CREATE TABLE IF NOT EXISTS orders (
    id         SERIAL PRIMARY KEY,
    client_id  INT  NOT NULL,
    status     TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','fulfilled','cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_movements (
    id            SERIAL PRIMARY KEY,
    sku           TEXT NOT NULL,
    order_id      INT  REFERENCES orders(id),
    movement_type TEXT NOT NULL CHECK (movement_type IN ('inbound','outbound')),
    qty           INT  NOT NULL CHECK (qty > 0),
    moved_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movements_sku      ON stock_movements(sku);
CREATE INDEX IF NOT EXISTS idx_movements_moved_at ON stock_movements(moved_at);
CREATE INDEX IF NOT EXISTS idx_inventory_sku      ON inventory(sku);
