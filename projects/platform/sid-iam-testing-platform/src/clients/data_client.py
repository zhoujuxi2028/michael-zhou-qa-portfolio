import logging

logger = logging.getLogger(__name__)


class DataClient:
    def __init__(self, graph_db=None, pipeline_engine=None, warehouse=None, tag_store=None, analytics=None):
        self.graph = graph_db
        self.pipeline = pipeline_engine
        self.warehouse = warehouse
        self.tags = tag_store
        self.analytics = analytics

    # --- Ontology / Graph ---
    def add_entity(self, entity_id, entity_type, attributes=None):
        return self.graph.add_entity(entity_id, entity_type, attributes)

    def add_relation(self, source, target, relation_type, attributes=None):
        return self.graph.add_relation(source, target, relation_type, attributes)

    def traverse_bfs(self, start_node):
        return self.graph.traverse_bfs(start_node)

    def traverse_dfs(self, start_node):
        return self.graph.traverse_dfs(start_node)

    def shortest_path(self, source, target):
        return self.graph.shortest_path(source, target)

    def update_entity(self, entity_id, attributes):
        return self.graph.update_entity(entity_id, attributes)

    def delete_entity(self, entity_id, cascade=False):
        return self.graph.delete_entity(entity_id, cascade)

    def detect_cycles(self):
        return self.graph.detect_cycles()

    def find_isolated_nodes(self):
        return self.graph.find_isolated_nodes()

    # --- Pipeline ---
    def create_pipeline(self, pipeline_id, tasks):
        return self.pipeline.create_pipeline(pipeline_id, tasks)

    def execute_pipeline(self, pipeline_id, idempotency_key=None):
        return self.pipeline.execute_pipeline(pipeline_id, idempotency_key)

    def get_lineage(self, task_id):
        return self.pipeline.get_lineage(task_id)

    def get_full_lineage(self, pipeline_id):
        return self.pipeline.get_full_lineage(pipeline_id)

    def check_circular_dependency(self, tasks):
        return self.pipeline.check_circular_dependency(tasks)

    # --- Warehouse ---
    def create_table(self, table_name, columns):
        return self.warehouse.create_table(table_name, columns)

    def insert_data(self, table_name, data):
        return self.warehouse.insert(table_name, data)

    def query_data(self, sql, params=None, user_id=None, tenant=None):
        return self.warehouse.query(sql, params, user_id, tenant)

    def safe_query(self, table_name, filters=None, columns=None, user_id=None, tenant=None):
        return self.warehouse.execute_safe(table_name, filters, columns, user_id, tenant)

    # --- Tags ---
    def create_tag(self, name, category, parent_id=None):
        return self.tags.create_tag(name, category, parent_id)

    def attach_tag(self, tag_id, entity_id):
        return self.tags.attach_tag(tag_id, entity_id)

    def query_by_tag(self, tag_id):
        return self.tags.query_by_tag(tag_id)

    def get_tag_hierarchy(self, tag_id):
        return self.tags.get_hierarchy(tag_id)

    # --- Analytics ---
    def get_dashboard(self, dashboard_id, user_id=None):
        return self.analytics.get_dashboard(dashboard_id, user_id)

    def aggregate_data(self, data, group_by, agg_field, agg_func="sum"):
        return self.analytics.aggregate(data, group_by, agg_field, agg_func)

    def export_csv(self, data):
        return self.analytics.export_csv(data)

    def export_json(self, data):
        return self.analytics.export_json(data)
