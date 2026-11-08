import pytest

pytestmark = pytest.mark.procedures


def test_sp_receive_stock_new_sku(cur):
    cur.execute("CALL sp_receive_stock(%s, %s, %s)", ("NEW-SKU", 1, 100))
    cur.execute("SELECT qty FROM inventory WHERE sku='NEW-SKU' AND warehouse_id=1")
    assert cur.fetchone()[0] == 100
    cur.execute(
        "SELECT qty FROM stock_movements WHERE sku='NEW-SKU' AND movement_type='inbound'"
    )
    assert cur.fetchone()[0] == 100


def test_sp_receive_stock_existing_sku_accumulates(cur):
    cur.execute("SELECT qty FROM inventory WHERE sku='ANC-X1' AND warehouse_id=1")
    before = cur.fetchone()[0]
    cur.execute("CALL sp_receive_stock(%s, %s, %s)", ("ANC-X1", 1, 50))
    cur.execute("SELECT qty FROM inventory WHERE sku='ANC-X1' AND warehouse_id=1")
    assert cur.fetchone()[0] == before + 50


def test_sp_fulfill_order_deducts_inventory(cur):
    cur.execute("SELECT qty FROM inventory WHERE sku='ANC-X1' AND warehouse_id=1")
    before = cur.fetchone()[0]
    cur.execute("CALL sp_fulfill_order(%s, %s, %s, %s)", (1, "ANC-X1", 1, 10))
    cur.execute("SELECT qty FROM inventory WHERE sku='ANC-X1' AND warehouse_id=1")
    assert cur.fetchone()[0] == before - 10


def test_sp_fulfill_order_writes_movement(cur):
    cur.execute("CALL sp_fulfill_order(%s, %s, %s, %s)", (1, "ANC-X1", 1, 5))
    cur.execute("""
        SELECT qty FROM stock_movements
        WHERE sku='ANC-X1' AND order_id=1 AND movement_type='outbound'
        ORDER BY id DESC LIMIT 1
        """)
    assert cur.fetchone()[0] == 5


def test_fn_check_stock_returns_qty(cur):
    cur.execute("SELECT fn_check_stock(%s, %s)", ("ANC-X1", 1))
    assert cur.fetchone()[0] == 200


def test_fn_check_stock_unknown_sku_returns_zero(cur):
    cur.execute("SELECT fn_check_stock(%s, %s)", ("NO-SKU", 1))
    assert cur.fetchone()[0] == 0
