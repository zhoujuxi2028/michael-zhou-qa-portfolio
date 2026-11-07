import networkx as nx


def bfs_traverse(graph, start_node):
    if start_node not in graph:
        return []
    return list(nx.bfs_tree(graph, start_node).nodes())


def dfs_traverse(graph, start_node):
    if start_node not in graph:
        return []
    return list(nx.dfs_tree(graph, start_node).nodes())


def shortest_path(graph, source, target):
    try:
        return nx.shortest_path(graph, source, target)
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        return None


def detect_cycles(graph):
    try:
        cycles = list(nx.simple_cycles(graph))
        return cycles
    except nx.NetworkXError:
        return []


def find_isolated_nodes(graph):
    return list(nx.isolates(graph))


def get_ancestors(graph, node):
    if node not in graph:
        return set()
    return nx.ancestors(graph, node)


def get_descendants(graph, node):
    if node not in graph:
        return set()
    return nx.descendants(graph, node)
