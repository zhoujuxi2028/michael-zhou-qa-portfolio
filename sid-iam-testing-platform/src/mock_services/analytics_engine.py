import csv
import io
import json
import logging
from collections import defaultdict
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class AnalyticsError(Exception):
    pass


class AnalyticsEngine:
    def __init__(self, warehouse=None):
        self._warehouse = warehouse
        self._dashboards = {}
        self._permissions = {}

    def reset(self):
        self._dashboards.clear()
        self._permissions.clear()

    def set_warehouse(self, warehouse):
        self._warehouse = warehouse

    def create_dashboard(self, dashboard_id, title, queries):
        self._dashboards[dashboard_id] = {
            "id": dashboard_id,
            "title": title,
            "queries": queries,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        return self._dashboards[dashboard_id]

    def get_dashboard(self, dashboard_id, user_id=None):
        dashboard = self._dashboards.get(dashboard_id)
        if not dashboard:
            raise AnalyticsError(f"Dashboard not found: {dashboard_id}")
        if user_id and not self._check_permission(user_id, dashboard_id):
            raise AnalyticsError(f"Access denied for user {user_id}")
        results = {}
        for name, query in dashboard["queries"].items():
            if self._warehouse:
                results[name] = self._warehouse.query(query)
            else:
                results[name] = []
        return {"dashboard": dashboard, "results": results}

    def aggregate(self, data, group_by, agg_field, agg_func="sum"):
        groups = defaultdict(list)
        for row in data:
            key = row.get(group_by, "unknown")
            groups[key].append(row.get(agg_field, 0))
        result = []
        for key, values in groups.items():
            if agg_func == "sum":
                agg_value = sum(values)
            elif agg_func == "avg":
                agg_value = sum(values) / len(values) if values else 0
            elif agg_func == "count":
                agg_value = len(values)
            elif agg_func == "min":
                agg_value = min(values) if values else 0
            elif agg_func == "max":
                agg_value = max(values) if values else 0
            else:
                raise AnalyticsError(f"Unknown aggregation function: {agg_func}")
            result.append({group_by: key, f"{agg_func}_{agg_field}": agg_value})
        return result

    def export_csv(self, data):
        if not data:
            return ""
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=data[0].keys())
        writer.writeheader()
        writer.writerows(data)
        return output.getvalue()

    def export_json(self, data):
        return json.dumps(data, default=str)

    def time_series_aggregate(self, data, time_field, value_field, interval="day"):
        buckets = defaultdict(list)
        for row in data:
            ts = row.get(time_field, "")
            if isinstance(ts, str) and len(ts) >= 10:
                if interval == "day":
                    bucket = ts[:10]
                elif interval == "month":
                    bucket = ts[:7]
                elif interval == "year":
                    bucket = ts[:4]
                else:
                    bucket = ts[:10]
            else:
                bucket = str(ts)
            buckets[bucket].append(row.get(value_field, 0))
        result = []
        for bucket in sorted(buckets.keys()):
            values = buckets[bucket]
            result.append({
                "period": bucket,
                "sum": sum(values),
                "count": len(values),
                "avg": sum(values) / len(values) if values else 0,
            })
        return result

    def cross_dimension_analysis(self, data, dimensions, value_field):
        groups = defaultdict(list)
        for row in data:
            key = tuple(row.get(d, "unknown") for d in dimensions)
            groups[key].append(row.get(value_field, 0))
        result = []
        for key, values in groups.items():
            entry = dict(zip(dimensions, key))
            entry["sum"] = sum(values)
            entry["count"] = len(values)
            entry["avg"] = sum(values) / len(values) if values else 0
            result.append(entry)
        return result

    def set_permission(self, user_id, dashboard_id, allowed=True):
        self._permissions.setdefault(user_id, {})[dashboard_id] = allowed

    def _check_permission(self, user_id, dashboard_id):
        user_perms = self._permissions.get(user_id, {})
        return user_perms.get(dashboard_id, True)

    def paginate(self, data, page=1, page_size=10):
        total = len(data)
        start = (page - 1) * page_size
        end = start + page_size
        return {
            "data": data[start:end],
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size if page_size > 0 else 0,
        }
