import pytest

from src.clients.data_client import DataClient


@pytest.fixture
def sample_ontology(graph_db):
    graph_db.reset()
    graph_db.add_entity("student_001", "student", {"name": "Alice", "gpa": 3.8})
    graph_db.add_entity("student_002", "student", {"name": "Bob", "gpa": 3.5})
    graph_db.add_entity("course_cs101", "course", {"name": "Intro to CS", "credits": 3})
    graph_db.add_entity("course_math201", "course", {"name": "Linear Algebra", "credits": 4})
    graph_db.add_entity("dept_cs", "department", {"name": "Computer Science"})
    graph_db.add_entity("dept_math", "department", {"name": "Mathematics"})
    graph_db.add_relation("student_001", "course_cs101", "enrolled_in")
    graph_db.add_relation("student_001", "course_math201", "enrolled_in")
    graph_db.add_relation("student_002", "course_cs101", "enrolled_in")
    graph_db.add_relation("course_cs101", "dept_cs", "belongs_to")
    graph_db.add_relation("course_math201", "dept_math", "belongs_to")
    return graph_db


@pytest.fixture
def sample_pipeline(pipeline_engine):
    pipeline_engine.reset()
    tasks = [
        {"id": "extract", "handler": lambda: {"data": "raw"}, "retry": 1},
        {"id": "transform", "depends_on": ["extract"], "handler": lambda: {"data": "clean"}, "retry": 0},
        {"id": "load", "depends_on": ["transform"], "handler": lambda: {"rows": 100}, "retry": 2},
    ]
    pipeline_engine.create_pipeline("etl_pipeline", tasks)
    return pipeline_engine


@pytest.fixture
def sample_schema(data_warehouse):
    data_warehouse.reset()
    data_warehouse.create_table(
        "students",
        [
            {"name": "id", "type": "TEXT"},
            {"name": "name", "type": "TEXT"},
            {"name": "gpa", "type": "REAL"},
            {"name": "tenant_id", "type": "TEXT"},
        ],
    )
    data_warehouse.create_table(
        "grades",
        [
            {"name": "student_id", "type": "TEXT"},
            {"name": "course", "type": "TEXT"},
            {"name": "score", "type": "INTEGER"},
            {"name": "tenant_id", "type": "TEXT"},
        ],
    )
    data_warehouse.insert(
        "students",
        [
            {"id": "s001", "name": "Alice", "gpa": 3.8, "tenant_id": "tenant_a"},
            {"id": "s002", "name": "Bob", "gpa": 3.5, "tenant_id": "tenant_a"},
            {"id": "s003", "name": "Carol", "gpa": 3.9, "tenant_id": "tenant_b"},
        ],
    )
    data_warehouse.insert(
        "grades",
        [
            {"student_id": "s001", "course": "CS101", "score": 95, "tenant_id": "tenant_a"},
            {"student_id": "s001", "course": "MATH201", "score": 88, "tenant_id": "tenant_a"},
            {"student_id": "s002", "course": "CS101", "score": 82, "tenant_id": "tenant_a"},
            {"student_id": "s003", "course": "CS101", "score": 97, "tenant_id": "tenant_b"},
        ],
    )
    return data_warehouse


@pytest.fixture
def sample_tags(tag_store):
    tag_store.reset()
    root = tag_store.create_tag("academic", "classification")
    child1 = tag_store.create_tag("undergraduate", "classification", parent_id=root["id"])
    child2 = tag_store.create_tag("graduate", "classification", parent_id=root["id"])
    sensitive = tag_store.create_tag("pii", "sensitivity")
    return {"root": root, "undergrad": child1, "graduate": child2, "pii": sensitive, "store": tag_store}


@pytest.fixture
def sample_data():
    return [
        {"department": "CS", "score": 90, "date": "2024-01-15"},
        {"department": "CS", "score": 85, "date": "2024-01-15"},
        {"department": "Math", "score": 92, "date": "2024-02-10"},
        {"department": "Math", "score": 78, "date": "2024-02-10"},
        {"department": "CS", "score": 88, "date": "2024-03-05"},
    ]


@pytest.fixture
def data_client(graph_db, pipeline_engine, data_warehouse, tag_store, analytics_engine):
    return DataClient(
        graph_db=graph_db,
        pipeline_engine=pipeline_engine,
        warehouse=data_warehouse,
        tag_store=tag_store,
        analytics=analytics_engine,
    )
