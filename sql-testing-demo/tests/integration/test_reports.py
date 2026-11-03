import pytest

pytestmark = pytest.mark.reports


def test_total_stock_value_per_zone(cur):
    cur.execute("""
        SELECT w.zone, SUM(i.qty) AS total_qty, COUNT(i.sku) AS sku_count
        FROM inventory i
        JOIN warehouses w ON w.id = i.warehouse_id
        GROUP BY w.zone
        ORDER BY w.zone
        """)
    rows = {r[0]: (r[1], r[2]) for r in cur.fetchall()}
    assert rows["A"][0] == 230  # ANC-X1(200) + USB-HUB(30)
    assert rows["B"][0] == 105  # KBD-MX(100) + MSE-PRO(5)
    assert rows["C"][0] == 50  # MON-27(50)


def test_reorder_report_lists_all_low_stock(cur):
    cur.execute("""
        SELECT i.sku, i.qty, i.safety_stock, w.zone
        FROM inventory i
        JOIN warehouses w ON w.id = i.warehouse_id
        WHERE i.qty < i.safety_stock
        ORDER BY i.sku
        """)
    rows = cur.fetchall()
    skus = [r[0] for r in rows]
    assert "MSE-PRO" in skus
    assert "USB-HUB" in skus
    assert "ANC-X1" not in skus


def test_movement_summary_by_type(cur):
    cur.execute("""
        SELECT movement_type, COUNT(*) AS cnt, SUM(qty) AS total_qty
        FROM stock_movements
        GROUP BY movement_type
        ORDER BY movement_type
        """)
    rows = {r[0]: (r[1], r[2]) for r in cur.fetchall()}
    assert "inbound" in rows
    assert "outbound" in rows
    assert rows["inbound"][1] > 0
    assert rows["outbound"][1] > 0


def test_top_sku_by_qty_rank(cur):
    cur.execute("""
        SELECT sku, qty, RANK() OVER (ORDER BY qty DESC) AS rnk
        FROM inventory
        ORDER BY rnk
        LIMIT 3
        """)
    rows = cur.fetchall()
    assert rows[0][0] == "ANC-X1"
    assert rows[0][2] == 1
