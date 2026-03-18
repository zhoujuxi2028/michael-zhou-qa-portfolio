import logging

import networkx as nx

logger = logging.getLogger(__name__)


class GraphDBError(Exception):
    pass


class MockGraphDB:
    def __init__(self):
        self._graph = nx.DiGraph()
        self._schema_version = 1

    def reset(self):
        self._graph.clear()
        self._schema_version = 1

    @property
    def graph(self):
        return self._graph

    def add_entity(self, entity_id, entity_type, attributes=None):
        logger.info(f"Adding entity: {entity_id} ({entity_type})")
        if self._graph.has_node(entity_id):
            raise GraphDBError(f"Entity already exists: {entity_id}")
        self._graph.add_node(entity_id, entity_type=entity_type, **(attributes or {}))
        return {"id": entity_id, "type": entity_type}

    def get_entity(self, entity_id):
        if not self._graph.has_node(entity_id):
            raise GraphDBError(f"Entity not found: {entity_id}")
        return {"id": entity_id, **self._graph.nodes[entity_id]}

    def update_entity(self, entity_id, attributes):
        if not self._graph.has_node(entity_id):
            raise GraphDBError(f"Entity not found: {entity_id}")
        self._graph.nodes[entity_id].update(attributes)
        return True

    def delete_entity(self, entity_id, cascade=False):
        if not self._graph.has_node(entity_id):
            raise GraphDBError(f"Entity not found: {entity_id}")
        if cascade:
            edges = list(self._graph.edges(entity_id)) + list(self._graph.in_edges(entity_id))
            self._graph.remove_edges_from(edges)
        self._graph.remove_node(entity_id)
        return True

    def add_relation(self, source, target, relation_type, attributes=None):
        logger.info(f"Adding relation: {source} --{relation_type}--> {target}")
        if not self._graph.has_node(source):
            raise GraphDBError(f"Source entity not found: {source}")
        if not self._graph.has_node(target):
            raise GraphDBError(f"Target entity not found: {target}")
        self._graph.add_edge(source, target, relation_type=relation_type, **(attributes or {}))
        return {"source": source, "target": target, "type": relation_type}

    def get_relations(self, entity_id):
        if not self._graph.has_node(entity_id):
            raise GraphDBError(f"Entity not found: {entity_id}")
        outgoing = [{"source": u, "target": v, **d} for u, v, d in self._graph.edges(entity_id, data=True)]
        incoming = [{"source": u, "target": v, **d} for u, v, d in self._graph.in_edges(entity_id, data=True)]
        return {"outgoing": outgoing, "incoming": incoming}

    def delete_relation(self, source, target):
        if not self._graph.has_edge(source, target):
            raise GraphDBError(f"Relation not found: {source} -> {target}")
        self._graph.remove_edge(source, target)
        return True

    def traverse_bfs(self, start_node):
        if start_node not in self._graph:
            raise GraphDBError(f"Node not found: {start_node}")
        return list(nx.bfs_tree(self._graph, start_node).nodes())

    def traverse_dfs(self, start_node):
        if start_node not in self._graph:
            raise GraphDBError(f"Node not found: {start_node}")
        return list(nx.dfs_tree(self._graph, start_node).nodes())

    def shortest_path(self, source, target):
        try:
            return nx.shortest_path(self._graph, source, target)
        except nx.NetworkXNoPath:
            return None
        except nx.NodeNotFound as e:
            raise GraphDBError(str(e)) from e

    def detect_cycles(self):
        try:
            return list(nx.simple_cycles(self._graph))
        except nx.NetworkXError:
            return []

    def find_isolated_nodes(self):
        return list(nx.isolates(self._graph))

    def node_count(self):
        return self._graph.number_of_nodes()

    def edge_count(self):
        return self._graph.number_of_edges()

    def migrate_schema(self, new_version, migration_fn=None):
        old_version = self._schema_version
        if migration_fn:
            migration_fn(self._graph)
        self._schema_version = new_version
        return {"from": old_version, "to": new_version}

    def get_schema_version(self):
        return self._schema_version

    def bulk_add_entities(self, entities):
        added = 0
        for eid, etype, attrs in entities:
            if not self._graph.has_node(eid):
                self._graph.add_node(eid, entity_type=etype, **(attrs or {}))
                added += 1
        return added
