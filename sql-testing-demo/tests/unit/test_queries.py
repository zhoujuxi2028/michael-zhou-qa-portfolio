import pytest

pytestmark = pytest.mark.queries


def test_join_inventory_with_warehouse(cur):
    cur.execute(
        """
        SELECT i.sku, w.name, i.qty
        FROM inventory i
        JOIN warehouses w ON w.id = i.warehouse_id
        WHERE i.sku = 'ANC-X1'
        """
    )
    row = cur.fetchone()
    assert row is not None
    assert row[0] == "ANC-X1"
    assert "Zone A" in row[1]


def test_reorder_alert_below_safety_stock(cur):
    cur.execute("SELECT sku FROM inventory WHERE qty < safety_stock ORDER BY sku")
    skus = [r[0] for r in cur.fetchall()]
    assert "MSE-PRO" in skus
    assert "USB-HUB" in skus
    assert "ANC-X1" not in skus  # 200 > 50


def test_total_inventory_qty_per_zone(cur):
    cur.execute(
        """
        SELECT w.zone, SUM(i.qty) AS total_qty
        FROM inventory i
        JOIN warehouses w ON w.id = i.warehouse_id
        GROUP BY w.zone
        ORDER BY w.zone
        """
    )
    rows = {r[0]: r[1] for r in cur.fetchall()}
    assert rows["A"] == 230  # ANC-X1(200) + USB-HUB(30)
    assert rows["B"] == 105  # KBD-MX(100) + MSE-PRO(5)
    assert rows["C"] == 50  # MON-27(50)


def test_window_function_rank_by_qty(cur):
    cur.execute(
        """
        SELECT sku, qty,
               RANK() OVER (ORDER BY qty DESC) AS qty_rank
        FROM inventory
        """
    )
    rows = cur.fetchall()
    assert rows[0][0] == "ANC-X1"
    assert rows[0][2] == 1


def test_subquery_warehouses_with_low_stock(cur):
    cur.execute(
        """
        SELECT DISTINCT w.name
        FROM warehouses w
        WHERE w.id IN (
            SELECT warehouse_id FROM inventory WHERE qty < safety_stock
        )
        ORDER BY w.name
        """
    )
    names = [r[0] for r in cur.fetchall()]
    assert len(names) >= 1
