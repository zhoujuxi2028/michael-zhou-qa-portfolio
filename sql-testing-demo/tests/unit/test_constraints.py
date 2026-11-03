import pytest
import psycopg

pytestmark = pytest.mark.constraints


def test_fk_violation_invalid_warehouse(cur):
    with pytest.raises(psycopg.errors.ForeignKeyViolation):
        cur.execute(
            "INSERT INTO inventory (sku, warehouse_id, qty) VALUES (%s,%s,%s)",
            ("SKU-X", 9999, 10),
        )


def test_not_null_violation_on_sku(cur):
    with pytest.raises(psycopg.errors.NotNullViolation):
        cur.execute(
            "INSERT INTO inventory (sku, warehouse_id, qty) VALUES (NULL, 1, 10)"
        )


def test_unique_violation_duplicate_sku_warehouse(cur):
    with pytest.raises(psycopg.errors.UniqueViolation):
        cur.execute(
            "INSERT INTO inventory (sku, warehouse_id, qty) VALUES (%s,%s,%s)",
            ("ANC-X1", 1, 10),
        )


def test_check_violation_negative_qty(cur):
    with pytest.raises(psycopg.errors.CheckViolation):
        cur.execute(
            "INSERT INTO inventory (sku, warehouse_id, qty) VALUES (%s,%s,%s)",
            ("NEW-SKU", 1, -1),
        )
