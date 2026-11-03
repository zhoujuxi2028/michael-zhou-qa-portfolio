import pytest

pytestmark = pytest.mark.crud


def test_insert_new_sku(cur):
    cur.execute(
        "INSERT INTO inventory (sku, warehouse_id, qty, safety_stock) VALUES (%s,%s,%s,%s) RETURNING id",
        ("ANC-X2", 1, 50, 10),
    )
    assert cur.fetchone()[0] > 0


def test_select_inventory_by_sku(cur):
    cur.execute(
        "SELECT qty FROM inventory WHERE sku = %s AND warehouse_id = %s",
        ("ANC-X1", 1),
    )
    row = cur.fetchone()
    assert row is not None
    assert row[0] == 200


def test_update_inventory_qty(cur):
    cur.execute(
        "UPDATE inventory SET qty = qty + %s WHERE sku = %s AND warehouse_id = %s",
        (50, "ANC-X1", 1),
    )
    cur.execute(
        "SELECT qty FROM inventory WHERE sku = %s AND warehouse_id = %s",
        ("ANC-X1", 1),
    )
    assert cur.fetchone()[0] == 250


def test_delete_expired_movement(cur):
    cur.execute(
        "INSERT INTO stock_movements (sku, movement_type, qty) VALUES (%s,%s,%s) RETURNING id",
        ("ANC-X1", "inbound", 1),
    )
    mov_id = cur.fetchone()[0]
    cur.execute("DELETE FROM stock_movements WHERE id = %s", (mov_id,))
    cur.execute("SELECT id FROM stock_movements WHERE id = %s", (mov_id,))
    assert cur.fetchone() is None
