-- FastWare WMS PL/pgSQL stored procedures

-- sp_receive_stock: inbound receipt — UPSERT inventory + log movement
CREATE OR REPLACE PROCEDURE sp_receive_stock(
    p_sku          TEXT,
    p_warehouse_id INT,
    p_qty          INT
)
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO inventory (sku, warehouse_id, qty, safety_stock)
        VALUES (p_sku, p_warehouse_id, p_qty, 10)
    ON CONFLICT (sku, warehouse_id)
        DO UPDATE SET qty = inventory.qty + EXCLUDED.qty;

    INSERT INTO stock_movements (sku, movement_type, qty)
        VALUES (p_sku, 'inbound', p_qty);
END;
$$;

-- sp_fulfill_order: outbound — check stock, deduct, log movement, update order
CREATE OR REPLACE PROCEDURE sp_fulfill_order(
    p_order_id     INT,
    p_sku          TEXT,
    p_warehouse_id INT,
    p_qty          INT
)
LANGUAGE plpgsql AS $$
DECLARE
    v_current_qty INT;
BEGIN
    SELECT qty INTO v_current_qty
    FROM inventory
    WHERE sku = p_sku AND warehouse_id = p_warehouse_id
    FOR UPDATE;

    IF v_current_qty IS NULL OR v_current_qty < p_qty THEN
        RAISE EXCEPTION 'Insufficient stock for SKU %: available %, requested %',
            p_sku, COALESCE(v_current_qty, 0), p_qty;
    END IF;

    UPDATE inventory SET qty = qty - p_qty
    WHERE sku = p_sku AND warehouse_id = p_warehouse_id;

    INSERT INTO stock_movements (sku, order_id, movement_type, qty)
        VALUES (p_sku, p_order_id, 'outbound', p_qty);

    UPDATE orders SET status = 'fulfilled' WHERE id = p_order_id;
END;
$$;

-- fn_check_stock: returns current qty for a SKU/warehouse (0 if not found)
CREATE OR REPLACE FUNCTION fn_check_stock(
    p_sku          TEXT,
    p_warehouse_id INT
) RETURNS INT
LANGUAGE plpgsql AS $$
DECLARE v_qty INT;
BEGIN
    SELECT qty INTO v_qty
    FROM inventory
    WHERE sku = p_sku AND warehouse_id = p_warehouse_id;
    RETURN COALESCE(v_qty, 0);
END;
$$;
