import logging

import pytest

from src.mock_services.tag_store import TagError

logger = logging.getLogger(__name__)


@pytest.mark.data
class TestTagCRUD:
    @pytest.mark.P0
    def test_tag_creation(self, sample_tags):
        """TC-DATA-TAG-001: 标签创建与分类"""
        logger.info("TC-DATA-TAG-001: Testing tag creation and classification")
        root = sample_tags["root"]
        assert root["name"] == "academic"
        assert root["category"] == "classification"
        pii = sample_tags["pii"]
        assert pii["category"] == "sensitivity"

    @pytest.mark.P0
    def test_tag_attachment(self, sample_tags):
        """TC-DATA-TAG-002: 标签附加到实体"""
        logger.info("TC-DATA-TAG-002: Testing tag attachment to entity")
        store = sample_tags["store"]
        store.attach_tag(sample_tags["undergrad"]["id"], "student_001")
        tags = store.get_entity_tags("student_001")
        assert len(tags) >= 1
        assert any(t["name"] == "undergraduate" for t in tags)

    @pytest.mark.P0
    def test_tag_hierarchy(self, sample_tags):
        """TC-DATA-TAG-003: 标签层级关系（父子标签）"""
        logger.info("TC-DATA-TAG-003: Testing tag hierarchy")
        store = sample_tags["store"]
        children = store.get_children(sample_tags["root"]["id"])
        assert len(children) == 2
        names = {c["name"] for c in children}
        assert "undergraduate" in names
        assert "graduate" in names
        hierarchy = store.get_hierarchy(sample_tags["undergrad"]["id"])
        assert len(hierarchy) == 2
        assert hierarchy[0]["name"] == "academic"

    @pytest.mark.P1
    def test_query_by_tag(self, sample_tags):
        """TC-DATA-TAG-004: 按标签查询实体"""
        logger.info("TC-DATA-TAG-004: Testing query entities by tag")
        store = sample_tags["store"]
        store.attach_tag(sample_tags["undergrad"]["id"], "entity_a")
        store.attach_tag(sample_tags["undergrad"]["id"], "entity_b")
        entities = store.query_by_tag(sample_tags["undergrad"]["id"])
        assert "entity_a" in entities
        assert "entity_b" in entities

    @pytest.mark.P1
    def test_tag_governance(self, sample_tags):
        """TC-DATA-TAG-005: 标签治理（审批流）"""
        logger.info("TC-DATA-TAG-005: Testing tag governance workflow")
        store = sample_tags["store"]
        request = store.submit_for_governance(sample_tags["pii"]["id"], "modify", "user1")
        assert request["status"] == "pending"
        approved = store.approve_governance(request["request_id"], "admin1")
        assert approved["status"] == "approved"

    @pytest.mark.P1
    def test_batch_operations(self, tag_store):
        """TC-DATA-TAG-006: 标签批量操作"""
        logger.info("TC-DATA-TAG-006: Testing batch tag operations")
        tag_store.reset()
        tags_def = [
            {"name": "batch_1", "category": "test"},
            {"name": "batch_2", "category": "test"},
            {"name": "batch_3", "category": "test"},
        ]
        created = tag_store.batch_create_tags(tags_def)
        assert len(created) == 3
        count = tag_store.batch_attach(created[0]["id"], ["e1", "e2", "e3"])
        assert count == 3

    @pytest.mark.P2
    def test_duplicate_tag_detection(self, tag_store):
        """TC-DATA-TAG-007: 重复标签检测"""
        logger.info("TC-DATA-TAG-007: Testing duplicate tag detection")
        tag_store.reset()
        tag_store.create_tag("unique", "test")
        with pytest.raises(TagError, match="Duplicate"):
            tag_store.create_tag("unique", "test")

    @pytest.mark.P2
    def test_tag_deletion_impact(self, tag_store):
        """TC-DATA-TAG-008: 标签删除影响分析"""
        logger.info("TC-DATA-TAG-008: Testing tag deletion impact analysis")
        tag_store.reset()
        parent = tag_store.create_tag("parent_del", "test")
        child = tag_store.create_tag("child_del", "test", parent_id=parent["id"])
        tag_store.attach_tag(parent["id"], "affected_entity")
        result = tag_store.delete_tag(parent["id"])
        assert result["children_orphaned"] == 1
        assert result["entities_affected"] == 1
