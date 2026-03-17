import logging
import re
import sqlite3
from contextlib import contextmanager

logger = logging.getLogger(__name__)


class WarehouseError(Exception):
    pass


class SQLInjectionError(WarehouseError):
    pass


INJECTION_PATTERNS = [
    r";\s*(DROP|DELETE|INSERT|UPDATE|ALTER)\s",
    r"--\s",
    r"'\s*(OR|AND)\s+'",
    r"UNION\s+SELECT",
    r"\/\*.*\*\/",
]


def _check_sql_injection(value):
    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, str(value), re.IGNORECASE):
            raise SQLInjectionError(f"SQL injection detected: {value}")


class MockDataWarehouse:
    def __init__(self, db_path=":memory:"):
        self._conn = sqlite3.connect(db_path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._row_security_policies = {}
        self._tables = set()

    def reset(self):
        cursor = self._conn.cursor()
        for table in list(self._tables):
            cursor.execute(f"DROP TABLE IF EXISTS [{table}]")
        self._conn.commit()
        self._tables.clear()
        self._row_security_policies.clear()

    @contextmanager
    def _cursor(self):
        cursor = self._conn.cursor()
        try:
            yield cursor
            self._conn.commit()
        except Exception:
            self._conn.rollback()
            raise

    def create_table(self, table_name, columns):
        logger.info(f"Creating table: {table_name}")
        _check_sql_injection(table_name)
        col_defs = ", ".join(f"[{c['name']}] {c['type']}" for c in columns)
        with self._cursor() as cur:
            cur.execute(f"CREATE TABLE IF NOT EXISTS [{table_name}] ({col_defs})")
        self._tables.add(table_name)
        return True

    def insert(self, table_name, data):
        _check_sql_injection(table_name)
        if not data:
            return 0
        cols = list(data[0].keys())
        placeholders = ", ".join(["?"] * len(cols))
        col_names = ", ".join(f"[{c}]" for c in cols)
        with self._cursor() as cur:
            for row in data:
                values = [row[c] for c in cols]
                cur.execute(f"INSERT INTO [{table_name}] ({col_names}) VALUES ({placeholders})", values)
        return len(data)

    def query(self, sql, params=None, user_id=None, tenant=None):
        _check_sql_injection(sql)
        if params:
            for p in params:
                _check_sql_injection(str(p))
        with self._cursor() as cur:
            cur.execute(sql, params or [])
            rows = [dict(r) for r in cur.fetchall()]
        if user_id and tenant:
            rows = self._apply_row_security(rows, user_id, tenant)
        return rows

    def execute_safe(self, table_name, filters=None, columns=None, user_id=None, tenant=None):
        _check_sql_injection(table_name)
        cols = ", ".join(f"[{c}]" for c in columns) if columns else "*"
        sql = f"SELECT {cols} FROM [{table_name}]"
        params = []
        if filters:
            conditions = []
            for k, v in filters.items():
                _check_sql_injection(k)
                conditions.append(f"[{k}] = ?")
                params.append(v)
            sql += " WHERE " + " AND ".join(conditions)
        return self.query(sql, params, user_id=user_id, tenant=tenant)

    def set_row_security_policy(self, table_name, policy_fn):
        self._row_security_policies[table_name] = policy_fn

    def _apply_row_security(self, rows, user_id, tenant):
        filtered = []
        for row in rows:
            row_tenant = row.get("tenant_id") or row.get("tenant")
            if row_tenant and row_tenant != tenant:
                continue
            filtered.append(row)
        return filtered

    def alter_table(self, table_name, add_column=None):
        _check_sql_injection(table_name)
        if add_column:
            _check_sql_injection(add_column["name"])
            with self._cursor() as cur:
                cur.execute(f"ALTER TABLE [{table_name}] ADD COLUMN [{add_column['name']}] {add_column['type']}")
        return True

    def aggregate(self, table_name, group_by, agg_column, agg_func="COUNT", having=None):
        _check_sql_injection(table_name)
        _check_sql_injection(group_by)
        _check_sql_injection(agg_column)
        sql = f"SELECT [{group_by}], {agg_func}([{agg_column}]) as agg_value FROM [{table_name}] GROUP BY [{group_by}]"
        if having:
            sql += f" HAVING agg_value {having}"
        return self.query(sql)

    def join_query(self, table1, table2, join_column, columns=None):
        _check_sql_injection(table1)
        _check_sql_injection(table2)
        _check_sql_injection(join_column)
        cols = ", ".join(f"t1.[{c}]" for c in columns) if columns else "t1.*, t2.*"
        sql = f"SELECT {cols} FROM [{table1}] t1 INNER JOIN [{table2}] t2 ON t1.[{join_column}] = t2.[{join_column}]"
        return self.query(sql)

    def table_exists(self, table_name):
        with self._cursor() as cur:
            cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", [table_name])
            return cur.fetchone() is not None

    def get_row_count(self, table_name):
        rows = self.query(f"SELECT COUNT(*) as cnt FROM [{table_name}]")
        return rows[0]["cnt"] if rows else 0
