import time

import pytest

pytestmark = pytest.mark.performance


def test_inventory_lookup_under_10ms(cur):
    start = time.perf_counter()
    cur.execute(
        "SELECT qty FROM inventory WHERE sku=%s AND warehouse_id=%s",
        ("ANC-X1", 1),
    )
    cur.fetchone()
    elapsed_ms = (time.perf_counter() - start) * 1000
    assert elapsed_ms < 10, f"Lookup took {elapsed_ms:.1f}ms (limit 10ms)"


def test_reorder_alert_query_under_50ms(cur):
    start = time.perf_counter()
    cur.execute("SELECT sku FROM inventory WHERE qty < safety_stock ORDER BY sku")
    cur.fetchall()
    elapsed_ms = (time.perf_counter() - start) * 1000
    assert elapsed_ms < 50, f"Reorder query took {elapsed_ms:.1f}ms (limit 50ms)"


def test_join_inventory_warehouses_under_20ms(cur):
    start = time.perf_counter()
    cur.execute("""
        SELECT i.sku, w.name, i.qty
        FROM inventory i
        JOIN warehouses w ON w.id = i.warehouse_id
        ORDER BY i.sku
        """)
    cur.fetchall()
    elapsed_ms = (time.perf_counter() - start) * 1000
    assert elapsed_ms < 20, f"Join query took {elapsed_ms:.1f}ms (limit 20ms)"
