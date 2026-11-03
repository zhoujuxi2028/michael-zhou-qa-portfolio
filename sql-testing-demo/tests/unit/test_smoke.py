def test_db_connection(cur):
    cur.execute("SELECT 1")
    assert cur.fetchone()[0] == 1


def test_seed_data_loaded(cur):
    cur.execute("SELECT COUNT(*) FROM warehouses")
    assert cur.fetchone()[0] == 3


def test_procedures_loaded(cur):
    cur.execute(
        "SELECT COUNT(*) FROM pg_proc WHERE proname IN ('sp_receive_stock','sp_fulfill_order','fn_check_stock')"
    )
    assert cur.fetchone()[0] == 3
