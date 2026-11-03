import pytest
import psycopg

pytestmark = pytest.mark.transactions


def test_fulfill_order_rolls_back_on_insufficient_stock(db_conn):
    with db_conn.cursor() as cur:
        cur.execute("SELECT qty FROM inventory WHERE sku='ANC-X1' AND warehouse_id=1")
        qty_before = cur.fetchone()[0]

    with pytest.raises(Exception, match="Insufficient stock"):
        with db_conn.cursor() as cur:
            cur.execute(
                "CALL sp_fulfill_order(%s, %s, %s, %s)", (1, "ANC-X1", 1, 99999)
            )

    db_conn.rollback()

    with db_conn.cursor() as cur:
        cur.execute("SELECT qty FROM inventory WHERE sku='ANC-X1' AND warehouse_id=1")
        assert cur.fetchone()[0] == qty_before


def test_receive_stock_is_atomic(db_conn):
    with db_conn.cursor() as cur:
        cur.execute("SELECT qty FROM inventory WHERE sku='ANC-X1' AND warehouse_id=1")
        before = cur.fetchone()[0]
        cur.execute("CALL sp_receive_stock(%s, %s, %s)", ("ANC-X1", 1, 25))
        cur.execute("SELECT qty FROM inventory WHERE sku='ANC-X1' AND warehouse_id=1")
        assert cur.fetchone()[0] == before + 25
        cur.execute(
            "SELECT qty FROM stock_movements WHERE sku='ANC-X1' AND movement_type='inbound' ORDER BY id DESC LIMIT 1"
        )
        assert cur.fetchone()[0] == 25
    db_conn.rollback()


def test_constraint_violation_does_not_corrupt_state(db_conn):
    with db_conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM inventory")
        count_before = cur.fetchone()[0]

    with pytest.raises(psycopg.errors.CheckViolation):
        with db_conn.cursor() as cur:
            cur.execute(
                "INSERT INTO inventory (sku, warehouse_id, qty) VALUES (%s,%s,%s)",
                ("BAD-SKU", 1, -5),
            )

    db_conn.rollback()

    with db_conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM inventory")
        assert cur.fetchone()[0] == count_before
